# Skills, Subagents & MCPs - Complete Guide

**Ultimate productivity architecture for ACT ecosystem project management**

---

## 🎯 What Is This?

A three-layer architecture that transforms Claude Code from a helpful assistant into an autonomous project management system:

1. **Skills** - How to do something (guides/methodology)
2. **Subagents** - Who does what (specialized workers)
3. **MCPs** - What tools you can reach (external system connectors)

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOU (Strategic Decisions)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 MAIN CLAUDE CONVERSATION                     │
│  • Understands intent                                        │
│  • Orchestrates subagents                                    │
│  • Presents results                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │         SKILLS (How to do)            │
        ├──────────────────────────────────────┤
        │ • act-sprint-workflow                 │
        │ • act-brand-alignment                 │
        │ • ghl-crm-advisor                     │
        └──────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │      SUBAGENTS (Who does what)        │
        ├──────────────────────────────────────┤
        │ • sprint-planner                      │
        │ • code-reviewer                       │
        │ • deploy-monitor                      │
        │ • issue-bot                           │
        │ • knowledge-bot                       │
        └──────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │       MCPs (What tools to reach)      │
        ├──────────────────────────────────────┤
        │ • GitHub MCP (Projects API)           │
        │ • Filesystem MCP (File operations)    │
        │ • Postgres MCP (Supabase direct)      │
        └──────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Setup MCPs (One-time)

```bash
cd ~/act-global-infrastructure

# Generate Supabase connection string
./scripts/setup-mcp-env.sh

# Restart Claude Code to activate MCPs
# (CMD+Shift+P → "Reload Window")
```

### 2. Test the System

```bash
# Ask Claude Code:
"Plan next sprint"
→ Activates sprint-planner subagent
→ Uses GitHub MCP + Postgres MCP
→ Returns recommendations

"Review my last commit"
→ Activates code-reviewer subagent
→ Uses Filesystem MCP
→ Returns review with security/performance checks

"Are all sites healthy?"
→ Activates deploy-monitor subagent
→ Checks all 8 sites
→ Returns health matrix
```

---

## 📚 Layer 1: Skills (How To Do)

### What Are Skills?

Static guides that tell Claude the **methodology** for a task.

Think of them as:
- Reference manuals
- Standard operating procedures
- Best practice guides

### Current Skills

#### `act-sprint-workflow`
**Purpose**: Sprint planning, standups, health checks, issue automation

**Capabilities**:
- Calculate velocity from historical data
- Analyze backlog by priority
- Generate daily standup reports
- Create issues with auto-detected fields

**Location**: `.claude/skills/act-sprint-workflow/`

**Usage**: Automatically loaded when you ask about sprints

---

#### `act-brand-alignment`
**Purpose**: Ensure all content matches ACT brand voice and identity

**Capabilities**:
- LCAA methodology (Listen, Curiosity, Action, Art)
- Regenerative innovation language
- Farm metaphor system
- Cross-project consistency

**Location**: `.claude/skills/act-brand-alignment/`

**Usage**: Automatically loaded when working on content/copy

---

#### `ghl-crm-advisor`
**Purpose**: GoHighLevel CRM strategy for all 4 ACT projects

**Capabilities**:
- Pipeline design (stages, automation, revenue)
- Email/SMS workflow scripting
- Tag taxonomy and organization
- Integration architecture (Stripe, Supabase, Resend)

**Location**: `.claude/skills/ghl-crm-advisor/`

**Usage**: Ask about CRM, pipelines, or customer workflows

---

## 🤖 Layer 2: Subagents (Who Does What)

### What Are Subagents?

Specialized autonomous workers that handle specific jobs.

Think of them as:
- Team members with one expertise
- Parallel processors
- Background tasks

### Current Subagents

#### `sprint-planner`
**Job**: Analyze backlog and recommend issues for next sprint

**Triggers**:
- "Plan next sprint"
- "What should we build?"
- Monday mornings (automated)

**What it does**:
1. Queries GitHub Projects for Backlog issues (GitHub MCP)
2. Gets velocity from last 3 sprints (Postgres MCP)
3. Analyzes priority, effort, dependencies
4. Recommends top N issues that fit capacity
5. Offers to assign to sprint

**Autonomy**: Semi-autonomous (recommends, requires approval)

---

#### `code-reviewer`
**Job**: Automated code review for security, performance, bugs

**Triggers**:
- After completing feature
- "Review my code"
- Creating a PR

**What it does**:
1. Reads changed files (Filesystem MCP)
2. Checks for security vulnerabilities
3. Identifies performance issues
4. Detects common bugs
5. Suggests improvements
6. Analyzes test coverage

