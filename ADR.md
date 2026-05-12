# Architecture Decision Record

## Project
Team Reading List Vote — Round Lifecycle MVP

## Status
Accepted

## Date
2026-05-12

---

## 1. Context

A small reading group runs a monthly vote to pick a book. Today the propose/decide steps drag out across Slack threads, the running tally encourages bandwagoning, and there is no enforced ceiling on how many votes a member casts. This tool owns the "propose" and "decide" steps; "discuss" stays in chat. Two roles exist: **member** (proposes, votes) and **organizer** (opens and closes a round, announces the winner). There is exactly one organizer per deployment.

Key constraints from the spec:
- Email-based login only (no password to manage, no OAuth).
- At most one round in status `open` at a time.
- Members cast at most 3 votes per round, at most 1 vote per book.
- Closed rounds are end-to-end read-only — enforced **server-side**, not just in the UI, so a stale tab or direct API poke cannot bypass it.
- Hand-in is a working app at demo time, plus a Git repo with README, this ADR, and Jira artifacts on the shared AIEX board.

The decisions below favor enforcing the spec's invariants at the **lowest possible layer** (database constraints + RLS) over relying on application-layer checks. The spec's failure scenarios — 4th vote, double-vote on the same book, vote on a closed round — must fail even if the UI is bypassed.

This is a single-tenant, single-team internal tool. Realistic scale is a handful of members. Most scaling concerns are theoretical for this project; we document them honestly but do not over-engineer.

---

## 2. Core Stack Decision

### Frontend — Next.js 14 App Router + TypeScript
**Decision:** Use Next.js 14 with App Router and React Server Components.
**Rationale:**
  - Server components keep tally aggregation on the server, so the client never has to recompute counts or even know about every vote row.
  - `revalidatePath` after every vote/propose/close action keeps the UI fresh without a polling loop or websockets — adequate for this small team and avoids the realtime module.
  - Built-in API routes / server actions eliminate the need for a separate backend service.
  - Native Vercel deployment with zero config.
  - TypeScript end-to-end means the Supabase row shape, Zod schemas, and React props share types.
**Alternatives considered:**
  - React + Vite + separate Express: rejected — two deployment units, CORS, more complexity for no real benefit on a team-internal tool.
  - Remix: similar SSR benefits but smaller ecosystem and no team experience; would slow the demo build.

### UI — Tailwind CSS + shadcn/ui
**Decision:** Tailwind utility CSS with shadcn/ui components.
**Rationale:**
  - shadcn/ui components are copied into the repo (owned, not a dependency), so they can be modified freely for the votes-remaining indicator, winner card, and confirm dialog without fighting library defaults.
  - Tailwind eliminates CSS file management for a one-page round detail screen.
  - Built-in design tokens keep the (small) UI surface coherent without a designer.
**Alternatives considered:**
  - MUI / Chakra: opinionated styles harder to customise for the winner card and inline indicators.
  - Plain CSS modules: slower development for a one-week build.

### Backend — Next.js API Routes + Server Actions
**Decision:** No separate backend server. Use Next.js Route Handlers and Server Actions co-located with the frontend.
**Rationale:**
  - The vote/propose/close handlers each touch a single table with a small validated payload — they don't need a dedicated service.
  - Server actions let the propose form and vote toggle hit the database directly with the user's authenticated Supabase session forwarded server-side.
  - One deployment unit on Vercel — simpler CI/CD, one set of env vars, one log stream.
**Alternatives considered:**
  - FastAPI (Python): rejected — adds a second deployment, two terminals locally, no Python-specific requirement in the spec.
  - Express server: rejected — same drawbacks, no upside.

### Database / Auth — Supabase (PostgreSQL + Auth)
**Decision:** Supabase Postgres with Row-Level Security and Supabase Auth (magic link).
**Rationale:**
  - **RLS is the single source of truth for the spec's hardest invariant: closed-round lockdown.** A predicate on `proposals.INSERT` and `votes.INSERT/UPDATE/DELETE` that joins to `rounds.status` rejects writes server-side regardless of which client makes them. Without RLS this would be an application-layer check that a stale tab or curl request could bypass.
  - **DB constraints handle the race risks (plan risk R1).** A partial unique index `unique (status) WHERE status = 'open'` enforces the single-open invariant. A `UNIQUE (proposal_id, voter_id)` constraint stops double-votes. A `CHECK` or trigger-enforced ceiling on `votes` per `(round_id, voter_id)` stops the 4th-vote race even under concurrent inserts.
  - Magic-link auth means no password storage and no OAuth UX complexity. The spec explicitly says "email-based login."
  - Generous free tier; the entire team fits inside it many times over.
