#!/bin/bash

# Sync Vercel Access Token to all ACT projects
# This script adds the real VERCEL_ACCESS_TOKEN to projects that have placeholders

set -e

# Source token
SOURCE_ENV="/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local"
VERCEL_TOKEN=$(grep "^VERCEL_ACCESS_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_ACCESS_TOKEN not found in source .env.local"
  exit 1
fi

echo "🔑 Found Vercel token: ${VERCEL_TOKEN:0:8}..."
echo ""

# Projects that need the token
PROJECTS=(
  "/Users/benknight/Code/The Harvest Website"
  "/Users/benknight/Code/Goods Asset Register"
  "/Users/benknight/Code/ACT Farm/act-farm"
  "/Users/benknight/act-global-infrastructure"
)

for PROJECT_PATH in "${PROJECTS[@]}"; do
  ENV_FILE="$PROJECT_PATH/.env.local"
  PROJECT_NAME=$(basename "$PROJECT_PATH")

  if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  $PROJECT_NAME - No .env.local file found"
    continue
  fi

  # Check if token exists
  if grep -q "^VERCEL_ACCESS_TOKEN=" "$ENV_FILE" 2>/dev/null; then
    CURRENT_TOKEN=$(grep "^VERCEL_ACCESS_TOKEN=" "$ENV_FILE" | cut -d'=' -f2)

    # Check if it's a placeholder (xxx... or your_vercel_token_here)
    if [[ "$CURRENT_TOKEN" =~ ^x+$ ]] || [ "$CURRENT_TOKEN" = "your_vercel_token_here" ]; then
      echo "🔧 $PROJECT_NAME - Replacing placeholder..."

      # Create backup
      cp "$ENV_FILE" "$ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"

      # Replace placeholder with real token
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^VERCEL_ACCESS_TOKEN=.*|VERCEL_ACCESS_TOKEN=$VERCEL_TOKEN|" "$ENV_FILE"
      else
        # Linux
        sed -i "s|^VERCEL_ACCESS_TOKEN=.*|VERCEL_ACCESS_TOKEN=$VERCEL_TOKEN|" "$ENV_FILE"
      fi

      echo "   ✅ Token updated"
    elif [ "$CURRENT_TOKEN" = "$VERCEL_TOKEN" ]; then
      echo "✅ $PROJECT_NAME - Token already correct"
    else
      echo "ℹ️  $PROJECT_NAME - Has different real token (${CURRENT_TOKEN:0:8}...), keeping it"
    fi
  else
    echo "➕ $PROJECT_NAME - Adding token..."

    # Add token to file
    echo "" >> "$ENV_FILE"
    echo "# Vercel Deployment Access" >> "$ENV_FILE"
    echo "VERCEL_ACCESS_TOKEN=$VERCEL_TOKEN" >> "$ENV_FILE"

    echo "   ✅ Token added"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Vercel token sync complete!"
echo ""
echo "📋 Backups created with timestamp suffix"
echo "🔍 Run audit to verify:"
echo "   node scripts/audit-all-secrets.mjs"
