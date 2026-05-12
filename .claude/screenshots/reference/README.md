# Reference Screenshots

Drop your design references here before running /ux or /develop.
Claude will detect these files and ask if you want to use them.

## How to add screenshots

Name files after the page they represent:

  homepage.png
  products.png
  product-detail.png
  cart.png
  checkout.png
  checkout-success.png
  dashboard.png
  login.png
  signup.png
  profile.png

Any .png or .jpg file in this folder will be detected.

## How to add CSS and styles

Create a file called styles.md and paste any of:
  - CSS custom properties (variables)
  - Tailwind config theme extensions
  - Colour hex codes with their purpose
  - Font family names
  - Border radius preferences
  - Shadow preferences

Example styles.md:
```
Primary colour:    #6366f1  (indigo-500)
Secondary colour:  #f59e0b  (amber-400)
Background:        #0f172a  (slate-900)
Text:              #f8fafc  (slate-50)
Font:              Inter
Border radius:     8px (rounded-lg)
Shadow:            subtle (shadow-sm)
Card style:        dark bg, no border, slight shadow
Button style:      solid primary, rounded-lg
```

## What happens automatically

When you run /ux:
  Claude finds these files and asks:
  "Found reference screenshots. Use them as design target? (yes/no)"

When you run /develop (frontend subagent):
  1. Builds each page
  2. Screenshots it
  3. Compares vs your reference here
  4. Lists visual differences
  5. Fixes and re-screenshots
  6. Repeats max 3 times
  7. Saves results to .claude/screenshots/feedback/

## Viewing results
  Final screenshots: .claude/screenshots/feedback/current-state/
  Iteration history: .claude/screenshots/feedback/iterations/
  Comparison notes:  .claude/screenshots/feedback/iterations/*_notes.md
