# Notion Database Verification - Action Required

**Date**: 2025-12-29
**Status**: Need to verify databases for duplicates before creating new ones

---

## ⚠️ Issue

The Notion token in `.env.local` appears to be outdated/invalid for direct API calls, though the GitHub Actions workflow token works fine.

**Token that works**: The one in GitHub Secrets (used by workflow)
**Token that doesn't work**: `ntn_OLD_TOKEN_HERE` (in .env.local)

---

## 🎯 What We Need to Verify

### Potential Duplicates

1. **"ACT Projects" vs "Projects"**
   - Global Infrastructure: `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`
   - ACT Studio: `177ebcf9-81cf-80dd-9514-f1ec32f3314c`
   - **Question**: Are these the same database or different purposes?

2. **"Actions" database**
   - ACT Studio: `177ebcf9-81cf-8023-af6e-dff974284218`
   - **Question**: What's stored here that's not in GitHub Issues?
   - **Question**: Can this be merged with GitHub Issues?

### Databases to Keep (Likely Unique)

3. **People** - `47bdc1c4-df99-4ddc-81c4-a0214c919d69`
   - Likely unique to ACT Studio
   - Probably used for contact management

4. **Organizations** - `948f3946-7d1c-42f2-bd7e-1317a755e67b`
   - Likely unique to ACT Studio
   - Probably used for organization tracking

---

## 🔍 Manual Verification Steps

### Option 1: Check in Notion UI (5 minutes)

1. Open Notion
2. Navigate to "ACT Projects" database
   - Check URL contains: `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02`
   - Note the properties and content

3. Navigate to "Projects" database (ACT Studio)
   - Check URL contains: `177ebcf9-81cf-80dd-9514-f1ec32f3314c`
   - Note the properties and content

4. **Compare**:
   - Same properties? → Likely duplicate
   - Different properties? → Different purposes
   - Same entries? → Definite duplicate
   - Different entries? → Keep both

### Option 2: Use Working Notion Token (10 minutes)

1. Get the working Notion token:
   ```bash
   # This is the token that works in GitHub Actions
   # Check GitHub secrets or update .env.local
   ```

2. Update `.env.local` with working token

3. Run verification script:
   ```bash
   cd /Users/benknight/act-global-infrastructure
   node scripts/verify-notion-databases.mjs
   ```

4. Review output for duplicate analysis

---

## 📋 Current Database Inventory

### ACT Global Infrastructure (7 databases)

| Database | ID | Purpose | Status |
|----------|----|---------| -------|
| GitHub Issues | `2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1` | All GitHub issues | ✅ Active (synced every 30 min) |
| Sprint Tracking | `2d6ebcf9-81cf-815f-a30f-c7ade0c0046d` | Sprint metrics | ✅ Active |
| Strategic Pillars | `2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1` | Strategic goals | ✅ Active |
| ACT Projects | `2d6ebcf9-81cf-8141-95a0-f8688dbb7c02` | Master project list | ✅ Active |
| Deployments | `2d6ebcf9-81cf-81d1-a72e-c9180830a54e` | Deployment tracking | ⚠️ Created but not syncing yet |
| Velocity Metrics | `2d6ebcf9-81cf-8123-939f-fab96227b3da` | Velocity history | ⚠️ Possibly redundant |
| Weekly Reports | `2d6ebcf9-81cf-81fe-9ead-e932693cd5dc` | Weekly summaries | ✅ Active |

### ACT Studio (4 databases)

| Database | ID | Purpose | Status |
|----------|----|---------| -------|
| Projects | `177ebcf9-81cf-80dd-9514-f1ec32f3314c` | Projects | ⚠️ Verify vs ACT Projects |
| Actions | `177ebcf9-81cf-8023-af6e-dff974284218` | Tasks/actions | ⚠️ Verify vs GitHub Issues |
| People | `47bdc1c4-df99-4ddc-81c4-a0214c919d69` | People/contacts | ✅ Likely unique |
| Organizations | `948f3946-7d1c-42f2-bd7e-1317a755e67b` | Organizations | ✅ Likely unique |

---

## 🆕 New Databases to Create (After Verification)

Once duplicates are identified and removed, create these 5 new databases:

### Multi-Timeframe Planning (4 databases)

