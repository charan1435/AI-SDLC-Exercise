'use client'

import Link from 'next/link'
import { Trophy, ArrowLeft, Book, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RoundDetailsProps {
  round: {
    id: string
    title: string
    status: string
    closing_date: string | null
    created_at: string
  }
  proposals: Array<{
    id: string
    title: string
    author: string
    reason: string
    created_at: string
    voteCount: number
  }>
  winner: {
    id: string
    title: string
    author: string
    reason: string
    created_at: string
    voteCount?: number
  } | null
  winnerVotes: number
  totalVotes: number
}

/**
 * RoundDetails — displays a closed round with all proposals, vote tallies, and winner.
 *
 * Ticket: AIEX-XXX (Voting History)
 */
export function RoundDetails({
  round,
  proposals,
  winner,
  winnerVotes,
  totalVotes,
}: RoundDetailsProps) {
  const closedDate = round.closing_date
    ? new Date(round.closing_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unknown'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/history">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to history
          </Button>
        </Link>

        <h1 className="font-black text-4xl text-zinc-950 mb-2">{round.title}</h1>
        <p className="text-zinc-600 text-sm">
          Closed on {closedDate} • {totalVotes} total votes cast
        </p>
      </div>

      {/* Winner Announcement */}
      {winner ? (
        <div className="bg-gradient-to-br from-lime-50 to-lime-100 border-2 border-lime-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Trophy className="w-8 h-8 text-lime-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-black text-lime-900 text-2xl mb-1">
                {winner.title}
              </h2>
              <p className="text-lime-800 font-semibold mb-3">by {winner.author}</p>
              <p className="text-lime-700 text-sm leading-relaxed mb-4">
                {winner.reason}
              </p>
              <div className="bg-white bg-opacity-70 rounded-lg px-3 py-2 inline-block">
                <p className="font-bold text-lime-700">
                  {winnerVotes} {winnerVotes === 1 ? 'vote' : 'votes'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-900 font-semibold">
            No proposals were made in this round.
          </p>
        </div>
      )}

      {/* All Proposals Tally */}
      <div>
        <h3 className="font-bold text-xl text-zinc-950 mb-4">All Proposals</h3>
        {proposals.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">
            No proposals were submitted.
          </p>
        ) : (
          <div className="space-y-3">
            {proposals
              .sort((a, b) => b.voteCount - a.voteCount)
              .map((proposal) => {
                const isWinner = winner?.id === proposal.id
                return (
                  <div
                    key={proposal.id}
                    className={`rounded-lg p-4 border-2 transition-all ${
                      isWinner
                        ? 'bg-lime-50 border-lime-300'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-zinc-950 text-lg">
                          {proposal.title}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 mb-2">
                          <User className="w-4 h-4" />
                          <span>{proposal.author}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-black text-lime-600">
                          {proposal.voteCount}
                        </div>
                        <div className="text-xs text-zinc-500 font-semibold">
                          {proposal.voteCount === 1 ? 'vote' : 'votes'}
                        </div>
                      </div>
                    </div>
                    <p className="text-zinc-600 text-sm leading-relaxed">
                      {proposal.reason}
                    </p>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
