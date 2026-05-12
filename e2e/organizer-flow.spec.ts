/**
 * E2e — Organizer opens a round
 * Tickets: AIEX-818
 *
 * Covers:
 *  - Organizer opens a round → lands on /rounds/[id]
 *  - Non-organizer hits /rounds/new → redirected to /
 *  - Second open while one exists → "A round is already open" inline error
 */

import { test, expect } from '@playwright/test'
import { ERROR_MESSAGES } from '../src/lib/types'
import {
  E2E_AVAILABLE,
  createAndSignInTestUser,
  injectSession,
  deleteRound,
  deleteTestUser,
  type TestUser,
} from './fixtures/auth'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? ''

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

test.describe('organizer flow', () => {
  test.describe.configure({ mode: 'serial' })

  test('non-organizer hitting /rounds/new is redirected to /', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-nonorg@test.invalid', 'E2eTest1234!', false)
      await injectSession(context, member)

      const page = await context.newPage()
      await page.goto('/rounds/new')

      // Should be redirected away from /rounds/new
      await expect(page).not.toHaveURL(/\/rounds\/new/, { timeout: 5000 })
      await expect(page).toHaveURL('http://localhost:3000/')
    } finally {
      await context.close()
      if (member) await deleteTestUser(member.id)
    }
  })

  test('organizer opens a round and is redirected to /rounds/[id]', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let organizer: TestUser | undefined
    let roundId: string | undefined
    const context = await browser.newContext()

    try {
      organizer = await createAndSignInTestUser('e2e-org-open@test.invalid', 'E2eTest1234!', true)
      await injectSession(context, organizer)

      const page = await context.newPage()
      await page.goto('/rounds/new')

      await page.getByLabel(/title/i).fill('E2E June 2026')
      await page.getByLabel(/closing date/i).fill('2026-06-30')
      await page.getByRole('button', { name: /open round/i }).click()

      // Should redirect to the new round detail page
      await expect(page).toHaveURL(/\/rounds\/[a-f0-9-]+/, { timeout: 8000 })

      roundId = page.url().split('/rounds/')[1]
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (organizer) await deleteTestUser(organizer.id)
    }
  })

  test('second open round attempt shows ROUND_ALREADY_OPEN error', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let organizer: TestUser | undefined
    let firstRoundId: string | undefined
    const context = await browser.newContext()

    try {
      organizer = await createAndSignInTestUser('e2e-org-dupe@test.invalid', 'E2eTest1234!', true)

      // Seed a first open round directly
      const { data: round } = await adminClient()
        .from('rounds')
        .insert({ title: 'First Round', closing_date: '2026-12-31', created_by: organizer.id })
        .select()
        .single()
      firstRoundId = round.id

      await injectSession(context, organizer)
      const page = await context.newPage()
      await page.goto('/rounds/new')

      await page.getByLabel(/title/i).fill('Duplicate Round')
      await page.getByLabel(/closing date/i).fill('2026-07-01')
      await page.getByRole('button', { name: /open round/i }).click()

      // Should see the error toast
      await expect(page.getByText(ERROR_MESSAGES.ROUND_ALREADY_OPEN)).toBeVisible({
        timeout: 8000,
      })

      // Should still be on /rounds/new (not redirected)
      await expect(page).toHaveURL(/\/rounds\/new/)
    } finally {
      await context.close()
      if (firstRoundId) await deleteRound(firstRoundId)
      if (organizer) await deleteTestUser(organizer.id)
    }
  })
})
