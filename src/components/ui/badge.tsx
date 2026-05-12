import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-3xl px-3 py-1 text-xs font-semibold font-sans transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-700',
        open: 'bg-lime-50 text-lime-700 ring-1 ring-lime-200',
        closed: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
        winner: 'bg-lime-400 text-zinc-950',
        success: 'bg-lime-50 text-lime-700',
        error: 'bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
