/**
 * E2e auth helper — programmatic session injection (Approach 1).
 *
 * Creates a test user via the Supabase admin API, signs in programmatically
 * to obtain a session JWT, then injects the session cookies into the
 * Playwright browser context before navigating.
 *
 * This avoids the magic-link email roundtrip entirely.
 *
 * Prerequisites:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_TEST_SERVICE_ROLE_KEY must be set.
 *   SUPABASE_TEST_ANON_KEY must be set.
 *
 * Tickets: AIEX-814
 */

import { createClient } from '@supabase/supabase-js'
import type { BrowserContext } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? ''

export const E2E_AVAILABLE = Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY) && Boolean(SERVICE_ROLE_KEY)

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

function getAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}

export interface TestUser {
  id: string
  email: string
  password: string
  accessToken: string
  refreshToken: string
}

/**
 * Create a test user (or reuse if already exists) and sign in.
 * Returns the user record plus session tokens.
 */
export async function createAndSignInTestUser(
  email: string,
  password = 'E2eTest1234!',
  isOrganizer = false
): Promise<TestUser> {
  const admin = getAdminClient()
  const anon = getAnonClient()

  // Create the auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr && !createErr.message.includes('already registered')) {
    throw new Error(`createAndSignInTestUser: ${createErr.message}`)
  }

  const userId = created?.user?.id ?? ''

  // Ensure public.users row
  if (userId) {
    await admin.from('users').upsert({
      id: userId,
      email,
      display_name: email.split('@')[0],
      is_organizer: isOrganizer,
    })
  }

  // Sign in to get session
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password,
  })

  if (signInErr || !session.session) {
    throw new Error(`createAndSignInTestUser sign-in: ${signInErr?.message}`)
  }

  return {
    id: session.user.id,
    email,
    password,
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
  }
}

/**
 * Inject a Supabase session into a Playwright BrowserContext via cookies.
 * After this call, any page.goto() in the context will be authenticated.
 */
export async function injectSession(
  context: BrowserContext,
  user: TestUser,
  baseURL = 'http://localhost:3000'
): Promise<void> {
  // @supabase/ssr stores the session in a cookie named sb-<project-ref>-auth-token
  // We set both the access token and a localStorage entry as a fallback.
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  const sessionValue = JSON.stringify({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })

  await context.addCookies([
    {
      name: cookieName,
      value: encodeURIComponent(sessionValue),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ])

  // Also set via script to handle SSR cookie parsing
  await context.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value)
    },
    { key: `sb-${projectRef}-auth-token`, value: sessionValue }
  )
}

/**
 * Delete a test user (cleanup in afterAll).
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.auth.admin.deleteUser(userId)
}

/**
 * Seed an open round for e2e tests.  Returns the round ID.
 */
export async function seedOpenRound(
  createdBy: string,
  title = 'E2E Test Round'
): Promise<string> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('rounds')
    .insert({ title, closing_date: '2026-12-31', created_by: createdBy })
    .select()
    .single()

  if (error) throw new Error(`seedOpenRound: ${error.message}`)
  return data.id
}

/**
 * Seed a proposal in a round.  Returns the proposal ID.
 */
export async function seedProposal(
  roundId: string,
  proposerId: string,
  title = 'E2E Test Book'
): Promise<string> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('proposals')
    .insert({ round_id: roundId, title, author: 'E2E Author', proposer_id: proposerId })
    .select()
    .single()

  if (error) throw new Error(`seedProposal: ${error.message}`)
  return data.id
}

/**
 * Close a round and set a winner. Returns the updated round.
 */
export async function closeRound(roundId: string, winnerProposalId: string | null = null) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('rounds')
    .update({ status: 'closed', winner_proposal_id: winnerProposalId })
    .eq('id', roundId)
    .select()
    .single()

  if (error) throw new Error(`closeRound: ${error.message}`)
  return data
}

/**
 * Delete a round and all cascaded data.
 */
export async function deleteRound(roundId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.from('rounds').delete().eq('id', roundId)
}
