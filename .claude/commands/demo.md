---
description: Generate DEMO.md with demo script and talking points
argument-hint: "[evaluator names — defaults to placeholder]"
allowed-tools: Read, Write, Glob
---

# /demo — Generate Demo Script and Talking Points

You are the DEMO phase.
Your job is to generate a complete demo script for the evaluators.
Evaluator names come from $ARGUMENTS (default: "[Evaluator A] and [Evaluator B]").

---

## Step 1 — Read all prior context
Use the Read tool to load:
  .claude/context/plan-output.md
  .claude/context/jira-output.md
  .claude/context/adr-output.md
  .claude/context/develop-output.md
  .claude/context/review-output.md

---

## Step 2 — Generate DEMO.md in project root

Write a complete demo script with this structure:

---
# Demo Script

## Project Summary
[One paragraph — what was built, who it is for, key features]

## Evaluators
$ARGUMENTS

## Grading Focus
AI involvement across ALL stages — not just coding.

---

## 1. Planning Stage (2 min)
**What to show:** Jira board
**Talking points:**
  - Ran /plan with the spec — Claude identified app type and activated relevant modules
  - /jira created [N] tickets automatically via MCP
  - All commits are linked to Jira tickets
  - Show Epic → Stories → Tasks hierarchy
  - Show a commit that references a ticket ID

**What evaluators see:** AI involved at planning stage, not just coding

---

## 2. Architecture Stage (1 min)
**What to show:** ADR.md in repo
**Talking points:**
  - /adr produced the full Architecture Decision Record
  - Show the alternatives considered section
  - Show the trade-offs table
  - Show the scalability note (10k / 100k users)

**What evaluators see:** Reasoned architectural decisions, not just defaults

---

## 3. UI/UX Stage (1 min)
**What to show:** .claude/screenshots/ folder
**Talking points:**
  - /ux prompted for reference screenshots
  - Show the reference screenshots provided
  - Show the iterative improvement screenshots
  - Show before/after if iterations were needed
  - Claude self-corrected the UI by comparing screenshots

**What evaluators see:** AI driving visual design and self-correcting

---

## 4. Development Stage (2 min)
**What to show:** Running application
**Talking points:**
  - /develop spawned 4 specialized subagents
  - Backend subagent: schema + RLS + API routes
  - Frontend subagent: pages + components
  - Show the actual working application
  - Walk through the primary user journey

**Live demo flow:**
  [List the exact clicks to demonstrate the primary journey]
  Step 1: [action]
  Step 2: [action]
  Step 3: [action]

**What evaluators see:** Working PoC, not pseudo-code

---

## 5. CI/CD Stage (1 min)
**What to show:** GitHub Actions tab
**Talking points:**
  - /cicd generated three workflows
  - Show a passing CI run (lint + build + test)
  - Show the preview deployment on a PR
  - Show the production deployment on main merge
  - Show the PR template with Jira ticket requirement

**What evaluators see:** Full CI/CD pipeline, not manual deployment

---

## 6. QA Stage (1 min)
**What to show:** Test files + review output
**Talking points:**
  - QA subagent wrote unit + component + e2e tests
  - /review ran three specialized review subagents
  - Show the review report: code quality + security + performance
  - Show any issues that were auto-fixed
  - Show test coverage report

**What evaluators see:** AI-driven QA, not afterthought testing

---

## Anticipated Evaluator Questions

Q: How much did Claude actually do vs you manually coding?
A: [Explain the plugin orchestration — every step driven by a command]

Q: Why did you choose this stack?
A: [Reference ADR.md — alternatives considered, trade-offs documented]

Q: What would you do differently at scale?
A: [Reference scalability note in ADR.md — 10k/100k users section]

Q: How did you ensure security?
A: [Pre-hooks blocking .env commits, RLS on all tables, secret scanning]

Q: Walk me through the AI SDLC
A: /plan → /jira → /adr → /ux → /develop → /cicd → /review → /demo
   Each phase human-triggered, each phase AI-executed

---

## What to Have Open Before Demo Starts
  - [ ] Application running at public URL (Vercel)
  - [ ] Jira board open showing Epic + Stories
  - [ ] GitHub repo open showing .claude/ folder
  - [ ] ADR.md open in one tab
  - [ ] GitHub Actions showing green CI run
  - [ ] .claude/screenshots/ folder ready to show
  - [ ] README open showing 5-minute setup

---

## 5-Minute Run Through (speed version)
1. Show Jira board                    (30s)
2. Show ADR.md trade-offs             (30s)
3. Show screenshots iteration folder  (30s)
4. Live demo of working app           (90s)
5. Show passing GitHub Actions run    (30s)
6. Show .claude/ plugin structure     (30s)
7. Explain /plan → /demo pipeline     (30s)
---

---

## Step 3 — Tell the user

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /demo complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMO.md written to project root.

Pre-demo checklist is in DEMO.md.
Review it before presenting.

You are ready. Good luck! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Handing off to /commit so DEMO.md can be reviewed and pushed before the demo..."


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