**Alternatives considered:**
  - Firebase: NoSQL would force us to compute uniqueness and aggregates client-side or via Cloud Functions; relational integrity is a much better fit for `proposals → votes` with FK + UNIQUE.
  - PlanetScale + custom auth: more moving parts; no advantage at this scale.

### Deployment — Vercel
**Decision:** Deploy to Vercel.
**Rationale:**
  - Native Next.js support, zero config.
  - Preview deployments on every PR — useful for demoing intermediate states before the hand-in.
  - Public URL requirement met instantly.
**Alternatives considered:**
  - Self-host on a VPS: rejected — no reason to take on infra ops for a one-week tool.

### CI/CD — GitHub Actions
**Decision:** GitHub Actions for lint, build, test, and the Vercel deploy hook.
**Rationale:**
  - Lives in the repo, visible to reviewers.
  - Free tier covers this project comfortably.
  - Vercel auto-deploys on push to `master`; Actions covers everything that should run before push (lint, unit tests, e2e smoke).

### Tickets — Jira (shared AIEX board on emblaftdev.atlassian.net)
**Decision:** Use the existing AIEX project (team-managed / simplified workflow).
**Rationale:**
  - Spec requires Jira artifacts on the shared Embla board.
  - AIEX-797 (Epic) and 40 child issues created by /jira, all assigned to the current user.
  - The AIEX workflow is `To Do → In Progress → Done` (no `In Review` column). Downstream phases must map `/develop done` to "leave in progress until /review."

---

## 3. Optional Module Decisions

The /plan phase activated **no** optional modules. Each was evaluated and explicitly rejected for MUST scope. Two are reasonable upgrades if scope grows:

### Realtime — Supabase Realtime / Postgres LISTEN/NOTIFY
**Decision:** Not activated.
**Rationale:** The spec says "vote tallies visible to members at all times" but does not say "live" or "realtime." Server-rendered tallies with `revalidatePath` after every mutation are fresh on every navigation/action — sufficient for the spec and the demo. Avoiding realtime means no websocket connection management and no client-side state reconciliation.
**Re-activate if:** the user elevates live updates to MUST, or the team grows past the size where everyone naturally refreshes within a few seconds of each other.
**Alternatives considered:** polling every N seconds — adds load with no benefit at this team size; skipped in favor of "on action revalidate."

### Email — Resend
**Decision:** Not activated.
**Rationale:** The only emails in scope are the magic-link auth emails, which Supabase Auth sends natively. The organizer "announces the winner" by closing the round in-app, not by sending an email. Adding Resend would mean another API key, another vendor, and a deliverability story.
**Re-activate if:** "email the winner to all members on close" becomes a MUST.

### Payments / State-mgmt / File-upload / Auth-social
**Decision:** Not activated. None of these have any signal in the spec.

---

## 4. Data Model

```
auth.users  (managed by Supabase Auth)
  └── public.users           (1:1 with auth.users; carries app-level fields)
       ├── public.rounds     (created_by → users.id; only organizer creates)
       │    └── public.proposals  (round_id → rounds.id; proposer_id → users.id)
       │         └── public.votes (proposal_id → proposals.id; voter_id → users.id)
       │
       └── public.proposals.proposer_id     (FK back to users)
       └── public.votes.voter_id            (FK back to users)
```

**Tables (canonical shape — full DDL produced by AIEX-799):**

