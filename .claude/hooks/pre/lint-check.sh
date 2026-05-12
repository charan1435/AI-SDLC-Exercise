#!/bin/bash
# PRE-HOOK: LINT CHECK

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 PRE-HOOK: lint-check running..."

if [ -f "package.json" ]; then
  if grep -q '"lint"' package.json; then
    npm run lint --silent 2>/dev/null
    if [ $? -ne 0 ]; then
      echo -e "${RED}🚫 LINT FAILED: Fix lint errors before committing.${NC}"
      exit 1
    fi
  fi

  if [ -f "tsconfig.json" ]; then
    npx tsc --noEmit 2>/dev/null
    if [ $? -ne 0 ]; then
      echo -e "${RED}🚫 TYPE CHECK FAILED: Fix TypeScript errors.${NC}"
      exit 1
    fi
  fi
fi

if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  if command -v ruff &> /dev/null; then
    ruff check . 2>/dev/null
    if [ $? -ne 0 ]; then
      echo -e "${RED}🚫 RUFF FAILED: Fix Python lint errors.${NC}"
      exit 1
    fi
  fi
fi

echo -e "${GREEN}✓ LINT CHECK: Clean.${NC}"
exit 0
