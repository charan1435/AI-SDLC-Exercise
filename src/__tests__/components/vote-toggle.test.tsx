/**
 * Component tests — VoteToggle
 * Tickets: AIEX-830, AIEX-836
 *
 * VoteToggle is a client component that uses useTransition and calls
 * castVote / withdrawVote server actions.  We mock both actions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoteToggle } from '@/components/features/votes/VoteToggle'

// ── Mock server actions ──────────────────────────────────────────────────────

vi.mock('@/lib/actions/votes', () => ({
  castVote: vi.fn(),
  withdrawVote: vi.fn(),
}))

// ── Mock sonner toast ────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { castVote, withdrawVote } from '@/lib/actions/votes'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/lib/types'

const mockCastVote = vi.mocked(castVote)
const mockWithdrawVote = vi.mocked(withdrawVote)
const mockToastError = vi.mocked(toast.error)

beforeEach(() => {
  vi.clearAllMocks()
})

const PROPOSAL_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('VoteToggle', () => {
  describe('unvoted state', () => {
    it('renders "Vote for this" when not voted', () => {
      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={3} />)
      expect(screen.getByRole('button', { name: /vote for this/i })).toBeInTheDocument()
    })

    it('is NOT disabled when votes remain', () => {
      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={1} />)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    it('is disabled when remaining = 0 and not voted', () => {
      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={0} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('voted state', () => {
    it('renders "Voted" when already voted', () => {
      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={true} remaining={0} />)
      expect(screen.getByText('Voted')).toBeInTheDocument()
    })

    it('is NOT disabled when voted (withdraw should always be possible)', () => {
      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={true} remaining={0} />)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('casting a vote (happy path)', () => {
    it('calls castVote with the proposalId on click', async () => {
      mockCastVote.mockResolvedValueOnce({ data: { id: 'v1', proposal_id: PROPOSAL_ID, voter_id: 'u1', round_id: 'r1', created_at: '' }, error: null })

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={3} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockCastVote).toHaveBeenCalledWith({ proposal_id: PROPOSAL_ID })
      })
    })
  })

  describe('withdrawing a vote (happy path)', () => {
    it('calls withdrawVote with the proposalId on click when voted', async () => {
      mockWithdrawVote.mockResolvedValueOnce({ data: null, error: null })

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={true} remaining={0} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockWithdrawVote).toHaveBeenCalledWith({ proposal_id: PROPOSAL_ID })
      })
    })
  })

  describe('error handling', () => {
    it('shows toast.error with VOTE_CEILING message on ceiling error', async () => {
      mockCastVote.mockResolvedValueOnce({
        data: null,
        error: { message: ERROR_MESSAGES.VOTE_CEILING, code: 'VOTE_CEILING' },
      })

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={1} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(ERROR_MESSAGES.VOTE_CEILING)
      })
    })

    it('shows toast.error with DUPLICATE_VOTE message on duplicate error', async () => {
      mockCastVote.mockResolvedValueOnce({
        data: null,
        error: { message: ERROR_MESSAGES.DUPLICATE_VOTE, code: 'DUPLICATE_VOTE' },
      })

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={2} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(ERROR_MESSAGES.DUPLICATE_VOTE)
      })
    })

    it('shows toast.error with ROUND_CLOSED message on closed-round error', async () => {
      mockCastVote.mockResolvedValueOnce({
        data: null,
        error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' },
      })

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={2} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(ERROR_MESSAGES.ROUND_CLOSED)
      })
    })

    it('shows generic toast.error when castVote throws an exception', async () => {
      mockCastVote.mockRejectedValueOnce(new Error('Network error'))

      render(<VoteToggle proposalId={PROPOSAL_ID} isVoted={false} remaining={2} />)
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Something went wrong. Please try again.')
      })
    })
  })
})
