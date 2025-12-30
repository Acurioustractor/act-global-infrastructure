# Complete Workflow Test: 10 Issues Start to Finish

**Date**: December 30, 2025
**Purpose**: Test entire integration flow from GitHub → Notion → Supabase

---

## Current State (Before We Start)

### 10 Test Issues in GitHub Project:

1. #6 [justicehub-platform]: Re-enable auth check
2. #32 [act-regenerative-studio]: Integrate with Vercel API
3. #31 [act-regenerative-studio]: Calculate stats from webhook data
4. #30 [act-regenerative-studio]: Query Supabase for GHL webhooks
5. #29 [act-regenerative-studio]: Fetch deployment data
6. #28 [act-regenerative-studio]: Check site health
7. #27 [act-regenerative-studio]: Fetch deployment status
8. #26 [act-regenerative-studio]: Get user ID from auth
9. #25 [act-regenerative-studio]: Store eventKey in Redis
10. #24 [act-regenerative-studio]: Send welcome email

**Current Status**: All are "Todo", No sprint assigned

---

## Workflow Phases

### Phase 1: Sprint Planning (Assign to Sprint)
### Phase 2: Add Details (Priority, Effort, ACT Project)
### Phase 3: Start Work (Move to In Progress)
### Phase 4: Complete Work (Move to Done)
### Phase 5: Verify Syncs (Check Notion & Supabase)

---

## Phase 1: Sprint Planning

### Step 1.1: Assign Issues to Sprint 2

Let's create Sprint 2 and assign 5 issues to it:

```bash
npm run sprint:assign "Sprint 2" "32,31,30,29,28"
```

**What this does**:
- Creates "Sprint 2" field value if it doesn't exist
- Assigns issues #32, #31, #30, #29, #28 to Sprint 2
- Updates GitHub Project board

**Expected Result**:
- 5 issues now show "Sprint 2" in GitHub Project
- Other 5 remain in Backlog

### Step 1.2: Keep Sprint 1 Issues

Issues #6, #27, #26, #25, #24 stay in Sprint 1 or Backlog for now.

---

## Phase 2: Add Details to Issues

### Step 2.1: Add Priority via GitHub Project

