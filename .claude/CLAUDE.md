# General Purpose AI SDLC Orchestrator

## Purpose
This project-level Claude Code configuration drives the full SDLC for ANY web
application project. It reads specs, decides the stack, activates optional
modules, and orchestrates specialized subagents sequentially.
Human triggers each phase. Subagents do the actual work.

---

## Core Stack (always used)
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Vercel (deployment)
- GitHub Actions (CI/CD)
- Jira (planning via MCP)

---

## Optional Modules
Activated automatically by /plan based on spec signals.
Only load what the spec requires.

| Signal in spec                              | Module activated                    |
|---------------------------------------------|-------------------------------------|
| payment, checkout, purchase, subscription   | .claude/lib/optional/payments.md    |
| cart, wishlist, multi-step, wizard          | .claude/lib/optional/state-mgmt.md  |
| live, real-time, notifications, chat        | .claude/lib/optional/realtime.md    |
| upload, image, file, attachment, avatar     | .claude/lib/optional/file-upload.md |
| email, confirmation, notification, invite   | .claude/lib/optional/email.md       |
| Google login, OAuth, social login, GitHub   | .claude/lib/optional/auth-social.md |

---

## Directory Layout
```
.claude/
├── CLAUDE.md                  ← this file (project instructions)
├── settings.json              ← Claude Code harness config (hooks, permissions)
├── config/
│   └── orchestrator.json      ← project-specific config (read by hooks/commands)
├── commands/                  ← slash commands (one .md per phase)
├── agents/                    ← real Claude Code subagents (backend, frontend, qa, deploy)
├── lib/
│   ├── core/                  ← reference docs read by commands (planning, architecture)
│   └── optional/              ← optional-module reference docs
├── hooks/
│   ├── pre/                   ← PreToolUse bash scripts
│   └── post/                  ← PostToolUse + Stop bash scripts
├── context/                   ← phase output files (handoff between commands)
└── screenshots/
    ├── reference/             ← user-provided design targets
    └── feedback/              ← capture + diff output from build pipeline
```

---

## Orchestrator Rules
- Main orchestrator (a slash command) stays LEAN — it coordinates, it does not implement
- Each phase is triggered by the human typing a slash command
- /develop and /review spawn real subagents via the Agent tool. Each subagent
  loads ONLY its own .claude/agents/<name>.md instructions plus the minimum
  context files it needs — this protects the main session's context window
- Subagents write output to .claude/context/[name]-output.md
- Next phase reads the previous output file, not the full codebase
- All pipelines run SEQUENTIALLY — wait for output before next step

---

## Context Files (handover between commands)
All context lives in .claude/context/
  plan-output.md       written by /plan
  jira-output.md       written by /jira
  adr-output.md        written by /adr
  ux-output.md         written by /ux
  backend-output.md    written by backend subagent in /develop
  frontend-output.md   written by frontend subagent in /develop
  qa-output.md         written by QA subagent in /develop
  deploy-output.md     written by deploy subagent in /develop
  develop-output.md    master summary written by /develop orchestrator
  cicd-output.md       written by /cicd
  review-output.md     written by /review

---

## Visual Feedback Loop
After every UI page is built:
1. Screenshot the running app (PostToolUse hook on `npm run dev`/`npm run build`)
2. Compare vs .claude/screenshots/reference/ (if exists)
3. List visual differences
4. Fix differences
5. Screenshot again
6. Repeat max 3 iterations per page
7. Save final to .claude/screenshots/feedback/current-state/
8. Save iteration history to .claude/screenshots/feedback/iterations/

---

## Commit Convention
Format: `<JIRA-ID>:<Type>/<short description>`
  - `<JIRA-ID>` — the Jira ticket assigned to YOU (the human committer).
    The committer subagent must look this up via MCP Jira (issue type +
    summary) before proposing a message.
  - `<Type>` — one of: `Feature`, `Bugfix`, `Hotfix`, `Chore`, `Refactor`,
    `Docs`, `Test`, `Task`.
  - No space after the colon. The slash is literal. Spaces are allowed in
    the description tail.

Jira issue type → commit `<Type>` mapping (used by the committer agent):
  Story  / Epic      → Feature
  Bug                → Bugfix
  Task               → Task
  Subtask            → inherit parent's Type (fallback: Task)
  Hotfix label       → Hotfix
  Anything else      → Chore

