# Performance Optimization Plan

**Problem**: Syncing 149 issues takes too long (several minutes)
**Impact**: Setup/sync time > actual work time

---

## Current Performance Issues

### Issue 1: Sequential API Calls (BIGGEST BOTTLENECK)
**Current**: Each issue = 2 API calls sequentially
- Call 1: Query Notion to find existing page
- Call 2: Create or update page
- **Total**: 149 × 2 = 298 API calls sequentially

**Time**: ~200ms per call = 298 × 0.2s = **~60 seconds minimum**

### Issue 2: Notion Rate Limits
- Notion API: 3 requests/second
- We're making 298 requests
- **Time**: 298 ÷ 3 = **~100 seconds (~1.7 minutes)**

### Issue 3: No Batch Operations
- Creating/updating pages one at a time
- No parallel processing
- No batching

---

## Optimization Strategy

### Strategy 1: Incremental Sync (BEST - Implement First) ⭐

**Concept**: Only sync issues that changed since last sync

**How**:
1. Store "Last Synced" timestamp in Notion
2. Query GitHub for issues updated since last sync
3. Only sync changed issues

**Impact**:
- First sync: 149 issues (~2 minutes)
- Daily syncs: ~5-10 issues (~10 seconds)
- **90% reduction in daily sync time**

**Implementation**:
```javascript
// Add to sync script
const lastSyncTime = await getLastSyncTime(); // From Notion or file
const changedIssues = items.filter(item =>
  new Date(item.content.updatedAt) > lastSyncTime
);
// Only sync changedIssues
await saveLastSyncTime(new Date());
```

### Strategy 2: Batch Notion Queries (MEDIUM Impact)

**Concept**: Query all existing pages at once, then match in memory

**Current**:
```javascript
for (issue) {
  const existing = await findNotionPage(url); // 149 calls
  await updateOrCreate(issue, existing);
}
```

**Optimized**:
```javascript
// 1 call to get all pages
const allPages = await queryAllNotionPages();
const pageMap = new Map(allPages.map(p => [p.url, p]));

for (issue) {
  const existing = pageMap.get(url); // Memory lookup
  await updateOrCreate(issue, existing);
}
```

**Impact**: 149 queries → 1 query = **Save ~30 seconds**

### Strategy 3: Parallel Processing (CAREFUL - Rate Limits)

**Concept**: Process multiple issues concurrently

**Current**: Sequential
**Optimized**: Process 3 at a time (Notion rate limit)

```javascript
// Process in batches of 3
const batches = chunk(issues, 3);
for (const batch of batches) {
  await Promise.all(batch.map(syncIssue));
}
```

**Impact**: 3× faster = **Save ~40 seconds**
**Risk**: Hit rate limits if not careful

### Strategy 4: Smart Sync Modes

**Three modes based on use case**:

1. **Full Sync** (rare): All 149 issues
   - Use: First time, major cleanup
   - Command: `npm run sync:issues --full`
   - Time: ~2 minutes

2. **Quick Sync** (daily): Only changed issues
   - Use: Automatic daily runs
   - Command: `npm run sync:issues`
   - Time: ~10 seconds

3. **Sprint Sync** (common): Only current sprint issues
   - Use: During active sprint work
   - Command: `npm run sync:issues --sprint "Sprint 2"`
   - Time: ~5 seconds (5-10 issues)

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Implement Today) 🚀

**1. Add Incremental Sync**
- Store last sync timestamp
- Filter to only changed issues
- **Impact**: 90% time reduction on daily runs

**2. Add Sprint-Only Mode**
```bash
npm run sync:issues --sprint "Sprint 2"
# Only syncs 5 issues instead of 149
```
- **Impact**: 95% time reduction during sprint work

### Phase 2: Medium Improvements (Next Session)

**3. Batch Notion Queries**
- Fetch all pages once
- Match in memory
- **Impact**: 30% faster

**4. Parallel Processing**
- Respect rate limits (3/sec)
- Process batches concurrently
- **Impact**: 50% faster

### Phase 3: Advanced (Future)

**5. Webhook-Based Sync**
- GitHub webhook → instant Notion update
- No polling needed
- **Impact**: Real-time, zero delay

**6. Caching Layer**
- Redis cache for Notion pages
- Reduce API calls further
- **Impact**: 80% fewer API calls

---

## Immediate Action: Sprint-Only Sync

Let me create a sprint-only sync mode RIGHT NOW:

```javascript
// Add to sync-github-project-to-notion.mjs
const args = process.argv.slice(2);
const sprintFilter = args.find(arg => arg.startsWith('--sprint='))?.split('=')[1];

// Filter items
let itemsToSync = items;
if (sprintFilter) {
  itemsToSync = items.filter(item =>
    getFieldValue(item, 'Sprint') === sprintFilter
  );
  console.log(`📊 Sprint filter: "${sprintFilter}" (${itemsToSync.length} issues)`);
}
```

**Usage**:
```bash
# Sync only Sprint 2 (5 issues) - FAST!
npm run sync:issues -- --sprint="Sprint 2"

# Full sync (149 issues) - SLOW
npm run sync:issues
```

---

## Expected Performance After Optimizations

| Scenario | Current | Optimized | Savings |
|----------|---------|-----------|---------|
| First sync (all 149) | 2 min | 2 min | 0% |
| Daily auto-sync | 2 min | 10 sec | 92% |
| Sprint work (5 issues) | 2 min | 5 sec | 96% |
| Single issue change | 2 min | 2 sec | 98% |

---

## Alternative: Skip Individual Issue Sync Entirely

**Radical idea**: Do we even need individual issue sync?

**Keep**:
- ✅ Sprint metrics sync (fast - only aggregates)
- ✅ GitHub Project (source of truth)
- ✅ GitHub AI Connector (search issues)

**Remove**:
- ❌ Individual issue sync to Notion

**Trade-off**:
- Lose: Browsing issues in Notion
- Gain: Zero sync time, simpler system

**Decision**: Keep both, but make sprint-only mode default

---

## Implementation Plan (Next 15 Minutes)

1. ✅ Kill current slow sync
2. ✅ Add `--sprint` flag to sync script
3. ✅ Add `--incremental` flag (only changed issues)
4. ✅ Update npm scripts for sprint mode
5. ✅ Test: Sync only Sprint 2 (should be <10 seconds)

Let's do it!
