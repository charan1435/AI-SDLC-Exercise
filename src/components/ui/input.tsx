import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base text-zinc-950 placeholder:text-zinc-400',
          'h-14 transition-colors duration-150',
          'focus:outline-none focus:border-zinc-950 focus:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'font-sans',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
