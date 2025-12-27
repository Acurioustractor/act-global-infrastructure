#!/bin/bash

# ACT Ecosystem Codebase Alignment Fix
# Automatically repairs alignment issues across all 7 repos

set -e

GLOBAL_DIR=~/act-global-infrastructure
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ACT Ecosystem Codebase Alignment Fix${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Read repos from config
REPOS=(
  "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio"
  "/Users/benknight/Code/empathy-ledger-v2"
  "/Users/benknight/Code/JusticeHub"
  "/Users/benknight/Code/The Harvest Website"
  "/Users/benknight/Code/Goods Asset Register"
  "/Users/benknight/Code/ACT Farm/act-farm"
  "/Users/benknight/Code/ACT Placemat"
)

REPO_NAMES=(
  "ACT Farm Studio"
  "Empathy Ledger"
  "JusticeHub"
  "The Harvest"
  "Goods"
  "BCV/ACT Farm"
  "ACT Placemat"
)

for i in "${!REPOS[@]}"; do
  repo="${REPOS[$i]}"
  name="${REPO_NAMES[$i]}"

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Fixing: ${name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ ! -d "$repo" ]; then
    echo -e "${RED}✗ Repository not found: $repo${NC}"
    echo ""
    continue
  fi

  cd "$repo"

  # Fix 1: Create .claude/skills/global directory
  echo -n "  Creating skills directory...    "
  mkdir -p .claude/skills/global
  echo -e "${GREEN}✓${NC}"

  # Fix 2: Create/update symlinks for skills
  echo -n "  Linking act-sprint-workflow...  "
  if [ -L ".claude/skills/global/act-sprint-workflow" ]; then
    rm ".claude/skills/global/act-sprint-workflow"
  fi
  ln -s "$GLOBAL_DIR/.claude/skills/act-sprint-workflow" ".claude/skills/global/act-sprint-workflow"
  echo -e "${GREEN}✓${NC}"

  echo -n "  Linking act-brand-alignment...  "
  if [ -L ".claude/skills/global/act-brand-alignment" ]; then
    rm ".claude/skills/global/act-brand-alignment"
  fi
  ln -s "$GLOBAL_DIR/.claude/skills/act-brand-alignment" ".claude/skills/global/act-brand-alignment"
  echo -e "${GREEN}✓${NC}"

  echo -n "  Linking ghl-crm-advisor...      "
  if [ -L ".claude/skills/global/ghl-crm-advisor" ]; then
    rm ".claude/skills/global/ghl-crm-advisor"
  fi
  ln -s "$GLOBAL_DIR/.claude/skills/ghl-crm-advisor" ".claude/skills/global/ghl-crm-advisor"
  echo -e "${GREEN}✓${NC}"

  # Fix 3: Create/update scripts-global symlink
  echo -n "  Linking scripts-global...       "
  if [ -L "scripts-global" ]; then
    rm "scripts-global"
  fi
  ln -s "$GLOBAL_DIR/scripts" "scripts-global"
  echo -e "${GREEN}✓${NC}"

  # Fix 4: Copy GitHub workflow
  echo -n "  Copying workflow file...        "
  mkdir -p .github/workflows
  if [ -f ".github/workflows/snapshot-sprint.yml" ]; then
    echo -e "${YELLOW}⚠ Already exists${NC}"
  else
    cp "$GLOBAL_DIR/.github/workflows/snapshot-sprint.yml" ".github/workflows/"
    echo -e "${GREEN}✓${NC}"
  fi

  # Fix 5: Install dependencies (if package.json exists)
  if [ -f "package.json" ]; then
    echo -n "  Checking dependencies...        "
    if grep -q "@octokit/graphql" package.json && grep -q "@supabase/supabase-js" package.json; then
      echo -e "${GREEN}✓ Already installed${NC}"
    else
      echo -e "${YELLOW}⚠ Installing...${NC}"
      npm install @octokit/graphql @supabase/supabase-js --silent
      echo -e "${GREEN}✓ Installed${NC}"
    fi
  fi

  echo -e "${GREEN}✓ ${name} fixed${NC}"
  echo ""
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All codebases have been fixed!${NC}"
echo ""
echo -e "Run verification to confirm:"
echo -e "  ${BLUE}~/act-global-infrastructure/scripts/verify-alignment.sh${NC}"
echo ""
