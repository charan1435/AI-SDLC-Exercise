import { cn } from '@/lib/utils'

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main
      className={cn(
        'max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10',
        'flex flex-col gap-6',
        className
      )}
    >
      {children}
    </main>
  )
}
