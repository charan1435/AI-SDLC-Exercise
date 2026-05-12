# Jira Policy — Ownership, Hierarchy, Status, Backlog

This is the single source of truth for **every** Claude command and
subagent that touches Jira via the Atlassian MCP. It is referenced from
`/jira`, `/develop`, `/adr`, `/ux`, `/cicd`, `/review`, `/demo`, and
from the `committer` agent.

All rules below are mandatory. Violations must abort the operation with
a clear message to the user.

---

## 1. Ownership — only touch issues assigned to the current user

The current user (the human running Claude Code) is the only person
whose Jira tickets this orchestrator may create, edit, transition, or
comment on.

### Resolving the current user's accountId

At the start of any phase that will write to Jira, resolve the user's
Jira `accountId` using one of these (in order):

1. **Cached value** in `.claude/config/jira-board.json` under
   `assignee.account_id` — reuse if present.
2. **MCP lookup** by email
   (`mcp__claude_ai_Atlassian__lookupJiraAccountId`) using the email
   recorded in `.claude/config/jira-board.json` under
   `assignee.email`. The runtime injects the user's email into the
   session context — use that if `assignee.email` is absent.
3. **MCP `atlassianUserInfo`** for the current authenticated user.
4. If none of the above resolves an `accountId`, **STOP** with:
   `⚠️  Cannot resolve current user's Jira accountId. Run /jira reconfigure to capture it.`

Once resolved, write it back to `jira-board.json` under
`assignee.account_id` and `assignee.email` so subsequent commands skip
the lookup.

### Hard ownership rules

  ❌ **Never** call `editJiraIssue`, `transitionJiraIssue`,
     `addCommentToJiraIssue`, `addWorklogToJiraIssue`, or
     `createIssueLink` against any issue whose
     `assignee.accountId` is **not** the resolved current-user
     accountId.

  ❌ **Never** include a "candidate" parent Epic or "candidate" parent
     Story in a UPDATE batch unless that parent is also owned by the
     current user. You may **link to** an Epic owned by someone else
     only if the user explicitly types the Epic key when prompted.

  ✅ Before any write to an existing issue, fetch it via
     `getJiraIssue` and verify `fields.assignee.accountId` matches
     the resolved current-user accountId. If it does not match, print:
     `⚠️  Skipping <KEY> — assigned to <displayName>, not you. Project policy: only modify your own issues.`
     Move on. Do NOT prompt the user to override.

  ✅ When querying for ticket lists (e.g. the committer agent's "what
     am I working on?" lookup), always include
     `assignee = currentUser()` in the JQL. Never widen the filter.

  ✅ Comments and worklogs follow the same rule — only on issues the
     current user owns.

---

## 2. Assignee — every new issue is assigned to the current user

Every `createJiraIssue` call MUST include:

```
assignee = { accountId: "<resolved current-user accountId>" }
```

Do **not** create an unassigned ticket, even if Jira's default workflow
would allow it. Do **not** assign to anyone other than the current user
— this orchestrator is a personal SDLC tool, not a team-wide
assignment system.

If a Jira issue type is configured to disallow on-create assignee,
create the issue then immediately follow with an `editJiraIssue` that
sets the assignee. Print one line per such fixup:
`✓ <KEY> assigned to you`.

---

## 3. Hierarchy — Epic → Story / Task → Sub-task

Every plan-derived feature gets decomposed into this exact hierarchy:

```
Epic                              (one per /plan run)
├── Story (user-visible work)     ← parent: Epic
│   ├── Sub-task (backend slice)
│   ├── Sub-task (frontend slice)
│   ├── Sub-task (tests slice)
│   └── Sub-task (deploy/docs slice)
├── Story
│   └── Sub-task …
└── Task (pure engineering setup) ← parent: Epic
    └── Sub-task …
```

Rules:

  - **Epic** — exactly one per /plan run, parent of every Story and
    Task in this orchestrator session. Use the existing Epic key if
    `jira-output.md` already records one for this plan; otherwise
    create a new Epic.
  - **Story** — anything user-visible (signup, dashboard, list view).
    Parent: the Epic.
  - **Task** — pure engineering setup with no user-visible outcome
    (Supabase migrations folder, middleware scaffolding). Parent:
    the Epic.
  - **Sub-task** — implementation slice of a Story or Task. Default
    sub-task set per Story: `backend`, `frontend`, `tests`,
    `deploy/docs`. Drop slices that don't apply (e.g. a pure-frontend
    Story has no backend sub-task). Parent: the Story or Task.
  - **Bug** — siblings of Story/Task under the Epic, only generated
    if `plan-output.md` has a "Known Defects" / "Bugs" section.

### Parent-link field

Use the project's parent-link field. Determined at first-run setup
(see `/jira` Case B). For team-managed projects, this is the `parent`
field; for classic projects, it's the Epic Link custom field. The
correct field is recorded under
`jira-board.json#fields.epic_link`.

For Sub-tasks, use the `parent` field — Sub-task is always under its
parent Story/Task by Jira convention, NOT via the Epic Link.

