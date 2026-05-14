import { getClosedRounds } from '@/lib/queries/history'
import { ClosedRoundsList } from '@/components/features/history/ClosedRoundsList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Voting History — Reading List Vote',
}

/**
 * HistoryPage — displays all closed voting rounds.
 * Shows a list of past rounds; click to see details and winner.
 *
 * Ticket: AIEX-XXX (Voting History)
 */
export default async function HistoryPage() {
  const closedRounds = await getClosedRounds()

  return (
    <div className="min-h-screen bg-canvas">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to voting
            </Button>
          </Link>

          <h1 className="font-black text-5xl text-zinc-950 mb-3">
            Voting History
          </h1>
          <p className="text-zinc-600 text-lg">
            Browse past reading list voting rounds and see which books won.
          </p>
        </div>

        {/* Rounds List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ClosedRoundsList rounds={closedRounds} />
        </div>
      </div>
    </div>
  )
}
