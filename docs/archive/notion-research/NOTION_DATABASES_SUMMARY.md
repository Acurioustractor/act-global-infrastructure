# Notion Databases Summary - No Duplication Strategy

**Date**: 2025-12-29

---

## 📊 Current Databases (11 total)

### ✅ Active & In Use (7 databases)

1. **GitHub Issues** - `2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1`
   - All development tasks from GitHub Projects
   - Synced every 30 minutes
   - **Source of Truth**: GitHub Projects (read-only in Notion)

2. **Sprint Tracking** - `2d6ebcf9-81cf-815f-a30f-c7ade0c0046d`
   - Sprint metrics, velocity, burndown
   - Auto-calculated from GitHub Issues rollups
   - **Source of Truth**: Notion (but data comes from GitHub Issues)

3. **Strategic Pillars** - `2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1`
   - High-level strategic goals
   - Manually maintained

4. **ACT Projects** - `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`
   - Master list of all ACT ecosystem projects
   - Manually maintained
   - **Used by**: GitHub Issues, Yearly Goals (planned)

5. **Deployments** - `2d6ebcf9-81cf-81d1-a72e-c9180830a54e`
   - Production deployment tracking
   - **Status**: Created but not actively synced yet
   - **TODO**: Activate log-deployment workflow

6. **Velocity Metrics** - `2d6ebcf9-81cf-8123-939f-fab96227b3da`
   - Sprint velocity history
   - **May be redundant** with Sprint Tracking

7. **Weekly Reports** - `2d6ebcf9-81cf-81fe-9ead-e932693cd5dc`
   - Automated weekly summaries
   - Generated Friday 5pm

### ⚠️ Need Investigation (4 databases - ACT Studio)

8. **Projects** (ACT Studio) - `177ebcf9-81cf-80dd-9514-f1ec32f3314c`
   - **Potential duplicate** of ACT Projects above?
   - Need to verify purpose

9. **Actions** (ACT Studio) - `177ebcf9-81cf-8023-af6e-dff974284218`
   - Non-GitHub tasks?
   - **Question**: What's here that's not in GitHub Issues?

10. **People** (ACT Studio) - `47bdc1c4-df99-4ddc-81c4-a0214c919d69`
    - People database
    - Likely unique, keep

11. **Organizations** (ACT Studio) - `948f3946-7d1c-42f2-bd7e-1317a755e67b`
    - Organizations database
    - Likely unique, keep

---

## 🆕 New Databases to Create (5 total)

### Multi-Timeframe Planning

12. **Yearly Goals** (new)
    - 1-year strategic goals
    - Links to: ACT Projects (existing)
    - ~5-10 entries per year

13. **6-Month Phases** (new)
    - Break yearly goals into phases
    - Links to: Yearly Goals
    - ~10-20 entries per year

14. **Moon Cycles** (new)
    - ~29-day lunar planning cycles
    - Links to: Sprint Tracking (existing), 6-Month Phases
    - ~12-13 entries per year

15. **Daily Work Log** (new)
    - Daily developer activity
    - Links to: Sprint Tracking (existing), GitHub Issues (existing)
    - ~365 entries per dev per year

### Subscription Intelligence

16. **Subscription Tracking** (new)
    - ACT subscriptions (synced from ACT Placemat)
    - **Source of Truth**: ACT Placemat Supabase
    - Synced daily at 9am
    - ~50-100 entries

---

## 🔗 How Databases Link (No Duplication)

```
┌─────────────────────────────────────────────────────────────┐
│                     TIMEFRAME HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Yearly Goals (NEW)                                          │
│    ├─ Links to: ACT Projects (EXISTING)                     │
│    └─ Linked from: 6-Month Phases                           │
│                                                              │
│  6-Month Phases (NEW)                                        │
│    ├─ Links to: Yearly Goals                                │
│    └─ Linked from: Moon Cycles                              │
│                                                              │
│  Moon Cycles (NEW)                                           │
│    ├─ Links to: 6-Month Phases                              │
│    ├─ Links to: Sprint Tracking (EXISTING)                  │
│    └─ Progress calculated from Sprint rollup                │
│                                                              │
│  Sprint Tracking (EXISTING)                                  │
│    ├─ Links to: GitHub Issues (EXISTING) via relation       │
│    ├─ Metrics auto-calculated from rollups                  │
│    └─ Linked from: Moon Cycles, Daily Work Log              │
│                                                              │
│  Daily Work Log (NEW)                                        │
│    ├─ Links to: Sprint Tracking (EXISTING)                  │
│    └─ Links to: GitHub Issues (EXISTING)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT TRACKING                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GitHub Issues (EXISTING) ← SOURCE OF TRUTH                  │
│    ├─ Synced FROM: GitHub Projects (every 30 min)           │
│    ├─ Links to: ACT Projects (EXISTING)                     │
│    └─ Linked from: Sprint Tracking, Daily Work Log          │
│                                                              │
│  Deployments (EXISTING)                                      │
│    ├─ Synced FROM: Vercel API (on deploy)                   │
│    └─ Links to: GitHub Issues                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SUBSCRIPTION TRACKING                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACT Placemat Supabase ← SOURCE OF TRUTH                     │
│    ↓ Daily sync (9am)                                       │
│  Subscription Tracking (NEW) - Read-only view               │
│    └─ Display only, never edit in Notion                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚫 Duplication Prevention Rules

### 1. Single Source of Truth Principle

**Rule**: Each data entity has ONE master database

| Entity | Master Database | Sync Direction | Can Edit? |
|--------|----------------|----------------|-----------|
| Development Tasks | GitHub Issues | GitHub → Notion | ❌ No (edit in GitHub) |
| Sprint Metrics | Sprint Tracking | Auto-calculated | ❌ No (calculated from rollups) |
| Subscriptions | ACT Placemat Supabase | ACT Placemat → Notion | ❌ No (view only) |
| Deployments | Deployments | Vercel → Notion | ❌ No (auto-synced) |
| Projects | ACT Projects | Manual | ✅ Yes |
| Goals/Phases | Yearly Goals, Phases | Manual | ✅ Yes |
| Moon Cycles | Moon Cycles | Auto-generated + Manual | ✅ Yes |

### 2. Linking, Not Copying

**BAD** (duplication):
```
Sprint Tracking:
  - Sprint Name: "Sprint 5"
  - Issue 1 Title: "Add subscription dashboard"  ❌ Duplicated
  - Issue 2 Title: "Fix login bug"               ❌ Duplicated
  - Total Issues: 20                             ❌ Manually counted
