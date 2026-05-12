import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Vote } from '@/lib/types'

/**
 * POST /api/votes   — cast a vote
 * DELETE /api/votes — withdraw a vote
 *
 * voter_id and round_id are derived server-side — NEVER trusted from body.
 * round_id is resolved by looking up the proposal's round.
 *
 * Server guardrail errors (the 4 canonical messages from the spec):
 *   - 4th vote attempt    → trigger raises P0001 → "You have used all 3 votes — withdraw one to vote again."
 *   - Duplicate vote      → UNIQUE violation 23505 → "You already voted for this book."
 *   - Closed round        → RLS rejection 42501 → "This round is closed."
 *   - Proposal not found  → 404 → "Proposal not found."
 *
 * Ticket: AIEX-828
 *
 * Input:  { proposal_id: uuid }
 * Output: { data: Vote | null, error: null } | { data: null, error: { message, code? } }
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VoteSchema = z.object({
  proposal_id: z.string().regex(UUID_REGEX, 'proposal_id must be a valid UUID'),
})

type ProposalRow = { id: string; round_id: string } | null

// ─── Shared helpers ────────────────────────────────────────────────────────

function parseVoteBody(body: unknown) {
  return VoteSchema.safeParse(body)
}

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

// ─── POST — cast a vote ────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Authenticate
  const user = await getUser()
  if (!user) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } },
      { status: 401 }
    )
  }

  // 2. Validate
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  const parsed = parseVoteBody(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR } },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // 3. Resolve proposal → get round_id (server-derived, never from body)
  const { proposal, error: proposalError } = await resolveProposal(supabase, parsed.data.proposal_id)
  if (proposalError || !proposal) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.PROPOSAL_NOT_FOUND } },
      { status: 404 }
    )
  }

  // 4. Insert vote.
  //    RLS enforces: voter_id = auth.uid() AND round is open.
  //    Trigger enforces: voter has < 3 votes in round.
  //    UNIQUE constraint enforces: no duplicate vote.
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
    // 4th-vote attempt — trigger raised P0001
    if (error.code === 'P0001') {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.VOTE_CEILING, code: 'VOTE_CEILING' } },
        { status: 422 }
      )
    }
    // Duplicate vote — UNIQUE (proposal_id, voter_id) violation
    if (error.code === '23505') {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.DUPLICATE_VOTE, code: 'DUPLICATE_VOTE' } },
        { status: 409 }
      )
    }
    // Closed-round or permission rejection by RLS
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' } },
        { status: 403 }
      )
    }
    return Response.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data as Vote, error: null }, { status: 201 })
}

// ─── DELETE — withdraw a vote ──────────────────────────────────────────────

export async function DELETE(request: Request) {
  // 1. Authenticate
  const user = await getUser()
  if (!user) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } },
      { status: 401 }
    )
  }

  // 2. Validate
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  const parsed = parseVoteBody(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR } },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // 3. Resolve proposal → confirm it exists and get round_id
  const { proposal, error: proposalError } = await resolveProposal(supabase, parsed.data.proposal_id)
  if (proposalError || !proposal) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.PROPOSAL_NOT_FOUND } },
      { status: 404 }
    )
  }

  // 4. Delete the vote row.
  //    RLS DELETE policy enforces: voter_id = auth.uid() AND round is open.
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('proposal_id', parsed.data.proposal_id)
    .eq('voter_id', user.id)

  if (error) {
    // Closed-round or permission rejection by RLS
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' } },
        { status: 403 }
      )
    }
    return Response.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: null, error: null }, { status: 200 })
}
