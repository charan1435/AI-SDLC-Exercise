import { cn } from '@/lib/utils'

interface StatusDotProps {
  status: 'open' | 'closed'
  className?: string
}

/**
 * StatusDot — small colored circle indicator.
 * Lime-500 with pulse for open, zinc-400 static for closed.
 *
 * Ticket: AIEX-821, AIEX-835
 */
export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span className={cn('relative flex h-2.5 w-2.5 flex-shrink-0', className)}>
      {status === 'open' && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75 animate-pulse-dot" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          status === 'open' ? 'bg-lime-500' : 'bg-zinc-400'
        )}
      />
    </span>
  )
}
