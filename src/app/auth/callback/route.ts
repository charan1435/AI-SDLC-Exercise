import { createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * GET /auth/callback
 *
 * Supabase magic-link callback. Exchanges the `code` query parameter for a
 * session, sets the session cookie via the server client, then redirects to
 * the home page (or to /signin?error=invalid_link on failure).
 *
 * Ticket: AIEX-812
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed or no code provided — send back to sign-in with error flag
  return NextResponse.redirect(`${origin}/signin?error=invalid_link`)
}
