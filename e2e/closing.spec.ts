/**
 * E2e — Organizer closes a round + winner card (spec tie-break + closed-round scenarios)
 * Tickets: AIEX-822, AIEX-836
 *
 * Covers:
 *  - Organizer closes a round with two tied proposals → earlier-proposed wins (winner card)
 *  - Stale member tab: vote attempt after close → toast "This round is closed."
 *  - Propose on closed round → toast "This round is closed."
 *
 * Auth: programmatic session injection via e2e/fixtures/auth.ts
 * Blocked: if NEXT_PUBLIC_SUPABASE_URL / SUPABASE_TEST_SERVICE_ROLE_KEY are absent,
 *          all tests skip cleanly (E2E_AVAILABLE = false).
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ERROR_MESSAGES } from '../src/lib/types'
import {
  E2E_AVAILABLE,
  createAndSignInTestUser,
  injectSession,
  seedOpenRound,
  seedProposal,
  closeRound,
  deleteRound,
  deleteTestUser,
  type TestUser,
} from './fixtures/auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? ''

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

test.describe('closing a round', () => {
  test.describe.configure({ mode: 'serial' })

  // ── Organizer closes with tied proposals — earlier proposal wins ─────────

  test('organizer closes tied round — earlier-proposed book wins', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let organizer: TestUser | undefined
    let member: TestUser | undefined
    let roundId: string | undefined
    const context = await browser.newContext()

    try {
      organizer = await createAndSignInTestUser('e2e-close-org@test.invalid', 'E2eTest1234!', true)
      member = await createAndSignInTestUser('e2e-close-mem@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(organizer.id, 'E2E Tie-Break Round')

      // Seed two proposals — first one is "earlier" (inserted first → earlier created_at)
      const admin = adminClient()

      const { data: p1 } = await admin
        .from('proposals')
        .insert({
          round_id: roundId,
          title: 'Earlier Book',
          author: 'Author One',
          proposer_id: member.id,
        })
        .select()
        .single()

      // Small delay to ensure created_at ordering
      await new Promise((r) => setTimeout(r, 50))

      const { data: p2 } = await admin
        .from('proposals')
        .insert({
          round_id: roundId,
          title: 'Later Book',
          author: 'Author Two',
          proposer_id: member.id,
        })
        .select()
        .single()

      // Give both proposals 1 vote each (tie)
      await admin
        .from('votes')
        .insert({ proposal_id: p1.id, voter_id: organizer.id, round_id: roundId })
      await admin
        .from('votes')
        .insert({ proposal_id: p2.id, voter_id: member.id, round_id: roundId })

      await injectSession(context, organizer)
      const page = await context.newPage()
      await page.goto(`/rounds/${roundId}`)

      // Open the CloseRoundDialog
      await page.getByRole('button', { name: /close round/i }).click()

      // Confirm close
      await page.getByRole('button', { name: /close round/i }).last().click()

      // Wait for the winner card to appear
      await expect(page.getByText(/the winner is/i)).toBeVisible({ timeout: 10000 })

      // Earlier book wins the tie-break
      await expect(page.getByText('Earlier Book')).toBeVisible({ timeout: 5000 })

      // Round header should now show CLOSED status
      await expect(page.getByText(/closed/i)).toBeVisible({ timeout: 5000 })
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (organizer) await deleteTestUser(organizer.id)
      if (member) await deleteTestUser(member.id)
    }
  })

  // ── Stale member tab: vote attempt after round closes → ROUND_CLOSED toast ─

  test('stale tab vote attempt after close shows ROUND_CLOSED toast', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    let roundId: string | undefined
    let proposalId: string | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-stale-vote@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(member.id, 'E2E Stale Vote Round')
      proposalId = await seedProposal(roundId, member.id, 'Stale Tab Book')

      await injectSession(context, member)
      const page = await context.newPage()
      // Navigate to the round while it is still open
      await page.goto(`/rounds/${roundId}`)
      await expect(page.getByRole('button', { name: /vote for this/i })).toBeVisible({
        timeout: 5000,
      })

      // Close the round via admin (simulating another user/tab closing it)
      await closeRound(roundId, null)

      // Without reloading the page, attempt to vote via the API directly
      // (simulates a stale tab scenario)
      const response = await page.evaluate(async ([pid]) => {
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal_id: pid }),
        })
        return res.json()
      }, [proposalId])

      // Server must reject with ROUND_CLOSED
      expect(response.error?.code).toBe('ROUND_CLOSED')
      expect(response.error?.message).toBe(ERROR_MESSAGES.ROUND_CLOSED)
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (member) await deleteTestUser(member.id)
    }
  })

  // ── Propose on closed round → ROUND_CLOSED toast ────────────────────────

  test('proposing a book on a closed round shows ROUND_CLOSED toast', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    let roundId: string | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-propose-closed@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(member.id, 'E2E Propose-Closed Round')
      // Add a placeholder proposal so the round page is meaningful
      await seedProposal(roundId, member.id, 'Existing Proposal')

      await injectSession(context, member)
      const page = await context.newPage()
      // Load while round is open
      await page.goto(`/rounds/${roundId}`)
      await expect(page.getByRole('button', { name: /add to round/i })).toBeVisible({
        timeout: 5000,
      })

      // Close the round externally (stale-tab simulation)
      await closeRound(roundId, null)

      // Without navigating away, try to submit the propose form via the API
      const response = await page.evaluate(async ([rId]) => {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round_id: rId,
            title: 'Closed Round Book',
            author: 'Some Author',
          }),
        })
        return res.json()
      }, [roundId])

      // Server must return ROUND_CLOSED
      expect(response.error?.code).toBe('ROUND_CLOSED')
      expect(response.error?.message).toBe(ERROR_MESSAGES.ROUND_CLOSED)
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (member) await deleteTestUser(member.id)
    }
  })

  // ── Closed round renders WinnerCard, no vote buttons ────────────────────

  test('closed round shows winner card and no vote buttons', async ({ browser }) => {
    if (!E2E_AVAILABLE) {
      test.skip(true, 'Skipped: env vars not set')
      return
    }

    let member: TestUser | undefined
    let roundId: string | undefined
    let proposalId: string | undefined
    const context = await browser.newContext()

    try {
      member = await createAndSignInTestUser('e2e-winner-card@test.invalid', 'E2eTest1234!', false)
      roundId = await seedOpenRound(member.id, 'E2E Winner Card Round')
      proposalId = await seedProposal(roundId, member.id, 'The Winning Book')

      // Cast a vote on the winning proposal
      const admin = adminClient()
      await admin
        .from('votes')
        .insert({ proposal_id: proposalId, voter_id: member.id, round_id: roundId })

      // Close the round with the winner set
      await closeRound(roundId, proposalId)

      await injectSession(context, member)
      const page = await context.newPage()
      await page.goto(`/rounds/${roundId}`)

      // WinnerCard must be visible
      await expect(page.getByText(/the winner is/i)).toBeVisible({ timeout: 8000 })
      await expect(page.getByText('The Winning Book')).toBeVisible()

      // No "Vote for this" buttons on a closed round
      await expect(page.getByRole('button', { name: /vote for this/i })).not.toBeVisible()
      // No "Add to round" submit button
      await expect(page.getByRole('button', { name: /add to round/i })).not.toBeVisible()
    } finally {
      await context.close()
      if (roundId) await deleteRound(roundId)
      if (member) await deleteTestUser(member.id)
    }
  })
})
