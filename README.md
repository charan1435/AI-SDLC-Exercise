# Team Reading List Vote

A small reading group runs a monthly vote to pick a book. Propose/decide steps drag out across Slack threads, the running tally encourages bandwagoning, and there is no enforced ceiling on how many votes a member casts. This tool fixes that: the organizer opens and closes a round, members propose books and cast up to three votes (max one per book), and every rule is enforced server-side so stale tabs and direct API pokes cannot bypass the guardrails.

**Demo:** https://[your-vercel-url].vercel.app/

---

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui (Poppins + JetBrains Mono)
- Supabase (PostgreSQL + Auth — magic-link, no passwords)
- Vercel (hosting)
- GitHub Actions (CI/CD)

---

## Run locally in under 5 minutes

### Prerequisites

- Node 18+ and npm
- A free Supabase account at https://supabase.com

### 1. Clone and install

```bash
git clone <repo-url>
cd reading-list-vote
npm install
```

### 2. Create a Supabase project

1. Sign in at https://supabase.com and click **New project**.
2. Choose a name, region, and database password. Wait for provisioning (~1 min).

### 3. Apply migrations

Open the **SQL Editor** in your Supabase dashboard and run each file below in order. Copy-paste the full contents of each file and click **Run**.

1. `supabase/migrations/001_users.sql` — creates `public.users` table + trigger that auto-creates a `public.users` row for every new sign-in via `auth.users`. RLS enabled.
2. `supabase/migrations/002_rounds.sql` — creates `public.rounds` table + partial unique index (one open round at a time). RLS enabled.
3. `supabase/migrations/003_proposals.sql` — creates `public.proposals` table. RLS allows INSERT only when the parent round is open. RLS enabled.
4. `supabase/migrations/004_votes.sql` — creates `public.votes` table + `UNIQUE (proposal_id, voter_id)` constraint + `enforce_vote_ceiling` trigger (3-vote ceiling, race-safe via `SELECT FOR UPDATE`). RLS enabled.
5. `supabase/migrations/005_tally.sql` — creates `round_tally(round_id)` SQL function used by the tally query. No table; no RLS change.

### 4. Configure Supabase Auth URLs

