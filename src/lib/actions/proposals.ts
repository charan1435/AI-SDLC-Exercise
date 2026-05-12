'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Proposal } from '@/lib/types'
import type { ActionResult } from './rounds'

// ─── Zod schema ───────────────────────────────────────────────────────────

const AddProposalSchema = z.object({
  round_id: z.string().uuid('round_id must be a valid UUID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  author: z.string().min(1, 'Author is required').max(100, 'Author must be 100 characters or fewer'),
  reason: z.string().max(500, 'Reason must be 500 characters or fewer').optional(),
})

// ─── addProposal ──────────────────────────────────────────────────────────

/**
 * Server action — add a book proposal to an open round.
 * proposer_id is derived from the session — NEVER from the input.
 * RLS INSERT policy enforces the round must be open (closed-round lockdown R2).
 *
 * Ticket: AIEX-824
 */
export async function addProposal(
  input: z.infer<typeof AddProposalSchema>
): Promise<ActionResult<Proposal>> {
  const user = await getUser()
  if (!user) {
    return { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } }
  }

  const parsed = AddProposalSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR },
    }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      round_id: parsed.data.round_id,
      title: parsed.data.title,
      author: parsed.data.author,
      reason: parsed.data.reason ?? null,
      proposer_id: user.id,       // server-derived — never from body
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    // RLS rejected: round is closed
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' },
      }
    }
    // FK violation: round_id doesn't exist
    if (error.code === '23503') {
      return { data: null, error: { message: ERROR_MESSAGES.ROUND_NOT_FOUND } }
    }
    return { data: null, error: { message: error.message } }
  }

  revalidatePath('/rounds/' + parsed.data.round_id)
  revalidatePath('/')
  return { data: data as Proposal, error: null }
}
