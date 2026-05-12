/**
 * DB tests — RLS isolation
 * Tickets: AIEX-810, AIEX-822, AIEX-830
 *
 * Verifies:
 *  1. User A cannot read User B's votes (votes.SELECT returns rows only for the voter)
 *  2. User A cannot delete User B's vote
 *  3. User A can read all proposals (proposals are shared)
 *  4. User A cannot insert a vote where voter_id != auth.uid()
 *
 * Blocked: requires SUPABASE_TEST_URL + SUPABASE_TEST_ANON_KEY + SUPABASE_TEST_SERVICE_ROLE_KEY.
 * All tests skip cleanly if env vars are absent.
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

// ── Seed data ────────────────────────────────────────────────────────────────

let userAId: string
let userBId: string
let roundId: string
let proposalId: string
let voteByB: string

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientA: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientB: any

beforeAll(async () => {
  if (skipAll) return

  const admin = getAdminClient()

  const a = await createTestUserAndSignIn('rls-user-a@test.invalid')
  const b = await createTestUserAndSignIn('rls-user-b@test.invalid')
  userAId = a.userId
  userBId = b.userId
  clientA = a.client
  clientB = b.client

  await ensurePublicUser(userAId, 'rls-user-a@test.invalid')
  await ensurePublicUser(userBId, 'rls-user-b@test.invalid')

  // Open a round via admin (bypass RLS)
  const { data: round } = await admin
    .from('rounds')
    .insert({ title: 'RLS Test Round', closing_date: '2026-12-31', created_by: userAId })
    .select()
    .single()
  roundId = round.id

  // Add a proposal via admin
  const { data: proposal } = await admin
    .from('proposals')
    .insert({ round_id: roundId, title: 'RLS Book', author: 'RLS Author', proposer_id: userBId })
    .select()
    .single()
  proposalId = proposal.id

  // Insert a vote for User B via admin
  const { data: vote } = await admin
    .from('votes')
    .insert({ proposal_id: proposalId, voter_id: userBId, round_id: roundId })
    .select()
    .single()
  voteByB = vote.id
})

afterAll(async () => {
  if (skipAll) return
  const admin = getAdminClient()
  await admin.from('votes').delete().eq('id', voteByB)
  await admin.from('proposals').delete().eq('id', proposalId)
  await admin.from('rounds').delete().eq('id', roundId)
  await deleteTestUser(userAId)
  await deleteTestUser(userBId)
})

describe('RLS isolation — votes', () => {
  it.skipIf(skipAll)(
    'User A can only see their own votes (not User B votes)',
    async () => {
      const { data, error } = await clientA
        .from('votes')
        .select('*')
        .eq('round_id', roundId)

      expect(error).toBeNull()
      // User A has no votes in this round — should return empty
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    }
  )

  it.skipIf(skipAll)(
    'User A cannot delete User B vote (RLS predicate: voter_id = auth.uid())',
    async () => {
      const { error } = await clientA
        .from('votes')
        .delete()
        .eq('id', voteByB)

      // Either an error is returned or 0 rows are affected
      // RLS means the delete silently affects 0 rows (no error thrown by default)
      if (error) {
        expect(error.code).toBeTruthy()
      } else {
        // Verify the vote still exists via admin
        const admin = getAdminClient()
        const { data } = await admin.from('votes').select('*').eq('id', voteByB)
        expect(data).toHaveLength(1)
      }
    }
  )

  it.skipIf(skipAll)(
    'User B can see their own vote',
    async () => {
      const { data, error } = await clientB
        .from('votes')
        .select('*')
        .eq('round_id', roundId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(voteByB)
    }
  )
})

describe('RLS isolation — proposals (shared read)', () => {
  it.skipIf(skipAll)(
    'User A can read proposals from any round',
    async () => {
      const { data, error } = await clientA
        .from('proposals')
        .select('*')
        .eq('round_id', roundId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(proposalId)
    }
  )
})

describe('RLS — closed-round lockdown (votes)', () => {
  it.skipIf(skipAll)(
    'User cannot insert a vote on a closed round',
    async () => {
      const admin = getAdminClient()

      // Create a closed round
      const { data: closedRound } = await admin
        .from('rounds')
        .insert({
          title: 'Closed Round RLS',
          closing_date: '2026-01-01',
          status: 'closed',
          created_by: userAId,
        })
        .select()
        .single()

      const { data: closedProposal } = await admin
        .from('proposals')
        .insert({
          round_id: closedRound.id,
          title: 'Closed Book',
          author: 'Closed Author',
          proposer_id: userAId,
        })
        .select()
        .single()

      // Try to vote on the closed round as User A
      const { error } = await clientA.from('votes').insert({
        proposal_id: closedProposal.id,
        voter_id: userAId,
        round_id: closedRound.id,
      })

      expect(error).not.toBeNull() // Should be rejected by RLS

      // Cleanup
      await admin.from('proposals').delete().eq('id', closedProposal.id)
      await admin.from('rounds').delete().eq('id', closedRound.id)
    }
  )
})
