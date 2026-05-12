# UX Output
generated: 2026-05-12
command:   /ux
use_reference_screenshots: true
reference_files:
  - .claude/screenshots/reference/rootcode.io_.png   (aesthetic target — modern product-studio, lime accent, big rounded cards)
  - .claude/screenshots/reference/styles.md          (extracted token system, see below)
styles_provided: true
styles_source:   user paste + reference image analysis

## Aesthetic Direction (one sentence)

Modern product-studio look — bold Poppins display type on an off-white canvas with raised white cards (40px corners), lime green as the single bold accent, and large numeric motifs (01/02/03) that double as the visual cue for the tie-break rule.

## Design Tokens (mirror of styles.md)

| Token                 | Value                                              |
|-----------------------|----------------------------------------------------|
| `primary_colour`      | `#a3e635` (lime-400) — primary CTA, "vote cast" state |
| `primary_hover`       | `#84cc16` (lime-500)                                |
| `secondary_colour`    | `#0a0a0a` (zinc-950) — high-contrast ink            |
| `background`          | `#f4f4f4` (zinc-100) — the canvas                   |
| `surface`             | `#ffffff` — raised cards                            |
| `muted_text`          | `#52525b` (zinc-600)                                |
| `error`               | `#dc2626` (red-600)                                 |
| `font_display`        | Poppins 700/800/900                                 |
| `font_body`           | Poppins 400/500/600                                 |
| `font_mono`           | JetBrains Mono 500 (tally counts only)              |
| `border_radius_card`  | `2.5rem` (40px) — canonical card corner             |
| `border_radius_input` | `1rem` (16px) — inputs / buttons                    |
| `shadow_card`         | `shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_1px_2px_rgba(0,0,0,0.06)]` |
| `shadow_hero`         | `shadow-[0_4px_24px_rgba(0,0,0,0.06)]` (winner card) |

Full extraction including motion, decorative motifs, and anti-patterns: see `.claude/screenshots/reference/styles.md`.

---

## Screens

| # | Screen                      | Path                | Auth required? | Role         | Purpose                                                                 |
|---|-----------------------------|---------------------|---------------|--------------|-------------------------------------------------------------------------|
| 1 | Sign-in                     | `/signin`           | No            | Anyone       | Magic-link email entry → "check your inbox" confirmation.                |
| 2 | Auth callback               | `/auth/callback`    | (transient)   | Anyone       | Server-side token exchange; transient loading state only.               |
| 3 | Home (no round)             | `/` (state A)       | Yes           | Member       | "No round is open yet — ask your organizer to open one."                |
| 3 | Home (no round, organizer)  | `/` (state B)       | Yes           | Organizer    | Same message + a primary CTA "Open a round".                            |
| 3 | Home (round open)           | `/` (state C)       | Yes           | Any          | Redirects to `/rounds/[current_open_id]`.                               |
| 4 | Open-round form             | `/rounds/new`       | Yes           | Organizer    | Title input + closing-date picker → opens the round.                    |
| 5 | Round detail (open)         | `/rounds/[id]`      | Yes           | Any          | Proposals list + tally + propose form + vote toggles + remaining pill.  |
| 5 | Round detail (closed)       | `/rounds/[id]`      | Yes           | Any          | Winner card + read-only proposals (with final counts).                  |

States layered on the screens above (not separate routes):
  - Empty proposals (open round, zero proposals yet) → in-place empty state on screen 5.
  - Close-round confirm dialog → modal on screen 5 (organizer only).
  - Toast notifications → 4 server-guardrail errors + 3 success messages (signed in, vote cast, round opened).

---

## Wireframes

Mobile-first (the reference is a mobile capture). Each wireframe shows the layout at ~390px viewport; cards stretch wider on tablet/desktop.

