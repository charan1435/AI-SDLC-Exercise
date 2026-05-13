'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'

export interface ActionResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * signOut — server action used by ProfileMenu's sign-out button.
 * Signs out of Supabase Auth and redirects to /signin.
 *
 * Ticket: AIEX-813
 */
export async function signOut() {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/signin')
}

/**
 * signUpWithVerification — server action to sign up user and send verification email.
 * User cannot log in until they verify their email by clicking the link in the email.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export async function signUpWithVerification(
  email: string,
  password: string
): Promise<ActionResult<{ message: string }>> {
  const supabase = createServerClient()

  try {
    // Sign up user
    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email`,
      },
    })

    if (signupError) throw signupError

    return {
      data: {
        message: 'Signup successful! Check your email to verify your address.',
      },
      error: null,
    }
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Signup failed' },
    }
  }
}

/**
 * verifyEmail — server action to mark user's email as verified.
 * Called after user clicks verification link in email.
 *
 * Ticket: AIEX-XXX (Email Verification)
 */
export async function verifyEmail(): Promise<ActionResult<null>> {
  const user = await getUser()
  if (!user) {
    return {
      data: null,
      error: { message: 'You must be signed in.' },
    }
  }

  const supabase = createServerClient()

  try {
    // Mark user's email as verified
    const { error } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id)

    if (error) throw error

    revalidatePath('/')
    return {
      data: null,
      error: null,
    }
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Verification failed' },
    }
  }
}
