---
description: Interactively create/update Jira Epic + Stories + Sub-tasks (+ Tasks, Bugs) from plan-output.md. Only touches issues assigned to YOU. Every issue is drafted, confirmed, assigned to you, and placed in the backlog. First run prompts for site & project (sticky thereafter). Pass `reconfigure` to force re-selecting the board.
argument-hint: "[reconfigure]   — optional. Pass to force board re-selection; otherwise the saved board is reused silently."
allowed-tools: Read, Write, Edit, Glob, Grep
---

# /jira — Decompose Plan into Jira Epic → Stories → Sub-tasks

You are the JIRA phase. You are INTERACTIVE and CAREFUL.
You confirm every issue with the user before creating or updating it in Jira.
You do NOT write code. You do NOT commit anything yourself
(the `/commit` skill at the end handles that).

The IDs you record here are the source of truth for the
`<JIRA-ID>:<Type>/<description>` commit convention — the `committer`
subagent will read `.claude/context/jira-output.md` and the
`Plan-Feature → Jira-ID Map` to pick the right prefix per commit. So
get the IDs right and surface them clearly.

---

## Project policy (mandatory — read before doing anything)

This command obeys `.claude/lib/core/jira-policy.md`. The rules
in that file are non-negotiable. The essentials:

  1. **Ownership** — only create, edit, transition, or comment on
     issues assigned to the current user. Before any UPDATE, fetch
     the issue and verify assignee.accountId matches the current
     user's accountId; skip with a refusal line if it doesn't.
  2. **Assignee** — every newly-created issue is assigned to the
     current user via `assignee.accountId`. No unassigned tickets.
     No tickets assigned to other people.
  3. **Hierarchy** — Epic (1 per /plan run) → Stories / Tasks
     (parent: Epic) → Sub-tasks (parent: Story or Task). Default
     sub-task slices per Story: `backend`, `frontend`, `tests`,
     `deploy-docs` (drop inapplicable slices).
  4. **Backlog** — never set the Sprint field. Issues land in the
     backlog by default.
  5. **Status** — new issues are created in the board's first /
     backlog status (typically `To Do`). Phase commands later
     transition them through `In Progress` → `In Review` → `Done`.

Read `.claude/lib/core/jira-policy.md` once at the top of this run
so you have the full text in context. Then proceed.

---

## Step 1 — Read prior context

Use the Read tool to load:
  - `.claude/lib/core/jira-policy.md`  (required — the ownership/hierarchy/status rules below depend on this)
  - `.claude/context/plan-output.md`   (required — stop with a clear error if missing)
  - `.claude/config/orchestrator.json` (for the commit-type mapping and `jira` policy block)
  - `.claude/config/jira-board.json`   (may not exist — that signals first run)
  - `.claude/context/jira-output.md`   (may not exist — that signals fresh /jira)

If `plan-output.md` is missing, print:
  "⚠️  No plan found. Run /plan first."
and stop.

---

## Step 2 — Determine the Jira target

Check `$ARGUMENTS`. If it contains the literal token `reconfigure`
(case-insensitive), force-run the first-time setup in Case B below,
overwriting any existing `.claude/config/jira-board.json`.

Otherwise:

### Case A — `.claude/config/jira-board.json` exists (sticky reuse)

Parse it. Expected shape:
```json
{
  "cloud_id":   "<atlassian cloud id>",
  "site_url":   "https://<workspace>.atlassian.net",
  "project_key": "PROJ",
  "issue_types": {
    "epic":  "Epic",
    "story": "Story",
    "task":  "Task",
    "bug":   "Bug",
    "subtask": "Sub-task"
  },
  "fields": {
    "epic_link":           "customfield_10014",
    "acceptance_criteria": "customfield_XXXXX"
  }
}
```

Print ONE confirmation line and move on — DO NOT ask the user:
  `Using saved Jira target: <site_url> / project <project_key>`
  `(Run /jira reconfigure to change.)`

This is intentional: once a board is chosen, /jira is sticky for the
life of the project. The user explicitly opts in to re-selection via
the `reconfigure` argument.

