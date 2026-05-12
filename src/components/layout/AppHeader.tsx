import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ProfileMenu } from './ProfileMenu'
import type { User } from '@/lib/types'

async function getAppUser(): Promise<User | null> {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (data as User) ?? null
}

export async function AppHeader() {
  const appUser = await getAppUser()

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md ring-1 ring-zinc-200">
      <div className="max-w-3xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Brand mark */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75 animate-pulse-dot" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500" />
          </span>
          <span className="font-sans font-black text-base text-zinc-950 tracking-tight">
            Reading List Vote
          </span>
        </Link>

        {/* Profile menu — server renders session, client handles dropdown */}
        {appUser && (
          <ProfileMenu
            displayName={appUser.display_name || appUser.email.split('@')[0]}
            isOrganizer={appUser.is_organizer}
          />
        )}
      </div>
    </header>
  )
}
