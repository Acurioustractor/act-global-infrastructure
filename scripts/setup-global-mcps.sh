#!/bin/bash
# Setup Global MCPs for ACT Ecosystem
# This script verifies MCP configuration and environment variables

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "\n${BLUE}🔌 Setting Up Global MCPs for ACT Ecosystem${RESET}\n"

# Check if we're in the right directory
if [ ! -f ".mcp.json" ]; then
  echo -e "${RED}❌ Error: .mcp.json not found${RESET}"
  echo -e "${YELLOW}Run this script from ~/act-global-infrastructure${RESET}"
  exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ Error: .env.local not found${RESET}"
  echo -e "${YELLOW}Create .env.local first with required variables${RESET}"
  exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
fi

echo -e "${BLUE}📋 Checking MCP Prerequisites${RESET}\n"

# Check 1: GitHub Token
if [ -n "$GITHUB_TOKEN" ]; then
  echo -e "${GREEN}✅ GitHub Token: Set${RESET}"
else
  echo -e "${RED}❌ GitHub Token: Missing${RESET}"
  echo -e "${YELLOW}   Add GITHUB_TOKEN to .env.local${RESET}"
fi

# Check 2: Supabase Connection String
if [ -n "$SUPABASE_CONNECTION_STRING" ]; then
  echo -e "${GREEN}✅ Supabase Connection: Set${RESET}"
else
  echo -e "${RED}❌ Supabase Connection: Missing${RESET}"
  echo -e "${YELLOW}   Add SUPABASE_CONNECTION_STRING to .env.local${RESET}"
fi

# Check 3: Notion Token
if [ -n "$NOTION_TOKEN" ]; then
  echo -e "${GREEN}✅ Notion Token: Set${RESET}"
else
  echo -e "${RED}❌ Notion Token: Missing${RESET}"
  echo -e "${YELLOW}   Add NOTION_TOKEN to .env.local${RESET}"
fi

echo -e "\n${BLUE}📂 Checking Project Paths${RESET}\n"

# Check all 7 project paths
PROJECTS=(
  "/Users/benknight/act-global-infrastructure:Global Infrastructure"
  "/Users/benknight/Code/empathy-ledger-v2:Empathy Ledger v2"
  "/Users/benknight/Code/JusticeHub:JusticeHub"
  "/Users/benknight/Code/The Harvest Website:The Harvest Website"
  "/Users/benknight/Code/Goods Asset Register:Goods Asset Register"
  "/Users/benknight/Code/ACT Farm/act-farm:ACT Farm (BCV)"
  "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio:ACT Studio"
  "/Users/benknight/Code/ACT Placemat:ACT Placemat"
)

for project in "${PROJECTS[@]}"; do
  IFS=':' read -r path name <<< "$project"
  if [ -d "$path" ]; then
    echo -e "${GREEN}✅ $name${RESET}"
  else
    echo -e "${YELLOW}⚠️  $name: Not found at $path${RESET}"
  fi
done

echo -e "\n${BLUE}🔧 MCP Configuration${RESET}\n"

# Display MCP config
echo -e "${GREEN}Configured MCPs:${RESET}"
echo "  1. GitHub MCP - API access for Projects, Issues, PRs"
echo "  2. Filesystem MCP - Access to all 7 project codebases"
echo "  3. Postgres MCP - Supabase database access"
echo "  4. Notion MCP - Access to 6 ACT databases"

echo -e "\n${BLUE}📝 Next Steps${RESET}\n"

echo "1. Verify all environment variables are set correctly"
echo "2. Restart Claude Code to load new MCP configuration:"
echo -e "   ${YELLOW}CMD+Shift+P → 'Reload Window'${RESET}"
echo ""
echo "3. Test MCPs in Claude Code:"
echo -e "   ${YELLOW}Ask: 'Show me backlog issues from GitHub'${RESET}"
echo -e "   ${YELLOW}Ask: 'Query sprint metrics from database'${RESET}"
echo -e "   ${YELLOW}Ask: 'List files in empathy-ledger-v2'${RESET}"
echo ""
echo "4. Check MCP status:"
echo -e "   ${YELLOW}CMD+Shift+P → 'MCP: Show Status'${RESET}"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}✅ MCP Configuration Complete${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