In your Supabase dashboard, go to **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:3000` (dev) or `https://[your-vercel-url].vercel.app` (prod) |
| **Redirect URLs** | Add `http://localhost:3000/auth/callback` for dev and `https://[your-vercel-url].vercel.app/auth/callback` for prod |

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the three required values. Find them in the Supabase dashboard under **Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → `anon` / `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API keys → `service_role` |

The test vars (`SUPABASE_TEST_*`) are only needed to run the DB and E2E test suites against a separate test project. Leave them blank for a basic local run.

### 6. Start the dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Crown the organizer

After your first sign-in (which auto-creates your `public.users` row via the trigger in `001_users.sql`), run this one-line SQL in the Supabase SQL Editor:

```sql
UPDATE public.users SET is_organizer = true WHERE email = 'organizer@yourdomain.com';
```

Reload `/` — you will now see the **Open a round** CTA.

Only one organizer is needed per deployment. To promote a backup organizer, run the same SQL for their email address.

---

## How to demo

This scenario reproduces the spec's happy-path deterministically. You need **three distinct email inboxes** (magic-link sign-in requires clicking a real link in each inbox).

| Role | Suggested email |
|------|----------------|
| Organizer | organizer@yourdomain.com |
| Member A | member-a@yourdomain.com |
| Member B | member-b@yourdomain.com |

### Step 1 — Organizer opens a round

1. Sign in as **organizer@yourdomain.com**.
2. From the home page, click **Open a round**.
3. Enter title: `June 2026`, closing date: one week from today.
4. Click **Open round**. You land on `/rounds/[id]` — the round is live.

### Step 2 — Members propose books

1. Open a new browser tab (or incognito). Sign in as **member-a@yourdomain.com**.
2. Propose book 1: title `Tomorrow, and Tomorrow, and Tomorrow`, author `Gabrielle Zevin`, reason `Two friends, often in love but never lovers.`
3. Propose book 2: title `Klara and the Sun`, author `Kazuo Ishiguro`, reason `An artificial friend observes a fragile family from the shop window.`
4. Open a third tab. Sign in as **member-b@yourdomain.com**.
5. Propose book 3: title `Piranesi`, author `Susanna Clarke`, reason `A labyrinth at the edge of the world.`

### Step 3 — Members vote

1. As **member-a**: cast 1 vote on **Tomorrow, and Tomorrow, and Tomorrow**, 1 vote on **Piranesi**. Votes remaining pill shows 1/3.
2. As **member-b**: cast 1 vote on **Tomorrow, and Tomorrow, and Tomorrow**, 1 vote on **Klara and the Sun**, 1 vote on **Piranesi**. Votes remaining pill shows 0/3 and turns deep lime.
3. Both members can see the live tally update after each action (revalidated by server action).

Final tally before close:
- Tomorrow, and Tomorrow, and Tomorrow — 2 votes
- Klara and the Sun — 1 vote
- Piranesi — 2 votes

### Step 4 — Organizer closes the round

1. Switch back to the **organizer** tab and reload `/rounds/[id]`.
2. Click the sticky **Close round** button at the bottom of the page.
3. Review the mini-tally preview in the dialog. Click **Close round** to confirm.

**Expected result:** Tomorrow, and Tomorrow, and Tomorrow wins by tie-break (same vote count as Piranesi but proposed earlier). The WinnerCard animates in on `/rounds/[id]`.

### Step 5 — Verify the closed state

- The round is now read-only: no vote toggles, no propose form.
- The WinnerCard shows the title, author, proposer name, vote count, and how many members voted.

---

## Failure scenarios

These reproduce the three server-side guardrails. No special setup needed beyond having an open round with at least one proposal.

### Scenario A — 4th vote attempt

| | |
|--|--|
| **Setup** | Sign in as any member. Cast 3 votes on 3 different proposals. |
| **Action** | Try to vote on a 4th proposal (or use the API: `POST /api/votes` with a new `proposal_id`). |
| **Expected message** | `You have used all 3 votes — withdraw one to vote again.` |

The ceiling is enforced by the `enforce_vote_ceiling` DB trigger using `SELECT FOR UPDATE`. Even two simultaneous requests cannot both succeed past 3.

### Scenario B — Duplicate vote on the same book

| | |
|--|--|
| **Setup** | Sign in as any member. Vote for one proposal. |
| **Action** | Send a second `POST /api/votes` for the same `proposal_id` (direct API call, bypassing the toggled UI). |
| **Expected message** | `You already voted for this book.` |

Enforced by the `UNIQUE (proposal_id, voter_id)` DB constraint.

### Scenario C — Vote on a closed round (stale tab)

| | |
|--|--|
| **Setup** | Open `/rounds/[id]` in one tab. In another tab (as organizer), close the round. |
| **Action** | In the first (now-stale) tab, attempt to vote via the API: `POST /api/votes`. |
| **Expected message** | `This round is closed.` |

Enforced by the RLS INSERT policy on `votes` which joins to `rounds.status = 'open'`. The UI hiding the vote toggle is cosmetic only; the server rejects the write regardless.

---

## Data model

| Table | Key columns | References |
|-------|------------|------------|
| `public.users` | `id` (PK, FK auth.users), `email`, `display_name`, `is_organizer` bool | — |
| `public.rounds` | `id` PK, `title`, `closing_date`, `status` ('open'\|'closed'), `winner_proposal_id` FK, `created_by` FK | users |
| `public.proposals` | `id` PK, `round_id` FK, `title`, `author`, `reason`, `proposer_id` FK | rounds, users |
| `public.votes` | `id` PK, `proposal_id` FK, `voter_id` FK, `round_id` FK (denormalised for ceiling check) | proposals, users, rounds |

Migration files (apply in this order):

1. `supabase/migrations/001_users.sql`
2. `supabase/migrations/002_rounds.sql`
3. `supabase/migrations/003_proposals.sql`
4. `supabase/migrations/004_votes.sql`
5. `supabase/migrations/005_tally.sql`

---

## Voting rules

- **At most 3 votes per voter per round.** Enforced by the `enforce_vote_ceiling` BEFORE INSERT trigger on `votes`. Uses `SELECT FOR UPDATE` to serialize concurrent inserts — the race condition described in risk R1 is covered by a concurrency test in `src/__tests__/db/vote-ceiling-concurrent.test.ts` (AIEX-810).
- **At most 1 vote per (proposal, voter).** Enforced by a `UNIQUE (proposal_id, voter_id)` constraint on `votes`. The DB raises error code `23505` on a second insert for the same pair.
- **Writes (vote and proposal inserts) only allowed while `round.status = 'open'`.** Enforced by RLS predicates on `votes` (INSERT, DELETE) and `proposals` (INSERT) that join to `rounds.status`. This is server-side enforcement — closing a round in a second tab immediately locks out stale tabs, regardless of what the UI shows.

---

## How a round closes

The organizer clicks **Close round** and confirms in the dialog. The server action `closeRound()` in `src/lib/actions/rounds.ts`:

1. Verifies the caller's `is_organizer` flag via the session.
2. Calls `round_tally(round_id)` — a SQL function that returns proposals sorted by `vote_count DESC, created_at ASC`.
3. Takes the first row as the winner (tie-break: **earliest `proposals.created_at`**).
4. Updates `rounds.status = 'closed'` and `rounds.winner_proposal_id = <winner id>` in a single transaction.

The winner is **persisted at close time**, not recomputed on read. Historical results are stable even if data is later modified at the DB level.

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Next.js dev server at http://localhost:3000 |
| `npm run build` | Production build (type-checks + compiles) |
| `npm run start` | Start production build (run `build` first) |
| `npm run lint` | ESLint — must pass before deploy |
| `npm run typecheck` | TypeScript `tsc --noEmit` — must pass before deploy |
| `npm test` | Vitest — unit + component tests (137 tests, no env vars needed) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |
| `npm run test:db` | DB integration tests (requires `SUPABASE_TEST_*` env vars — see below) |
| `npm run test:e2e` | Playwright E2E tests (requires `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_TEST_*` env vars) |

---

## Testing

| Layer | Tests | Run command | Env vars required |
|-------|------:|-------------|-------------------|
| Unit (validators, actions) | 53 | `npm test` | None |
| Component (RTL + jsdom) | 87 | `npm test` | None |
| DB integration (RLS, ceiling, concurrency) | 17 | `npm run test:db` | `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY` |
| E2E (Playwright, Chromium) | 24 | `npm run test:e2e` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY` |
| **Total** | **181** | | |

