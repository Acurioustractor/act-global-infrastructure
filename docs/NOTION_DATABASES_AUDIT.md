# Notion Databases Audit - ACT Ecosystem

**Date**: 2025-12-29
**Purpose**: Identify all Notion databases currently in use, prevent duplication, and plan new databases for unified intelligence system

---

## 📊 Current Notion Databases

### ACT Global Infrastructure (Project Management)
**Location**: `/act-global-infrastructure/config/notion-database-ids.json`

| Database | ID | Purpose | Created By | Status |
|----------|----|---------| -----------|--------|
| **GitHub Issues** | `2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1` | All GitHub issues synced from GitHub Projects | Existing (user's) | ✅ Active |
| **Sprint Tracking** | `2d6ebcf9-81cf-815f-a30f-c7ade0c0046d` | Sprint metrics, velocity, burndown | `create-notion-databases.mjs` | ✅ Active |
| **Strategic Pillars** | `2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1` | High-level strategic goals | `create-notion-databases.mjs` | ✅ Active |
| **ACT Projects** | `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02` | Master list of all ACT ecosystem projects | `create-notion-databases.mjs` | ✅ Active |
| **Deployments** | `2d6ebcf9-81cf-81d1-a72e-c9180830a54e` | Production deployment tracking | `create-notion-databases.mjs` | ✅ Active |
| **Velocity Metrics** | `2d6ebcf9-81cf-8123-939f-fab96227b3da` | Sprint velocity history | `create-notion-databases.mjs` | ✅ Active |
| **Weekly Reports** | `2d6ebcf9-81cf-81fe-9ead-e932693cd5dc` | Automated weekly summaries | `create-notion-databases.mjs` | ✅ Active |

### ACT Studio (ACT Farm and Regenerative Innovation Studio)
**Location**: `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/.env.local`

| Database | ID | Purpose | Status |
|----------|----|---------| -------|
| **Projects** | `177ebcf9-81cf-80dd-9514-f1ec32f3314c` | ACT projects (likely duplicate of above?) | ⚠️ Check |
| **Actions** | `177ebcf9-81cf-8023-af6e-dff974284218` | Actions/tasks | ⚠️ Check |
| **People** | `47bdc1c4-df99-4ddc-81c4-a0214c919d69` | People database | ✅ Active |
| **Organizations** | `948f3946-7d1c-42f2-bd7e-1317a755e67b` | Organizations | ✅ Active |

---

## 🔗 Database Relationships (Current)

### GitHub Issues → Sprint Tracking
**Type**: Relation (needs to be set up manually or via script)
**Status**: ⚠️ Not yet configured
**Purpose**: Link issues to sprints for velocity calculation

**Setup needed**:
1. Add "Sprint" relation property to GitHub Issues database
2. Add "Issues" rollup to Sprint Tracking database
3. Auto-calculate metrics from rollup

### Sprint Tracking → Deployments
**Type**: Informational link
**Status**: ⚠️ Not configured
**Purpose**: Show deployments that happened during sprint

### ACT Projects → GitHub Issues
**Type**: Filter/tag
**Status**: ✅ Working (via "ACT Project" field in GitHub Issues)
**Purpose**: Filter issues by project

---

## 🚫 Duplication Concerns

### Potential Duplicates

1. **Projects databases**
   - Global Infrastructure: `ACT Projects` (2d6ebcf9-81cf-8141-95a0-f8688dbb7c02)
   - ACT Studio: `Projects` (177ebcf9-81cf-80dd-9514-f1ec32f3314c)
   - **Action**: Verify if these are the same or different purposes
   - **Recommendation**: Use one as master, link from others

2. **Actions/Tasks**
   - ACT Studio has "Actions" database
   - GitHub Issues already serves as tasks
   - **Recommendation**: Clarify distinction - are Actions = non-GitHub tasks?

---

## 📋 Planned New Databases (Unified Intelligence System)

### Multi-Timeframe Planning

#### 1. Yearly Goals
```
Purpose: 1-year strategic goals
Properties:
- Goal (title): "Empathy Ledger v2 Launch"
- Year: 2025
- ACT Project: [Relation to ACT Projects]
- Status: Not Started | In Progress | Completed
- Key Results: [Text - 3-5 measurable outcomes]
- Phases: [Relation to 6-Month Phases]
- Progress %: [Rollup from Phases]

Sync: One-way (manual updates)
Size: 5-10 entries per year
```

#### 2. 6-Month Phases
```
Purpose: Break yearly goals into phases
Properties:
- Phase (title): "Q1 2025: Foundation Build"
- Start Date, End Date
- Yearly Goal: [Relation to Yearly Goals]
- Moon Cycles: [Relation to Moon Cycles]
- Deliverables: [Text]
- Status: Planning | Active | Complete
- Progress %: [Rollup from Moon Cycles]

Sync: One-way (manual updates)
Size: 10-20 entries per year
```

#### 3. Moon Cycles
```
Purpose: ~29-day lunar planning cycles
Properties:
- Cycle (title): "New Moon → Full Moon (Jan 2025)"
- Moon Phase: New Moon | Waxing | Full | Waning
- Start Date, End Date
- 6-Month Phase: [Relation]
- Sprints: [Relation to Sprint Tracking] ← USES EXISTING
- Focus: [Text]
- Ceremonies: [Multi-select - Planning | Review | Retro]
- Progress %: [Rollup from Sprints]

Sync: Auto-generate for 12 months, manual updates
Size: ~12-13 entries per year
Links to: Existing Sprint Tracking database
```

#### 4. Daily Work Log
```
Purpose: Daily developer activity log
Properties:
- Date (title): Auto-generated
- Sprint: [Relation to Sprint Tracking] ← USES EXISTING
- Completed Today: [Relation to GitHub Issues] ← USES EXISTING
- Time Spent: [Number - hours]
- Learnings: [Text]
- Blockers: [Text]
- Tomorrow's Plan: [Text]

Sync: Auto-populated from GitHub commits + manual entries
Size: 1 entry per dev per day (~365 per year per dev)
Links to: Existing Sprint Tracking + GitHub Issues
```

### Subscription Intelligence

#### 5. Subscription Tracking
```
Purpose: Track all ACT subscriptions (from ACT Placemat)
Properties:
- Vendor (title)
- Annual Cost (number)
- Billing Cycle (select: monthly | annual)
- Account Email (select: nicholas@ | hi@ | accounts@)
- Status (select: active | cancelled | trial)
- Next Renewal (date)
- Migration Status (select: pending | in_progress | completed)
- Potential Savings (number)
- Last Synced (date)

Sync: Auto-sync daily from ACT Placemat API
Size: 50-100 entries
Data Source: ACT Placemat Supabase database (no duplication)
```

---

## 🎯 Database Strategy (No Duplication)

### Principle: Single Source of Truth

1. **GitHub Issues** (existing) = Master list of all development tasks
   - Synced FROM GitHub Projects (one-way)
   - Never edit in Notion (GitHub is source)
   - Other databases link TO this via relations

2. **Sprint Tracking** (existing) = Master sprint metrics
   - Links to GitHub Issues via relation
   - Auto-calculates from rollups
   - Other timeframe databases (Moon Cycles, Phases) link TO this

3. **Subscription Tracking** (new) = View into ACT Placemat data
   - Synced FROM ACT Placemat Supabase (one-way)
   - Never edit in Notion (ACT Placemat is source)
   - Display-only with sync timestamp

4. **ACT Projects** (existing) = Master project list
   - Used by: GitHub Issues, Yearly Goals, others
   - Manually maintained

### Linking Strategy

```
Yearly Goals
  ↓ (relation)
6-Month Phases
  ↓ (relation)
Moon Cycles
  ↓ (relation)
Sprint Tracking (EXISTING) ← Links to GitHub Issues (EXISTING)
  ↓ (relation)
Daily Work Log (NEW) ← Links to GitHub Issues (EXISTING)
```

**Key**: New databases link to existing ones, not duplicate data

---

## 📝 Database Creation Plan

### Phase 1: Multi-Timeframe Planning (3-4 hours)

**Script**: `scripts/create-planning-databases.mjs`

**Creates**:
1. Yearly Goals (new)
2. 6-Month Phases (new)
3. Moon Cycles (new)
4. Daily Work Log (new)

**Links**:
- Moon Cycles → Sprint Tracking (existing)
- Daily Work Log → Sprint Tracking (existing)
- Daily Work Log → GitHub Issues (existing)

**Environment variables needed**:
```bash
NOTION_TOKEN=ntn_OLD_TOKEN_HERE
NOTION_PARENT_PAGE_ID=2d6ebcf981cf806e8db2dc8ec5d0b414
```

### Phase 2: Subscription Tracking (1-2 hours)

**Script**: `scripts/create-subscription-database.mjs`

**Creates**:
1. Subscription Tracking (new)

**Sync script**: `scripts/sync-subscriptions-to-notion.mjs`
- Runs daily via GitHub Actions
- Fetches from ACT Placemat API
- Updates Notion

### Phase 3: Setup Relations (2-3 hours)

**Script**: `scripts/setup-timeframe-relations.mjs`

**Actions**:
1. Add "Sprint" relation to GitHub Issues → Sprint Tracking
2. Add "Moon Cycle" relation to Sprint Tracking → Moon Cycles
3. Add "Phase" relation to Moon Cycles → 6-Month Phases
4. Add "Yearly Goal" relation to Phases → Yearly Goals
5. Add rollup properties for auto-calculation

---

## 🔄 Sync Schedule

| Database | Sync Type | Frequency | Source | Script |
|----------|-----------|-----------|--------|--------|
| GitHub Issues | One-way | Every 30 min | GitHub Projects | Existing GitHub Actions |
| Sprint Tracking | Auto-calculated | Real-time | Rollups from GitHub Issues | Built-in Notion rollups |
| Deployments | One-way | On deploy | Vercel/GitHub | `log-deployment.mjs` |
| Weekly Reports | One-way | Weekly (Fri 5pm) | Sprint metrics | `generate-weekly-report.mjs` |
| Subscription Tracking | One-way | Daily (9am) | ACT Placemat API | `sync-subscriptions-to-notion.mjs` (new) |
| Daily Work Log | Manual + Auto | Daily | Git commits + manual | `log-daily-work.mjs` (new) |

---

## ⚠️ Items to Investigate

1. **ACT Studio "Projects" vs Global "ACT Projects"**
   - Are these duplicates?
   - Which is the master?
   - Should one link to the other?

2. **ACT Studio "Actions" database**
   - What's stored here that's not in GitHub Issues?
   - Should this continue to exist separately?
   - Can it be merged or linked?

3. **Deployments database usage**
   - Currently created but not actively synced?
   - Need to activate `log-deployment.yml` workflow across all projects

4. **Velocity Metrics database**
   - Is this being used or can we calculate on-demand?
   - May be redundant if Sprint Tracking has historical data

---

## 📊 Final Database Count

### Current (Active): 7 databases
1. GitHub Issues (existing - user's)
2. Sprint Tracking
3. Strategic Pillars
4. ACT Projects
5. Deployments
6. Velocity Metrics
7. Weekly Reports

### Current (ACT Studio - need to verify): 4 databases
8. Projects (potential duplicate?)
9. Actions
10. People
11. Organizations

### New (Planned): 5 databases
12. Yearly Goals
13. 6-Month Phases
14. Moon Cycles
15. Daily Work Log
16. Subscription Tracking

**Total**: 16 databases (11 current + 5 new)
**After deduplication**: ~14 databases (if Projects merge)

---

## ✅ Recommendations

### Immediate Actions

1. **Verify ACT Studio databases**
   ```bash
   # Check if Projects database is a duplicate
   curl -H "Authorization: Bearer $NOTION_TOKEN" \
     https://api.notion.com/v1/databases/177ebcf9-81cf-80dd-9514-f1ec32f3314c
   ```

2. **Consolidate if duplicate**
   - If ACT Studio "Projects" = Global "ACT Projects", delete one
   - Update references to use single database

3. **Activate Deployments sync**
   - Deploy `log-deployment.yml` to all 7 project repos
   - Test with one deployment

4. **Create planning databases**
   - Run `create-planning-databases.mjs`
   - Set up relations manually in Notion UI
   - Test rollup calculations

5. **Create subscription database**
   - Run `create-subscription-database.mjs`
   - Set up daily sync to ACT Placemat
   - Test data flow

### Long-term Strategy

- **One master database per entity type** (Projects, Issues, Subscriptions)
- **Other databases link via relations** (no data duplication)
- **Sync is one-way** from source of truth
- **Auto-calculate with rollups** where possible
- **Manual updates only** for planning databases (Goals, Phases)

---

## 🔧 Scripts to Create

1. `scripts/create-planning-databases.mjs` - Creates 4 timeframe databases
2. `scripts/setup-timeframe-relations.mjs` - Links databases together
3. `scripts/create-subscription-database.mjs` - Creates subscription tracking
4. `scripts/sync-subscriptions-to-notion.mjs` - Daily sync from ACT Placemat
5. `scripts/log-daily-work.mjs` - Logs daily developer activity
6. `scripts/generate-moon-cycles.mjs` - Auto-generates moon cycle entries
7. `scripts/audit-notion-databases.mjs` - Lists all databases with details

---

**Status**: Audit complete, ready to create new databases
**Next Step**: Create planning databases and set up relations
**Timeline**: 6-8 hours total implementation
