---
description: Generate ADR.md with stack decisions and trade-offs
argument-hint: "(no arguments — reads plan-output.md and jira-output.md)"
allowed-tools: Read, Write, Glob, Grep
---

# /adr — Generate Architecture Decision Record

You are the ARCHITECTURE phase.
Your job is to document architectural decisions with clear rationale.
You do NOT write application code.

Optional: read `.claude/lib/core/architecture.md` for ADR principles
and data-model rules.

---

## Step 1 — Read prior context
Use the Read tool to load:
  .claude/context/plan-output.md
  .claude/context/jira-output.md

If plan-output.md does not exist:
  Print: "⚠️  No plan found. Run /plan first."
  Stop.

---

## Step 2 — Produce ADR.md in project root
Write a complete Architecture Decision Record to ADR.md

Use this exact structure:

---
# Architecture Decision Record

## Project
[project name from plan]

## Status
Accepted

## Date
[today's date]

---

## 1. Context
[What problem are we solving? Who are the users?
What are the key constraints? Keep to 2-3 paragraphs.]

---

## 2. Core Stack Decision

### Frontend — Next.js 14 App Router + TypeScript
**Decision:** Use Next.js 14 with App Router.
**Rationale:**
  - Server components reduce client bundle size
  - Built-in API routes eliminate need for separate backend
  - Native Vercel deployment with zero config
  - SSR improves SEO for public-facing pages
**Alternatives considered:**
  - React + Vite + separate Express: rejected — two deployment
    units, extra CORS config, more complexity for no benefit
  - Remix: considered — similar SSR benefits but smaller ecosystem
    and team familiarity risk

### UI — Tailwind CSS + shadcn/ui
**Decision:** Tailwind with shadcn/ui component library.
**Rationale:**
  - shadcn/ui components are owned (not a dependency)
    so they can be modified freely
  - Tailwind eliminates CSS file management overhead
  - Consistent design tokens across team
**Alternatives considered:**
  - MUI / Chakra: rejected — opinionated styles harder to customise
  - Plain CSS modules: rejected — slower development velocity

### Backend — Next.js API Routes (serverless)
**Decision:** No separate backend server.
**Rationale:**
  - API routes co-located with frontend in one repo
  - Serverless functions scale automatically on Vercel
  - One deployment unit — simpler CI/CD
  - README "run in 5 min" requirement met with one command
**Alternatives considered:**
  - FastAPI (Python): rejected — adds second deployment,
    two terminals locally, no Python-specific requirement in spec
  - Express server: rejected — same drawbacks as FastAPI

### Database / Auth / Storage — Supabase
**Decision:** Supabase for all data, auth and file storage.
**Rationale:**
  - PostgreSQL with RLS provides row-level security per user
  - Built-in auth eliminates custom session management
  - Storage handles file uploads without extra service
  - Free tier sufficient for PoC / demo
**Alternatives considered:**
  - Firebase: rejected — NoSQL less suited to relational data,
    harder to query with JOINs
  - PlanetScale + custom auth: rejected — more moving parts

### Deployment — Vercel
**Decision:** Deploy to Vercel.
**Rationale:**
  - Native Next.js support, zero config
  - Preview deployments on every PR
  - Public URL requirement met instantly
  - Free tier sufficient

### CI/CD — GitHub Actions
**Decision:** GitHub Actions for lint, build, test, deploy.
**Rationale:**
  - Lives in the same repo, visible to all reviewers
  - Free for public repos and reasonable free tier private
  - Native integration with Vercel deploy action

---

## 3. Optional Module Decisions
[For each activated module from plan-output.md, add a section:]

### [Module name e.g. Payments — Stripe]
**Decision:** [chosen tool]
**Rationale:** [why]
**Alternatives considered:** [what else and why rejected]

---

## 4. Data Model
[High level entity diagram in text:]

  users (via Supabase Auth)
    └── [related entities]
         └── [child entities]

Key relationships:
  - [relationship 1]
  - [relationship 2]

---

## 5. Security Decisions
  - RLS enabled on all tables — users access only their data
  - Service role key server-side only, never in client code
  - All secrets in environment variables, never hardcoded
  - .env files gitignored and pre-hook enforced

---

## 6. Scalability Note

### Current architecture (PoC / demo)
[Describe current setup and its limits]

### At 10,000 users
  - Bottlenecks: [identify]
  - Mitigations: [caching, indexes, connection pooling]

### At 100,000 users
  - Bottlenecks: [identify]
  - Mitigations: [CDN, queue, read replicas, edge functions]

### Observability
  - Logging: [approach]
  - Monitoring: [approach]
  - Error tracking: [e.g. Sentry]

---

## 7. Key Trade-offs Summary
| Decision          | Benefit                    | Trade-off                    |
|-------------------|----------------------------|------------------------------|
| Next.js full-stack| One deploy, simpler        | Less Python flexibility      |
| Supabase          | Fast setup, built-in auth  | Vendor lock-in               |
| Vercel            | Zero config deploy         | Cost at scale                |
| shadcn/ui         | Fully customisable         | More initial setup than MUI  |
---

---

## Step 3 — Write context output file
Save summary to .claude/context/adr-output.md

Format:
---
# ADR Output
generated: [timestamp]

## Stack locked
  Frontend:  Next.js 14 + TypeScript + Tailwind + shadcn/ui
  Backend:   Next.js API Routes
  Database:  Supabase PostgreSQL
  Auth:      Supabase Auth
  Storage:   Supabase Storage
  Deploy:    Vercel
  CI/CD:     GitHub Actions
  Optional:  [list from activated modules]

## Key decisions
  - [decision 1]
  - [decision 2]

## Data model entities
  - [entity 1]
  - [entity 2]

---HANDOFF---
agent:     architecture
completed: ADR.md written to project root
stack:     [confirmed stack]
entities:  [list of main DB entities]
next:      Run /ux to produce wireframes and collect design references
---END---
---

---

## Step 4 — Tell the user

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /adr complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADR.md written to project root.
Stack confirmed. Data model defined.
Output: .claude/context/adr-output.md

Handing off to /commit. Next phase after that: /ux
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
