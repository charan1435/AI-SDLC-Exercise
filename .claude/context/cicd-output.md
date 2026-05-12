# CI/CD Output
generated: 2026-05-12
command:   /cicd

## Files generated

  - `.github/workflows/ci.yml`               — lint, typecheck, unit+component tests, DB invariant tests, e2e tests, build (triggered on push to `master`/`develop` and on PR to `master`)
  - `.github/pull_request_template.md`       — Jira-linked PR template aligned to AIEX board + project security checklist

## Post-/cicd cleanup (simplification adopted)

  Originally `/cicd` also generated `.github/workflows/preview.yml` and `.github/workflows/deploy.yml`. **These were deleted** after setting up Vercel's native GitHub integration, because they duplicated what Vercel already does:
    - Vercel native integration auto-creates **preview deployments on every PR** (replaces `preview.yml`).
    - Vercel native integration **auto-deploys `master` to production** on every push (replaces `deploy.yml`).
  Keeping both would have produced **double-deployments** for the same commit on every push. Net result of the cleanup: CI runs in GitHub Actions; CD runs in Vercel; no duplicate work.

  Migrations are applied **manually via the Supabase SQL Editor** for the 5 existing migrations. If schema changes become frequent, re-introduce a minimal `deploy.yml` containing only the `npx supabase db push` step (no Vercel deploy step) and add `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` as GitHub secrets.

## Adjustments from the /cicd template

  - **Default branch is `master`, not `main`.** All workflow triggers + PR target branches use `master`. (Some teams use `main`; ours doesn't.)
  - **Jira project is `AIEX` on `emblaftdev.atlassian.net`** — PR template hard-codes those instead of the template's `PROJ` / `embla.atlassian.net`.
  - **Test job uses `SUPABASE_TEST_*` secrets, not production secrets.** The /cicd template's `ci.yml` originally pointed `NEXT_PUBLIC_SUPABASE_URL` at production secrets even for the test job. Changed: test job env reads from the `SUPABASE_TEST_*` triplet so DB + e2e tests don't touch the production project. The build job still reads production secrets (that's correct — build embeds them).
  - **DB + e2e tests are gated on `env.SUPABASE_TEST_URL != ''`** — they skip cleanly if the secret isn't set. This matches the qa-output.md "blocked tests" state today and unblocks automatically once secrets are added.
  - **Playwright runs Chromium only** — keeps CI minutes manageable.
  - **Coverage report uploaded as artifact** — visible per-run from the Actions tab.

## Required GitHub Secrets (Settings → Secrets and variables → Actions)

After the post-/cicd cleanup, only `ci.yml` remains. The secret list shrinks to **2 required + 3 optional** (the rest were for the deleted deploy/preview workflows).

| Tier | Secret name                          | Used by                  | Required? | Where to get it                                                       |
|------|--------------------------------------|--------------------------|-----------|-----------------------------------------------------------------------|
| 1    | `NEXT_PUBLIC_SUPABASE_URL`           | ci.yml (build job)       | ✅ Yes    | Supabase Dashboard → Project Settings → API → Project URL (production project) |
| 1    | `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | ci.yml (build job)       | ✅ Yes    | Supabase Dashboard → Project Settings → API → `anon` `public` key (production)  |
| 2    | `SUPABASE_TEST_URL`                  | ci.yml (test:db, test:e2e) | ⚪ Optional | Project URL of a SEPARATE Supabase test project — only needed to unblock 41 skipped tests in CI |
| 2    | `SUPABASE_TEST_ANON_KEY`             | ci.yml (test:db, test:e2e) | ⚪ Optional | `anon` key of the test project                                         |
| 2    | `SUPABASE_TEST_SERVICE_ROLE_KEY`     | ci.yml (test:db, test:e2e) | ⚪ Optional | `service_role` key of the test project (used by Playwright fixtures)   |

Vercel deploys (preview + production) are handled by **Vercel's native GitHub integration**, not GitHub Actions. Configure those via Vercel Dashboard → Project Settings → Git, plus the env vars (Supabase URL + anon key) in Vercel Dashboard → Project Settings → Environment Variables. No GitHub Vercel secrets are needed.

## Manual setup steps (one-time)

  1. **Add the 2 required GitHub secrets** — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your production Supabase project (Settings → Secrets and variables → Actions → New repository secret).
  2. **Set the same 2 vars in Vercel** — Vercel Dashboard → Project Settings → Environment Variables. Already done as part of the "Import from GitHub" flow.
  3. **Configure Supabase Auth URL** — Supabase Dashboard → Authentication → URL Configuration. Set Site URL = your Vercel production URL; add `https://<vercel-url>/auth/callback` to Redirect URLs.
  4. **Apply migrations to production Supabase** — manually paste each of the 5 SQL files from `supabase/migrations/` into the Supabase SQL Editor and Run. (Or use `supabase db push` locally if you've linked the CLI.)
  5. **Push to master** — Vercel auto-deploys; GitHub Actions runs `ci.yml`; both should go green.
  6. **(Optional, later)** create a TEST Supabase project + add the 3 `SUPABASE_TEST_*` secrets to unblock DB + e2e tests in CI.

## Known gaps / follow-ups

  - **Auto-applied migrations on deploy** — currently manual. If schema changes become frequent, add a minimal `deploy.yml` with just the `npx supabase db push` step + `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` secrets (skip the Vercel deploy step — Vercel native handles that).
  - **No automated Jira comment-on-deploy** — out of scope for this MVP; can be added later via a small `actions/github-script` step + the Atlassian REST API + a `JIRA_API_TOKEN` secret.
  - **No environment matrix** — `ci.yml` assumes Node 20 only. Adequate for this project.
  - **No status-checks branch protection** — set this up manually in GitHub Settings → Branches → Branch protection rules → require `Lint and Type Check`, `Tests`, `Build` to pass before merge to `master`.

## Tickets touched

`/cicd` does not have dedicated Jira tickets in the AIEX hierarchy — CI/CD is infrastructure that supports the whole Epic. Attribute commits to **AIEX-797** (the Epic).

## Jira transitions

None this phase. Tickets stay where /develop left them (In Progress on AIEX, since the workflow has no `In Review` column).

---HANDOFF---
agent:     cicd
completed: ci.yml + preview.yml + deploy.yml + PR template + cicd-output.md
files:     4 new files under `.github/`
secrets:   10 GitHub Actions secrets need to be set before workflows can run successfully (5 are gating, 5 are deploy-only)
issues:    DB + e2e tests will skip until SUPABASE_TEST_URL is set; production deploy requires one-time `supabase link` for db push to target the right project
next:      Run /review for code-quality + security pass; review should also flag any test failures or hard-blocking issues before /demo
---END---
