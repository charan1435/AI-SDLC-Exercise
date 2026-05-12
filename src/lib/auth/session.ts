import { createServerClient } from '@/lib/supabase/server'

/**
 * getSession — returns the current Supabase session or null.
 * Use in Server Components / Route Handlers where you need both
 * the access token and the user object.
 */
export async function getSession() {
  const supabase = createServerClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) return null
  return session
}

/**
 * getUser — returns the authenticated user (validated server-side) or null.
 * Prefer this over getSession().user when you only need the user object,
 * because getUser() re-validates the JWT with the Supabase auth server.
 */
export async function getUser() {
  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) return null
  return user
}
