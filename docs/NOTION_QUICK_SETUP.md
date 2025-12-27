# Notion Database Setup - Quick Start (30 Minutes)

**Ready to build!** This guide will create all 7 Notion databases automatically.

---

## Prerequisites

✅ You have a Notion account
✅ You have a workspace where you want to create the databases
✅ You have 30 minutes

---

## Step 1: Create Notion Integration (5 minutes)

### 1.1 Go to Notion Integrations

Visit: https://www.notion.so/my-integrations

### 1.2 Create New Integration

- Click **"+ New integration"**
- **Name**: ACT Ecosystem Development
- **Logo**: (optional)
- **Associated workspace**: Select your workspace
- **Type**: Internal integration
- Click **Submit**

### 1.3 Copy Integration Token

- You'll see **Internal Integration Token**
- Click **Show** then **Copy**
- Save this token - you'll need it in Step 3

**Token looks like**: `ntn_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij`

---

## Step 2: Create Parent Page in Notion (2 minutes)

### 2.1 Open Notion

Go to your Notion workspace

### 2.2 Create New Page

- Click **+ New page** (or press `Cmd+N`)
- **Title**: "ACT Development Databases" (or whatever you want)
- **Icon**: 🗄️ (optional)
- Leave page empty for now

### 2.3 Share Page with Integration

- Click **Share** button (top right)
- Click **Invite**
- Search for: "ACT Ecosystem Development" (your integration name)
- Click **Invite**
- The integration now has access to this page

### 2.4 Copy Page ID

The page ID is in the URL. For example:

```
https://notion.so/myworkspace/ACT-Development-Databases-12345678901234567890abcdefabcdef
                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                         This is the page ID
```

Copy the **32-character ID** after the page title.

**Page ID looks like**: `12345678901234567890abcdefabcdef` (32 characters, no dashes)

---

## Step 3: Run the Creation Script (1 minute)

### 3.1 Set Environment Variables

In your terminal (in the global infrastructure directory):

```bash
cd ~/act-global-infrastructure

export NOTION_TOKEN="ntn_YOUR_TOKEN_HERE"
export NOTION_PARENT_PAGE_ID="YOUR_PAGE_ID_HERE"
```

**Replace**:
- `YOUR_TOKEN_HERE` with token from Step 1.3
- `YOUR_PAGE_ID_HERE` with page ID from Step 2.4

### 3.2 Run the Script

```bash
node scripts/create-notion-databases.mjs
```

### 3.3 Watch It Create Everything

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
   ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL DATABASES CREATED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**That's it!** ✨ All 7 databases are now in Notion.

---

## Step 4: Review in Notion (5 minutes)

### 4.1 Open Notion

Go back to your "ACT Development Databases" page

### 4.2 You Should See

7 new database pages:
- 🎯 Sprint Tracking
- 🎨 Strategic Pillars
- 🏗️ ACT Projects
- 🚀 Deployments
- 📈 Velocity Metrics
- 📝 Weekly Reports

### 4.3 Check Test Data

**Sprint Tracking** should have:
- 1 entry: "Sprint 4"
- Status: Active
- Dates: Dec 20 - Jan 3
- Duration formula: showing "2" (weeks)

**Strategic Pillars** should have:
- 6 entries (all pillars)
- Each with description and mission statement

**ACT Projects** should have:
- 7 entries (all your projects)
- Each with GitHub repo and production URL

---

## Step 5: Link Databases (Manual - 15 minutes)

The script creates databases, but **relations need to be added manually** (Notion API limitation).

### 5.1 Add Relation to Sprint Tracking

1. Open **Sprint Tracking** database
2. Click **+ Add a property** (in table header)
3. Property name: "Issues"
4. Property type: **Relation**
5. Select database: Find and select **your existing "GitHub Issues" database**
6. Click **Add relation**

Repeat for:
- **Strategic Focus** → Strategic Pillars database

### 5.2 Add Relation to ACT Projects

1. Open **ACT Projects** database
2. Add property: "Strategic Pillar" → Strategic Pillars
3. Add property: "Issues" → GitHub Issues

### 5.3 Add Relation to Deployments

1. Open **Deployments** database
2. Add property: "Project" → ACT Projects
3. Add property: "Issues Closed" → GitHub Issues

### 5.4 Add Relation to Velocity Metrics

1. Open **Velocity Metrics** database
2. Add property: "Sprint" → Sprint Tracking

