import { ProposalCard } from './ProposalCard'
import { EmptyProposalsState } from './EmptyProposalsState'
import type { ProposalWithTally } from '@/lib/types'

interface ProposalsListProps {
  proposals: ProposalWithTally[]
  isRoundOpen: boolean
  winnerId?: string | null
  myVoteCount: number
  maxVotes?: number
}

/**
 * ProposalsList — maps proposals (already sorted by created_at ASC from query)
 * to numbered ProposalCards. Shows EmptyProposalsState if no proposals yet.
 *
 * Ticket: AIEX-825, AIEX-833
 */
export function ProposalsList({
  proposals,
  isRoundOpen,
  winnerId,
  myVoteCount,
  maxVotes = 3,
}: ProposalsListProps) {
  const remaining = maxVotes - myVoteCount

  if (proposals.length === 0) {
    return <EmptyProposalsState />
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans font-semibold text-sm text-zinc-500">
        {proposals.length} book{proposals.length !== 1 ? 's' : ''} proposed
      </p>
      {proposals.map((proposal, i) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          slotIndex={i + 1}
          isRoundOpen={isRoundOpen}
          isWinner={!isRoundOpen && proposal.id === winnerId}
          remaining={remaining}
          animationDelay={i * 60}
        />
      ))}
    </div>
  )
}
