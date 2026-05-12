---
description: Self-review pass — code quality, security, performance. Auto-fixes CRITICAL security issues.
argument-hint: "(no arguments — reads develop-output.md and source)"
allowed-tools: Read, Write, Glob, Grep
---

# /review — Self-Review, Security, Performance

You are the REVIEW ORCHESTRATOR.
You delegate all the actual inspection to the `reviewer` subagent
(defined in `.claude/agents/reviewer.md`). You stay LEAN — read the
final report only.

---

## Step 1 — Verify prior context

Use the Read tool to confirm these exist:
  .claude/context/develop-output.md
  .claude/context/backend-output.md
  .claude/context/frontend-output.md
  .claude/context/qa-output.md

If any are missing, print which and which command to run, then stop.

---

## Step 2 — Spawn the reviewer subagent

Call the Agent tool with:
  - description: "Multi-pass code review"
  - subagent_type: "reviewer"
  - prompt: |
      Run all three review passes (code-quality, security, performance)
      on the source produced during /develop.

      Required reading:
        - .claude/context/develop-output.md
        - .claude/context/backend-output.md
        - .claude/context/frontend-output.md
        - .claude/context/qa-output.md
        - Glob across /src and /supabase as needed

      Auto-fix CRITICAL security issues with the Edit tool.
      Report all other findings in `.claude/context/review-output.md`
      following the format in your agent definition.

After the Agent call returns, confirm `.claude/context/review-output.md` exists.

---

## Step 2.5 — Jira: transition your tickets based on review outcome

Per `.claude/lib/core/jira-policy.md`. The transition depends on
review findings:

  - **Pass (no HIGH or CRITICAL findings):** transition every owned
    Story / Task → `Done`. Sub-tasks of those Stories also → `Done`.
  - **Fail (HIGH or CRITICAL findings remain after CRITICAL auto-fix):**
    transition every owned Story / Task back to `In Progress` and
    flag the failed tickets in the summary banner. Do NOT transition
    anything to `Done` in this case.

Procedure:

  1. Read `.claude/context/review-output.md`. Determine pass/fail
     from the HIGH and CRITICAL counts (after auto-fix).
  2. Read `.claude/config/jira-board.json` for
     `assignee.account_id` and either `transitions["Done"]` or
     `transitions["In Progress"]` depending on outcome. Discover and
     cache via `getTransitionsForJiraIssue` if null.
  3. Collect Story/Task keys from `.claude/context/jira-output.md`.
     For each:
       - `getJiraIssue`, ownership-check (skip with refusal line if
         not owned by current user).
       - Skip-if-already-target.
       - Otherwise `transitionJiraIssue` to the chosen target.
  4. If pass: collect Sub-task keys, repeat the same checks, transition
     to `Done`.
  5. Print one line per transition:
     `→ <KEY>: <prev> → Done` (or `→ In Progress`).
  6. Print summary:
     - Pass:  `Jira: <N> tickets closed (Done). <S> skipped (not owned).`
     - Fail:  `Jira: <N> tickets reopened to In Progress. <S> skipped (not owned). Fix HIGH/CRITICAL findings then re-run /review.`

If the workflow has no `Done` transition (rare), leave tickets at
`In Review` and print one warning line.

---

## Step 3 — Surface the summary

Use the Read tool on `.claude/context/review-output.md`. Extract the counts
from the top sections (Code Quality, Security, Performance) and print:

"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /review complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Code quality:  [N issues / clean]
Security:      [N issues / clean]
  CRITICAL: [count — auto-fixed]
  HIGH:     [count]
  MEDIUM:   [count]
Performance:   [N issues / clean]

Full report: .claude/context/review-output.md

[If issues exist:]
⚠️  Review the issues above before deploying.
    CRITICAL issues have been auto-fixed.

Handing off to /commit. Next phase after that: /demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
