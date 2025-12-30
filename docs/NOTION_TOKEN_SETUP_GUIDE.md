# Notion API Token Setup Guide

**Issue**: Current token `ntn_OLD_TOKEN_HERE` is **invalid or expired**

**Solution**: Generate a new internal integration token and update all locations

---

## Step 1: Generate New Notion Integration Token

### Option A: Create New Integration (Recommended)

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Fill in details:
   - **Name**: ACT Global Infrastructure
   - **Associated workspace**: A Curious Tractor (acurioustractor)
   - **Type**: Internal integration
4. Click **"Submit"**
5. Copy the **Internal Integration Secret** (starts with `secret_`)

### Option B: Use Existing Integration

1. Go to https://www.notion.so/my-integrations
2. Find existing "ACT Global Infrastructure" or similar integration
3. If token shows as "Rotated" or "Expired", click **"Show token"** then **"Regenerate"**
4. Copy the new token

---

## Step 2: Grant Integration Access to Databases

**CRITICAL**: Notion integrations don't automatically have access to databases. You must share each database with the integration.

### For Each Database You Want to Access:

1. Open the database in Notion (or open its parent page)
2. Click the **"•••"** (three dots) in top right
3. Scroll down and click **"+ Add connections"**
4. Search for and select your integration (e.g., "ACT Global Infrastructure")
5. Click **"Confirm"**

### Databases That Need Access:

**Existing databases** (for testing):
- ✅ Sprint Tracking (`2d6ebcf9-81cf-815f-a30f-c7ade0c0046d`)
- ✅ Strategic Pillars (`2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1`)
- ✅ ACT Projects (`2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`)
- ✅ GitHub Issues (`2d5ebcf981cf80429f40ef7b39b39ca1`)

**Parent page** (to create new databases):
- ✅ ACT Development Databases (`2d6ebcf981cf806e8db2dc8ec5d0b414`)

**ACT Studio databases** (if integrating):
- ✅ Projects (`177ebcf9-81cf-80dd-9514-f1ec32f3314c`)
- ✅ Actions (`177ebcf9-81cf-8023-af6e-dff974284218`)
- ✅ People (`47bdc1c4-df99-4ddc-81c4-a0214c919d69`)
- ✅ Organizations (`948f3946-7d1c-42f2-bd7e-1317a755e67b`)

---

## Step 3: Update Environment Variables

### 3.1 Update ACT Global Infrastructure

```bash
cd /Users/benknight/act-global-infrastructure

# Edit .env.local
nano .env.local
```

**Replace**:
```bash
NOTION_TOKEN=ntn_OLD_TOKEN_HERE
```

**With** (use your new token):
```bash
NOTION_TOKEN=secret_YOUR_NEW_TOKEN_HERE
```

### 3.2 Update All ACT Projects

The token is used in these projects:

1. **ACT Global Infrastructure** - `/Users/benknight/act-global-infrastructure/.env.local`
2. **ACT Farm Studio** - `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local`
3. **Empathy Ledger** - `/Users/benknight/Code/empathy-ledger-v2/.env.local` (if exists)
4. **JusticeHub** - `/Users/benknight/Code/JusticeHub/.env.local` (if exists)
5. **The Harvest** - `/Users/benknight/Code/The Harvest Website/.env.local` (if exists)

**Quick update script**:

```bash
# Save this as update-notion-token.sh
#!/bin/bash

NEW_TOKEN="secret_YOUR_NEW_TOKEN_HERE"

PROJECTS=(
  "/Users/benknight/act-global-infrastructure"
  "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio"
  "/Users/benknight/Code/empathy-ledger-v2"
  "/Users/benknight/Code/JusticeHub"
  "/Users/benknight/Code/The Harvest Website"
  "/Users/benknight/Code/Goods Asset Register"
  "/Users/benknight/Code/ACT Farm/act-farm"
)

for PROJECT in "${PROJECTS[@]}"; do
  ENV_FILE="$PROJECT/.env.local"

  if [ -f "$ENV_FILE" ]; then
    echo "Updating $ENV_FILE"

    # Backup
    cp "$ENV_FILE" "$ENV_FILE.backup"

    # Update NOTION_TOKEN
    sed -i '' "s/NOTION_TOKEN=.*/NOTION_TOKEN=$NEW_TOKEN/" "$ENV_FILE"

    # Update NOTION_API_KEY if exists
    sed -i '' "s/NOTION_API_KEY=.*/NOTION_API_KEY=$NEW_TOKEN/" "$ENV_FILE"

    echo "  ✅ Updated"
  else
    echo "  ⚠️  $ENV_FILE not found - skipping"
  fi
done

echo ""
echo "✅ All projects updated!"
echo "Remember to update GitHub secrets too"
```

