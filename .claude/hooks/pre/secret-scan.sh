#!/bin/bash
# PRE-HOOK: SECRET SCANNER
# Scans staged files for hardcoded secrets before commit

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 PRE-HOOK: secret-scan running..."

STAGED=$(git diff --cached --name-only 2>/dev/null)
FOUND=false

SECRET_PATTERNS=(
  "sk_live_[a-zA-Z0-9]{20,}"
  "sk_test_[a-zA-Z0-9]{20,}"
  "pk_live_[a-zA-Z0-9]{20,}"
  "rk_live_[a-zA-Z0-9]{20,}"
  "whsec_[a-zA-Z0-9]{20,}"
  "re_[a-zA-Z0-9]{20,}"
  "ghp_[a-zA-Z0-9]{36}"
  "gho_[a-zA-Z0-9]{36}"
  "AIza[0-9A-Za-z_-]{35}"
  "eyJhbGciOiJIUzI1NiJ9\."
  "service_role[\"'][[:space:]]*:[\"'][[:space:]]*ey"
  "password[[:space:]]*=[[:space:]]*['\"][^'\"]{8,}"
  "secret[[:space:]]*=[[:space:]]*['\"][^'\"]{8,}"
  "SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[^$\n]{10,}"
)

for file in $STAGED; do
  # Skip lock files, examples, node_modules, test fixtures
  [[ "$file" == *.lock ]] && continue
  [[ "$file" == *.example ]] && continue
  [[ "$file" == *node_modules* ]] && continue
  [[ "$file" == *__tests__* ]] && continue
  [[ "$file" == *fixtures* ]] && continue
  [[ ! -f "$file" ]] && continue

  for pattern in "${SECRET_PATTERNS[@]}"; do
    MATCH=$(git diff --cached "$file" 2>/dev/null | grep "^+" | grep -iE "$pattern")
    if [ -n "$MATCH" ]; then
      echo -e "${RED}🚫 SECRET FOUND${NC}"
      echo -e "${RED}   File:    $file${NC}"
      echo -e "${RED}   Pattern: $pattern${NC}"
      FOUND=true
    fi
  done
done

if [ "$FOUND" = true ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}🚫 SECRET SCAN: COMMIT BLOCKED${NC}"
  echo -e "${YELLOW}   Move secrets to .env.local${NC}"
  echo -e "${YELLOW}   Reference via process.env.YOUR_VAR${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

echo -e "${GREEN}✓ SECRET SCAN: Clean.${NC}"
exit 0
