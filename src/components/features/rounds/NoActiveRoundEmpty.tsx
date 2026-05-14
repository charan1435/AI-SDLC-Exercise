import Link from 'next/link'
import { BookOpen, History } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NoActiveRoundEmptyProps {
  isOrganizer: boolean
}

/**
 * NoActiveRoundEmpty — shown on / when no round is currently open.
 * Member variant: informational message + View History button.
 * Organizer variant: message + "Open a round" primary CTA + View History button.
 *
 * Tickets: AIEX-813, AIEX-817, AIEX-835, AIEX-XXX (Voting History)
 */
export function NoActiveRoundEmpty({ isOrganizer }: NoActiveRoundEmptyProps) {
  return (
    <div className="bg-white rounded-card p-10 shadow-card flex flex-col items-center text-center gap-6 animate-fade-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <BookOpen className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
      </div>

      {isOrganizer ? (
        <>
          <div>
            <h2 className="font-sans font-extrabold text-2xl text-zinc-950 mb-2">
              No round is open.
            </h2>
            <p className="font-sans text-base text-zinc-600">
              Start a new one.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button variant="primary" asChild>
              <Link href="/rounds/new">
                + Open a round
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/history">
                <History className="w-4 h-4 mr-2" />
                View history
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <div>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 mb-2">
            No round is open yet.
          </h2>
          <p className="font-sans text-base text-zinc-600 leading-relaxed mb-6">
            Ask your organizer to open the next round.
          </p>
          <Button variant="outline" asChild>
            <Link href="/history">
              <History className="w-4 h-4 mr-2" />
              View history
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
