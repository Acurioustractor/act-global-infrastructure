# Add GitHub Secrets - Quick Guide

Repository is now live at: https://github.com/Acurioustractor/act-global-infrastructure

## Required Secrets

Add these 5 secrets to enable the automation workflows:

```bash
cd ~/act-global-infrastructure

# 1. GitHub Project Token (PAT with 'project' scope)
gh secret set GH_PROJECT_TOKEN

# 2. GitHub Project ID
gh secret set GITHUB_PROJECT_ID -b "PVT_kwHOCOopjs4BLVik"

# 3. Notion Integration Token
gh secret set NOTION_TOKEN

# 4. Supabase URL
gh secret set SUPABASE_URL

# 5. Supabase Service Role Key
gh secret set SUPABASE_SERVICE_ROLE_KEY
```

## Where to Find These Values

### GH_PROJECT_TOKEN
Your current GitHub token from `gh auth token`:
```bash
gh auth token
```

### GITHUB_PROJECT_ID
Already known: `PVT_kwHOCOopjs4BLVik`

### NOTION_TOKEN
From your local environment or .env file in ACT Farm Studio:
```bash
grep NOTION_TOKEN ~/Code/ACT\ Farm\ and\ Regenerative\ Innovation\ Studio/.env.local
```

### SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
From your Supabase project settings or local .env:
```bash
grep SUPABASE ~/Code/ACT\ Farm\ and\ Regenerative\ Innovation\ Studio/.env.local
```

## Quick Add All (Interactive)

Run this command and paste each value when prompted:

```bash
cd ~/act-global-infrastructure

echo "Enter GH_PROJECT_TOKEN:" && gh secret set GH_PROJECT_TOKEN
echo "Setting GITHUB_PROJECT_ID..." && gh secret set GITHUB_PROJECT_ID -b "PVT_kwHOCOopjs4BLVik"
echo "Enter NOTION_TOKEN:" && gh secret set NOTION_TOKEN
echo "Enter SUPABASE_URL:" && gh secret set SUPABASE_URL
echo "Enter SUPABASE_SERVICE_ROLE_KEY:" && gh secret set SUPABASE_SERVICE_ROLE_KEY

echo "✅ All secrets added!"
```

## Verify Secrets Added

```bash
gh secret list
```

Should show:
- GH_PROJECT_TOKEN
- GITHUB_PROJECT_ID
- NOTION_TOKEN
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Test the Workflow

Once secrets are added, manually trigger the sprint sync:

```bash
gh workflow run sync-sprint-metrics.yml
gh run watch
```

Expected output:
- Fetches 149 GitHub Project items
- Updates Sprint 4 in Notion
- Success status

## Next Steps After Secrets Added

1. **Test sprint sync workflow**: `gh workflow run sync-sprint-metrics.yml`
2. **Check Notion Sprint Tracking**: https://www.notion.so/2d6ebcf981cf815fa30fc7ade0c0046d
3. **Test weekly report**: `gh workflow run weekly-report.yml`
4. **Deploy to project repos**: Copy log-deployment.yml template to each project

---

**Ready to go!** 🚀