### Screen 1 — `/signin` (magic-link)

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│        Reading List Vote             │  ← Poppins 900, 4xl, ink
│        ─────────────                 │
│        Pick the book.                │  ← Poppins 700, 2xl, ink
│        Honestly.                     │
│                                      │
│                                      │
│   ┌────────────────────────────┐     │  ← surface card, rounded-[2.5rem]
│   │                            │     │     p-8, shadow_card
│   │   Sign in to vote          │     │
│   │   ──────────────           │     │
│   │                            │     │
│   │   ┌──────────────────┐     │     │  ← input, rounded-2xl
│   │   │ you@example.com  │     │     │
│   │   └──────────────────┘     │     │
│   │                            │     │
│   │   ┌──────────────────┐     │     │  ← button, lime-400 bg, ink text
│   │   │ Send magic link  │     │     │
│   │   └──────────────────┘     │     │
│   │                            │     │
│   │   No password. We'll email │     │  ← caption, zinc-600, xs
│   │   you a one-tap sign-in    │     │
│   │   link.                    │     │
│   │                            │     │
│   └────────────────────────────┘     │
│                                      │
│                                      │
└──────────────────────────────────────┘

  AFTER SUBMIT (same card, content swaps):

   ┌────────────────────────────┐
   │                            │
   │   ✓ Check your inbox       │  ← lime-600 checkmark + Poppins 700
   │                            │
   │   We sent a sign-in link   │
   │   to you@example.com.      │
   │   Open the email and       │
   │   tap "Sign in".           │
   │                            │
   │   Wrong email? ↩ Try again │  ← text-link, lime-600 underline
   │                            │
   └────────────────────────────┘
