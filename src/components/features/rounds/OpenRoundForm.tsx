'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { openRound } from '@/lib/actions/rounds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERROR_MESSAGES } from '@/lib/types'

/**
 * OpenRoundForm — title input + closing date picker + submit.
 * On ROUND_ALREADY_OPEN error: shows inline error toast.
 * On success: redirects to the new round detail page.
 *
 * Ticket: AIEX-817
 */
export function OpenRoundForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTitleError(null)
    setDateError(null)

    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    if (!closingDate) {
      setDateError('Closing date is required')
      return
    }

    setLoading(true)
    const result = await openRound({ title: title.trim(), closing_date: closingDate })
    setLoading(false)

    if (result.error) {
      if (result.error.message === ERROR_MESSAGES.ROUND_ALREADY_OPEN) {
        toast.error(ERROR_MESSAGES.ROUND_ALREADY_OPEN)
      } else {
        toast.error(result.error.message)
      }
      return
    }

    if (result.data) {
      toast.success('Round opened. Members can now propose.')
      router.push(`/rounds/${result.data.id}`)
    }
  }

  return (
    <div className="bg-white rounded-card p-8 shadow-card animate-fade-up">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Title field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g. June 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
          />
          {titleError ? (
            <p className="text-sm text-red-600 font-medium">{titleError}</p>
          ) : (
            <p className="text-xs text-zinc-400">What to call this round.</p>
          )}
        </div>

        {/* Closing date field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="closing-date">Closing date</Label>
          <Input
            id="closing-date"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          {dateError ? (
            <p className="text-sm text-red-600 font-medium">{dateError}</p>
          ) : (
            <p className="text-xs text-zinc-400 leading-relaxed">
              When members should have proposed and voted by.
              (You close the round manually.)
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? 'Opening…' : 'Open round →'}
        </Button>
      </form>
    </div>
  )
}
