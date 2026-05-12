'use client'

import { useState } from 'react'
import { CloseRoundDialog } from './CloseRoundDialog'
import type { ProposalWithTally } from '@/lib/types'

interface CloseRoundButtonProps {
  roundId: string
  proposals: ProposalWithTally[]
}

/**
 * CloseRoundButton — sticky bottom button (organizer only, open round only).
 * Opens CloseRoundDialog for confirmation.
 *
 * Ticket: AIEX-821
 */
export function CloseRoundButton({ roundId, proposals }: CloseRoundButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
        <button
          onClick={() => setDialogOpen(true)}
          className="pointer-events-auto flex items-center gap-2 bg-white ring-1 ring-zinc-200 text-zinc-700 hover:bg-zinc-950 hover:text-white hover:ring-zinc-950 font-sans font-semibold text-sm px-6 h-12 rounded-[2rem] shadow-hero transition-all duration-200"
        >
          <span className="text-lime-500">◉</span>
          Close round
        </button>
      </div>

      <CloseRoundDialog
        roundId={roundId}
        proposals={proposals}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
