---
description: Review staged + unstaged changes, propose commit messages, ask the user to confirm, commit, and (optionally) push to a chosen remote and branch.
argument-hint: "(no arguments)"
allowed-tools: Read, Bash, Glob, Grep, Skill
---

# /commit — Review, Commit, and (Optionally) Push

You are the COMMIT phase.
You run in the main session — you have AskUserQuestion available and can
talk to the user directly. Your job:

  1. Survey the current git state and show the user a full source-control view.
  2. Spawn the `committer` subagent to produce a structured commit plan.
  3. Confirm the plan with the user via AskUserQuestion.
  4. Stage and commit using the project's `<JIRA-ID>:<Type>/<description>` convention.
  5. Confirm the push (and which remote, and which branch) via AskUserQuestion.
  6. Push only after explicit user confirmation in this turn.

**Never** stage, commit, or push without a user-confirmed answer in this
turn. This applies even when called from inside another command's pipeline.

---

## Step 1 — Survey state

Run these Bash commands in parallel:

  - `git status --porcelain`
  - `git diff --stat`
  - `git diff --cached --stat`
  - `git log --oneline @{u}..HEAD 2>/dev/null` (unpushed commits — may error if no upstream; treat empty as "none")
  - `git rev-parse --abbrev-ref HEAD` (current branch)
  - `git remote -v` (list configured remotes — there may be more than one, e.g. `github` and `bitbucket`)

Decide:

  - If `git status --porcelain` is empty AND there are no unpushed commits →
    print `Nothing to commit or push. Working tree clean, remote up to date.`
    and stop the skill.
  - Otherwise → continue.

---

## Step 2 — Show the user the source-control view

Render a concise but complete view of the repository state in your reply:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗂  Source-control view
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch:           <current-branch>
Upstream:         <github/master | none>
Configured remotes:
  github   → https://github.com/.../...git
  bitbucket → https://bitbucket.org/.../...git

Unstaged changes (working tree):
  <git diff --stat output, one file per line>

Staged changes (index):
  <git diff --cached --stat output>

Untracked files:
  <list from git status --porcelain showing ??>

Existing unpushed commits:
  <git log --oneline @{u}..HEAD output, or "none">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Keep the totals visible (X files changed, Y insertions, Z deletions per group).
Truncate path lists at 15 entries with a `... and N more` if necessary.

---

## Step 3 — Spawn the committer subagent

Call the Agent tool with:
  - description: "Plan commits + push"
  - subagent_type: "committer"
  - prompt: |
      Inspect the working tree and produce a structured commit + push plan.

      Project root: <pwd>. The user is about to confirm or reject your plan
      in the main session — be specific, group logically by ticket, and
      never propose destructive git operations.

      Read `.claude/CLAUDE.md` for the commit convention and
      `.claude/context/jira-output.md` for the project's ticket IDs.

      Return the plan in the exact Markdown shape defined in your agent
      description, with one `<JIRA-ID>:<Type>/<description>` message per
      proposed commit. Look up the user's assigned Jira tickets via MCP
      (`mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql`) and derive
      `<Type>` from each ticket's issue type per the mapping in your
      agent definition.

Wait for the agent's response. Parse the plan.

---

## Step 4 — Present the plan + ask for commit approval

