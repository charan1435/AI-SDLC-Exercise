'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addProposal } from '@/lib/actions/proposals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ERROR_MESSAGES } from '@/lib/types'

interface ProposeBookFormProps {
  roundId: string
}

const MAX_REASON_LENGTH = 500

/**
 * ProposeBookForm — title + author + reason with live char counter.
 * Uses addProposal server action.
 *
 * Ticket: AIEX-825
 */
export function ProposeBookForm({ roundId }: ProposeBookFormProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!author.trim()) newErrors.author = 'Author is required'
    if (reason.length > MAX_REASON_LENGTH)
      newErrors.reason = `Reason must be ${MAX_REASON_LENGTH} characters or fewer`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    const result = await addProposal({
      round_id: roundId,
      title: title.trim(),
      author: author.trim(),
      reason: reason.trim() || undefined,
    })
    setLoading(false)

    if (result.error) {
      if (result.error.message === ERROR_MESSAGES.ROUND_CLOSED) {
        toast.error(ERROR_MESSAGES.ROUND_CLOSED)
      } else {
        toast.error(result.error.message)
      }
      return
    }

    // Reset form on success
    setTitle('')
    setAuthor('')
    setReason('')
    toast.success('Book proposed!')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="h-0.5 flex-1 bg-zinc-100" />
        <h2 className="font-sans font-bold text-lg text-zinc-950 px-2">
          Propose a book
        </h2>
        <div className="h-0.5 flex-1 bg-zinc-100" />
      </div>

      <div className="bg-white rounded-card p-6 md:p-8 shadow-card animate-fade-up stagger-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-title">Title</Label>
            <Input
              id="book-title"
              type="text"
              placeholder="Book title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-sm text-red-600 font-medium">{errors.title}</p>
            )}
          </div>

          {/* Author */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-author">Author</Label>
            <Input
              id="book-author"
              type="text"
              placeholder="Author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={100}
            />
            {errors.author && (
              <p className="text-sm text-red-600 font-medium">{errors.author}</p>
            )}
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-reason">
              Why this one?{' '}
              <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Textarea
              id="book-reason"
              placeholder="A short reason — keep it under 500 chars."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={MAX_REASON_LENGTH + 10}
            />
            <div className="flex justify-between items-center">
              {errors.reason ? (
                <p className="text-sm text-red-600 font-medium">{errors.reason}</p>
              ) : (
                <span />
              )}
              <span
                className={`font-mono text-xs ${
                  reason.length > MAX_REASON_LENGTH
                    ? 'text-red-500'
                    : reason.length > MAX_REASON_LENGTH * 0.9
                    ? 'text-amber-500'
                    : 'text-zinc-400'
                }`}
              >
                {reason.length} / {MAX_REASON_LENGTH}
              </span>
            </div>
          </div>

          <Button type="submit" variant="secondary" disabled={loading} className="w-full">
            {loading ? 'Adding…' : '+ Add to round'}
          </Button>
        </form>
      </div>
    </div>
  )
}
