# Zero-Effort Workflow - The Simplest Way

**No manual syncs. No process overhead. Just code.**

---

## 🎯 What Runs Automatically

### Every Night at 5 AM UTC (9 PM Your Time)

**Master Automation Pipeline** runs while you sleep:

```
├─ 📥 Sync ALL GitHub issues → Notion (full sync)
├─ 📊 Update sprint metrics → Notion + Supabase
├─ 📈 Calculate flow metrics → Notion
├─ 🎯 Update momentum dashboard → Notion
├─ 🔄 Generate smart work queue → Notion
└─ ⚠️ Run smart alerts → Check for problems
```

**Result**: You wake up to fresh Notion data every morning.

### Every Day at 5 PM UTC (9 AM Next Day)

```
├─ 🏥 Health check all 8 sites
└─ 📊 Quick sprint metrics update
```

### Every Friday at 5 PM UTC

```
├─ 📝 Generate weekly report → Notion
├─ 📚 Capture sprint learnings → Notion Knowledge Base
└─ 🗄️ Archive completed issues
```

---

## 💻 Your Daily Workflow (Dead Simple)

### Morning (9 AM)

1. **Open Notion** (that's it)
2. Look at your Momentum Dashboard
3. See your Smart Work Queue (top 5 tasks, prioritized)
4. Check Smart Alerts (anything broken? stale?)

### During the Day

**Just code**:
- Work on features
- Create PRs
- Merge to main
- Deploy to Vercel

**Automation handles**:
- Syncing issues to Notion
- Updating dashboards
- Calculating metrics
- Generating work queues
- Checking for problems

### Monday Morning (Sprint Planning)

**In Claude Code**:
```
You: "Plan Sprint 5"

Claude: [Analyzes backlog, recommends 11 issues]

You: "Yes, assign them"

Claude: ✅ Done!
```

**That's it.** No manual GitHub issue creation, no Notion updates. Automation syncs everything overnight.

---

## 🚫 What You DON'T Do Anymore

- ❌ Manually sync GitHub → Notion
- ❌ Update sprint metrics
- ❌ Calculate flow metrics
- ❌ Check site health manually
- ❌ Generate weekly reports
- ❌ Capture learnings manually
- ❌ Update dashboards
- ❌ Figure out what to work on next

**All automated. All overnight. Zero effort.**

---

## 📊 Where to Look Each Morning

### 1. Momentum Dashboard (Notion)
**What it shows**:
- Sprint velocity (trending up/down?)
- Flow metrics (lead time, cycle time, throughput)
- PR intelligence (review times, merge rates)
- Deployment frequency
- Overall health score

**What you do**: Glance at it. If green, keep coding. If red, check alerts.

### 2. Smart Work Queue (Notion)
**What it shows**:
- Top 5 tasks to work on today
- Sorted by: blocking issues → high priority → quick wins

**What you do**: Pick the top task. Start coding.

### 3. Smart Alerts (Notion)
**What it shows**:
- Stale issues (>14 days no activity)
- Blocked issues (>7 days)
- Failed deployments
- Slow sites (>5s response time)
- Old deployments (>72h)

**What you do**: Fix critical alerts. Ignore the rest.

---

## 🎯 Manual Commands (When You Need Them)

### "What should I work on next?"
```bash
npm run queue:next
```

### "Any problems I should know about?"
```bash
npm run alerts:check
```

### "Force sync everything right now"
```bash
# Full sync (takes 2-3 minutes)
npm run sync:issues

# Sprint only (takes 10 seconds)
npm run sync:issues -- --sprint="Sprint 2"
```

### "Update dashboard right now"
```bash
npm run dashboard:update
```

### "What happened this week?"
```bash
npm run report:weekly
```

---

## 🔧 How It Works (Behind the Scenes)

### Master Automation Workflow
**File**: `.github/workflows/master-automation.yml`
**Schedule**: Daily at 5 AM UTC
**Duration**: ~3-5 minutes

**What it does**:
1. Fetches ALL issues from GitHub Project (across all 7 repos)
2. Syncs to Notion GitHub Issues database (creates/updates/archives)
3. Calculates sprint metrics (total, done, in progress, effort)
4. Updates Sprint Tracking database in Notion
5. Stores snapshot in Supabase (for historical trends)
6. Calculates flow metrics (lead time, cycle time, throughput)
7. Updates Momentum Dashboard (visual metrics page)
8. Generates Smart Work Queue (top 5 prioritized tasks)
9. Runs Smart Alerts (checks for stale/blocked/failed items)

### Individual Workflows (Still Running)
- **daily-health-check.yml** - Monitors all 8 sites (5 PM UTC)
- **sync-sprint-metrics.yml** - Quick sprint update (5 PM UTC)
- **weekly-report.yml** - Weekly summary (Friday 5 PM UTC)
- **weekly-knowledge-capture.yml** - Learning extraction (Friday 5 PM UTC)

---

## 🎓 Philosophy

**You do**: Strategic work (code, architecture, decisions)
**Automation does**: Process work (syncing, metrics, monitoring)

**Result**:
- You spend 100% time building
- Zero time on project management
- Fresh data every morning
- No manual busywork

---

## 🚀 Getting Started

### Step 1: Enable Master Automation

The workflow is already created. It will start running automatically at 5 AM UTC tomorrow.

**Want to test it now?**
```bash
# Go to GitHub → Actions → Master Automation
# Click "Run workflow"
# Select "full" mode
# Watch it run (takes 3-5 minutes)
```

### Step 2: Set Up Your Morning Routine

1. **9:00 AM** - Open Notion
2. Check Momentum Dashboard
3. Check Smart Alerts (any red?)
4. Look at Smart Work Queue
5. Start coding the top task

### Step 3: Trust the System

- Don't manually sync anymore
- Don't check GitHub Project directly
- Use Notion as your source of truth
- Automation keeps it up to date

---

## 📈 What You'll Notice

**Week 1**:
- "Wow, Notion is always up to date now"
- Saves ~30 minutes/day on manual syncing

**Week 2**:
- "I don't think about project management anymore"
- Work queue tells you what to do next

**Week 3**:
- "I'm shipping faster"
- No context switching between GitHub/Notion

**Month 1**:
- "This is how software should be built"
- Pure focus on building, zero overhead

---

## 🔮 Future Enhancements (Optional)

Want even MORE automation? These are available:

### Auto-Status Detection
When you push a branch with "wip/", "feat/", "fix/", issue status updates automatically:
- `wip/feature` → Status: In Progress
- `feat/complete` → Status: In Review
- Merged → Status: Done

### Auto-PR Descriptions
When you create a PR, automation generates description with:
- Related issues
- Changed files summary
- Test coverage impact
- Deployment preview link

### Slack Notifications
Get pinged when:
- Site goes down (critical alert)
- Sprint velocity drops >20%
- PR needs review >24h
- Weekly report ready

**Want these?** Let me know and I'll build them.

---

## 🆘 Troubleshooting

### "Notion isn't updating"
Check GitHub Actions:
```bash
gh workflow list
gh run list --workflow=master-automation.yml
```

If failed, check secrets are set:
```bash
gh secret list
```

### "I want to sync right now, not wait until 5 AM"
```bash
# Full sync
npm run sync:issues

# Sprint only (faster)
npm run sync:issues -- --sprint="Sprint 2"
```

### "I want to change the schedule"
Edit `.github/workflows/master-automation.yml`:
```yaml
schedule:
  # Currently: 5 AM UTC
  - cron: '0 5 * * *'

  # Change to 9 PM UTC (1 PM next day your time):
  - cron: '0 21 * * *'
```

---

## 📞 Questions?

1. Check this guide first
2. Run `npm run --help` to see all commands
3. Check GitHub Actions logs if automation fails
4. Ask Claude Code: "Why isn't Notion updating?"

---

**Last Updated**: 2025-12-30
**Status**: Production-ready, fully automated
**Effort Required**: Zero (just code)

**Enjoy building without the overhead!** 🚀
