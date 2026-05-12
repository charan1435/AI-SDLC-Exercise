'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Sparkles } from 'lucide-react'
import { castVote, withdrawVote } from '@/lib/actions/votes'
import { ERROR_MESSAGES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface VoteToggleProps {
  proposalId: string
  isVoted: boolean
  remaining: number
}

/**
 * VoteToggle — the in-card vote toggle.
 * Optimistic UI flip. On error: toast + rollback.
 * Unvoted: white + ring-zinc-300. Voted: bg-lime-400.
 * Disabled when remaining = 0 and not voted (can only withdraw).
 *
 * Ticket: AIEX-829
 */
export function VoteToggle({ proposalId, isVoted, remaining }: VoteToggleProps) {
  const [optimisticVoted, setOptimisticVoted] = useState(isVoted)
  const [isPending, startTransition] = useTransition()

  const disabled = isPending || (!optimisticVoted && remaining <= 0)

  function handleClick() {
    if (disabled) {
      if (!optimisticVoted && remaining <= 0) {
        toast.error(ERROR_MESSAGES.VOTE_CEILING)
      }
      return
    }

    const wasVoted = optimisticVoted
    // Optimistic flip
    setOptimisticVoted(!wasVoted)

    startTransition(async () => {
      try {
        if (wasVoted) {
          const result = await withdrawVote({ proposal_id: proposalId })
          if (result.error) {
            toast.error(result.error.message)
            setOptimisticVoted(wasVoted) // roll back
          }
        } else {
          const result = await castVote({ proposal_id: proposalId })
          if (result.error) {
            toast.error(result.error.message)
            setOptimisticVoted(wasVoted) // roll back
          }
        }
      } catch {
        toast.error('Something went wrong. Please try again.')
        setOptimisticVoted(wasVoted) // roll back
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled && !optimisticVoted}
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'h-12 rounded-[2rem] font-sans font-semibold text-sm',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2',
        optimisticVoted
          ? 'bg-lime-400 text-zinc-950 ring-2 ring-lime-400 hover:bg-lime-500'
          : remaining <= 0
          ? 'bg-zinc-50 text-zinc-400 ring-1 ring-zinc-200 cursor-not-allowed opacity-60'
          : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:ring-lime-400 hover:ring-2 hover:text-zinc-950'
      )}
    >
      {optimisticVoted ? (
        <>
          <Check className="h-4 w-4" />
          Voted
          <Sparkles className="h-3.5 w-3.5 opacity-70" />
        </>
      ) : (
        'Vote for this'
      )}
    </button>
  )
}
