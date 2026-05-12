import { BigNumeral } from '@/components/features/common/BigNumeral'
import { TallyPill } from '@/components/features/common/TallyPill'
import { VoteToggle } from '@/components/features/votes/VoteToggle'
import { cn } from '@/lib/utils'
import type { ProposalWithTally } from '@/lib/types'

interface ProposalCardProps {
  proposal: ProposalWithTally
  slotIndex: number          // 1-based (01, 02, 03…)
  isRoundOpen: boolean
  isWinner?: boolean
  remaining: number          // votes remaining for current user
  animationDelay?: number    // ms
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const past = new Date(dateStr).getTime()
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return diffMins <= 1 ? 'just now' : `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

/**
 * ProposalCard — numbered card per UX wireframe screen 5a.
 * Big decorative numeral top-left, tally pill top-right.
 * VoteToggle at bottom (only for open rounds).
 *
 * Ticket: AIEX-825, AIEX-829, AIEX-833
 */
export function ProposalCard({
  proposal,
  slotIndex,
  isRoundOpen,
  isWinner = false,
  remaining,
  animationDelay = 0,
}: ProposalCardProps) {
  const isVoted = !!proposal.my_vote_id

  return (
    <div
      className={cn(
        'bg-white rounded-card p-6 md:p-8 shadow-card',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-hero',
        isWinner && 'bg-lime-50 ring-1 ring-lime-200',
        'animate-fade-up opacity-0'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Top row: big numeral + tally pill */}
      <div className="flex items-start justify-between mb-5">
        <BigNumeral
          value={slotIndex}
          size="lg"
          className="text-zinc-200"
        />
        <div className="flex items-center gap-2">
          {isWinner && (
            <span className="font-sans font-semibold text-xs text-lime-700 bg-lime-100 rounded-3xl px-3 py-1">
              WINNER
            </span>
          )}
          <TallyPill count={proposal.vote_count} />
        </div>
      </div>

      {/* Book title */}
      <h3 className="font-sans font-bold text-xl text-zinc-950 mb-1 leading-snug">
        {proposal.title}
      </h3>

      {/* Author */}
      <p className="font-sans font-medium text-base text-zinc-600 mb-3">
        {proposal.author}
      </p>

      {/* Reason */}
      {proposal.reason && (
        <p className="font-sans text-base text-zinc-700 leading-relaxed mb-4 line-clamp-4">
          &ldquo;{proposal.reason}&rdquo;
        </p>
      )}

      {/* Footer meta */}
      <p className="font-sans text-xs text-zinc-400 mb-4">
        Proposed by{' '}
        <span className="font-medium text-zinc-500">
          {proposal.proposer_display_name}
        </span>
        {' · '}
        {timeAgo(proposal.created_at)}
      </p>

      {/* Vote toggle — only for open rounds */}
      {isRoundOpen && (
        <VoteToggle
          proposalId={proposal.id}
          isVoted={isVoted}
          remaining={remaining}
        />
      )}
    </div>
  )
}