1. **Yearly Goals**
   - Links to: ACT Projects (existing)
   - Purpose: 1-year strategic goals
   - ~5-10 entries per year

2. **6-Month Phases**
   - Links to: Yearly Goals
   - Purpose: Break goals into phases
   - ~10-20 entries per year

3. **Moon Cycles**
   - Links to: Sprint Tracking (existing), 6-Month Phases
   - Purpose: ~29-day lunar planning cycles
   - ~12-13 entries per year

4. **Daily Work Log**
   - Links to: Sprint Tracking (existing), GitHub Issues (existing)
   - Purpose: Daily developer activity
   - ~365 entries per dev per year

### Subscription Intelligence (1 database)

5. **Subscription Tracking**
   - Synced from: ACT Placemat Supabase (one-way)
   - Purpose: Display subscription data
   - ~50-100 entries

---

## 🚫 No Duplication Strategy

### Rules

1. **Single Source of Truth**
   - Each entity type has ONE master database
   - Other databases link via relations

2. **One-Way Sync**
   - GitHub Issues ← GitHub Projects (can't edit in Notion)
   - Subscription Tracking ← ACT Placemat (can't edit in Notion)
   - Sprint Tracking = Auto-calculated from rollups

3. **Relations, Not Copying**
   - Bad: Copy issue titles to Sprint Tracking
   - Good: Add relation to GitHub Issues, show via rollup

---

## 📝 Decision Matrix

### If "ACT Projects" = "Projects" (Same)

**Action**: Consolidate to one database
```
Steps:
1. Choose Global Infrastructure "ACT Projects" as master
2. Update ACT Studio .env to use Global ID
3. Verify all references work
4. Archive/delete Studio "Projects"
```

**Impact**: -1 database, cleaner system

### If "ACT Projects" ≠ "Projects" (Different)

**Action**: Keep both, document purpose
```
Steps:
1. Document what "Projects" (Studio) is used for
2. Add comment in .env.local explaining difference
3. Consider linking via relation if related
```

**Impact**: Keep both databases

### If "Actions" overlaps with "GitHub Issues"

**Action**: Merge or clarify distinction
```
If Actions = non-GitHub tasks (e.g., admin work):
  → Keep both, document clearly

If Actions = duplicate of GitHub Issues:
  → Migrate data to GitHub Issues
  → Delete Actions database
```

---

## ✅ Recommended Next Steps

### Immediate (Before Creating New Databases)

1. **Update Notion token** in `.env.local` to working one
   ```bash
   # Replace with token from GitHub secrets
   NOTION_TOKEN=<working_token>
   ```

2. **Run verification script**
   ```bash
   node scripts/verify-notion-databases.mjs
   ```

3. **Review output** and make decisions on:
   - ACT Projects vs Projects: Same or different?
   - Actions: Keep, merge, or delete?

4. **Consolidate if needed**
   - Update environment variables
   - Migrate data if necessary
   - Archive duplicates

### After Verification (Create New Databases)

5. **Create planning databases**
   ```bash
   node scripts/create-planning-databases.mjs
   ```

6. **Generate moon cycles**
   ```bash
   node scripts/generate-moon-cycles.mjs --year 2025
   ```

7. **Setup relations**
   ```bash
   node scripts/setup-timeframe-relations.mjs
   ```

8. **Create subscription database**
   ```bash
   node scripts/create-subscription-database.mjs
   ```

---

## 📊 Expected Final Count

**Before verification**: 11 databases (7 global + 4 studio)

**Best case** (no duplicates):
- 11 existing + 5 new = **16 total databases**

**Most likely** (1-2 duplicates):
- 9-10 existing + 5 new = **14-15 total databases**

**Worst case** (significant overlap):
- 7-8 existing + 5 new = **12-13 total databases**

---

## 📞 Support

**Script created**: `scripts/verify-notion-databases.mjs`
**Documentation**: This file + `NOTION_DATABASES_AUDIT.md` + `NOTION_DATABASES_SUMMARY.md`

**Waiting for**: Valid Notion token or manual verification in Notion UI

---

**Status**: Verification pending, ready to create new databases once duplicates identified
**Time required**: 5-15 minutes for verification, 3-4 hours for new database creation
