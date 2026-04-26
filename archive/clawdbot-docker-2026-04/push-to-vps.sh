#!/bin/bash
# Push Clawdbot config to VPS
# Usage: ./push-to-vps.sh user@your-vps-ip

set -e

if [ -z "$1" ]; then
  echo "Usage: ./push-to-vps.sh user@vps-ip"
  echo "Example: ./push-to-vps.sh root@167.235.1.100"
  exit 1
fi

VPS="$1"

echo "🌾 Pushing Clawdbot to $VPS"
echo "============================"

# Create temp directory with sanitized config
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "📋 Preparing config..."

# Copy and sanitize config (keep telegram token since it's needed)
cp ~/.clawdbot/clawdbot.json "$TMPDIR/"

# Copy skills
cp -r ~/.clawdbot/skills "$TMPDIR/"

# Copy workspace files
mkdir -p "$TMPDIR/clawd"
cp ~/clawd/SOUL.md "$TMPDIR/clawd/" 2>/dev/null || true
cp ~/clawd/AGENTS.md "$TMPDIR/clawd/" 2>/dev/null || true
cp ~/clawd/PROJECTS.md "$TMPDIR/clawd/" 2>/dev/null || true

# Copy CLI scripts
mkdir -p "$TMPDIR/scripts"
cp ~/act-global-infrastructure/scripts/act-*.mjs "$TMPDIR/scripts/"

# Copy cron jobs
mkdir -p "$TMPDIR/cron"
cp ~/.clawdbot/cron/jobs.json "$TMPDIR/cron/" 2>/dev/null || true

# Create .env with secrets from Bitwarden
echo "🔐 Exporting secrets..."
BWS_TOKEN=$(security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null)
if [ -n "$BWS_TOKEN" ]; then
  secrets=$(BWS_ACCESS_TOKEN="$BWS_TOKEN" ~/bin/bws secret list --output json 2>/dev/null)

  {
    echo "# Clawdbot Secrets - Auto-generated $(date)"
    echo "$secrets" | jq -r '.[] | select(.key == "GOOGLE_SERVICE_ACCOUNT_KEY") | "GOOGLE_SERVICE_ACCOUNT_KEY='"'"'\(.value)'"'"'"'
    echo "$secrets" | jq -r '.[] | select(.key == "GOOGLE_DELEGATED_USER") | "GOOGLE_DELEGATED_USER=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "NOTION_TOKEN") | "NOTION_TOKEN=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "EL_SUPABASE_URL") | "EL_SUPABASE_URL=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "EL_SUPABASE_SERVICE_ROLE_KEY") | "EL_SUPABASE_SERVICE_ROLE_KEY=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "SUPABASE_URL") | "SUPABASE_URL=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "SUPABASE_SERVICE_ROLE_KEY") | "SUPABASE_SERVICE_ROLE_KEY=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "GHL_API_KEY") | "GHL_API_KEY=\(.value)"'
    echo "$secrets" | jq -r '.[] | select(.key == "GHL_LOCATION_ID") | "GHL_LOCATION_ID=\(.value)"'
  } > "$TMPDIR/.env"
fi

echo "📤 Uploading to VPS..."

# Upload everything
ssh "$VPS" "mkdir -p /home/clawdbot/.clawdbot/cron /home/clawdbot/clawd /home/clawdbot/scripts"
scp "$TMPDIR/clawdbot.json" "$VPS:/home/clawdbot/.clawdbot/"
scp -r "$TMPDIR/skills" "$VPS:/home/clawdbot/.clawdbot/"
scp "$TMPDIR/.env" "$VPS:/home/clawdbot/.clawdbot/"
scp "$TMPDIR/cron/jobs.json" "$VPS:/home/clawdbot/.clawdbot/cron/" 2>/dev/null || true
scp -r "$TMPDIR/clawd/"* "$VPS:/home/clawdbot/clawd/" 2>/dev/null || true
scp "$TMPDIR/scripts/"*.mjs "$VPS:/home/clawdbot/scripts/"

# Fix permissions
ssh "$VPS" "chown -R clawdbot:clawdbot /home/clawdbot"

echo ""
echo "✅ Upload complete!"
echo ""
echo "Now on VPS, run:"
echo "  systemctl restart clawdbot"
echo "  journalctl -u clawdbot -f"
