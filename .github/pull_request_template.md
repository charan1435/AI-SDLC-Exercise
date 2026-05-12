## Jira Ticket
<!-- Required: link this PR to its Jira ticket on the AIEX board -->
Ticket: AIEX-[number]
Link: https://emblaftdev.atlassian.net/browse/AIEX-[number]

## What this PR does
<!-- Describe the change clearly. Reference the Story/Task and any spec scenarios it implements. -->

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Tests
- [ ] CI/CD / config
- [ ] Docs

## Checklist
- [ ] Every commit message uses the `AIEX-###:Type/short description` convention
- [ ] Tests written for new code (Vitest unit/component, Playwright e2e, or DB invariant test as applicable)
- [ ] No `.env*` files committed
- [ ] No hardcoded secrets, API keys, or service-role keys in source
- [ ] RLS policies updated if the schema changed (every table must have RLS enabled)
- [ ] DB constraints + RLS predicates cover the closed-round lockdown and vote-ceiling invariants
- [ ] `.env.example` updated if new env vars added
- [ ] `npm run build` and `npm test` pass locally
- [ ] UI matches `.claude/screenshots/reference/styles.md` design tokens (if frontend change)
- [ ] All CI checks passing (lint, typecheck, tests, build)

## Demo / verification steps
<!-- For feature PRs: list the manual steps a reviewer can take to verify the change. -->

## Screenshots
<!-- For UI changes: paste before/after screenshots or link to a Vercel preview deploy. -->