**Autonomy**: Fully autonomous (reviews but doesn't modify)

---

#### `deploy-monitor`
**Job**: Continuous health monitoring across all 8 sites

**Triggers**:
- After deployment
- Daily at 5 PM UTC (automated)
- "Are sites healthy?"

**What it does**:
1. HTTP health checks (all 8 sites)
2. Database connectivity tests
3. Performance monitoring
4. Deployment age tracking
5. Alerts on critical issues

**Autonomy**: Fully autonomous (monitors and reports)

---

#### `issue-bot`
**Job**: Create GitHub issues with intelligent field detection

**Triggers**:
- "Create issue for..."
- Describing work to be done
- Batch creation after sprint planning

**What it does**:
1. Parses natural language → issue fields
2. Auto-detects Type, Priority, Effort
3. Identifies repository from context
4. Creates in GitHub with project fields (GitHub MCP)
5. Syncs to Notion
6. Can create multiple issues in parallel

**Autonomy**: Semi-autonomous (confirms before creation)

---

#### `knowledge-bot`
**Job**: Capture learnings and build institutional memory

**Triggers**:
- After sprint completion
- Issue marked Done
- "What did we learn?"
- Weekly retrospective (automated)

**What it does**:
1. Extracts learnings from issue comments (GitHub MCP)
2. Identifies technical decisions
3. Detects patterns (quick wins, blockers)
4. Analyzes commits for insights
5. Creates knowledge base pages in Notion

**Autonomy**: Fully autonomous (captures without approval)

---

## 🔌 Layer 3: MCPs (What Tools To Reach)

### What Are MCPs?

Model Context Protocol servers that give Claude direct access to external systems.

Think of them as:
- API connectors
- Database drivers
- Universal power plugs

### Current MCPs

#### GitHub MCP
**Purpose**: Direct GitHub API access (no more gh CLI parsing)

**Capabilities**:
- Query GitHub Projects with filters
- Search issues across repos
- Create issues with project fields
- Get deployment metadata
- Access PR diffs and comments

**Configuration**:
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
    }
  }
}
```

---

#### Filesystem MCP
**Purpose**: File operations across all codebases

**Capabilities**:
- Read files from any repo
- Search for patterns
- Analyze code structure
- No need for manual Read tool calls

**Configuration**:
```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/Users/benknight/act-global-infrastructure",
      "/Users/benknight/Code"
    ]
  }
}
```

---

#### Postgres MCP
**Purpose**: Direct Supabase database access

**Capabilities**:
- Query `sprint_snapshots` for trends
- Query `deployment_metrics` for DORA data
- No need for SQL scripts
- Real-time data access

**Configuration**:
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "${SUPABASE_CONNECTION_STRING}"
    }
  }
}
```

---

## 💡 Real-World Usage Examples

### Example 1: Monday Sprint Planning

**Before** (manual):
```
You: Run gh CLI to get backlog
You: Parse JSON output
You: Calculate velocity manually
You: Recommend issues
You: Create each issue one by one
→ 30 minutes
```

**After** (automated):
```
You: "Plan next sprint"

Claude: [Activates sprint-planner]
  ↓ Uses GitHub MCP (query backlog)
  ↓ Uses Postgres MCP (get velocity)
  ↓ Analyzes and recommends

Claude: "Here are 11 recommended issues for Sprint 5. Assign?"

You: "Yes"

Claude: [Activates issue-bot]
  ↓ Creates all 11 issues in parallel (GitHub MCP)
  ↓ Sets project fields
  ↓ Syncs to Notion

Claude: "Done! 11 issues assigned to Sprint 5"
→ 30 seconds
```

---

### Example 2: Code Review After Feature

**Before** (manual):
```
You: Manually review your own code
You: Miss security vulnerabilities
You: Ship buggy code
→ No systematic review
```

**After** (automated):
```
You: [Completes feature]

Claude: [Auto-activates code-reviewer]
  ↓ Reads changed files (Filesystem MCP)
  ↓ Checks security patterns
  ↓ Analyzes performance
  ↓ Detects bugs

Claude: "⚠️ Critical: SQL injection found at line 45. Fix before merge."

You: [Fixes issue]
You: "Review again"

Claude: "✅ Looks good! Ready to merge."
→ Ship secure code
```

---

### Example 3: Daily Health Monitoring

**Before** (manual):
```
You: Manually check each site
You: Sometimes forget
You: Discover issues days later
→ Slow to detect problems
```

**After** (automated):
```
[5 PM UTC daily - GitHub Action triggers]

Claude: [Auto-activates deploy-monitor]
  ↓ Checks all 8 sites via HTTP
  ↓ Tests database connectivity
  ↓ Measures response times
  ↓ Checks deployment age

Claude: "⚠️ ACT Farm: 72h old deployment + slow response (6.2s)"

[Creates high-priority issue automatically]

You: [Notified, can fix proactively]
→ Catch problems early
```

---

## 🎯 Workflow Automation

### Daily Automated Tasks

**5 PM UTC** (Daily):
- `deploy-monitor` checks all 8 sites
- Creates issues for failures
- Logs metrics to Supabase

**Monday 9 AM** (Weekly):
- `sprint-planner` analyzes backlog
- Posts recommendations to Slack (future)

**Friday 5 PM** (Weekly):
- `knowledge-bot` captures sprint learnings
- Updates knowledge base in Notion

---

## 🔧 Setup Instructions

### Prerequisites

1. ✅ Claude Code installed
2. ✅ act-global-infrastructure repo cloned
3. ✅ Environment variables configured (.env.local)

### Step 1: Setup MCPs

