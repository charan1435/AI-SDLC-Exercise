/**
 * Component tests — WinnerCard
 * Tickets: AIEX-836
 *
 * Tests all 6 required fields: slot number, "The winner is" label,
 * title, author, vote count, proposer_display_name.
 * Also tests the optional totalMembers display.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WinnerCard } from '@/components/features/rounds/WinnerCard'
import type { ProposalWithTally } from '@/lib/types'

function makeWinner(overrides: Partial<ProposalWithTally> = {}): ProposalWithTally {
  return {
    id: '550e8400-e29b-41d4-a716-446655440002',
    round_id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    reason: null,
    proposer_id: 'user-2',
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    updated_at: new Date(Date.now() - 172_800_000).toISOString(),
    vote_count: 3,
    my_vote_id: null,
    proposer_display_name: 'bob',
    ...overrides,
  }
}

describe('WinnerCard', () => {
  it('renders the "The winner is" label', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText(/the winner is/i)).toBeInTheDocument()
  })

  it('renders the zero-padded slot number (01 for slot 1)', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('renders the winning book title', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(
      screen.getByText('Tomorrow, and Tomorrow, and Tomorrow')
    ).toBeInTheDocument()
  })

  it('renders the winning book author', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText('Gabrielle Zevin')).toBeInTheDocument()
  })

  it('renders the vote count', () => {
    render(
      <WinnerCard winner={makeWinner({ vote_count: 3 })} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders "votes" (plural) when vote_count > 1', () => {
    render(
      <WinnerCard winner={makeWinner({ vote_count: 3 })} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText('votes')).toBeInTheDocument()
  })

  it('renders "vote" (singular) when vote_count = 1', () => {
    render(
      <WinnerCard winner={makeWinner({ vote_count: 1 })} slotNumber={1} totalVotesCast={1} />
    )
    expect(screen.getByText('vote')).toBeInTheDocument()
  })

  it('renders the proposer display name', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.getByText(/proposed by bob/i)).toBeInTheDocument()
  })

  it('renders "X of Y members voted" when totalMembers is provided', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={4} totalMembers={5} />
    )
    expect(screen.getByText(/4 of 5 members voted/i)).toBeInTheDocument()
  })

  it('does NOT render members-voted line when totalMembers is not provided', () => {
    render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(screen.queryByText(/members voted/i)).not.toBeInTheDocument()
  })

  it('renders bg-lime-400 class for the hero card', () => {
    const { container } = render(
      <WinnerCard winner={makeWinner()} slotNumber={1} totalVotesCast={3} />
    )
    expect(container.firstChild).toHaveClass('bg-lime-400')
  })
})