```
users
  id              uuid PRIMARY KEY            (FK → auth.users.id, ON DELETE CASCADE)
  email           citext  NOT NULL UNIQUE     (mirrored from auth.users for joins/display)
  display_name    text    NOT NULL            (defaults to split_part(email, '@', 1))
  is_organizer    boolean NOT NULL DEFAULT false
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()

rounds
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
  title               text   NOT NULL
  closing_date        date   NOT NULL                 (informational; organizer manually closes)
  status              text   NOT NULL CHECK (status IN ('open','closed'))
  winner_proposal_id  uuid   NULL REFERENCES proposals(id)  (set at close time)
  created_by          uuid   NOT NULL REFERENCES users(id)
  created_at          timestamptz NOT NULL DEFAULT now()
  updated_at          timestamptz NOT NULL DEFAULT now()
  -- INVARIANT: only one row may have status='open' at any time:
  CONSTRAINT rounds_single_open UNIQUE INDEX (status) WHERE status = 'open'

proposals
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  round_id      uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE
  title         text NOT NULL
  author        text NOT NULL
  reason        text NOT NULL CHECK (char_length(reason) <= 500)
  proposer_id   uuid NOT NULL REFERENCES users(id)
  created_at    timestamptz NOT NULL DEFAULT now()        (tie-break key — see §5)
  updated_at    timestamptz NOT NULL DEFAULT now()

votes
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  proposal_id   uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE
  voter_id      uuid NOT NULL REFERENCES users(id)
  round_id      uuid NOT NULL REFERENCES rounds(id)     (denormalised for the ceiling check)
  created_at    timestamptz NOT NULL DEFAULT now()
  UNIQUE (proposal_id, voter_id)                         (per-book uniqueness)
  -- INVARIANT: at most 3 votes per (round, voter) — enforced by trigger or
  -- CHECK on a count subquery in a BEFORE INSERT trigger; documented in AIEX-799.
```

**Key indexes:**
  - `votes (proposal_id)` for the per-proposal tally aggregate (S6).
  - `votes (round_id, voter_id)` for the ceiling check.
  - `proposals (round_id, created_at)` for the tie-break SQL on close.

**Key relationships:**
  - `users` is the canonical app-level identity, joined 1:1 to `auth.users`. A row is created on first sign-in via a trigger on `auth.users`.
  - `rounds.created_by` records the organizer who opened it (audit + permission check).
  - `proposals.proposer_id` lets the UI render "proposed by Alice".
  - `votes.round_id` is denormalised so the ceiling check and closed-round RLS predicate don't have to join through `proposals → rounds`.

---

