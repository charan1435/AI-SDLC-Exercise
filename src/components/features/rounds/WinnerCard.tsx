import { BigNumeral } from '@/components/features/common/BigNumeral'
import type { ProposalWithTally } from '@/lib/types'

interface WinnerCardProps {
  winner: ProposalWithTally
  slotNumber: number
  totalVotesCast: number
  totalMembers?: number
}

/**
 * WinnerCard — hero card for closed rounds.
 * Lime-400 background, big slot numeral, book title in Poppins 900.
 *
 * Tickets: AIEX-821, AIEX-835
 */
export function WinnerCard({
  winner,
  slotNumber,
  totalVotesCast,
  totalMembers,
}: WinnerCardProps) {
  return (
    <div className="bg-lime-400 rounded-card p-8 shadow-hero animate-scale-in">
      {/* Slot numeral */}
      <BigNumeral
        value={slotNumber}
        size="xl"
        className="text-zinc-950/20 mb-4 block"
      />

      {/* Winner label */}
      <p className="font-sans font-semibold text-sm text-zinc-950/70 mb-2">
        The winner is
      </p>

      {/* Book title */}
      <h2 className="font-sans font-black text-4xl text-zinc-950 leading-tight mb-3">
        {winner.title}
      </h2>

      {/* Author */}
      <p className="font-sans font-semibold text-xl text-zinc-950/80 mb-6">
        {winner.author}
      </p>

      {/* Vote count pill + proposer info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 rounded-3xl px-4 py-2">
            <span className="font-mono text-2xl font-medium text-zinc-950">
              {winner.vote_count}
            </span>
            <span className="font-sans text-sm text-zinc-600">
              {winner.vote_count === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        </div>

        <p className="font-sans text-xs text-zinc-950/70">
          Proposed by {winner.proposer_display_name}
        </p>

        {totalMembers != null && (
          <p className="font-sans text-xs text-zinc-950/70">
            {totalVotesCast} of {totalMembers} member
            {totalMembers !== 1 ? 's' : ''} voted
          </p>
        )}
      </div>
    </div>
  )
}
