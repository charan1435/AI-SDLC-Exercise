'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * MagicLinkForm — email input + "Send magic link" CTA.
 * On success: swaps to "Check your inbox" confirmation state.
 * On error: surfaces the Supabase error message inline.
 *
 * Ticket: AIEX-813
 */
export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setInlineError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setInlineError(error.message)
      toast.error(error.message)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-card p-8 shadow-card w-full max-w-sm mx-auto animate-fade-up">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-50">
            <CheckCircle2 className="h-6 w-6 text-lime-600" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-xl text-zinc-950 mb-1">
              Check your inbox
            </h2>
            <p className="font-sans text-sm text-zinc-600 leading-relaxed">
              We sent a sign-in link to{' '}
              <span className="font-semibold text-zinc-950">{email}</span>.
              <br />
              Open the email and tap &quot;Sign in&quot;.
            </p>
          </div>
          <button
            onClick={() => {
              setSubmitted(false)
              setEmail('')
            }}
            className="text-sm font-semibold text-lime-600 underline underline-offset-2 hover:text-lime-700 transition-colors"
          >
            Wrong email? Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card p-8 shadow-card w-full max-w-sm mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-sans font-bold text-xl text-zinc-950 mb-1">
          Sign in to vote
        </h2>
        <div className="h-0.5 w-8 bg-lime-400 rounded-full" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          {inlineError && (
            <p className="text-sm text-red-600 font-medium">{inlineError}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={loading || !email.trim()}
          className="w-full mt-1"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </Button>

        <p className="text-xs text-zinc-500 text-center leading-relaxed">
          No password. We&apos;ll email you a one-tap sign-in link.
        </p>
      </form>
    </div>
  )
}
