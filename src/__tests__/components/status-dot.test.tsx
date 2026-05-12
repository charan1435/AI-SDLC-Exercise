/**
 * Component tests — StatusDot
 * Tickets: AIEX-836
 *
 * Covers: open variant (lime-500 dot + pulse span), closed variant (zinc-400 dot, no pulse)
 */

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusDot } from '@/components/features/common/StatusDot'

describe('StatusDot', () => {
  it('renders the lime-500 dot for open status', () => {
    const { container } = render(<StatusDot status="open" />)
    const innerDot = container.querySelector('.bg-lime-500')
    expect(innerDot).not.toBeNull()
  })

  it('renders the zinc-400 dot for closed status', () => {
    const { container } = render(<StatusDot status="closed" />)
    const innerDot = container.querySelector('.bg-zinc-400')
    expect(innerDot).not.toBeNull()
  })

  it('renders the pulse animation span only for open status', () => {
    const { container } = render(<StatusDot status="open" />)
    // The pulse span has animate-pulse-dot class
    const pulseSpan = container.querySelector('.animate-pulse-dot')
    expect(pulseSpan).not.toBeNull()
  })

  it('does NOT render the pulse animation span for closed status', () => {
    const { container } = render(<StatusDot status="closed" />)
    const pulseSpan = container.querySelector('.animate-pulse-dot')
    expect(pulseSpan).toBeNull()
  })

  it('forwards an extra className to the wrapper span', () => {
    const { container } = render(<StatusDot status="open" className="my-extra-class" />)
    expect(container.firstChild).toHaveClass('my-extra-class')
  })
})