```

### Screen 2 — `/auth/callback` (transient)

```
┌──────────────────────────────────────┐
│                                      │
│              ◐                       │  ← simple spinner, lime-400 stroke
│         Signing you in…              │  ← Poppins 600, zinc-600
│                                      │
└──────────────────────────────────────┘
```

Server-side route handler does the actual Supabase token exchange. If exchange succeeds → redirect to `/`. If it fails → redirect to `/signin?error=invalid_link`.

### Screen 3a — `/` (signed-in home, NO round, member view)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │  ← header strip, white surface, sticky
│ │ Reading List Vote      alice ▾   │ │     Poppins 600 brand + display-name pill
│ └──────────────────────────────────┘ │
│                                      │
│   ┌────────────────────────────┐     │  ← empty-state card, rounded-[2.5rem]
│   │                            │     │     surface, p-10, centered text
│   │           ⌂                │     │  ← oversized icon, zinc-300, decorative
│   │                            │     │
│   │   No round is open yet.    │     │  ← Poppins 800, 2xl, ink
│   │                            │     │
│   │   Ask your organizer to    │     │  ← zinc-600, base
│   │   open the next round.     │     │
│   │                            │     │
│   └────────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

### Screen 3b — `/` (signed-in home, NO round, ORGANIZER view)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ Reading List Vote     organizer ▾│ │  ← display-name pill says "organizer"
│ └──────────────────────────────────┘ │     when is_organizer === true
│                                      │
│   ┌────────────────────────────┐     │
│   │                            │     │
│   │   No round is open.        │     │
│   │   Start a new one.         │     │
│   │                            │     │
│   │   ┌──────────────────┐     │     │  ← primary CTA, lime-400 bg
│   │   │  + Open a round  │     │     │     Poppins 700, ink text
│   │   └──────────────────┘     │     │
│   │                            │     │
│   └────────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

### Screen 4 — `/rounds/new` (organizer's "Open a round" form)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ ← Back            organizer ▾    │ │  ← back-arrow lhs, profile rhs
│ └──────────────────────────────────┘ │
│                                      │
│   Open a round                       │  ← page heading, Poppins 800, 3xl, ink
│   ─────────────                      │
│                                      │
│   ┌────────────────────────────┐     │
│   │                            │     │
│   │   Title                    │     │  ← label, Poppins 600, ink
│   │   ┌──────────────────┐     │     │
│   │   │ June 2026        │     │     │  ← input, rounded-2xl, h-14
│   │   └──────────────────┘     │     │
│   │   What to call this round. │     │  ← hint, xs, zinc-500
│   │                            │     │
│   │   Closing date             │     │
│   │   ┌──────────────────┐     │     │
│   │   │ 📅 May 19, 2026  │     │     │  ← shadcn date picker
│   │   └──────────────────┘     │     │
│   │   When members should      │     │
│   │   have proposed and voted  │     │
│   │   by. (You close the round │     │
│   │   manually.)               │     │
│   │                            │     │
│   │   ┌──────────────────┐     │     │
│   │   │   Open round    →│     │     │  ← primary CTA, lime-400
│   │   └──────────────────┘     │     │
│   │                            │     │
│   └────────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

After submit: server action validates → inserts `rounds` row → redirects to `/rounds/[id]`. On duplicate-open: red toast at top with "A round is already open — close it first." and the form stays put.

### Screen 5a — `/rounds/[id]` (OPEN round, member view, with proposals + tally)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ Reading List Vote      alice ▾   │ │
│ └──────────────────────────────────┘ │
│                                      │
│   ┌─────────────────────────────┐    │  ← round-header card, no shadow,
│   │ ● OPEN  ·  closes May 19    │    │     just `ring-1 ring-zinc-200`,
│   │                             │    │     small status dot lime-500
│   │ June 2026                   │    │  ← Poppins 900, 4xl, ink
│   │                             │    │
│   └─────────────────────────────┘    │
│                                      │
│   ┌─────────────────────────────┐    │  ← votes-remaining pill, sticky-ish
│   │   2 / 3  votes left         │    │     bg-lime-50, ring-lime-300
│   │                             │    │     mono digits, Poppins for label
│   └─────────────────────────────┘    │
│                                      │
│   3 books proposed                   │  ← section label, Poppins 600, sm, zinc-600
│                                      │
│   ┌─────────────────────────────┐    │  ← ProposalCard, rounded-[2.5rem]
│   │ 01                  ┌─────┐ │    │     big numeral lhs, tally pill rhs
│   │                     │ 02  │ │    │     numeral: Poppins 900, 6xl, zinc-200
│   │                     └─────┘ │    │     tally: mono 2xl, zinc-50 pill
│   │                             │    │
│   │ Tomorrow, and                │   │  ← title, Poppins 700, xl, ink
│   │ Tomorrow, and Tomorrow      │    │
│   │                             │    │
│   │ Gabrielle Zevin             │    │  ← author, Poppins 500, base, zinc-600
│   │                             │    │
│   │ "Two friends, often in      │    │  ← reason, body, zinc-700
│   │  love but never lovers."    │    │
│   │                             │    │
│   │ Proposed by bob · 2d ago    │    │  ← meta, Poppins 500, xs, zinc-500
│   │                             │    │
│   │ ┌─────────────────────────┐ │    │
│   │ │ ✓ Voted              ✦  │ │    │  ← VoteToggle, lime-400 bg, ink text
│   │ └─────────────────────────┘ │    │     state: voted (filled)
│   └─────────────────────────────┘    │
│                                      │
│   ┌─────────────────────────────┐    │
│   │ 02                  ┌─────┐ │    │
│   │                     │ 01  │ │    │
│   │                     └─────┘ │    │
│   │                             │    │
│   │ Klara and the Sun           │    │
│   │ Kazuo Ishiguro              │    │
│   │                             │    │
│   │ "An artificial friend       │    │
│   │  observes a fragile         │    │
│   │  family from the shop       │    │
│   │  window."                   │    │
│   │                             │    │
│   │ Proposed by alice · 1d ago  │    │
│   │                             │    │
│   │ ┌─────────────────────────┐ │    │  ← VoteToggle, unvoted state
│   │ │   Vote for this         │ │    │     bg-white, ring-zinc-300
│   │ └─────────────────────────┘ │    │     hover: ring-lime-400
│   └─────────────────────────────┘    │
│                                      │
│   ┌─────────────────────────────┐    │
│   │ 03                  ┌─────┐ │    │
│   │                     │ 00  │ │    │  ← zero-tally proposals still look fine
│   │                     └─────┘ │    │
│   │ Piranesi                    │    │
│   │ Susanna Clarke              │    │
│   │ "A labyrinth at the edge    │    │
│   │  of the world."             │    │
│   │ Proposed by alice · 5h ago  │    │
│   │ ┌─────────────────────────┐ │    │
│   │ │   Vote for this         │ │    │
│   │ └─────────────────────────┘ │    │
│   └─────────────────────────────┘    │
│                                      │
│   ─────────────                      │  ← divider, zinc-200
│                                      │
│   Propose a book                     │  ← section heading, Poppins 700, lg
│                                      │
│   ┌─────────────────────────────┐    │
│   │ Title                       │    │  ← stacked form fields
│   │ ┌─────────────────────────┐ │    │
│   │ │                         │ │    │
│   │ └─────────────────────────┘ │    │
│   │                             │    │
│   │ Author                      │    │
│   │ ┌─────────────────────────┐ │    │
│   │ │                         │ │    │
│   │ └─────────────────────────┘ │    │
│   │                             │    │
│   │ Why this one? (optional)    │    │
│   │ ┌─────────────────────────┐ │    │
│   │ │ A short reason — keep   │ │    │  ← textarea, 3 rows, max 500 chars
│   │ │ it under 500 chars.     │ │    │
│   │ └─────────────────────────┘ │    │
│   │ 0 / 500                     │    │  ← character counter, mono, xs
│   │                             │    │
│   │ ┌─────────────────────────┐ │    │
│   │ │   + Add to round        │ │    │  ← secondary CTA, bg-zinc-950 ink-text
│   │ └─────────────────────────┘ │    │     (kept distinct from vote CTAs)
│   └─────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### Screen 5b — `/rounds/[id]` (CLOSED round, winner card hero)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ Reading List Vote      alice ▾   │ │
│ └──────────────────────────────────┘ │
│                                      │
│   ┌─────────────────────────────┐    │  ← header, status now zinc-400 dot
│   │ ○ CLOSED  ·  May 19, 2026   │    │
│   │ June 2026                   │    │
│   └─────────────────────────────┘    │
│                                      │
│   ╔═════════════════════════════╗    │  ← WinnerCard, hero treatment
│   ║                             ║    │     bg-lime-400, ink text
│   ║   01                        ║    │     rounded-[2.5rem], shadow_hero
│   ║                             ║    │     "01" = the winning proposal's slot
│   ║   The winner is             ║    │  ← Poppins 600, sm, ink/70
│   ║                             ║    │
│   ║   Tomorrow, and             ║    │  ← Poppins 900, 4xl, ink
│   ║   Tomorrow, and Tomorrow    ║    │
│   ║                             ║    │
│   ║   Gabrielle Zevin           ║    │  ← Poppins 600, xl, ink/80
│   ║                             ║    │
│   ║   ┌────────┐                ║    │
│   ║   │   3    │ votes          ║    │  ← winner tally, mono numeral
│   ║   └────────┘                ║    │     small white pill on lime
│   ║                             ║    │
│   ║   Proposed by bob           ║    │  ← Poppins 500, xs, ink/70
│   ║   4 of 5 members voted      ║    │
│   ║                             ║    │
│   ╚═════════════════════════════╝    │
│                                      │
│   Final tally                        │  ← section label, Poppins 600, sm
│                                      │
│   ┌─────────────────────────────┐    │  ← read-only ProposalCard variant:
│   │ 01      ┌─────┐    ✦ WINNER │    │     small "✦ WINNER" label,
│   │         │ 03  │             │    │     lime-100 bg tint, no vote button
│   │ Tomorrow, and Tomorrow…     │    │
│   │ Gabrielle Zevin             │    │
│   └─────────────────────────────┘    │
│                                      │
│   ┌─────────────────────────────┐    │  ← other proposals: no winner badge
│   │ 02      ┌─────┐             │    │     no vote button, pure read-only
│   │         │ 01  │             │    │
│   │ Klara and the Sun           │    │
│   │ Kazuo Ishiguro              │    │
│   └─────────────────────────────┘    │
│                                      │
│   ┌─────────────────────────────┐    │
│   │ 03      ┌─────┐             │    │
│   │         │ 00  │             │    │
│   │ Piranesi                    │    │
│   │ Susanna Clarke              │    │
│   └─────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### Screen 5c — `/rounds/[id]` (OPEN round, ZERO proposals — empty state)

```
   round-header card (same as 5a)
   votes-remaining pill (shows 3 / 3)

   ┌─────────────────────────────┐
   │                             │
   │           📖                │  ← icon, zinc-300, oversized decoration
   │                             │
   │   No proposals yet.         │  ← Poppins 800, xl, ink
   │   Be the first to suggest   │
   │   a book.                   │
   │                             │
   └─────────────────────────────┘

   Propose a book                     ← form remains visible below empty state
   (form same as 5a)
