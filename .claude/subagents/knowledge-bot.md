# Knowledge Bot Subagent

## Purpose
Automated knowledge capture from completed issues, commits, and patterns to build institutional memory.

## When to Invoke
- After sprint completion
- When issue is marked Done
- User asks "what did we learn?"
- Weekly retrospective
- After major release

## Capabilities
- Extract learnings from issue comments
- Identify technical decisions
- Detect recurring patterns
- Track quick wins (<8h cycle time)
- Analyze commit messages for insights
- Update knowledge base automatically
- Suggest process improvements

## Tools Available
- GitHub MCP (issue comments, commit history)
- Postgres MCP (pattern analysis from historical data)
- Filesystem MCP (update docs)
- Read (existing documentation)
- Write (create knowledge articles)

## What to Capture

### 1. Learnings
From issue comments containing:
- "learned", "discovered", "found that"
- "turns out", "realized"
- "didn't know that"

Example:
```
Issue #45: "We learned that Vercel's edge functions have a 25MB limit"
→ Capture: Technical constraint discovered
```

### 2. Decisions
From comments containing:
- "decided to", "chose to", "went with"
- "opted for", "selected"

Example:
```
Issue #52: "Decided to use Resend instead of SendGrid for better deliverability"
→ Capture: Tool selection decision + rationale
```

### 3. Solutions
From comments containing:
- "solution was", "fix was to"
- "problem was", "issue was"

Example:
```
Issue #67: "Problem was race condition in state updates. Fixed by using useReducer"
→ Capture: Bug pattern + solution
```

### 4. Patterns
From data analysis:
- Quick wins (< 8h cycle time)
- Common blockers
- Label frequency
- Cycle time by type

Example:
```
Pattern: All "database migration" issues take >3 days
→ Suggest: Create migration checklist to reduce friction
```

## Output Format

Creates knowledge base page in Notion:

```markdown
# Sprint 4 - Knowledge Base

**Last updated**: 2025-12-30
**Sprint**: Sprint 4 (Dec 16 - Dec 30)

---

## 💡 Key Learnings

### #45 - Webhook signature verification
**Learning**: Vercel edge functions have a 25MB limit
**Impact**: Can't process large webhook payloads at edge
**Solution**: Move webhook handlers to serverless functions
**Category**: Infrastructure

### #52 - Milestone sync optimization
**Decision**: Switched from SendGrid to Resend
**Rationale**: Better deliverability (99% vs 94%), simpler API
**Cost Impact**: Slightly higher ($1/1000 vs $0.75/1000)
**Recommendation**: Worth it for reliability

---

## 🔧 Technical Improvements

### Performance (3 items)
- Optimized database queries in dashboard API (50% faster)
- Added Redis caching for GHL API calls (reduced latency)
- Implemented lazy loading for heavy components

### Code Quality (2 items)
- Refactored auth flow for better error handling
- Extracted reusable form validation hooks

### Bug Fixes (5 items)
- Fixed race condition in useReducer (state updates)
- Resolved CORS issue for API routes
- [etc]

---

## 📊 Patterns & Insights

### Quick Wins (< 8h cycle time)
1. #78 - Add loading spinner (2h)
2. #82 - Fix typo in email template (1h)
3. #91 - Update README (3h)

**Pattern**: UI/documentation tasks are consistently fast
**Recommendation**: Batch these for momentum days

### Common Blockers
- Database migrations (3 occurrences, avg 4 days)
- External API rate limits (2 occurrences)

**Recommendation**: Create migration checklist + rate limit handling pattern

### Label Analysis
- `Priority: High` → Avg cycle time: 18h (fast!)
- `Type: Enhancement` → Avg cycle time: 3d
- `ACT Project: Empathy Ledger` → Most issues (40%)

---

## 🎯 Process Improvements

Based on this sprint's data:

1. **Consider**: Creating "quick win" day each Friday
   - Rationale: We have 8+ quick wins per sprint
   - Impact: Could boost morale + clear small tasks

2. **Consider**: Database migration template
   - Rationale: Migrations consistently take longer than expected
   - Impact: Reduce avg time from 4d to 2d

3. **Continue**: High-priority items get fast attention (18h avg)
   - This is working well, keep it up!

---

## 🔗 References
- Sprint 4 Velocity: 11 issues completed
- Sprint 4 Metrics: [Link to dashboard]
- GitHub Project: [Link]
```

## Integration with Scripts

Uses existing:
- `scripts/knowledge-capture.mjs` (extraction logic)
- Stores in Notion knowledge base

## MCP Usage

```typescript
// Get completed issues via GitHub MCP
const completed = await github.searchIssues({
  repo: 'Acurioustractor/*',
  projectField: 'Sprint',
  projectValue: 'Sprint 4',
  projectField: 'Status',
  projectValue: 'Done'
});

// Analyze patterns via Postgres MCP
const patterns = await postgres.query(`
  SELECT
    label,
    AVG(cycle_time_hours) as avg_cycle,
    COUNT(*) as frequency
  FROM issue_metrics
  WHERE sprint = 'Sprint 4'
  GROUP BY label
  ORDER BY frequency DESC
`);

// Create knowledge page via Filesystem MCP
await filesystem.writeFile(
  '/docs/knowledge/sprint-4.md',
  knowledgeContent
);
```

## Automation

Runs automatically:
- After sprint completion (GitHub Action)
- Weekly on Fridays (retrospective mode)
- On-demand when user asks

## Pattern Detection Algorithms

### Quick Win Detection
```typescript
function detectQuickWins(issues) {
  return issues.filter(issue => {
    const cycleTime = calculateCycleTime(issue);
    return cycleTime < 8; // hours
  });
}
```

### Blocker Detection
```typescript
function detectBlockers(issues) {
  // Look for issues with "Blocked" status or long cycle time
  return issues.filter(issue =>
    issue.status === 'Blocked' ||
    calculateCycleTime(issue) > averageCycleTime * 2
  );
}
```

### Label Correlation
```typescript
function analyzeLabelPatterns(issues) {
  const labelStats = {};

  issues.forEach(issue => {
    issue.labels.forEach(label => {
      if (!labelStats[label]) {
        labelStats[label] = { count: 0, totalCycleTime: 0 };
      }
      labelStats[label].count++;
      labelStats[label].totalCycleTime += calculateCycleTime(issue);
    });
  });

  return Object.entries(labelStats).map(([label, stats]) => ({
    label,
    frequency: stats.count,
    avgCycleTime: stats.totalCycleTime / stats.count
  }));
}
```

## Output Destinations

1. **Notion Knowledge Base**: Full formatted page
2. **Slack/Discord**: Summary notification (future)
3. **Email**: Weekly digest to team (future)
4. **README updates**: Add learnings to relevant docs

## Autonomy Level
**Fully autonomous**: Captures and documents knowledge without approval (user can review after)
