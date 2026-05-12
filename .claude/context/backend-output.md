# Backend Output
generated: 2026-05-12
agent:     backend
tickets:   AIEX-798, AIEX-807, AIEX-799, AIEX-809, AIEX-811, AIEX-812, AIEX-816, AIEX-820, AIEX-824, AIEX-828, AIEX-832

## Build verification

`npm install` — SUCCESS (403 packages, no fatal errors, deprecation warnings only)
`npm run build` — SUCCESS (9 routes, 0 TypeScript errors, 0 lint errors)
`npm run typecheck` — SUCCESS (clean exit)

## Files created

### Project scaffolding (AIEX-798, AIEX-807)
- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `.eslintrc.json`
- `.env.example`
- `middleware.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/signin/page.tsx`

### Supabase clients (AIEX-812)
- `src/lib/supabase/server.ts`      — createServerClient() using @supabase/ssr + next/headers cookies
- `src/lib/supabase/middleware.ts`  — createMiddlewareClient() for middleware.ts
- `src/lib/supabase/admin.ts`       — createAdminClient() using SERVICE_ROLE key (server-only)
- `src/lib/auth/session.ts`         — getSession() and getUser() helpers

### Types (all tickets)
- `src/lib/types.ts`                — User, Round, Proposal, Vote, ProposalWithTally, RoundDetail, ApiResponse, ERROR_MESSAGES

### Migrations (AIEX-799, AIEX-809, AIEX-811)
- `supabase/migrations/001_users.sql`
- `supabase/migrations/002_rounds.sql`
- `supabase/migrations/003_proposals.sql`
- `supabase/migrations/004_votes.sql`
- `supabase/migrations/005_tally.sql`

### API Routes (AIEX-812, AIEX-816, AIEX-820, AIEX-824, AIEX-828)
- `src/app/auth/callback/route.ts`
- `src/app/api/rounds/route.ts`
- `src/app/api/rounds/[id]/close/route.ts`
- `src/app/api/proposals/route.ts`
- `src/app/api/votes/route.ts`

### Server actions (AIEX-816, AIEX-820, AIEX-824, AIEX-828)
- `src/lib/actions/rounds.ts`
- `src/lib/actions/proposals.ts`
- `src/lib/actions/votes.ts`

### Query helpers (AIEX-832)
- `src/lib/queries/rounds.ts`
- `src/lib/queries/tally.ts`

---

## Schema

### Tables created

**public.users**
- id uuid PK (FK auth.users)
- email text NOT NULL
- display_name text NOT NULL DEFAULT ''
- is_organizer boolean NOT NULL DEFAULT false
- created_at timestamptz
- updated_at timestamptz (auto-updated by trigger)

**public.rounds**
- id uuid PK DEFAULT gen_random_uuid()
- title text (1–100 chars) NOT NULL
- closing_date date NOT NULL (informational only — no auto-close)
- status text CHECK IN ('open','closed') DEFAULT 'open'
- winner_proposal_id uuid NULL FK proposals.id (deferred FK, set at close time)
- created_by uuid FK users.id
- created_at timestamptz
- updated_at timestamptz (auto-updated by trigger)

**public.proposals**
- id uuid PK DEFAULT gen_random_uuid()
- round_id uuid FK rounds.id ON DELETE CASCADE
- title text (1–200 chars) NOT NULL
- author text (1–100 chars) NOT NULL
- reason text NULL (≤500 chars)
- proposer_id uuid FK users.id
- created_at timestamptz
- updated_at timestamptz (auto-updated by trigger)

**public.votes**
- id uuid PK DEFAULT gen_random_uuid()
- proposal_id uuid FK proposals.id ON DELETE CASCADE
- voter_id uuid FK users.id
- round_id uuid FK rounds.id ON DELETE CASCADE (denormalised for ceiling check)
- created_at timestamptz
- UNIQUE (proposal_id, voter_id)

### Constraints
- `rounds_single_open_idx` — UNIQUE partial index on rounds(status) WHERE status='open'
  Raises PostgreSQL error 23505 on second open round insert.
- `votes_unique_proposal_voter` — UNIQUE (proposal_id, voter_id) on votes
  Raises PostgreSQL error 23505 on duplicate vote.
