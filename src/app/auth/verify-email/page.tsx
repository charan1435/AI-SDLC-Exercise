'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * Email verification callback endpoint.
 * Handles the OTP code from the email link and marks email as verified.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const code = searchParams.get('code')
        
        if (!code) {
          setError('No verification code found in URL')
          return
        }

        const supabase = createClient()

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Exchange code error:', exchangeError)
          setError(exchangeError.message || 'Invalid or expired verification link')
          return
        }

        if (!data?.user) {
          setError('No user data returned from verification')
          return
        }

        // Mark email as verified in the database
        const { error: updateError } = await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('id', data.user.id)

        if (updateError) {
          console.error('Update verification error:', updateError)
          setError(updateError.message || 'Failed to mark email as verified')
          return
        }

        toast.success('Email verified successfully! You can now sign in.')
        setLoading(false)
        
        // Redirect to home after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } catch (err: any) {
        console.error('Verification exception:', err)
        setError(err.message || 'An error occurred during verification')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg p-8 shadow-lg max-w-sm w-full mx-4">
        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mb-4" />
            <h2 className="text-xl font-bold text-zinc-950 mb-2">Verifying your email...</h2>
            <p className="text-zinc-600 text-sm">Please wait while we confirm your email address.</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-950 mb-2">Verification Failed</h2>
            <p className="text-red-600 text-sm mb-6">{error}</p>
            <a
              href="/signin"
              className="inline-block px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors"
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-green-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-950 mb-2">Email Verified!</h2>
            <p className="text-zinc-600 text-sm mb-6">Your email has been successfully verified. Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  )
}
