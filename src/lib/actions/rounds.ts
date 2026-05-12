'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Round } from '@/lib/types'

// ─── Zod schemas ──────────────────────────────────────────────────────────

const OpenRoundSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or fewer'),
  closing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'closing_date must be a valid date in YYYY-MM-DD format'),
})

const CloseRoundSchema = z.object({
  round_id: z.string().uuid('round_id must be a valid UUID'),
})

// ─── Action result type ────────────────────────────────────────────────────

export interface ActionResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// ─── openRound ────────────────────────────────────────────────────────────

/**
 * Server action — open a new voting round.
 * Mirrors POST /api/rounds but can be imported directly into form submit handlers.
 *
 * Ticket: AIEX-816
 */
export async function openRound(
  input: z.infer<typeof OpenRoundSchema>
): Promise<ActionResult<Round>> {
  const user = await getUser()
  if (!user) {
    return { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } }
  }

  const parsed = OpenRoundSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR },
    }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('rounds')
    .insert({
      title: parsed.data.title,
      closing_date: parsed.data.closing_date,
      created_by: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        data: null,
        error: { message: ERROR_MESSAGES.ROUND_ALREADY_OPEN, code: 'ROUND_ALREADY_OPEN' },
      }
    }
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return { data: null, error: { message: ERROR_MESSAGES.UNAUTHORIZED } }
    }
    return { data: null, error: { message: error.message } }
  }

  revalidatePath('/')
  return { data: data as Round, error: null }
}

// ─── closeRound ───────────────────────────────────────────────────────────

/**
 * Server action — close an open round and persist the winner.
 * Mirrors PATCH /api/rounds/[id]/close.
 *
 * Ticket: AIEX-820
 */
export async function closeRound(
  input: z.infer<typeof CloseRoundSchema>
): Promise<ActionResult<Round>> {
  const user = await getUser()
  if (!user) {
    return { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } }
  }

  const parsed = CloseRoundSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR },
    }
  }

  const supabase = createServerClient()

  // Verify round exists and is open
  const { data: roundRaw, error: fetchError } = await supabase
    .from('rounds')
    .select('id, status')
    .eq('id', parsed.data.round_id)
    .single()

  const round = roundRaw as { id: string; status: string } | null

  if (fetchError || !round) {
    return { data: null, error: { message: ERROR_MESSAGES.ROUND_NOT_FOUND } }
  }

  if (round.status !== 'open') {
    return { data: null, error: { message: ERROR_MESSAGES.ROUND_CLOSED } }
  }

  // Compute winner via tally function (sorted DESC vote_count, ASC created_at)
  const { data: tallyRowsRaw, error: tallyError } = await supabase.rpc('round_tally', {
    round_id: parsed.data.round_id,
  } as Record<string, unknown>)

  if (tallyError) {
    return { data: null, error: { message: 'Failed to compute tally: ' + tallyError.message } }
  }

  const tallyRows = tallyRowsRaw as Array<{ proposal_id: string; vote_count: number }> | null
  const winnerProposalId = tallyRows?.[0]?.proposal_id ?? null

  // Close the round (RLS enforces organizer-only)
  const { data: updatedRoundRaw, error: updateError } = await supabase
    .from('rounds')
    .update({
      status: 'closed',
      winner_proposal_id: winnerProposalId,
    } as Record<string, unknown>)
    .eq('id', parsed.data.round_id)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === '42501' || updateError.message?.toLowerCase().includes('policy')) {
      return { data: null, error: { message: ERROR_MESSAGES.UNAUTHORIZED } }
    }
    return { data: null, error: { message: updateError.message } }
  }

  revalidatePath('/rounds/' + parsed.data.round_id)
  revalidatePath('/')
  return { data: updatedRoundRaw as Round, error: null }
}
