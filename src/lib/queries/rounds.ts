import { createServerClient } from '@/lib/supabase/server'
import type { Round } from '@/lib/types'

/**
 * getCurrentOpenRound — returns the single open round or null.
 * Uses the partial unique index so there is always at most one result.
 *
 * Ticket: AIEX-832
 */
export async function getCurrentOpenRound(): Promise<Round | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    console.error('[getCurrentOpenRound] error:', error.message)
    return null
  }

  return data as Round | null
}

/**
 * getRoundById — returns a round by id or null if not found.
 *
 * Ticket: AIEX-832
 */
export async function getRoundById(id: string): Promise<Round | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getRoundById] error:', error.message)
    return null
  }

  return data as Round | null
}
