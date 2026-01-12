# GoHighLevel Integration - Setup Guide

**Status**: ✅ Code Complete | ⏸️ Awaiting Notion Setup

This integration syncs GoHighLevel (GHL) contacts and opportunities to Notion databases every 6 hours.

---

## 📋 What's Been Built

### ✅ Complete

1. **GHL API Service** ([scripts/lib/ghl-api-service.mjs](scripts/lib/ghl-api-service.mjs))
   - Full GHL v1 API wrapper
   - Contact management
   - Opportunity tracking
   - Pipeline management
   - Tag filtering
   - Rate limiting (10 req/sec)
   - Health checks

2. **Sync Script** ([scripts/sync-ghl-to-notion.mjs](scripts/sync-ghl-to-notion.mjs))
   - Syncs GHL "Partner" contacts → Notion Partners DB
   - Syncs GHL "Grants" pipeline → Notion Grant Opportunities DB
   - Handles create/update logic
   - Error tracking and reporting
   - Added to package.json as `npm run sync:ghl`

3. **GitHub Actions Workflow** ([.github/workflows/sync-ghl.yml](.github/workflows/sync-ghl.yml))
   - Runs every 6 hours automatically
   - Can be triggered manually
   - Includes error notifications

---

## ⏸️ Required Next Steps

### Step 1: Get GHL API Credentials (5 min)

1. Log into GoHighLevel
2. Go to Settings → API & Integrations
3. Create a new API key with permissions:
   - Read Contacts
   - Read Opportunities
   - Read Pipelines
4. Copy the API Key
5. Copy your Location ID (found in Settings → Business Profile)

### Step 2: Add GitHub Secrets (2 min)

Add these secrets to the repository (Settings → Secrets and variables → Actions):

```bash
# From your terminal:
gh secret set GHL_API_KEY
# Paste the API key when prompted

gh secret set GHL_LOCATION_ID
# Paste the location ID when prompted
```

