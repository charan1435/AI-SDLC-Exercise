'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { closeRound } from '@/lib/actions/rounds'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ProposalWithTally } from '@/lib/types'

interface CloseRoundDialogProps {
  roundId: string
  proposals: ProposalWithTally[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * CloseRoundDialog — confirm overlay with mini-tally preview.
 * Cancel + "Close round" buttons. Uses closeRound server action.
 *
 * Ticket: AIEX-821
 */
export function CloseRoundDialog({
  roundId,
  proposals,
  open,
  onOpenChange,
}: CloseRoundDialogProps) {
  const [loading, setLoading] = useState(false)

  // Sort by vote count DESC for the mini-tally preview
  const sortedProposals = [...proposals].sort(
    (a, b) => b.vote_count - a.vote_count || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  async function handleClose() {
    setLoading(true)
    const result = await closeRound({ round_id: roundId })
    setLoading(false)

    if (result.error) {
      toast.error(result.error.message)
      onOpenChange(false)
      return
    }

    const winnerTitle = result.data?.winner_proposal_id
      ? proposals.find((p) => p.id === result.data?.winner_proposal_id)?.title
      : null

    toast.success(
      winnerTitle
        ? `Round closed. Winner: "${winnerTitle}".`
        : 'Round closed.'
    )
    onOpenChange(false)
    // Page will revalidate via revalidatePath in the action
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this round?</DialogTitle>
          <DialogDescription>
            This locks voting and announces the winner. Once closed, no more
            proposals or vote changes can be made.
          </DialogDescription>
        </DialogHeader>

        {/* Mini-tally */}
        {proposals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Current standings
            </p>
            <div className="flex flex-col gap-2">
              {sortedProposals.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-2 px-3 bg-zinc-50 rounded-2xl"
                >
                  <span className="font-mono text-sm font-medium text-zinc-400 w-6 text-center">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 font-sans text-sm font-medium text-zinc-700 truncate">
                    {p.title}
                  </span>
                  <span className="font-mono text-sm font-semibold text-zinc-950">
                    {p.vote_count}
                    <span className="font-sans font-normal text-zinc-400 ml-1">
                      {p.vote_count === 1 ? 'vote' : 'votes'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleClose}
            disabled={loading}
          >
            {loading ? 'Closing…' : 'Close round'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
