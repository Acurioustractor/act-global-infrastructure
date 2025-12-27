#!/bin/bash

# Add all GitHub secrets for act-global-infrastructure
# Run this script to quickly configure all required secrets

echo "🔐 Adding GitHub Secrets..."
echo ""

# 1. GitHub Project Token (using gh auth token)
echo "✅ Setting GH_PROJECT_TOKEN..."
gh secret set GH_PROJECT_TOKEN -b "$(gh auth token)"

# 2. GitHub Project ID
echo "✅ Setting GITHUB_PROJECT_ID..."
gh secret set GITHUB_PROJECT_ID -b "PVT_kwHOCOopjs4BLVik"

# 3. Notion Token
echo "✅ Setting NOTION_TOKEN..."
gh secret set NOTION_TOKEN -b "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"

# 4. Supabase URL
echo "✅ Setting SUPABASE_URL..."
gh secret set SUPABASE_URL -b "https://tednluwflfhxyucgwigh.supabase.co"

# 5. Supabase Service Role Key
echo "✅ Setting SUPABASE_SERVICE_ROLE_KEY..."
gh secret set SUPABASE_SERVICE_ROLE_KEY -b "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All secrets added!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verify secrets:"
gh secret list
echo ""
echo "Next: Test the sprint sync workflow"
echo "  gh workflow run sync-sprint-metrics.yml"
echo "  gh run watch"
