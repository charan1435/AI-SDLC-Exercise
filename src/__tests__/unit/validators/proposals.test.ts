/**
 * Unit tests — Zod schema for proposal inputs
 * Tickets: AIEX-826
 *
 * Mirrors AddProposalSchema from src/lib/actions/proposals.ts.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ── Mirror of AddProposalSchema ──────────────────────────────────────────────

const AddProposalSchema = z.object({
  round_id: z.string().uuid('round_id must be a valid UUID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  author: z.string().min(1, 'Author is required').max(100, 'Author must be 100 characters or fewer'),
  reason: z.string().max(500, 'Reason must be 500 characters or fewer').optional(),
})

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('AddProposalSchema', () => {
  describe('valid inputs', () => {
    it('accepts a full valid proposal with reason', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'Klara and the Sun',
        author: 'Kazuo Ishiguro',
        reason: 'A beautiful meditation on love and consciousness.',
      })
      expect(result.success).toBe(true)
    })

    it('accepts a proposal without reason (optional)', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'Piranesi',
        author: 'Susanna Clarke',
      })
      expect(result.success).toBe(true)
    })

    it('accepts a title exactly 200 characters long', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'a'.repeat(200),
        author: 'Some Author',
      })
      expect(result.success).toBe(true)
    })

    it('accepts a reason exactly 500 characters long', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'A Book',
        author: 'An Author',
        reason: 'x'.repeat(500),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('round_id validation', () => {
    it('rejects a non-UUID round_id', () => {
      const result = AddProposalSchema.safeParse({
        round_id: 'bad-id',
        title: 'A Book',
        author: 'An Author',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('round_id must be a valid UUID')
      }
    })
  })

  describe('title validation', () => {
    it('rejects an empty title', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: '',
        author: 'An Author',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title is required')
      }
    })

    it('rejects a title longer than 200 characters', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'a'.repeat(201),
        author: 'An Author',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title must be 200 characters or fewer')
      }
    })
  })

  describe('author validation', () => {
    it('rejects an empty author', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'A Book',
        author: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Author is required')
      }
    })

    it('rejects an author longer than 100 characters', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'A Book',
        author: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Author must be 100 characters or fewer')
      }
    })
  })

  describe('reason validation', () => {
    it('rejects a reason longer than 500 characters', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'A Book',
        author: 'An Author',
        reason: 'x'.repeat(501),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Reason must be 500 characters or fewer')
      }
    })

    it('allows reason to be undefined', () => {
      const result = AddProposalSchema.safeParse({
        round_id: VALID_UUID,
        title: 'A Book',
        author: 'An Author',
        reason: undefined,
      })
      expect(result.success).toBe(true)
    })
  })
})