```

**GOOD** (relations + rollups):
```
Sprint Tracking:
  - Sprint Name: "Sprint 5"
  - Issues: [Relation to GitHub Issues]          ✅ Linked
  - Total Issues: [Rollup count of Issues]       ✅ Auto-calculated
  - Completed: [Rollup count where Status=Done]  ✅ Auto-calculated
```

### 3. One-Way Sync Only

**Sources** (never edit the synced data):
- GitHub Issues → FROM GitHub Projects
- Deployments → FROM Vercel API
- Subscription Tracking → FROM ACT Placemat API

**Editable** (manual or auto-generated):
- Sprint Tracking (calculated from rollups)
- ACT Projects (manually maintained)
- Yearly Goals, Phases, Moon Cycles (manual)
- Daily Work Log (manual entries)

---

## 📝 Setup Checklist

### Phase 1: Verify Existing (1-2 hours)

- [ ] Check if ACT Studio "Projects" = Global "ACT Projects" (possible duplicate)
- [ ] Verify "Actions" database purpose - merge with GitHub Issues if duplicate
- [ ] Confirm "People" and "Organizations" are unique and needed
- [ ] Test GitHub Issues sync is working (should update every 30 min)
- [ ] Activate Deployments sync (deploy log-deployment workflow)

### Phase 2: Create Planning Databases (3-4 hours)

- [ ] Run `scripts/create-planning-databases.mjs`
  - Creates: Yearly Goals, 6-Month Phases, Moon Cycles, Daily Work Log
- [ ] Run `scripts/generate-moon-cycles.mjs --year 2025`
  - Auto-generates 12-13 moon cycle entries
- [ ] Run `scripts/setup-timeframe-relations.mjs`
  - Links Moon Cycles → Sprint Tracking
  - Links Daily Work Log → Sprint Tracking + GitHub Issues
  - Adds rollup properties for auto-calculation

### Phase 3: Create Subscription Database (1-2 hours)

- [ ] Run `scripts/create-subscription-database.mjs`
  - Creates: Subscription Tracking database
- [ ] Set up daily sync:
  - Add `scripts/sync-subscriptions-to-notion.mjs`
  - Add `.github/workflows/daily-subscription-scan.yml`
  - Test sync from ACT Placemat API

### Phase 4: Test & Validate (2-3 hours)

- [ ] Verify all relations work (can link entries)
- [ ] Test rollup calculations (metrics auto-update)
- [ ] Confirm one-way syncs don't allow editing
- [ ] Check no data is duplicated
- [ ] Validate sync schedules are working

---

## 🎯 Final Database Count

**Before**: 11 databases (7 active + 4 to verify)
**After**: 14-16 databases (depends on deduplication)

**Active databases**:
- 7 existing (GitHub Issues, Sprint Tracking, etc)
- 5 new (Yearly Goals, Phases, Moon Cycles, Daily Work Log, Subscriptions)
- 2-4 ACT Studio (People, Organizations, possibly Projects/Actions)

**Strategy**: Single source of truth, relations not duplication, one-way syncs

---

## 📊 Sync Schedule Summary

| Time | Database | Action |
|------|----------|--------|
| Every 30 min | GitHub Issues | Sync from GitHub Projects |
| Real-time | Sprint Tracking | Auto-calculate from rollups |
| On deploy | Deployments | Log from Vercel |
| Daily 9am | Subscription Tracking | Sync from ACT Placemat |
| Weekly Fri 5pm | Weekly Reports | Generate summary |
| As needed | Daily Work Log | Manual logging + git commit integration |

---

**Status**: Ready to create new databases
**No duplication**: All new databases link to existing ones via relations
**Effort**: 6-8 hours total setup
