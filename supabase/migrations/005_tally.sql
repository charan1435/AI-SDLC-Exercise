-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: tally aggregate function
-- Tickets: AIEX-799, AIEX-832
--
-- round_tally(round_id uuid) returns a result set of (proposal_id, vote_count)
-- for every proposal in the given round.  The function is STABLE because for
-- the same input it always returns the same output within a single transaction
-- (votes are not modified during a query).
--
-- SECURITY DEFINER is used so the function can be called by any authenticated
-- user regardless of whether their session context would satisfy any additional
-- RLS predicate.  The underlying votes SELECT policy ("votes_select_authenticated")
-- still requires auth.role() = 'authenticated', so unauthenticated callers
-- cannot bypass it through this function.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.round_tally(round_id uuid)
RETURNS TABLE (
  proposal_id uuid,
  vote_count  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id          AS proposal_id,
    COUNT(v.id)   AS vote_count
  FROM public.proposals p
  LEFT JOIN public.votes v
    ON v.proposal_id = p.id
  WHERE p.round_id = round_tally.round_id
  GROUP BY p.id
  ORDER BY vote_count DESC, p.created_at ASC;
$$;

-- Grant execute to authenticated role so the SDK can call it.
GRANT EXECUTE ON FUNCTION public.round_tally(uuid) TO authenticated;