- `votes_before_insert_ceiling` — BEFORE INSERT trigger on votes using SELECT FOR UPDATE
  Raises PostgreSQL error P0001 with message "You have used all 3 votes — withdraw one to vote again."
  when voter already has 3 votes in the round. Uses FOR UPDATE to serialize concurrent inserts.

### RLS policies

| Table     | Operation | Policy predicate |
|-----------|-----------|-----------------|
| users     | SELECT    | auth.role() = 'authenticated' |
| users     | UPDATE    | auth.uid() = id |
| users     | INSERT    | auth.role() = 'service_role' (trigger uses SECURITY DEFINER) |
| rounds    | SELECT    | auth.role() = 'authenticated' |
| rounds    | INSERT    | users.is_organizer = true WHERE users.id = auth.uid() |
| rounds    | UPDATE    | users.is_organizer = true WHERE users.id = auth.uid() |
| proposals | SELECT    | auth.role() = 'authenticated' |
| proposals | INSERT    | auth.role() = 'authenticated' AND (SELECT status FROM rounds WHERE id = round_id) = 'open' |
| votes     | SELECT    | auth.role() = 'authenticated' |
| votes     | INSERT    | voter_id = auth.uid() AND (SELECT status FROM rounds WHERE id = round_id) = 'open' |
| votes     | DELETE    | voter_id = auth.uid() AND (SELECT status FROM rounds WHERE id = round_id) = 'open' |

### SQL functions
- `public.round_tally(round_id uuid)` — returns TABLE(proposal_id uuid, vote_count bigint)
  Marked STABLE, SECURITY DEFINER. Sorted by vote_count DESC, created_at ASC (tie-break built in).
  Granted EXECUTE to authenticated role.
- `public.set_updated_at()` — trigger function for updated_at columns
- `public.handle_new_user()` — SECURITY DEFINER trigger on auth.users INSERT; creates public.users row
- `public.enforce_vote_ceiling()` — BEFORE INSERT trigger on votes; raises P0001 on 4th vote attempt

### Migrations
- `supabase/migrations/001_users.sql`
- `supabase/migrations/002_rounds.sql`
- `supabase/migrations/003_proposals.sql`
- `supabase/migrations/004_votes.sql`
- `supabase/migrations/005_tally.sql`

### Organizer seeding (AIEX-811)
After the first sign-in, run this in the Supabase SQL editor:
```sql
UPDATE public.users SET is_organizer = true WHERE email = 'your@email.com';
```

---

## API Routes

### GET/POST /auth/callback
- Method: GET
- Path: /auth/callback?code=<string>
- Auth: transient (pre-session)
- Input: query param `code` (Supabase magic-link code), optional `next` param
- Output: redirect to `/` on success, redirect to `/signin?error=invalid_link` on failure
- Ticket: AIEX-812

### POST /api/rounds
- Method: POST
- Path: /api/rounds
- Auth: required (organizer only via RLS)
- Input body: `{ title: string (1–100), closing_date: string (YYYY-MM-DD) }`
- Output 201: `{ data: Round, error: null }`
- Output 400: `{ data: null, error: { message: "Title is required" | "closing_date must be..." } }`
- Output 401: `{ data: null, error: { message: "You must be signed in." } }`
- Output 403: `{ data: null, error: { message: "You are not authorised to perform this action." } }`
- Output 409: `{ data: null, error: { message: "A round is already open — close it first.", code: "ROUND_ALREADY_OPEN" } }`
- Output 500: `{ data: null, error: { message: <postgres error message> } }`
- Ticket: AIEX-816

### PATCH /api/rounds/[id]/close
- Method: PATCH
- Path: /api/rounds/:id/close
- Auth: required (organizer only via RLS)
- Input: none (round ID from URL)
- Output 200: `{ data: Round, error: null }` (round.status='closed', round.winner_proposal_id set)
- Output 401: `{ data: null, error: { message: "You must be signed in." } }`
- Output 403: `{ data: null, error: { message: "You are not authorised to perform this action." } }`
- Output 404: `{ data: null, error: { message: "Round not found." } }`
- Output 409: `{ data: null, error: { message: "This round is closed." } }`
- Output 500: `{ data: null, error: { message: ... } }`
- Ticket: AIEX-820