Render the plan concisely in your reply. Show:

  - Existing unpushed commits (verbatim from the agent's output)
  - Proposed new commits — one section per commit with files + message
  - Any risks the agent flagged

Then call AskUserQuestion:

```json
{
  "question": "Approve the commit plan above?",
  "header": "Commit plan",
  "options": [
    { "label": "Yes — commit as proposed (Recommended)",
      "description": "Stage and commit exactly as listed using <JIRA-ID>:<Type>/<description>." },
    { "label": "Edit messages first",
      "description": "I'll let you rewrite any commit messages before I stage anything." },
    { "label": "Commit a subset",
      "description": "Pick which proposed commits to actually execute; skip the rest." },
    { "label": "Cancel — don't commit anything",
      "description": "Stop here. Working tree stays as-is. No push will happen either." }
  ]
}
```

Handle the answer:

  - **Yes** → proceed to Step 5.
  - **Edit messages first** → list each proposed message and ask the user
    to reply with replacements in plain text. After they answer, proceed.
  - **Commit a subset** → number the proposed commits and ask which ones
    to keep (e.g. "Reply with `1,3` to keep just those"). Filter accordingly.
  - **Cancel** → say `Commits cancelled. Working tree unchanged.` and stop
    the skill. Do NOT ask about pushing.

---

## Step 5 — Execute commits

For each approved commit in order:

  1. Stage only the files for THIS commit:
     `git add <file1> <file2> ...`
     **Never** `git add -A`, `git add .`, `git add -p`, or `git add -u`.
     Always explicit filenames.

  2. Create the commit:
     `git commit -m "<JIRA-ID>:<Type>/<subject>"`

     Where `<Type>` ∈ Feature | Bugfix | Hotfix | Chore | Refactor | Docs |
     Test | Task — chosen by the committer subagent from the Jira issue type
     of `<JIRA-ID>`. Use the exact subject the committer proposed (or the
     user-edited replacement). No space after the colon.

     The pre-commit hooks will run (jira-ticket-check, secret-scan,
     lint-check). If a hook fails:
       - Surface the hook's error verbatim.
       - Do NOT retry with `--no-verify`.
       - Ask the user how to proceed (fix + retry, skip this commit, or
         cancel the rest).

  3. Capture the resulting short hash.

After all approved commits complete:

  - Run `git status` to confirm clean working tree.
  - Print a one-line summary per commit: `<hash> <subject>`.

---

## Step 6 — Ask about pushing

Only run this step if `git log @{u}..HEAD` (or `git log` if no upstream)
shows commits that haven't reached any remote.

First, determine the candidate remotes. Read `git remote -v` output.
Common case in this project: both `github` and `bitbucket` are configured.

### Step 6a — Pick the remote

If MORE than one remote is configured, call AskUserQuestion:

```json
{
  "question": "Which remote should I push to?",
  "header": "Remote",
  "options": [
    { "label": "github (Recommended)",
      "description": "Push to the GitHub remote — this also triggers GitHub Actions CI and Vercel auto-deploy." },
    { "label": "bitbucket",
      "description": "Push to the Bitbucket remote — useful for mirror or backup." },
    { "label": "Both — github first, then bitbucket",
      "description": "Push the same branch to both remotes sequentially." },
    { "label": "Don't push — keep commits local",
      "description": "Stop here. Commits stay in your local repo only." }
  ]
}
```

If only ONE remote is configured, use it directly and skip this question.
If the user picks "Don't push" — print `Commits kept local.` and stop.

### Step 6b — Pick the branch

Call AskUserQuestion:

```json
{
  "question": "Push to which branch?",
  "header": "Branch",
  "options": [
    { "label": "Current branch: <name> (Recommended)",
      "description": "Push the commits to <remote>/<current-branch>. If no upstream is set, I'll set one with -u." },
    { "label": "New branch",
      "description": "I'll ask for a branch name, create it locally, push to <remote>/<new-branch>, and suggest a PR." },
    { "label": "main / master",
      "description": "Push directly to the default branch on the remote. Pause for an extra confirmation before executing." }
  ]
}
```

Handle the answer:

  - **Current branch** →
    - If no upstream is set for the chosen remote, run `git push -u <remote> <current-branch>`.
    - Otherwise `git push <remote> <current-branch>`.
    - If the current branch IS `main` or `master`, treat this the same as
      the "main / master" option below and require an extra confirmation.

  - **New branch** →
    - Ask the user for the branch name in plain text (just ask in chat —
      AskUserQuestion is for multiple-choice, free text comes via the next user reply).
    - Validate: `^[a-zA-Z0-9._/-]+$`, length ≤ 64, no leading `-`.
    - `git checkout -b <new-branch>` then `git push -u <remote> <new-branch>`.
    - After push: tell the user they're now ON the new branch and suggest
      `gh pr create` (for GitHub) or the equivalent Bitbucket PR URL.

  - **main / master** → call AskUserQuestion one more time as a safety net:
    ```json
    {
      "question": "Push directly to <remote>/main? This skips PR review.",
      "header": "Confirm",
      "options": [
        { "label": "Yes, push to main",  "description": "Bypass PR review. Production deploy will trigger if the workflow is wired up." },
        { "label": "No, switch to a new branch instead", "description": "Open the new-branch flow." }
      ]
    }
    ```
    Only push to main if the user answers yes here.

### Step 6c — If pushing to both remotes

Run the push for `github` first, then `bitbucket`, in sequence. If either
fails, surface the error and ask whether to continue with the next remote
or stop.

### Step 6d — Banned flags

Never use `--force`, `--force-with-lease`, or `--mirror` unless the user
types those exact flags in a reply. This is non-negotiable.

---

## Step 7 — Tell the user

Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /commit complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commits made:    [count] (or 0 if cancelled / nothing to commit)
Pushed:          [yes (<remote>/<branch>) / no — kept local]
Branch:          [current branch after push]

[If pushed to GitHub: link to https://github.com/<owner>/<repo>/tree/<branch>]
[If a new branch was created: suggest `gh pr create --base main --head <new-branch>`]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If the calling command was a pipeline phase (the orchestrator invoked
/commit via `Skill(skill="commit")`), after the banner the caller is
free to continue — your job here is done.

---

## Failure modes to handle gracefully

  - **Pre-commit hook rejects (subject doesn't match `<JIRA-ID>:<Type>/<description>`, secret found, lint fails):**
    Surface the error, do not bypass, ask the user how to proceed.
  - **Remote rejects push (non-fast-forward, protected branch):**
    Show the message, offer to rebase manually or open the new-branch
    flow. Never use `--force` without explicit consent in this turn.
  - **No upstream set:** add `-u` automatically when pushing to current
    branch. Tell the user the upstream was set.
  - **Untracked file looks like a secret** (`.env*`, `*.pem`, `*.key`,
    `credentials*`): stop and warn before staging, even if the secret-scan
    hook would catch it. The user may have just forgotten to gitignore.
  - **Both remotes diverge from local** (one ahead, one behind): warn the
    user and ask which to align to. Do not auto-resolve.
