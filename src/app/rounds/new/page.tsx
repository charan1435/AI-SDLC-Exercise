import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageShell } from '@/components/layout/PageShell'
import { OpenRoundForm } from '@/components/features/rounds/OpenRoundForm'
import { getAppUser } from '@/lib/auth/getAppUser'

export const metadata = {
  title: 'Open a Round — Reading List Vote',
}

/**
 * OpenRoundPage — organizer-only form to start a new voting round.
 * Redirects to / if the user is not an organizer.
 *
 * Ticket: AIEX-817
 */
export default async function OpenRoundPage() {
  const appUser = await getAppUser()

  if (!appUser) redirect('/signin')
  if (!appUser.is_organizer) redirect('/')

  return (
    <>
      <AppHeader />
      <PageShell>
        {/* Back link */}
        <div className="animate-fade-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-zinc-500 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Page heading */}
        <div className="animate-fade-up stagger-1">
          <h1 className="font-sans font-extrabold text-3xl text-zinc-950 mb-1">
            Open a round
          </h1>
          <div className="h-0.5 w-10 bg-lime-400 rounded-full" />
        </div>

        {/* Form */}
        <OpenRoundForm />
      </PageShell>
    </>
  )
}
