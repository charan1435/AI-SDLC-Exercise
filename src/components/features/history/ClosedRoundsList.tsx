'use client'

import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClosedRoundsListProps {
  rounds: Array<{
    id: string
    title: string
    status: string
    closed_at: string | null
    created_at: string
  }>
}

/**
 * ClosedRoundsList — displays all closed voting rounds in a list.
 * Each round links to its detail page.
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
      {rounds.map((round) => {
        const closedDate = round.closed_at
          ? new Date(round.closed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : 'Date unknown'

        return (
          <Link href={`/history/${round.id}`} key={round.id}>
            <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-zinc-100 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-950 text-lg mb-1">
                    {round.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Calendar className="w-4 h-4" />
                    <span>Closed {closedDate}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-lime-600 flex-shrink-0" />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