### POST /api/proposals
- Method: POST
- Path: /api/proposals
- Auth: required (any authenticated member)
- Input body: `{ round_id: uuid, title: string (1–200), author: string (1–100), reason?: string (≤500) }`
- Output 201: `{ data: Proposal, error: null }`
- Output 400: `{ data: null, error: { message: "Title is required" | "Author is required" | ... } }`
- Output 401: `{ data: null, error: { message: "You must be signed in." } }`
- Output 403: `{ data: null, error: { message: "This round is closed.", code: "ROUND_CLOSED" } }`
- Output 404: `{ data: null, error: { message: "Round not found." } }`
- Output 500: `{ data: null, error: { message: ... } }`
- Ticket: AIEX-824
- Note: proposer_id is ALWAYS server-derived from session — never trusted from body

### POST /api/votes
- Method: POST
- Path: /api/votes
- Auth: required
- Input body: `{ proposal_id: uuid }`
- Output 201: `{ data: Vote, error: null }`
- Output 400: `{ data: null, error: { message: "proposal_id must be a valid UUID" } }`
- Output 401: `{ data: null, error: { message: "You must be signed in." } }`
- Output 403: `{ data: null, error: { message: "This round is closed.", code: "ROUND_CLOSED" } }`
- Output 404: `{ data: null, error: { message: "Proposal not found." } }`
- Output 409: `{ data: null, error: { message: "You already voted for this book.", code: "DUPLICATE_VOTE" } }`
- Output 422: `{ data: null, error: { message: "You have used all 3 votes — withdraw one to vote again.", code: "VOTE_CEILING" } }`
- Output 500: `{ data: null, error: { message: ... } }`
- Ticket: AIEX-828
- Note: voter_id and round_id are server-derived — never trusted from body

### DELETE /api/votes
- Method: DELETE
- Path: /api/votes
- Auth: required
- Input body: `{ proposal_id: uuid }`
- Output 200: `{ data: null, error: null }`
- Output 400: `{ data: null, error: { message: "proposal_id must be a valid UUID" } }`
- Output 401: `{ data: null, error: { message: "You must be signed in." } }`
- Output 403: `{ data: null, error: { message: "This round is closed.", code: "ROUND_CLOSED" } }`
- Output 404: `{ data: null, error: { message: "Proposal not found." } }`
- Output 500: `{ data: null, error: { message: ... } }`
- Ticket: AIEX-828

---

## Server Actions (importable by frontend components)

All actions in `src/lib/actions/`:

| Action | File | Mirrors | Returns |
|--------|------|---------|---------|
| `openRound({ title, closing_date })` | rounds.ts | POST /api/rounds | ActionResult\<Round\> |
| `closeRound({ round_id })` | rounds.ts | PATCH /api/rounds/[id]/close | ActionResult\<Round\> |
| `addProposal({ round_id, title, author, reason? })` | proposals.ts | POST /api/proposals | ActionResult\<Proposal\> |
| `castVote({ proposal_id })` | votes.ts | POST /api/votes | ActionResult\<Vote\> |
| `withdrawVote({ proposal_id })` | votes.ts | DELETE /api/votes | ActionResult\<null\> |

All actions call `revalidatePath('/rounds/' + round_id)` and `revalidatePath('/')` on success.

`ActionResult<T>` shape: `{ data: T | null, error: { message: string; code?: string } | null }`

---

## Query Helpers (importable by server components)

| Helper | File | Returns |
|--------|------|---------|
| `getCurrentOpenRound()` | queries/rounds.ts | `Round \| null` |
| `getRoundById(id)` | queries/rounds.ts | `Round \| null` |
| `getRoundWithProposalsAndTally(round_id)` | queries/tally.ts | `RoundDetail \| null` |

`RoundDetail` shape:
```typescript
{
  round: Round,
  proposals: ProposalWithTally[],  // sorted by created_at ASC (slot 01, 02, 03...)
  winner: ProposalWithTally | null, // non-null only when round.status === 'closed'
  my_vote_count: number             // votes cast by current user in this round
}
```

`ProposalWithTally` adds to `Proposal`:
- `vote_count: number`
- `my_vote_id: string | null` (vote row id if current user has voted, null otherwise)
- `proposer_display_name: string`

---

## Zod Schemas

