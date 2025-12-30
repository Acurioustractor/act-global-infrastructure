# Smart Alerts: Proactive Bottleneck Detection 🔔

**Status**: ✅ Implemented and running daily
**Level**: 3A - Team Momentum

---

## What It Is

**Smart Alerts** analyzes your flow metrics and **proactively notifies you** when things need attention.

**No more surprises**:
- Issues stuck for days? Get alerted.
- Too much WIP? Get warned.
- Sprint at risk? Know immediately.

---

## Alert Types

### 🚨 Critical Alerts

#### 1. **Blocked Issues**
**Trigger**: Any issue marked as "Blocked"

**Alert**:
```
🚫 Issues Blocked!
2 issue(s) are blocked. These need immediate attention to unblock.

💡 Review blocked items and work to remove blockers ASAP.
```

**Actions**:
- Review what's blocking each issue
- Reach out for help if needed
- Move to backlog if permanently blocked

---

#### 2. **Sprint At Risk**
**Trigger**: >50% of time elapsed but <50% of work complete

**Alert**:
```
🚨 Sprint At Risk!
Sprint is 60% through time but only 40% complete. Need to accelerate!

💡 Focus on highest priority items. Consider moving some issues to next sprint.
```

**Actions**:
- Review remaining issues
- Move low-priority items to next sprint
- Focus on must-haves only

---

### ⚠️ Warning Alerts

#### 3. **WIP Limit Exceeded**
**Trigger**: >3 issues "In Progress"

**Alert**:
```
⚠️ Too Much Work In Progress!
You have 5 issues in progress (limit: 3). Focus on finishing before starting new work.

💡 Pick ONE issue to complete, then move to the next.
```

**Actions**:
- STOP starting new work
- Pick ONE issue to finish
- Get WIP down to 2-3

**Why it matters**: Context switching kills productivity

---

#### 4. **Issue Stuck**
**Trigger**: Issue "In Progress" for >3 days

**Alert**:
```
🐌 Issue Stuck in Progress
Issue #67 has been in progress for 4 days. May need help or should be broken down.

💡 Review if this needs to be split into smaller issues or if you need help.
```

**Actions**:
- Is it really 4 days of work?
- Break into smaller issues if too big
- Ask for help if blocked
- Mark as blocked if waiting on something

---

#### 5. **Slow Cycle Time**
**Trigger**: Average cycle time >72 hours (3 days)

**Alert**:
```
🐢 Slow Cycle Time Detected
Average cycle time is 4 days. Look for bottlenecks in review/merge process.

💡 Consider smaller PRs, faster reviews, or auto-merge when CI passes.
```

**Actions**:
- Review PR sizes (are they too big?)
- Check review turnaround time
- Consider auto-merge for simple changes
- Look for CI/CD bottlenecks

---

#### 6. **Low Flow Efficiency**
**Trigger**: Flow efficiency <25%

**Alert**:
```
⏱️ Low Flow Efficiency
Flow efficiency is 20%. You're spending >80% of time waiting, not coding.

💡 Identify where time is spent waiting. Reduce review delays, CI time, or blocked time.
```

**Actions**:
- Measure where waiting time happens
- Reduce PR review delays
- Optimize CI/CD pipeline
- Identify blocking dependencies

---

### ℹ️ Info Alerts (Positive Reinforcement)

#### 7. **Good Progress**
**Trigger**: >80% complete, ≤2 WIP, 0 blocked

**Alert**:
```
🎉 Excellent Progress!
Sprint is 85% complete with healthy WIP and no blockers. Keep up the great work!

💡 You are on track! Maintain current pace to hit sprint goal.
```

**Why**: Positive feedback = motivation

---

## Notification Channels

### 1. **macOS Desktop Notifications** 🖥️

**What**: Native macOS notifications

**When**: Critical and warning alerts

**Sounds**:
- Critical: "Basso" (urgent)
- Warning: "Submarine" (attention)
- Info: "Glass" (gentle)

**Example**:
![macOS notification showing "⚠️ Too Much Work In Progress!" with alert details]

**Setup**: Works automatically on macOS

---

### 2. **Email Notifications** 📧

**What**: Email alerts for critical issues

**When**: Only critical alerts (blocked issues, sprint at risk)

**Setup**:
```bash
# Add to .env.local
ALERT_EMAIL=your-email@example.com
```

**Example Email**:
```
Subject: [Sprint 2] 🚫 Issues Blocked!

2 issue(s) are blocked. These need immediate attention to unblock.

Recommendation: Review blocked items and work to remove blockers ASAP.

Data:
{
  "count": 2,
  "items": [
    {
      "number": 45,
      "title": "Integrate payment gateway",
      "daysBlocked": 2
    }
  ]
}
```