## 5. Security Decisions

  - **RLS enabled on every table.** No table is reachable from the anon role without an explicit policy.
  - **Closed-round lockdown is RLS-enforced.** `INSERT` / `UPDATE` / `DELETE` policies on `proposals` and `votes` include a predicate that joins to `rounds.status` and rejects when status ≠ `'open'`. A stale tab or direct API request cannot bypass it.
  - **Organizer-only writes are RLS-enforced.** Policies on `rounds.INSERT` and `rounds.UPDATE` (the close action) check `users.is_organizer = true` for the authenticated user. The middleware redirect is a UX nicety, not the gate.
  - **Vote ceiling and per-book uniqueness are DB-enforced** (UNIQUE constraint + trigger), not app-layer. This addresses plan risk R1 (concurrent 3rd/4th vote race).
  - **Service-role key never leaves the server.** All client code uses the anon key + the user's session JWT; only server actions / route handlers use the service role when needed for cross-user reads (e.g. proposer display names in the list).
  - **All secrets in environment variables.** `.env*` files are gitignored and a pre-commit hook (already wired in `.claude/hooks/`) blocks them.
  - **Winner is persisted at close time** (`rounds.winner_proposal_id`), not recomputed on every page load. This eliminates a class of TOCTOU bugs where late-arriving votes (which shouldn't happen, but defense in depth) could change a "stable" historical result.
  - **Display name defaults to `split_part(email, '@', 1)`** — no PII beyond what the user already shared via email, and an internal team will rarely customise it.

---

## 6. Scalability Note

### Current architecture (PoC / demo)
One team (5–20 members). One organizer. One active round at a time. The entire app fits inside Vercel's Hobby tier and Supabase's free tier with room to spare. The most-trafficked query is the round detail page (tally + proposals + sign-in check) — a single SQL round-trip with two joins.

### At 10,000 users
This scale is unrealistic for a single-team tool, but if the model were repurposed for a wider audience:
  - **Bottleneck 1:** Postgres connection count. Supabase's session-mode pooler caps at a few hundred concurrent. Mitigation: switch to transaction-mode pooling, or move the read path (tally + proposals list) behind a 5-second edge cache.
  - **Bottleneck 2:** The vote-ceiling trigger does a `SELECT count(*)` on `votes` per insert. Mitigation: add a partial index on `votes (round_id, voter_id)` (already planned). At very high write rates, switch to a `COUNT`-via-row-number trigger or a per-(round, voter) summary row with `UPDATE … RETURNING new_count`.
  - **Bottleneck 3:** The tally aggregate is `COUNT(*) GROUP BY proposal_id`. Mitigation: materialised view refreshed on every close, or a denormalised `proposals.vote_count` column updated via trigger.

### At 100,000 users
  - **Multi-tenant:** add a `teams` table and put RLS predicates everywhere. The current "single organizer per deployment" model has to evolve to "organizer per team."
  - **Read scale:** put the round detail behind Vercel Edge caching with a short TTL, invalidated by `revalidatePath` on every write. CDN-cache static assets aggressively.
  - **Write scale:** votes are already constant per-user, so write rate scales with concurrent users — not a real concern until you hit the connection-pool ceiling.
  - **Region:** add Supabase read replicas in the closest region per user; Vercel already serves the edge globally.

### Observability
  - **Logging:** Vercel function logs are sufficient at this scale. For a production deployment, ship logs to a log aggregator (Logflare, Better Stack, or Vercel's built-in log drain).
  - **Monitoring:** Supabase dashboard for DB query stats + Vercel analytics for request latency.
  - **Error tracking:** Sentry (NICE-TO-HAVE — not wired in MVP). Server-side guardrails already return structured error messages, so the toast layer + Sentry breadcrumbs would be a quick add later.

---

## 7. Key Trade-offs Summary

| Decision                                              | Benefit                                                                  | Trade-off                                                                                   |
|-------------------------------------------------------|--------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Next.js full-stack                                    | One deploy, one repo, server actions co-located with UI                  | Less flexible than a separate API; vendor-coupled to Vercel for best DX                     |
| Supabase (Postgres + Auth + RLS)                      | RLS makes server-side invariant enforcement trivial; magic link is free  | Significant vendor lock-in; migrating off Supabase means rewriting auth + RLS policies      |
| Vercel                                                | Zero-config deploy + preview URLs                                        | Pricing climbs steeply past Hobby; cold starts on serverless                                |
| shadcn/ui (owned components)                          | Full customisation of indicators, dialogs, winner card                   | More initial setup than MUI; we own the components forever                                  |
| Magic-link auth (no password, no OAuth)               | Lowest-friction onboarding, no password reset flow to build              | Email deliverability is now on the critical path — Supabase handles it but worth flagging   |
| DB-level enforcement of vote ceiling + closed lockdown| Stale tabs and direct API calls cannot bypass invariants                 | Constraints/triggers are harder to debug than app code; needs explicit concurrency tests    |
| `is_organizer` boolean on `users`                     | Simplest possible designation, no extra table                            | Doesn't scale to multi-team; requires a one-off SQL update to crown the first organizer     |
| Tally revalidation (not realtime)                     | No websocket infra; matches spec literally                               | Two members at the same screen at the same instant will not see each other's votes appear   |
| Manual close (no scheduled job)                       | No cron, no Vercel-cron config, simpler infra                            | If the organizer forgets, the closing_date is just a hint                                   |
| Bundled S5 (cast + change + withdraw in one Story)    | One ticket, one PR, one set of tests for one table                       | Less granular tracking on the board — explicitly chosen during /jira                        |

---

## 8. Consequences

  - **Future deletion of Supabase is expensive.** RLS policies and the magic-link callback are tightly coupled. A migration off Supabase would be a rewrite, not a swap. Acceptable for a demo MVP.
  - **The DB constraints are load-bearing.** Tests in AIEX-810, AIEX-822, and AIEX-830 must verify the constraints fire under concurrency. If a future migration weakens any of them, the server-side guardrails silently regress to app-layer-only.
  - **The team-managed Jira workflow has no `In Review`.** `/develop done` will skip the In Review transition; tickets will go directly from `In Progress` to `Done` once `/review` passes. Cached in `.claude/config/jira-board.json#transitions`.
  - **Realtime upgrade is cheap if needed.** Swap the tally render path to subscribe to a Supabase channel; the rest of the data model needs no changes.
