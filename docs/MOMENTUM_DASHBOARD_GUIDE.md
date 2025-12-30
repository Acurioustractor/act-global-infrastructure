# Momentum Dashboard: Real-Time Velocity Visibility 📊

**Status**: ✅ Implemented and updating daily
**Dashboard**: https://www.notion.so/2d6ebcf981cf806e8db2dc8ec5d0b414

---

## What It Is

A **real-time dashboard** in Notion that shows your development velocity and flow state.

**Know instantly**:
- Am I being productive?
- Am I getting faster or slower?
- What's blocking me?
- Should I start new work or finish existing work?

---

## What It Shows

### 📊 Sprint Overview
- **Progress bar**: Visual completion percentage
- **Status breakdown**: Todo / In Progress / Done / Blocked counts
- **Completion rate**: Percentage of sprint complete

### ⚡ Velocity Metrics
- **Cycle Time**: How long from first commit to merge (goal: <24h)
- **Lead Time**: How long from issue created to closed
- **Throughput**: Issues completed per week
- **Flow Efficiency**: % of time actively working vs waiting

### 🔥 Work In Progress (WIP)
- **Current WIP count**: How many issues you're working on
- **WIP limit alert**: Warning if working on too much (>3 issues)
- **Time in progress**: How long each issue has been active
- **Stuck detection**: Alert if issue in progress >3 days

### 🚫 Blocked Items
- **Blocked count**: Issues waiting on something
- **Time blocked**: How long each has been blocked
- **Priority alert**: Red callout for immediate attention

### 🚀 Fastest Completions
- **Top 3 fastest**: Issues with shortest cycle time
- **Learn from wins**: See what made them fast
- **Celebrate success**: Visible wins for motivation

### 💡 Insights
- **Auto-generated recommendations** based on your data:
  - "Excellent progress! You're 80% through the sprint"
  - "WIP is healthy (2 issues) - good focus!"
  - "Blazing fast cycle time (12h) - keep it up!"
  - "Too much WIP (4 issues) - finish before starting new work!"

---

## How To Use

### View Dashboard
```bash
# Dashboard updates automatically daily at 5 PM UTC
# Or manually update anytime:
npm run dashboard:update

# Update for specific sprint:
npm run dashboard:sprint="Sprint 2"
```

**View live**: https://www.notion.so/2d6ebcf981cf806e8db2dc8ec5d0b414

### Read The Metrics

#### 🎯 Cycle Time (Key Metric)
**What it is**: Time from first commit (PR created) to merged

**Goals**:
- 🚀 Excellent: <24 hours (same-day shipping)
- ✅ Good: 1-3 days (normal pace)
- ⚠️ Slow: >3 days (look for bottlenecks)

**Use it to**:
- Measure shipping speed
- Find bottlenecks in review/merge process
- Track improvement over time

#### 📈 Throughput
**What it is**: Issues completed per week

**Goals**:
- Solo developer: 4-6 issues/week
- With team: 8-12 issues/week

**Use it to**:
- Predict sprint completion
- Track velocity trends
- Set realistic goals

#### 🔥 WIP Limit
**What it is**: Number of issues currently "In Progress"

**Goals**:
- 🎯 Optimal: 1-2 issues (deep focus)
- ✅ Acceptable: 3 issues (at limit)
- 🚨 Too much: 4+ issues (context switching!)

**Use it to**:
- Maintain focus
- Avoid context switching
- Finish before starting

#### ⚡ Flow Efficiency
**What it is**: Active work time / Total time

**Goals**:
- 🚀 World-class: >40%
- ✅ Good: 25-40%
- ⚠️ Needs work: <25%

**Use it to**:
- Identify waiting/blocked time
- Reduce non-coding time
- Optimize workflow

---

## Interpreting The Dashboard

### Scenario 1: Healthy Flow ✅

```
Progress: ████████░░ 8/10 (80%)
Cycle Time: 18h ⬇️
WIP: 2/3 ✅
Blocked: 0 ✅
Throughput: 5.5 issues/week ⬆️
```

**What this means**:
- You're on track to complete sprint
- Shipping fast (18h cycle time)
- Good focus (only 2 WIP)
- No blockers
- Velocity increasing

**Action**: Keep doing what you're doing! 🚀

---

### Scenario 2: Too Much WIP ⚠️

