/**
 * Component tests — BigNumeral
 * Tickets: AIEX-836
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BigNumeral } from '@/components/features/common/BigNumeral'

describe('BigNumeral', () => {
  it('zero-pads a single-digit number to two digits', () => {
    render(<BigNumeral value={1} />)
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('zero-pads slot index 9 to "09"', () => {
    render(<BigNumeral value={9} />)
    expect(screen.getByText('09')).toBeInTheDocument()
  })

  it('renders a two-digit number without extra padding', () => {
    render(<BigNumeral value={12} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders a string value as-is without padding', () => {
    render(<BigNumeral value="07" />)
    expect(screen.getByText('07')).toBeInTheDocument()
  })

  it('applies the lg size class by default', () => {
    const { container } = render(<BigNumeral value={1} />)
    expect(container.firstChild).toHaveClass('text-6xl')
  })

  it('applies the xl size class when size=xl', () => {
    const { container } = render(<BigNumeral value={1} size="xl" />)
    expect(container.firstChild).toHaveClass('text-8xl')
  })

  it('applies the sm size class when size=sm', () => {
    const { container } = render(<BigNumeral value={1} size="sm" />)
    expect(container.firstChild).toHaveClass('text-4xl')
  })

  it('forwards an extra className', () => {
    const { container } = render(<BigNumeral value={1} className="text-zinc-200" />)
    expect(container.firstChild).toHaveClass('text-zinc-200')
  })

  it('renders the number 0 as "00"', () => {
    render(<BigNumeral value={0} />)
    expect(screen.getByText('00')).toBeInTheDocument()
  })
})
