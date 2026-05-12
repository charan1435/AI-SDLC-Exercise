#!/bin/bash
# PRE-HOOK: ENV GUARD
# Blocks .env files from being committed or read by Claude

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔒 PRE-HOOK: env-guard running..."

BLOCKED=false

# ── 1. BLOCK .env FILES FROM GIT STAGING ─────────────────────────────────────
STAGED=$(git diff --cached --name-only 2>/dev/null)

ENV_PATTERNS=(".env$" ".env.local$" ".env.production$" ".env.staging$" ".env.development$" ".env.test$")

for pattern in "${ENV_PATTERNS[@]}"; do
  MATCH=$(echo "$STAGED" | grep -E "$pattern")
  if [ -n "$MATCH" ]; then
    echo -e "${RED}🚫 BLOCKED: Env file staged for commit: $MATCH${NC}"
    BLOCKED=true
  fi
done

# ── 2. BLOCK CLAUDE FROM READING .env FILES ───────────────────────────────────
CURRENT_FILE="${CLAUDE_FILE:-}"
if [[ "$CURRENT_FILE" =~ \.env($|\.) ]]; then
  echo -e "${RED}🚫 BLOCKED: Claude attempted to read: $CURRENT_FILE${NC}"
  echo -e "${YELLOW}   Use .env.example to see required variables.${NC}"
  exit 1
fi

# ── 3. ENSURE .gitignore HAS .env ENTRIES ────────────────────────────────────
if [ -f ".gitignore" ]; then
  if ! grep -q "\.env" .gitignore; then
    echo -e "${YELLOW}⚠️  Adding .env entries to .gitignore...${NC}"
    printf "\n# Environment files\n.env\n.env.local\n.env.production\n.env.staging\n.env.development\n.env.test\n*.env\n" >> .gitignore
    echo -e "${GREEN}✓ .gitignore updated${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No .gitignore found. Creating...${NC}"
  cat > .gitignore << 'GITIGNORE'
# Environment files
.env
.env.local
.env.production
.env.staging
.env.development
.env.test
*.env

# Dependencies
node_modules/
.venv/
__pycache__/

# Build output
.next/
dist/
build/
out/

# OS
.DS_Store
Thumbs.db
GITIGNORE
  echo -e "${GREEN}✓ .gitignore created${NC}"
fi

# ── 4. WARN IF .env.example MISSING ──────────────────────────────────────────
if [ ! -f ".env.example" ]; then
  echo -e "${YELLOW}⚠️  No .env.example found. Claude should create one.${NC}"
fi

# ── RESULT ────────────────────────────────────────────────────────────────────
if [ "$BLOCKED" = true ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}🚫 ENV GUARD: COMMIT BLOCKED${NC}"
  echo -e "${YELLOW}   Fix: git reset HEAD .env*${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

echo -e "${GREEN}✓ ENV GUARD: Clean.${NC}"
exit 0