**Note**: Currently logs emails. To enable actual sending, integrate with:
- SendGrid
- AWS SES
- Nodemailer + SMTP

---

### 3. **Console Output** 💻

**What**: Detailed alert output in terminal

**When**: Every alert check (daily automation or manual)

**Example**:
```
🔔 Smart Alerts for Sprint 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Alert Summary:
   🚨 Critical: 1
   ⚠️  Warnings: 2

🚨 Sprint At Risk!
   Sprint is 60% through time but only 40% complete. Need to accelerate!
   💡 Focus on highest priority items. Consider moving some issues to next sprint.

⚠️ Too Much Work In Progress!
   You have 4 issues in progress (limit: 3). Focus on finishing before starting new work.
   💡 Pick ONE issue to complete, then move to the next.

⚠️ Issue Stuck in Progress
   Issue #67 has been in progress for 4 days. May need help or should be broken down.
   💡 Review if this needs to be split into smaller issues or if you need help.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 4. **Future Channels** 🔮

Coming soon:
- **Notion Comments**: Add alerts directly to issue pages
- **GitHub Issues**: Auto-create issues for critical alerts
- **Discord/Telegram**: Team notifications
- **SMS**: Ultra-critical alerts (Twilio integration)

---

## How To Use

### Manual Check
```bash
# Check current sprint for alerts
npm run alerts:check

# Check specific sprint
npm run alerts:sprint="Sprint 2"
```

### Daily Automation
Alerts run automatically **daily at 5 PM UTC** as part of the sync workflow.

**Workflow**: `.github/workflows/sync-sprint-metrics.yml`

**What happens**:
1. Sync issues to Notion
2. Calculate metrics
3. Update dashboard
4. **Check for alerts**
5. Send notifications

### On-Demand
Run anytime you want to check status:
```bash
npm run alerts:sprint="Sprint 2"
```

---

## Alert Thresholds

You can customize these in `scripts/smart-alerts.mjs`:

| Alert | Current Threshold | Customizable To |
|-------|------------------|-----------------|
| WIP Limit | >3 issues | 2, 3, 4, 5 |
| Issue Stuck | >3 days | 2, 3, 4, 5 days |
| Slow Cycle Time | >72 hours | 24h, 48h, 72h |
| Low Flow Efficiency | <25% | 20%, 25%, 30% |
| Sprint At Risk | Time 50% > Work 50% | Any % |

**To customize**:
Edit `scripts/smart-alerts.mjs` and change the threshold values.

---

## Examples

### Scenario 1: All Green ✅

**Sprint Status**:
- 8/10 complete (80%)
- 2 issues in progress
- 0 blocked
- Cycle time: 18h

**Alerts**:
```
✅ All systems green!
```

**Action**: Keep doing what you're doing!

---

### Scenario 2: Too Much WIP ⚠️

**Sprint Status**:
- 4/10 complete (40%)
- **5 issues in progress** ← Problem
- 0 blocked
- Cycle time: 72h

**Alerts**:
```
⚠️ Too Much Work In Progress!
You have 5 issues in progress (limit: 3).

🐢 Slow Cycle Time Detected
Average cycle time is 3 days.
```

**macOS Notification**: "⚠️ Too Much Work In Progress! - Pick ONE issue to complete..."

**Action**:
1. Stop starting new work
2. Pick ONE issue
3. Finish it completely
4. Then move to next

**Expected Result**:
- WIP drops to 2-3
- Cycle time improves to <24h
- Velocity increases

---

### Scenario 3: Sprint At Risk 🚨

**Sprint Status**:
- 3/10 complete (30%)
- 15 days elapsed (50% of sprint)
- 2 issues in progress
- 1 blocked

**Alerts**:
```
🚨 Sprint At Risk!
Sprint is 50% through time but only 30% complete.

