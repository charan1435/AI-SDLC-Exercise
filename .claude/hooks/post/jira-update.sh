#!/bin/bash
# POST-HOOK: JIRA STATUS UPDATE
# Logs Jira ticket from commit for Claude MCP to update

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🎫 POST-HOOK: jira-update running..."

MSG=$(git log -1 --pretty=%B 2>/dev/null)
TICKET=$(echo "$MSG" | grep -oE "[A-Z][A-Z0-9]+-[0-9]+" | head -1)

if [ -z "$TICKET" ]; then
  echo -e "${YELLOW}⚠️  No Jira ticket in last commit. Skipping.${NC}"
  exit 0
fi

PENDING=".claude/.pending-jira-updates"
echo "$TICKET" >> "$PENDING"

echo -e "${GREEN}✓ JIRA UPDATE: Ticket $TICKET queued for MCP update.${NC}"
exit 0
