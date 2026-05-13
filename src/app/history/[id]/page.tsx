import { getRoundDetails } from '@/lib/queries/history'
import { RoundDetails } from '@/components/features/history/RoundDetails'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Round Details — Reading List Vote',
}

/**
 * RoundDetailPage — displays a single closed round with winner announcement.
 * Shows all proposals, vote counts, and the winning book.
 *
 * Ticket: AIEX-XXX (Voting History)
 */
export default async function RoundDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const roundDetails = await getRoundDetails(params.id)

  if (!roundDetails) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <RoundDetails
          round={roundDetails.round}
          proposals={roundDetails.proposals}
          winner={roundDetails.winner}
          winnerVotes={roundDetails.winnerVotes}
          totalVotes={roundDetails.totalVotes}
        />
      </div>
    </div>
  )
}
