---
description: Interactively create/update Jira Epic + Stories + Tasks (+ Bugs) from plan-output.md. First run prompts for site & project (sticky thereafter). Every story is drafted and confirmed before any Jira write. Pass `reconfigure` to force re-selecting the board.
argument-hint: "[reconfigure]   — optional. Pass to force board re-selection; otherwise the saved board is reused silently."
allowed-tools: Read, Write, Edit, Glob, Grep
---

# /jira — Decompose Plan into Jira Epic, Stories, Tasks, (Bugs)

You are the JIRA phase. You are INTERACTIVE and CAREFUL.
You confirm every story with the user before creating or updating it in Jira.
You do NOT write code. You do NOT commit anything yourself
(the `/commit` skill at the end handles that).

The IDs you record here are the source of truth for the
`<JIRA-ID>:<Type>/<description>` commit convention — the `committer`
subagent will read `.claude/context/jira-output.md` and the
`Plan-Feature → Jira-ID Map` to pick the right prefix per commit. So
get the IDs right and surface them clearly.

---

## Step 1 — Read prior context

Use the Read tool to load:
  - `.claude/context/plan-output.md`  (required — stop with a clear error if missing)
  - `.claude/config/orchestrator.json` (for the commit-type mapping)
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

---

## Step 6 — Confirm each Story with the user

For each drafted story, after printing the full draft block:

AskUserQuestion:
  Question: "How should we handle this story?"
  Options:
    - "Create / Update as-is"   (apply to Jira)
    - "Edit before applying"    (prompt for which field; redraw; re-ask)
    - "Skip this one"
    - "Cancel /jira"            (abort everything, write nothing to Jira
                                  or to jira-output.md)

If "Edit before applying":
  - AskUserQuestion which field to change. Header "Field".
    Options: "Summary" | "Description" | "Acceptance Criteria" |
             "Issue Type" | "Priority" | "Parent"
  - Take free-form input for the new value.
  - Redraw the full draft block. Re-ask the outer question.

Maintain three running buckets:
  - approved_creates
  - approved_updates
  - skipped

---

## Step 7 — Apply to Jira

Process approved buckets sequentially. Stop on cancel.

### CREATE

For each item in `approved_creates`, call:
  `mcp__claude_ai_Atlassian__createJiraIssue` with:
    cloudId          = jira-board.json cloud_id
    projectKey       = jira-board.json project_key
    issueTypeName    = matching value from jira-board.json issue_types
    summary          = draft.summary
    description      = draft.description (markdown)
    Custom fields:
      - epic-link or parent = epic key
      - acceptance_criteria = draft.ac (only if `fields.acceptance_criteria` is set)
    priority (if available on the project)
    assignee = current user (lookup via
              `mcp__claude_ai_Atlassian__lookupJiraAccountId` if needed)

Capture the returned key (e.g. `PROJ-7`). Print `✓ PROJ-7 created`.

### UPDATE

For each item in `approved_updates`, call:
  `mcp__claude_ai_Atlassian__editJiraIssue` with the existing key,
  sending ONLY the changed fields (so you don't blow away any human
  edits made in Jira).

Capture the key for the map. Print `✓ PROJ-3 updated`.

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

## Epic
- <EPIC-KEY>: <summary> — type: Epic → commit Type: Feature

## Stories
- <KEY>: <summary> — type: Story → commit Type: Feature   (parent: <EPIC-KEY>)
- <KEY>: <summary> — type: Story → commit Type: Feature

## Tasks
- <KEY>: <summary> — type: Task → commit Type: Task       (parent: <EPIC-KEY> or <STORY-KEY>)

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
completed: <Nc> created, <Nu> updated, <Ns> skipped
epic:      <EPIC-KEY>
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
Site:    <site_url>
Project: <project_key>
Epic:    <EPIC-KEY> — <summary>
Created: <Nc>
Updated: <Nu>
Skipped: <Ns>
All tickets assigned to you.

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
