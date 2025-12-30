#!/bin/bash

# Fix remaining missing secrets
SOURCE_ENV="/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local"
GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)
GH_PROJECT_ID="PVT_kwHOCOopjs4BLVik"

# ACT Farm Studio - add missing
echo "🔧 Fixing ACT Farm Studio..."
cat >> "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local" << ENVEOF

# Added by env-secrets-manager
GH_PROJECT_TOKEN=$GITHUB_TOKEN
GITHUB_PROJECT_ID=$GH_PROJECT_ID
ENVEOF

# Empathy Ledger and JusticeHub already have .env.local files, check if they're using different format
for PROJECT in "empathy-ledger-v2" "JusticeHub"; do
  ENV_FILE="/Users/benknight/Code/$PROJECT/.env.local"
  
  if [ -f "$ENV_FILE" ]; then
    # Check if secrets are commented out or use different naming
    if ! grep -q "^GITHUB_TOKEN=" "$ENV_FILE"; then
      echo "# GitHub Integration" >> "$ENV_FILE"
      echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> "$ENV_FILE"
    fi
    
    if ! grep -q "^GH_PROJECT_TOKEN=" "$ENV_FILE"; then
      echo "GH_PROJECT_TOKEN=$GITHUB_TOKEN" >> "$ENV_FILE"
    fi
    
    if ! grep -q "^GITHUB_PROJECT_ID=" "$ENV_FILE"; then
      echo "GITHUB_PROJECT_ID=$GH_PROJECT_ID" >> "$ENV_FILE"
    fi
    
    # Copy Notion token
    if ! grep -q "^NOTION_TOKEN=" "$ENV_FILE"; then
      NOTION_TOKEN=$(grep "^NOTION_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)
      echo "NOTION_TOKEN=$NOTION_TOKEN" >> "$ENV_FILE"
    fi
  fi
done

echo "✅ All critical secrets now configured!"
echo ""
echo "Note: VERCEL_ACCESS_TOKEN placeholders are OK (optional for local development)"
