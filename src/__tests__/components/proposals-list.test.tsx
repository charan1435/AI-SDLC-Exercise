/**
 * Component tests — ProposalsList
 * Tickets: AIEX-834, AIEX-836
 *
 * Covers:
 *  - Empty list → renders EmptyProposalsState copy
 *  - Non-empty list → renders correct count label, each proposal title
 *  - Winner flagging: isWinner prop sent to the winning card
 *  - Singular "book proposed" vs plural "books proposed" label
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProposalsList } from '@/components/features/proposals/ProposalsList'
import type { ProposalWithTally } from '@/lib/types'

// ── Mock VoteToggle dependencies (server actions + sonner) ──────────────────

vi.mock('@/lib/actions/votes', () => ({
  castVote: vi.fn(),
  withdrawVote: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeProposal(overrides: Partial<ProposalWithTally> & { id: string }): ProposalWithTally {
  return {
    round_id: 'round-1',
    title: 'Default Title',
    author: 'Default Author',
    reason: null,
    proposer_id: 'user-1',
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    updated_at: new Date(Date.now() - 3600_000).toISOString(),
    vote_count: 0,
    my_vote_id: null,
    proposer_display_name: 'alice',
    ...overrides,
  }
}

const PROPOSAL_A = makeProposal({ id: 'p-1', title: 'Klara and the Sun', vote_count: 3 })
const PROPOSAL_B = makeProposal({ id: 'p-2', title: 'Piranesi', vote_count: 1 })
const PROPOSAL_C = makeProposal({ id: 'p-3', title: 'Tomorrow, and Tomorrow', vote_count: 3 })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProposalsList', () => {
  describe('empty state', () => {
    it('renders EmptyProposalsState when proposals array is empty', () => {
      render(
        <ProposalsList
          proposals={[]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.getByText(/no proposals yet/i)).toBeInTheDocument()
    })

    it('does NOT render a count label when proposals is empty', () => {
      render(
        <ProposalsList
          proposals={[]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.queryByText(/books? proposed/i)).not.toBeInTheDocument()
    })
  })

  describe('with proposals', () => {
    it('renders "2 books proposed" label for 2 proposals', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.getByText(/2 books proposed/i)).toBeInTheDocument()
    })

    it('renders "1 book proposed" (singular) for 1 proposal', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.getByText(/1 book proposed/i)).toBeInTheDocument()
    })

    it('renders a card for each proposal', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.getByText('Klara and the Sun')).toBeInTheDocument()
      expect(screen.getByText('Piranesi')).toBeInTheDocument()
    })

    it('renders "3 books proposed" for 3 proposals', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B, PROPOSAL_C]}
          isRoundOpen={true}
          myVoteCount={0}
        />
      )
      expect(screen.getByText(/3 books proposed/i)).toBeInTheDocument()
    })
  })

  describe('winner flagging (closed round)', () => {
    it('renders WINNER badge for the winnerId proposal when round is closed', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B]}
          isRoundOpen={false}
          winnerId="p-1"
          myVoteCount={0}
        />
      )
      expect(screen.getByText('WINNER')).toBeInTheDocument()
    })

    it('does NOT render WINNER badge for non-winner proposals', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B]}
          isRoundOpen={false}
          winnerId="p-1"
          myVoteCount={0}
        />
      )
      // Only one WINNER badge should be in the document
      const badges = screen.getAllByText('WINNER')
      expect(badges).toHaveLength(1)
    })

    it('does NOT render any WINNER badge when winnerId is null', () => {
      render(
        <ProposalsList
          proposals={[PROPOSAL_A, PROPOSAL_B]}
          isRoundOpen={false}
          winnerId={null}
          myVoteCount={0}
        />
      )
      expect(screen.queryByText('WINNER')).not.toBeInTheDocument()
    })
  })

  describe('remaining votes calculation', () => {
    it('passes correct remaining votes (maxVotes - myVoteCount) to cards', () => {
      // With myVoteCount=2, maxVotes default=3, remaining=1
      // VoteToggle with remaining=1 should NOT be disabled
      render(
        <ProposalsList
          proposals={[PROPOSAL_A]}
          isRoundOpen={true}
          myVoteCount={2}
          maxVotes={3}
        />
      )
      const button = screen.getByRole('button', { name: /vote for this/i })
      expect(button).not.toBeDisabled()
    })

    it('disables vote button when myVoteCount equals maxVotes', () => {
      // remaining = 0 → VoteToggle disables the button
      render(
        <ProposalsList
          proposals={[PROPOSAL_A]}
          isRoundOpen={true}
          myVoteCount={3}
          maxVotes={3}
        />
      )
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })
})
