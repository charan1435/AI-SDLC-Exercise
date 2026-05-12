/**
 * Shared helpers for DB-layer tests.
 *
 * Isolation strategy: seed-and-cleanup.
 * - Each test seeds rows via the service-role client (bypasses RLS).
 * - afterEach deletes the rows it created (by tracking IDs).
 * - Tests that need authenticated access create a test user via admin API
 *   and use the anon client with their session JWT.
 *
 * Prerequisites:
 *   SUPABASE_TEST_URL + SUPABASE_TEST_ANON_KEY + SUPABASE_TEST_SERVICE_ROLE_KEY
 *   must be set.  If missing, every test in this suite skips cleanly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const TEST_URL = process.env.SUPABASE_TEST_URL
const TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY
const TEST_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

export const DB_AVAILABLE =
  Boolean(TEST_URL) && Boolean(TEST_ANON_KEY) && Boolean(TEST_SERVICE_ROLE_KEY)

/** Service-role client — bypasses all RLS. Use for seeding + cleanup only. */
export function getAdminClient(): SupabaseClient {
  if (!TEST_URL || !TEST_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY not set')
  }
  return createClient(TEST_URL, TEST_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

/** Anon client — respects RLS. Use for authenticated-user operations. */
export function getAnonClient(): SupabaseClient {
  if (!TEST_URL || !TEST_ANON_KEY) {
    throw new Error('SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY not set')
  }
  return createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { persistSession: false },
  })
}

/** Create a test user + sign in; return an anon client with the session. */
export async function createTestUserAndSignIn(
  email: string,
  password = 'Test1234!'
): Promise<{ client: SupabaseClient; userId: string }> {
  const admin = getAdminClient()

  // Create user via admin API
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    throw new Error(`Failed to create test user: ${createErr?.message}`)
  }

  // Sign in with password to get a session JWT
  const anonClient = getAnonClient()
  const { data: session, error: signInErr } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInErr || !session.session) {
    throw new Error(`Failed to sign in test user: ${signInErr?.message}`)
  }

  return { client: anonClient, userId: created.user.id }
}

/** Delete a test user by ID (cleanup). */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.auth.admin.deleteUser(userId)
}

/** Seed a public.users row (should be created by trigger, but we ensure it exists). */
export async function ensurePublicUser(
  userId: string,
  email: string,
  isOrganizer = false
): Promise<void> {
  const admin = getAdminClient()
  await admin.from('users').upsert({
    id: userId,
    email,
    display_name: email.split('@')[0],
    is_organizer: isOrganizer,
  })
}
