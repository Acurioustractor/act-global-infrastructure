# ACT Sprint Workflow Skill

**Purpose**: Streamline daily development workflows with sprint planning, standups, health monitoring, and issue automation for the ACT ecosystem.

**Invoke**: `/sprint-workflow <command>` or mention sprint/planning tasks in conversation

---

## When to Use This Skill

Use this skill when the user:
- Wants to plan the next sprint or review backlog
- Asks for a daily standup report or "what should I work on today?"
- Needs to check system health across all ACT projects
- Wants to create new issues with automatic field population
- Mentions sprint velocity, burndown, or capacity planning

---

## Core Capabilities

### 1. Sprint Planning (`plan`)
Analyzes backlog and recommends issues for upcoming sprint based on team velocity.

### 2. Daily Standup (`today` or `standup`)  
Generates personalized daily report showing yesterday's work, today's tasks, and sprint progress.

### 3. Health Monitoring (`health`)
Checks all 6 ACT projects for deployment status, HTTP health, database connectivity, and registry sync.

### 4. Issue Automation (`create`)
Creates GitHub issues with intelligent auto-detection of Type, Priority, Effort, ACT Project, and Sprint.

---

## Commands

### `/sprint-workflow plan`

**What it does**:
1. Fetches velocity data from last 3 completed sprints
2. Calculates average velocity (issues per sprint)
3. Fetches all Backlog issues sorted by Priority
4. Recommends top N issues that fit team capacity
5. Shows breakdown by Type, ACT Project, Repository
6. Offers to assign selected issues to current sprint

**Data Sources**:
- GitHub Projects GraphQL API (Backlog filter)
- Supabase sprint_velocity view (historical data)
- Dashboard API `/api/dashboard/sprint`

**Expected Output**:
```
📊 Sprint Planning for Sprint 5

Historical Velocity:
  Sprint 2: 12 issues
  Sprint 3: 10 issues  
  Sprint 4: 11 issues
  → Average: 11 issues/sprint

📋 Backlog Analysis:
  Total: 47 issues
  Critical: 2
  High: 12
  Medium: 23
  Low: 10

🎯 Recommended for Sprint 5 (11 issues):
  [Critical]
  #45 - Security: Add webhook signature verification (empathy-ledger-v2)
  #52 - Bug: Fix milestone sync script error (act-regenerative-studio)

  [High Priority]  
  #33 - Enhancement: Add velocity chart component (act-regenerative-studio)
  #38 - Enhancement: Create burndown API endpoint (act-regenerative-studio)
  ...

Breakdown:
  By Type: Enhancement: 7, Bug: 2, Task: 2
  By Project: Empathy Ledger: 3, ACT Studio: 5, Goods: 2, JusticeHub: 1
  By Repository: empathy-ledger-v2: 3, act-regenerative-studio: 5, goods-asset-tracker: 2, justicehub-platform: 1

Assign these 11 issues to Sprint 5? (y/n)
```

**Implementation**:
```typescript
// 1. Fetch velocity
const velocity = await fetch('/api/dashboard/velocity').then(r => r.json());
const avgVelocity = velocity.averageVelocity;

// 2. Fetch backlog issues from GitHub Projects
const query = `query { ... filter Sprint = "Backlog", sort Priority desc }`;
const backlogIssues = await fetchGitHubProjects(query);

// 3. Recommend top N by priority
const recommended = backlogIssues.slice(0, avgVelocity);

// 4. Show breakdown and prompt
console.log breakdown, offer to assign
```

---

### `/sprint-workflow today` or `/sprint-workflow standup`

**What it does**:
1. Fetches commits from last 24 hours (since yesterday)  
2. Extracts closed issues from commit messages ("Fixes #45")
3. Fetches issues assigned to you with Status = "In Progress" or "Todo"
4. Shows recent deployments (last 24h)
5. Calculates sprint progress percentage
6. Highlights any blockers

**Data Sources**:
- Git log (local commits in last 24h)
- GitHub REST API (assigned issues, current status)
- Dashboard API `/api/dashboard/sprint` (progress %)
- Dashboard API `/api/dashboard/deployments` (recent deploys)

**Expected Output**:
```
☀️ Daily Standup - December 27, 2025

🎯 Sprint 4 Progress: 67% (10/15 issues done)

✅ Yesterday (Dec 26):
  - Fixed #33: Add velocity chart component → Merged & Deployed
  - Fixed #38: Create burndown API endpoint → In Review
  - Committed 4 times across act-regenerative-studio
  - Deployed to production at 4:23 PM (empathy-ledger-v2)

📝 Today's Focus (3 issues assigned):
  #42 [In Progress] - Health matrix component (act-regenerative-studio)
  #45 [Todo] - Webhook signature verification (empathy-ledger-v2) 🔴 Critical
  #50 [Todo] - Update dashboard layout (act-regenerative-studio)

📦 Recent Deployments (24h):
  ✅ act-regenerative-studio - 2 hours ago
  ✅ empathy-ledger-v2 - 18 hours ago
  ⚠️  act-farm - 3 days ago (stale)

⚠️  Blockers: None

🚀 Ready to start on #42 or #45?
```

