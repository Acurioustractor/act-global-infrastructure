#!/bin/bash

# Setup MCP Environment Variables
# Run this to configure MCPs for Claude Code

set -e

echo "🔧 Setting up MCP environment variables..."

# Load existing env
if [ -f .env.local ]; then
  source .env.local
fi

# Generate Supabase connection string
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  echo "   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Extract connection details from Supabase URL
SUPABASE_PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
SUPABASE_CONNECTION_STRING="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Update .env.local with MCP-specific vars
if ! grep -q "SUPABASE_CONNECTION_STRING" .env.local; then
  echo "" >> .env.local
  echo "# MCP Server Configuration" >> .env.local
  echo "SUPABASE_CONNECTION_STRING=\"${SUPABASE_CONNECTION_STRING}\"" >> .env.local
fi

echo "✅ MCP environment configured!"
echo ""
echo "📋 MCP Servers Available:"
echo "   • GitHub MCP (GitHub API access)"
echo "   • Filesystem MCP (File operations)"
echo "   • Postgres MCP (Supabase direct access)"
echo ""
echo "🔄 Restart Claude Code to activate MCPs"
