# Design Tokens — Team Reading List Vote

Inferred from `rootcode.io_.png` (reference) + the CSS dump pasted by the user during /ux intake.

## Aesthetic direction
**Modern product-studio.** Big bold sans-serif headlines on an off-white canvas; raised white cards with chunky rounded corners; lime green as the single bold accent; numbered/numeric motifs as decorative content. Generous whitespace. NOT literary/serif/paper. NOT shadcn defaults.

## Color tokens

| Token            | Value      | Tailwind class    | Where used                                                |
|------------------|------------|-------------------|-----------------------------------------------------------|
| `--bg`           | `#f4f4f4`  | `bg-zinc-100`     | Page background (the "canvas")                            |
| `--bg-alt`       | `#f4f4f5`  | `bg-zinc-100`     | Subtle alternate panels                                   |
| `--surface`      | `#ffffff`  | `bg-white`        | Cards (proposals, winner card, forms, dialogs)            |
| `--ink`          | `#0a0a0a`  | `text-zinc-950`   | Primary text, headlines                                   |
| `--ink-muted`    | `#52525b`  | `text-zinc-600`   | Secondary text, captions, "proposed by X"                 |
| `--ink-subtle`   | `#a1a1aa`  | `text-zinc-400`   | Hints, placeholders, dividers                             |
| `--accent`       | `#a3e635`  | `bg-lime-400`     | Primary CTA fill, vote-cast state, votes-remaining pill   |
| `--accent-hover` | `#84cc16`  | `bg-lime-500`     | Hover/active state on accent                              |
| `--accent-ink`   | `#1a2e05`  | `text-lime-950`   | Text ON the accent fill (high-contrast on lime)           |
| `--border`       | `#e4e4e7`  | `border-zinc-200` | Card borders (when used), input borders                   |
| `--success`      | `#65a30d`  | `text-lime-600`   | Winner indicator, success toasts                          |
| `--danger`       | `#dc2626`  | `text-red-600`    | Server-guardrail error toasts (4th vote, double-vote)     |
| `--danger-bg`    | `#fef2f2`  | `bg-red-50`       | Error toast background                                    |

## Typography

| Role        | Family                        | Weights used     | Notes                                                  |
|-------------|-------------------------------|------------------|--------------------------------------------------------|
| Display     | **Poppins**                   | 700 / 800 / 900  | Headlines: page titles, proposal titles, winner title  |
| Body        | **Poppins**                   | 400 / 500 / 600  | Paragraphs, form labels, descriptions                  |
| Numeric/UI  | **JetBrains Mono** (proposal) | 500              | Vote tally counts, ticket IDs in dev tooling, badges   |

Display + body share Poppins as in the reference. Mono is added for tally readability (mono digits align visually — important when proposals are listed in a column with counts).

If JetBrains Mono adds load weight we don't want, fall back to a Tailwind `font-mono` system stack — but explicit mono numerals on tallies is the goal.

## Spacing / Layout

- **Radius scale:**
  - `rounded-3xl` → 1.5rem (24px) — inputs, buttons, small pills
  - `rounded-[2rem]` → 2rem (32px) — small cards (vote toggles, indicators)
  - `rounded-[2.5rem]` → 2.5rem (40px) — **canonical card radius** (proposals, winner card, dialogs)
- **Gap between cards:** `gap-6` (24px) mobile, `gap-8` (32px) desktop
- **Card padding:** `p-6` (24px) mobile, `p-8` (32px) desktop
- **Page gutter:** `px-4` mobile, `px-8` tablet, `px-12` desktop, `max-w-3xl mx-auto` for content

## Shadow

- **Subtle elevation** on cards: `shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_1px_2px_rgba(0,0,0,0.06)]` (close to Tailwind `shadow-sm` but slightly warmer)
- **Pressed/active card:** no shadow, slight inner border `ring-1 ring-zinc-200`
- **Winner card / hero card:** `shadow-[0_4px_24px_rgba(0,0,0,0.06)]` (a bit more lift)

## Motion

- Page entry: stagger reveal on cards with `animation-delay` 60ms apart, slide-up `translate-y-2 → 0` + fade-in `opacity-0 → 1` over 300ms.
- Vote toggle: scale `1 → 0.97 → 1` on click, color crossfade `bg-white → bg-lime-400` over 150ms.
- Winner card reveal (closed round first render): scale `0.96 → 1` + fade-in 400ms, single time only.
- Hover on interactive cards: lift `translate-y-0 → -translate-y-[2px]`, shadow steps up one notch.

## Decorative motifs

- **Big numerals on every proposal card** ("01", "02", "03" — sequenced by `proposals.created_at`). These do double duty as the tie-break visual cue ("the smallest number wins ties").
- **Vote tally** rendered as a large mono numeral inside a small `rounded-3xl bg-zinc-50` pill at the top-right of each proposal card.
- **"Votes remaining" indicator** on the round detail page: a sticky lime pill with mono digits — `2 / 3 votes left`. Becomes deep-lime when 0 remaining.
- **Winner card** uses an oversized numeral (the proposal's slot number, e.g. "01") and the lime accent as a backdrop wash behind the title.

## Anti-patterns (do NOT do these)

- ❌ Purple gradients, indigo-to-pink, generic SaaS "AI" gradients.
- ❌ Serif fonts.
- ❌ Sharp 4px / 6px corners on cards.
- ❌ Drop shadows so dark they look like Material Design.
- ❌ Tiny vote-count badges hidden in a corner — the tally is a feature, give it size.
- ❌ Bar-chart visualizations of the tally — keep it numeric (matches reference's restraint).
- ❌ Blue as the primary accent. Lime is the only accent.