To unblock DB and E2E tests, create a **separate** Supabase test project (to keep test data isolated from production), apply the same 5 migrations to it, then add the test project's URL and keys to `.env.test.local` using the `SUPABASE_TEST_*` variable names from `.env.example`.

Before running E2E tests, install the Playwright browser:

```bash
npx playwright install --with-deps chromium
```

---

## Project structure

```
.
├── e2e/                          # Playwright E2E specs (6 files, 24 tests)
├── src/
│   ├── app/                      # Next.js App Router pages + API routes
│   │   ├── api/                  # Route Handlers (rounds, proposals, votes)
│   │   ├── auth/callback/        # Magic-link token exchange
│   │   ├── rounds/[id]/          # Round detail page (open + closed states)
│   │   ├── rounds/new/           # Organizer "open round" form
│   │   └── signin/               # Magic-link sign-in form
│   ├── components/
│   │   ├── features/             # Domain components (auth, rounds, proposals, votes, common)
│   │   ├── layout/               # AppHeader, ProfileMenu, PageShell
│   │   └── ui/                   # Restyled shadcn/ui primitives
│   └── lib/
│       ├── actions/              # Server actions (rounds, proposals, votes, auth)
│       ├── auth/                 # Session helpers + getAppUser()
│       ├── queries/              # Server-component query helpers
│       ├── supabase/             # Supabase clients (server, browser, admin, middleware)
│       └── types.ts              # Shared types + ERROR_MESSAGES constants
├── supabase/
│   └── migrations/               # 5 SQL migration files (apply in order)
├── .env.example                  # Copy to .env.local and fill in
├── middleware.ts                 # Auth gate — redirects unauthenticated users to /signin
└── ADR.md                        # Architecture Decision Record
```

---

## Deployment to Vercel

1. **Connect the repo** — import the repository in the Vercel dashboard.
2. **Set environment variables** in Vercel project settings → Environment Variables:

   | Variable | Type | Notes |
   |----------|------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Public (all envs) | Safe for browser |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (all envs) | Safe for browser |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret (server-only) | Never expose client-side |

   The `SUPABASE_TEST_*` vars are for CI only — do not set them in the Vercel production environment.

3. **First push to `master`** triggers an automatic build and deploy.
4. **Update Supabase Auth URL Configuration** — once you have the Vercel deployment URL, add it to Supabase:
   - Site URL: `https://[your-vercel-url].vercel.app`
   - Redirect URLs: `https://[your-vercel-url].vercel.app/auth/callback`
5. **Smoke-test the deployment** — visit the Vercel URL, sign in via magic link, confirm the `public.users` row is created, and verify the organizer CTA appears after the SQL update.

---

## Jira / SDLC artifacts

- **Jira board:** https://emblaftdev.atlassian.net/jira/software/projects/AIEX/boards
- **Epic:** AIEX-797 — Team Reading List Vote — Round Lifecycle MVP
- **Commit convention:** `AIEX-###:Type/short description` (enforced by pre-commit hook)
  - Examples: `AIEX-828:Feature/add POST /api/votes with DB-level 3-vote ceiling`, `AIEX-810:Task/add vote-ceiling concurrency test`
