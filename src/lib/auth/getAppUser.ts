import { createServerClient } from '@/lib/supabase/server'
import type { User } from '@/lib/types'

/**
 * getAppUser — returns the full public.users row for the current session user.
 * Returns null if unauthenticated or if the profile row doesn't exist yet.
 *
 * Distinct from getUser() in session.ts which returns the auth.users row only.
 * This version joins the public.users profile which has is_organizer, display_name, etc.
 */
export async function getAppUser(): Promise<User | null> {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !data) return null

  return data as User
}
