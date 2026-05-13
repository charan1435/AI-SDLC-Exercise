'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/session'

export interface ActionResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * deleteRound — server action to delete a closed round.
 * Cascades to delete all proposals and votes due to FK constraints.
 * Only organizers can delete rounds.
 *
 * Ticket: AIEX-XXX (History Delete)
 */
export async function deleteRound(roundId: string): Promise<ActionResult<null>> {
  const user = await getUser()
  if (!user) {
    return {
      data: null,
      error: { message: 'You must be signed in.' },
    }
  }

  const supabase = createServerClient()

  // Check if user is organizer
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_organizer')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.is_organizer) {
    return {
      data: null,
      error: { message: 'Only organizers can delete rounds.' },
    }
  }

  // Delete the round (cascades to proposals and votes)
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId)

  if (error) {
    console.error('Error deleting round:', error)
    return {
      data: null,
      error: { message: 'Failed to delete round.' },
    }
  }

  // Revalidate history page
  revalidatePath('/history')

  return { data: null, error: null }
}
