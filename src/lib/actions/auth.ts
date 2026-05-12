'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

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
