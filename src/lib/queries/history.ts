import { createServerClient } from '@/lib/supabase/server'
import type { Round } from '@/lib/types'

/**
 * getClosedRounds — fetch all closed voting rounds, ordered by closing date (newest first).
 * Ticket: AIEX-XXX (Voting History)
 */
export async function getClosedRounds() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('rounds')
    .select('id, title, status, closed_at, created_at')
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })

  if (error) {
    console.error('Error fetching closed rounds:', error)
    return []
  }

  return (data || []) as Array<{
    id: string
    title: string
    status: string
    closed_at: string | null
    created_at: string
  }>
}

/**
 * getRoundDetails — fetch a single round with all proposals and votes.
 * Used to display round detail page with winner announcement.
 * Ticket: AIEX-XXX (Voting History)
 */
export async function getRoundDetails(roundId: string) {
  const supabase = createServerClient()

  // Fetch round metadata
  const { data: roundData, error: roundError } = await supabase
    .from('rounds')
    .select('id, title, status, closed_at, created_at')
    .eq('id', roundId)
    .single()

  if (roundError || !roundData) {
    console.error('Error fetching round:', roundError)
    return null
  }

  // Fetch all proposals in this round with vote counts
  const { data: proposalsData, error: proposalsError } = await supabase
    .from('proposals')
    .select('id, title, author, reason, created_at')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true })

  if (proposalsError) {
    console.error('Error fetching proposals:', proposalsError)
    return null
  }

  // Fetch votes to count per proposal
  const { data: votesData, error: votesError } = await supabase
    .from('votes')
    .select('id, proposal_id, voter_id')
    .eq('round_id', roundId)

  if (votesError) {
    console.error('Error fetching votes:', votesError)
    return null
  }

  // Build tally: count votes per proposal
  const tally = new Map<string, number>()
  ;(votesData || []).forEach((vote) => {
    const count = tally.get(vote.proposal_id) || 0
    tally.set(vote.proposal_id, count + 1)
  })

  // Find winner (most votes, tie-break by earliest proposal)
  let winner: (typeof proposalsData)[0] | null = null
  let maxVotes = 0
  ;(proposalsData || []).forEach((proposal) => {
    const votes = tally.get(proposal.id) || 0
    if (votes > maxVotes) {
      maxVotes = votes
      winner = proposal
    }
  })

  return {
    round: roundData,
    proposals: (proposalsData || []).map((p) => ({
      ...p,
      voteCount: tally.get(p.id) || 0,
    })),
    winner,
    winnerVotes: maxVotes,
    totalVotes: votesData?.length || 0,
  }
}
