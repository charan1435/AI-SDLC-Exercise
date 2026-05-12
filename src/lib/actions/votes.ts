'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Vote } from '@/lib/types'
import type { ActionResult } from './rounds'

// ─── Zod schema ───────────────────────────────────────────────────────────

const VoteSchema = z.object({
  proposal_id: z.string().uuid('proposal_id must be a valid UUID'),
})

type ProposalRow = { id: string; round_id: string } | null

// ─── Shared proposal resolver ─────────────────────────────────────────────

async function resolveProposal(
  supabase: ReturnType<typeof createServerClient>,
  proposalId: string
): Promise<{ proposal: ProposalRow; error: unknown }> {
  const { data, error } = await supabase
    .from('proposals')
    .select('id, round_id')
    .eq('id', proposalId)
    .single()

  return { proposal: data as ProposalRow, error }
}

// ─── castVote ─────────────────────────────────────────────────────────────

/**
 * Server action — cast a vote on a proposal.
 * voter_id and round_id are derived server-side.
 * The DB trigger enforce_vote_ceiling() prevents the 4th vote.
 * The UNIQUE constraint prevents duplicate votes on the same book.
 * RLS prevents votes on closed rounds.
 *
 * Ticket: AIEX-828
 */
export async function castVote(
  input: z.infer<typeof VoteSchema>
): Promise<ActionResult<Vote>> {
  const user = await getUser()
  if (!user) {
    return { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } }
  }

  const parsed = VoteSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR },
    }
  }

  const supabase = createServerClient()

  // Resolve proposal to get round_id (server-derived, not trusted from client)
  const { proposal, error: proposalError } = await resolveProposal(supabase, parsed.data.proposal_id)
  if (proposalError || !proposal) {
    return { data: null, error: { message: ERROR_MESSAGES.PROPOSAL_NOT_FOUND } }
  }

  const { data, error } = await supabase
    .from('votes')
    .insert({
      proposal_id: proposal.id,
      voter_id: user.id,
      round_id: proposal.round_id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    // Trigger raised: 4th vote attempt
    if (error.code === 'P0001') {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.VOTE_CEILING, code: 'VOTE_CEILING' },
      }
    }
    // UNIQUE violation: duplicate vote on same book
    if (error.code === '23505') {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.DUPLICATE_VOTE, code: 'DUPLICATE_VOTE' },
      }
    }
    // RLS rejection: round is closed
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' },
      }
    }
    return { data: null, error: { message: error.message } }
  }

  revalidatePath('/rounds/' + proposal.round_id)
  return { data: data as Vote, error: null }
}

// ─── withdrawVote ─────────────────────────────────────────────────────────

/**
 * Server action — withdraw a previously cast vote.
 * RLS DELETE policy prevents withdrawing votes on closed rounds.
 *
 * Ticket: AIEX-828
 */
export async function withdrawVote(
  input: z.infer<typeof VoteSchema>
): Promise<ActionResult<null>> {
  const user = await getUser()
  if (!user) {
    return { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } }
  }

  const parsed = VoteSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR },
    }
  }

  const supabase = createServerClient()

  // Resolve proposal to get round_id for cache revalidation
  const { proposal, error: proposalError } = await resolveProposal(supabase, parsed.data.proposal_id)
  if (proposalError || !proposal) {
    return { data: null, error: { message: ERROR_MESSAGES.PROPOSAL_NOT_FOUND } }
  }

  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('proposal_id', parsed.data.proposal_id)
    .eq('voter_id', user.id)

  if (error) {
    // RLS rejection: round is closed
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' },
      }
    }
    return { data: null, error: { message: error.message } }
  }

  revalidatePath('/rounds/' + proposal.round_id)
  return { data: null, error: null }
}
