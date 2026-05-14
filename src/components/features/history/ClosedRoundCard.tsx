'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteRound } from '@/lib/actions/history'
import { Button } from '@/components/ui/button'

interface ClosedRoundCardProps {
  round: {
    id: string
    title: string
    status: string
    closing_date: string | null
    created_at: string
  }
}

/**
 * ClosedRoundCard — individual closed round card with delete button.
 * Shows round title, closing date, and delete action.
 *
 * Ticket: AIEX-XXX (History Delete)
 */
export function ClosedRoundCard({ round }: ClosedRoundCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const closedDate = round.closing_date
    ? new Date(round.closing_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unknown'

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteRound(round.id)

    if (result.error) {
      toast.error(result.error.message)
      setIsDeleting(false)
      setShowConfirm(false)
      return
    }

    toast.success('Round deleted')
    setShowConfirm(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-zinc-100 hover:shadow-md transition-shadow group">
        <div className="flex items-center justify-between gap-4">
          {/* Clickable link area */}
          <Link href={`/history/${round.id}`} className="flex-1 min-w-0">
            <div>
              <h3 className="font-semibold text-zinc-950 text-lg mb-1 truncate group-hover:text-lime-600 transition-colors">
                {round.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Closed {closedDate}</span>
              </div>
            </div>
          </Link>

          {/* Delete button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting}
            className="flex-shrink-0 p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete round"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h3 className="font-bold text-lg text-zinc-950 mb-2">
              Delete &quot;{round.title}&quot;?
            </h3>
            <p className="text-zinc-600 text-sm mb-6">
              This will permanently remove this round and all associated data. This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
