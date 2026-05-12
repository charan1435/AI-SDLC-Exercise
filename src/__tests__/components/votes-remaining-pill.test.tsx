/**
 * Component tests — VotesRemainingPill
 * Tickets: AIEX-836
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VotesRemainingPill } from '@/components/features/votes/VotesRemainingPill'

describe('VotesRemainingPill', () => {
  it('renders the remaining and total counts', () => {
    render(<VotesRemainingPill remaining={2} total={3} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders "votes left" label when remaining > 1', () => {
    render(<VotesRemainingPill remaining={2} total={3} />)
    expect(screen.getByText(/votes left/i)).toBeInTheDocument()
  })

  it('renders "vote left" (singular) when remaining = 1', () => {
    render(<VotesRemainingPill remaining={1} total={3} />)
    expect(screen.getByText(/vote left/i)).toBeInTheDocument()
    // Should not have "votes left" (plural)
    expect(screen.queryByText(/votes left/i)).not.toBeInTheDocument()
  })

  it('renders "votes left" label when remaining = 0', () => {
    render(<VotesRemainingPill remaining={0} total={3} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('applies the deeper-lime class when remaining = 0 (all votes used)', () => {
    const { container } = render(<VotesRemainingPill remaining={0} total={3} />)
    expect(container.firstChild).toHaveClass('bg-lime-300')
  })

  it('applies the normal lime-50 class when remaining > 0', () => {
    const { container } = render(<VotesRemainingPill remaining={2} total={3} />)
    expect(container.firstChild).toHaveClass('bg-lime-50')
  })

  it('does NOT apply the empty-state class when votes remain', () => {
    const { container } = render(<VotesRemainingPill remaining={1} total={3} />)
    expect(container.firstChild).not.toHaveClass('bg-lime-300')
  })
})
