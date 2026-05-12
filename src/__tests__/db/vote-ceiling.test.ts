/**
 * DB tests — vote-ceiling sequential (3 ok, 4th fails)
 * Tickets: AIEX-810, AIEX-830
 *
 * The enforce_vote_ceiling() BEFORE INSERT trigger raises P0001 with the
 * exact ERROR_MESSAGES.VOTE_CEILING string when a 4th vote is attempted.
 *
 * Blocked: requires SUPABASE_TEST_URL env vars. Skips cleanly if absent.
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
const voteIds: string[] = []

beforeAll(async () => {
  if (skipAll) return

  const admin = getAdminClient()
  const result = await createTestUserAndSignIn('ceiling-test@test.invalid')
  userId = result.userId
  await ensurePublicUser(userId, 'ceiling-test@test.invalid')

  // Seed a round (admin bypass)
  const { data: round } = await admin
    .from('rounds')
    .insert({ title: 'Ceiling Test Round', closing_date: '2026-12-31', created_by: userId })
    .select()
    .single()
  roundId = round.id

  // Seed 4 proposals
  for (let i = 0; i < 4; i++) {
    const { data: proposal } = await admin
      .from('proposals')
      .insert({
        round_id: roundId,
        title: `Book ${i + 1}`,
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
  for (const id of voteIds) {
    await admin.from('votes').delete().eq('id', id)
  }
  for (const id of proposalIds) {
    await admin.from('proposals').delete().eq('id', id)
  }
  await admin.from('rounds').delete().eq('id', roundId)
  await deleteTestUser(userId)
})

describe('vote ceiling — sequential inserts', () => {
  it.skipIf(skipAll)('1st vote succeeds', async () => {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('votes')
      .insert({ proposal_id: proposalIds[0], voter_id: userId, round_id: roundId })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    voteIds.push(data!.id)
  })

  it.skipIf(skipAll)('2nd vote succeeds', async () => {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('votes')
      .insert({ proposal_id: proposalIds[1], voter_id: userId, round_id: roundId })
      .select()
      .single()

    expect(error).toBeNull()
    voteIds.push(data!.id)
  })

  it.skipIf(skipAll)('3rd vote succeeds', async () => {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('votes')
      .insert({ proposal_id: proposalIds[2], voter_id: userId, round_id: roundId })
      .select()
      .single()

    expect(error).toBeNull()
    voteIds.push(data!.id)
  })

  it.skipIf(skipAll)(
    '4th vote fails with P0001 and the exact VOTE_CEILING message',
    async () => {
      const admin = getAdminClient()
      const { data, error } = await admin
        .from('votes')
        .insert({ proposal_id: proposalIds[3], voter_id: userId, round_id: roundId })
        .select()
        .single()

      expect(data).toBeNull()
      expect(error).not.toBeNull()
      // Trigger raises P0001
      expect(error?.code).toBe('P0001')
      // Message must match exactly what the frontend toast expects
      expect(error?.message).toBe(ERROR_MESSAGES.VOTE_CEILING)
    }
  )

  it.skipIf(skipAll)('only 3 votes exist for the user after the ceiling hit', async () => {
    const admin = getAdminClient()
    const { data } = await admin
      .from('votes')
      .select('id')
      .eq('voter_id', userId)
      .eq('round_id', roundId)

    expect(data).toHaveLength(3)
  })
})
