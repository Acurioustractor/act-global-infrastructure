# Global MCPs - Setup Complete
**Date**: 2026-01-01
**Status**: ✅ Configured and Ready
**Location**: `~/act-global-infrastructure/.mcp.json`

---

## 🎯 What Are Global MCPs?

**Model Context Protocol (MCP)** servers give Claude Code direct access to external systems without needing to parse CLI output or use workarounds.

**Global MCPs** are configured once in `act-global-infrastructure` and provide access to:
- All 7 ACT project codebases
- GitHub Projects API
- Supabase database
- Notion workspace

---

## ✅ Configured MCPs

### 1. GitHub MCP
**Package**: `@modelcontextprotocol/server-github`
**Authentication**: Uses `GITHUB_TOKEN` from `.env.local`

**Capabilities**:
- Query GitHub Projects with filters
- Search issues across all ACT repos
- Create issues with project fields
- Get deployment metadata
- Access PR diffs and comments
- No more `gh` CLI JSON parsing!

**Example Queries**:
```
"Show me all Backlog issues"
"Create issue for fixing navigation bug"
"What PRs are open in empathy-ledger-v2?"
"Show deployment history for JusticeHub"
```

---

### 2. Filesystem MCP
**Package**: `@modelcontextprotocol/server-filesystem`
**Access**: All 7 ACT project codebases + global infrastructure

**Paths**:
```
/Users/benknight/act-global-infrastructure
/Users/benknight/Code/empathy-ledger-v2
/Users/benknight/Code/JusticeHub
/Users/benknight/Code/The Harvest Website
/Users/benknight/Code/Goods Asset Register
/Users/benknight/Code/ACT Farm/act-farm
/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio
/Users/benknight/Code/ACT Placemat
```

**Capabilities**:
- Read files from any project
- Search for patterns across all codebases
- Analyze code structure
- Multi-repo operations
- No manual Read tool calls needed!

**Example Queries**:
```
"Find all uses of SUPABASE_URL across projects"
"Show me the package.json for each project"
"Search for 'OCAP' in empathy-ledger-v2"
"List all components in JusticeHub"
```

---

### 3. Postgres MCP
**Package**: `@modelcontextprotocol/server-postgres`
**Connection**: Supabase main instance (`tednluwflfhxyucgwigh`)

**Capabilities**:
- Query `sprint_snapshots` for velocity trends
- Query `deployment_metrics` for DORA data
- Access any Supabase table
- Real-time data access
- No SQL scripts needed!

**Example Queries**:
```
"Show velocity for last 3 sprints"
"What's the deployment frequency this month?"
"Query all active issues from sprint_snapshots"
"Show database schema for deployment_metrics"
```

---

### 4. Notion MCP
**Package**: `@modelcontextprotocol/server-notion`
**Authentication**: Uses `NOTION_TOKEN` from `.env.local`

**Access**:
- Sprint Tracking database
- Strategic Pillars database
- ACT Projects database
- Deployments database
- Velocity Metrics database
- Weekly Reports database

**Capabilities**:
- Query Notion databases
- Create and update pages
- Search across workspace
- Sync data from GitHub/Supabase
- No API calls needed!

**Example Queries**:
```
"Show all sprints in Notion"
"Create a new deployment entry"
"What's in the latest weekly report?"
"Update sprint progress in Notion"
```

---

## 🚀 Setup Instructions

### Step 1: Verify Configuration

```bash
cd ~/act-global-infrastructure

# Verify all MCPs and environment variables
node scripts/verify-mcps.mjs
```

**Expected Output**:
```
✅ MCP Configuration: Found
✅ 4 MCPs configured (github, filesystem, postgres, notion)
✅ All environment variables set
✅ All 8 project paths found
```

---

### Step 2: Restart Claude Code

The MCP configuration is only loaded when Claude Code starts.

**Restart Steps**:
1. Open Command Palette: `CMD+Shift+P` (or `Ctrl+Shift+P`)
2. Type: `Reload Window`
3. Press Enter

**Alternative**: Quit and reopen VS Code

---

### Step 3: Verify MCPs Loaded

**Check MCP Status**:
1. Open Command Palette: `CMD+Shift+P`
2. Type: `MCP: Show Status`
3. Should show all 4 MCPs as "Connected"

**If MCPs not showing**:
- Verify `.mcp.json` exists in `~/act-global-infrastructure`
- Check `.env.local` has required tokens
- Restart VS Code completely (not just reload window)

---

### Step 4: Test Each MCP

**Test GitHub MCP**:
```
Ask Claude: "Show me backlog issues from GitHub"
```
Should return actual issues from GitHub Projects (not use `gh` CLI).

**Test Filesystem MCP**:
```
Ask Claude: "List all files in empathy-ledger-v2/src"
```
Should directly access filesystem (not use `ls` or `find`).

**Test Postgres MCP**:
```
Ask Claude: "Query sprint_snapshots for latest metrics"
```
Should directly query Supabase (not use SQL scripts).

**Test Notion MCP**:
```
Ask Claude: "Show all items in Sprint Tracking database"
```
Should directly access Notion (not use API calls).

