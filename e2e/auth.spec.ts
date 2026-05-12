/**
 * E2e — Auth flow
 * Tickets: AIEX-814
 *
 * Covers:
 *  - Signed-out user hitting / is redirected to /signin
 *  - Sign-in page renders and form is functional
 *  - After submitting email, "Check your inbox" state appears
 *  - Programmatic session injection lands the user on /
 *  - Sign-out redirects to /signin
 *
 * If Supabase env vars are absent, all tests are skipped and documented.
 */

import { test, expect, type BrowserContext } from '@playwright/test'
import {
  E2E_AVAILABLE,
  createAndSignInTestUser,
  injectSession,
  deleteTestUser,
  type TestUser,
} from './fixtures/auth'

test.describe('auth flow', () => {
  test.describe.configure({ mode: 'serial' })

  // ── Unauthenticated redirect ────────────────────────────────────────────

  test('signed-out user hitting / is redirected to /signin', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/signin/)
  })

  test('/signin page renders the magic-link form', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.getByRole('heading', { name: /reading list vote/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
  })

  // ── Magic-link form state ───────────────────────────────────────────────

  test('submitting email shows "Check your inbox" confirmation state', async ({ page }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: NEXT_PUBLIC_SUPABASE_URL not set')
      return
    }

    await page.goto('/signin')
    await page.getByRole('textbox', { name: /email/i }).fill('inbox-test@example.com')
    await page.getByRole('button', { name: /send magic link/i }).click()

    // The MagicLinkForm swaps to a "Check your inbox" state on success (or error)
    // We test the confirmation text appears within 5 seconds
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 5000 })
  })

  // ── Programmatic session injection (authenticated flows) ───────────────

  test('injecting session lands user on / (no redirect to /signin)', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: SUPABASE_TEST_SERVICE_ROLE_KEY not set')
      return
    }

    let user: TestUser | undefined
    let context: BrowserContext | undefined

    try {
      user = await createAndSignInTestUser('e2e-auth-inject@test.invalid')
      context = await browser.newContext()
      await injectSession(context, user)

      const page = await context.newPage()
      await page.goto('/')

      // Should NOT be redirected to /signin
      await expect(page).not.toHaveURL(/\/signin/)
    } finally {
      await context?.close()
      if (user) await deleteTestUser(user.id)
    }
  })

  // ── Sign-out ────────────────────────────────────────────────────────────

  test('sign-out redirects to /signin', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: SUPABASE_TEST_SERVICE_ROLE_KEY not set')
      return
    }

    let user: TestUser | undefined
    let context: BrowserContext | undefined

    try {
      user = await createAndSignInTestUser('e2e-signout@test.invalid')
      context = await browser.newContext()
      await injectSession(context, user)

      const page = await context.newPage()
      await page.goto('/')

      // Open the profile menu and click sign out
      await page.getByRole('button', { name: /e2e-signout/i }).click()
      await page.getByRole('button', { name: /sign out/i }).click()

      await expect(page).toHaveURL(/\/signin/, { timeout: 5000 })
    } finally {
      await context?.close()
      if (user) await deleteTestUser(user.id)
    }
  })

  // ── Middleware gating ───────────────────────────────────────────────────

  test('signed-in user hitting /signin is redirected to /', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: SUPABASE_TEST_SERVICE_ROLE_KEY not set')
      return
    }

    let user: TestUser | undefined
    let context: BrowserContext | undefined

    try {
      user = await createAndSignInTestUser('e2e-middleware@test.invalid')
      context = await browser.newContext()
      await injectSession(context, user)

      const page = await context.newPage()
      await page.goto('/signin')

      // Middleware should redirect signed-in users away from /signin
      await expect(page).not.toHaveURL(/\/signin/, { timeout: 5000 })
      await expect(page).toHaveURL('http://localhost:3000/')
    } finally {
      await context?.close()
      if (user) await deleteTestUser(user.id)
    }
  })
})
