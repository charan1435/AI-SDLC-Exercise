#!/bin/bash
# POST-HOOK: NOTIFY DONE
# Prints summary and next step after each command completes

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

COMPLETED="${CLAUDE_COMMAND:-step}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ /$COMPLETED complete — $(date '+%H:%M:%S')${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  SDLC Pipeline:"
echo "  /plan    → /jira → /adr → /ux"
echo "  /develop → /cicd → /review → /demo"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
exit 0
