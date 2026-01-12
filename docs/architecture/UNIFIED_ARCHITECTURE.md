# Unified Notion Architecture - No Duplication

**Status**: Ready to implement
**Your existing database**: `2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1` (GitHub Issues)

---

## 🎯 Architecture Overview

### Current State
You have:
- ✅ **GitHub Issues Database** (`2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1`)
  - Already syncing from GitHub Actions
  - Contains all your GitHub Project issues
  - This is your **source of truth**

We created:
- 📊 **Sprint Tracking** (`2d6ebcf9-81cf-815f-a30f-c7ade0c0046d`)
- 🎨 **Strategic Pillars** (`2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1`)
- 🏗️ **ACT Projects** (`2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`)
- 🚀 **Deployments** (`2d6ebcf9-81cf-81d1-a72e-c9180830a54e`)
- 📈 **Velocity Metrics** (`2d6ebcf9-81cf-8123-939f-fab96227b3da`)
- 📝 **Weekly Reports** (`2d6ebcf9-81cf-81fe-9ead-e932693cd5dc`)

### Unified Architecture (No Duplication)

```
GitHub Project (149 issues)
  ↓
  ↓ (existing sync)
  ↓
┌─────────────────────────────────────┐
│  GitHub Issues Database (PRIMARY)   │ ← Your existing database
│  - Issue #123                       │
│  - Issue #124                       │
│  - Each has Sprint relation →       │
└─────────────────────────────────────┘
         ↓ (relation)
         ↓
┌─────────────────────────────────────┐
│  Sprint Tracking (ROLLUPS)          │
│  - Backlog                          │
│  - Sprint 4                         │
│  - Sprint 5                         │
│  - Total Issues (rollup from ↑)    │
│  - Completed (rollup from ↑)       │
└─────────────────────────────────────┘
```

**No duplication**: Issues live in ONE place (GitHub Issues DB), sprints calculate metrics via relations.

---

## 🔧 Setup Steps

### Step 1: Add Sprint Relation to GitHub Issues Database

**Manual (5 min in Notion UI)**:
1. Open your GitHub Issues database: https://www.notion.so/2d5ebcf981cf80429f40ef7b39b39ca1
2. Click `+ Add a property`
3. Name: "Sprint"
4. Type: **Relation**
5. Link to database: "Sprint Tracking"
6. Check "Show on Sprint Tracking" → This creates reverse relation called "Issues"

**Or run script**:
```bash
cd ~/act-global-infrastructure
NOTION_TOKEN=your_working_token node scripts/setup-database-relations.mjs
```

### Step 2: Create Sprint Entries

Run the script to create Backlog, Sprint 4, Sprint 5:
```bash
cd ~/act-global-infrastructure
NOTION_TOKEN=your_working_token node scripts/create-sprint-entries.mjs
```

This creates 3 sprint pages in Sprint Tracking database.

### Step 3: Add Rollups to Sprint Tracking

**Manual (10 min in Notion UI)**:

Open Sprint Tracking database, add these properties:

1. **Total Issues (Rollup)**:
   - Type: Rollup
   - Relation: Issues
   - Property: Name (or any property)
   - Calculate: Count all

2. **Completed Issues (Rollup)**:
   - Type: Rollup
   - Relation: Issues
   - Property: Status
   - Calculate: Count values
   - Filter: Where Status = Done

3. **In Progress (Rollup)**:
   - Type: Rollup
   - Relation: Issues
   - Property: Status
   - Calculate: Count values
   - Filter: Where Status = In Progress

4. **Blocked (Rollup)**:
   - Type: Rollup
   - Relation: Issues
   - Property: Status
   - Calculate: Count values
   - Filter: Where Status = Blocked

5. **Completion % (Formula)**:
   - Type: Formula
   - Expression: `round(prop("Completed Issues (Rollup)") / prop("Total Issues (Rollup)") * 100)`

### Step 4: Update Existing Sync Script

**File**: `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/scripts/sync-github-to-notion.mjs`

**Add** this function to link issues to sprints:

```javascript
/**
 * Get sprint from GitHub Project field
 */
function getSprintField(item) {
  const fieldValues = item.fieldValues?.nodes || [];
  const sprintField = fieldValues.find(
    field => field.field?.name === 'Sprint'
  );
  return sprintField?.name || null;
}

/**
 * Find sprint page ID by name
 */
async function findSprintPageId(sprintName) {
  const response = await notion.databases.query({
    database_id: '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d', // Sprint Tracking DB
    filter: {
      property: 'Sprint Name',
      title: {
        equals: sprintName
      }
    }
  });

  return response.results[0]?.id || null;
}
```

**Update** the `createOrUpdateNotionPage` function to add:

```javascript
// Get sprint from GitHub
const sprintName = getSprintField(item);
let sprintRelation = undefined;

if (sprintName) {
  const sprintPageId = await findSprintPageId(sprintName);
  if (sprintPageId) {
    sprintRelation = {
      Sprint: {
        relation: [{ id: sprintPageId }]
      }
    };
  }
}

// Add to properties
const properties = {
  // ... existing properties ...
  ...sprintRelation  // Add sprint relation
};
```