```bash
cd ~/act-global-infrastructure

# Generate Supabase connection string
./scripts/setup-mcp-env.sh

# Verify MCP configuration
cat .claude/mcp.json
```

### Step 2: Restart Claude Code

```
CMD+Shift+P (or Ctrl+Shift+P)
→ Type: "Reload Window"
→ Enter
```

MCPs are now active!

### Step 3: Test Each Layer

**Test Skills:**
```
Ask: "How should I plan a sprint?"
→ Should reference act-sprint-workflow skill
```

**Test Subagents:**
```
Ask: "Plan next sprint"
→ Should activate sprint-planner subagent
```

**Test MCPs:**
```
Ask: "Show me backlog issues"
→ Should use GitHub MCP (faster than gh CLI)
```

### Step 4: Enable Automation

```bash
# GitHub Actions are already configured
# Just push to enable:

git add .github/workflows/
git commit -m "feat: enable automated health checks and knowledge capture"
git push

# Verify workflows:
gh workflow list
```

---

## 📊 Monitoring & Debugging

### View Subagent Activity

In Claude Code conversations, you'll see:
```
[sprint-planner subagent activated]
📊 Analyzing backlog...
✅ Found 47 issues in Backlog
[sprint-planner subagent complete - 2.3s]
```

### Check MCP Status

```
CMD+Shift+P → "MCP: Show Status"
→ Shows which MCPs are connected
```

### Debug Mode

Set environment variable for verbose output:
```bash
export CLAUDE_SUBAGENT_DEBUG=true
```

---

## 🎓 Best Practices

### When to Use Each Layer

**Use Skills when**:
- Defining methodology/process
- Creating reusable guides
- Teaching Claude how to do something

**Use Subagents when**:
- Task is repetitive
- Task can run autonomously
- Task requires multiple tools/steps
- Task benefits from specialization

**Use MCPs when**:
- Accessing external systems frequently
- Need real-time data
- Want faster performance than CLI parsing
- Direct API access is available

### Naming Conventions

- Skills: `act-<domain>-<purpose>`
- Subagents: `<job>-<action>` (kebab-case)
- MCPs: Standard MCP names

---

## 🚀 What You've Gained

### Time Savings

| Task | Before | After | Savings |
|------|--------|-------|---------|
| Sprint planning | 30 min | 30 sec | 29.5 min |
| Code review | 0 min (skipped) | 2 min | Prevented bugs |
| Health monitoring | 10 min (manual) | 0 min (auto) | 10 min |
| Issue creation | 5 min per issue | 10 sec per issue | 4.5 min each |
| Knowledge capture | Never done | Automatic | Institutional memory |

**Total**: ~1 hour/day saved + better quality

### Quality Improvements

- ✅ **Consistent sprint planning** (data-driven, not gut feel)
- ✅ **Systematic code review** (catch security issues)
- ✅ **Proactive monitoring** (detect issues early)
- ✅ **Institutional memory** (learnings captured)
- ✅ **Professional practices** (matches world-class teams)

---

## 📋 Troubleshooting

### MCPs Not Working

**Problem**: "MCP server not found"

**Solution**:
```bash
# Verify MCP config
cat .claude/mcp.json

# Check environment variables
cat .env.local | grep SUPABASE

# Restart Claude Code
CMD+Shift+P → "Reload Window"
```

---

### Subagent Not Activating

**Problem**: Claude doesn't invoke subagent

**Solution**:
- Be explicit: "Use sprint-planner subagent"
- Or describe intent clearly: "Plan next sprint"
- Subagents only work in Claude Code, not web UI

---

### GitHub MCP Connection Issues

**Problem**: "Unauthorized" errors

**Solution**:
```bash
# Verify token has correct permissions
# Token needs: repo, project, read:org

# Test manually
curl -H "Authorization: bearer $GITHUB_TOKEN" \
  https://api.github.com/user
```

---

## 🔮 Future Enhancements

### Planned Subagents
- `test-runner` - Automated test execution
- `doc-updater` - Keep docs in sync with code
- `dependency-checker` - Monitor outdated packages
- `security-scanner` - Vulnerability scanning

### Planned MCPs
- **Linear MCP** - If switching from GitHub Projects
- **Slack MCP** - Post notifications
- **Vercel MCP** - Deployment triggers

### Planned Automations
- Auto-assign issues based on expertise
- Predictive deployment risk scoring
- Automatic PR descriptions
- Sprint retrospective generation

---

## 📞 Support

**Questions?**
1. Check this guide first
2. Review `.claude/subagents/README.md`
3. Check individual subagent files in `.claude/subagents/`
4. Check skill files in `.claude/skills/`

**Issues?**
- Open issue in `act-global-infrastructure` repo
- Tag with `subagents` or `mcps`

---

## 🎉 Success Metrics

You'll know the system is working when:

✅ Sprint planning takes <1 minute
✅ Code reviews happen automatically
✅ Site issues are detected before you notice
✅ Knowledge is captured without effort
✅ You spend more time building, less time managing

---

**Last Updated**: 2025-12-30
**Version**: 1.0.0
**Maintained By**: ACT Development Team