---

## 📊 Configuration File

**Location**: `~/act-global-infrastructure/.mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/benknight/act-global-infrastructure",
        "/Users/benknight/Code/empathy-ledger-v2",
        "/Users/benknight/Code/JusticeHub",
        "/Users/benknight/Code/The Harvest Website",
        "/Users/benknight/Code/Goods Asset Register",
        "/Users/benknight/Code/ACT Farm/act-farm",
        "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio",
        "/Users/benknight/Code/ACT Placemat"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_CONNECTION_STRING}"
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_TOKEN}"
      }
    }
  }
}
```

---

## 🔑 Required Environment Variables

**Location**: `~/act-global-infrastructure/.env.local`

```bash
# GitHub MCP
GITHUB_TOKEN=GITHUB_TOKEN_REMOVED

# Postgres MCP
SUPABASE_CONNECTION_STRING="postgresql://postgres.tednluwflfhxyucgwigh:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Notion MCP
NOTION_TOKEN=NOTION_TOKEN_REMOVED
```

**Security Notes**:
- These are already in `.env.local` ✅
- Never commit `.env.local` to git
- Backed up to Bitwarden

---

## 💡 Real-World Usage

### Before MCPs (Manual)
```
You: "Show me backlog issues"

Claude: [Runs gh CLI command]
Claude: [Parses JSON output]
Claude: [Formats results]
→ 15 seconds, prone to errors
```

### After MCPs (Direct)
```
You: "Show me backlog issues"

Claude: [Uses GitHub MCP directly]
→ 2 seconds, perfect data
```

---

## 🎯 Integration with Subagents

MCPs power the subagent system:

**sprint-planner subagent**:
- Uses GitHub MCP to query backlog
- Uses Postgres MCP to get velocity
- Recommends issues for sprint

**code-reviewer subagent**:
- Uses Filesystem MCP to read changed files
- Analyzes security and performance
- No manual file reading

**deploy-monitor subagent**:
- Uses GitHub MCP for deployment data
- Uses Postgres MCP for metrics
- Automated health checks

**knowledge-bot subagent**:
- Uses GitHub MCP for issue comments
- Uses Notion MCP to create pages
- Captures institutional memory

---

## 🔧 Troubleshooting

### Problem: MCPs Not Loading

**Solution**:
```bash
# 1. Verify config exists
ls -la ~/act-global-infrastructure/.mcp.json

# 2. Verify environment variables
cd ~/act-global-infrastructure
node scripts/verify-mcps.mjs

# 3. Restart Claude Code completely
# Quit VS Code, then reopen
```

---

### Problem: "MCP Server Not Found"

**Solution**:
```bash
# Ensure you're in act-global-infrastructure when using Claude Code
cd ~/act-global-infrastructure

# MCPs are only available when working in this directory
# or directories that reference this .mcp.json
```

---

### Problem: GitHub MCP "Unauthorized"

**Solution**:
```bash
# Verify token has correct permissions
# Required: repo, project, read:org

# Test token manually
curl -H "Authorization: bearer $GITHUB_TOKEN" \
  https://api.github.com/user
```

---

### Problem: Postgres MCP Connection Failed

**Solution**:
```bash
# Verify connection string format
echo $SUPABASE_CONNECTION_STRING

# Should be:
# postgresql://postgres.REF:PASSWORD@HOST:6543/postgres

# Test connection manually
psql "$SUPABASE_CONNECTION_STRING" -c "SELECT 1;"
```

---

## 📋 MCP vs Manual Commands

| Task | Without MCP | With MCP | Improvement |
|------|-------------|----------|-------------|
| Query GitHub issues | `gh issue list` + parse JSON | Direct API call | 5x faster |
| Read file | `cat` or Read tool | Direct access | Seamless |
| Database query | SQL script + parse | Direct query | No scripts needed |
| Notion access | API call + format | Direct access | No boilerplate |

---

## 🎉 Success Metrics

You'll know MCPs are working when:

✅ Claude can access GitHub without `gh` CLI
✅ File operations happen seamlessly across all projects
✅ Database queries return instant results
✅ Notion updates happen without API code
✅ Subagents work faster and more reliably

---

## 🔮 Future Enhancements

### Planned MCPs
- **Slack MCP** - Post notifications to team channels
- **Vercel MCP** - Trigger deployments directly
- **Linear MCP** - If switching from GitHub Projects
- **Resend MCP** - Send transactional emails

### MCP Improvements
- Add Empathy Ledger v2 Supabase instance
- Separate dev/prod Postgres connections
- Add read-only vs write access controls

---

## 📚 Resources

**Official Documentation**:
- Model Context Protocol: https://modelcontextprotocol.io
- GitHub MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/github
- Filesystem MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
- Postgres MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/postgres
- Notion MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/notion

**ACT Documentation**:
- Skills & Subagents Guide: `docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md`
- Ecosystem Overview: `ACT_ECOSYSTEM_COMPLETE_OVERVIEW.md`

---

**Last Updated**: 2026-01-01
**Version**: 1.0.0
**Maintained By**: ACT Development Team
**Status**: ✅ Production Ready
