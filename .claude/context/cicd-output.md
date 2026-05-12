# CI/CD Output
generated: 2026-05-12
command:   /cicd

## Files generated

  - `.github/workflows/ci.yml`               — lint, typecheck, unit+component tests, DB invariant tests, e2e tests, build (triggered on push to `master`/`develop` and on PR to `master`)
  - `.github/workflows/preview.yml`          — Vercel preview deploy + PR comment with URL (triggered on PR to `master`)
  - `.github/workflows/deploy.yml`           — production deploy: `supabase db push` migrations + Vercel `--prod` (triggered on push to `master`)
  - `.github/pull_request_template.md`       — Jira-linked PR template aligned to AIEX board + project security checklist

## Adjustments from the /cicd template

  - **Default branch is `master`, not `main`.** All workflow triggers + PR target branches use `master`. (Some teams use `main`; ours doesn't.)
  - **Jira project is `AIEX` on `emblaftdev.atlassian.net`** — PR template hard-codes those instead of the template's `PROJ` / `embla.atlassian.net`.
  - **Test job uses `SUPABASE_TEST_*` secrets, not production secrets.** The /cicd template's `ci.yml` originally pointed `NEXT_PUBLIC_SUPABASE_URL` at production secrets even for the test job. Changed: test job env reads from the `SUPABASE_TEST_*` triplet so DB + e2e tests don't touch the production project. The build job still reads production secrets (that's correct — build embeds them).
  - **DB + e2e tests are gated on `env.SUPABASE_TEST_URL != ''`** — they skip cleanly if the secret isn't set. This matches the qa-output.md "blocked tests" state today and unblocks automatically once secrets are added.
  - **Playwright runs Chromium only** — keeps CI minutes manageable.
  - **Coverage report uploaded as artifact** — visible per-run from the Actions tab.

## Required GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret name                          | Used by                  | Where to get it                                                       |
|--------------------------------------|--------------------------|-----------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`           | ci.yml (build), preview, deploy | Supabase Dashboard → Project Settings → API → Project URL (production project) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | ci.yml (build), preview, deploy | Supabase Dashboard → Project Settings → API → `anon` `public` key (production)  |
| `SUPABASE_TEST_URL`                  | ci.yml (test job)        | Project URL of a SEPARATE Supabase test project (do not reuse production) |
| `SUPABASE_TEST_ANON_KEY`             | ci.yml (test job)        | `anon` key of the test project                                         |
| `SUPABASE_TEST_SERVICE_ROLE_KEY`     | ci.yml (test job)        | `service_role` key of the test project (used by Playwright fixtures to seed users) |
| `SUPABASE_ACCESS_TOKEN`              | deploy.yml               | Supabase Dashboard → Account → Access Tokens → Generate new           |
| `SUPABASE_DB_PASSWORD`               | deploy.yml               | Supabase Dashboard → Project Settings → Database → Connection string (the password portion) |
| `VERCEL_TOKEN`                       | preview.yml, deploy.yml  | Vercel Dashboard → Settings → Tokens → Create                          |
| `VERCEL_ORG_ID`                      | preview.yml, deploy.yml  | Run `vercel link` locally, then `.vercel/project.json` → `orgId`        |
| `VERCEL_PROJECT_ID`                  | preview.yml, deploy.yml  | Same `.vercel/project.json` → `projectId`                              |

## Manual setup steps (one-time, BEFORE first push to master triggers the workflows)

  1. **Create a TEST Supabase project** — separate from production. Apply the same 5 migrations from `supabase/migrations/` via the SQL Editor. This unblocks the DB + e2e tests in CI.
  2. **Link the deploy workflow's Supabase project** — locally run `npx supabase login`, then `npx supabase link --project-ref <your-production-project-ref>`. This creates `supabase/config.toml` with the linked project (already committed to the repo or needs to be added — verify on first run).
  3. **Create a Vercel project** — `npx vercel link` in the repo root. Pick "Link to existing project" if you've manually created one, or "Create new project". This writes `.vercel/project.json` with the IDs you need for the `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets. Note: `.vercel/` is in `.gitignore` by default and should stay there.
  4. **Add the 10 secrets above to GitHub** (Settings → Secrets and variables → Actions).
  5. **Push a test PR** to verify all three workflows trigger and pass.

## Known gaps / follow-ups

  - **`supabase link` is a one-time manual step** — there's no CI bootstrap that runs it. If the first `deploy.yml` run fails with "project not linked", run `supabase link` locally and commit the resulting `supabase/config.toml`.
  - **No automated Jira comment-on-deploy** — the /cicd template description mentioned it but the YAML doesn't implement it. Out of scope for this MVP; can be added with a small `actions/github-script` step + the Atlassian REST API + a `JIRA_API_TOKEN` secret if needed.
  - **No environment matrix** — workflows assume Node 20 only. Adequate for this project.
  - **No status-checks branch protection** — set this up manually in GitHub Settings → Branches → Branch protection rules → require `Lint and Type Check`, `Tests`, `Build` to pass before merge to `master`.
  - **Vercel auto-deploy from GitHub integration** — if you connect Vercel directly to the repo (not just via the GitHub Action), Vercel will also auto-deploy on push. That's an alternative to the `deploy.yml` workflow above. Pick one to avoid duplicate deployments.

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
