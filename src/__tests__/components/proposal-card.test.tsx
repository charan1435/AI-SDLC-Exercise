/**
 * Component tests — ProposalCard
 * Tickets: AIEX-836
 *
 * Tests: renders title, author, tally, slot number, reason, footer meta,
 * VoteToggle present/absent based on isRoundOpen, winner variant styling.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProposalCard } from '@/components/features/proposals/ProposalCard'
import type { ProposalWithTally } from '@/lib/types'

// ── Mock server actions used by the nested VoteToggle ───────────────────────

vi.mock('@/lib/actions/votes', () => ({
  castVote: vi.fn(),
  withdrawVote: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// ── Fixture ──────────────────────────────────────────────────────────────────

function makeProposal(overrides: Partial<ProposalWithTally> = {}): ProposalWithTally {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    round_id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    reason: 'An artificial friend observes a fragile family.',
    proposer_id: 'user-1',
    created_at: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86_400_000).toISOString(),
    vote_count: 2,
    my_vote_id: null,
    proposer_display_name: 'alice',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProposalCard', () => {
  describe('content rendering', () => {
    it('renders the book title', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('Klara and the Sun')).toBeInTheDocument()
    })

    it('renders the author name', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('Kazuo Ishiguro')).toBeInTheDocument()
    })

    it('renders the zero-padded slot number (01 for index 1)', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('01')).toBeInTheDocument()
    })

    it('renders slot "03" for slotIndex=3', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={3}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('03')).toBeInTheDocument()
    })

    it('renders the tally count zero-padded', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ vote_count: 2 })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('02')).toBeInTheDocument()
    })

    it('renders a zero tally as "00"', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ vote_count: 0 })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('00')).toBeInTheDocument()
    })

    it('renders the proposer display name in the footer', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ proposer_display_name: 'bob' })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText('bob')).toBeInTheDocument()
    })

    it('renders the reason text when present', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ reason: 'A beautiful book.' })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByText(/A beautiful book\./i)).toBeInTheDocument()
    })

    it('does not render reason section when reason is null', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ reason: null })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      // There should be no blockquote / reason paragraph rendered
      expect(screen.queryByText(/beautiful/i)).not.toBeInTheDocument()
    })
  })

  describe('VoteToggle visibility', () => {
    it('renders a VoteToggle when round is open', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={true}
          remaining={3}
        />
      )
      expect(screen.getByRole('button', { name: /vote for this/i })).toBeInTheDocument()
    })

    it('does NOT render a VoteToggle when round is closed', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={false}
          remaining={0}
        />
      )
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders VoteToggle in voted state when my_vote_id is set', () => {
      render(
        <ProposalCard
          proposal={makeProposal({ my_vote_id: 'vote-row-id' })}
          slotIndex={1}
          isRoundOpen={true}
          remaining={2}
        />
      )
      expect(screen.getByText('Voted')).toBeInTheDocument()
    })
  })

  describe('winner variant', () => {
    it('renders WINNER badge when isWinner=true', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={false}
          isWinner={true}
          remaining={0}
        />
      )
      expect(screen.getByText('WINNER')).toBeInTheDocument()
    })

    it('does not render WINNER badge by default', () => {
      render(
        <ProposalCard
          proposal={makeProposal()}
          slotIndex={1}
          isRoundOpen={false}
          remaining={0}
        />
      )
      expect(screen.queryByText('WINNER')).not.toBeInTheDocument()
    })
  })
})
