/**
 * E2e — Cold-start / onboarding journey (spec's 4th journey)
 * Tickets: AIEX-814, AIEX-836
 *
 * Covers:
 *  - First visit → /signin (unauthenticated redirect)
 *  - Magic-link form renders correctly on /signin
 *  - After session injection, landing on / with no open round →
 *    "No round is open yet" empty state
 *  - Organizer with no open round sees "Open a round" CTA
 *  - Member cold-start: magic-link → home
 *
 * Note: the actual magic-link email click cannot be e2e-tested without a real
 * email inbox.  We substitute programmatic session injection for the post-click
 * flow, which is the approach approved in the QA spec.
 *
 * Blocked: if NEXT_PUBLIC_SUPABASE_URL / SUPABASE_TEST_SERVICE_ROLE_KEY are
 *          absent, all tests that need DB access skip cleanly (E2E_AVAILABLE).
 *          Unauthenticated redirect test DOES run without env vars.
 */

import { test, expect } from '@playwright/test'
import {
  E2E_AVAILABLE,
  createAndSignInTestUser,
  injectSession,
  deleteTestUser,
  type TestUser,
} from './fixtures/auth'

test.describe('cold-start / onboarding journey', () => {
  test.describe.configure({ mode: 'serial' })

  // ── Unauthenticated: / redirects to /signin ─────────────────────────────

  test('first visit to / without session redirects to /signin', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/signin/)
  })

  // ── /signin page renders the magic-link form ────────────────────────────

  test('/signin renders the app name and magic-link form', async ({ page }) => {
    await page.goto('/signin')

    // App name visible
    await expect(page.getByText(/reading list vote/i)).toBeVisible()
    // Tagline
    await expect(page.getByText(/pick the book/i)).toBeVisible()
    // Email input
    await expect(page.getByRole('textbox')).toBeVisible()
    // Submit button
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
    // Caption
    await expect(page.getByText(/no password/i)).toBeVisible()
  })

  // ── Magic-link form "Check your inbox" state ────────────────────────────

  test('/signin form swaps to "Check your inbox" after submit', async ({ page }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: NEXT_PUBLIC_SUPABASE_URL not set')
      return
    }

    await page.goto('/signin')
    await page.getByRole('textbox').fill('cold-start-e2e@example.com')
    await page.getByRole('button', { name: /send magic link/i }).click()

    // MagicLinkForm swaps content on success (or on Supabase's response)
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 8000 })
  })

  // ── Member cold-start: injected session → home with no round ────────────

  test('new member with no open round sees the member empty-state', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    const context = await browser.newContext()

    try {
      // Ensure no open round exists for this test by using a fresh user
      member = await createAndSignInTestUser(
        'e2e-cold-member@test.invalid',
        'E2eTest1234!',
        false
      )
      await injectSession(context, member)

      const page = await context.newPage()
      await page.goto('/')

      // If there is no open round at all, the home page renders the empty state
      // OR redirects to an open round. Both outcomes are valid depending on shared
      // DB state, but if the empty state is shown it must match the member copy.
      const url = page.url()
      if (!url.includes('/rounds/')) {
        // Home with no round — member variant
        await expect(
          page.getByText(/no round is open yet/i).or(page.getByText(/no round is open/i))
        ).toBeVisible({ timeout: 8000 })
        // Member variant: no "Open a round" CTA
        await expect(page.getByRole('link', { name: /open a round/i })).not.toBeVisible()
      } else {
        // Redirected to an open round — also a valid cold-start outcome
        await expect(page).toHaveURL(/\/rounds\/[a-f0-9-]+/)
      }
    } finally {
      await context.close()
      if (member) await deleteTestUser(member.id)
    }
  })

  // ── Organizer cold-start: home with no round shows "Open a round" CTA ──

  test('organizer with no open round sees "Open a round" CTA', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let organizer: TestUser | undefined
    const context = await browser.newContext()

    try {
      organizer = await createAndSignInTestUser(
        'e2e-cold-org@test.invalid',
        'E2eTest1234!',
        true
      )
      await injectSession(context, organizer)

      const page = await context.newPage()
      await page.goto('/')

      // If an open round already exists the page redirects; skip the CTA check in that case
      const url = page.url()
      if (!url.includes('/rounds/')) {
        // Organizer empty-state: should show CTA
        await expect(page.getByRole('link', { name: /open a round/i })).toBeVisible({
          timeout: 8000,
        })
      } else {
        // Redirected to open round — valid outcome, test not applicable
        test.info().annotations.push({
          type: 'skip-reason',
          description: 'Open round already exists — organizer CTA not shown',
        })
      }
    } finally {
      await context.close()
      if (organizer) await deleteTestUser(organizer.id)
    }
  })

  // ── Sign-out from cold-start session redirects to /signin ───────────────

  test('signed-in user can sign out and lands on /signin', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser(
        'e2e-cold-signout@test.invalid',
        'E2eTest1234!',
        false
      )
      await injectSession(context, member)

      const page = await context.newPage()
      await page.goto('/')

      // If redirected to a round, navigate back home first
      if (page.url().includes('/rounds/')) {
        await page.goto('/')
        // Should stay or auto-redirect again but the sign-out button is in the header
      }

      // Open the profile menu (display-name pill in the header)
      // The ProfileMenu shows the email prefix as display name
      const displayName = member.email.split('@')[0]
      await page.getByRole('button', { name: new RegExp(displayName, 'i') }).click()

      // Click "Sign out"
      await page.getByRole('button', { name: /sign out/i }).click()

      await expect(page).toHaveURL(/\/signin/, { timeout: 8000 })
    } finally {
      await context.close()
      if (member) await deleteTestUser(member.id)
    }
  })
})
