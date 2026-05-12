-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: public.votes
-- Tickets: AIEX-799, AIEX-809, AIEX-828
--
-- Stores individual vote rows.
-- Enforces two invariants at the DB level:
--   (a) At most 1 vote per (proposal, voter)  — UNIQUE constraint
--   (b) At most 3 votes per (round, voter)     — BEFORE INSERT trigger
--
-- Concurrency note (plan risk R1):
--   The trigger uses `SELECT ... FOR UPDATE` on the voter's existing votes
--   in the round. This serialises concurrent INSERT attempts from the same
--   voter, so two simultaneous requests racing to cast the 3rd and 4th vote
--   cannot both succeed — the second transaction blocks until the first
--   commits, then reads the updated count and raises the exception.
--
-- Closed-round lockdown (plan risk R2, ADR §5):
--   Both INSERT and DELETE policies check the parent round's status.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.votes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  proposal_id uuid        NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  voter_id    uuid        NOT NULL REFERENCES public.users (id),
  round_id    uuid        NOT NULL REFERENCES public.rounds (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  -- Guarantees a voter can cast at most 1 vote per book (UNIQUE violation → "You already voted for this book.")
  CONSTRAINT votes_unique_proposal_voter UNIQUE (proposal_id, voter_id)
);

-- ─── vote-ceiling trigger (plan R1 — concurrent safety) ──────────────────
--
-- Strategy: SELECT ... FOR UPDATE on the set of existing votes for
-- (round_id, voter_id). This acquires row-level locks on those rows,
-- serialising concurrent INSERT attempts from the same voter in the same round.
-- If the count after locking is already >= 3, we raise a custom exception with
-- SQLSTATE 'P0001' and the user-visible error message. The API layer catches
-- this specific SQLSTATE to return the "4th vote" toast copy.
--
-- Why trigger and not a constraint? A CHECK constraint can't count rows in
-- other transactions' in-flight state; a trigger with FOR UPDATE can.
CREATE OR REPLACE FUNCTION public.enforce_vote_ceiling()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _vote_count integer := 0;
  _vote_row public.votes%rowtype;
BEGIN
  -- Lock all existing votes for this (round, voter) to serialise concurrent inserts.
  -- Use a loop to count rows while holding locks.
  FOR _vote_row IN 
    SELECT *
    FROM public.votes
    WHERE round_id = NEW.round_id
      AND voter_id = NEW.voter_id
    FOR UPDATE
  LOOP
    _vote_count := _vote_count + 1;
  END LOOP;

  IF _vote_count >= 3 THEN
    RAISE EXCEPTION 'You have used all 3 votes — withdraw one to vote again.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER votes_before_insert_ceiling
  BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vote_ceiling();

-- ─── Row-Level Security ───────────────────────────────────────────────────
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent re-runs)
DROP POLICY IF EXISTS "votes_select_authenticated" ON public.votes;
DROP POLICY IF EXISTS "votes_insert_open_round_own" ON public.votes;
DROP POLICY IF EXISTS "votes_delete_open_round_own" ON public.votes;

-- All authenticated users can read votes (for tally display).
CREATE POLICY "votes_select_authenticated"
  ON public.votes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can cast a vote only when:
--   (a) the parent round is open (closed-round lockdown R2)
--   (b) voter_id equals the authenticated user
CREATE POLICY "votes_insert_open_round_own"
  ON public.votes
  FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND (
      SELECT status FROM public.rounds WHERE id = round_id
    ) = 'open'
  );

-- Members can withdraw (DELETE) their own votes only when the round is open.
CREATE POLICY "votes_delete_open_round_own"
  ON public.votes
  FOR DELETE
  USING (
    voter_id = auth.uid()
    AND (
      SELECT status FROM public.rounds WHERE id = round_id
    ) = 'open'
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────
-- For ceiling-check and per-voter queries
CREATE INDEX IF NOT EXISTS votes_round_voter_idx
  ON public.votes (round_id, voter_id);

-- For per-proposal tally counts
CREATE INDEX IF NOT EXISTS votes_proposal_idx
  ON public.votes (proposal_id);

CREATE INDEX IF NOT EXISTS votes_voter_idx
  ON public.votes (voter_id);
