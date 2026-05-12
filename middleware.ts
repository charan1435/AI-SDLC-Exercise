import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/signin', '/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pub) => pathname === pub || pathname.startsWith(pub + '/'))
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  // Refresh the session — this keeps the cookie alive on every request.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Allow Next.js internals and static assets through unconditionally
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response
  }

  // Allow public paths through
  if (isPublicPath(pathname)) {
    // If already signed in and hitting /signin, redirect to home
    if (session && pathname === '/signin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // All other routes require a session
  if (!session) {
    const signInUrl = new URL('/signin', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle their own auth checks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
