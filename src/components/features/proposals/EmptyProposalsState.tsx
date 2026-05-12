import { BookOpen } from 'lucide-react'

/**
 * EmptyProposalsState — shown when a round has no proposals yet.
 *
 * Ticket: AIEX-835
 */
export function EmptyProposalsState() {
  return (
    <div className="bg-white rounded-card p-10 shadow-card flex flex-col items-center text-center gap-4 animate-fade-up stagger-3">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <BookOpen className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="font-sans font-extrabold text-xl text-zinc-950 mb-1">
          No proposals yet.
        </h3>
        <p className="font-sans text-base text-zinc-600 leading-relaxed">
          Be the first to suggest a book.
        </p>
      </div>
    </div>
  )
}