### Case B — first run (or `reconfigure` argument was passed)

Drive a board-discovery flow using the Atlassian MCP. The relevant
tools (you have these via the `atlassian` plugin):

  - `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources`
  - `mcp__claude_ai_Atlassian__getVisibleJiraProjects`
  - `mcp__claude_ai_Atlassian__getJiraProjectIssueTypesMetadata`
  - `mcp__claude_ai_Atlassian__getJiraIssueTypeMetaWithFields`

Procedure:
  1. Call `getAccessibleAtlassianResources` to list sites. If >1 site,
     AskUserQuestion to pick one (header "Site"). Save its `id` as
     `cloud_id` and `url` as `site_url`.
  2. Call `getVisibleJiraProjects` against the chosen cloud_id. List
     projects as options (key + name). AskUserQuestion (header
     "Project"). Save the chosen project's `key` as `project_key`.
  3. Call `getJiraProjectIssueTypesMetadata` for the chosen project.
     Confirm Epic, Story, Task, Bug, Sub-task issue types are
     available; record their exact case-sensitive names under
     `issue_types`. If a name differs (e.g. "User Story" instead of
     "Story"), use what the project actually provides.
  4. For the Story issue type, call `getJiraIssueTypeMetaWithFields`
     to discover:
       - The Epic-link custom field id (commonly `customfield_10014`
         on classic Jira, or `parent` on next-gen / team-managed).
       - The Acceptance Criteria custom field id, if the project has
         one. If not, you'll embed AC inside the Description body.
     Record these under `fields`.
  5. Use the Write tool to save the result to
     `.claude/config/jira-board.json`.

Print:
  `✓ Jira target saved: <site_url> / <project_key>`

---

## Step 2.5 — Resolve current user's accountId (REQUIRED)

This run will create and update issues. Every write must be scoped to
the current user. Resolve their Jira `accountId` now, before any
draft is shown.

Procedure (stop and fail if none of these succeed):

  1. Read `.claude/config/jira-board.json`. If
     `assignee.account_id` is set to a non-null string, use it as
     `CURRENT_USER_ACCOUNT_ID` and skip to step 4.
  2. If `assignee.email` is set, call
     `mcp__claude_ai_Atlassian__lookupJiraAccountId` with that
     email. If it returns an accountId, use it.
  3. Otherwise call
     `mcp__claude_ai_Atlassian__atlassianUserInfo` for the
     currently authenticated user and read `account_id` from the
     response.
  4. Write the resolved accountId (and the email, if discovered) back
     to `jira-board.json` under `assignee.account_id` /
     `assignee.email`. Use Edit, not Write, so the rest of the file
     stays intact.

If steps 1–3 all fail:
  Print: "⚠️  Cannot resolve current user's Jira accountId. Run /jira reconfigure to capture it, or set assignee.email in .claude/config/jira-board.json."
  Stop.

Print one line:
  `✓ Resolved current user accountId: <short-id-prefix>...  (you are <displayName>)`

This `CURRENT_USER_ACCOUNT_ID` is used:
  - As the `assignee` field on every `createJiraIssue` call.
  - As the ownership check before every `editJiraIssue` or
    `transitionJiraIssue` call.
  - As the `assignee = currentUser()` filter in JQL queries.

---

## Step 2.6 — Resolve the workflow transition IDs (REQUIRED)

This run will create issues; subsequent /develop, /review, /demo
phases will transition them. Capture the transition IDs once and
cache.

If `jira-board.json#transitions` already has non-null IDs for the
four states (`To Do`, `In Progress`, `In Review`, `Done`), skip this
step.