```
Progress: ████░░░░░░ 4/10 (40%)
Cycle Time: 72h ⬆️
WIP: 5/3 🚨
Blocked: 0
Throughput: 2.1 issues/week ⬇️
```

**What this means**:
- Behind schedule
- Slow shipping (3-day cycle time)
- Too much in progress (context switching!)
- Velocity decreasing

**Action**:
1. STOP starting new work
2. Pick ONE issue to finish
3. Ship it, then move to next
4. Goal: Get WIP down to 2

---

### Scenario 3: Blocking Issues 🚫

```
Progress: ██████░░░░ 6/10 (60%)
Cycle Time: 24h ✅
WIP: 1/3 ✅
Blocked: 3 🚨
Throughput: 3.8 issues/week ⬇️
```

**What this means**:
- Moderate progress
- Good cycle time when unblocked
- Low WIP (good)
- But 3 blocked issues killing velocity

**Action**:
1. Review blocked items (check dashboard for list)
2. Unblock them or remove blockers
3. Ask for help if needed
4. Consider moving blocked items to backlog

---

### Scenario 4: Stuck Issue 🐌

```
In Progress:
 • #67: API integration - 4 days ⚠️ May be stuck!
```

**What this means**:
- Issue in progress for 4 days
- Likely hit a blocker or scope creep

**Action**:
1. Is it really 4 days of work? Or stuck?
2. Break into smaller issues if too big
3. Mark as blocked if waiting on something
4. Ask for help if needed
5. Consider finishing something smaller first

---

## Automation

### Daily Updates
Dashboard auto-updates every day at **5 PM UTC** via GitHub Actions

**Workflow**: `.github/workflows/sync-sprint-metrics.yml`

**What it does**:
1. Sync all issues to Notion
2. Calculate sprint metrics
3. Update momentum dashboard
4. Takes ~30 seconds total

### Manual Updates
```bash
# Update dashboard now
npm run dashboard:update

# Update for specific sprint
npm run dashboard:sprint="Sprint 2"

# Just calculate metrics (no Notion update)
npm run metrics:calculate --sprint="Sprint 2"
```

---

## Metrics Definitions

### Cycle Time
**Formula**: `time(PR merged) - time(PR created)`

**Why it matters**: Measures actual shipping speed

**Limitations**: Only counts issues with PRs

**Improving it**:
- Smaller PRs (easier to review)
- Faster reviews (notify reviewers)
- Auto-merge when CI passes

---

### Lead Time
**Formula**: `time(issue closed) - time(issue created)`

**Why it matters**: Total time from idea to shipped

**Includes**: Planning, coding, review, deploy

**Improving it**:
- Better upfront planning (less rework)
- Smaller issues (ship incrementally)
- Reduce waiting time

---

### Throughput
**Formula**: `issues completed / weeks in sprint`

**Why it matters**: Velocity indicator

**For Sprint 2** (30 days = ~4.3 weeks):
- 0 completed → 0 issues/week
- 5 completed → 1.2 issues/week
- 10 completed → 2.3 issues/week

**Improving it**:
- Better estimation (right-sized issues)
- Focus (lower WIP)
- Remove blockers

---

### Flow Efficiency
**Formula**: `cycle time / lead time × 100%`

**Why it matters**: Shows how much time is active vs waiting

**Example**:
- Lead time: 3 days (72h total)
- Cycle time: 1 day (24h coding)
- Flow efficiency: 24/72 = 33%
- Meaning: 33% coding, 67% waiting

**Improving it**:
- Reduce waiting for review
- Faster CI/CD
- Better planning (less blocked time)

---

## Using Dashboard For Decisions

### Daily Standup
Instead of "what did I do yesterday?":

1. Open dashboard
2. Check "Fastest Completions" - see what you shipped
3. Check "WIP" - know what you're working on
4. Check insights - see if you're on track

**Time saved**: 5 minutes (no more remembering what you did)

---

### Sprint Planning
Instead of guessing capacity:

1. Check last sprint's throughput: "4.2 issues/week"
2. Calculate capacity: "4.3 weeks × 4.2 = ~18 issues"
3. Plan 15-18 issues (80-100% confidence)

**Result**: Realistic commitments, less stress

---

### 1-on-1s / Reviews
Instead of "I feel like I'm being productive":

