import { createClient } from '@supabase/supabase-js'

/**
 * createAdminClient — uses the SERVICE_ROLE key which bypasses RLS.
 *
 * RULES:
 * - ONLY import this in server-side code (Route Handlers, Server Actions).
 * - NEVER expose the service role key in any code that runs in the browser.
 * - Use sparingly: currently only needed for operations that must bypass RLS,
 *   such as reading proposer display names in contexts where the caller cannot
 *   satisfy the policy, or the organizer-seeding helper.
 *
 * At runtime the SUPABASE_SERVICE_ROLE_KEY env var must be set server-side.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'This key is required for admin operations that bypass RLS. ' +
        'Set it in your .env.local file (server-side only — never expose to the browser).'
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