```

### Screen 5d — Close-round confirm dialog (organizer overlay)

```
   shadow-2xl overlay
   ┌─────────────────────────────┐
   │ Close this round?           │  ← Poppins 800, xl, ink
   │                             │
   │ This locks voting and       │  ← body, zinc-600
   │ announces the winner.       │
   │ Once closed, no more        │
   │ proposals or vote changes   │
   │ can be made.                │
   │                             │
   │ Current standings:          │
   │  01  Tomorrow, and… — 2 votes  ← mini-tally, mono numerals
   │  02  Klara…         — 1 vote
   │  03  Piranesi       — 0 votes
   │                             │
   │ ┌──────────┐ ┌────────────┐ │
   │ │  Cancel  │ │ Close round│ │  ← Cancel: secondary; Close: lime-400 + ⚠
   │ └──────────┘ └────────────┘ │
   └─────────────────────────────┘
```

The organizer also sees a "Close round" button anchored at the bottom of screen 5a (sticky `bottom-4`, lime-50 bg + lime-600 text — distinct from member CTAs).

### Toast notifications (overlay, top-right, ~360px wide)

Four error toasts wired 1-to-1 to S5's server guardrails:

```
   ┌─────────────────────────────┐
   │ ⚠  You have used all 3      │  ← bg-red-50, ring-red-200, ink red-900
   │    votes — withdraw one to  │     Poppins 600, sm
   │    vote again.              │
   │                          ✕  │
   └─────────────────────────────┘

   ┌─────────────────────────────┐
   │ ⚠  You already voted for    │
   │    this book.               │
   │                          ✕  │
   └─────────────────────────────┘

   ┌─────────────────────────────┐
   │ ⚠  This round is closed.    │
   │                          ✕  │
   └─────────────────────────────┘
