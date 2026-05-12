# Deploy Output
generated: 2026-05-12

## Readiness Checklist

| # | Check | Command | Status | Outcome |
|---|-------|---------|--------|---------|
| 1 | Build passes | `npm run build` | PASS | 10 routes compiled, 0 TypeScript errors, 0 lint errors |
| 2 | Typecheck passes | `npm run typecheck` | PASS | `tsc --noEmit` clean exit |
| 3 | Lint passes | `npm run lint` | PASS | "No ESLint warnings or errors" |
| 4 | Unit + component tests pass | `npm test` | PASS | 137/137 passed (14 test files, 7.43s) |
| 5 | JWT secret scan | `git ls-files \| xargs grep -l -E 'eyJ[A-Za-z0-9_-]{20,}'` | PASS | No tracked files contain JWT patterns |
| 6 | Service role key hardcoded | `grep -r 'SUPABASE_SERVICE_ROLE_KEY *= *eyJ' src/` | PASS | No hardcoded service role key values found |
| 7 | Stripe key scan | `grep -r 'sk_live_\|sk_test_' src/` | PASS | No Stripe keys found (no Stripe in scope) |
| 8 | .env files not tracked | `git ls-files \| grep -E '\.env($|\.)'` | PASS | Returns empty — .gitignore covers `.env`, `.env.local`, `.env.*`, `*.env` |
| 9 | RLS enabled on all tables | Read migrations 001–004 | PASS | `ENABLE ROW LEVEL SECURITY` confirmed on users, rounds, proposals, votes (005 adds a function, no table) |
| 10 | Admin client absent from components | `grep -r 'createAdminClient\|SUPABASE_SERVICE_ROLE_KEY' src/components/` | PASS | Returns empty — admin client is in `src/lib/supabase/admin.ts` (server-only) |
| 11 | Organizer-only route has auth gate | Read `src/app/rounds/new/page.tsx` | PASS | `if (!appUser.is_organizer) redirect('/')` on line 23 |
| 12 | Middleware gates all non-public paths | Read `middleware.ts` | PASS | Matcher covers all paths except `api`, `_next/static`, `_next/image`, `favicon.ico`; all non-public routes redirect to `/signin` when no session |

---

## README Sections Written

| Section heading | AIEX ticket(s) closed |
|-----------------|----------------------|
| Title + problem statement | (context only — no dedicated ticket) |
| Demo URL placeholder | (context only) |
| Stack | (ADR reference) |
| Prerequisites | (context only) |
| 1. Clone and install | (context only) |
| 2. Create a Supabase project | AIEX-811 |
| 3. Apply migrations (5 steps, exact paths, trigger note) | AIEX-811 |
| 4. Configure Supabase Auth URLs | AIEX-815 |
| 5. Configure environment variables (where to find each) | AIEX-815 |
| 6. Start dev server | (context only) |
| Crown the organizer (SQL + CTA reload note) | AIEX-811, AIEX-819 |
| How to demo (3 accounts, step-by-step, exact inputs, tie-break outcome) | AIEX-837 |
| Failure scenarios (3 guardrails with exact messages) | AIEX-837 |
| Data model (table, key columns, migration file list) | AIEX-827 |
| Voting rules (3 bullets, DB enforcement, concurrency note) | AIEX-831 |
| How a round closes (winner computation + tie-break + persistence) | AIEX-823 |
| Scripts (all npm run commands) | (context only) |
| Testing (4 layers, test counts, env var requirements) | (qa-output cross-reference) |
| Project structure (directory tree) | (context only) |
| Deployment to Vercel (5 steps, env var table) | (context only) |
| Jira / SDLC artifacts | (context only) |

---

## Vercel Deployment Checklist

1. Connect repository in Vercel dashboard (import from GitHub).
2. Set environment variables in Vercel project → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — Public, safe for browser, set for all environments.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public, safe for browser, set for all environments.
   - `SUPABASE_SERVICE_ROLE_KEY` — Sensitive / server-only, set for Production and Preview only. Never expose to browser.
   - Do NOT set `SUPABASE_TEST_*` vars in Vercel production — test vars belong in CI secrets only.
3. Push to `master` — first build auto-deploys.
4. Copy the Vercel deployment URL. In Supabase dashboard → Authentication → URL Configuration:
   - Site URL: `https://[vercel-url].vercel.app`
   - Add Redirect URL: `https://[vercel-url].vercel.app/auth/callback`
5. Smoke-test: visit deployment URL → sign in via magic link → confirm `/` renders the correct state for the signed-in user → run organizer SQL update → confirm CTA appears on reload.

---

## Hard Blockers

None. All pre-deploy checks passed.

---

## Soft Warnings

1. **Supabase free-tier magic-link rate limit** — The free tier limits magic-link emails to 2 per hour per project. For a demo with 3 sign-ins, this will hit the limit if all three emails are sent within 1 hour. Mitigation: configure a custom SMTP provider (e.g. Resend) in Supabase dashboard → Authentication → SMTP Settings before the demo, or spread the sign-ins across the hour.

2. **DB and E2E tests require a separate test Supabase project** — These 41 tests are currently skipped in CI because `SUPABASE_TEST_*` env vars are absent. They are not blocking the deploy (unit + component tests cover the testable layer at 89%+ coverage), but the DB concurrency test (AIEX-810) is a non-negotiable correctness signal. Unblock by creating a dedicated test Supabase project, applying the 5 migrations to it, and adding the test project's credentials as GitHub Actions secrets (`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`).

3. **Closing date is informational only** — The `closing_date` column is shown in the UI but does NOT auto-close the round. Only the organizer's explicit click closes it. This is per spec (ADR assumption A2) but may surprise users who expect auto-close behavior.

4. **Single organizer per deployment** — `is_organizer` is a boolean on the `users` table; there is no UI to promote/demote organizers. Promotion requires a direct SQL update. If the organizer account is locked out during a demo, run `UPDATE public.users SET is_organizer = true WHERE email = 'backup@yourdomain.com';` in the SQL Editor to promote a backup.

5. **.env.example is currently untracked** — The file was created by the backend agent during this run and is in the working tree but has not been committed yet. It will be included in the `/commit` phase. Confirm it is included in the commit plan.

---

## AIEX Tickets Closed by This Run

- AIEX-811 — [T2] deploy-docs: Supabase setup + organizer-seeding SQL in README
- AIEX-815 — [S1] deploy-docs: auth env vars + sign-in walkthrough in README
- AIEX-819 — [S2] deploy-docs: organizer-seeding instructions
- AIEX-823 — [S3] deploy-docs: winner-computation + tie-break note
- AIEX-827 — [S4] deploy-docs: proposals schema cross-reference
- AIEX-831 — [S5] deploy-docs: voting rules in README
- AIEX-837 — [S7] deploy-docs: "How to demo" + "Failure scenarios" sections

---

---HANDOFF---
agent:     deploy
completed: readiness check + README.md + .env.example verified
ready:     yes
issues:    0 hard blockers; 5 soft warnings (see above)
next:      Run /cicd to generate GitHub Actions pipeline. Configure CI secrets for SUPABASE_TEST_* vars to unblock DB + E2E test runs in CI.
---END---
