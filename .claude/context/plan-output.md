# Plan Output
generated: 2026-05-12
command: /plan
spec_source: c:\Users\SaicharanGnanapiraga\Documents\AI-SDLC-Exercise\.claude\context\Plan-Requirements.docx
brainstorm: no

## App Type
Internal team-coordination tool — a lightweight voting / decision platform for a single book-club / reading-group team. Two-role internal app (member + organizer), single tenant, one active voting round at a time.

## Problem Statement
A small reading group runs a monthly vote to pick a book. Today the propose/decide steps drag out across Slack threads, the running tally encourages bandwagoning, and there is no enforced ceiling on how many votes a member casts. The team needs a focused tool that lets the organizer open and close a round, lets members propose books and cast up to three votes (max one per book), and keeps the vote honest with server-side enforcement so stale tabs and direct-URL pokes cannot bypass the rules. Discussion stays in chat; this tool owns "propose" and "decide".

## Core Features

MUST:
  - Email-based authentication via Supabase Auth (magic link), gating all routes.
  - Two roles: `member` and `organizer`. Exactly one organizer per deployment.
  - Organizer can open a new voting round with `title` (e.g. "June 2026") and `closing_date`.
  - System enforces: at most one round in status `open` at any time.
  - Members can propose one or more books to the open round with `title`, `author`, `reason` (short text).
  - Members can cast up to **3 votes total** in the open round, **max 1 vote per book** (server-enforced, not just UI-blocked).
  - Members can change or withdraw their votes while the round is `open`.
  - Organizer can transition the round from `open` to `closed`; closed rounds are read-only end-to-end (no proposals, no votes, no edits) and the lockdown is server-enforced via RLS, not just UI state.
  - Winner is computed as the proposal with the most votes; ties broken by **earliest proposal `created_at`**.
  - Vote tallies are visible to all signed-in members at all times (simple mode).
  - Server-side guardrails surface clear, actionable error messages for: 4th-vote attempt, double-vote on same book, vote on closed round, proposal on closed round, edit-after-votes attempt.

SHOULD:
  - Round detail page shows: title, closing date, status (`open` / `closed`), list of proposals with proposer name, per-proposal tally, and "your votes" indicator.
  - "My votes remaining: X of 3" indicator on the active round page so members do not hit the 4th-vote error by accident.
  - Winner announcement card on closed rounds (title, author, proposer, vote count, total votes cast, total members who voted).
  - Empty-state and error-state UI for: round-not-open, no-proposals-yet, no-active-round, not-signed-in, not-a-member.
  - Audit fields on every table (`created_at`, `updated_at`, `created_by`) so we can answer "who did what when" without a separate audit log.
  - Database constraints (not just app-layer checks) enforce the vote ceiling and uniqueness so two simultaneous requests cannot both succeed.

NICE-TO-HAVE:
  - Real-time tally updates via Supabase Realtime (Postgres `LISTEN/NOTIFY`) so the tally refreshes without a manual reload. Spec does not require it but it noticeably improves the demo. Would activate `realtime.md` if elevated to MUST.
  - "Blind tally" mode toggle on the round — the variant mentioned in the spec where the running tally is hidden until close, to prevent bandwagoning. Useful organizer setting but explicitly outside MUST.
  - Past-rounds index (read-only list of closed rounds + their winners). Data exists; only the UI is out of scope per spec — keep this for after MUST/SHOULD.
  - Email notification to members when the organizer closes a round and the winner is announced. Would activate `email.md` (Resend).

## User Journeys

1. **Happy-path round (organizer + two members):** Organizer signs in and opens round "June 2026" with a closing date one week out. Member A signs in, proposes "Book X" and "Book Y" with reasons. Member B proposes "Book Z". Member A casts 2 votes (one each on X and Z). Member B casts 3 votes (one each on X, Y, Z) — using their full ceiling. Both can see live tallies. Organizer closes the round; the system renders the winner card (tie between X and Z by vote count → Book X wins because it was proposed earlier).