```

Three success toasts (same shape, `bg-lime-50` + `text-lime-900`):

```
   ✓ Vote cast on "Klara and the Sun".
   ✓ Round opened. Members can now propose.
   ✓ Round closed. Winner: "Tomorrow…".
```

---

## Component Hierarchy

```
src/app/
  layout.tsx                              ← root: Poppins + JetBrains Mono fonts,
                                            <body class="bg-zinc-100 text-zinc-950">
  globals.css                             ← @font-face declarations, design tokens
                                            as CSS vars + Tailwind theme extend
  page.tsx                                ← home: server-side branches per state
  signin/
    page.tsx                              ← uses MagicLinkForm
  auth/
    callback/
      route.ts                            ← server-only: token exchange, redirect
  rounds/
    new/
      page.tsx                            ← organizer-only, uses OpenRoundForm
    [id]/
      page.tsx                            ← branches on round.status (open/closed)
  api/
    rounds/route.ts                       ← POST /api/rounds
    rounds/[id]/close/route.ts            ← PATCH /api/rounds/[id]/close
    proposals/route.ts                    ← POST /api/proposals
    votes/route.ts                        ← POST + DELETE /api/votes

src/components/
  ui/                                     ← shadcn primitives — DO NOT re-skin generic
    button.tsx                            ← restyled: lime-400 bg primary variant,
                                            zinc-950 secondary, rounded-2xl, h-14
    input.tsx                             ← rounded-2xl, h-14, border-zinc-200
    textarea.tsx                          ← rounded-2xl, min-h-24
    label.tsx                             ← Poppins 600, sm, ink
    dialog.tsx                            ← rounded-[2.5rem], shadow-hero, p-8
    toast.tsx + toaster.tsx               ← rounded-[2rem], variant-aware bg
    badge.tsx                             ← used for status dot + "WINNER" tag

  layout/
    AppHeader.tsx                         ← sticky top, brand lhs, ProfileMenu rhs
    ProfileMenu.tsx                       ← display-name pill + sign-out
    PageShell.tsx                         ← max-w-3xl mx-auto px-4 md:px-8, gap-6

  features/
    auth/
      MagicLinkForm.tsx                   ← email input + submit + "check inbox" state
      AuthCallbackSpinner.tsx             ← the lime spinner on /auth/callback

    rounds/
      NoActiveRoundEmpty.tsx              ← "no round" empty state (screen 3a / 3b
                                            variants — accepts is_organizer prop)
      RoundHeader.tsx                     ← status dot + closing date + title
      OpenRoundForm.tsx                   ← title + date picker + submit (screen 4)
      CloseRoundButton.tsx                ← sticky bottom button + CloseRoundDialog
      CloseRoundDialog.tsx                ← the confirm overlay (screen 5d)
      WinnerCard.tsx                      ← the hero card on closed rounds (screen 5b)

    proposals/
      ProposalCard.tsx                    ← numbered card; props: { proposal,
                                            slot_index, tally, my_vote, is_round_open,
                                            is_winner }
      ProposalsList.tsx                   ← maps proposals → ProposalCards, ordered
                                            by created_at; numbers them 01, 02, 03…
      ProposeBookForm.tsx                 ← title/author/reason/char-counter
      EmptyProposalsState.tsx             ← the "be the first" empty (screen 5c)

    votes/
      VoteToggle.tsx                      ← the in-card toggle; props: { is_voted,
                                            disabled, remaining }
      VotesRemainingPill.tsx              ← "2 / 3 votes left" indicator on
                                            screen 5a (sticky-ish at top of list)

    common/
      BigNumeral.tsx                      ← reusable "01" / "02" decorative numeral
                                            (also used by WinnerCard)
      TallyPill.tsx                       ← small mono numeric pill on ProposalCard
      StatusDot.tsx                       ← lime-500 (open) / zinc-400 (closed)

  lib/
    supabase/
      server.ts                           ← createServerClient() w/ cookies
      client.ts                           ← createBrowserClient() for client comps
    auth/
      session.ts                          ← getSession() + getUser() helpers
    actions/
      rounds.ts                           ← openRound, closeRound (server actions
                                            backing the Route Handlers + forms)
      proposals.ts                        ← addProposal
      votes.ts                            ← castVote, withdrawVote
    queries/
      tally.ts                            ← getRoundWithProposalsAndTally()
                                            (single round-trip; consumed by
                                            /rounds/[id]/page.tsx)
    types.ts                              ← shared Round / Proposal / Vote shapes
