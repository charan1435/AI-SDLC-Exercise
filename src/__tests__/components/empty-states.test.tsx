/**
 * Component tests — empty state components
 * Tickets: AIEX-836
 *
 * Covers:
 *  - NoActiveRoundEmpty (member variant + organizer variant)
 *  - EmptyProposalsState
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NoActiveRoundEmpty } from '@/components/features/rounds/NoActiveRoundEmpty'
import { EmptyProposalsState } from '@/components/features/proposals/EmptyProposalsState'

// ── Mock next/link for unit-test environment ─────────────────────────────────

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

// ── NoActiveRoundEmpty ────────────────────────────────────────────────────────

describe('NoActiveRoundEmpty', () => {
  describe('member variant (isOrganizer=false)', () => {
    it('renders the "No round is open yet" heading', () => {
      render(<NoActiveRoundEmpty isOrganizer={false} />)
      expect(screen.getByText(/no round is open yet/i)).toBeInTheDocument()
    })

    it('renders the organizer hint copy', () => {
      render(<NoActiveRoundEmpty isOrganizer={false} />)
      expect(
        screen.getByText(/ask your organizer to open the next round/i)
      ).toBeInTheDocument()
    })

    it('does NOT render the "Open a round" CTA for members', () => {
      render(<NoActiveRoundEmpty isOrganizer={false} />)
      expect(screen.queryByRole('link', { name: /open a round/i })).not.toBeInTheDocument()
    })
  })

  describe('organizer variant (isOrganizer=true)', () => {
    it('renders the "No round is open" heading', () => {
      render(<NoActiveRoundEmpty isOrganizer={true} />)
      expect(screen.getByText(/no round is open/i)).toBeInTheDocument()
    })

    it('renders "Start a new one" copy', () => {
      render(<NoActiveRoundEmpty isOrganizer={true} />)
      expect(screen.getByText(/start a new one/i)).toBeInTheDocument()
    })

    it('renders the "Open a round" CTA link pointing to /rounds/new', () => {
      render(<NoActiveRoundEmpty isOrganizer={true} />)
      const link = screen.getByRole('link', { name: /open a round/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/rounds/new')
    })
  })
})

// ── EmptyProposalsState ───────────────────────────────────────────────────────

describe('EmptyProposalsState', () => {
  it('renders "No proposals yet" heading', () => {
    render(<EmptyProposalsState />)
    expect(screen.getByText(/no proposals yet/i)).toBeInTheDocument()
  })

  it('renders the "Be the first to suggest a book" copy', () => {
    render(<EmptyProposalsState />)
    expect(screen.getByText(/be the first to suggest a book/i)).toBeInTheDocument()
  })
})
