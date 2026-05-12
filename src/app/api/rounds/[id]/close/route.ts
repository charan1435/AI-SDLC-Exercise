import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Round } from '@/lib/types'

/**
 * PATCH /api/rounds/[id]/close
 *
 * Closes an open round. Organizer-only (RLS enforced).
 * Computes the winner via the round_tally function + tie-break rule:
 *   ORDER BY vote_count DESC, MIN(proposals.created_at) ASC LIMIT 1
 * Persists winner_proposal_id and status='closed' atomically.
 *
 * Ticket: AIEX-820
 *
 * Input:  none (round ID from URL param)
 * Output: { data: Round, error: null } | { data: null, error: { message } }
 */

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const roundId = params.id

  // 1. Authenticate
  const user = await getUser()
  if (!user) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } },
      { status: 401 }
    )
  }

  const supabase = createServerClient()

  // 2. Verify the round exists and is open
  const { data: roundRaw, error: fetchError } = await supabase
    .from('rounds')
    .select('id, status, created_by')
    .eq('id', roundId)
    .single()

  const round = roundRaw as { id: string; status: string; created_by: string } | null

  if (fetchError || !round) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.ROUND_NOT_FOUND } },
      { status: 404 }
    )
  }

  if (round.status !== 'open') {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.ROUND_CLOSED } },
      { status: 409 }
    )
  }

  // 3. Compute winner: highest vote count, tie-break by earliest proposal created_at.
  //    The round_tally function is already sorted DESC vote_count, ASC created_at.
  const { data: tallyRowsRaw, error: tallyError } = await supabase.rpc('round_tally', {
    round_id: roundId,
  } as Record<string, unknown>)

  if (tallyError) {
    return Response.json(
      { data: null, error: { message: 'Failed to compute tally: ' + tallyError.message } },
      { status: 500 }
    )
  }

  const tallyRows = tallyRowsRaw as Array<{ proposal_id: string; vote_count: number }> | null
  const winnerProposalId = tallyRows?.[0]?.proposal_id ?? null

  // 4. Close the round (RLS enforces organizer-only via rounds_update_organizer policy)
  const { data: updatedRoundRaw, error: updateError } = await supabase
    .from('rounds')
    .update({
      status: 'closed',
      winner_proposal_id: winnerProposalId,
    } as Record<string, unknown>)
    .eq('id', roundId)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === '42501' || updateError.message?.toLowerCase().includes('policy')) {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.UNAUTHORIZED } },
        { status: 403 }
      )
    }
    return Response.json(
      { data: null, error: { message: updateError.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: updatedRoundRaw as Round, error: null }, { status: 200 })
}
