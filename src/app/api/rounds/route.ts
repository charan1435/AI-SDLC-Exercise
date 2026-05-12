import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'
import { ERROR_MESSAGES, type Round } from '@/lib/types'

/**
 * POST /api/rounds
 *
 * Opens a new voting round. Organizer-only (enforced by RLS).
 * Enforces the single-open-round invariant via the partial unique index
 * on rounds(status) WHERE status='open'. Returns a structured error on
 * duplicate-open so the form can show "A round is already open — close it first."
 *
 * Ticket: AIEX-816
 *
 * Input:  { title: string (1–100 chars), closing_date: string (YYYY-MM-DD) }
 * Output: { data: Round, error: null } | { data: null, error: { message } }
 */

const CreateRoundSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or fewer'),
  closing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'closing_date must be a valid date in YYYY-MM-DD format'),
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

  const parsed = CreateRoundSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { message: parsed.error.errors[0]?.message ?? ERROR_MESSAGES.VALIDATION_ERROR } },
      { status: 400 }
    )
  }

  // 3. Insert via server client (RLS enforces organizer-only)
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('rounds')
    .insert({
      title: parsed.data.title,
      closing_date: parsed.data.closing_date,
      created_by: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    // Partial unique index violation — a round is already open
    if (error.code === '23505') {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.ROUND_ALREADY_OPEN, code: 'ROUND_ALREADY_OPEN' } },
        { status: 409 }
      )
    }
    // RLS rejection (not an organizer)
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return Response.json(
        { data: null, error: { message: ERROR_MESSAGES.UNAUTHORIZED } },
        { status: 403 }
      )
    }
    return Response.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data as Round, error: null }, { status: 201 })
}