**Implementation**:
```typescript
// 1. Git commits yesterday
const yesterday = new Date(Date.now() - 24*60*60*1000);
execSync(`git log --since="${yesterday.toISOString()}" --oneline`);

// 2. Assigned issues
const query = `query { assignedIssues(status: ["In Progress", "Todo"]) }`;

// 3. Sprint progress
const sprint = await fetch('/api/dashboard/sprint').then(r => r.json());

// 4. Recent deployments  
const deployments = await fetch('/api/dashboard/deployments').then(r => r.json());
const last24h = deployments.filter(d => new Date(d.createdAt) > yesterday);
```

---

### `/sprint-workflow health`

**What it does**:
1. Fetches comprehensive health matrix for all 6 projects
2. Shows 4 indicators per project: Deployment, HTTP, Database, Registry
3. Highlights warnings (stale deployments, HTTP errors, down services)
4. Offers to trigger deployments for stale projects
5. Links to dashboard for detailed view

**Data Sources**:
- Dashboard API `/api/dashboard/health-matrix`
- Dashboard API `/api/dashboard/projects` (HTTP status)
- Dashboard API `/api/dashboard/deployments` (deployment age)

**Expected Output**:
```
🏥 System Health Check - All ACT Projects

┌─────────────────────┬────────────┬──────┬──────────┬──────────┐
│ Project             │ Deployment │ HTTP │ Database │ Registry │
├─────────────────────┼────────────┼──────┼──────────┼──────────┤
│ Empathy Ledger      │ ⚠️  18h    │ ✅   │ ✅       │ ⚠️       │
│ JusticeHub          │ ✅ 2h      │ ✅   │ ✅       │ N/A      │
│ The Harvest         │ ✅ 4h      │ ✅   │ ✅       │ N/A      │
│ ACT Farm            │ ❌ 72h     │ ⚠️   │ ✅       │ N/A      │
│ Goods               │ ✅ 6h      │ ✅   │ ✅       │ N/A      │
│ ACT Studio          │ ✅ 1h      │ ✅   │ ✅       │ N/A      │
└─────────────────────┴────────────┴──────┴──────────┴──────────┘

⚠️  Warnings:
  • Empathy Ledger: Last deployed 18 hours ago
  • ACT Farm: Last deployed 3 days ago (STALE)
  • ACT Farm: HTTP status degraded (503)

🏆 Overall: 5/6 systems healthy (83%)

Actions:
  - Trigger deployment for ACT Farm? (y/n)
  - View detailed health in dashboard: http://localhost:3001/admin/dashboard

📊 Dashboard: http://localhost:3001/admin/dashboard#health
```

**Implementation**:
```typescript
// 1. Fetch health matrix
const health = await fetch('/api/dashboard/health-matrix').then(r => r.json());

// 2. Build table
const table = health.matrix.map(project => ({
  name: project.project,
  deployment: formatDeploymentAge(project.indicators.deployment.age),
  http: formatStatus(project.indicators.http.status),
  database: formatStatus(project.indicators.database.status),
  registry: project.indicators.registry ? formatStatus(project.indicators.registry.status) : 'N/A'
}));

// 3. Find warnings
const warnings = health.matrix.filter(p => 
  p.indicators.deployment.age > 24 || 
  p.indicators.http.status !== 'healthy'
);

// 4. Offer actions
if (warnings.length > 0) {
  // Prompt to trigger deployments
}
```

---

### `/sprint-workflow create <title>`

**What it does**:
1. Analyzes issue title to detect Type (Enhancement, Bug, Task, etc.)
2. Prompts for additional context if needed
3. Auto-assigns ACT Project based on keywords or current directory
4. Auto-detects Priority from keywords (Critical, High, Medium, Low)
5. Auto-estimates Effort (S/M/L/XL) based on title complexity
6. Assigns to current sprint or Backlog
7. Creates issue in GitHub with all fields populated
8. Syncs to Notion automatically (via existing webhook)

**Data Sources**:
- GitHub REST API (create issue)
- Local git context (current repo)
- Pattern matching on title/description

