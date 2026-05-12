-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: public.proposals
-- Tickets: AIEX-799, AIEX-809, AIEX-824
--
-- Stores book proposals within a round.
-- The RLS INSERT policy checks the parent round's status at the DB level
-- (plan risk R2, ADR §4 / §5). Closed-round lockdown is NOT an app concern.
--
-- Also adds the deferred FK from rounds → proposals for winner_proposal_id.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposals (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  round_id    uuid        NOT NULL REFERENCES public.rounds (id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  author      text        NOT NULL CHECK (char_length(author) BETWEEN 1 AND 100),
  reason      text        NULL     CHECK (reason IS NULL OR char_length(reason) <= 500),
  proposer_id uuid        NOT NULL REFERENCES public.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposals_pkey PRIMARY KEY (id)
);

-- ─── Audit trigger ────────────────────────────────────────────────────────
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Add the winner FK back on rounds now that proposals table exists ─────
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_winner_proposal_fk
  FOREIGN KEY (winner_proposal_id) REFERENCES public.proposals (id)
  DEFERRABLE INITIALLY DEFERRED;

-- ─── Row-Level Security ───────────────────────────────────────────────────
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read proposals.
CREATE POLICY "proposals_select_authenticated"
  ON public.proposals
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can INSERT proposals ONLY when the parent round is open (R2 / ADR §5).
-- The predicate is a subquery so the DB enforces it even on direct PostgREST calls.
CREATE POLICY "proposals_insert_open_round"
  ON public.proposals
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      SELECT status FROM public.rounds WHERE id = round_id
    ) = 'open'
  );

-- Once a proposal is inserted we do not allow edits via the API.
-- (No UPDATE / DELETE policies for members in MVP.)

-- ─── Indexes ─────────────────────────────────────────────────────────────
-- Composite index for tie-break ORDER BY (round_id, created_at).
CREATE INDEX IF NOT EXISTS proposals_round_created_at_idx
  ON public.proposals (round_id, created_at ASC);

CREATE INDEX IF NOT EXISTS proposals_proposer_idx
  ON public.proposals (proposer_id);
