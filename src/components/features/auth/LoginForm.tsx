'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * LoginForm — email + password form with toggle between login and signup.
 * Replaces MagicLinkForm for password-based authentication.
 *
 * Ticket: AIEX-813 (revised)
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true) // Toggle between login and signup
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      if (isLogin) {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error
        toast.success('Signed in!')
        router.push('/')
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error
        toast.success('Account created! Signed in.')
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-card p-8 shadow-card w-full max-w-sm mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-sans font-bold text-xl text-zinc-950 mb-1">
          {isLogin ? 'Sign in to vote' : 'Create an account'}
        </h2>
        <div className="h-0.5 w-8 bg-lime-400 rounded-full" />
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-900 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
        </Button>
      </form>

      <button
        onClick={() => {
          setIsLogin(!isLogin)
          setError(null)
        }}
        className="text-sm font-semibold text-lime-600 underline underline-offset-2 hover:text-lime-700 transition-colors mt-4 w-full text-center"
      >
        {isLogin
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
