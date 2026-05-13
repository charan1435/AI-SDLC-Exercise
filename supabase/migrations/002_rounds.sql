-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: public.rounds
-- Tickets: AIEX-799, AIEX-809, AIEX-816, AIEX-820
--
-- Stores voting rounds. Enforces the "at most one open round at a time"
-- invariant via a partial unique index (plan assumption A5 / ADR).
--
-- closing_date is INFORMATIONAL only (A2) — the organizer closes manually.
-- winner_proposal_id is populated at close time and never recomputed (ADR).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rounds (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  title               text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  closing_date        date        NOT NULL,
  status              text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  winner_proposal_id  uuid        NULL,      -- FK to proposals added in 003_proposals.sql
  created_by          uuid        NOT NULL REFERENCES public.users (id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rounds_pkey PRIMARY KEY (id)
);

-- ─── Audit trigger ────────────────────────────────────────────────────────
CREATE TRIGGER rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Single-open-round invariant (plan A5, ADR) ───────────────────────────
-- A partial unique index guarantees only one row with status='open' can exist
-- at any moment. The DB rejects a second INSERT (or UPDATE that re-opens a
-- round) with a unique_violation (23505), which the API layer maps to the
-- message "A round is already open — close it first."
CREATE UNIQUE INDEX IF NOT EXISTS rounds_single_open_idx
  ON public.rounds (status)
  WHERE status = 'open';

-- ─── Row-Level Security ───────────────────────────────────────────────────
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read rounds (for the home page + round detail).
CREATE POLICY "rounds_select_authenticated"
  ON public.rounds
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only organizers can insert rounds.
CREATE POLICY "rounds_insert_organizer"
  ON public.rounds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_organizer = true
    )
  );

-- Only organizers can update rounds (e.g. to close them / set winner).
CREATE POLICY "rounds_update_organizer"
  ON public.rounds
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_organizer = true
    )
  );

-- Only organizers can delete rounds.
CREATE POLICY "rounds_delete_organizer"
  ON public.rounds
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_organizer = true
    )
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS rounds_status_idx       ON public.rounds (status);
CREATE INDEX IF NOT EXISTS rounds_created_by_idx   ON public.rounds (created_by);
CREATE INDEX IF NOT EXISTS rounds_created_at_idx   ON public.rounds (created_at DESC);
