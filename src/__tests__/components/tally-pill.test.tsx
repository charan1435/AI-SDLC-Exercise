/**
 * Component tests — TallyPill
 * Tickets: AIEX-834, AIEX-836
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TallyPill } from '@/components/features/common/TallyPill'

describe('TallyPill', () => {
  it('renders a count of 0 as "00"', () => {
    render(<TallyPill count={0} />)
    expect(screen.getByText('00')).toBeInTheDocument()
  })

  it('renders a count of 3 as "03"', () => {
    render(<TallyPill count={3} />)
    expect(screen.getByText('03')).toBeInTheDocument()
  })

  it('renders a count of 10 without extra zero-padding', () => {
    render(<TallyPill count={10} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('uses mono font class for alignment', () => {
    const { container } = render(<TallyPill count={2} />)
    const span = container.querySelector('span')
    expect(span).toHaveClass('font-mono')
  })

  it('forwards an extra className to the wrapper', () => {
    const { container } = render(<TallyPill count={1} className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