**Expected Output**:
```
User: /sprint-workflow create Add email notifications for form submissions

🎯 Creating Issue...

Detected:
  Title: "Add email notifications for form submissions"
  Type: Enhancement (detected from "Add")
  ACT Project: The Harvest (detected from current directory)
  Repository: harvest-community-hub
  Priority: Medium (default)
  Effort: M (medium complexity)
  Sprint: Sprint 4 (current)

Additional context needed:
  Description (optional): [User enters: "Send confirmation emails when users submit contact forms"]

✅ Issue Created: #67
   URL: https://github.com/Acurioustractor/harvest-community-hub/issues/67
   
Automatically assigned:
  • Type: Enhancement
  • ACT Project: The Harvest  
  • Priority: Medium
  • Effort: M
  • Sprint: Sprint 4
  • Status: Todo

🔄 Syncing to Notion... Done!

Add to your current work? (will change Status to "In Progress") (y/n)
```

**Type Detection Rules**:
- "Add", "Create", "Build", "Implement" → Enhancement
- "Fix", "Resolve", "Correct" → Bug
- "Update", "Refactor", "Improve" → Enhancement
- "Document", "Write", "Add docs" → Task
- "Research", "Investigate" → Task

**Priority Detection**:
- "Critical", "Urgent", "Security", "Broken" → Critical
- "Important", "Should", "High priority" → High
- "Nice to have", "Eventually", "Low priority" → Low
- Default: Medium

**Effort Estimation**:
- Single word titles → S
- Titles with "simple", "quick", "small" → S
- Most titles → M
- Titles with "complex", "major", "refactor", "rewrite" → L
- Titles with "complete overhaul", "full migration" → XL

**Implementation**:
```typescript
// 1. Detect type from title
const typeKeywords = {
  Enhancement: ['add', 'create', 'build', 'implement'],
  Bug: ['fix', 'resolve', 'correct', 'broken'],
  Task: ['document', 'research', 'investigate']
};

// 2. Detect priority
const priorityKeywords = {
  Critical: ['critical', 'urgent', 'security', 'broken'],
  High: ['important', 'should', 'high'],
  Low: ['nice to have', 'eventually', 'low']
};

// 3. Create issue with gh CLI
execSync(`gh issue create \
  --repo ${repo} \
  --title "${title}" \
  --body "${description}" \
  --label "Type: ${type},Priority: ${priority}"`);

// 4. Assign to GitHub Project via API
graphql(`mutation { addProjectV2ItemById { ... } }`);

// 5. Set field values (Sprint, Priority, etc)
graphql(`mutation { updateProjectV2ItemFieldValue { ... } }`);
```

---

## Data Sources Reference

### GitHub Projects GraphQL API
- **Endpoint**: `https://api.github.com/graphql`
- **Auth**: `GITHUB_TOKEN` env var
- **Project ID**: `PVT_kwHOCOopjs4BLVik` (ACT Ecosystem Development)
- **Fields**: Status, Sprint, Priority, Type, Effort, ACT Project, Milestone, Due Date

### Dashboard APIs
- `/api/dashboard/sprint` - Current sprint progress
- `/api/dashboard/velocity` - Historical velocity data
- `/api/dashboard/burndown` - Burndown chart data
- `/api/dashboard/health-matrix` - Comprehensive health check
- `/api/dashboard/deployments` - Recent deployments
- `/api/dashboard/projects` - Project health status

### Supabase Database
- `sprint_snapshots` - Daily sprint progress snapshots
- `sprint_velocity` view - Calculated velocity per sprint
- `latest_sprint_snapshots` view - Most recent snapshot per sprint

### Git (Local)
- `git log --since` - Recent commits
- `git status` - Current branch, uncommitted changes
- `git remote -v` - Current repository

---

## Context Files

This skill has access to reference files in `.claude/skills/act-sprint-workflow/references/`:

1. **sprint-planning.md** - Velocity calculations, capacity planning formulas
2. **github-api-queries.md** - GraphQL query templates
3. **health-monitoring.md** - Health check patterns, status codes
4. **issue-automation.md** - Field mappings, auto-detection rules

---

## Usage Tips

**For Sprint Planning**:
```bash
/sprint-workflow plan
# Shows recommended issues for next sprint based on velocity
```

**For Daily Workflow**:
```bash
/sprint-workflow today
# Quick standup report with yesterday's work and today's focus
```

**For Health Checks**:
```bash
/sprint-workflow health
# Check all 6 projects for issues
```

**For Issue Creation**:
```bash
/sprint-workflow create Add user authentication to dashboard
# Creates issue with auto-detected fields
```

**Conversational Usage** (no command needed):
```
"What should I work on today?"
→ Triggers standup report

"How's our sprint velocity looking?"
→ Triggers sprint planning context

"Are all the sites healthy?"
→ Triggers health monitoring

"Create an issue for fixing the login bug"
→ Triggers issue automation
```

---

## Examples

### Example 1: Monday Sprint Planning

```
User: /sprint-workflow plan