import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'

/**
 * Email verification callback endpoint.
 * Triggered when user clicks verification link in email.
 * Marks email as verified and redirects to home page.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export default async function VerifyEmailPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/signin?error=You%20must%20be%20signed%20in')
  }

  const supabase = createServerClient()

  try {
    // Mark user's email as verified
    const { error } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id)

    if (error) {
      console.error('Email verification error:', error)
      redirect(`/signin?error=${encodeURIComponent(error.message)}`)
    }

    // Success - redirect to home
    redirect('/?verified=true')
  } catch (err: any) {
    console.error('Verification exception:', err)
    redirect(`/signin?error=${encodeURIComponent(err.message)}`)
  }
}