```

---

## Key Interactions

### Sign-in flow (cold start)

1. **Visit any path while signed out** → middleware redirects to `/signin`.
2. **`/signin` → submit email** → `MagicLinkForm` calls `supabase.auth.signInWithOtp({ email })` → form swaps to "Check your inbox" state (no navigation).
3. **Click email link** → lands on `/auth/callback?code=...` → server route handler exchanges code → sets cookie → `redirect('/')`.
4. **`/` server component** reads session → branches:
   - No session (shouldn't happen — middleware would have caught) → redirect to `/signin?error=session_expired`.
   - Session + no round open → render `NoActiveRoundEmpty` (member or organizer variant).
   - Session + an open round → `redirect('/rounds/' + open_round_id)`.
5. **Sign out:** `ProfileMenu` → "Sign out" → server action signs out → redirect to `/signin`.

### Organizer opens a round

1. **Home → "Open a round" CTA** → navigates to `/rounds/new`.
2. **Submit `OpenRoundForm`** → server action `openRound({ title, closing_date })` → validates with Zod → inserts into `rounds`.
3. **DB rejects duplicate-open** (partial unique index) → action throws → form catches → red toast "A round is already open — close it first." + form stays put.
4. **Success** → `redirect('/rounds/' + new_id)` → user lands on the open round detail.

### Member proposes a book

1. **`/rounds/[id]` → fill `ProposeBookForm`** → submit calls server action `addProposal({ round_id, title, author, reason })`.
2. **Server validates** with Zod → enforces title + author non-empty, reason ≤ 500 chars → insert with `proposer_id` from session (NOT from request).
3. **RLS predicate** on `proposals.INSERT` checks `rounds.status = 'open'`. On a closed round (stale tab), insert is rejected → server returns "This round is closed." → red toast.
4. **Success** → `revalidatePath('/rounds/[id]')` → server re-fetches via `getRoundWithProposalsAndTally()` → new proposal appears in the list with slot number `proposals.length + 1`.

### Member casts / changes / withdraws a vote

1. **`/rounds/[id]` → click `VoteToggle` on a proposal card.**
2. **If currently NOT voted on this book:**
   - Server action `castVote({ proposal_id })` → DB trigger checks `(round_id, voter_id)` count < 3, RLS checks `rounds.status = 'open'`.
   - On 4th-vote attempt → trigger raises → server returns "You have used all 3 votes — withdraw one to vote again." → red toast, optimistic UI rolls back.
   - On double-vote → `UNIQUE (proposal_id, voter_id)` violation → server returns "You already voted for this book." → red toast (rare in practice since UI disables, but the server is the gate).
   - On closed-round → RLS rejects → server returns "This round is closed." → red toast.
   - On success → toggle visually flips to lime-400 filled, tally pill increments, `VotesRemainingPill` decrements (and turns deep lime if it hits 0).
3. **If currently voted (toggle is filled):**
   - Server action `withdrawVote({ proposal_id })` → DELETE row → revalidate.
   - Toggle flips to unvoted, tally decrements, remaining count increments.

### Organizer closes a round

1. **`/rounds/[id]` → sticky "Close round" button** (organizer only, only when status = 'open').
2. **`CloseRoundDialog` opens** showing a mini-tally so the organizer can confirm with full information.
3. **Click "Close round"** → server action `closeRound({ round_id })`:
   - Verify organizer via session + `users.is_organizer`.
   - Compute winner: `SELECT proposal_id FROM votes WHERE round_id = ? GROUP BY proposal_id ORDER BY count(*) DESC, MIN(proposals.created_at) ASC LIMIT 1` (tie-break by earliest `created_at`).
   - Update `rounds.status = 'closed'` and `rounds.winner_proposal_id = ?`.
4. **`revalidatePath('/rounds/[id]')`** → page re-renders in the "closed" branch → `WinnerCard` animates in (scale + fade per motion spec).
5. **Members on other tabs** that try to act after this point hit the RLS lockdown and get the "This round is closed." toast.

### Empty / error states summary

| State                    | Where rendered            | Component                |
|--------------------------|---------------------------|--------------------------|
| Not signed in            | Middleware redirect       | (no UI — server-side)    |
| No round open (member)   | `/` home page             | `NoActiveRoundEmpty`     |
| No round open (organizer)| `/` home page             | `NoActiveRoundEmpty` w/ CTA |
| No proposals yet         | `/rounds/[id]` (open)     | `EmptyProposalsState`    |
| Round not found / 404    | `/rounds/[id]` not-found  | shadcn-style 404 page    |
| Duplicate-open round     | `/rounds/new` after submit| inline red toast         |
| 4 server-guardrail errors| `/rounds/[id]`             | toasts (top-right)       |

---

## Notes for the frontend agent in /develop

  - **Match the reference image (`rootcode.io_.png`)** for spatial composition: big rounded cards on a gray canvas, generous spacing, large display type, numbered motifs. The frontend agent's PostToolUse screenshot diff should target these proportions.
  - **Lime is the ONLY accent.** No second accent color. No purple gradients.
  - **`shadow_card` is subtle** — close to `shadow-sm` but warmer. Do not use `shadow-lg` or `shadow-xl` on cards.
  - **Mono digits matter** for the tally numerals — they align visually in the column. Don't substitute Poppins for the tally numbers.
  - **Big numerals on proposal cards** are decorative (`zinc-200`, `text-6xl`, `font-black`). They aren't clickable. The vote toggle is the interactive surface.
  - **Vote toggle states:** unvoted = white card + `ring-zinc-300`; voted = `bg-lime-400 text-zinc-950`. Hover on unvoted: `ring-lime-400 ring-2`. Disabled (round closed): `opacity-50 cursor-not-allowed`.
  - **Sticky elements:** `AppHeader` sticky top, `VotesRemainingPill` floats just below header (not fully sticky — visible on first scroll, scrolls off after that). `CloseRoundButton` sticky bottom for organizers only.
  - **Animation discipline:** one orchestrated stagger reveal on page entry (300ms total) and one celebration on round close (400ms). Vote toggle has a tiny 150ms color crossfade. Nothing else animates.

---HANDOFF---
agent:              ux
completed:          wireframes + tokens + component tree + interactions produced
use_reference:      true
reference_files:    rootcode.io_.png (aesthetic target), styles.md (token system)
screens:            7 (signin, callback, home×3 states, open-round form, round detail × 2 states), plus close-confirm dialog and 4+3 toasts
components:         ~22 (3 layout, 11 feature, 5 shared, 7 ui restyled)
modules:            none from the optional-modules list — pure core stack
issues:             Lime is the ONLY accent (no second color). Mono digits for tallies are non-negotiable (visual alignment in the column). Closed-round lockdown must hide all write controls AND the server must reject any write that slips through.
next:               Run /develop — frontend subagent must (a) install Poppins + JetBrains Mono, (b) restyle shadcn primitives per styles.md, (c) match the rootcode.io card+spacing+typography proportions, (d) pixel-diff its screenshots against `.claude/screenshots/reference/rootcode.io_.png` for general composition direction (not pixel-perfect — it's an aesthetic target, not a target screen).
---END---
