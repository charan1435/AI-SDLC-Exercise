import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Proposal } from '@/lib/types'

/**
 * POST /api/proposals
 *
 * Adds a book proposal to an open round. Any authenticated member can propose.
 * proposer_id is derived from the server session — NEVER trusted from the body.
 * RLS INSERT policy enforces the round must be open (closed-round lockdown R2).
 *
 * Ticket: AIEX-824
 *
 * Input:  { round_id: uuid, title: string (1–200), author: string (1–100), reason?: string (≤500) }
 * Output: { data: Proposal, error: null } | { data: null, error: { message } }
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CreateProposalSchema = z.object({
  round_id: z.string().regex(UUID_REGEX, 'round_id must be a valid UUID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  author: z.string().min(1, 'Author is required').max(100, 'Author must be 100 characters or fewer'),
  reason: z.string().max(500, 'Reason must be 500 characters or fewer').optional(),
})

export async function POST(request: Request) {
  // 1. Authenticate
  const user = await getUser()
  if (!user) {
    return Response.json(
      { data: null, error: { message: ERROR_MESSAGES.UNAUTHENTICATED } },
      { status: 401 }
    )
  }

  // 2. Validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  const parsed = CreateProposalSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR } },
      { status: 400 }
    )
  }

  // 3. Insert via server client.
  //    proposer_id is taken from the authenticated session — never from the body.
  //    RLS INSERT policy checks that rounds.status = 'open'.
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      round_id: parsed.data.round_id,
      title: parsed.data.title,
      author: parsed.data.author,
      reason: parsed.data.reason ?? null,
      proposer_id: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    // RLS rejected: round is closed or user is unauthenticated
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.ROUND_CLOSED, code: 'ROUND_CLOSED' } },
        { status: 403 }
      )
    }
    // Foreign-key violation: round_id doesn't exist
    if (error.code === '23503') {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.ROUND_NOT_FOUND } },
        { status: 404 }
      )
    }
    return Response.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data as Proposal, error: null }, { status: 201 })
}
