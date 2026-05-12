---
description: Sequential build pipeline — spawns backend, frontend, qa, deploy subagents via the Agent tool
argument-hint: "(no arguments — reads all prior phase outputs)"
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /develop — Sequential Build Pipeline Orchestrator

You are the BUILD ORCHESTRATOR.
You coordinate specialized subagents. You do NOT write code directly.
Keep your context lean — read summary files only, not full source code.

The actual implementation work happens inside isolated subagents you spawn
via the **Agent tool**. Each subagent has its own context window, so the main
session stays small.

---

## Step 1 — Verify all prior context exists

Use the Read tool to load each of these and confirm they exist:
  .claude/context/plan-output.md
  .claude/context/jira-output.md
  .claude/context/adr-output.md
  .claude/context/ux-output.md

If any are missing, print which ones are missing and which command to run.
Stop the pipeline if any are missing.

---

## Step 2 — Identify activated optional modules

From plan-output.md, extract the activated modules list. The matching
reference files live at:

  payments    → .claude/lib/optional/payments.md
  state-mgmt  → .claude/lib/optional/state-mgmt.md
  realtime    → .claude/lib/optional/realtime.md
  file-upload → .claude/lib/optional/file-upload.md
  email       → .claude/lib/optional/email.md
  auth-social → .claude/lib/optional/auth-social.md

You will pass the list of activated module paths to each subagent so it can
read them itself.

---

## Step 3 — Announce the pipeline

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting /develop pipeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:     [one line summary from plan-output]
Stack:    [stack from adr-output]
Modules:  [activated optional modules]
Screens:  [count from ux-output]

Pipeline (sequential, each subagent runs in its own context):
  1. backend  subagent → schema + API routes
  2. frontend subagent → pages + components
  3. qa       subagent → tests
  4. deploy   subagent → readiness check

Starting now...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

---

## Step 4 — Spawn subagents sequentially via the Agent tool

For each phase, invoke the Agent tool with **subagent_type matching the
subagent name** (`backend`, `frontend`, `qa`, `deploy` — these are defined
in `.claude/agents/`). After each call, verify the expected output file
exists before moving on.

### Phase 4a — Backend

Call Agent with:
  - description: "Build backend schema + API routes"
  - subagent_type: "backend"
  - prompt: |
      Build the backend layer for this project.

      Required reading (Read tool, in order):
        - .claude/context/plan-output.md
        - .claude/context/adr-output.md
        - .claude/context/jira-output.md  (for commit ticket IDs)
      Activated optional modules (also read these if present):
        [list the .claude/lib/optional/*.md paths from Step 2]

      Deliverables (per your agent definition):
        - Supabase migrations under /supabase/migrations/
        - Next.js API routes under /src/app/api/
        - Zod schemas
        - Write .claude/context/backend-output.md with the contract block
          and ---HANDOFF--- footer

      Stay strictly within backend scope. Do NOT touch frontend or test files.

After the Agent call returns, confirm `.claude/context/backend-output.md`
exists. If not, stop and surface the failure. Do not proceed.

### Phase 4b — Frontend

Call Agent with:
  - description: "Build frontend pages + components"
  - subagent_type: "frontend"
  - prompt: |
      Build the frontend layer for this project.

      FIRST STEP — invoke the `frontend-design` skill via the Skill tool
      before reading anything or writing any code:
        Skill(skill="frontend-design:frontend-design")
      This is mandatory. It loads production-grade design principles that
      must govern every component, page, and styling decision. Generic
      shadcn defaults are NOT acceptable on their own.

      Required reading (Read tool, after the skill is loaded):
        - .claude/context/ux-output.md
        - .claude/context/backend-output.md  (consume only routes listed here)
      Activated optional modules:
        [list activated .claude/lib/optional/*.md paths]

      Reference screenshots live at .claude/screenshots/reference/ — list
      that directory; if files exist and ux-output says use_reference: true,
      match them visually. The frontend-design principles still apply on
      top of visual matching.

      Deliverables:
        - Pages under /src/app/
        - Components under /src/components/features/
        - Write .claude/context/frontend-output.md with ---HANDOFF--- footer

      Run `npm run dev` when ready; the PostToolUse hook will auto-capture
      and compare screenshots against the reference set.

After the Agent call returns, confirm `.claude/context/frontend-output.md` exists.

### Phase 4c — QA

Call Agent with:
  - description: "Write unit + component + e2e tests"
  - subagent_type: "qa"
  - prompt: |
      Write tests for the project just built.

      Required reading:
        - .claude/context/backend-output.md
        - .claude/context/frontend-output.md

      Deliverables:
        - Unit tests under /src/__tests__/unit/
        - Component tests under /src/__tests__/components/
        - Playwright e2e tests under /e2e/
        - RLS isolation test (user A cannot read user B's data)
        - Write .claude/context/qa-output.md with ---HANDOFF--- footer

      Coverage target: 70% minimum on new code.

After the Agent call returns, confirm `.claude/context/qa-output.md` exists.

### Phase 4d — Deploy

Call Agent with:
  - description: "Verify deployment readiness"
  - subagent_type: "deploy"
  - prompt: |
      Run the pre-deploy readiness check.

      Required reading:
        - .claude/context/backend-output.md
        - .claude/context/qa-output.md

      Deliverables:
        - Updated README.md (5-minute clone-to-run instructions)
        - Updated .env.example (all required vars, no real values)
        - Write .claude/context/deploy-output.md with the checklist and
          ---HANDOFF--- footer

      Flag any blocker loudly. Do NOT proceed past failed RLS / secrets /
      tests.

---

## Step 5 — Write master summary

Use the Read tool on backend-output.md, frontend-output.md, qa-output.md,
and deploy-output.md. Use the Write tool to produce
.claude/context/develop-output.md with this format:

---
# Develop Output
generated: [timestamp]

## Backend
[copy schema/routes/env-vars summary]

## Frontend
[copy pages/components summary]

## QA
[copy coverage + passing status]

## Deploy
[copy readiness checklist]

---HANDOFF---
agent:     develop (orchestrator)
completed: backend + frontend + qa + deploy phases
next:      Run /cicd to generate GitHub Actions workflows
---END---
---

---

## Step 6 — Tell the user

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /develop complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:   ✅ [N tables, N routes]
Frontend:  ✅ [N pages, N components]
QA:        ✅ [N tests, X% coverage]
Deploy:    [✅ ready / ⚠️ issues found]

Screenshots: .claude/screenshots/feedback/current-state/

Handing off to /commit. Next phase after that: /cicd
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
