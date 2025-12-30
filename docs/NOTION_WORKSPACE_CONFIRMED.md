# Notion Workspace Confirmed - Ready to Proceed

**Date**: 2025-12-29
**Workspace**: A Curious Tractor (acurioustractor)

---

## ✅ Confirmed Notion Databases

### Parent Page
**ACT Development Databases**: `2d6ebcf981cf806e8db2dc8ec5d0b414`
- URL: https://www.notion.so/acurioustractor/ACT-Development-Databases-2d6ebcf981cf806e8db2dc8ec5d0b414
- This is where we'll create all new databases

### Existing Database (GitHub Issues)
**GitHub Issues Database**: `2d5ebcf981cf80429f40ef7b39b39ca1`
- URL: https://www.notion.so/acurioustractor/2d5ebcf981cf80429f40ef7b39b39ca1
- This is the existing database with GitHub issues
- **Use this as the source of truth** for all development tasks

---

## 🎯 Action Plan

### 1. Update Config File (Now)

```json
{
  "githubIssues": "2d5ebcf981cf80429f40ef7b39b39ca1",
  "parentPage": "2d6ebcf981cf806e8db2dc8ec5d0b414",
  "sprintTracking": "2d6ebcf9-81cf-815f-a30f-c7ade0c0046d",
  "strategicPillars": "2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1",
  "actProjects": "2d6ebcf9-81cf-8141-95a0-f8688dbb7c02",
  "deployments": "2d6ebcf9-81cf-81d1-a72e-c9180830a54e",
  "velocityMetrics": "2d6ebcf9-81cf-8123-939f-fab96227b3da",
  "weeklyReports": "2d6ebcf9-81cf-81fe-9ead-e932693cd5dc"
}
```

### 2. Create 5 New Databases in Notion UI

**All databases will be created under**: ACT Development Databases page

#### Database 1: Yearly Goals
1. Go to: https://www.notion.so/acurioustractor/ACT-Development-Databases-2d6ebcf981cf806e8db2dc8ec5d0b414
2. Click "+" → Database → Table
3. Name: "Yearly Goals"
4. Icon: 🎯
5. Properties:
   - Goal (title) - default
   - Year (number)
   - ACT Project (relation → select existing "ACT Projects" database)
   - Status (select: Not Started, In Progress, Completed)
   - Key Results (text)
   - Progress % (formula: will add after 6-Month Phases created)

#### Database 2: 6-Month Phases
1. Same parent page
2. Name: "6-Month Phases"
3. Icon: 📅
4. Properties:
   - Phase (title)
   - Start Date (date)
   - End Date (date)
   - Yearly Goal (relation → Yearly Goals)
   - Deliverables (text)
   - Status (select: Planning, Active, Complete)

#### Database 3: Moon Cycles
1. Same parent page
2. Name: "Moon Cycles"
3. Icon: 🌙
4. Properties:
   - Cycle (title)
   - Moon Phase (select: New Moon, Waxing, Full, Waning)
   - Start Date (date)
   - End Date (date)
   - 6-Month Phase (relation → 6-Month Phases)
   - Sprints (relation → Sprint Tracking database ID: 2d6ebcf9-81cf-815f-a30f-c7ade0c0046d)
   - Focus (text)
   - Ceremonies (multi-select: Planning, Review, Retrospective)

#### Database 4: Daily Work Log
1. Same parent page
2. Name: "Daily Work Log"
3. Icon: 📝
4. Properties:
   - Date (title)
   - Sprint (relation → Sprint Tracking: 2d6ebcf9-81cf-815f-a30f-c7ade0c0046d)
   - Completed Today (relation → GitHub Issues: 2d5ebcf981cf80429f40ef7b39b39ca1)
   - Time Spent (number)
   - Learnings (text)
   - Blockers (text)
   - Tomorrow's Plan (text)

#### Database 5: Subscription Tracking
1. Same parent page
2. Name: "Subscription Tracking"
3. Icon: 💳
4. Properties:
   - Vendor (title)
   - Annual Cost (number)
   - Billing Cycle (select: monthly, annual, quarterly)
   - Account Email (select: nicholas@act.place, hi@act.place, accounts@act.place)
   - Status (select: active, cancelled, trial)
   - Next Renewal (date)
   - Migration Status (select: pending, in_progress, completed)
   - Potential Savings (number)
   - Last Synced (date)

