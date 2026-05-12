import { createBrowserClient } from '@supabase/ssr'

/**
 * createBrowserClient — use in Client Components only.
 * Uses the public anon key — RLS enforced.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
