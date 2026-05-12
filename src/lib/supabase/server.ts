import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * createServerClient — use in Server Components, Route Handlers, and Server Actions.
 * Reads/writes session cookies via next/headers.
 * Uses the anon key — RLS is enforced for the authenticated user.
 *
 * NOTE: We intentionally omit the Database generic here. The SDK's generated
 * type (from `supabase gen types`) would be used in a production setup.
 * For this project, domain types are in src/lib/types.ts and query results
 * are cast explicitly to those types in the query layer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServerClient(): ReturnType<typeof createSupabaseServerClient<any>> {
  const cookieStore = cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // The session will be refreshed on the next request via middleware.
          }
        },
      },
    }
  )
}
