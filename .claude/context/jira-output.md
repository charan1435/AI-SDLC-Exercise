# Jira Output
generated: 2026-05-12
site:      https://emblaftdev.atlassian.net
project:   AIEX (AISDLC Exercise) — team-managed / simplified
epic:      AIEX-797
assignee:  Saicharan Gnanapiragasam (accountId: 712020:fae1d817-7deb-41a9-8904-3132ae879c24)
backlog:   all 41 issues in backlog (no Sprint field set)
workflow:  3-column (To Do → In Progress → Done) — no In Review column on this project

## Epic
- **AIEX-797**: Team Reading List Vote — Round Lifecycle MVP — type: Epic → commit Type: **Feature**

## Tasks
- **AIEX-798**: T1: Project scaffolding (Next.js 14 + Supabase + Tailwind/shadcn) — type: Task → commit Type: **Task** (parent: AIEX-797)
- **AIEX-799**: T2: Database schema + RLS (users / rounds / proposals / votes) — type: Task → commit Type: **Task** (parent: AIEX-797)

## Stories
- **AIEX-800**: S1: Magic-link sign-in + signed-in shell — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-801**: S2: Organizer opens a voting round — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-802**: S3: Organizer closes a round + winner computation w/ tie-break — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-803**: S4: Member proposes a book — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-804**: S5: Member casts / changes / withdraws votes (3-vote ceiling, 1-per-book) — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-805**: S6: Live tally visible to members on the open round — type: Story → commit Type: **Feature** (parent: AIEX-797)
- **AIEX-806**: S7: Empty/error-state polish + votes-remaining + winner card — type: Story → commit Type: **Feature** (parent: AIEX-797)

## Sub-tasks
(commit `<Type>` inherits parent: Task-parent → `Task`, Story-parent → `Feature`)

### Under T1 (AIEX-798) — Project scaffolding
- **AIEX-807**: [T1] implementation: scaffold Next.js 14 + Tailwind + shadcn/ui + Supabase clients — commit Type: **Task**
- **AIEX-808**: [T1] tests: set up Vitest + RTL + Playwright skeletons — commit Type: **Task**

### Under T2 (AIEX-799) — DB schema + RLS
- **AIEX-809**: [T2] backend: Supabase migrations + RLS policies + DB constraints — commit Type: **Task**
- **AIEX-810**: [T2] tests: RLS isolation tests + vote-ceiling concurrency test — commit Type: **Task**
- **AIEX-811**: [T2] deploy-docs: Supabase setup + organizer-seeding SQL in README — commit Type: **Task**

### Under S1 (AIEX-800) — Sign-in
- **AIEX-812**: [S1] backend: Supabase Auth config + server session helper + middleware gate — commit Type: **Feature**
- **AIEX-813**: [S1] frontend: /signin page + callback route + signed-in shell layout — commit Type: **Feature**
- **AIEX-814**: [S1] tests: e2e auth happy path + middleware gating test — commit Type: **Feature**
- **AIEX-815**: [S1] deploy-docs: auth env vars + sign-in screenshot in README — commit Type: **Feature**

### Under S2 (AIEX-801) — Open round
- **AIEX-816**: [S2] backend: POST /api/rounds + organizer-only RLS + single-open invariant — commit Type: **Feature**
- **AIEX-817**: [S2] frontend: organizer "Open round" form (title + date picker) — commit Type: **Feature**
- **AIEX-818**: [S2] tests: organizer happy path + non-organizer 403 + duplicate-open rejection — commit Type: **Feature**
- **AIEX-819**: [S2] deploy-docs: organizer-seeding instructions in README — commit Type: **Feature**

### Under S3 (AIEX-802) — Close round + winner
- **AIEX-820**: [S3] backend: PATCH /api/rounds/[id]/close + tie-break + closed-round RLS — commit Type: **Feature**
- **AIEX-821**: [S3] frontend: "Close round" action + closed-round read-only view + winner card — commit Type: **Feature**
- **AIEX-822**: [S3] tests: tie-break unit + e2e close flow + RLS test (member action on closed) — commit Type: **Feature**
- **AIEX-823**: [S3] deploy-docs: winner-computation + tie-break note in README — commit Type: **Feature**

