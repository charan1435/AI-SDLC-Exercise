/**
 * DB tests — single-open-round invariant
 * Tickets: AIEX-810, AIEX-818
 *
 * The `rounds_single_open_idx` partial unique index on rounds(status)
 * WHERE status='open' means a second INSERT with status='open' must raise
 * Postgres error code 23505 (unique violation).
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
let firstRoundId: string | null = null
let secondRoundId: string | null = null

beforeAll(async () => {
  if (skipAll) return
  const result = await createTestUserAndSignIn('single-open@test.invalid')
  userId = result.userId
  await ensurePublicUser(userId, 'single-open@test.invalid', true)
})

afterAll(async () => {
  if (skipAll) return
  const admin = getAdminClient()
  if (secondRoundId) await admin.from('rounds').delete().eq('id', secondRoundId)
  if (firstRoundId) await admin.from('rounds').delete().eq('id', firstRoundId)
  await deleteTestUser(userId)
})

describe('single-open-round invariant', () => {
  it.skipIf(skipAll)('first INSERT with status=open succeeds', async () => {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('rounds')
      .insert({ title: 'Round One', closing_date: '2026-12-31', created_by: userId })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    firstRoundId = data?.id ?? null
  })

  it.skipIf(skipAll)(
    'second INSERT with status=open raises a unique-violation error (23505)',
    async () => {
      const admin = getAdminClient()
      const { data, error } = await admin
        .from('rounds')
        .insert({ title: 'Round Two (duplicate)', closing_date: '2026-12-31', created_by: userId })
        .select()
        .single()

      // Must fail with 23505
      expect(error).not.toBeNull()
      expect(error?.code).toBe('23505')
      expect(data).toBeNull()
      // secondRoundId stays null — no cleanup needed
    }
  )

  it.skipIf(skipAll)(
    'INSERT with status=closed does NOT violate the unique index',
    async () => {
      const admin = getAdminClient()
      const { data, error } = await admin
        .from('rounds')
        .insert({
          title: 'A Closed Round',
          closing_date: '2026-01-01',
          status: 'closed',
          created_by: userId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      secondRoundId = data?.id ?? null
      // Close the first round now for completeness
      if (firstRoundId) {
        await admin.from('rounds').update({ status: 'closed' }).eq('id', firstRoundId)
      }
    }
  )
})
