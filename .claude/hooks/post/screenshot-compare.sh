#!/bin/bash
# POST-HOOK: SCREENSHOT COMPARE / SELF-REVIEW
#
# Two modes:
#
#  1. Reference mode  (.claude/screenshots/reference/*.png exists)
#     Pixel-diffs every reference against the current screenshot using
#     ImageMagick `compare` (RMSE metric). Notes go to iterations/.
#
#  2. Self-review mode  (no references present)
#     Emits a notes file listing every captured screenshot and prompting
#     the frontend agent to read each PNG and evaluate it against
#     ux-output.md design tokens, wireframes, and the frontend-design
#     skill's principles. Max 3 iterations per page.
#
# The notes path is printed to stdout so the calling agent can Read it.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "POST-HOOK: screenshot-compare running..."

REF_DIR=".claude/screenshots/reference"
CURRENT_DIR=".claude/screenshots/feedback/current-state"
ITER_DIR=".claude/screenshots/feedback/iterations"
MANIFEST="$CURRENT_DIR/.captured.txt"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$ITER_DIR" "$CURRENT_DIR"

# Are there any reference PNGs?
HAS_REFS=false
if compgen -G "$REF_DIR/*.png" > /dev/null 2>&1; then
  HAS_REFS=true
fi

# Did capture produce any screenshots?
HAS_CAPTURES=false
if [ -s "$MANIFEST" ]; then
  HAS_CAPTURES=true
fi

# ---------------------------------------------------------------------------
# Self-review mode — no references provided
# ---------------------------------------------------------------------------
if [ "$HAS_REFS" != true ]; then
  NOTES="$ITER_DIR/${TIMESTAMP}_self_review.md"

  if [ "$HAS_CAPTURES" != true ]; then
    echo -e "${YELLOW}No reference screenshots and no captures available — nothing to review.${NC}"
    exit 0
  fi

  {
    echo "# Visual Self-Review — $TIMESTAMP"
    echo ""
    echo "No reference screenshots were supplied. The frontend agent should"
    echo "read each captured PNG and evaluate it against:"
    echo ""
    echo "  - .claude/context/ux-output.md  (wireframes + design tokens — fonts, colors, radii, motion)"
    echo "  - frontend-design skill principles (typography, color, motion, spatial composition)"
    echo ""
    echo "For each screenshot, decide if any of these are off:"
    echo "  - Wrong font family / weight"
    echo "  - Wrong color (paper / ink / ochre / hairline / oxblood — exact hex)"
    echo "  - Wrong border radius (sharp 2px expected, no chunky rounded-2xl)"
    echo "  - Layout drift vs the wireframe"
    echo "  - Missing focus states / a11y issues"
    echo "  - Empty / broken / unstyled regions"
    echo ""
    echo "If anything is off: fix the component, re-run \`npm run dev\` (which"
    echo "re-triggers capture), and re-read this notes file. Max 3 iterations"
    echo "per page."
    echo ""
    echo "## Captured screenshots"
    while IFS= read -r p || [ -n "$p" ]; do
      [ -z "$p" ] && continue
      page=$(basename "$p" .png)
      echo "  - **$page** — \`$p\`"
    done < "$MANIFEST"
    echo ""
    echo "## Action required"
    echo "Read each PNG file above (the Read tool returns image content for PNGs)."
  } > "$NOTES"

  COUNT=$(wc -l < "$MANIFEST" 2>/dev/null | tr -d ' ')
  echo -e "${GREEN}Self-review notes written for ${COUNT:-0} screenshot(s):${NC}"
  echo "  $NOTES"
  exit 0
fi

# ---------------------------------------------------------------------------
# Reference mode — pixel-diff each reference against current
# ---------------------------------------------------------------------------
NOTES="$ITER_DIR/${TIMESTAMP}_comparison_notes.md"

{
  echo "# Screenshot Comparison — $TIMESTAMP"
  echo ""
} > "$NOTES"

DIFFS=false

for REF in "$REF_DIR"/*.png; do
  PAGE=$(basename "$REF" .png)
  CURRENT="$CURRENT_DIR/${PAGE}.png"

  echo "## $PAGE" >> "$NOTES"

  if [ ! -f "$CURRENT" ]; then
    echo "- No current screenshot found for this page" >> "$NOTES"
    echo -e "${YELLOW}no current screenshot for: $PAGE${NC}"
    echo "" >> "$NOTES"
    continue
  fi

  if command -v compare &> /dev/null; then
    DIFF_IMG="$ITER_DIR/${TIMESTAMP}_diff_${PAGE}.png"
    SCORE=$(compare -metric RMSE "$REF" "$CURRENT" "$DIFF_IMG" 2>&1 | awk '{print $1}')

    echo "- Difference score: $SCORE (threshold: 10)" >> "$NOTES"

    if awk "BEGIN{exit !($SCORE > 10)}" 2>/dev/null; then
      echo "- Status: needs fixing" >> "$NOTES"
      echo -e "${RED}$PAGE needs fixing (score: $SCORE)${NC}"
      DIFFS=true
    else
      echo "- Status: matches reference" >> "$NOTES"
      echo -e "${GREEN}$PAGE matches reference${NC}"
    fi
  else
    echo "- ImageMagick \`compare\` not installed — manual review needed" >> "$NOTES"
    echo -e "${YELLOW}install ImageMagick for pixel comparison${NC}"
  fi

  echo "" >> "$NOTES"
done

{
  echo "## Summary"
  if [ "$DIFFS" = true ]; then
    echo "Pages with differences require UI fixes."
  else
    echo "All compared pages match their references."
  fi
} >> "$NOTES"

if [ "$DIFFS" = true ]; then
  echo -e "${YELLOW}differences found. notes: $NOTES${NC}"
else
  echo -e "${GREEN}all pages match reference. notes: $NOTES${NC}"
fi

exit 0