### Under S4 (AIEX-803) — Propose book
- **AIEX-824**: [S4] backend: POST /api/proposals + Zod schema + round-open RLS predicate — commit Type: **Feature**
- **AIEX-825**: [S4] frontend: propose form + proposals list with proposer name — commit Type: **Feature**
- **AIEX-826**: [S4] tests: validator + e2e propose-happy + RLS test (propose on closed) — commit Type: **Feature**
- **AIEX-827**: [S4] deploy-docs: cross-reference proposals schema in README — commit Type: **Feature**

### Under S5 (AIEX-804) — Cast / change / withdraw votes
- **AIEX-828**: [S5] backend: POST/DELETE /api/votes + DB ceiling + race-safe write — commit Type: **Feature**
- **AIEX-829**: [S5] frontend: vote toggle + "Votes remaining: X of 3" indicator + error toasts — commit Type: **Feature**
- **AIEX-830**: [S5] tests: ceiling+uniqueness unit + concurrency (R1) + e2e + RLS closed-round — commit Type: **Feature**
- **AIEX-831**: [S5] deploy-docs: vote-constraint notes in README (cross-ref T2) — commit Type: **Feature**

### Under S6 (AIEX-805) — Live tally
- **AIEX-832**: [S6] backend: per-proposal tally aggregate query — commit Type: **Feature**
- **AIEX-833**: [S6] frontend: render tally + revalidate-on-action wiring — commit Type: **Feature**
- **AIEX-834**: [S6] tests: aggregation unit + e2e tally-updates-after-vote — commit Type: **Feature**

### Under S7 (AIEX-806) — Polish
- **AIEX-835**: [S7] frontend: empty-states + winner card + indicator polish — commit Type: **Feature**
- **AIEX-836**: [S7] tests: component+e2e for each empty/error state + winner card — commit Type: **Feature**
- **AIEX-837**: [S7] deploy-docs: README "how to demo" section with spec scenarios — commit Type: **Feature**

## Bugs
None — no "Known Defects" section in plan-output.md.

## Plan-Feature → Jira-ID Map

The committer subagent uses this to pick the commit prefix per change. If a particular change should bind to a different ticket than the feature it touches, edit this table after /jira finishes.

| Plan Feature (verbatim from plan-output.md)                                                         | Jira-ID  | Commit Type |
|-----------------------------------------------------------------------------------------------------|----------|-------------|
| (project setup / Next.js + Supabase scaffolding)                                                    | AIEX-798 | Task        |
| (database schema, RLS, constraints, audit fields, single-open invariant, DB-level vote ceiling)     | AIEX-799 | Task        |
| Email-based authentication via Supabase Auth (magic link), gating all routes                        | AIEX-800 | Feature     |
| Two roles: member and organizer. Exactly one organizer per deployment                               | AIEX-800 / AIEX-801 | Feature |
| Organizer can open a new voting round with title and closing_date                                   | AIEX-801 | Feature     |
| System enforces: at most one round in status open at any time                                       | AIEX-801 / AIEX-799 | Feature / Task |
| Organizer can close round; winner = most votes, ties broken by earliest proposal time; read-only    | AIEX-802 | Feature     |
| Closed rounds are read-only end-to-end (server-enforced via RLS)                                    | AIEX-802 | Feature     |
| Winner is computed as proposal with most votes; ties broken by earliest proposal created_at         | AIEX-802 | Feature     |
| Members can propose books with title, author, reason                                                | AIEX-803 | Feature     |
| Members can cast up to 3 votes, max 1 per book (server-enforced)                                    | AIEX-804 | Feature     |
| Members can change or withdraw their votes while the round is open                                  | AIEX-804 | Feature     |
| Server-side guardrails: 4th-vote, double-vote, vote-on-closed, propose-on-closed, edit-after-votes  | AIEX-804 / AIEX-803 | Feature |
| Vote tallies visible to all signed-in members at all times (simple mode)                            | AIEX-805 | Feature     |
| Round detail page (title, closing date, status, proposals list, per-proposal tally, your-votes)     | AIEX-805 / AIEX-803 | Feature |
| "Votes remaining: X of 3" indicator                                                                 | AIEX-806 | Feature     |
| Winner announcement card on closed rounds                                                           | AIEX-806 / AIEX-802 | Feature |
| Empty/error-state UI for round-not-open, no-proposals-yet, not-signed-in, not-a-member              | AIEX-806 | Feature     |
| Audit fields on every table (created_at, updated_at, created_by)                                    | AIEX-799 | Task        |
| DB-level vote-ceiling and round-status constraints                                                  | AIEX-799 | Task        |

