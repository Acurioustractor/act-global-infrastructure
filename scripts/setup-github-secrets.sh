#!/bin/bash
# setup-github-secrets.sh - Set GitHub Actions secrets from .env.local
# Usage: ./scripts/setup-github-secrets.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "  ACT Ecosystem - GitHub Secrets Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "   Install: brew install gh"
  exit 1
fi

# Check gh is authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLI is not authenticated"
  echo "   Run: gh auth login"
  exit 1
fi

echo "✓ GitHub CLI authenticated"

# Load .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "✓ Loaded .env.local"
else
  echo "❌ No .env.local found"
  exit 1
fi

echo ""
echo "This will set the following GitHub secrets:"
echo ""
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - XERO_CLIENT_ID"
echo "  - XERO_CLIENT_SECRET"
echo "  - XERO_TENANT_ID"
echo "  - GOOGLE_SERVICE_ACCOUNT_KEY"
echo "  - GHL_API_KEY"
echo "  - GHL_LOCATION_ID"
echo "  - DISCORD_WEBHOOK_URL"
echo "  - NOTION_TOKEN"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Setting secrets..."

set_secret() {
  local name=$1
  local value="${!name}"

  if [ -z "$value" ] || [ "$value" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
    echo "⏭ Skipping $name (not set)"
    return
  fi

  echo -n "  $name... "
  if gh secret set "$name" --body "$value" 2>/dev/null; then
    echo "✓"
  else
    echo "✗ (failed)"
  fi
}

# Core services
set_secret "SUPABASE_URL"
gh secret set "SUPABASE_URL" --body "$NEXT_PUBLIC_SUPABASE_URL" 2>/dev/null && echo "  SUPABASE_URL... ✓" || echo "  SUPABASE_URL... ✗"
set_secret "SUPABASE_SERVICE_ROLE_KEY"

# Xero
set_secret "XERO_CLIENT_ID"
set_secret "XERO_CLIENT_SECRET"
set_secret "XERO_TENANT_ID"
set_secret "XERO_REFRESH_TOKEN"

# Google
set_secret "GOOGLE_SERVICE_ACCOUNT_KEY"

# GHL
set_secret "GHL_API_KEY"
set_secret "GHL_LOCATION_ID"

# Discord
set_secret "DISCORD_WEBHOOK_URL"

# Notion
set_secret "NOTION_TOKEN"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Done! Verify secrets at:"
echo "  https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/secrets/actions"
echo "═══════════════════════════════════════════════════════"
