# ACT Ecosystem - Complete Overview
**Date**: 2026-01-01
**Status**: Production
**Maintained By**: Ben Knight + ACT Development Team

---

## 🌍 The ACT Ecosystem

**Purpose**: Regenerative innovation ecosystem dismantling extractive systems through ethical technology, Indigenous data sovereignty, and community-centered design.

**Philosophy**: LCAA Method (Listen, Curiosity, Action, Art)

---

## 📦 7 Active Projects

### 1. ACT Farm (Regenerative Innovation Studio)
**Path**: `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/`
**GitHub**: `Acurioustractor/act-regenerative-studio`
**Role**: Multi-project orchestrator, operations hub, dashboard
**Stack**: Next.js 15, Supabase, Tailwind
**Environment**: 28 variables backed up to Bitwarden ✅

**Features**:
- Cross-project dashboard
- Unified user management
- Shared component library
- Central operations hub

---

### 2. Empathy Ledger
**Path**: `/Users/benknight/Code/empathy-ledger-v2`
**GitHub**: `Acurioustractor/empathy-ledger-v2`
**Role**: Ethical storytelling platform with OCAP compliance
**Stack**: Next.js 14, Supabase, Tailwind
**Environment**: 29 variables backed up to Bitwarden ✅

**Features**:
- Indigenous data sovereignty (OCAP principles)
- Elder review workflows
- Cultural safety checking
- Consent tracking and audit trails
- Story syndication API

**MCPs**:
- Supabase MCP (read-only + write modes)
- Playwright MCP (testing)

**Special Considerations**:
- Cultural sensitivity in AI outputs
- Community-controlled data
- Consent-based sharing

---

### 3. JusticeHub
**Path**: `/Users/benknight/Code/JusticeHub/`
**GitHub**: `Acurioustractor/justicehub-platform`
**Role**: Youth justice and community services platform
**Stack**: Next.js 14, Supabase, Tailwind
**Environment**: 29 variables backed up to Bitwarden ✅

**Features**:
- ALMA Intelligence (youth justice insights)
- Youth Justice Service Finder (YJSF)
- Quantum Justice Toolkit (QJT)
- Empathy Ledger integration
- Case law vector search (ChromaDB)
- Web scraping (Firecrawl)

**MCPs**:
- Task Master AI MCP
- HTML-to-Design MCP
- Figma MCP

**Integrations**:
- ChromaDB (vector search): `http://nas.local:8000`
- Redis (caching): `redis://nas.local:6379`
- Empathy Ledger API

---

### 4. The Harvest Website
**Path**: `/Users/benknight/Code/The Harvest Website/`
**GitHub**: `Acurioustractor/harvest-community-hub`
**Role**: Community hub and CSA programs
**Stack**: Next.js, Supabase, Tailwind
**Environment**: 28 variables backed up to Bitwarden ✅

**Features**:
- Community-supported agriculture (CSA)
- Local food systems
- Farm-to-table connections
- GoHighLevel CRM integration

**Integrations**:
- GoHighLevel CRM
- Vercel deployment
- Google OAuth (Calendar & Gmail)

---

### 5. Goods Asset Register
**Path**: `/Users/benknight/Code/Goods Asset Register/`
**GitHub**: `Acurioustractor/goods-asset-tracker`
**Role**: Circular economy asset management
**Stack**: Next.js, Supabase, Tailwind
**Environment**: Not yet backed up to Bitwarden ⚠️

**Features**:
- Asset lifecycle tracking
- Circular economy metrics
- Resource sharing
- Impact measurement

---

### 6. ACT Farm (BCV Estate)
**Path**: `/Users/benknight/Code/act-farm/`
**GitHub**: `Acurioustractor/act-farm`
**Role**: Black Cockatoo Valley regeneration estate
**Stack**: Next.js, Supabase, Tailwind
**Environment**: 28 variables backed up to Bitwarden ✅

**Features**:
- Estate management
- Regenerative agriculture
- Biodiversity tracking
- Community engagement

---

### 7. ACT Placemat
**Path**: `/Users/benknight/Code/ACT Placemat`
**GitHub**: `Acurioustractor/act-placemat`
**Role**: Backend services / shared infrastructure
**Stack**: (To be documented)
**Environment**: Not yet backed up to Bitwarden ⚠️

**Features**:
- Shared backend services
- API orchestration
- Data pipelines

---

## 🤖 Claude Skills (Installed)

**Location**: `~/.claude/skills/`

### 1. env-manager
**Path**: `~/.claude/skills/env-manager/`
**Purpose**: Bitwarden integration for .env management
**Status**: ✅ Active

**Features**:
- Backup .env.local to Bitwarden encrypted vault
- Sync .env.local from Bitwarden
- Automatic project detection
- World-class .env template generation

