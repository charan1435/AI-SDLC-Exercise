---
description: Wireframes, design references, component plan
argument-hint: "(no arguments — interactive: prompts for screenshots and styles)"
allowed-tools: Read, Write, Glob, Grep, Skill
---

# /ux — Wireframes, Design References, Component Plan

You are the UX phase.
Your job is to plan the UI, collect design references from the user,
and produce wireframes before any code is written.
You do NOT write application code.

---

## Step 0 — Load design principles (REQUIRED, run first)

Invoke the `frontend-design` skill via the Skill tool BEFORE any other step:

  Skill(skill="frontend-design:frontend-design")

This loads production-grade design principles that must inform every
wireframe, component choice, design token, and interaction pattern you
plan below. Do NOT skip this — it is what prevents generic AI-looking UI.

---

## Step 1 — Read prior context
Use the Read tool to load:
  .claude/context/plan-output.md
  .claude/context/adr-output.md

If plan-output.md does not exist:
  Print: "⚠️  No plan found. Run /plan first."
  Stop.

---

## Step 2 — Check for reference screenshots

Check if .claude/screenshots/reference/ contains any .png or .jpg files.

### IF reference screenshots ARE found:
List the files found and ask the user:

"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 Reference screenshots found:
   [list each filename]

Would you like me to use these as the design target?
I will build the UI to match these screenshots.

Type YES to use them
Type NO to ignore them and use sensible defaults
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Wait for user response before continuing.
If YES → set USE_REFERENCE=true
If NO  → set USE_REFERENCE=false

### IF no reference screenshots are found:
Ask the user:

"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 No reference screenshots found.

Do you have a design you would like me to match?

  1. I will add screenshots now
     → Copy them to .claude/screenshots/reference/
     → Name them after the page: homepage.png, products.png etc.
     → Type DONE when ready

  2. No screenshots — use sensible defaults
     → Type DEFAULT

What would you like to do?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Wait for user response.
If DONE → check folder again, set USE_REFERENCE=true
If DEFAULT → set USE_REFERENCE=false

---

## Step 3 — Ask for CSS and style tokens

Ask the user:

"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Do you have CSS or style tokens to share?

This could be:
  - CSS variables (colours, fonts, spacing)
  - Tailwind config with custom theme
  - Specific colour hex codes
  - Font family names
  - Component style examples

Paste them here now, or type SKIP to continue with defaults:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Wait for user response.

If user pastes styles:
  Save to .claude/screenshots/reference/styles.md
  Acknowledge: "✓ Styles saved to .claude/screenshots/reference/styles.md"
  Extract key tokens:
    - Primary colour
    - Secondary colour
    - Background colour
    - Font family
    - Border radius style
    - Shadow style
  Map each token to its Tailwind equivalent.

If user types SKIP:
  Use sensible defaults and note them.

---

## Step 4 — Identify all screens
Based on plan-output.md features, list every screen needed.

For each screen:
  - Screen name
  - URL path
  - Purpose (one line)
  - Key UI elements it contains

---

## Step 5 — Produce ASCII wireframes
For each screen produce a clear ASCII wireframe.

Example format:
┌─────────────────────────────────────┐
│  NAVBAR: Logo | Products | Cart (3) │
├─────────────────────────────────────┤
│  HERO: Title + subtitle + CTA btn   │
├──────────────┬──────────────────────┤
│  FILTERS     │  PRODUCT GRID        │
│  □ Category  │  [Card][Card][Card]  │
│  □ Price     │  [Card][Card][Card]  │
│              │  < 1 2 3 >           │
└──────────────┴──────────────────────┘

---

## Step 6 — Define component hierarchy
List every reusable component needed.

Format:
  Layout/
    Navbar.tsx        — logo, nav links, cart icon, auth state
    Footer.tsx        — links, copyright

  Features/
    products/
      ProductCard.tsx   — image, name, price, add-to-cart button
      ProductGrid.tsx   — responsive grid of ProductCards
      ProductFilter.tsx — category and price filter sidebar

  UI/  (shadcn/ui base — do not recreate these)
    Button, Card, Dialog, Input, Badge, Toast

---

## Step 7 — Define interaction flows
List the key interactions and what happens:

  User clicks "Add to Cart"
  → CartDrawer slides in from right
  → Item appears with quantity control
  → Toast notification confirms

  User clicks "Checkout"
  → Requires auth — redirect to /login if not signed in
  → Checkout form with order summary
  → Stripe payment form loads
  → On success → redirect to /checkout/success

---

## Step 8 — Write output file
Save to .claude/context/ux-output.md

Format:
---
# UX Output
generated: [timestamp]
use_reference_screenshots: [true/false]
reference_files: [list if any]
styles_provided: [true/false]

## Design Tokens
  primary_colour:   [hex or Tailwind class]
  secondary_colour: [hex or Tailwind class]
  background:       [hex or Tailwind class]
  font:             [family name]
  border_radius:    [sharp / rounded / pill]
  shadow:           [none / subtle / elevated]

## Screens
  [list each: name, path, purpose]

## Component Tree
  [full hierarchy]

## Key Interactions
  [list]

---HANDOFF---
agent:              ux
completed:          wireframes produced, design tokens extracted
use_reference:      [true/false]
reference_files:    [list]
screens:            [count] screens defined
components:         [count] components planned
next:               Run /develop — frontend subagent must
                    match wireframes and reference screenshots
---END---
---

---

## Step 9 — Tell the user

Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /ux complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screens:    [count] wireframed
Components: [count] planned
References: [using / not using]
Styles:     [provided / defaults]
Output:     .claude/context/ux-output.md

Handing off to /commit. Next phase after that: /develop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


## Step — Hand off to /commit (mandatory)

After the banner above, invoke the commit skill so the user reviews and
explicitly confirms before any change is committed or pushed:

  Skill(skill="commit")

Do NOT proceed to the next phase or print any other "next step" message
before /commit returns. Project policy: no subagent or main command
commits or pushes on its own.
