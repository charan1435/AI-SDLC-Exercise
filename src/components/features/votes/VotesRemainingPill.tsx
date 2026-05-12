import { cn } from '@/lib/utils'

interface VotesRemainingPillProps {
  remaining: number
  total: number
}

/**
 * VotesRemainingPill — "2 / 3 votes left" indicator.
 * Lime-50 ring normally, deeper lime when remaining = 0.
 *
 * Ticket: AIEX-829, AIEX-835
 */
export function VotesRemainingPill({ remaining, total }: VotesRemainingPillProps) {
  const isEmpty = remaining === 0

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-3xl px-4 py-2',
        'font-sans text-sm',
        isEmpty
          ? 'bg-lime-300 ring-1 ring-lime-400 text-lime-950'
          : 'bg-lime-50 ring-1 ring-lime-300 text-lime-900'
      )}
    >
      <span className="font-mono font-medium text-base leading-none">
        {remaining}
      </span>
      <span className="text-zinc-500 font-medium">/</span>
      <span className="font-mono font-medium text-base leading-none">
        {total}
      </span>
      <span className="font-medium ml-0.5">
        vote{remaining !== 1 ? 's' : ''} left
      </span>
    </div>
  )
}
