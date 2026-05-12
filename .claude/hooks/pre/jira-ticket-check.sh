#!/bin/bash
# PRE-HOOK: JIRA TICKET ID + TYPE-PREFIX CHECK
# Blocks commits whose subject line does not follow
#   <JIRA-ID>:<Type>/<description>
# where <Type> ∈ {Feature, Bugfix, Hotfix, Chore, Refactor, Docs, Test, Task}

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🎫 PRE-HOOK: jira-ticket-check running..."

MSG_FILE="${1:-.git/COMMIT_EDITMSG}"

if [ ! -f "$MSG_FILE" ]; then
  echo -e "${GREEN}✓ JIRA CHECK: No commit message file found. Skipping.${NC}"
  exit 0
fi

# Validate only the SUBJECT line (first line). Body is unrestricted.
SUBJECT=$(head -1 "$MSG_FILE")
PATTERN='^[A-Z][A-Z0-9]+-[0-9]+:(Feature|Bugfix|Hotfix|Chore|Refactor|Docs|Test|Task)/.+'

if ! echo "$SUBJECT" | grep -qE "$PATTERN"; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}🚫 JIRA CHECK: COMMIT BLOCKED${NC}"
  echo -e "${RED}   Subject must match: <JIRA-ID>:<Type>/<description>${NC}"
  echo -e "${RED}   <Type> ∈ Feature | Bugfix | Hotfix | Chore | Refactor | Docs | Test | Task${NC}"
  echo -e "${RED}   Examples:${NC}"
  echo -e "${RED}     PROJ-42:Feature/add product listing page${NC}"
  echo -e "${RED}     PROJ-7:Bugfix/fix cart drawer overflow${NC}"
  echo -e "${RED}     PROJ-1:Chore/bump dependencies${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

echo -e "${GREEN}✓ JIRA CHECK: Ticket ID + type prefix valid.${NC}"
exit 0