**Scripts**:
- `backup-to-bitwarden-v2.mjs` - Fixed encoding version
- `sync-from-bitwarden.mjs` - Pull from vault

**Usage**:
```bash
# Backup project .env to Bitwarden
cd /path/to/project
node ~/.claude/skills/env-manager/scripts/backup-to-bitwarden-v2.mjs .

# Sync from Bitwarden (future)
node ~/.claude/skills/env-manager/scripts/sync-from-bitwarden.mjs .
```

---

## 🎯 Claude Skills (Available via Symlinks)

**Location**: `~/act-global-infrastructure/.claude/skills/`

These skills are **symlinked** to all 7 project repos via:
```
/path/to/project/scripts-global -> ~/act-global-infrastructure/scripts
```

### 1. act-sprint-workflow
**Purpose**: Sprint planning, standups, health checks, issue automation
**Status**: ✅ Configured

**Capabilities**:
- Calculate velocity from historical data
- Analyze backlog by priority
- Generate daily standup reports
- Create issues with auto-detected fields

**Triggers**:
- "Plan next sprint"
- "How should I plan a sprint?"
- Monday mornings (automated via GitHub Actions)

---

### 2. act-brand-alignment
**Purpose**: Ensure all content matches ACT brand voice and identity
**Status**: ✅ Configured

**Capabilities**:
- LCAA methodology (Listen, Curiosity, Action, Art)
- Regenerative innovation language
- Farm metaphor system
- Cross-project consistency

**Triggers**:
- Automatically loaded when working on content/copy
- "Review this for brand alignment"

---

### 3. ghl-crm-advisor
**Purpose**: GoHighLevel CRM strategy for all ACT projects
**Status**: ✅ Configured

**Capabilities**:
- Pipeline design (stages, automation, revenue)
- Email/SMS workflow scripting
- Tag taxonomy and organization
- Integration architecture (Stripe, Supabase, Resend)

**Projects Using GHL**:
- The Harvest Website
- (Future: Empathy Ledger, JusticeHub)

**Triggers**:
- "How should I design the CRM pipeline?"
- "What GHL workflows do we need?"

---

## 🔌 MCP Servers (Model Context Protocol)

### Active MCPs by Project

#### Empathy Ledger v2
**Config**: `/Users/benknight/Code/empathy-ledger-v2/.mcp.json`

1. **Supabase MCP (Read-Only)**
   - URL: `https://mcp.supabase.com/mcp`
   - Project: `yvnuayzslukamizrlhwb`
   - Features: database, docs, debugging, development
   - Safety: `read_only=true`

2. **Supabase MCP (Write)**
   - URL: `https://mcp.supabase.com/mcp`
   - Project: `yvnuayzslukamizrlhwb`
   - Features: database, docs, debugging, development, functions, branching
   - Safety: Requires explicit enable

3. **Playwright MCP**
   - Command: `npx @anthropic-ai/mcp-server-playwright`
   - Purpose: E2E testing automation

---

#### JusticeHub
**Config**: `/Users/benknight/Code/JusticeHub/.mcp.json`

1. **Task Master AI MCP**
   - Command: `npx -y --package=task-master-ai task-master-ai`
   - Environment: ANTHROPIC_API_KEY, PERPLEXITY_API_KEY
   - Purpose: Advanced task automation

2. **HTML-to-Design MCP**
   - Command: `npx -y @htmltodesign/mcp-server`
   - Purpose: Convert HTML to design systems

3. **Figma MCP**
   - URL: `https://mcp.figma.com/mcp`
   - Type: HTTP
   - Purpose: Figma integration for design

---

#### ACT Placemat
**Config**: `/Users/benknight/Code/ACT Placemat/.mcp.json`

(To be documented)

---

### Global MCPs ✅
**Location**: `~/act-global-infrastructure/.mcp.json`
**Status**: ✅ Configured and Production Ready
**Documentation**: `docs/GLOBAL_MCPS_SETUP.md`

1. **GitHub MCP** ✅
   - Direct GitHub API access (no more gh CLI parsing)
   - Query GitHub Projects with filters
   - Create issues with project fields
   - Access PRs, deployments, and commits

2. **Filesystem MCP** ✅
   - File operations across all 7 ACT codebases
   - Multi-repo search
   - Direct file access (no ls/cat needed)

3. **Postgres MCP** ✅
   - Direct Supabase database access
   - Sprint metrics queries
   - Deployment metrics
   - Real-time data access

4. **Notion MCP** ✅
   - Direct Notion API access
   - Access to all 6 ACT databases
   - Database operations
   - Page creation and updates

---

## 🗄️ Shared Infrastructure

### GitHub Organization
- **Name**: Acurioustractor
- **Project Board**: ACT Ecosystem Development
- **Project ID**: `PVT_kwHOCOopjs4BLVik`

