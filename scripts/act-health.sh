#!/bin/bash

# ACT Ecosystem Health Dashboard
# Quick overview of all 7 projects' status

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Project definitions
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
  "Intelligence"
)

REPO_URLS=(
  "https://acurioustractor.com"
  "https://empathyledger.com"
  "https://justicehub.org"
  "https://theharvest.community"
  "https://goods.acurioustractor.com"
  "https://farm.acurioustractor.com"
  "https://placemat.acurioustractor.com"
)

echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║                    🌱 ACT ECOSYSTEM HEALTH DASHBOARD                      ║${NC}"
echo -e "${BOLD}${BLUE}║                         $(date '+%Y-%m-%d %H:%M')                              ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Table header
printf "${BOLD}%-18s │ %-12s │ %-8s │ %-10s │ %-20s${NC}\n" "Project" "Last Commit" "Branch" "Changes" "Latest Change"
echo "───────────────────┼──────────────┼──────────┼────────────┼─────────────────────────"

total_active=0
total_stale=0
total_dormant=0

for i in "${!REPOS[@]}"; do
  repo="${REPOS[$i]}"
  name="${REPO_NAMES[$i]}"

  if [ ! -d "$repo" ]; then
    printf "${RED}%-18s │ %-12s │ %-8s │ %-10s │ %-20s${NC}\n" "$name" "NOT FOUND" "-" "-" "-"
    continue
  fi

  cd "$repo"

  # Get last commit info
  last_commit=$(git log -1 --format="%ar" 2>/dev/null | sed 's/ ago//' | sed 's/minutes/min/' | sed 's/hours/hr/' | sed 's/days/d/' | sed 's/weeks/wk/' | head -c 12)
  branch=$(git branch --show-current 2>/dev/null)
  changes=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  commit_msg=$(git log -1 --format="%s" 2>/dev/null | head -c 20)

  # Determine age status
  commit_seconds=$(git log -1 --format="%ct" 2>/dev/null)
  now_seconds=$(date +%s)
  age_hours=$(( (now_seconds - commit_seconds) / 3600 ))

  if [ $age_hours -lt 24 ]; then
    status_color=$GREEN
    ((total_active++))
  elif [ $age_hours -lt 168 ]; then  # 7 days
    status_color=$YELLOW
    ((total_stale++))
  else
    status_color=$RED
    ((total_dormant++))
  fi

  # Changes indicator
  if [ "$changes" -eq 0 ]; then
    changes_display="${GREEN}✓ clean${NC}"
  else
    changes_display="${YELLOW}$changes files${NC}"
  fi

  printf "${status_color}%-18s${NC} │ %-12s │ %-8s │ ${changes_display}%-2s │ %-20s\n" \
    "$name" "$last_commit" "$branch" "" "$commit_msg"
done

echo ""
echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${BLUE}│ SUMMARY                                                                     │${NC}"
echo -e "${BOLD}${BLUE}└─────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${GREEN}●${NC} Active (< 24h):     $total_active projects"
echo -e "  ${YELLOW}●${NC} Stale (1-7 days):   $total_stale projects"
echo -e "  ${RED}●${NC} Dormant (> 7 days): $total_dormant projects"
echo ""

# Calculate overall health percentage
total=${#REPOS[@]}
health_pct=$(( (total_active * 100 + total_stale * 50) / total ))

if [ $health_pct -ge 80 ]; then
  health_color=$GREEN
  health_emoji="🟢"
elif [ $health_pct -ge 50 ]; then
  health_color=$YELLOW
  health_emoji="🟡"
else
  health_color=$RED
  health_emoji="🔴"
fi

echo -e "  ${BOLD}Overall Health:${NC} ${health_color}${health_emoji} ${health_pct}%${NC}"
echo ""

# Quick actions
echo -e "${BOLD}${CYAN}Quick Actions:${NC}"
echo -e "  ${BLUE}act-health${NC}              - This dashboard"
echo -e "  ${BLUE}verify-alignment.sh${NC}     - Check infrastructure alignment"
echo -e "  ${BLUE}fix-alignment.sh${NC}        - Repair symlinks"
echo -e "  ${BLUE}act-sprint-workflow${NC}     - Sprint planning & standup"
echo ""
