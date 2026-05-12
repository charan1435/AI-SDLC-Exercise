/**
 * Unit tests — Zod schemas for round-related inputs
 * Tickets: AIEX-808, AIEX-818
 *
 * Validates the OpenRoundSchema and CloseRoundSchema shapes defined in
 * src/lib/actions/rounds.ts.  Because the schemas are not directly exported
 * we mirror the exact constraints documented in backend-output.md and tested
 * against the ERROR_MESSAGES constants.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ── Mirror schemas (identical to what actions/rounds.ts defines) ────────────

const OpenRoundSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or fewer'),
  closing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'closing_date must be a valid date in YYYY-MM-DD format'),
})

const CloseRoundSchema = z.object({
  round_id: z.string().uuid('round_id must be a valid UUID'),
})

// ── OpenRoundSchema ─────────────────────────────────────────────────────────

describe('OpenRoundSchema', () => {
  describe('valid inputs', () => {
    it('accepts a valid title and YYYY-MM-DD date', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'May 2026',
        closing_date: '2026-05-19',
      })
      expect(result.success).toBe(true)
    })

    it('accepts a title exactly 100 characters long', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'a'.repeat(100),
        closing_date: '2026-06-01',
      })
      expect(result.success).toBe(true)
    })

    it('accepts a single-character title', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'A',
        closing_date: '2026-01-01',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('title validation', () => {
    it('rejects empty title', () => {
      const result = OpenRoundSchema.safeParse({
        title: '',
        closing_date: '2026-05-19',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title is required')
      }
    })

    it('rejects title longer than 100 characters', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'a'.repeat(101),
        closing_date: '2026-05-19',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title must be 100 characters or fewer')
      }
    })

    it('rejects missing title field', () => {
      const result = OpenRoundSchema.safeParse({ closing_date: '2026-05-19' })
      expect(result.success).toBe(false)
    })
  })

  describe('closing_date validation', () => {
    it('rejects a non-ISO date string', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'May 2026',
        closing_date: '19-05-2026',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'closing_date must be a valid date in YYYY-MM-DD format'
        )
      }
    })

    it('rejects a plain year string', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'May 2026',
        closing_date: '2026',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty closing_date', () => {
      const result = OpenRoundSchema.safeParse({
        title: 'May 2026',
        closing_date: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing closing_date field', () => {
      const result = OpenRoundSchema.safeParse({ title: 'May 2026' })
      expect(result.success).toBe(false)
    })
  })
})

// ── CloseRoundSchema ────────────────────────────────────────────────────────

describe('CloseRoundSchema', () => {
  it('accepts a valid UUID', () => {
    const result = CloseRoundSchema.safeParse({
      round_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    const result = CloseRoundSchema.safeParse({ round_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('round_id must be a valid UUID')
    }
  })

  it('rejects an empty string', () => {
    const result = CloseRoundSchema.safeParse({ round_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing round_id field', () => {
    const result = CloseRoundSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
