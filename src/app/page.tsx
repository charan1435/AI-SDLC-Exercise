import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageShell } from '@/components/layout/PageShell'
import { NoActiveRoundEmpty } from '@/components/features/rounds/NoActiveRoundEmpty'
import { getCurrentOpenRound } from '@/lib/queries/rounds'
import { getAppUser } from '@/lib/auth/getAppUser'

/**
 * HomePage — server component.
 * Branches:
 *   - No session → middleware redirects to /signin (doesn't reach here)
 *   - Session + open round → redirect to /rounds/[id]
 *   - Session + no open round → NoActiveRoundEmpty (member or organizer variant)
 *
 * Ticket: AIEX-813, AIEX-835
 */
export default async function HomePage() {
  const [appUser, openRound] = await Promise.all([
    getAppUser(),
    getCurrentOpenRound(),
  ])

  // Middleware should have caught unauthenticated users, but handle gracefully
  if (!appUser) {
    redirect('/signin')
  }

  // If there's an open round, redirect directly to it
  if (openRound) {
    redirect(`/rounds/${openRound.id}`)
  }

  return (
    <>
      <AppHeader />
      <PageShell>
        <NoActiveRoundEmpty isOrganizer={appUser.is_organizer} />
      </PageShell>
    </>
  )
}
