---
description: Generate GitHub Actions CI/CD workflow files (ci.yml, preview.yml, deploy.yml) and PR template
argument-hint: "(no arguments — reads develop-output.md)"
allowed-tools: Read, Write, Glob
---

# /cicd — Generate GitHub Actions CI/CD Pipeline

You are the CI/CD phase.
Your job is to generate all GitHub Actions workflow files.
You do NOT write application code.

---

## Step 1 — Read prior context
Use the Read tool to load:
  .claude/context/plan-output.md
  .claude/context/develop-output.md
  .claude/context/backend-output.md

If develop-output.md does not exist:
  Print: "⚠️  Run /develop first."
  Stop.

---

## Step 2 — Generate CI workflow
Write to .github/workflows/ci.yml

This runs on every push and every PR to main:
  - Install dependencies
  - Run ESLint
  - Run TypeScript type check
  - Run Jest unit and component tests
  - Run Playwright e2e tests
  - Build the application
  - Upload test coverage report

---

## Step 3 — Generate Preview Deploy workflow
Write to .github/workflows/preview.yml

This runs on every PR:
  - Runs after CI passes
  - Deploys preview to Vercel
  - Posts preview URL as PR comment

---

## Step 4 — Generate Production Deploy workflow
Write to .github/workflows/deploy.yml

This runs on merge to main only:
  - Only starts if CI passes
  - Runs Supabase migrations
  - Deploys to Vercel production
  - Posts deployment URL to relevant Jira ticket

---

## Step 5 — Generate PR template
Write to .github/pull_request_template.md

---

## Exact file contents to generate:

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npx tsc --noEmit

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run unit and component tests
        run: npm run test -- --coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run e2e tests
        run: npm run test:e2e

      - name: Upload e2e artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
```

### .github/workflows/preview.yml
```yaml
name: Preview Deploy

on:
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    name: Deploy Preview to Vercel
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        id: vercel-preview
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: ${{ steps.vercel-preview.outputs.preview-url }}'
            })
```

### .github/workflows/deploy.yml
```yaml
name: Production Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

### .github/pull_request_template.md
```markdown
## Jira Ticket
<!-- Required: link this PR to its Jira ticket -->
Ticket: PROJ-[number]
Link: https://embla.atlassian.net/browse/PROJ-[number]

## What this PR does
<!-- Describe the change clearly -->

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Tests
- [ ] CI/CD / config

## Checklist
- [ ] Jira ticket ID in every commit message
- [ ] Tests written for new code
- [ ] No .env files committed
- [ ] No hardcoded secrets or API keys
- [ ] RLS policies updated if schema changed
- [ ] .env.example updated if new env vars added
- [ ] Runs locally without errors
- [ ] UI matches design reference (if frontend change)
- [ ] All CI checks passing
```

---

## Step 6 — Write context output file
Save to .claude/context/cicd-output.md

---HANDOFF---
agent:     cicd
completed: ci.yml + preview.yml + deploy.yml + PR template
next:      Run /review for self-review and QA pass
---END---

---

## Step 7 — Tell the user

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /cicd complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated:
  .github/workflows/ci.yml
  .github/workflows/preview.yml
  .github/workflows/deploy.yml
  .github/pull_request_template.md

Required GitHub Secrets to set:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_ACCESS_TOKEN
  SUPABASE_DB_PASSWORD
  VERCEL_TOKEN
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID

Handing off to /commit. Next phase after that: /review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