**Show data**:
- "Throughput increased 25% this sprint"
- "Cycle time down from 48h to 18h"
- "Completed 8 issues vs goal of 10 (80%)"

**Result**: Evidence-based performance discussions

---

### Personal Growth
Track improvement over time:

| Sprint | Throughput | Cycle Time | Flow Efficiency |
|--------|-----------|------------|-----------------|
| Sprint 1 | 3.2/week | 48h | 28% |
| Sprint 2 | 4.2/week | 36h | 35% |
| Sprint 3 | 5.5/week | 18h | 45% |

**See**: You're getting 70% faster!

---

## Troubleshooting

### "Dashboard shows 0 issues"
**Problem**: Sprint filter not matching

**Fix**:
```bash
# Check what's in your project
gh project item-list 1 --owner Acurioustractor --format json | \
  jq '.items[] | {sprint: .sprint}' | grep -v null | sort | uniq

# Update sprint name in command
npm run dashboard:sprint="Sprint X"  # Use exact name from above
```

---

### "Metrics say N/A"
**Problem**: No completed issues yet with PRs

**Explanation**:
- Cycle time needs merged PRs
- Lead time needs closed issues
- First sprint has less data

**Fix**: Keep working! Metrics populate as you ship.

---

### "WIP shows 0 but I'm working on things"
**Problem**: Issues not marked "In Progress" in GitHub Project

**Fix**:
1. Go to GitHub Project
2. Drag issue to "In Progress" column
3. Or use auto-status (pushes to branch auto-update!)

---

## What's Next

### Level 3 Features (Coming Soon)

**Smart Alerts**:
- Slack/email when issue stuck >3 days
- Daily WIP limit warnings
- Sprint completion predictions

**Trend Analysis**:
- Compare sprints side-by-side
- Velocity graphs over time
- Predictive completion dates

**Team Dashboards**:
- Multi-developer metrics
- Relative velocity
- Code review stats

---

## Files

```
scripts/
  ├── calculate-flow-metrics.mjs       ← Calculate all metrics
  └── generate-momentum-dashboard.mjs  ← Update Notion dashboard

.github/workflows/
  └── sync-sprint-metrics.yml          ← Daily auto-update (5 PM UTC)

package.json
  ├── metrics:calculate                ← Calculate metrics
  ├── dashboard:update                 ← Update dashboard (all issues)
  └── dashboard:sprint                 ← Update for specific sprint
```

---

## Philosophy

### You Can't Improve What You Don't Measure

**Before Dashboard**:
- "I feel busy but unproductive"
- "Am I shipping fast enough?"
- "Why do sprints always run over?"

**After Dashboard**:
- "Cycle time increased 20% this week - let me investigate"
- "WIP is at 4 - I should finish before starting"
- "Throughput predicts 18 issues, so I'll plan for 15"

**The difference**: Gut feelings → Data-driven decisions

---

### Visible Progress = Motivation

**Psychological win**:
- See completion % increase daily
- Watch cycle time decrease over sprints
- Celebrate fastest completions

**Result**:
- Dopamine hits from visible progress
- Momentum builds on itself
- Motivation to optimize

---

### Professional Developer Experience

World-class teams (Linear, GitLab, Shortcut) all have dashboards like this.

**You now have**:
- Same visibility as 10x engineering teams
- Data-driven velocity tracking
- Professional engineering culture

**Even as a solo developer** 🚀

---

## Summary

### What You Have
✅ **Real-time velocity dashboard** updating daily
✅ **Flow metrics** (cycle time, throughput, WIP, flow efficiency)
✅ **Actionable insights** (auto-generated recommendations)
✅ **Bottleneck detection** (stuck issues, blocked items)
✅ **Celebration moments** (fastest completions)

### What It Gives You
📊 **Self-awareness**: Know if you're productive (data, not feelings)
⚡ **Early warnings**: Catch problems before they become blockers
📈 **Continuous improvement**: Get faster every sprint
💪 **Motivation**: Visible progress drives momentum

### What's Changed
**Before**: "I feel like I'm slow today"
**After**: "Cycle time is 48h, let's get it to 24h"

---

**Welcome to Level 2B: Momentum Dashboard!**

You can now see your velocity in real-time.
You can now optimize based on data.
You can now ship like a professional team.

🚀 **Data-driven developer velocity achieved!**
