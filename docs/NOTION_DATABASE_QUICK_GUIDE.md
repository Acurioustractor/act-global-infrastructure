# Notion Database Quick Guide - Manual Setup

**Date**: 2025-12-29
**Status**: Skip API verification, proceed with manual setup

---

## 📊 Current Databases (Reference Only)

### ACT Global Infrastructure
- GitHub Issues: `2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1`
- Sprint Tracking: `2d6ebcf9-81cf-815f-a30f-c7ade0c0046d`
- Strategic Pillars: `2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1`
- ACT Projects: `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`
- Deployments: `2d6ebcf9-81cf-81d1-a72e-c9180830a54e`
- Velocity Metrics: `2d6ebcf9-81cf-8123-939f-fab96227b3da`
- Weekly Reports: `2d6ebcf9-81cf-81fe-9ead-e932693cd5dc`

### ACT Studio
- Projects: `177ebcf9-81cf-80dd-9514-f1ec32f3314c`
- Actions: `177ebcf9-81cf-8023-af6e-dff974284218`
- People: `47bdc1c4-df99-4ddc-81c4-a0214c919d69`
- Organizations: `948f3946-7d1c-42f2-bd7e-1317a755e67b`

---

## ✅ Skip Verification - Just Create New Databases

Since the token works for some operations (GitHub Actions), let's just create the new databases manually in Notion and link them.

---

## 🆕 New Databases to Create (Manual in Notion UI)

### 1. Yearly Goals

**To create in Notion:**
1. Go to your Notion workspace
2. Create new database → Table
3. Name: "Yearly Goals"
4. Add properties:
   - Goal (title) - already exists
   - Year (number)
   - ACT Project (relation to existing ACT Projects db)
   - Status (select: Not Started, In Progress, Completed)
   - Key Results (text)
   - Phases (relation to 6-Month Phases - create after)
   - Progress % (rollup from Phases)

### 2. 6-Month Phases

1. Create new database
2. Name: "6-Month Phases"
3. Properties:
   - Phase (title)
   - Start Date (date)
   - End Date (date)
   - Yearly Goal (relation to Yearly Goals)
   - Moon Cycles (relation to Moon Cycles - create after)
   - Deliverables (text)
   - Status (select: Planning, Active, Complete)
   - Progress % (rollup from Moon Cycles)

### 3. Moon Cycles

1. Create new database
2. Name: "Moon Cycles"
3. Properties:
   - Cycle (title)
   - Moon Phase (select: New Moon, Waxing, Full, Waning)
   - Start Date (date)
   - End Date (date)
   - 6-Month Phase (relation to 6-Month Phases)
   - Sprints (relation to Sprint Tracking - use existing)
   - Focus (text)
   - Ceremonies (multi-select: Planning, Review, Retrospective)
   - Progress % (rollup from Sprints)

### 4. Daily Work Log

1. Create new database
2. Name: "Daily Work Log"
3. Properties:
   - Date (title)
   - Sprint (relation to Sprint Tracking - use existing)
   - Completed Today (relation to GitHub Issues - use existing)
   - Time Spent (number)
   - Learnings (text)
   - Blockers (text)
   - Tomorrow's Plan (text)

### 5. Subscription Tracking

1. Create new database
2. Name: "Subscription Tracking"
3. Properties:
   - Vendor (title)
   - Annual Cost (number)
   - Billing Cycle (select: monthly, annual)
   - Account Email (select: nicholas@, hi@, accounts@)
   - Status (select: active, cancelled, trial)
   - Next Renewal (date)
   - Migration Status (select: pending, in_progress, completed)
   - Potential Savings (number)
   - Last Synced (date)

---

## 🔗 How to Link Databases

### Link Moon Cycles to Sprint Tracking

1. Open Moon Cycles database
2. Click "Sprints" relation property
3. Select existing "Sprint Tracking" database
4. Choose "Show on Sprint Tracking" → name it "Moon Cycle"

### Link Daily Work Log to GitHub Issues

1. Open Daily Work Log
2. Click "Completed Today" relation
3. Select existing "GitHub Issues" database
4. Choose "Show on GitHub Issues" (optional)

---

## 📝 After Creating - Get Database IDs

### To find database ID:

1. Open the database in Notion
2. Copy the URL - it looks like:
   `https://notion.so/workspace/DatabaseName-2d6ebcf981cf815fa30fc7ade0c0046d`
3. The ID is the last part: `2d6ebcf981cf815fa30fc7ade0c0046d`

### Update config file:

```bash
cd /Users/benknight/act-global-infrastructure

# Edit config/notion-database-ids.json
# Add:
{
  "githubIssues": "2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1",
  "sprintTracking": "2d6ebcf9-81cf-815f-a30f-c7ade0c0046d",
  ...
  "yearlyGoals": "<paste_id_here>",
  "sixMonthPhases": "<paste_id_here>",
  "moonCycles": "<paste_id_here>",
  "dailyWorkLog": "<paste_id_here>",
  "subscriptionTracking": "<paste_id_here>"
}
```

---

## 🎯 That's It!

Once you've created the 5 new databases and got their IDs, we can:
1. Set up the sync scripts
2. Auto-generate moon cycles for 2025
3. Connect to GitHub/Notion automation
4. Build the unified dashboard

**Estimated time**: 30-45 minutes to create all 5 databases manually in Notion

---

**Next step**: Create the databases, grab the IDs, and we'll proceed with automation
