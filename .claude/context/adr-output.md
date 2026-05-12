# ADR Output
generated: 2026-05-12
command:   /adr
adr_file:  ADR.md (project root)

## Stack locked
  Frontend:  Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
  Backend:   Next.js Route Handlers + Server Actions (no separate service)
  Database:  Supabase PostgreSQL with Row-Level Security
  Auth:      Supabase Auth — magic link only (no password, no OAuth)
  Storage:   not used in MVP (no uploads in scope)
  Deploy:    Vercel
  CI/CD:     GitHub Actions
  Tickets:   Jira AIEX (team-managed; 3-column workflow, no In Review)
  Optional:  none activated (realtime + email flagged as re-activation candidates)

## Key decisions

  - **DB + RLS over app-layer guards.** Closed-round lockdown is enforced via RLS predicates on `proposals` / `votes` that join to `rounds.status`. A stale tab cannot bypass it.
  - **DB constraints enforce the vote ceiling and per-book uniqueness.** Partial unique index `unique (status) WHERE status='open'` on `rounds`. `UNIQUE (proposal_id, voter_id)` on `votes`. Per-(round, voter) ≤3 ceiling enforced by trigger to handle the concurrency race (plan R1).
  - **Tie-break key is `proposals.created_at`** (earliest). Winner is computed at close time and persisted to `rounds.winner_proposal_id` so historical results never drift.
  - **Magic-link auth.** Lowest-friction, matches spec's "email-based login" literally, no password to store.
  - **One organizer per deployment via `users.is_organizer` boolean.** Seeded once by a SQL update on first deployment.
  - **Tallies revalidate on action, not in realtime.** `revalidatePath` after every vote/propose/close keeps the round detail page fresh without websockets. Realtime is NICE-TO-HAVE, not MUST.
  - **`closing_date` is informational only.** Organizer closes manually — no scheduled job, no cron, no Vercel-cron config.
  - **Display name defaults to local-part of email** (`split_part(email, '@', 1)`). Sufficient for an internal team.
  - **Winner is persisted at close time** (not recomputed on read) to avoid late-write drift and TOCTOU.

## Data model entities

  - **users** — 1:1 with `auth.users`; columns `id`, `email`, `display_name`, `is_organizer`, `created_at`, `updated_at`.
  - **rounds** — `id`, `title`, `closing_date`, `status` ('open'|'closed'), `winner_proposal_id`, `created_by`, audit fields. Partial unique index on `status` where `status='open'`.
  - **proposals** — `id`, `round_id`, `title`, `author`, `reason` (≤500 chars), `proposer_id`, audit fields. Indexed on `(round_id, created_at)` for tie-break SQL.
  - **votes** — `id`, `proposal_id`, `voter_id`, `round_id` (denormalised for ceiling check), `created_at`. `UNIQUE (proposal_id, voter_id)`; per-(round, voter) ≤3 via trigger.

## Key trade-offs (verbatim from ADR §7)

  - Supabase + Vercel = significant vendor lock-in; acceptable for an MVP demo, expensive to unwind.
  - DB constraints are load-bearing — concurrency tests (AIEX-810, 822, 830) are non-negotiable.
  - `is_organizer` boolean doesn't scale to multi-team; revisit if scope grows.
  - Tally revalidation (not realtime) means two members on the same screen at the same instant won't see each other's votes appear instantly. Matches spec; revisit only if elevated.

## Notes for downstream phases

  - **/ux** must produce wireframes for: `/signin`, signed-in home (no round / open round), round detail (with proposals + tally + propose form + vote toggles + remaining-votes indicator), closed round (winner card), organizer's "Open round" form, organizer's "Close round" confirm dialog, and the 4 empty/error states.
  - **/develop backend** must implement DB constraints + RLS first (T2 / AIEX-799 + sub-tasks), then routes that exercise them (S2–S5).
  - **/develop qa** must include explicit concurrency tests for the vote-ceiling trigger and explicit RLS isolation tests for closed-round writes — both are load-bearing per this ADR.
  - **Jira workflow has no `In Review`** — `/develop done` should leave tickets in `In Progress` until `/review pass` moves them to `Done`. Cached in `.claude/config/jira-board.json#transitions`.

---HANDOFF---
agent:     architecture
completed: ADR.md written to project root with 8 sections (context, core stack, optional modules, data model, security, scalability, trade-offs, consequences)
stack:     Next.js 14 + TypeScript + Tailwind + shadcn/ui · Supabase Postgres + Auth (magic link) + RLS · Vercel · GitHub Actions · Jira AIEX (team-managed)
entities:  users, rounds, proposals, votes
modules:   none activated (rationale recorded for realtime + email)
issues:    DB constraints + RLS are load-bearing — concurrency tests are non-negotiable. AIEX workflow has no In Review column — /develop done must skip that transition.
next:      Run /ux to produce wireframes, prompt for reference screenshots and CSS
---END---
