-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Add email verification
-- Tickets: AIEX-XXX (Email Verification)
--
-- Adds email_verified column to users table to track email verification status.
-- Signups require users to verify their email before they can log in.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- Index for querying unverified users
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON public.users (email_verified);

-- Add comment for clarity
COMMENT ON COLUMN public.users.email_verified IS 'True if user has verified their email address via verification link';