### Notion Workspace
- **Parent Page**: [ACT Development Databases](https://www.notion.so/acurioustractor/ACT-Development-Databases-2d6ebcf981cf806e8db2dc8ec5d0b414)

**6 Databases**:
1. Sprint Tracking - https://www.notion.so/2d6ebcf981cf815fa30fc7ade0c0046d
2. Strategic Pillars - https://www.notion.so/2d6ebcf981cf81fea62fe7dc9a42e5c1
3. ACT Projects - https://www.notion.so/2d6ebcf981cf814195a0f8688dbb7c02
4. Deployments - https://www.notion.so/2d6ebcf981cf81d1a72ec9180830a54e
5. Velocity Metrics - https://www.notion.so/2d6ebcf981cf8123939ffab96227b3da
6. Weekly Reports - https://www.notion.so/2d6ebcf981cf81fe9eade932693cd5dc

### Bitwarden Vault
- **Team Vault**: ACT Ecosystem

**Backed Up Projects**:
- ✅ empathy-ledger-v2 (29 vars)
- ✅ JusticeHub (29 vars)
- ✅ The Harvest Website (28 vars)
- ✅ act-farm (28 vars)

**Pending Backups**:
- ⚠️ Goods Asset Register
- ⚠️ ACT Placemat
- ⚠️ ACT Farm and Regenerative Innovation Studio

### Shared Supabase Instance
- **Project**: `tednluwflfhxyucgwigh`
- **Host**: `aws-0-ap-southeast-2.pooler.supabase.com`
- **URL**: `https://tednluwflfhxyucgwigh.supabase.co`

**Shared Across**:
- JusticeHub (main database)
- The Harvest Website
- act-farm
- ACT Farm and Regenerative Innovation Studio

**Alternate Instance** (Empathy Ledger):
- **Project**: `yvnuayzslukamizrlhwb`
- **Host**: `aws-0-ap-southeast-2.pooler.supabase.com`
- **URL**: `https://yvnuayzslukamizrlhwb.supabase.co`

---

## 🔑 Environment Variable Strategy

### World-Class Template
**Location**: `/Users/benknight/Code/empathy-ledger-v2/.env.example`

**Sections**:
1. Supabase Database (required)
2. Application Settings
3. AI Services (Ollama, OpenAI, Anthropic, Tavily)
4. Cultural Safety & OCAP Compliance
5. File Upload Configuration
6. Inngest (Background Jobs)
7. Integrations (Google, GitHub, Notion)
8. Monitoring & Analytics
9. Email Configuration
10. Security Keys
11. External Integrations (ACT Ecosystem)
12. Feature Flags

### Key Rotation Schedule
- ✅ **Monthly**: All API keys (OpenAI, Anthropic, GitHub)
- ✅ **Quarterly**: Database passwords
- ✅ **Immediately**: If exposed or compromised

### Security Best Practices
- All secrets in `.env.local` (never committed)
- `.env.local` in `.gitignore`
- Backed up to Bitwarden team vault
- Different keys for dev/staging/prod
- Strong database passwords (32+ chars)

---

## 🤖 GitHub Actions Automation

**Location**: `~/act-global-infrastructure/.github/workflows/`

### 1. Daily Sprint Sync
**File**: `sync-sprint-metrics.yml`
**Schedule**: Daily at 5 PM UTC
**Purpose**: GitHub Projects → Notion sync

**What it does**:
- Queries GitHub Project for sprint metrics
- Calculates velocity and progress
- Updates Notion Sprint Tracking database
- Logs deployment age warnings

---

### 2. Weekly Report
**File**: `weekly-report.yml`
**Schedule**: Friday at 5 PM UTC
**Purpose**: Generate weekly summary

**What it does**:
- Aggregates week's sprint progress
- Summarizes deployments
- Calculates velocity trends
- Creates Notion Weekly Report page

---

### 3. Deployment Logging (Template)
**File**: `TEMPLATE_log-deployment.yml`
**Trigger**: Manual (per-repo workflow)
**Purpose**: Log deployments to Notion

**What it does**:
- Captures deployment metadata
- Updates Notion Deployments database
- Tracks DORA metrics

---

## 📊 Automation Scripts

**Location**: `~/act-global-infrastructure/scripts/`

### Core Automation
1. **sync-sprint-to-notion.mjs**
   - GitHub Projects → Notion Sprint Tracking
   - Daily automated sync

2. **log-deployment.mjs**
   - Vercel/deployment → Notion Deployments
   - Called from each project's CI/CD

3. **generate-weekly-report.mjs**
   - Aggregates metrics → Notion Weekly Reports
   - Friday automated generation

### Setup & Management
4. **recreate-all-databases.mjs**
   - Creates all 6 Notion databases from scratch

5. **add-test-data.mjs**
   - Populates Notion databases with test data

6. **snapshot-sprint-metrics.mjs**
   - Original Supabase snapshot (deprecated)

### Utilities
7. **setup-mcp-env.sh**
   - Generates Supabase connection strings for MCPs

8. **smart-work-queue.mjs**
   - Intelligent task prioritization

---

## 🎯 Common Workflows

### Morning Standup
```
You: "Plan next sprint"

Claude: [Activates sprint-planner subagent]
  ↓ Uses GitHub MCP (query backlog)
  ↓ Uses Postgres MCP (get velocity)
  ↓ Analyzes and recommends

Claude: "Here are 11 recommended issues for Sprint 5. Assign?"

You: "Yes"

Claude: "Done! 11 issues assigned to Sprint 5"
```

### Code Review
```
You: [Completes feature]

Claude: [Auto-activates code-reviewer subagent]
  ↓ Reads changed files
  ↓ Checks security patterns
  ↓ Analyzes performance

Claude: "⚠️ Critical: SQL injection found at line 45. Fix before merge."
```

### Deployment Health Check
```
[5 PM UTC daily - GitHub Action triggers]

Claude: [Auto-activates deploy-monitor subagent]
  ↓ Checks all 7 sites via HTTP
  ↓ Tests database connectivity
  ↓ Measures response times

Claude: "⚠️ ACT Farm: 72h old deployment + slow response (6.2s)"
```

---

## 📁 VS Code Workspace

**Location**: `~/act-global-infrastructure/config/workspace.code-workspace`

**Multi-Root Workspace** includes:
1. act-global-infrastructure
2. empathy-ledger-v2
3. JusticeHub
4. The Harvest Website
5. Goods Asset Register
6. act-farm
7. ACT Farm and Regenerative Innovation Studio
8. ACT Placemat

**Benefits**:
- Single window for all projects
- Shared settings and snippets
- Cross-project search
- Unified git operations

---

## 🚀 Time Savings & Quality Improvements

### Time Savings (Per Day)
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

## 📋 Pending Tasks

### High Priority
1. ⚠️ **Backup remaining projects to Bitwarden**
   - Goods Asset Register
   - ACT Placemat
   - ACT Farm and Regenerative Innovation Studio

2. ⚠️ **Rotate weak database password**
   - empathy-ledger-v2: `Drillsquare99` → 32+ char password
   - See: `SECRETS_FIX_PLAN.md`

3. ⚠️ **Fix production/dev key separation**
   - Inngest keys: `signkey-prod-*` in development
   - Create separate dev keys

### Medium Priority
4. 📝 **Document ACT Placemat stack**
   - Technology stack
   - Features and purpose
   - Environment variables

5. 📝 **Apply world-class .env template to all projects**
   - Use `merge-env-template.mjs` script
   - Update all `.env.example` files

6. 🔧 **Create global MCP configuration**
   - GitHub MCP
   - Filesystem MCP
   - Postgres MCP
   - Notion MCP

### Low Priority
7. 📖 **Monthly secret rotation process**
   - Set calendar reminders
   - Automate rotation scripts

---

## 📚 Key Documentation

### Global Infrastructure
- `README.md` - Quick start guide
- `docs/AUTOMATION_COMPLETE.md` - Automation setup
- `docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md` - Architecture guide ⭐
- `docs/NOTION_SETUP_COMPLETE.md` - Notion database setup
- `config/CODEBASES.md` - Authoritative project list

### Empathy Ledger v2
- `SECRETS_FIX_PLAN.md` - Security improvements
- `SECRETS_AUDIT_EMPATHY_LEDGER.md` - Complete audit
- `MONTHLY_SECRET_ROTATION_PROCESS.md` - Rotation guide
- `.env.example` - World-class template ⭐

### Deployment
- `deployment/docs/SECRETS_AUDIT_EMPATHY_LEDGER.md`
- `deployment/docs/MONTHLY_SECRET_ROTATION_PROCESS.md`

---

## 🎉 Success Metrics

You'll know the system is working when:

✅ Sprint planning takes <1 minute
✅ Code reviews happen automatically
✅ Site issues are detected before you notice
✅ Knowledge is captured without effort
✅ You spend more time building, less time managing
✅ All secrets are backed up to Bitwarden
✅ Environment variables follow world-class template
✅ Cross-project consistency maintained

---

## 📞 Getting Help

**Questions?**
1. Check this overview first
2. Review `docs/SKILLS_SUBAGENTS_MCPS_GUIDE.md`
3. Check project-specific documentation
4. Check individual skill files in `.claude/skills/`

**Issues?**
- Open issue in `act-global-infrastructure` repo
- Tag with appropriate label (skills, mcps, automation)

---

**Last Updated**: 2026-01-01
**Version**: 2.0.0
**Maintained By**: ACT Development Team
**Next Review**: 2026-02-01 (monthly)