Pre-hook (PreToolUse on `git commit*`) enforces the regex:
  `^[A-Z][A-Z0-9]+-[0-9]+:(Feature|Bugfix|Hotfix|Chore|Refactor|Docs|Test|Task)/.+`

Examples:
  PROJ-1:Chore/initial project setup
  PROJ-4:Feature/add products table migration
  PROJ-7:Feature/implement cart drawer component
  PROJ-9:Bugfix/fix checkout total rounding
  PROJ-14:Test/add checkout e2e coverage

---

## Commit Policy (PROJECT-WIDE — APPLIES TO EVERY AGENT)

**No subagent and no main command may stage, commit, push, or run any
state-changing git command on its own.** All git state changes go through
the `/commit` slash command, which requires explicit user confirmation
before staging and a second confirmation before pushing.

Forbidden tool invocations from any subagent or command (other than /commit itself):
  - `git add` (including `-A`, `-p`, `-u`)
  - `git commit` (including `--amend`, `--no-verify`)
  - `git push` (any form)
  - `git stash`, `git rebase`, `git reset`, `git restore`, `git checkout`
  - Any `gh pr *` or `gh release *` command
  - Any MCP github/bitbucket tool that writes (`create_*`, `push_*`, `merge_*`, `update_*`)

Allowed read-only inspection from any subagent:
  - `git status`, `git diff`, `git log`, `git ls-files`, `git remote -v`

After every main phase (`/plan`, `/jira`, `/adr`, `/ux`, `/develop`,
`/cicd`, `/review`, `/demo`) the orchestrator MUST invoke
`Skill(skill="commit")` as its final action before printing the
completion banner. The `/commit` flow will:

  1. Show `git status` and `git diff --stat` for every change.
  2. Spawn the `committer` subagent to produce a proposed commit plan
     (logical groupings + `<JIRA-ID>:<Type>/<description>` messages).
  3. Use AskUserQuestion to confirm the commit plan (yes / edit messages /
     subset / cancel).
  4. Stage and commit per the approved plan.
  5. Use AskUserQuestion to confirm push (current branch / new branch /
     skip) AND which remote (github / bitbucket / both).
  6. Push only after the user has explicitly answered "yes".

The user is the only entity authorised to advance from "code in working
tree" to "commit on remote". This is non-negotiable.

---

## Security Rules (enforced by hooks + permissions)
NEVER commit   : .env .env.local .env.production .env.*
NEVER hardcode : API keys, passwords, tokens, secrets
NEVER expose   : Supabase service role key client-side
NEVER read     : .env files directly — use .env.example only

Enforcement:
- `.claude/settings.json` `permissions.deny` blocks Read/Edit/Write on .env*
- `secret-scan.sh` runs as PreToolUse on Write/Edit (catches inline secrets)
- `env-guard.sh` runs as PreToolUse on Write/Edit (catches .env edits)
- `secret-scan.sh` also runs on `git commit*` and `git add*` (catches staged secrets)

---

## Subagent Handoff Format
Every subagent ends its work with this block written to its output file:

---HANDOFF---
agent:      [which agent produced this]
completed:  [what was done]
contract:   [routes / schema / components / tests — summaries only]
modules:    [optional modules that were applied]
issues:     [anything the next agent needs to watch out for]
next:       [what the next agent needs to know]
---END---

---

## Available Commands
/plan     → read spec, identify app type, activate modules, produce plan
/jira     → decompose plan into Epic + Stories + Tasks in Jira
/adr      → generate ADR.md with stack decisions and trade-offs
/ux       → wireframes, prompt for reference screenshots and CSS
/develop  → spawn backend → frontend → QA → deploy subagents via Agent tool
/cicd     → generate GitHub Actions workflows
/review   → spawn code-quality, security, performance review subagents
/demo     → generate demo script and talking points
/commit   → finalize step: spawn committer subagent for a commit plan, confirm
            with the user, commit + optionally push
            (`<JIRA-ID>:<Type>/<description>` prefix enforced by hook).
            Recommended after every main phase that leaves uncommitted
            changes or unpushed commits.
