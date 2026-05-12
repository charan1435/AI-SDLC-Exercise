import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-2xl border border-zinc-200 bg-white p-5',
          'min-h-24 text-base text-zinc-950 placeholder:text-zinc-400',
          'transition-colors duration-150 resize-none',
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
Textarea.displayName = 'Textarea'

export { Textarea }
