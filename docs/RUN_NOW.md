# 🚀 Run Notion Database Creation - RIGHT NOW

**You already have**: NOTION_TOKEN in .env.local ✅
**You need**: NOTION_PARENT_PAGE_ID (5 minutes to get)

---

## Step 1: Create Parent Page in Notion (5 min)

### 1.1 Open Notion
Go to your Notion workspace

### 1.2 Create New Page
- Click **+ New page** (or press `Cmd+N`)
- **Title**: "ACT Development Databases" (or whatever you want)
- **Icon**: 🗄️ (optional)
- Leave page empty for now

### 1.3 Share Page with Integration
- Click **Share** button (top right)
- Click **Invite**
- Search for your integration (you should already have one created for the existing Notion sync)
- Click **Invite**
- The integration now has access to this page

### 1.4 Copy Page ID

The page ID is in the URL. For example:

```
https://notion.so/myworkspace/ACT-Development-Databases-12345678901234567890abcdefabcdef
                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                         This is the page ID
```

Copy the **32-character ID** after the page title.

**Page ID looks like**: `12345678901234567890abcdefabcdef` (32 characters, no dashes)

---

## Step 2: Run the Script (1 min)

```bash
cd ~/act-global-infrastructure

# Use your existing token from .env.local
export NOTION_TOKEN="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"

# Set the parent page ID you just copied
export NOTION_PARENT_PAGE_ID="YOUR_PAGE_ID_HERE"

# Run the script
node scripts/create-notion-databases.mjs
```

---

## Step 3: Watch It Create Everything

You'll see output like:

```
🚀 Starting Notion database creation...
📄 Parent Page: 12345678901234567890abcdefabcdef

📊 Creating Sprint Tracking database...
✅ Sprint Tracking created: abcd1234-5678-90ab-cdef-1234567890ab
   URL: https://notion.so/...
   Adding test data (Sprint 4)...
   ✅ Test data added

🎨 Creating Strategic Pillars database...
✅ Strategic Pillars created: ...
   Adding test data (6 pillars)...
   ✅ Added: Ethical Storytelling
   ✅ Added: Justice Reimagined
   ✅ Added: Community Resilience
   ✅ Added: Circular Economy & Community-Designed Goods
   ✅ Added: Regeneration at Scale
   ✅ Added: Art of Social Impact

🏗️ Creating ACT Projects database...
✅ ACT Projects created: ...
   Adding test data (7 projects)...
   ✅ Added: ACT Farm Studio
   ✅ Added: Empathy Ledger
   ✅ Added: JusticeHub
   ✅ Added: The Harvest
   ✅ Added: Goods
   ✅ Added: BCV/ACT Farm
   ✅ Added: ACT Placemat

🚀 Creating Deployments database...
✅ Deployments created: ...

📈 Creating Velocity Metrics database...
✅ Velocity Metrics created: ...

📝 Creating Weekly Reports database...
✅ Weekly Reports created: ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL DATABASES CREATED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**That's it!** ✨ All 7 databases are now in Notion.

---

## Step 4: Review in Notion (5 min)

Go back to your "ACT Development Databases" page in Notion.

You should see 7 new database pages:
- 🎯 Sprint Tracking
- 🎨 Strategic Pillars
- 🏗️ ACT Projects
- 🚀 Deployments
- 📈 Velocity Metrics
- 📝 Weekly Reports

Check the test data:
- **Sprint Tracking**: Should have "Sprint 4" entry
- **Strategic Pillars**: Should have 6 pillars
- **ACT Projects**: Should have 7 projects

---

## Step 5: Next Steps (After Creation)

Once databases are created, we need to manually link them (Notion API limitation):

1. **Add Relations** - Link databases together
2. **Add Rollups** - Calculate metrics from relations
3. **Test Formulas** - Verify calculations work

**See**: [NOTION_QUICK_SETUP.md](NOTION_QUICK_SETUP.md#step-5-link-databases-manual---15-minutes) for detailed instructions

---

## Troubleshooting

### "Integration not found"
→ Make sure you shared the parent page with your integration (Step 1.3)

### "Invalid page ID"
→ Double-check you copied the full 32-character ID (Step 1.4)
→ Remove any dashes (should be 32 characters exactly)

### "Permission denied"
→ Make sure integration has access to the workspace
→ Re-share the parent page with integration

---

**Ready?** Just get the page ID and run the script! 🚀
