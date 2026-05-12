/**
 * E2e — Member proposes a book
 * Tickets: AIEX-826
 *
 * Covers:
 *  - Member submits a proposal → appears in the list with proposer name
 *  - Empty title → inline validation, server never called
 */

import { test, expect } from '@playwright/test'
import {
  E2E_AVAILABLE,
  createAndSignInTestUser,
  injectSession,
  seedOpenRound,
  deleteRound,
  deleteTestUser,
  type TestUser,
} from './fixtures/auth'

test.describe('proposing a book', () => {
  test.describe.configure({ mode: 'serial' })

  test('member submits a proposal and it appears in the list', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    let roundId: string | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-propose@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(member.id, 'E2E Proposal Round')
      await injectSession(context, member)

      const page = await context.newPage()
      await page.goto(`/rounds/${roundId}`)

      // Fill the propose form
      await page.getByLabel(/title/i).fill('The Midnight Library')
      await page.getByLabel(/author/i).fill('Matt Haig')

      await page.getByRole('button', { name: /add to round/i }).click()

      // The proposal should appear in the list
      await expect(page.getByText('The Midnight Library')).toBeVisible({ timeout: 8000 })
      await expect(page.getByText('Matt Haig')).toBeVisible()

      // Proposer name should appear
      await expect(page.getByText(/e2e-propose/i)).toBeVisible()
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (member) await deleteTestUser(member.id)
    }
  })

  test('empty title shows validation error without submitting', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    let roundId: string | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-empty-title@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(member.id, 'E2E Validation Round')
      await injectSession(context, member)

      const page = await context.newPage()
      await page.goto(`/rounds/${roundId}`)

      // Submit without filling title (fill author only)
      await page.getByLabel(/author/i).fill('Some Author')
      await page.getByRole('button', { name: /add to round/i }).click()

      // HTML5 validation or inline error should prevent submission
      // The browser's native validation fires before the server action
      const titleInput = page.getByLabel(/title/i)
      const validationMessage = await titleInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      )
      expect(validationMessage).not.toBe('')
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (member) await deleteTestUser(member.id)
    }
  })
})