2. **Member changes mind before close:** Member B casts 3 votes, then realizes Book Y is duplicative. They withdraw the vote from Y; their remaining count goes from 0 to 1. They cast that freed vote on Book Z. Tally updates accordingly. All happens while round is `open`.

3. **Guardrails fire (failure paths):** A member tries to cast a 4th vote → blocked server-side with "You have used all 3 votes — withdraw one to vote again." A member tries to vote on the same book twice → blocked with "You already voted for this book." A member with a stale tab tries to vote on a round the organizer just closed → server rejects with "This round is closed."

4. **Cold-start onboarding:** A new member follows the deployment URL → sees the magic-link sign-in screen → enters email → clicks the link in their inbox → lands on the current open round (or "No round is open yet — ask your organizer to open one"). No password to manage, no profile to set up beyond their display name.

## Activated Optional Modules
None.

Rationale per module (so the next phase can re-evaluate if scope changes):
  - `payments.md` — spec contains no payment, checkout, subscription, or billing signal. Not activated.
  - `state-mgmt.md` — spec contains no multi-step wizard or complex client-shared state. Voting is a single-screen, server-authoritative form. React state + server actions are sufficient. Not activated.
  - `realtime.md` — spec says "vote tallies visible to members at all times" but does NOT say "live" or "real-time". Polling on navigation / page refresh satisfies MUST. Listed as NICE-TO-HAVE; revisit if user elevates it.
  - `file-upload.md` — no uploads, images, or attachments in spec. Not activated.
  - `email.md` — spec mentions "email-based login" (handled natively by Supabase Auth magic links — does NOT require Resend) and the organizer "announces the winner" (rendered in-app — no transactional email needed). Not activated. Re-activate if winner email is elevated to MUST.
  - `auth-social.md` — spec is explicit: email-based login only. No Google / GitHub / OAuth. Not activated.

## Stack
  Core: Next.js 14 App Router + TypeScript, Tailwind CSS + shadcn/ui, Supabase (PostgreSQL + Auth), Vercel, GitHub Actions, Jira (AIEX board on emblaftdev.atlassian.net).
  Optional: none (see "Activated Optional Modules" above for re-activation triggers).

## Suggested Jira Epic Name
Team Reading List Vote — Round Lifecycle MVP

## Milestones

  1. **M1 — Auth + schema skeleton:** Magic-link sign-in works end-to-end. `users`, `rounds`, `proposals`, `votes` tables exist with RLS policies. Empty home page renders for an authenticated user. No business logic yet.
  2. **M2 — Round lifecycle (organizer):** Organizer can open a round and close a round. Single-open-round constraint enforced at DB level. Members see the active round in read-only form. Closed rounds are server-side locked.
  3. **M3 — Proposals (members):** Members can submit proposals (title / author / reason) to the open round. List of proposals renders with proposer name and timestamps. No voting yet.
  4. **M4 — Voting + tallies:** Members can cast / change / withdraw up to 3 votes (max 1 per book). Tally is visible per proposal. All four guardrail errors fire from the server. Winner is computed on close (ties broken by earliest proposal time) and shown on the closed-round view.
  5. **M5 — Polish + demo readiness:** Empty-states, error-states, "votes remaining" indicator, winner-announcement card, README, ADR, deploy URL stable. Happy-path and failure demo scenarios from the spec are reproducible end to end.

## Risks and Assumptions

