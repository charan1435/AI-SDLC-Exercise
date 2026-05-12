import { cn } from '@/lib/utils'

interface BigNumeralProps {
  value: string | number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'text-4xl',
  md: 'text-5xl',
  lg: 'text-6xl',
  xl: 'text-8xl',
}

/**
 * BigNumeral — reusable decorative number (Poppins 900).
 * Used by ProposalCard (zinc-200, decorative) and WinnerCard (ink, hero).
 *
 * Tickets: AIEX-825, AIEX-821, AIEX-835
 */
export function BigNumeral({ value, className, size = 'lg' }: BigNumeralProps) {
  const display = typeof value === 'number'
    ? String(value).padStart(2, '0')
    : value

  return (
    <span
      className={cn(
        'font-sans font-black leading-none select-none',
        sizeClasses[size],
        className
      )}
    >
      {display}
    </span>
  )
}
