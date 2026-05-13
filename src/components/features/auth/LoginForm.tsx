'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { signUpWithVerification, resendVerificationEmail } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * LoginForm — email + password form with email verification.
 * Signup requires users to verify their email before signing in.
 * Login checks that email is verified.
 * Includes resend verification email functionality.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true) // Toggle between login and signup
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      if (isLogin) {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        if (signInError) throw signInError

        // Check if email is verified
        const { data: userData } = await supabase
          .from('users')
          .select('email_verified')
          .eq('email', email.trim())
          .single()

        if (!userData?.email_verified) {
          // Sign them back out if not verified
          await supabase.auth.signOut()
          setError('Please verify your email before signing in. Check your inbox for the verification link.')
          toast.error('Email not verified. Check your inbox.')
          return
        }

        toast.success('Signed in!')
        router.push('/')
      } else {
        // Sign up with verification
        const result = await signUpWithVerification(email.trim(), password.trim())

        if (result.error) {
          throw new Error(result.error.message)
        }

        toast.success('Account created! Check your email to verify your address.')
        setVerificationSent(true)
        setPassword('')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendEmail() {
    setResendLoading(true)
    setError(null)

    try {
      const result = await resendVerificationEmail()

      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success('Verification email sent!')
      // Start cooldown (60 seconds)
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend email'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-card p-8 shadow-card w-full max-w-sm mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-sans font-bold text-xl text-zinc-950 mb-1">
          {verificationSent
            ? 'Verify your email'
            : isLogin
              ? 'Sign in to vote'
              : 'Create an account'}
        </h2>
        <div className="h-0.5 w-8 bg-lime-400 rounded-full" />
      </div>

      {verificationSent ? (
        // Verification sent message
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            We've sent a verification link to <strong>{email}</strong>. Click the link in your email to verify your address.
          </p>
          <p className="text-xs text-zinc-500">
            After verifying, you'll be able to sign in with your email and password.
          </p>

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setVerificationSent(false)
                setIsLogin(true)
                setError(null)
              }}
            >
              Back to sign in
            </Button>

            <Button
              type="button"
              disabled={resendLoading || resendCooldown > 0}
              className="flex-1"
              onClick={handleResendEmail}
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend (${resendCooldown}s)`
                  : 'Resend email'}
            </Button>
          </div>
        </div>
      ) : (
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
          </Button>

          <div className="border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
              }}
              disabled={loading}
              className="text-sm text-zinc-600 hover:text-lime-600 transition-colors disabled:opacity-50"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
