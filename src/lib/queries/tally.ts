import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import type { RoundDetail, ProposalWithTally, Round, Proposal } from '@/lib/types'

/**
 * getRoundWithProposalsAndTally — single round-trip aggregate query.
 *
 * Returns { round, proposals (with vote_count + my_vote_id + proposer_display_name),
 *           winner, my_vote_count } for a given round ID.
 *
 * The my_vote_id field lets the frontend know whether the current user has
 * already voted on each proposal without a second query.
 *
 * Ticket: AIEX-832
 */
export async function getRoundWithProposalsAndTally(
  roundId: string
): Promise<RoundDetail | null> {
  const supabase = createServerClient()
  const currentUser = await getUser()

  // 1. Fetch the round
  const { data: roundRaw, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .maybeSingle()

  if (roundError || !roundRaw) {
    console.error('[getRoundWithProposalsAndTally] round fetch error:', roundError?.message)
    return null
  }

  const round = roundRaw as Round

  // 2. Fetch proposals with proposer display name (joined)
  const { data: proposalsRaw, error: proposalsError } = await supabase
    .from('proposals')
    .select('*, users!proposals_proposer_id_fkey(display_name)')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true })

  if (proposalsError) {
    console.error('[getRoundWithProposalsAndTally] proposals fetch error:', proposalsError.message)
    return null
  }

  // 3. Fetch tally via the round_tally function
  const { data: tallyRowsRaw, error: tallyError } = await supabase.rpc('round_tally', {
    round_id: roundId,
  } as Record<string, unknown>)

  if (tallyError) {
    console.error('[getRoundWithProposalsAndTally] tally fetch error:', tallyError.message)
    return null
  }

  const tallyRows = tallyRowsRaw as Array<{ proposal_id: string; vote_count: number }> | null

  // 4. Fetch current user's votes in this round (for my_vote_id)
  const myVotes: Record<string, string> = {}
  if (currentUser) {
    const { data: myVoteRows, error: myVotesError } = await supabase
      .from('votes')
      .select('id, proposal_id')
      .eq('round_id', roundId)
      .eq('voter_id', currentUser.id)

    if (!myVotesError && myVoteRows) {
      const rows = myVoteRows as Array<{ id: string; proposal_id: string }>
      for (const v of rows) {
        myVotes[v.proposal_id] = v.id
      }
    }
  }

  // 5. Build tally map: proposal_id → vote_count
  const tallyMap: Record<string, number> = {}
  for (const row of tallyRows ?? []) {
    tallyMap[row.proposal_id] = Number(row.vote_count)
  }

  // 6. Merge proposals with tally + my_vote_id + proposer_display_name
  type RawProposalWithJoin = Proposal & { users?: { display_name?: string } | null }
  const rawProposals = (proposalsRaw ?? []) as RawProposalWithJoin[]

  const proposals: ProposalWithTally[] = rawProposals.map((p) => {
    const displayName = p.users?.display_name ?? 'Unknown'
    // Strip the joined `users` field from the base shape
    const { users: _u, ...proposalBase } = p

    return {
      ...(proposalBase as Proposal),
      vote_count: tallyMap[p.id] ?? 0,
      my_vote_id: myVotes[p.id] ?? null,
      proposer_display_name: displayName,
    }
  })

  // 7. Resolve winner proposal (if round is closed)
  let winner: ProposalWithTally | null = null
  if (round.status === 'closed' && round.winner_proposal_id) {
    winner = proposals.find((p) => p.id === round.winner_proposal_id) ?? null
  }

  const my_vote_count = Object.keys(myVotes).length

  return {
    round,
    proposals,
    winner,
    my_vote_count,
  }
}
