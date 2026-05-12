import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-lime-400 text-zinc-950 hover:bg-lime-500 rounded-2xl h-14 px-6',
        secondary:
          'bg-zinc-950 text-zinc-50 hover:bg-zinc-800 rounded-2xl h-14 px-6',
        ghost:
          'bg-transparent text-zinc-950 hover:bg-zinc-100 rounded-2xl h-14 px-6 ring-1 ring-transparent hover:ring-lime-400',
        outline:
          'bg-white text-zinc-950 ring-1 ring-zinc-200 hover:ring-lime-400 rounded-2xl h-14 px-6',
        danger:
          'bg-red-50 text-red-700 hover:bg-red-100 rounded-2xl h-14 px-6 ring-1 ring-red-200',
      },
      size: {
        default: 'h-14 px-6 text-base',
        sm: 'h-10 px-4 text-sm rounded-xl',
        lg: 'h-16 px-8 text-lg',
        icon: 'h-10 w-10 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