## Commit Convention Reminder

Format: `<JIRA-ID>:<Type>/<short description>`
(See `.claude/config/orchestrator.json` for the canonical mapping.)

Jira issue type → commit `<Type>`:
  Story / Epic       → Feature
  Bug                → Bugfix
  Task               → Task
  Sub-task / Subtask → inherit parent's Type (Task-parent → Task; Story-parent → Feature)
  Anything else      → Chore

Examples:
  AIEX-798:Task/scaffold Next.js 14 app with Tailwind + shadcn
  AIEX-799:Task/add users + rounds + proposals + votes migrations with RLS
  AIEX-812:Feature/wire Supabase Auth magic-link + session helper
  AIEX-820:Feature/implement PATCH /api/rounds/[id]/close with tie-break
  AIEX-828:Feature/add POST /api/votes with DB-level 3-vote ceiling
  AIEX-810:Task/add vote-ceiling concurrency test

## Notes for downstream phases

  - **No In Review column.** The AIEX workflow is To Do → In Progress → Done only. The standard phase transitions need this mapping:
      - `/develop start`  → `In Progress`  (transition id 21)
      - `/develop done`   → (skip — no In Review) — leave tickets In Progress until /review
      - `/review pass`    → `Done`         (transition id 31)
      - `/review fail`    → `In Progress`  (transition id 21)
      - `/demo complete`  → `Done`         (transition id 31) on the Epic
    Transition IDs are cached in `.claude/config/jira-board.json#transitions`.
  - **Team-managed project.** The Epic-link is the top-level `parent` field, NOT `customfield_10014`. Cached in `jira-board.json#fields.epic_link = "parent"`. The classic `customfield_10014` field is rejected by the create-issue screen on AIEX.
  - **Acceptance Criteria** are embedded in the description body (no separate AC custom field exposed on this project's create screen). `jira-board.json#fields.acceptance_criteria = null`.

---HANDOFF---
agent:     jira
completed: 41 created (1 Epic, 2 Tasks, 7 Stories, 31 Sub-tasks), 0 updated, 0 skipped, 0 ownership-refused
epic:      AIEX-797
assignee:  Saicharan Gnanapiragasam (accountId: 712020:fae1d817-7deb-41a9-8904-3132ae879c24)
backlog:   all 41 issues placed in backlog (no Sprint field set), status To Do
target:    https://emblaftdev.atlassian.net / AIEX
config:    jira-board.json updated — fields.epic_link="parent" (team-managed), transitions cached (To Do=11, In Progress=21, Done=31; no In Review)
issues:    AIEX workflow has no In Review column — /develop done must skip the In Review transition and leave tickets In Progress until /review. The committer agent must now use real AIEX-### prefixes for all commits; the previously blocked plan-output.md + .gitignore changes can be attributed to AIEX-798 (scaffolding/setup) or AIEX-797 (Epic) when /commit is re-run.
next:      Run /adr to lock the architecture (no Jira transitions during /adr — issues stay in To Do)
---END---
