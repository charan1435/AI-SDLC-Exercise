#!/bin/bash
# POST-HOOK: SCREENSHOT CAPTURE
# Captures screenshots of the running app for the frontend feedback loop.
#
# Pages captured:
#   - If .claude/screenshots/pages.config exists, one path per line (e.g. "/login")
#     or "PATH:NAME" pairs (e.g. "/:dashboard"). Use this for project-specific
#     route lists.
#   - Otherwise: a generic fallback covering common app shapes (/, /login,
#     /signup, /dashboard, /products, /cart, /checkout).
#
# Captured PNGs land in:
#   .claude/screenshots/feedback/current-state/<name>.png   (latest)
#   .claude/screenshots/feedback/iterations/<ts>_<name>.png (history)
#
# The captured-paths manifest is written to:
#   .claude/screenshots/feedback/current-state/.captured.txt
# so downstream hooks and the frontend agent can read it.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "POST-HOOK: screenshot-capture running..."

CURRENT_DIR=".claude/screenshots/feedback/current-state"
ITER_DIR=".claude/screenshots/feedback/iterations"
CONFIG_FILE=".claude/screenshots/pages.config"
MANIFEST="$CURRENT_DIR/.captured.txt"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PORT="${DEV_PORT:-3000}"
BASE_URL="http://localhost:$PORT"

mkdir -p "$CURRENT_DIR" "$ITER_DIR"

# Wait briefly for dev server to come up (handles `npm run dev &` async starts)
SERVER_UP=false
for _ in 1 2 3 4 5; do
  if curl -s --head --max-time 2 "$BASE_URL" > /dev/null 2>&1; then
    SERVER_UP=true
    break
  fi
  sleep 1
done

if [ "$SERVER_UP" != true ]; then
  echo -e "${YELLOW}Dev server not running on port $PORT. Skipping capture.${NC}"
  exit 0
fi

# Load page list — project config wins, else generic fallback
PAGES=()
if [ -f "$CONFIG_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip blanks and comments
    line="${line#"${line%%[![:space:]]*}"}"
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    # Allow "/path" or "/path:name"
    if [[ "$line" == *:* ]]; then
      PAGES+=("$line")
    else
      # Derive a name from the path: strip leading /, replace / with _, '' → 'home'
      path="${line}"
      name="${path#/}"
      name="${name//\//_}"
      [ -z "$name" ] && name="home"
      PAGES+=("$path:$name")
    fi
  done < "$CONFIG_FILE"
fi

if [ "${#PAGES[@]}" -eq 0 ]; then
  PAGES=(
    "/:home"
    "/login:login"
    "/signup:signup"
    "/dashboard:dashboard"
    "/products:products"
    "/cart:cart"
    "/checkout:checkout"
  )
fi

if ! command -v npx &> /dev/null || [ ! -f "package.json" ]; then
  echo -e "${YELLOW}npx or package.json missing. Skipping capture.${NC}"
  exit 0
fi

# Clear the previous manifest
: > "$MANIFEST"

for entry in "${PAGES[@]}"; do
  PATH_PART="${entry%%:*}"
  NAME_PART="${entry##*:}"
  OUTPUT="$CURRENT_DIR/${NAME_PART}.png"

  # Probe the route — capture both 200 and redirected pages (3xx → final 2xx via curl -L)
  STATUS=$(curl -s -o /dev/null -L -w "%{http_code}" --max-time 5 "$BASE_URL$PATH_PART" 2>/dev/null)

  if [[ "$STATUS" == 2* ]]; then
    if npx --yes playwright screenshot --browser chromium --full-page \
         --wait-for-timeout 1000 "$BASE_URL$PATH_PART" "$OUTPUT" 2>/dev/null; then
      if [ -f "$OUTPUT" ]; then
        cp "$OUTPUT" "$ITER_DIR/${TIMESTAMP}_${NAME_PART}.png"
        echo "$OUTPUT" >> "$MANIFEST"
        echo -e "${GREEN}captured: $NAME_PART  ($PATH_PART)${NC}"
      fi
    else
      echo -e "${YELLOW}playwright failed for $PATH_PART (skipped)${NC}"
    fi
  else
    echo -e "${YELLOW}skip $PATH_PART (status $STATUS)${NC}"
  fi
done

COUNT=$(wc -l < "$MANIFEST" 2>/dev/null | tr -d ' ')
echo -e "${GREEN}SCREENSHOT CAPTURE: ${COUNT:-0} page(s) captured. Manifest: $MANIFEST${NC}"
exit 0
