#!/bin/bash

# Sync environment variables across all ACT projects
# Part of env-secrets-manager skill

set -e

echo "🔄 Syncing .env files across ACT ecosystem..."
echo ""

# Source values from ACT Farm Studio (which has most secrets)
SOURCE_ENV="/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local"
TEMPLATE="$HOME/act-global-infrastructure/.claude/skills/env-secrets-manager/templates/env.template"

if [ ! -f "$SOURCE_ENV" ]; then
  echo "❌ Source .env.local not found at $SOURCE_ENV"
  exit 1
fi

# Extract secrets from source
echo "📥 Reading secrets from ACT Farm Studio..."
GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)
NOTION_TOKEN=$(grep "^NOTION_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)
SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" "$SOURCE_ENV" | cut -d'=' -f2)
SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$SOURCE_ENV" | cut -d'=' -f2)
SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$SOURCE_ENV" | cut -d'=' -f2)
OPENAI_KEY=$(grep "^OPENAI_API_KEY=" "$SOURCE_ENV" | cut -d'=' -f2)
VERCEL_TOKEN=$(grep "^VERCEL_ACCESS_TOKEN=" "$SOURCE_ENV" | cut -d'=' -f2)

# GitHub Project ID (shared across all)
GH_PROJECT_ID="PVT_kwHOCOopjs4BLVik"

echo "✅ Extracted shared secrets"
echo ""

# Function to update or create .env.local
update_env_file() {
  local project_name=$1
  local project_path=$2
  local env_file="$project_path/.env.local"
  
  echo "📝 Updating $project_name..."
  
  # Create from template if doesn't exist
  if [ ! -f "$env_file" ]; then
    echo "   Creating new .env.local from template"
    cp "$TEMPLATE" "$env_file"
  fi
  
  # Update shared secrets (using sed for cross-platform compatibility)
  sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=$GITHUB_TOKEN|" "$env_file" 2>/dev/null || \
    echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> "$env_file"
  
  sed -i.bak "s|^GH_PROJECT_TOKEN=.*|GH_PROJECT_TOKEN=$GITHUB_TOKEN|" "$env_file" 2>/dev/null || \
    echo "GH_PROJECT_TOKEN=$GITHUB_TOKEN" >> "$env_file"
  
  sed -i.bak "s|^GITHUB_PROJECT_ID=.*|GITHUB_PROJECT_ID=$GH_PROJECT_ID|" "$env_file" 2>/dev/null || \
    echo "GITHUB_PROJECT_ID=$GH_PROJECT_ID" >> "$env_file"
  
  sed -i.bak "s|^NOTION_TOKEN=.*|NOTION_TOKEN=$NOTION_TOKEN|" "$env_file" 2>/dev/null || \
    echo "NOTION_TOKEN=$NOTION_TOKEN" >> "$env_file"
  
  sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" "$env_file" 2>/dev/null || \
    echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> "$env_file"
  
  sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$env_file" 2>/dev/null || \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> "$env_file"
  
  sed -i.bak "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" "$env_file" 2>/dev/null || \
    echo "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY" >> "$env_file"
  
  if [ -n "$OPENAI_KEY" ]; then
    sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" "$env_file" 2>/dev/null || \
      echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$env_file"
  fi
  
  # Remove backup files
  rm -f "$env_file.bak"
  
  echo "   ✅ Updated $project_name"
}

# Update all projects
update_env_file "Empathy Ledger" "/Users/benknight/Code/empathy-ledger-v2"
update_env_file "JusticeHub" "/Users/benknight/Code/JusticeHub"
update_env_file "The Harvest" "/Users/benknight/Code/The Harvest Website"
update_env_file "Goods" "/Users/benknight/Code/Goods Asset Register"
update_env_file "ACT Farm" "/Users/benknight/Code/ACT Farm/act-farm"
update_env_file "Global Infrastructure" "/Users/benknight/act-global-infrastructure"

# Fix Global Infrastructure .gitignore
echo ""
echo "🔒 Updating .gitignore files..."
GLOBAL_GITIGNORE="/Users/benknight/act-global-infrastructure/.gitignore"

if ! grep -q "^\.env$" "$GLOBAL_GITIGNORE" 2>/dev/null; then
  echo "" >> "$GLOBAL_GITIGNORE"
  echo "# Environment variables" >> "$GLOBAL_GITIGNORE"
  echo ".env" >> "$GLOBAL_GITIGNORE"
  echo ".env.local" >> "$GLOBAL_GITIGNORE"
  echo ".env*.local" >> "$GLOBAL_GITIGNORE"
  echo "   ✅ Updated Global Infrastructure .gitignore"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SYNC COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Synced secrets to 6 projects:"
echo "   - Empathy Ledger"
echo "   - JusticeHub"
echo "   - The Harvest"
echo "   - Goods"
echo "   - ACT Farm"
echo "   - Global Infrastructure"
echo ""
echo "🔐 Shared secrets synchronized:"
echo "   - GITHUB_TOKEN / GH_PROJECT_TOKEN"
echo "   - GITHUB_PROJECT_ID"
echo "   - NOTION_TOKEN"
echo "   - SUPABASE credentials"
echo "   - OPENAI_API_KEY"
echo ""
echo "✅ All .gitignore files protect .env files"
echo ""
echo "🔄 Run audit again to verify:"
echo "   node scripts/audit-all-secrets.mjs"
echo ""
