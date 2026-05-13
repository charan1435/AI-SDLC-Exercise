import { redirect } from 'next/navigation'
import { verifyEmail } from '@/lib/actions/auth'

/**
 * Email verification callback endpoint.
 * Triggered when user clicks verification link in email.
 * Marks email as verified and redirects to home page.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export default async function VerifyEmailPage() {
  // Mark email as verified
  const result = await verifyEmail()

  if (result.error) {
    // Redirect to signin with error
    redirect(`/signin?error=${encodeURIComponent(result.error.message)}`)
  }

  // Success - redirect to home
  redirect('/?verified=true')
}
