import { notFound, redirect } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageShell } from '@/components/layout/PageShell'
import { RoundHeader } from '@/components/features/rounds/RoundHeader'
import { WinnerCard } from '@/components/features/rounds/WinnerCard'
import { CloseRoundButton } from '@/components/features/rounds/CloseRoundButton'
import { ProposalsList } from '@/components/features/proposals/ProposalsList'
import { ProposeBookForm } from '@/components/features/proposals/ProposeBookForm'
import { VotesRemainingPill } from '@/components/features/votes/VotesRemainingPill'
import { getRoundWithProposalsAndTally } from '@/lib/queries/tally'
import { getAppUser } from '@/lib/auth/getAppUser'

interface RoundPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: RoundPageProps) {
  return {
    title: `Round — Reading List Vote`,
  }
}

/**
 * RoundDetailPage — server component.
 * Branches on round.status:
 *   - 'open'   → ProposalsList + ProposeBookForm + (organizer: CloseRoundButton)
 *   - 'closed' → WinnerCard + read-only ProposalsList
 *
 * Tickets: AIEX-821, AIEX-825, AIEX-829, AIEX-833, AIEX-835
 */
export default async function RoundDetailPage({ params }: RoundPageProps) {
  const appUser = await getAppUser()
  if (!appUser) redirect('/signin')

  const detail = await getRoundWithProposalsAndTally(params.id)
  if (!detail) notFound()

  const { round, proposals, winner, my_vote_count } = detail
  const MAX_VOTES = 3
  const remaining = MAX_VOTES - my_vote_count

  const isOpen = round.status === 'open'
  const isOrganizer = appUser.is_organizer

  return (
    <>
      <AppHeader />
      <PageShell>
        {/* Round header */}
        <RoundHeader round={round} />

        {/* Open round view */}
        {isOpen && (
          <>
            {/* Votes remaining pill */}
            <div className="animate-fade-up stagger-2">
              <VotesRemainingPill remaining={remaining} total={MAX_VOTES} />
            </div>

            {/* Proposals list */}
            <ProposalsList
              proposals={proposals}
              isRoundOpen={true}
              winnerId={null}
              myVoteCount={my_vote_count}
              maxVotes={MAX_VOTES}
            />

            {/* Propose form */}
            <ProposeBookForm roundId={round.id} />

            {/* Organizer close-round button (sticky bottom) */}
            {isOrganizer && (
              <CloseRoundButton roundId={round.id} proposals={proposals} />
            )}
          </>
        )}

        {/* Closed round view */}
        {!isOpen && (
          <>
            {/* Winner hero card */}
            {winner && (
              <WinnerCard
                winner={winner}
                slotNumber={proposals.findIndex((p) => p.id === winner.id) + 1}
                totalVotesCast={proposals.reduce((acc, p) => acc + (p.my_vote_id ? 1 : 0), 0)}
              />
            )}

            {/* Final tally heading */}
            <p className="font-sans font-semibold text-sm text-zinc-500 animate-fade-up stagger-2">
              Final tally
            </p>

            {/* Read-only proposals list */}
            <ProposalsList
              proposals={proposals}
              isRoundOpen={false}
              winnerId={round.winner_proposal_id}
              myVoteCount={my_vote_count}
              maxVotes={MAX_VOTES}
            />
          </>
        )}
      </PageShell>
    </>
  )
}