Assumptions (spec is silent; recording so /adr and /develop can confirm):
  - **A1 — Organizer designation.** Spec says "one organizer per deployment" but not how it is set. Assumption: one boolean `is_organizer` on the `users` table, seeded via a one-off SQL/migration step for the deployment's organizer email. Revisit if /adr wants an env-var driven approach.
  - **A2 — Closing date is informational.** Spec says "the organizer closes the round" (active verb). Assumption: `closing_date` is shown to set expectations but does NOT auto-close the round; only the organizer's explicit action closes it. No scheduled job in MVP.
  - **A3 — Email auth = Supabase magic link (passwordless).** Spec says "email-based login" without specifying password vs OTP vs magic link. Magic link is the lowest-friction option, matches Supabase defaults, and avoids password storage entirely. Confirm in /adr.
  - **A4 — Member identity for display.** Spec doesn't define a display name. Assumption: use the local-part of the email (or a short `display_name` set on first login). Good enough for an internal team tool.
  - **A5 — "One round at a time" is a hard invariant.** Enforced at DB level via a partial unique index `unique (status) where status = 'open'`, not just app logic.
  - **A6 — "Read-only on close" is server-enforced.** Enforced via RLS predicates on `proposals` and `votes` that check the parent round's status, not just by hiding the buttons.
  - **A7 — Tie-break rule.** "Earliest proposal time" = earliest `proposals.created_at`. Resolved at close time and persisted on the round row so the answer is stable.

Risks:
  - **R1 — Race condition on the 3rd/4th vote.** Likelihood: MEDIUM. Two near-simultaneous vote inserts could both pass an app-level "you have <3 votes" check. Mitigation: enforce the ceiling in a DB constraint or via a Postgres function with `SELECT ... FOR UPDATE` on the voter's existing votes; do not rely solely on app logic. /develop's backend agent must verify this with a deliberate concurrency test.
  - **R2 — Stale-tab voting after close.** Likelihood: MEDIUM. Member loaded the page while round was open, organizer closes, member then votes from the stale tab. Mitigation: RLS predicate on `votes` insert/update/delete that joins to `rounds.status` and rejects if not `open`. UI also re-validates on submit.
  - **R3 — RLS misconfiguration leaks proposals or votes cross-deployment.** Likelihood: LOW (single-tenant) but blast radius is HIGH. Mitigation: every table has explicit RLS on by default; the QA agent in /develop must include an RLS-isolation test pass.
  - **R4 — Spec ambiguity: "vote tallies visible at all times" — live or on refresh?** Likelihood: LOW; mostly a UX expectation gap. Mitigation: ship the refresh-based version for MUST and flag the realtime option to the user during /ux so they can elevate if needed before /develop.
  - **R5 — Single organizer is a single point of failure for the demo.** Likelihood: LOW. If the organizer account is locked out at demo time, no round can be closed. Mitigation: keep organizer-toggle a simple SQL update so a backup can be promoted quickly during the demo if needed.
  - **R6 — Jira-ticket attribution on AIEX.** Likelihood: HIGH if /jira and /commit are run carelessly. The AIEX board is shared and most existing tickets belong to another contributor; per recorded user feedback the orchestrator must only attribute commits to issues whose `creator.accountId` matches the current user, and `/jira` must create a fresh Epic + Stories + Sub-tasks assigned to the current user rather than reusing someone else's. Mitigation: hand this constraint forward in plan-output → /jira reads it and obeys.

---HANDOFF---
agent:     planning
completed: spec parsed (Team reading list vote), app classified as internal coordination tool, core/SHOULD/NICE features identified, user journeys and milestones drafted, risks + assumptions recorded
modules:   none activated; rationale and re-activation triggers recorded for realtime / email
epic:      Team Reading List Vote — Round Lifecycle MVP
issues:    AIEX board is shared — /jira must create a fresh Epic owned by the current user (Saicharan, accountId 712020:fae1d817-7deb-41a9-8904-3132ae879c24); do NOT reuse tickets created by other contributors. Server-side enforcement of vote ceiling and round-closed lockdown are non-negotiable — RLS + DB constraints, not just UI.
next:      Run /jira to create the Epic + Stories + Sub-tasks in AIEX (all assigned to the current user, all landing in the backlog with status To Do)
---END---
