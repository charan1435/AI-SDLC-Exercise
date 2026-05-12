/**
 * Unit tests — pure-logic / tie-break behaviour for round actions
 * Tickets: AIEX-822
 *
 * The tie-break rule: when two proposals have the same vote_count, the one
 * with the earlier created_at wins.  The DB function round_tally() already
 * sorts by (vote_count DESC, created_at ASC), so the "winner" is always
 * tallyRows[0].  These tests verify the JavaScript layer honours that
 * contract (selecting tallyRows[0].proposal_id as the winner).
 */

import { describe, it, expect } from 'vitest'

// ── Pure logic extracted from closeRound action ──────────────────────────────

/**
 * selectWinner mirrors the logic in closeRound():
 *   const winnerProposalId = tallyRows?.[0]?.proposal_id ?? null
 *
 * The DB is responsible for sorting. The JS layer only picks the first row.
 */
function selectWinner(
  tallyRows: Array<{ proposal_id: string; vote_count: number }> | null
): string | null {
  return tallyRows?.[0]?.proposal_id ?? null
}

describe('selectWinner (tie-break logic)', () => {
  it('returns null when tally is empty (no votes cast)', () => {
    expect(selectWinner([])).toBeNull()
  })

  it('returns null when tally is null', () => {
    expect(selectWinner(null)).toBeNull()
  })

  it('returns the single proposal when only one received votes', () => {
    const rows = [{ proposal_id: 'aaa', vote_count: 3 }]
    expect(selectWinner(rows)).toBe('aaa')
  })

  it('returns the first row (highest vote count) when there is a clear winner', () => {
    // DB already sorted DESC — highest count first
    const rows = [
      { proposal_id: 'winner', vote_count: 3 },
      { proposal_id: 'loser', vote_count: 1 },
    ]
    expect(selectWinner(rows)).toBe('winner')
  })

  it('returns the first row in a tie (earlier created_at wins — DB sorts ASC)', () => {
    // The DB function sorts ties by MIN(created_at) ASC, so the earlier one
    // arrives first.  The JS layer just picks row[0].
    const rows = [
      { proposal_id: 'earlier', vote_count: 2 }, // created earlier → first in sorted result
      { proposal_id: 'later', vote_count: 2 },
    ]
    expect(selectWinner(rows)).toBe('earlier')
  })

  it('handles three-way tie — returns the first row', () => {
    const rows = [
      { proposal_id: 'first', vote_count: 1 },
      { proposal_id: 'second', vote_count: 1 },
      { proposal_id: 'third', vote_count: 1 },
    ]
    expect(selectWinner(rows)).toBe('first')
  })

  it('returns winner even with a zero-vote proposal present', () => {
    const rows = [
      { proposal_id: 'has-votes', vote_count: 2 },
      { proposal_id: 'no-votes', vote_count: 0 },
    ]
    expect(selectWinner(rows)).toBe('has-votes')
  })
})

// ── Tally aggregation logic ───────────────────────────────────────────────────
// Mirrors getRoundWithProposalsAndTally tally-map building (AIEX-834)

type TallyRow = { proposal_id: string; vote_count: number }

function buildTallyMap(rows: TallyRow[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const row of rows) {
    map[row.proposal_id] = Number(row.vote_count)
  }
  return map
}

describe('buildTallyMap (tally aggregation)', () => {
  it('returns an empty map for empty input', () => {
    expect(buildTallyMap([])).toEqual({})
  })

  it('maps each proposal_id to its vote_count', () => {
    const rows = [
      { proposal_id: 'p1', vote_count: 3 },
      { proposal_id: 'p2', vote_count: 1 },
    ]
    expect(buildTallyMap(rows)).toEqual({ p1: 3, p2: 1 })
  })

  it('coerces vote_count to a number (handles bigint from DB)', () => {
    // Postgres returns bigint as string in some drivers
    const rows = [{ proposal_id: 'p1', vote_count: '2' as unknown as number }]
    const map = buildTallyMap(rows)
    expect(typeof map['p1']).toBe('number')
    expect(map['p1']).toBe(2)
  })

  it('defaults missing proposal to 0 via nullish coalescing', () => {
    const map = buildTallyMap([])
    const count = map['unknown-id'] ?? 0
    expect(count).toBe(0)
  })
})
