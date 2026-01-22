#!/bin/bash

# ACT Ecosystem Codebase Alignment Verification
# Checks all 7 repos for proper global infrastructure linking

set -e

GLOBAL_DIR=~/act-global-infrastructure
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ACT Ecosystem Codebase Alignment Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Read repos from config
REPOS=(
  "/Users/benknight/Code/act-regenerative-studio"
  "/Users/benknight/Code/empathy-ledger-v2"
  "/Users/benknight/Code/JusticeHub"
  "/Users/benknight/Code/The Harvest Website"
  "/Users/benknight/Code/Goods Asset Register"
  "/Users/benknight/Code/act-farm"
  "/Users/benknight/Code/act-intelligence-platform"
)

REPO_NAMES=(
  "ACT Studio"
  "Empathy Ledger"
  "JusticeHub"
  "The Harvest"
  "Goods"
  "ACT Farm"
  "ACT Intelligence Platform"
)

total_repos=${#REPOS[@]}
passed=0
failed=0

for i in "${!REPOS[@]}"; do
  repo="${REPOS[$i]}"
  name="${REPO_NAMES[$i]}"

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Checking: ${name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ ! -d "$repo" ]; then
    echo -e "${RED}✗ FAIL: Repository not found${NC}"
    echo ""
    ((failed++))
    continue
  fi

  cd "$repo"
  repo_passed=true

  # Check 1: Git repository
  echo -n "  Git repository:           "
  if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing${NC}"
    repo_passed=false
  fi

  # Check 2: GitHub remote
  echo -n "  GitHub remote:            "
  if git remote -v 2>/dev/null | grep -q "github.com"; then
    remote=$(git remote -v | grep fetch | awk '{print $2}' | head -1)
    echo -e "${GREEN}✓${NC} $remote"
  else
    echo -e "${RED}✗ Missing${NC}"
    repo_passed=false
  fi

  # Check 3: Claude skills symlinks
  echo -n "  Skills (act-sprint):      "
  if [ -L ".claude/skills/global/act-sprint-workflow" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing symlink${NC}"
    repo_passed=false
  fi

  echo -n "  Skills (brand):           "
  if [ -L ".claude/skills/global/act-brand-alignment" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing symlink${NC}"
    repo_passed=false
  fi

  echo -n "  Skills (ghl):             "
  if [ -L ".claude/skills/global/ghl-crm-advisor" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing symlink${NC}"
    repo_passed=false
  fi

  # Check 4: Scripts symlink
  echo -n "  Scripts (global):         "
  if [ -L "scripts-global" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing symlink${NC}"
    repo_passed=false
  fi

  # Check 5: GitHub workflow
  echo -n "  Workflow (snapshot):      "
  if [ -f ".github/workflows/snapshot-sprint.yml" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⚠ Missing (optional)${NC}"
  fi

  # Check 6: package.json (if exists)
  echo -n "  Dependencies:             "
  if [ -f "package.json" ]; then
    if grep -q "@octokit/graphql" package.json && grep -q "@supabase/supabase-js" package.json; then
      echo -e "${GREEN}✓ Installed${NC}"
    else
      echo -e "${YELLOW}⚠ Missing @octokit/graphql or @supabase/supabase-js${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ No package.json${NC}"
  fi

  # Check 7: .env.local
  echo -n "  Environment (.env.local): "
  if [ -f ".env.local" ]; then
    if grep -q "GITHUB_TOKEN" .env.local && grep -q "SUPABASE" .env.local; then
      echo -e "${GREEN}✓ Configured${NC}"
    else
      echo -e "${YELLOW}⚠ Missing GITHUB_TOKEN or SUPABASE vars${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Missing (needed for workflows)${NC}"
  fi

  # Check 8: Test script execution
  echo -n "  Script execution test:    "
  if [ -L "scripts-global" ] && [ -x "scripts-global/run-snapshot.sh" ]; then
    echo -e "${GREEN}✓ Executable${NC}"
  else
    echo -e "${RED}✗ Not executable${NC}"
    repo_passed=false
  fi

  # Summary for this repo
  echo ""
  if [ "$repo_passed" = true ]; then
    echo -e "${GREEN}✓ PASS: ${name} is properly aligned${NC}"
    ((passed++))
  else
    echo -e "${RED}✗ FAIL: ${name} needs attention${NC}"
    ((failed++))
  fi

  echo ""
done

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Total repositories:  ${total_repos}"
echo -e "  ${GREEN}Passed:              ${passed}${NC}"
echo -e "  ${RED}Failed:              ${failed}${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}✓ All codebases are properly aligned!${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠ Some codebases need attention. Run fix script:${NC}"
  echo -e "  ${BLUE}~/act-global-infrastructure/scripts/fix-alignment.sh${NC}"
  echo ""
  exit 1
fi