Otherwise: pick any one Story-type issue in the project (or create a
throwaway placeholder if the project has zero issues — but only after
asking the user with AskUserQuestion: "Create a temporary Story to
discover workflow transitions? It will be deleted at the end."). Call
`mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` against it.

For each target name in `orchestrator.json#jira.status_transitions`
that is non-null (`To Do`, `In Progress`, `In Review`, `Done`),
match against the returned transition list:
  - Exact name match (case-insensitive) wins.
  - Otherwise, substring match. If multiple match, prefer the
    transition that takes the issue toward `Done` from the current
    column (use `to.statusCategory` to disambiguate: `new`,
    `indeterminate`, `done`).
  - Record the transition `id` under `jira-board.json#transitions`.

If a transition cannot be resolved (e.g. workflow has no `In Review`
column), leave it `null` and print:
  `⚠️  No transition found for "<name>". /review will skip this step.`

---

## Step 3 — Detect run mode per plan feature

For each MUST / SHOULD / NICE-TO-HAVE feature in `plan-output.md`,
decide one of:

  - **CREATE** — feature has no Jira ID in the existing
    `jira-output.md` Plan-Feature → Jira-ID Map (or jira-output.md
    doesn't exist).
  - **UPDATE** — feature already maps to a Jira ID and the plan text
    has changed since last run (Summary/Description/AC differ).
  - **NO-OP** — feature already maps to a Jira ID and nothing has
    changed.

Print a table to the user before doing anything:
```
Mode    Feature                                       Existing ID
CREATE  Email/password signup and login               —
UPDATE  Add an expense (amount, category, date, …)    PROJ-3
NO-OP   Filter expenses by category                   PROJ-5
```

Then AskUserQuestion:
  Question: "Proceed with this plan?"
  Options:  "Yes, proceed" | "Adjust scope" | "Cancel /jira"

If "Adjust scope", AskUserQuestion which features to include/exclude.

---

## Step 4 — Draft the Epic

Compose Epic fields from plan-output.md.

```
Summary:    <Suggested Epic Name from plan>
Issue Type: Epic
Priority:   Highest

Description:
## Problem Statement
<one-paragraph summary from plan>

## Goals
- <milestone 1>
- <milestone 2>
- <milestone N>

## High-Level Scope
MUST:
  - <feature>
SHOULD:
  - <feature>
NICE-TO-HAVE:
  - <feature>

## Activated Optional Modules
- <module>: activated because spec mentions "<quote>"
```

If `jira-output.md` already shows an Epic ID for this plan, this is an
UPDATE — show what will change diff-style.

AskUserQuestion:
  Question: "How should we handle this Epic?"
  Options:  "Approve" | "Edit summary" | "Edit description" |
            "Use a different existing Epic" | "Skip"

If "Edit *": ask for the new value (plain text), redraw, re-ask.
If "Use a different existing Epic": ask for the Jira key (e.g.
  PROJ-1), use that key as the parent for stories below.
If "Skip": there must be an existing Epic to attach stories to —
  prompt for its key.

---

## Step 5 — Draft each Story / Task / Bug

For every feature in CREATE or UPDATE mode, build a draft.

### Draft template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Story <i> of <N>           Mode: CREATE | UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:     <imperative phrase, ≤ 80 chars>
Issue Type:  Story | Task | Bug
Priority:    Highest (MUST) | High (SHOULD) | Medium (NICE-TO-HAVE)
Parent Epic: <Epic key from Step 4>
Existing ID: <key if UPDATE, else —>

Description:
## User Story
As a <persona from plan>, I want to <action> so that <benefit>.

## Context
<why this matters in this build — pull a sentence or two from the
 plan's problem statement or journey>

## Scope
In scope:
  - <bullet derived from plan feature>
  - <bullet>
Out of scope (handled by another story):
  - <adjacent feature that belongs to a different story>

Acceptance Criteria:
GIVEN <state>
WHEN  <action>
THEN  <outcome>
AND   <additional outcome>

(repeat one GWT block per acceptance criterion — derive these from the
 plan's user journeys, e.g. "Guest signs up → lands on dashboard →
 adds first expense → sees it in the list and reflected in the total".
 Each step of the journey usually produces one GWT block.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Issue-type heuristic

  - **Story** — anything user-visible (signup, list view, dashboard).
  - **Task** — pure engineering setup with no user-visible outcome
    (e.g. "Set up Supabase project + migrations folder", "Add
    middleware for protected routes").
  - **Bug** — defect against existing behavior. Not produced from a
    fresh /plan run, but if the plan-output.md has a "Known Defects"
    or "Bugs" section (some teams add this on re-runs), treat each
    entry as a Bug.

### Acceptance-criteria placement

  - If `fields.acceptance_criteria` is set in `jira-board.json`, send
    the GWT bullets in that custom field (and leave them OUT of
    Description).
  - Otherwise, embed them inside Description under the
    `Acceptance Criteria:` heading shown above.

### Sub-task slices (drafted for every Story / Task)

Immediately after each Story (or Task) draft, also draft its Sub-tasks
using the canonical slice set from
`orchestrator.json#jira.hierarchy.subtasks_per_story`:

```
  ─── Sub-tasks of <Story summary> ───
  ├── backend       — schema, API routes, server-side logic for "<story>"
  ├── frontend      — pages and components for "<story>"
  ├── tests         — unit + component + e2e coverage for "<story>"
  └── deploy-docs   — env vars, README updates, deploy checklist for "<story>"
```

Drop slices that don't apply (e.g. a docs-only Task gets no `backend`
or `frontend` slice). Each Sub-task draft has:

```
Summary:     [<parent summary>] <slice>: <one-line action>
Issue Type:  Sub-task              (use `issue_types.subtask` from jira-board.json)
Parent:      <parent Story/Task key, or "—" if parent is being created in this run>
Assignee:    <current user displayName>   (from Step 2.5)
Priority:    inherits parent

Description:
## Scope
- <slice-specific bullet>
- <slice-specific bullet>

## Definition of Done
- <slice-specific bullet>
```

The parent link for a Sub-task uses the project's `parent` field, not
the Epic Link custom field. The Sub-task's "grandparent" Epic is
inferred by Jira via the parent Story.

---

## Step 6 — Confirm each Story (and its Sub-tasks) with the user

For each drafted story, after printing the full draft block AND the
Sub-task slice block from Step 5:

AskUserQuestion:
  Question: "How should we handle this story (and its sub-tasks)?"
  Options:
    - "Create / Update as-is"   (apply Story + every Sub-task to Jira)
    - "Edit before applying"    (prompt for which field; redraw; re-ask)
    - "Edit sub-task slices"    (toggle which slices to include / drop)
    - "Skip this one"           (skip story AND its sub-tasks)
    - "Cancel /jira"            (abort everything, write nothing to Jira
                                  or to jira-output.md)

If "Edit before applying":
  - AskUserQuestion which field to change. Header "Field".
    Options: "Summary" | "Description" | "Acceptance Criteria" |
             "Issue Type" | "Priority" | "Parent"
  - Take free-form input for the new value.
  - Redraw the full draft block. Re-ask the outer question.

If "Edit sub-task slices":
  - AskUserQuestion (multi-select if available) which slices to keep
    from `backend`, `frontend`, `tests`, `deploy-docs`. Default = all.
  - Optionally accept free-form text to ADD a custom slice (e.g.
    `migrations`, `analytics`). Redraw and re-ask.

Maintain five running buckets:
  - approved_creates_epic
  - approved_creates_stories_tasks   (Story / Task, parent = Epic)
  - approved_creates_subtasks        (Sub-task, parent = Story/Task)
  - approved_updates                 (any issue type, ownership-checked)
  - skipped

---

## Step 7 — Apply to Jira

Process approved buckets in this **fixed order** (so parent keys are
known before children are created). Stop on cancel.

  1. `approved_creates_epic`           → must exist before stories
  2. `approved_creates_stories_tasks`  → must exist before sub-tasks
  3. `approved_creates_subtasks`       → use parent keys from step 2
  4. `approved_updates`                → ownership-checked per issue

Every `createJiraIssue` call MUST include the assignee field. Every
issue MUST land in the backlog (do NOT set the Sprint field).

### CREATE — Epic (step 1)

Call `mcp__claude_ai_Atlassian__createJiraIssue` with:
  - cloudId        = jira-board.json#cloud_id
  - projectKey     = jira-board.json#project_key
  - issueTypeName  = jira-board.json#issue_types.epic
  - summary        = draft.summary
  - description    = draft.description (markdown)
  - assignee       = { accountId: CURRENT_USER_ACCOUNT_ID }
  - priority       (if available on the project)
  - **No Sprint field.**

If the create response shows the issue is unassigned (some workflows
suppress `assignee` on create), immediately follow with
`editJiraIssue` setting `assignee = { accountId: CURRENT_USER_ACCOUNT_ID }`
and print `✓ <EPIC-KEY> assigned to you`.

Capture the returned key. Print `✓ <EPIC-KEY> created (assigned to you, backlog)`.

### CREATE — Stories / Tasks (step 2)

For each item in `approved_creates_stories_tasks`, call
`createJiraIssue` with the same shape as the Epic, plus:
  - The parent-link field set to the Epic key:
      * Team-managed Jira: `parent = { key: "<EPIC-KEY>" }`
      * Classic Jira: `<jira-board.json#fields.epic_link> = "<EPIC-KEY>"`
    The first run of /jira recorded the correct field. Use it.
  - acceptance_criteria = draft.ac (only if `fields.acceptance_criteria` is set)
  - **No Sprint field.**

Print `✓ <STORY-KEY> created (assigned to you, parent: <EPIC-KEY>, backlog)`.

### CREATE — Sub-tasks (step 3)

For each item in `approved_creates_subtasks`, call `createJiraIssue` with:
  - issueTypeName  = jira-board.json#issue_types.subtask
  - parent         = { key: "<parent Story/Task key from step 2>" }
  - assignee       = { accountId: CURRENT_USER_ACCOUNT_ID }
  - **Do NOT** set the Epic Link custom field on Sub-tasks. Jira
    derives the Epic from the parent Story.
  - **No Sprint field.**

Print `✓ <SUBTASK-KEY> created (slice: <slice-name>, parent: <STORY-KEY>)`.

### UPDATE — ownership pre-check (step 4)

For each item in `approved_updates`:

  1. Call `mcp__claude_ai_Atlassian__getJiraIssue` for the existing key.
  2. Read `fields.assignee`.
  3. If `fields.assignee` is null:
       Print the unassigned refusal line from
       `orchestrator.json#jira.refusal_lines.unassigned` (substituting `<KEY>`).
       Move on. Do NOT attempt the edit.
  4. If `fields.assignee.accountId` != `CURRENT_USER_ACCOUNT_ID`:
       Print the assignee_mismatch refusal line (substituting `<KEY>`
       and `<displayName>`).
       Move on. Do NOT attempt the edit.
  5. Otherwise, call `mcp__claude_ai_Atlassian__editJiraIssue` with
     the existing key, sending **only the changed fields** (don't
     overwrite human edits to other fields). **Never** include the
     Sprint field in the edit — preserve whatever sprint state a
     human set in Jira.

Capture the key for the map. Print `✓ <KEY> updated`.

### Initial-status confirmation

Newly created issues should land in the board's first/backlog
status (the configured `jira.status_transitions.jira_create` from
`orchestrator.json`, default `To Do`). For each issue created in
this run, call `getTransitionsForJiraIssue`. If the current status
is not the target backlog status AND a transition exists, call
`transitionJiraIssue` to move it there. If no transition is
available (e.g. workflow already starts at the right column), skip.

Print one line per transition: `→ <KEY>: <current> → To Do`.

### Error handling

If any call fails, print the error and AskUserQuestion:
  "Retry" | "Skip this issue" | "Cancel /jira"

---

## Step 8 — Write jira-output.md

Use the Write tool to save `.claude/context/jira-output.md`:

```
# Jira Output
generated: <ISO timestamp>
site:      <site_url>
project:   <project_key>
epic:      <EPIC-KEY>
assignee:  <displayName> (<accountId>)
backlog:   all issues in backlog (no Sprint field set)

## Epic
- <EPIC-KEY>: <summary> — type: Epic → commit Type: Feature

## Stories
- <KEY>: <summary> — type: Story → commit Type: Feature   (parent: <EPIC-KEY>)
- <KEY>: <summary> — type: Story → commit Type: Feature

## Tasks
- <KEY>: <summary> — type: Task → commit Type: Task       (parent: <EPIC-KEY> or <STORY-KEY>)

## Sub-tasks
- <KEY>: [<parent summary>] <slice>: <action> — type: Sub-task → commit Type: inherits parent (parent: <STORY-KEY>)
- <KEY>: [<parent summary>] <slice>: <action> — type: Sub-task → commit Type: inherits parent (parent: <STORY-KEY>)

## Bugs
- <KEY>: <summary> — type: Bug  → commit Type: Bugfix

## Plan-Feature → Jira-ID Map

The committer subagent uses this to pick the commit prefix per change.
If a particular code change should bind to a different ticket than the
plan feature it touches, EDIT this map after /jira finishes.

| Plan Feature (verbatim from plan-output.md)      | Jira-ID  | Commit Type |
|--------------------------------------------------|----------|-------------|
| Email/password signup and login                  | PROJ-2   | Feature     |
| Add an expense (amount, category, date, note)    | PROJ-3   | Feature     |
| Edit and delete own expenses                     | PROJ-4   | Feature     |
| List view with monthly total                     | PROJ-5   | Feature     |
| Dashboard with category breakdown                | PROJ-6   | Feature     |
| Filter expenses by category                      | PROJ-7   | Feature     |
| Search expenses by note text                     | PROJ-8   | Feature     |
| Project setup + Supabase migrations folder       | PROJ-9   | Task        |

## Commit Convention Reminder

Format: <JIRA-ID>:<Type>/<short description>
(See .claude/config/orchestrator.json for the canonical mapping.)

Jira issue type → commit `<Type>`:
  Story / Epic      → Feature
  Bug               → Bugfix
  Task              → Task
  Sub-task / Subtask → inherit parent's Type (fallback: Task)
  Anything else     → Chore

Examples:
  PROJ-2:Feature/wire signup form to Supabase Auth
  PROJ-3:Feature/add POST /api/expenses route with Zod validation
  PROJ-9:Task/scaffold supabase migrations folder
  PROJ-12:Bugfix/fix monthly total rounding error

---HANDOFF---
agent:     jira
completed: <Nc> created (<Ne> epic, <Nst> stories/tasks, <Nsub> sub-tasks), <Nu> updated, <Ns> skipped, <No> ownership-refused
epic:      <EPIC-KEY>
assignee:  <displayName> (accountId: <accountId>)
backlog:   all newly-created issues placed in backlog (no Sprint field set)
target:    <site_url> / <project_key>
next:      Run /adr to lock the architecture before code starts
---END---
```

---

## Step 9 — Banner

Print:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /jira complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Site:     <site_url>
Project:  <project_key>
Epic:     <EPIC-KEY> — <summary>
Assignee: <displayName> (you)
Created:  <Nc>  (Epic: <Ne>, Stories/Tasks: <Nst>, Sub-tasks: <Nsub>)
Updated:  <Nu>
Skipped:  <Ns>
Refused:  <No>   (← issues not assigned to you — left untouched)

All newly-created tickets are assigned to you and live in the backlog
(no Sprint field set). Phase commands will transition them through
To Do → In Progress → In Review → Done as work progresses.

Map saved: .claude/context/jira-output.md
Config:    .claude/config/jira-board.json

Handing off to /commit. Next phase after that: /adr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 10 — Hand off to /commit (mandatory project policy)

Invoke:
  Skill(skill="commit")

This surfaces the new `.claude/config/jira-board.json` (if just
created) and the updated `.claude/context/jira-output.md` to the user
through the committer flow. Do NOT proceed to /adr or print any other
"next step" message before /commit returns.

Project policy: no subagent or main command commits or pushes on its own.

---

## Commit Policy — DO NOT COMMIT, STAGE, OR PUSH

You are FORBIDDEN from running ANY state-changing git command. You
may inspect with `git status`, `git diff`, `git log` only. All commits
go through `/commit` after explicit user approval.

Note that this command DOES write to a third-party system (Jira) via
the Atlassian MCP — that's intentional and is what the per-story
AskUserQuestion confirmations are guarding. Jira writes happen only
after explicit user "Create / Update as-is" approval per story.
