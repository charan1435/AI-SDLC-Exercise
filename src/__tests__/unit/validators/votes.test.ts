/**
 * Unit tests — Zod schema for vote inputs
 * Tickets: AIEX-808, AIEX-830
 *
 * Mirrors VoteSchema from src/lib/actions/votes.ts.
 * Also validates the ERROR_MESSAGES constants are correct strings
 * (so any backend change breaks tests loudly).
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/types'

// ── Mirror of VoteSchema ─────────────────────────────────────────────────────

const VoteSchema = z.object({
  proposal_id: z.string().uuid('proposal_id must be a valid UUID'),
})

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('VoteSchema', () => {
  it('accepts a valid UUID proposal_id', () => {
    const result = VoteSchema.safeParse({ proposal_id: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    const result = VoteSchema.safeParse({ proposal_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('proposal_id must be a valid UUID')
    }
  })

  it('rejects an empty string', () => {
    const result = VoteSchema.safeParse({ proposal_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing proposal_id field', () => {
    const result = VoteSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a numeric proposal_id', () => {
    const result = VoteSchema.safeParse({ proposal_id: 12345 })
    expect(result.success).toBe(false)
  })
})

// ── ERROR_MESSAGES contract test ─────────────────────────────────────────────
// Import the real constants and assert exact strings. If the backend changes
// a message string, these assertions catch the break before toasts silently
// show wrong copy.

describe('ERROR_MESSAGES constants (vote guardrails)', () => {
  it('VOTE_CEILING message matches spec', () => {
    expect(ERROR_MESSAGES.VOTE_CEILING).toBe(
      'You have used all 3 votes — withdraw one to vote again.'
    )
  })

  it('DUPLICATE_VOTE message matches spec', () => {
    expect(ERROR_MESSAGES.DUPLICATE_VOTE).toBe('You already voted for this book.')
  })

  it('ROUND_CLOSED message matches spec', () => {
    expect(ERROR_MESSAGES.ROUND_CLOSED).toBe('This round is closed.')
  })

  it('PROPOSAL_NOT_FOUND message matches spec', () => {
    expect(ERROR_MESSAGES.PROPOSAL_NOT_FOUND).toBe('Proposal not found.')
  })

  it('ROUND_ALREADY_OPEN message matches spec', () => {
    expect(ERROR_MESSAGES.ROUND_ALREADY_OPEN).toBe('A round is already open — close it first.')
  })

  it('ROUND_NOT_FOUND message matches spec', () => {
    expect(ERROR_MESSAGES.ROUND_NOT_FOUND).toBe('Round not found.')
  })

  it('UNAUTHORIZED message matches spec', () => {
    expect(ERROR_MESSAGES.UNAUTHORIZED).toBe(
      'You are not authorised to perform this action.'
    )
  })

  it('UNAUTHENTICATED message matches spec', () => {
    expect(ERROR_MESSAGES.UNAUTHENTICATED).toBe('You must be signed in.')
  })
})