### 3. Get Database IDs

After creating each database:
1. Open the database
2. Copy URL (looks like: `.../DatabaseName-XXXXXXXXXXX`)
3. Extract the ID after the last `-`
4. Add to config file

Example:
```
URL: https://www.notion.so/.../Yearly-Goals-2d6ebcf981cf8abc123def456
ID: 2d6ebcf981cf8abc123def456
```

### 4. Update Relations (After All Created)

#### Add Progress % Rollup to Yearly Goals
1. Open Yearly Goals database
2. Add property → Rollup
3. Name: "Progress %"
4. Relation: Phases
5. Property: Progress % (from 6-Month Phases)
6. Calculate: Average

#### Add Progress % Rollup to 6-Month Phases
1. Open 6-Month Phases
2. Add property → Rollup
3. Name: "Progress %"
4. Relation: Moon Cycles (after creating relation)
5. Property: Progress % (from Moon Cycles)
6. Calculate: Average

#### Add Moon Cycles Relation to 6-Month Phases
1. Open Moon Cycles database
2. The "6-Month Phase" relation should auto-create reverse relation
3. Verify it appears in 6-Month Phases as "Moon Cycles"

---

## 🔗 Database Hierarchy (No Duplication)

```
Yearly Goals
  ↓ (relation: Phases)
6-Month Phases
  ↓ (relation: Moon Cycles)
Moon Cycles
  ↓ (relation: Sprints)
Sprint Tracking (EXISTING: 2d6ebcf9-81cf-815f-a30f-c7ade0c0046d)
  ↓ (relation: Issues)
GitHub Issues (EXISTING: 2d5ebcf981cf80429f40ef7b39b39ca1)
  ↑
Daily Work Log (also links to GitHub Issues + Sprint Tracking)
```

**Subscription Tracking** = Standalone (synced from ACT Placemat)

---

## 📝 After Creating - Next Steps

### 1. Update config/notion-database-ids.json

```json
{
  "githubIssues": "2d5ebcf981cf80429f40ef7b39b39ca1",
  "parentPage": "2d6ebcf981cf806e8db2dc8ec5d0b414",
  "sprintTracking": "2d6ebcf9-81cf-815f-a30f-c7ade0c0046d",
  "strategicPillars": "2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1",
  "actProjects": "2d6ebcf9-81cf-8141-95a0-f8688dbb7c02",
  "deployments": "2d6ebcf9-81cf-81d1-a72e-c9180830a54e",
  "velocityMetrics": "2d6ebcf9-81cf-8123-939f-fab96227b3da",
  "weeklyReports": "2d6ebcf9-81cf-81fe-9ead-e932693cd5dc",
  "yearlyGoals": "<YOUR_NEW_ID>",
  "sixMonthPhases": "<YOUR_NEW_ID>",
  "moonCycles": "<YOUR_NEW_ID>",
  "dailyWorkLog": "<YOUR_NEW_ID>",
  "subscriptionTracking": "<YOUR_NEW_ID>"
}
```

### 2. Generate Moon Cycles for 2025

```bash
cd /Users/benknight/act-global-infrastructure
node scripts/generate-moon-cycles.mjs --year 2025
```

This will auto-create ~13 moon cycle entries with dates.

### 3. Setup Sprint → Moon Cycle Relations

Manually link existing sprints to appropriate moon cycles, or run:
```bash
node scripts/link-sprints-to-moon-cycles.mjs
```

### 4. Start Daily Subscription Sync

```bash
# Add to cron or GitHub Actions
node scripts/sync-subscriptions-to-notion.mjs
```

---

## ✅ Ready State

Once all 5 databases are created and IDs added to config:

- ✅ Yearly → 6-Month → Moon Cycle → Sprint → GitHub Issues hierarchy
- ✅ Daily Work Log links to GitHub Issues + Sprints
- ✅ Subscription Tracking syncs from ACT Placemat
- ✅ No data duplication (all via relations)
- ✅ Auto-calculated progress via rollups

---

**Total time**: 30-45 minutes to create databases manually
**Automation ready**: Once IDs are in config file
