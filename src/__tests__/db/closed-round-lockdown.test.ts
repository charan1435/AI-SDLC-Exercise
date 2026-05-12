/**
 * DB tests — closed-round lockdown (RLS)
 * Tickets: AIEX-822, AIEX-826, AIEX-830
 *
 * Verifies that once a round is closed:
 *  - INSERT on votes is blocked by RLS
 *  - DELETE on votes is blocked by RLS
 *  - INSERT on proposals is blocked by RLS
 *
 * Blocked: requires SUPABASE_TEST_URL env vars. Skips cleanly if absent.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  DB_AVAILABLE,
  getAdminClient,
  createTestUserAndSignIn,
  deleteTestUser,
  ensurePublicUser,
} from './helpers'

const skipAll = !DB_AVAILABLE

let userId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let userClient: any
let closedRoundId: string
let proposalId: string

beforeAll(async () => {
  if (skipAll) return

  const admin = getAdminClient()
  const result = await createTestUserAndSignIn('lockdown-test@test.invalid')
  userId = result.userId
  userClient = result.client
  await ensurePublicUser(userId, 'lockdown-test@test.invalid')

  // Create a round directly with status=closed
  const { data: round } = await admin
    .from('rounds')
    .insert({
      title: 'Closed Lockdown Round',
      closing_date: '2026-01-01',
      status: 'closed',
      created_by: userId,
    })
    .select()
    .single()
  closedRoundId = round.id

  // Seed a proposal via admin
  const { data: proposal } = await admin
    .from('proposals')
    .insert({
      round_id: closedRoundId,
      title: 'Locked Book',
      author: 'Locked Author',
      proposer_id: userId,
    })
    .select()
    .single()
  proposalId = proposal.id
})

afterAll(async () => {
  if (skipAll) return
  const admin = getAdminClient()
  await admin.from('proposals').delete().eq('id', proposalId)
  await admin.from('rounds').delete().eq('id', closedRoundId)
  await deleteTestUser(userId)
})

describe('closed-round lockdown — votes', () => {
  it.skipIf(skipAll)(
    'INSERT vote on closed round is rejected by RLS',
    async () => {
      const { error } = await userClient.from('votes').insert({
        proposal_id: proposalId,
        voter_id: userId,
        round_id: closedRoundId,
      })

      expect(error).not.toBeNull()
    }
  )

  it.skipIf(skipAll)(
    'DELETE vote on closed round is rejected by RLS',
    async () => {
      // First seed a vote via admin
      const admin = getAdminClient()
      const { data: seedVote } = await admin
        .from('votes')
        .insert({ proposal_id: proposalId, voter_id: userId, round_id: closedRoundId })
        .select()
        .single()

      const voteId = seedVote?.id

      // Try to delete via the user client
      const { error } = await userClient.from('votes').delete().eq('id', voteId)

      if (!error) {
        // RLS may silently affect 0 rows; verify vote still exists
        const { data } = await admin.from('votes').select('*').eq('id', voteId)
        expect(data).toHaveLength(1)
      } else {
        expect(error).not.toBeNull()
      }

      // Cleanup
      if (voteId) {
        await admin.from('votes').delete().eq('id', voteId)
      }
    }
  )
})

describe('closed-round lockdown — proposals', () => {
  it.skipIf(skipAll)(
    'INSERT proposal on closed round is rejected by RLS',
    async () => {
      const { error } = await userClient.from('proposals').insert({
        round_id: closedRoundId,
        title: 'Attempt on Closed',
        author: 'Sneaky Author',
        proposer_id: userId,
      })

      expect(error).not.toBeNull()
    }
  )
})
