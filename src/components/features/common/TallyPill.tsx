import { cn } from '@/lib/utils'

interface TallyPillProps {
  count: number
  className?: string
}

/**
 * TallyPill — small mono-font vote count pill on ProposalCard top-right.
 *
 * Ticket: AIEX-833
 */
export function TallyPill({ count, className }: TallyPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'bg-zinc-50 ring-1 ring-zinc-200 rounded-3xl',
        'px-3 py-1 min-w-[3rem]',
        className
      )}
    >
      <span className="font-mono text-xl font-medium text-zinc-700 leading-none">
        {String(count).padStart(2, '0')}
      </span>
    </div>
  )
}
