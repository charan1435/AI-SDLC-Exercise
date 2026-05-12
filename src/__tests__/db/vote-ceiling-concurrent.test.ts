/**
 * DB tests — vote-ceiling CONCURRENCY (Risk R1)
 * Tickets: AIEX-808, AIEX-810, AIEX-830
 *
 * This is the highest-risk test in the suite.  The enforce_vote_ceiling()
 * trigger uses SELECT FOR UPDATE to serialize concurrent inserts.  Without
 * that lock, two simultaneous 3rd-and-4th inserts could both read
 * "count = 2" before either commits, allowing both to succeed (4 total).
 *
 * Strategy: fire 4 concurrent inserts via Promise.all.  Assert exactly 3
 * committed.  If the trigger serialises correctly, exactly 1 must fail.
 *
 * Blocked: requires SUPABASE_TEST_URL env vars. Skips cleanly if absent.
 *
 * IMPORTANT: this test is non-negotiable per the risk register (R1).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ERROR_MESSAGES } from '@/lib/types'
import {
  DB_AVAILABLE,
  getAdminClient,
  createTestUserAndSignIn,
  deleteTestUser,
  ensurePublicUser,
} from './helpers'

const skipAll = !DB_AVAILABLE

let userId: string
let roundId: string
const proposalIds: string[] = []

beforeAll(async () => {
  if (skipAll) return

  const admin = getAdminClient()
  const result = await createTestUserAndSignIn('concurrent-ceiling@test.invalid')
  userId = result.userId
  await ensurePublicUser(userId, 'concurrent-ceiling@test.invalid')

  const { data: round } = await admin
    .from('rounds')
    .insert({
      title: 'Concurrent Ceiling Round',
      closing_date: '2026-12-31',
      created_by: userId,
    })
    .select()
    .single()
  roundId = round.id

  // Seed 4 proposals (one per concurrent insert attempt)
  for (let i = 0; i < 4; i++) {
    const { data: proposal } = await admin
      .from('proposals')
      .insert({
        round_id: roundId,
        title: `Concurrent Book ${i + 1}`,
        author: `Author ${i + 1}`,
        proposer_id: userId,
      })
      .select()
      .single()
    proposalIds.push(proposal.id)
  }
})

afterAll(async () => {
  if (skipAll) return
  const admin = getAdminClient()
  // Delete all votes for the user in this round
  await admin.from('votes').delete().eq('voter_id', userId).eq('round_id', roundId)
  for (const id of proposalIds) {
    await admin.from('proposals').delete().eq('id', id)
  }
  await admin.from('rounds').delete().eq('id', roundId)
  await deleteTestUser(userId)
})

describe('vote ceiling — concurrency (Risk R1)', () => {
  it.skipIf(skipAll)(
    'exactly 3 of 4 concurrent inserts commit; the 4th is rejected with VOTE_CEILING',
    async () => {
      const admin = getAdminClient()

      // Fire all 4 inserts in parallel
      const results = await Promise.allSettled(
        proposalIds.map((proposalId) =>
          admin
            .from('votes')
            .insert({ proposal_id: proposalId, voter_id: userId, round_id: roundId })
            .select()
            .single()
        )
      )

      // Count how many Supabase calls returned no error (committed)
      const successes = results.filter(
        (r) => r.status === 'fulfilled' && r.value.error === null
      )
      // Count failures with the ceiling message
      const ceilingErrors = results.filter(
        (r) =>
          r.status === 'fulfilled' &&
          r.value.error?.code === 'P0001' &&
          r.value.error?.message === ERROR_MESSAGES.VOTE_CEILING
      )

      expect(successes).toHaveLength(3)
      expect(ceilingErrors).toHaveLength(1)

      // Double-check with a direct count in the DB
      const { data: voteRows } = await admin
        .from('votes')
        .select('id')
        .eq('voter_id', userId)
        .eq('round_id', roundId)

      expect(voteRows).toHaveLength(3)
    }
  )
})