| Schema | Location | Fields |
|--------|----------|--------|
| `CreateRoundSchema` | api/rounds/route.ts + actions/rounds.ts | title (1–100), closing_date (YYYY-MM-DD regex) |
| `OpenRoundSchema` | actions/rounds.ts | same as above |
| `CloseRoundSchema` | actions/rounds.ts | round_id (uuid) |
| `CreateProposalSchema` | api/proposals/route.ts + actions/proposals.ts | round_id (uuid), title (1–200), author (1–100), reason? (≤500) |
| `AddProposalSchema` | actions/proposals.ts | same as above |
| `VoteSchema` | api/votes/route.ts + actions/votes.ts | proposal_id (uuid) |

---

## Error Message Constants (exact strings for toast mapping)

From `src/lib/types.ts#ERROR_MESSAGES` — frontend must map these 1-to-1 to toast copy:

| Code | Message string | HTTP status |
|------|---------------|-------------|
| `VOTE_CEILING` | "You have used all 3 votes — withdraw one to vote again." | 422 |
| `DUPLICATE_VOTE` | "You already voted for this book." | 409 |
| `ROUND_CLOSED` | "This round is closed." | 403 |
| `PROPOSAL_NOT_FOUND` | "Proposal not found." | 404 |
| `ROUND_ALREADY_OPEN` | "A round is already open — close it first." | 409 |
| `ROUND_NOT_FOUND` | "Round not found." | 404 |
| `UNAUTHORIZED` | "You are not authorised to perform this action." | 403 |
| `UNAUTHENTICATED` | "You must be signed in." | 401 |

The `code` field in the error object (when present) gives the frontend a stable key to check without string-matching — use `error.code === 'VOTE_CEILING'` etc.

---

## Env Vars Required

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL (safe for browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Supabase anon/public key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (server-only) | Admin client for RLS-bypass operations (NEVER expose to browser) |

Copy `.env.example` to `.env.local` and fill in values from the Supabase project dashboard.

---

## Contract for Frontend

Routes the frontend agent must call:

1. **Auth:** `GET /auth/callback?code=...` — handled automatically via magic-link redirect. No fetch call needed.
2. **Open round:** Use server action `openRound()` from `@/lib/actions/rounds` (or POST /api/rounds).
3. **Close round:** Use server action `closeRound()` from `@/lib/actions/rounds` (or PATCH /api/rounds/[id]/close).
4. **Propose book:** Use server action `addProposal()` from `@/lib/actions/proposals` (or POST /api/proposals).
5. **Cast vote:** Use server action `castVote()` from `@/lib/actions/votes` (or POST /api/votes).
6. **Withdraw vote:** Use server action `withdrawVote()` from `@/lib/actions/votes` (or DELETE /api/votes).
7. **Read data:** Use query helpers `getRoundWithProposalsAndTally()` and `getCurrentOpenRound()` directly in server components — no fetch call needed.

The frontend does NOT need to pass `proposer_id`, `voter_id`, or `round_id` (except round_id for proposals) — server derives them from session.

All form errors come back as `{ data: null, error: { message: string, code?: string } }`.
Map `error.message` to the toast copy directly (messages are already user-facing).
Map `error.code` for conditional UI logic (e.g. disabling the vote toggle after VOTE_CEILING).

---

---HANDOFF---
agent:     backend
completed: schema + RLS + API routes + server actions + query helpers + project scaffolding
tickets:   AIEX-798, AIEX-807, AIEX-799, AIEX-809, AIEX-811, AIEX-812, AIEX-816, AIEX-820, AIEX-824, AIEX-828, AIEX-832
build:     PASSED — npm run build clean, npm run typecheck clean
routes:    5 (auth/callback, api/rounds POST, api/rounds/[id]/close PATCH, api/proposals POST, api/votes POST+DELETE)
tables:    4 (users, rounds, proposals, votes)
actions:   5 (openRound, closeRound, addProposal, castVote, withdrawVote)
next:      Frontend subagent should consume routes/actions/queries listed above. Install shadcn/ui + Poppins + JetBrains Mono fonts, then build components per ux-output.md. The stubs at src/app/page.tsx and src/app/signin/page.tsx are ready to be replaced. src/app/layout.tsx stub is ready for Poppins + design tokens.
---END---