---

## 4. Backlog placement — never auto-add to a sprint

Every newly created issue must land in the **product backlog**, not in
any active or future sprint.

Rules:

  - Do NOT set the Sprint custom field on `createJiraIssue`.
  - Do NOT call any sprint-modifying tool.
  - On a Scrum board, an issue with no Sprint field automatically
    sits in the backlog — this is the default; respect it.
  - On a Kanban board, all issues are in the backlog/board by
    default — same: respect Jira's default.

If a /jira run is updating an existing issue that has already been
pulled into a sprint by a human, **leave the Sprint field alone**.
Don't add it, don't remove it. The user controls sprint membership.

---

## 5. Status transitions — advance with each SDLC phase

As work moves through the SDLC pipeline, transition the current user's
relevant issues to reflect progress. Use:

```
mcp__claude_ai_Atlassian__getTransitionsForJiraIssue   # discover IDs
mcp__claude_ai_Atlassian__transitionJiraIssue          # apply
```

### Canonical phase → target-status map

| Phase            | Target status                                  | Applies to                                  |
|------------------|------------------------------------------------|---------------------------------------------|
| `/jira` create   | `To Do` (or board's first/backlog status)      | newly-created Epic, Stories, Tasks, Subtasks |
| `/adr` complete  | (no change — still backlog)                    | —                                           |
| `/ux` complete   | (no change — still backlog)                    | —                                           |
| `/develop` start | `In Progress`                                  | Epic + every Story/Task touched this run    |
| `/develop` done  | `In Review`                                    | every Story/Task whose code was built       |
| `/cicd` complete | (no change — keeps `In Review`)                | —                                           |
| `/review` pass   | `Done`                                         | every Story/Task that passed review         |
| `/review` fail   | `In Progress`                                  | every Story/Task with HIGH+ findings        |
| `/demo` complete | `Done`                                         | the Epic                                    |

If the project's workflow uses different display names (e.g.
`Selected for Development`, `Code Review`, `Closed`), discover the
real transitions via `getTransitionsForJiraIssue` and pick the closest
match by name (case-insensitive substring). Cache the mapping in
`jira-board.json#transitions` after first successful run so subsequent
runs skip the discovery call.

### Status transition rules

  - Always pre-check ownership (Rule 1) before transitioning.
  - Skip transitions where the issue is already at the target status
    — don't make redundant API calls.
  - If a transition is unavailable (workflow doesn't allow that move
    from the current status), print one line and continue:
    `⚠️  <KEY>: cannot transition <current> → <target>. Leaving as-is.`
  - Sub-tasks follow their parent's transition by default:
    `/develop start` transitions the parent Story to `In Progress`
    AND every owned Sub-task of that Story to `In Progress`.

---

## 6. JQL templates (always include ownership)

Any JQL the orchestrator runs must filter by the current user:

```jql
# what's actively assigned to me right now
assignee = currentUser() AND statusCategory != Done

# tickets I own that match a plan feature (for committer agent)
assignee = currentUser() AND project = <project_key> AND statusCategory != Done

# my open work under the current Epic
assignee = currentUser() AND "Epic Link" = <EPIC-KEY>
```

Never run JQL that omits `assignee = currentUser()` from this
orchestrator — even read-only queries respect the same scoping so the
committer / phase scripts only see the user's own work.

---

## 7. Standard "phase-end Jira step" snippet

Every phase command (`/adr`, `/ux`, `/develop`, `/cicd`, `/review`,
`/demo`) ends with this micro-step **before** the
`Skill(skill="commit")` hand-off:

> 1. Resolve the current user's Jira accountId per Rule 1.
> 2. Load the ticket set: read `.claude/context/jira-output.md` and
>    take every Story/Task key whose summary maps to a feature this
>    phase touched.
> 3. Filter that set: keep only keys whose current assignee is the
>    resolved current-user accountId (per Rule 1).
> 4. For each remaining key, run the transition this phase prescribes
>    (per Rule 5).
> 5. Print one line per transition:
>    `→ <KEY>: <previous-status> → <target-status>`
> 6. Print one summary line:
>    `Jira: <N> tickets advanced, <S> skipped (not owned by you).`

If the phase did not touch any Story/Task (e.g. /adr or /ux which
mostly produce planning artefacts), explicitly print:
`Jira: no transitions for this phase (still in backlog).`

---

## 8. Refusal language (use verbatim)

When refusing a write because of an ownership conflict, the agent
prints one of these exact lines and continues with the next issue.
Never editorialise, never offer to "force" the operation:

```
⚠️  Skipping <KEY> — assigned to <displayName>, not you. Project policy: only modify your own issues.
⚠️  Skipping <KEY> — unassigned. Project policy: only modify your own issues.
⚠️  Skipping <KEY> — assigned to no one (or unable to read assignee). Project policy: only modify your own issues.
```

The user can manually reassign the ticket to themselves in Jira if
they want this orchestrator to act on it next run.
