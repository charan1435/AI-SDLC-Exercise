/**
 * Component tests — RoundHeader
 * Tickets: AIEX-836
 *
 * Covers:
 *  - Renders round title
 *  - Renders "Open" label with closing date for open rounds
 *  - Renders "Closed" label with closing date for closed rounds
 *  - StatusDot is rendered (lime for open, zinc for closed)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RoundHeader } from '@/components/features/rounds/RoundHeader'
import type { Round } from '@/lib/types'

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'June 2026',
    closing_date: '2026-06-30',
    status: 'open',
    winner_proposal_id: null,
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('RoundHeader', () => {
  it('renders the round title', () => {
    render(<RoundHeader round={makeRound({ title: 'May 2026 Round' })} />)
    expect(screen.getByText('May 2026 Round')).toBeInTheDocument()
  })

  it('renders "Open" status label for open rounds', () => {
    render(<RoundHeader round={makeRound({ status: 'open' })} />)
    expect(screen.getByText(/open/i)).toBeInTheDocument()
  })

  it('renders "Closed" status label for closed rounds', () => {
    render(<RoundHeader round={makeRound({ status: 'closed' })} />)
    // Two elements with "closed" text exist (the status label + the date phrase).
    // Verify via getAllByText that at least one has the uppercase label styling.
    const matches = screen.getAllByText(/closed/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    // The status label has uppercase text-transform — find it by its known content
    const statusLabel = matches.find((el) => el.textContent?.trim() === 'Closed')
    expect(statusLabel).toBeDefined()
  })

  it('renders "closes" text for an open round', () => {
    render(<RoundHeader round={makeRound({ status: 'open', closing_date: '2026-06-30' })} />)
    expect(screen.getByText(/closes/i)).toBeInTheDocument()
  })

  it('renders "closed" date text for a closed round', () => {
    render(<RoundHeader round={makeRound({ status: 'closed', closing_date: '2026-06-30' })} />)
    // The header says "closed June 30, 2026" for closed rounds
    expect(screen.getByText(/june 30, 2026/i)).toBeInTheDocument()
  })

  it('renders the lime-500 StatusDot for open rounds', () => {
    const { container } = render(<RoundHeader round={makeRound({ status: 'open' })} />)
    expect(container.querySelector('.bg-lime-500')).not.toBeNull()
  })

  it('renders the zinc-400 StatusDot for closed rounds', () => {
    const { container } = render(<RoundHeader round={makeRound({ status: 'closed' })} />)
    expect(container.querySelector('.bg-zinc-400')).not.toBeNull()
  })
})