**In GitHub Project Board** (https://github.com/users/Acurioustractor/projects/1):

1. Click on issue #32
2. Set Priority: "High"
3. Set Effort: "1d"
4. Set ACT Project: "ACT Main"

Repeat for other issues:
- #31: Priority "Medium", Effort "3h", ACT Project "ACT Main"
- #30: Priority "Medium", Effort "1d", ACT Project "ACT Main"
- #29: Priority "High", Effort "1d", ACT Project "ACT Main"
- #28: Priority "Low", Effort "3h", ACT Project "ACT Main"

**Expected Result**:
- Each issue has Priority, Effort, and ACT Project set
- These will sync to Notion

---

## Phase 3: Start Working on Issues

### Step 3.1: Move Issue #32 to "In Progress"

**In GitHub Project**:
1. Find issue #32
2. Change Status: "Todo" → "In Progress"

**What this simulates**:
- Developer starts working on the task
- Status changes trigger updates

### Step 3.2: Sync to Notion

Run manual sync to see changes immediately:

```bash
npm run sync:issues
```

**Expected Output**:
```
✅ Fetched 149 issues
   Updated 1 issues...
✅ SYNC COMPLETE
   • Updated: 1
```

### Step 3.3: Verify in Notion

**Check Notion GitHub Issues DB**:
- Open: https://www.notion.so/2d5ebcf981cf80429f40ef7b39b39ca1
- Filter by Sprint: "Sprint 2"
- Find issue #32
- Verify:
  - ✅ Status = "In Progress"
  - ✅ Priority = "High"
  - ✅ Effort = "1d"
  - ✅ Sprint = "Sprint 2"

---

## Phase 4: Complete Work

### Step 4.1: Complete Issue #32

**In GitHub**:
1. Make a fake commit/change
2. In GitHub Project, move #32 to "Done"
3. Optionally close the issue

### Step 4.2: Move Issues #31 and #30 to In Progress

Simulate multiple team members working:
- Issue #31: Todo → In Progress
- Issue #30: Todo → In Progress

### Step 4.3: Complete Issue #31

- Issue #31: In Progress → Done

**Current State**:
- #32: Done ✅
- #31: Done ✅
- #30: In Progress 🔄
- #29, #28: Todo 📝

---

## Phase 5: Sync and Verify

### Step 5.1: Run Full Sync

```bash
# Sync individual issues
npm run sync:issues

# Sync sprint metrics
npm run sync:sprint
```

### Step 5.2: Check Sprint 2 Metrics in Notion

**Sprint Tracking DB**: https://www.notion.so/2d6ebcf981cf815fa30fc7ade0c0046d

**Expected Sprint 2 Metrics**:
- Total Issues: 5
- Completed: 2 (#32, #31)
- In Progress: 1 (#30)
- Todo: 2 (#29, #28)
- Completion %: 40%
- Total Effort: ~4 days (32 hours)
- Completed Effort: ~1.5 days

### Step 5.3: Check Supabase Snapshot

**Query Supabase**:
```sql
SELECT * FROM sprint_snapshots
WHERE sprint_name = 'Sprint 2'
ORDER BY snapshot_date DESC
LIMIT 1;
```

**Expected Data**:
- sprint_name: "Sprint 2"
- total_issues: 5
- done_issues: 2
- in_progress_issues: 1
- todo_issues: 2
- completion_percentage: 40

---

## Phase 6: Test GitHub Actions Automation

### Step 6.1: Trigger Manual Workflow

```bash
gh workflow run sync-sprint-metrics.yml
```

### Step 6.2: Monitor Workflow

```bash
gh run list --workflow=sync-sprint-metrics.yml --limit 1
```

**Expected Output**:
```
✅ All syncs completed successfully
   • GitHub Issues → Notion
   • Sprint Metrics → Notion
```

### Step 6.3: Wait for Scheduled Run

The workflow runs automatically at **5 PM UTC daily**.

Next run will sync any changes made during the day.

---

## Complete Test Checklist

### ✅ Sprint Assignment
- [ ] Created Sprint 2
- [ ] Assigned 5 issues to Sprint 2
- [ ] Verified in GitHub Project

### ✅ Issue Details
- [ ] Added Priority to 5 issues
- [ ] Added Effort to 5 issues
- [ ] Added ACT Project to 5 issues

### ✅ Status Changes
- [ ] Moved #32 to In Progress
- [ ] Moved #32 to Done
- [ ] Moved #31 to In Progress
- [ ] Moved #31 to Done
- [ ] Moved #30 to In Progress

### ✅ Notion Sync - Issues
- [ ] Ran `npm run sync:issues`
- [ ] Verified issue #32 in Notion shows "Done"
- [ ] Verified issue #31 in Notion shows "Done"
- [ ] Verified issue #30 in Notion shows "In Progress"
- [ ] Verified Priority/Effort/Sprint fields match

### ✅ Notion Sync - Metrics
- [ ] Ran `npm run sync:sprint`
- [ ] Verified Sprint 2 page created in Notion
- [ ] Verified Sprint 2 metrics: 2/5 completed (40%)
- [ ] Verified effort totals calculated correctly

### ✅ Supabase Sync
- [ ] Checked sprint_snapshots table
- [ ] Verified Sprint 2 snapshot exists
- [ ] Verified snapshot data matches Notion

### ✅ GitHub Actions
- [ ] Manually triggered workflow
- [ ] Verified workflow completed successfully
- [ ] Checked logs for both syncs

---

## Expected Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│  DEVELOPER ACTIONS (GitHub Project)                      │
│  1. Assign to Sprint 2                                  │
│  2. Set Priority/Effort/ACT Project                     │
│  3. Move to In Progress                                 │
│  4. Move to Done                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  SYNC (Daily 5 PM UTC or Manual)                        │
│  npm run sync:issues → Notion GitHub Issues DB          │
│  npm run sync:sprint → Notion Sprint Tracking + Supabase│
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
┌─────────────┐    ┌──────────────┐
│  Notion     │    │  Supabase    │
│  Issues: 5  │    │  Snapshot:   │
│  Done: 2    │    │  Sprint 2    │
│  Progress:1 │    │  40% done    │
└─────────────┘    └──────────────┘
```

---

## Troubleshooting

### Issue Not Syncing to Notion
```bash
# Check if issue is in GitHub Project
gh project item-list 1 --owner Acurioustractor --format json | jq '.items[] | select(.content.number == 32)'

# Run sync manually
npm run sync:issues

# Check for errors in output
```

### Sprint Metrics Wrong
```bash
# Check Sprint 2 exists in Notion Sprint Tracking DB
# Re-run sync
npm run sync:sprint

# Verify GitHub Project has Sprint field set correctly
```

### GitHub Actions Not Running
```bash
# Check workflow status
gh workflow view sync-sprint-metrics.yml

# Check recent runs
gh run list --workflow=sync-sprint-metrics.yml --limit 5

# Trigger manually
gh workflow run sync-sprint-metrics.yml
```

---

## Success Criteria

At the end of this test, you should have:

1. ✅ Sprint 2 created with 5 issues
2. ✅ 2 issues completed (#32, #31)
3. ✅ 1 issue in progress (#30)
4. ✅ All changes reflected in Notion GitHub Issues DB
5. ✅ Sprint 2 page in Notion showing 40% completion
6. ✅ Supabase snapshot with Sprint 2 data
7. ✅ GitHub Actions workflow running successfully

**This proves the entire integration is working end-to-end!**
