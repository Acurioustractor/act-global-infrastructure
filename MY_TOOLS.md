# My Tools - Quick Reference

**Just talk naturally - Claude knows when to use these!**

---

## 🎯 What You Have

### 4 Skills (Knowledge/Methodology)
Just reference these in conversation - no special commands needed:

| Skill | What It Does | How to Use |
|-------|-------------|------------|
| **act-brand-alignment** | ACT brand voice, content, projects | "Write this in ACT brand voice" |
| **act-sprint-workflow** | Sprint planning methodology | "Plan next sprint" |
| **ghl-crm-advisor** | GoHighLevel CRM strategy | "Help me set up CRM pipeline" |
| **env-secrets-manager** | Manage environment secrets | "Set up my environment variables" |

### 5 Subagents (Specialized Workers)
Just describe what you want - they activate automatically:

| Subagent | What It Does | Just Say... |
|----------|-------------|-------------|
| **sprint-planner** | Plans sprints, analyzes backlog | "What should I work on next?" |
| **code-reviewer** | Reviews code for bugs/security | "Review my code" |
| **deploy-monitor** | Checks health of all 8 sites | "Are sites healthy?" |
| **issue-bot** | Creates GitHub issues intelligently | "Create issue for..." |
| **knowledge-bot** | Captures learnings automatically | "What did we learn from Sprint 4?" |

### 3 MCPs (External Tool Connectors)
These work automatically in the background - you don't call them directly:

| MCP | What It Connects To |
|-----|-------------------|
| **github** | GitHub Projects API |
| **filesystem** | Local files |
| **postgres** | Supabase database |

### 8 GitHub Actions (Background Automations)
These run automatically on schedule:

| Action | When It Runs | What It Does |
|--------|-------------|--------------|
| master-automation | Daily 5 AM UTC | Full sync pipeline (6 steps) |
| snapshot-sprint | Daily 5 PM UTC | Sprint metrics snapshot |
| sync-sprint-metrics | Hourly | Sync sprint data to Notion |
| auto-status-from-branch | On git push | Auto-update issue status |
| daily-health-check | Daily 5 PM UTC | Monitor all sites |
| weekly-report | Fridays 5 PM UTC | Generate weekly report |
| weekly-knowledge-capture | Fridays 5 PM UTC | Capture sprint learnings |

---

## 💬 How to Use (The Simple Way)

### Just Talk Naturally

Don't memorize commands or invoke things explicitly. Just say what you want:

```
✅ "What should I build next?"          → sprint-planner activates
✅ "Review this code"                   → code-reviewer activates
✅ "Are all sites up?"                  → deploy-monitor activates
✅ "Create issue: Fix login bug"        → issue-bot activates
✅ "Write homepage copy"                → act-brand-alignment skill loads
✅ "How do I plan a sprint?"            → act-sprint-workflow skill loads
✅ "Set up CRM for Harvest project"     → ghl-crm-advisor skill loads
```

### Common Workflows

**Monday Morning - Sprint Planning:**
```
You: "Plan Sprint 5"
Claude: [Uses sprint-planner + GitHub MCP + Postgres MCP]
        Recommends 11 issues based on velocity

You: "Yes, assign them"
Claude: [Uses issue-bot] Done! 11 issues created in 3 seconds
```

**After Coding - Code Review:**
```
You: "Review my last commit"
Claude: [Uses code-reviewer + filesystem MCP]
        ⚠️ Found SQL injection at line 45
        ⚠️ Missing input validation at line 78
        ✅ Tests look good
```

**Daily Health Check:**
```
You: "Check site health"
Claude: [Uses deploy-monitor]
        ✅ actglobal.eco - OK (142ms)
        ✅ actfarm.org - OK (201ms)
        ✅ empathyledger.com - OK (187ms)
        [... 5 more sites ...]
```

**Create Multiple Issues:**
```
You: "Create 3 issues:
      1. Add webhook verification
      2. Fix milestone sync
      3. Update dashboard layout"

Claude: [Uses issue-bot in parallel mode]
        ✅ Created #42, #43, #44 in 2 seconds
```

**Writing Content:**
```
You: "Write a homepage hero section for ACT Farm"
Claude: [Uses act-brand-alignment skill]
        [Outputs content in ACT brand voice]
```

---

## 🔧 Setup Check

Run these to verify everything works:

```bash
# 1. Check MCPs are connected
# In VSCode: Cmd+Shift+P → "MCP: Show Status"
# Should show: github ✅, filesystem ✅, postgres ✅

# 2. Check GitHub Actions are running
gh workflow list

# 3. Test a simple command right here in Claude Code
# Just say: "List my subagents"
```

---

## 🆘 If Something Doesn't Work

**MCPs not connecting?**
```bash
npm run setup:mcp
# Then: Cmd+Shift+P → "Reload Window"
```

**GitHub Actions failing?**
```bash
gh run list --limit 5
gh run view <run-id> --log-failed
```

**Subagent not activating?**
- Be more specific: "Use sprint-planner to plan Sprint 5"
- Describe your intent clearly

**Need detailed docs?**
- Full guide: [docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md](docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md)
- Quick start: [QUICKSTART_SKILLS_MCPS.md](QUICKSTART_SKILLS_MCPS.md)
- Subagent details: [.claude/subagents/README.md](.claude/subagents/README.md)

---

## 🎯 Remember

**The #1 Rule: Just talk naturally!**

You don't need to memorize commands or know which tool does what. Claude automatically:
- Loads the right skill when needed
- Activates the right subagent for the job
- Uses the right MCP in the background

Just describe what you want to accomplish, and the tools work together automatically.

---

**Last Updated**: 2025-12-30
**Your Tools Are Ready** 🚀