🚫 Issues Blocked!
1 issue(s) are blocked.
```

**macOS Notification**: "🚨 Sprint At Risk! - Need to accelerate!"

**Email**: Sent to configured ALERT_EMAIL

**Action**:
1. Unblock the blocked issue immediately
2. Review remaining 7 issues
3. Move 2-3 low-priority to next sprint
4. Focus on must-haves only
5. Daily check-ins to track progress

---

### Scenario 4: Stuck Issue 🐌

**Sprint Status**:
- 6/10 complete (60%)
- Issue #67 in progress for 5 days
- Cycle time: 24h (good for other issues)

**Alert**:
```
🐌 Issue Stuck in Progress
Issue #67 has been in progress for 5 days.
```

**Action**:
1. Review issue #67
2. Options:
   - Break into smaller issues (recommended)
   - Mark as blocked if waiting
   - Ask for help if stuck
   - Move to backlog if no longer priority

---

## Integration with Dashboard

Alerts complement the Momentum Dashboard:

**Dashboard**: Shows "what" (metrics, status)
**Alerts**: Tell you "when to act" (proactive notifications)

**Together**:
1. Dashboard shows WIP = 5
2. Alert fires: "Too Much WIP!"
3. You take action
4. Next day: Dashboard shows WIP = 2
5. Alert fires: "Good Progress!"

---

## Alert History

Currently alerts are real-time only. Future enhancement:

**Alert Log** (coming soon):
- Track alert history over time
- See trends (getting more/fewer alerts?)
- Measure response time to alerts
- Dashboard showing alert frequency

---

## Best Practices

### 1. **Don't Ignore Warnings**
Warnings become critical if ignored:
- Stuck issue (3 days) → Still stuck (7 days)
- Too much WIP → Sprint fails

**Act on warnings early**

---

### 2. **Review Alerts Daily**
Make it part of your daily routine:
```bash
# Morning standup
npm run alerts:check
```

**5 seconds** to know what needs attention

---

### 3. **Customize Thresholds**
Adjust to your workflow:
- Fast-paced team: WIP limit = 2
- Complex work: Issue stuck threshold = 5 days

**Tune to your rhythm**

---

### 4. **Positive Reinforcement Matters**
Celebrate the "Good Progress" alerts:
- Share with team
- Track improvement
- Build momentum

**Motivation = velocity**

---

## Troubleshooting

### "No alerts but I know there's a problem"
**Possible causes**:
1. Threshold too high (adjust in script)
2. Issues not marked correctly in GitHub Project
3. Metrics not calculating properly

**Fix**: Check dashboard first to verify metrics

---

### "Too many alerts"
**Possible causes**:
1. Thresholds too strict
2. Actually a lot of problems (good to know!)

**Fix**: Adjust thresholds or address root issues

---

### "Alerts not showing on macOS"
**Possible causes**:
1. Notifications disabled for Terminal
2. Running in non-macOS environment

**Fix**:
- System Settings → Notifications → Terminal → Enable
- Or rely on console output/email

---

### "Email not sending"
**Cause**: Email not configured (logs only by default)

**Fix**: Integrate with email service:

```javascript
// In scripts/smart-alerts.mjs
// Replace sendEmailNotification() with actual SMTP/SendGrid code
```

---

## Files

```
scripts/
  └── smart-alerts.mjs                 ← Alert engine

.github/workflows/
  └── sync-sprint-metrics.yml          ← Daily automation (updated)

package.json
  ├── alerts:check                     ← Check for alerts
  └── alerts:sprint                    ← Sprint-specific alerts
```

---

## Future Enhancements

### Phase 1 (Next Sprint)
- [ ] Notion comments integration
- [ ] GitHub issue creation for blockers
- [ ] Alert history/log database

### Phase 2 (Future)
- [ ] Slack/Discord integration
- [ ] SMS for critical alerts (Twilio)
- [ ] Predictive alerts (ML-based)
- [ ] Custom alert rules (YAML config)

### Phase 3 (Vision)
- [ ] Team aggregated alerts
- [ ] Alert response tracking
- [ ] Auto-remediation (AI suggests fixes)

---

## Philosophy

### Proactive vs Reactive

**Before Alerts** (Reactive):
- Work on issue for 5 days
- Finally realize it's stuck
- Lost time: 5 days

**After Alerts** (Proactive):
- Alert at day 3: "Issue stuck"
- Break into smaller pieces
- Lost time: 0 days

**The difference**: Catching problems early = saving time

---

### Alert Fatigue

**The danger**: Too many alerts = ignored alerts

**Our approach**:
1. **Actionable only**: Every alert has clear action
2. **Severity levels**: Critical vs warning vs info
3. **Positive reinforcement**: Celebrate wins
4. **Customizable**: Tune to your workflow

**Goal**: Alerts you trust and act on

---

## Summary

### What You Have
✅ **7 alert types** (blocked, stuck, WIP, cycle time, efficiency, sprint risk, good progress)
✅ **Multi-channel notifications** (macOS, console, email ready)
✅ **Daily automated checks** (5 PM UTC)
✅ **Actionable recommendations** (every alert tells you what to do)
✅ **Severity levels** (critical, warning, info)

### What It Gives You
🔔 **Proactive detection**: Know about problems before they're critical
⚡ **Early intervention**: Fix stuck issues at day 3, not day 7
📊 **Data-driven actions**: Alerts based on metrics, not feelings
💪 **Peace of mind**: System watches for you

### What's Changed
**Before**: Discover problems too late
**After**: Get warned early, act proactively

---

**Welcome to Level 3A: Smart Alerts!**

Your system now watches for bottlenecks 24/7.
You get notified proactively.
You solve problems before they become critical.

🔔 **Proactive bottleneck detection achieved!**
