import { StatusDot } from '@/components/features/common/StatusDot'
import type { Round } from '@/lib/types'

interface RoundHeaderProps {
  round: Round
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * RoundHeader — status dot + status label + closing date + round title.
 * Rendered at the top of the round detail page.
 *
 * Tickets: AIEX-821, AIEX-833
 */
export function RoundHeader({ round }: RoundHeaderProps) {
  return (
    <div className="bg-white rounded-card p-6 md:p-8 ring-1 ring-zinc-200 animate-fade-up stagger-1">
      {/* Status row */}
      <div className="flex items-center gap-2 mb-3">
        <StatusDot status={round.status} />
        <span className="font-sans font-semibold text-sm text-zinc-600 uppercase tracking-wider">
          {round.status === 'open' ? 'Open' : 'Closed'}
        </span>
        <span className="text-zinc-300 text-sm">·</span>
        <span className="font-sans text-sm text-zinc-500">
          {round.status === 'open' ? 'closes' : 'closed'}{' '}
          {formatDate(round.closing_date)}
        </span>
      </div>

      {/* Round title */}
      <h1 className="font-sans font-black text-4xl text-zinc-950 leading-tight">
        {round.title}
      </h1>
    </div>
  )
}