### 5.5 Add Relation to Weekly Reports

1. Open **Weekly Reports** database
2. Add property: "Sprint" → Sprint Tracking

### 5.6 Link Strategic Pillars to Projects

1. Open **Strategic Pillars** database
2. Add property: "Primary Projects" → ACT Projects
3. Add property: "Issues" → GitHub Issues

### 5.7 Enhance GitHub Issues

1. Open your existing **GitHub Issues** database
2. Add these NEW properties:
   - "Effort Points" (Number)
   - "Actual Hours" (Number)
   - "Strategic Pillar" → Strategic Pillars (Relation)
   - "Sprint Relation" → Sprint Tracking (Relation)
   - "Assigned To" (Person)
   - "Started Date" (Date)
   - "Completed Date" (Date)
   - "Days to Complete" (Formula): `dateBetween(prop("Completed Date"), prop("Started Date"), "days")`
   - "Community Impact" (Select): High, Medium, Low, None

---

## Step 6: Add Rollups (Manual - 5 minutes)

After relations are created, add rollups:

### 6.1 Sprint Tracking Rollups

1. Open **Sprint Tracking**
2. Add property: "Total Issues"
   - Type: **Rollup**
   - Relation: Issues
   - Property: Title
   - Calculate: Count all
3. Add property: "Completed Issues"
   - Type: **Rollup**
   - Relation: Issues
   - Property: Status
   - Calculate: Count values
   - Value: "Done"
4. Repeat for:
   - "In Progress" (Count where Status = "In Progress")
   - "Blocked" (Count where Status = "Blocked")
   - "Total Effort Points" (Sum of Effort Points)
   - "Completed Effort" (Sum of Effort Points where Status = "Done")

### 6.2 ACT Projects Rollups

1. Open **ACT Projects**
2. Add:
   - "Active Issues" (Count all Issues)
   - "In Current Sprint" (Count where Sprint = "Sprint 4")
   - "Blocked" (Count where Status = "Blocked")

### 6.3 Strategic Pillars Rollups

1. Open **Strategic Pillars**
2. Add:
   - "Issues This Quarter" (Count all Issues)
   - "Completed This Quarter" (Count where Status = "Done")

---

## Step 7: Verify Everything Works (2 minutes)

### 7.1 Check Sprint Tracking

1. Open **Sprint Tracking**
2. Click on "Sprint 4"
3. In "Issues" relation, try linking one test issue
4. Verify "Total Issues" rollup shows "1"
5. Verify formulas calculate (Duration, Velocity, Completion %)

### 7.2 Check ACT Projects

1. Open **ACT Projects**
2. Click on "Empathy Ledger"
3. Link to Strategic Pillar: "Ethical Storytelling"
4. Verify it appears

### 7.3 All Good? ✅

If formulas work and relations link, you're ready for sync scripts!

---

## Troubleshooting

### "Integration not found"
- Make sure you shared the parent page with the integration (Step 2.3)

### "Invalid page ID"
- Double-check you copied the full 32-character ID (Step 2.4)
- Remove any dashes (should be 32 characters exactly)

### "Permission denied"
- Make sure integration has access to the workspace (Step 1.2)
- Re-share the parent page with integration

### Relations not working
- Make sure you created the relation on BOTH databases
- Try removing and re-adding the relation
- Restart Notion (sometimes helps)

---

## What You Now Have

✅ **7 Notion Databases**:
1. Sprint Tracking (with Sprint 4 test data)
2. Strategic Pillars (with 6 pillars)
3. ACT Projects (with 7 projects)
4. Deployments (ready for automation)
5. Velocity Metrics (ready for automation)
6. Weekly Reports (ready for automation)
7. GitHub Issues (enhanced with new properties)

✅ **Test Data**:
- Sprint 4 active sprint
- All 6 strategic pillars
- All 7 ACT projects

✅ **Ready for**:
- Building sync scripts
- Creating dashboards
- Automating reports

---

## Next Steps

**Now that databases exist**, we can:

1. **Test with real data** - Link some GitHub issues to Sprint 4
2. **Build sync scripts** - Automate GitHub → Notion sync
3. **Create dashboards** - Executive, Developer, Community views
4. **Add automation** - Weekly reports, deployment tracking

**Share Notion workspace URL** and I'll verify everything looks good! ✅

---

**Questions?** Just ask and I'll help troubleshoot! 🚀