Or manually via GitHub UI:
- `GHL_API_KEY` - Your GHL API key
- `GHL_LOCATION_ID` - Your GHL location ID
- `NOTION_TOKEN` - Already set (verify it's still valid)

### Step 3: Create Notion Databases (15 min)

#### Partners Database

Create a new database in Notion with these properties:

| Property Name | Type | Description |
|--------------|------|-------------|
| Name | Title | Partner contact name |
| Organization | Text | Company name |
| Contact Email | Email | Email address |
| Phone | Phone | Phone number |
| Tags | Multi-select | GHL tags (Partner, Active, etc.) |
| GHL Contact ID | Text | GHL unique ID (for sync) |
| Last Contact | Date | Last interaction date |
| Next Check-in | Date | When to follow up |
| Projects | Relation | Link to ACT Projects database |
| Notes | Text | Additional notes |
| Last Synced | Date | Auto-updated by sync script |

#### Grant Opportunities Database

Create a new database in Notion with these properties:

| Property Name | Type | Description |
|--------------|------|-------------|
| Grant Name | Title | Name of grant/opportunity |
| Funder | Text | Organization providing grant |
| Amount | Number | Grant amount ($) |
| Deadline | Date | Application deadline |
| Status | Select | Prospective, Applied, Awarded, Declined |
| GHL Opportunity ID | Text | GHL unique ID (for sync) |
| ACT Projects | Relation | Link to ACT Projects database |
| Notes | Text | Application notes |
| Last Synced | Date | Auto-updated by sync script |

**Status Select Options**:
- Prospective (gray)
- Applied (yellow)
- Awarded (green)
- Declined (red)

### Step 4: Update Configuration (2 min)

Add the new database IDs to `config/notion-database-ids.json`:

```json
{
  "githubIssues": "existing-id-here",
  "sprintTracking": "existing-id-here",
  // ... existing databases ...

  "partners": "YOUR_PARTNERS_DB_ID_HERE",
  "grantOpportunities": "YOUR_GRANTS_DB_ID_HERE"
}
```

To get database IDs:
1. Open the database in Notion
2. Click "..." → "Copy link"
3. Extract the ID from the URL: `https://notion.so/{workspace}/{THIS_IS_THE_ID}?v=...`

### Step 5: Test Locally (5 min)

```bash
cd /Users/benknight/act-global-infrastructure

# Set environment variables for testing
export GHL_API_KEY="your-key-here"
export GHL_LOCATION_ID="your-location-id"
export NOTION_TOKEN="your-notion-token"

# Run the sync
npm run sync:ghl
```

Expected output:
```
═══════════════════════════════════════════════════════
   GHL → Notion Sync
═══════════════════════════════════════════════════════

🔍 Running health checks...
   ✅ GHL API connected
   ✅ Notion API connected

🤝 Syncing Partners...
   Found 12 partners in GHL
   Found 0 existing partners in Notion
++++++++++++
   ✅ Partners sync complete

💰 Syncing Grant Opportunities...
   Found pipeline: "Grants"
   Found 5 grant opportunities in GHL
   Found 0 existing grants in Notion
+++++
   ✅ Grants sync complete

═══════════════════════════════════════════════════════
   Sync Complete
═══════════════════════════════════════════════════════

Partners:
   Created: 12
   Updated: 0
   Errors:  0

Grants:
   Created: 5
   Updated: 0
   Errors:  0

⏱️  Duration: 3.2s
```

### Step 6: Enable GitHub Actions (1 min)

The workflow will run automatically every 6 hours starting when you push this code.

To trigger manually:
1. Go to Actions tab in GitHub
2. Select "Sync GoHighLevel to Notion"
3. Click "Run workflow"

---

## 🔧 Configuration

### GHL Tags

The sync looks for contacts tagged **"Partner"** in GHL. To sync different contacts:

1. Edit [scripts/sync-ghl-to-notion.mjs](scripts/sync-ghl-to-notion.mjs)
2. Change line ~50: `await ghl.getAllContactsByTag('Partner')`
3. Use a different tag or multiple tags

### GHL Pipeline

The sync looks for a pipeline containing **"Grant"** in the name. If your grants pipeline has a different name:

1. Edit [scripts/sync-ghl-to-notion.mjs](scripts/sync-ghl-to-notion.mjs)
2. Change line ~142: `await ghl.getPipelineByName('Grant')`
3. Update to match your pipeline name

### Sync Frequency

Default: Every 6 hours

To change:
1. Edit [.github/workflows/sync-ghl.yml](.github/workflows/sync-ghl.yml)
2. Change line 6: `- cron: '0 */6 * * *'`

Common cron schedules:
- Every 3 hours: `'0 */3 * * *'`
- Every 12 hours: `'0 */12 * * *'`
- Daily at 9am: `'0 9 * * *'`

---

## 📊 What Gets Synced

### Partners (GHL Contacts → Notion)
- Name, Email, Phone
- Organization
- All GHL tags
- Creation date → Last Contact
- Auto-updated every sync

### Grants (GHL Opportunities → Notion)
- Grant name
- Funder (from custom field)
- Amount (monetary value)
- Deadline (from custom field)
- Status (mapped from GHL status)
- Auto-updated every sync

### Status Mapping

| GHL Status | Notion Status |
|-----------|---------------|
| Open | Prospective |
| Won | Awarded |
| Lost | Declined |
| Abandoned | Declined |

---

## 🚀 Next: Knowledge Ingestion

Once partners and grants are syncing to Notion, add them to the knowledge base:

File: `/Users/benknight/Code/act-regenerative-studio/src/lib/ai-intelligence/knowledge-ingestion-service.ts`

Add method:
```typescript
async ingestGHLKnowledge() {
  // Fetch from Notion Partners + Grants databases
  // Create knowledge chunks
  // Embed and store
}
```

This enables queries like:
- `npm run ask "Who are our active partners?"`
- `npm run ask "Grant deadlines this month"`
- `npm run ask "Partners working on JusticeHub"`

---

## 🐛 Troubleshooting

### "GHL API unhealthy"
- Check `GHL_API_KEY` is set correctly
- Verify API key has required permissions in GHL
- Test at: https://rest.gohighlevel.com/v1/contacts/tags

### "Notion API unhealthy"
- Check `NOTION_TOKEN` is set
- Verify token has access to the databases
- Check database IDs in config file are correct

### "No Grants pipeline found"
- Verify you have a pipeline in GHL with "Grant" in the name
- Or update the script to match your pipeline name

### Contacts/Grants not syncing
- Check the tag in GHL matches "Partner" exactly (case-sensitive)
- Verify contacts have the tag applied
- Check GitHub Actions logs for errors

---

## 📁 Files Created

```
/Users/benknight/act-global-infrastructure/
├── scripts/
│   ├── lib/
│   │   └── ghl-api-service.mjs        # GHL API wrapper (new)
│   └── sync-ghl-to-notion.mjs         # Sync script (new)
├── .github/workflows/
│   └── sync-ghl.yml                   # Automation (new)
├── config/
│   └── notion-database-ids.json       # Update with new IDs
└── package.json                       # Added "sync:ghl" script
```

---

## ✅ Completion Checklist

- [ ] Get GHL API key and location ID
- [ ] Add GitHub secrets (GHL_API_KEY, GHL_LOCATION_ID)
- [ ] Create Partners database in Notion
- [ ] Create Grant Opportunities database in Notion
- [ ] Add database IDs to config file
- [ ] Test sync locally (`npm run sync:ghl`)
- [ ] Push to GitHub to enable automation
- [ ] Verify first automated sync runs successfully
- [ ] (Optional) Add knowledge ingestion for GHL data

---

**Estimated Total Time**: 30 minutes
**Next**: Week 2 - Notification Engine + Work Queue Enhancement

---

**Created**: 2025-12-31
**Status**: Ready for Notion database setup
