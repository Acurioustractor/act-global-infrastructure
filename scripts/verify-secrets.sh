#!/bin/bash
# verify-secrets.sh - Check that all required secrets are configured
# Usage: ./scripts/verify-secrets.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "  ACT Ecosystem - Secrets Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# Load .env.local if it exists
if [ -f .env.local ]; then
  set -a
  source .env.local 2>/dev/null || true
  set +a
  echo "✓ Loaded .env.local"
else
  echo "⚠ No .env.local found - checking environment only"
fi

echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

check_var() {
  local name=$1
  local value="${!name}"
  local hint=$2

  if [ -z "$value" ]; then
    echo -e "${RED}✗ $name${NC} - NOT SET"
    [ -n "$hint" ] && echo "  └─ $hint"
    return 1
  elif [ "$value" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ] || [ "$value" = "your_value_here" ]; then
    echo -e "${YELLOW}◐ $name${NC} - placeholder value"
    return 1
  else
    local len=${#value}
    local preview="${value:0:8}..."
    echo -e "${GREEN}✓ $name${NC} - set (${len} chars, starts: ${preview})"
    return 0
  fi
}

missing=0

echo "════════════════════════════════════════"
echo "  CORE SERVICES"
echo "════════════════════════════════════════"
check_var "NEXT_PUBLIC_SUPABASE_URL" "Get from Supabase dashboard > Settings > API" || ((missing++))
check_var "SUPABASE_SERVICE_ROLE_KEY" "Get from Supabase dashboard > Settings > API" || ((missing++))
check_var "OPENAI_API_KEY" "Get from platform.openai.com/api-keys" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  XERO INTEGRATION"
echo "════════════════════════════════════════"
check_var "XERO_CLIENT_ID" "Get from developer.xero.com/app/manage" || ((missing++))
check_var "XERO_CLIENT_SECRET" "Get from developer.xero.com/app/manage" || ((missing++))
check_var "XERO_TENANT_ID" "Get after OAuth flow or from Xero org settings" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  GOOGLE SERVICE ACCOUNT"
echo "════════════════════════════════════════"
check_var "GOOGLE_SERVICE_ACCOUNT_KEY" "Base64-encode service account JSON key" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  GHL (GoHighLevel)"
echo "════════════════════════════════════════"
check_var "GHL_API_KEY" "Get from GHL > Settings > API Keys" || ((missing++))
check_var "GHL_LOCATION_ID" "Get from GHL URL: app.gohighlevel.com/v2/location/{ID}" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  NOTION"
echo "════════════════════════════════════════"
check_var "NOTION_TOKEN" "Get from notion.so/my-integrations" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  GITHUB"
echo "════════════════════════════════════════"
check_var "GITHUB_TOKEN" "Get from github.com/settings/tokens" || ((missing++))

echo ""
echo "════════════════════════════════════════"
echo "  DISCORD (Optional)"
echo "════════════════════════════════════════"
check_var "DISCORD_WEBHOOK_URL" "Create webhook in Discord server settings" || true

echo ""
echo "═══════════════════════════════════════════════════════"

if [ $missing -eq 0 ]; then
  echo -e "${GREEN}All required secrets are configured!${NC}"
  echo ""
  echo "Next: Set up GitHub secrets with:"
  echo "  ./scripts/setup-github-secrets.sh"
else
  echo -e "${YELLOW}Missing $missing required secret(s)${NC}"
  echo ""
  echo "See docs/SECRETS_SETUP.md for instructions on obtaining each credential."
fi

echo "═══════════════════════════════════════════════════════"
