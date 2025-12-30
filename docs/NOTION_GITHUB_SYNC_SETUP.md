# Setting Up Notion's Native GitHub Synced Database

**Date**: December 30, 2025
**Status**: Best Practice Solution ✅

---

## Why Use Notion's Native Sync?

After researching, we discovered Notion has a **built-in GitHub integration** that:
- ✅ Automatically syncs GitHub issues/PRs to Notion
- ✅ No custom scripts to maintain
- ✅ Free, native feature
- ✅ Auto-updates from GitHub
- ✅ Supports filters, views, rollups, relations
- ✅ Single source of truth (GitHub)

**Trade-off**: Read-only in Notion (edits must happen in GitHub) - **This is actually a BEST PRACTICE** because it maintains GitHub as the single source of truth!

---

## Current Setup

### ✅ What's Working
- **Sprint Tracking Database**: Aggregated metrics (Total, Completed, Effort, etc.)
- **Daily Automation**: `sync-sprint-to-notion.mjs` updates sprint metrics
- **GitHub Project**: 149 issues, source of truth

### ❌ What Was Broken
- **GitHub Issues Database**: 1000+ accumulated old issues from test syncs
- **Solution**: Archiving all pages (currently in progress)

---

## Setup Instructions

### Step 1: Clean Up Old Database (In Progress)

```bash
# Currently running - archiving 1000+ old issues
npm run archive:github-issues
```

**Status**: Archiving ~700+ pages complete, continuing in background

### Step 2: Create Notion Synced Database

Once the archive completes:

1. **Go to GitHub Project**
   - URL: https://github.com/users/Acurioustractor/projects/1
   - Click on any issue

2. **Copy the Issue URL**
   - Example: `https://github.com/Acurioustractor/empathy-ledger-v2/issues/123`

3. **In Notion**
   - Navigate to your workspace
   - Type `/` to open command menu
   - Paste the GitHub issue URL
   - Select **"Paste as database"** (NOT "Paste as link")

4. **Notion will create a synced database**
   - Automatically imports all issues from that repository
   - Updates in real-time
   - Supports all Notion database features

### Step 3: Configure Synced Database

**Option A: Sync Entire Repository**
- Syncs all issues from a specific repo
- Good if you want to see all historical issues

**Option B: Sync Specific View/Filter**
- Copy a filtered GitHub issue list URL
- Only syncs issues matching that filter
- Good for focused views (e.g., only open issues, only Sprint 1)

**Recommended for ACT**:
Since you have 7 repositories and want to see issues across all of them, you have two choices:

1. **Create 7 separate synced databases** (one per repo)
   - Pro: Organized by repository
   - Con: Can't see all issues in one view

2. **Use GitHub Project Board URL** (if Notion supports it - needs testing)
   - Copy your GitHub Project URL
   - Try pasting as database
   - This would sync only issues in the project

3. **Keep current Sprint Tracking approach** (recommended)
   - Use Sprint Tracking for aggregated metrics
   - Create ONE synced database for your main repo (empathy-ledger-v2)
   - Team browses issues in GitHub Project directly

---

## Recommended Architecture

### Two-Database Setup (Best Practice)

**1. Sprint Tracking Database** (What we have now)
- **Purpose**: High-level metrics and reporting
- **Updates**: Daily via `sync-sprint-to-notion.mjs`
- **Content**: Sprint summaries, completion %, velocity
- **Editable**: Yes (manually maintained)
- **Audience**: Leadership, stakeholders, weekly reviews

**2. Synced Issues Database** (New - Notion native)
- **Purpose**: Browse individual issues in Notion
- **Updates**: Automatic real-time from GitHub
- **Content**: All issues from main repos
- **Editable**: No (read-only, edits in GitHub)
- **Audience**: Team members who prefer Notion interface

**3. GitHub Project** (Source of Truth)
- **Purpose**: Day-to-day issue management
- **Updates**: Manual by team
- **Content**: All active project issues
- **Editable**: Yes
- **Audience**: Developers, daily work

---

## Alternative: GitHub Pull Requests Property

If you primarily care about tracking PRs (not issues), Notion has a special **GitHub Pull Requests** database property:

1. Add "GitHub Pull Requests" property to any Notion database
2. Link to PRs from GitHub
3. Auto-updates PR status in Notion
4. Syncs GitHub comments in real-time

**Use Case**: Track PRs alongside tasks/projects in existing databases

---

## Next Steps

### Immediate (After Archive Completes)
1. ✅ Archive completes (currently at 700+/1000+)
2. Verify database is empty: https://www.notion.so/2d5ebcf981cf80429f40ef7b39b39ca1
3. Test creating synced database with one issue URL

### Decision Points
- **Which repos to sync?** (Recommend: empathy-ledger-v2 only)
- **All issues or filtered?** (Recommend: all issues for historical context)
- **Keep old database or create new?** (Recommend: create new clean one)

### Implementation
1. Create synced database from GitHub issue
2. Configure views (by Sprint, by Status, by Priority)
3. Add to ACT workspace navigation
4. Document for team

---

## Cleanup: Remove Old Custom Sync Script

Since we're using Notion's native sync, we can **delete** the custom script I created:

```bash
# Remove unused custom sync script
rm scripts/sync-issues-to-notion.mjs
```

**Keep these:**
- ✅ `scripts/sync-sprint-to-notion.mjs` - For Sprint Tracking metrics
- ✅ `scripts/archive-github-issues-notion.mjs` - For cleanup (one-time use)

---

## Benefits Summary

**Before** (Custom Sync):
- ❌ Maintain custom API integration code
- ❌ Handle errors, rate limits, edge cases
- ❌ Keep Notion database schema in sync
- ❌ Debug when things break

**After** (Notion Native):
- ✅ Zero maintenance
- ✅ Automatic updates
- ✅ Officially supported by Notion
- ✅ No custom code to break
- ✅ Best practice: GitHub = source of truth

---

## Resources

- [Notion GitHub Integration](https://www.notion.com/integrations/github)
- [Notion Help: Integrate GitHub](https://www.notion.com/help/github)
- [Guide: Bring Codebase into Context](https://www.notion.com/help/guides/bring-your-codebase-into-context-with-notions-github-integration)

---

## Status

- ✅ Research complete
- ✅ Old database archiving in progress (700+ archived)
- ⏳ Ready to set up synced database
- 📋 Waiting for archive completion + user decision on which repos to sync
