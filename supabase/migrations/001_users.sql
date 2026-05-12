-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: public.users
-- Tickets: AIEX-799, AIEX-809, AIEX-811
--
-- Creates a 1:1 mirror of auth.users with application-level fields.
-- A trigger auto-creates a row here whenever a new user completes
-- magic-link sign-in for the first time.
--
-- Organizer designation:
--   One boolean `is_organizer` per row. Seeded once per deployment with:
--     UPDATE public.users SET is_organizer = true WHERE email = 'your@email.com';
--   (Run this in the Supabase SQL editor after the first sign-in.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id           uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email        text        NOT NULL,
  display_name text        NOT NULL DEFAULT '',
  is_organizer boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ─── Audit: keep updated_at current on every UPDATE ───────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Auto-create public.users row on first auth.users insert ──────────────
-- Uses the local-part of the email as the default display name (A4).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Row-Level Security ───────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Every signed-in user can read all users (needed to display proposer names).
CREATE POLICY "users_select_all_authenticated"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Each user can update only their own row.
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- The on-auth-user-created trigger runs as SECURITY DEFINER so it can insert
-- without a permissive INSERT policy for authenticated users.
-- We still add a service-role-only policy so our admin client can seed rows.
CREATE POLICY "users_insert_service_role"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ─── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
