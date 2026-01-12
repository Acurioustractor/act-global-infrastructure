# Quick Start: Skills + Subagents + MCPs

Get your autonomous project management system running in 5 minutes.

---

## ⚡ Setup (One-Time)

### Step 1: Setup MCPs

```bash
cd ~/act-global-infrastructure

# Generate Supabase connection string and configure MCPs
npm run setup:mcp

# Should output:
# ✅ MCP environment configured!
# 📋 MCP Servers Available:
#    • GitHub MCP
#    • Filesystem MCP
#    • Postgres MCP
```

### Step 2: Restart Claude Code

Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
Type: **"Reload Window"**
Press Enter

**MCPs are now active!**

---

## 🎯 Test It Out

### Test 1: Sprint Planning

```
You: "Plan next sprint"

Expected:
→ [sprint-planner subagent activates]
→ Queries GitHub Projects (via GitHub MCP)
→ Gets velocity data (via Postgres MCP)
→ Returns 11 recommended issues

Time: ~3 seconds (was 30 minutes manually)
```

### Test 2: Code Review

```
You: [After completing a feature]
    "Review my code"

Expected:
→ [code-reviewer subagent activates]
→ Reads changed files (via Filesystem MCP)
→ Checks for security/performance issues
→ Returns detailed review

Time: ~5 seconds
```

### Test 3: Health Check

```
You: "Are all sites healthy?"

Expected:
→ [deploy-monitor subagent activates]
→ Checks all 8 production sites
→ Returns health matrix table

Time: ~10 seconds
```

### Test 4: Create Issue

```
You: "Create issue: Add email notifications for form submissions"

Expected:
→ [issue-bot subagent activates]
→ Auto-detects Type: Enhancement
→ Auto-detects Priority: Medium
→ Auto-detects Effort: M
→ Creates in GitHub (via GitHub MCP)
→ Returns issue URL

Time: ~2 seconds
```

---

## 📚 What You Have Now

### 3 Skills (How to do)
- ✅ `act-sprint-workflow` - Sprint planning methodology
- ✅ `act-brand-alignment` - ACT brand voice/content
- ✅ `ghl-crm-advisor` - CRM strategy for 4 projects

### 5 Subagents (Who does what)
- ✅ `sprint-planner` - Plan sprints autonomously
- ✅ `code-reviewer` - Review code for bugs/security
- ✅ `deploy-monitor` - Monitor all 8 sites
- ✅ `issue-bot` - Create issues with auto-fields
- ✅ `knowledge-bot` - Capture learnings automatically

### 3 MCPs (What tools to reach)
- ✅ GitHub MCP - Direct Projects API access
- ✅ Filesystem MCP - File operations
- ✅ Postgres MCP - Supabase database queries

### 2 Automations (Background jobs)
- ✅ Daily health check (5 PM UTC)
- ✅ Weekly knowledge capture (Fridays 5 PM UTC)

---

## 🚀 Daily Workflows

### Monday: Sprint Planning

```
You: "Plan Sprint 5"

Claude: [Recommends 11 issues based on velocity]

You: "Yes, assign them"

Claude: ✅ Done! 11 issues assigned to Sprint 5
```

### Tuesday-Thursday: Feature Work

```
You: [Codes feature]

Claude: [Auto-reviews code when you're done]
        ⚠️ Critical: Found SQL injection at line 45

You: [Fixes issue]

You: "Review again"

Claude: ✅ Ready to merge!
```

### Friday: Retrospective

```
[Automatic at 5 PM UTC]

knowledge-bot runs automatically
→ Extracts learnings from Sprint 4
→ Creates knowledge base page in Notion
→ You get summary via email (future)
```

### Daily: Monitoring

```
[Automatic at 5 PM UTC]

deploy-monitor runs automatically
→ Checks all 8 sites
→ Logs metrics to Supabase
→ Creates issue if anything fails
```

---

## 💡 Pro Tips

### Implicit Invocation (Recommended)

Don't say "use sprint-planner subagent" - just describe what you want:

```
✅ "What should I work on next?"
✅ "Review my last commit"
✅ "Are sites healthy?"
✅ "Create issue for bug fix"

❌ "Run sprint-planner subagent"
❌ "Execute code-reviewer"
```

Claude automatically activates the right subagent!

### Chaining Subagents

You can combine them:

```
You: "Plan and start Sprint 5"

Claude:
1. [sprint-planner] Recommends 11 issues
2. [issue-bot] Creates all 11 in parallel
3. [deploy-monitor] Checks health before sprint
→ Everything ready to go!
```

### Batch Operations

Create multiple issues at once:

```
You: "Create these 5 issues for Sprint 5:
      1. Add webhook verification
      2. Fix milestone sync bug
      3. Create velocity chart
      4. Update dashboard layout
      5. Write API docs"

Claude: [issue-bot creates all 5 in parallel]
        ✅ Done in 3 seconds!
```

---

## 📊 Performance Comparison

| Task | Before (Manual) | After (Automated) | Speedup |
|------|----------------|-------------------|---------|
| Sprint planning | 30 minutes | 30 seconds | **60x** |
| Code review | Skipped | 5 seconds | **∞x** |
| Health checks | 10 min/day | 0 min (auto) | **∞x** |
| Issue creation | 5 min each | 10 sec each | **30x** |
| Knowledge capture | Never | Automatic | **New capability** |

**Total time saved**: ~1-2 hours per day
**Quality improvement**: Catch bugs early, institutional memory

---

## 🔍 Verify Setup

Run these checks to make sure everything works:

### Check 1: MCPs Connected

```bash
# In Claude Code, press Cmd+Shift+P
# Type: "MCP: Show Status"
# Should show 3 servers connected:
#   ✅ github
#   ✅ filesystem
#   ✅ postgres
```

### Check 2: Subagents Available

```
You: "List available subagents"

Claude: [Should list all 5 subagents]
```

### Check 3: Skills Loaded

```
You: "What skills do you have?"

Claude: [Should list 3 skills]
```

### Check 4: Automation Running

```bash
# Check GitHub Actions
gh workflow list

# Should show:
#   daily-health-check      active
#   weekly-knowledge-capture active
```

---

## 🆘 Troubleshooting

### "MCP server not found"

**Fix**:
```bash
# Verify config
cat .claude/mcp.json

# Re-run setup
npm run setup:mcp

# Restart Claude Code
CMD+Shift+P → "Reload Window"
```

### "Subagent not activating"

**Fix**:
- Be more explicit: "Use sprint-planner to plan Sprint 5"
- Describe intent clearly: "I need to plan the next sprint"
- Subagents only work in Claude Code (not web UI)

### "GitHub MCP unauthorized"

**Fix**:
```bash
# Verify token
echo $GITHUB_TOKEN

# Should be set. If not:
export GITHUB_TOKEN="your-token-here"

# Restart Claude Code
```

---

## 📖 Full Documentation

For detailed info, read:
- **[Complete Guide](docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md)** - Full architecture
- **[Subagent Registry](.claude/subagents/README.md)** - All subagents
- **Individual Subagent Docs** - `.claude/subagents/*.md`

---

## 🎉 You're Done!

Your autonomous project management system is ready.

**Next steps**:
1. ✅ Setup complete
2. ✅ Test each component
3. ✅ Start using in daily work
4. ✅ Let automation run in background

**Enjoy world-class productivity!** 🚀

---

**Questions?** Open issue in `act-global-infrastructure` repo
**Last Updated**: 2025-12-30