---

## 🚀 How It Works

### Data Flow

1. **GitHub → GitHub Issues DB** (your existing sync)
   - Issues sync from GitHub Project
   - Each issue gets Sprint field value from GitHub

2. **GitHub Issues DB → Sprint Tracking** (via relations)
   - Each issue links to its sprint via Sprint relation
   - Sprint Tracking rolls up counts automatically

3. **No duplicate data**
   - Issues stored once (in GitHub Issues DB)
   - Sprint metrics calculated via Notion rollups
   - Always in sync

### Example

**GitHub Issue #123**:
- Status: Done
- Sprint field (in GitHub Project): "Sprint 4"

**Syncs to Notion**:
```
GitHub Issues Database
├─ Issue #123
│  ├─ Status: Done
│  └─ Sprint: → [Sprint 4 page]
```

**Sprint Tracking auto-calculates**:
```
Sprint 4
├─ Issues: 25 (rollup count from relation)
├─ Completed: 12 (rollup count where Status=Done)
├─ Completion: 48% (formula)
```

---

## 📊 Benefits

### ✅ No Duplication
- Issues stored once
- Single source of truth
- No sync conflicts

### ✅ Auto-Updating
- Rollups update instantly
- Change issue status → sprint metrics update
- Move issue to different sprint → both sprints update

### ✅ Flexible
- Add new sprints anytime
- Filter issues by sprint
- Track velocity over time

---

## 🔄 Updated Automation Scripts

### Current Sprint Sync Script

The existing `sync-sprint-to-notion.mjs` in act-global-infrastructure **is now obsolete** because:
- It tries to manually calculate and update sprint metrics
- With rollups, Notion does this automatically
- No need to run daily sync

**New approach**: Just ensure your existing GitHub→Notion sync adds the Sprint relation. Metrics auto-calculate.

### What Still Runs

**Keep these workflows**:

1. **GitHub Issues Sync** (your existing one in ACT Farm Studio)
   - Syncs issues from GitHub to Notion
   - Adds Sprint relation to each issue
   - Frequency: Every 30 min or on webhook

2. **Weekly Reports** (from act-global-infrastructure)
   - Queries completed issues
   - Generates stakeholder report
   - Frequency: Friday 5 PM

3. **Deployment Tracking** (from act-global-infrastructure)
   - Logs production deployments
   - Frequency: On each deploy

**Remove/Archive**:
- `sync-sprint-to-notion.mjs` - No longer needed with rollups

---

## 🎯 Quick Start Checklist

### One-Time Setup (30 min)

- [ ] 1. Add "Sprint" relation property to GitHub Issues database (manual in Notion)
- [ ] 2. Run `create-sprint-entries.mjs` to create Backlog, Sprint 4, Sprint 5
- [ ] 3. Add rollup properties to Sprint Tracking (manual in Notion)
- [ ] 4. Update existing sync script to populate Sprint relation
- [ ] 5. Run sync to link existing issues to sprints
- [ ] 6. Verify metrics auto-calculate

### Ongoing (Automated)

- ✅ GitHub issues sync every 30 min → Sprint relation added
- ✅ Sprint metrics auto-update via rollups
- ✅ Weekly reports generated Friday 5 PM
- ✅ Deployments logged on each deploy

---

## 📋 Database Relation Schema

```
┌─────────────────────┐
│  GitHub Issues      │
│  ─────────────────  │
│  Name (title)       │
│  Status (select)    │
│  Sprint (relation)  │───┐
│  Effort (number)    │   │
│  ...                │   │
└─────────────────────┘   │
                          │
                          │ (relation)
                          │
                          ↓
         ┌────────────────────────────────┐
         │  Sprint Tracking               │
         │  ────────────────────────────  │
         │  Sprint Name (title)           │
         │  Start Date (date)             │
         │  End Date (date)               │
         │  Issues (relation) ←───────────┤ (reverse relation)
         │  Total Issues (rollup)         │
         │  Completed (rollup)            │
         │  In Progress (rollup)          │
         │  Blocked (rollup)              │
         │  Completion % (formula)        │
         └────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Metrics not updating?
- Check Sprint relation exists on both sides
- Verify rollup property settings
- Refresh Notion page

### Issues not linking to sprints?
- Check sync script adds Sprint relation
- Verify sprint pages exist
- Check sprint names match exactly

### Rollups showing 0?
- Ensure issues are actually linked (click into sprint page, see Issues)
- Check rollup filter settings
- Verify relation property name matches

---

## 📞 Next Steps

1. **Set up relations** (Option A: manual in Notion UI, OR Option B: run setup script with correct token)
2. **Update sync script** to add Sprint relation when syncing issues
3. **Remove old sprint sync workflow** (no longer needed)
4. **Test**: Move an issue to a sprint, watch metrics update instantly

---

**Last Updated**: 2025-12-27
**Status**: Architecture designed, ready to implement
**Time to complete**: 30-45 minutes one-time setup