### 3.3 Update GitHub Secrets

The GitHub Actions workflows use repository secrets:

```bash
cd /Users/benknight/act-global-infrastructure

# Update NOTION_TOKEN secret
gh secret set NOTION_TOKEN
# Paste your new token when prompted

# Verify
gh secret list | grep NOTION
```

---

## Step 4: Test the New Token

### 4.1 Quick Test Script

```bash
cd /Users/benknight/act-global-infrastructure

# Test with existing database
node test-notion-raw-fetch.mjs
```

Expected output:
```
✅ SUCCESS! Token works with raw fetch
   Found X results
```

### 4.2 Test Database Creation

```bash
# This will attempt to create test databases
NOTION_TOKEN="secret_YOUR_NEW_TOKEN" \
NOTION_PARENT_PAGE_ID="2d6ebcf981cf806e8db2dc8ec5d0b414" \
node scripts/create-planning-databases.mjs
```

---

## Step 5: Verify All Locations Updated

**Checklist**:

- [ ] New token generated from https://www.notion.so/my-integrations
- [ ] Integration has access to all required databases (Step 2)
- [ ] Integration has access to parent page for creating new databases
- [ ] Updated `/act-global-infrastructure/.env.local`
- [ ] Updated `/ACT Farm Studio/.env.local`
- [ ] Updated GitHub secret: `NOTION_TOKEN`
- [ ] Tested with `test-notion-raw-fetch.mjs` - passed ✅
- [ ] Can create databases via API - passed ✅

---

## Troubleshooting

### Error: "API token is invalid"

**Causes**:
1. Token is expired (tokens don't expire, but can be rotated)
2. Token was regenerated and old one invalidated
3. Using wrong workspace's token
4. Integration was deleted

**Solution**: Generate a new token from Step 1

### Error: "object_not_found" when querying database

**Cause**: Integration doesn't have access to the database

**Solution**: Share the database with the integration (Step 2)

### Error: "Could not create database"

**Cause**: Integration doesn't have access to the parent page

**Solution**:
1. Go to parent page: https://www.notion.so/acurioustractor/ACT-Development-Databases-2d6ebcf981cf806e8db2dc8ec5d0b414
2. Click "•••" → "+ Add connections"
3. Select your integration

### GitHub Actions still failing

**Cause**: GitHub secret not updated

**Solution**:
```bash
gh secret set NOTION_TOKEN
# Paste new token
```

---

## Token Format Reference

**Old token format** (deprecated?):
```
ntn_OLD_TOKEN_HERE
```

**Current token format**:
```
secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

If your new token starts with `secret_`, you're using the current format ✅

---

## Environment Variable Standards

### Recommended `.env.local` format:

```bash
# Notion Integration for ACT Projects
NOTION_TOKEN=secret_YOUR_TOKEN_HERE
NOTION_API_KEY=secret_YOUR_TOKEN_HERE  # Duplicate for compatibility

# Database IDs (reference - loaded from config/notion-database-ids.json in scripts)
# These are for documentation only - scripts load from JSON config
NOTION_PROJECTS_DATABASE_ID=2d6ebcf9-81cf-8141-95a0-f8688dbb7c02
NOTION_SPRINT_TRACKING_ID=2d6ebcf9-81cf-815f-a30f-c7ade0c0046d
NOTION_GITHUB_ISSUES_ID=2d5ebcf981cf80429f40ef7b39b39ca1
```

### Why duplicate NOTION_TOKEN and NOTION_API_KEY?

Some scripts use `NOTION_TOKEN`, others use `NOTION_API_KEY`. Setting both ensures compatibility across all scripts.

---

## Next Steps After Token Setup

Once token is working:

1. **Test existing database access**:
   ```bash
   node test-notion-connection.mjs
   ```

2. **Create planning databases**:
   ```bash
   node scripts/create-planning-databases.mjs
   ```

3. **Generate moon cycles**:
   ```bash
   node scripts/generate-moon-cycles.mjs --year=2025
   ```

4. **Test GitHub Actions**:
   ```bash
   gh workflow run sync-sprint-metrics.yml
   gh run list --limit 1
   ```

---

**Last Updated**: 2025-12-30
**Status**: Token invalid - needs regeneration
**Action Required**: Follow Step 1 to generate new token
