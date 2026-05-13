'use client'

import { ClosedRoundCard } from './ClosedRoundCard'

interface ClosedRoundsListProps {
  rounds: Array<{
    id: string
    title: string
    status: string
    closing_date: string | null
    created_at: string
  }>
}

/**
 * ClosedRoundsList — displays all closed voting rounds in a list.
 * Each round can be clicked to view details or deleted by organizers.
 *
 * Ticket: AIEX-XXX (Voting History)
 */
export function ClosedRoundsList({ rounds }: ClosedRoundsListProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600 font-semibold text-lg mb-2">
          No voting rounds yet
        </p>
        <p className="text-zinc-500">
          Once a round closes, it will appear in the history.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rounds.map((round) => (
        <ClosedRoundCard key={round.id} round={round} />
      ))}
    </div>
  )
}
