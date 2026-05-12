# Optional Skill: Social Auth (Supabase OAuth)

## Activate when
Spec mentions: Google login, GitHub login, OAuth,
social login, SSO, sign in with Google/GitHub

## Stack Addition
  No extra packages — Supabase Auth handles OAuth

## Supabase Dashboard Setup Required
  Authentication → Providers → Enable:
    Google: add Client ID and Secret from Google Console
    GitHub: add Client ID and Secret from GitHub OAuth App

## OAuth Sign In Pattern
  ```typescript
  async function signInWithProvider(provider: 'google' | 'github') {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    })
    if (error) console.error(error)
  }
  ```

## Auth Callback Route (Required)
  ```typescript
  // /src/app/auth/callback/route.ts
  import { createServerClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (code) {
      const supabase = createServerClient()
      await supabase.auth.exchangeCodeForSession(code)
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  ```

## Supabase Dashboard: Auth Redirect URLs
  Add to allowed redirect URLs:
    http://localhost:3000/auth/callback
    https://your-vercel-url.vercel.app/auth/callback

## Rules
  ✅ Always add /auth/callback route
  ✅ Set redirect URLs in Supabase dashboard before testing
  ✅ Handle the case where OAuth provider is unavailable
  ❌ Never store OAuth tokens manually — Supabase handles this
