# 🚀 Backend Codebase - Navigation Guide

## 📊 Overview
- **Location:** `/Users/benknight/Code/act-global-infrastructure/`
- **Tech Stack:** Node.js + ES Modules + Supabase + Notion + Xero + Gmail
- **Architecture:** Scripts-based with API server
- **Main Server:** `packages/act-dashboard/api-server.mjs` (177KB!)

---

## 📁 Directory Structure

### **Root Directories**
```
act-global-infrastructure/
├── packages/
│   ├── act-dashboard/        # ⭐ Main API server
│   ├── act-ui/              # UI components
│   └── act-voice/           # Voice features
├── scripts/                  # 150+ automation scripts
├── supabase/                 # Database migrations
├── tools/                    # External tools
├── config/                   # Configuration files
├── docs/                     # Documentation
└── api/                      # API endpoints
```

---

## 🎯 Main Entry Points

### **1. API Server** ⭐
**Location:** `packages/act-dashboard/api-server.mjs`  
**Size:** 177KB (very large!)  
**Purpose:** Main Express.js server for frontend

**Key Features:**
- RESTful API endpoints
- WebSocket connections
- Authentication
- Database queries (Supabase)
- External integrations (Notion, Xero, Gmail)

### **2. Serve Script**
**Location:** `packages/act-dashboard/serve.mjs`  
**Purpose:** Development server launcher

### **3. Script Collection**
**Location:** `scripts/`  
**Count:** 150+ automation scripts  
**Purpose:** Background jobs, data sync, agent operations

---

## 🔌 API Server Architecture

### **Main Server File**
```
packages/act-dashboard/api-server.mjs
├── Express.js setup
├── Middleware (CORS, JSON, auth)
├── Route definitions
├── WebSocket handlers
├── Database connections
└── External API integrations
```

### **API Endpoints** (from api-server.mjs)
```
/api/
├── /dashboard/
│   ├── real-community-overview
│   ├── real-contacts
│   └── real-recent-activity
├── /projects/
│   ├── real/projects
│   ├── project-intelligence
│   └── project-communications
├── /business-dashboard/
│   ├── finance
│   ├── opportunities
│   └── direction/scorecard
├── /integrations/
│   ├── gmail-sync
│   ├── notion-sync
│   ├── xero-sync
│   └── slack-notify
├── /goals/
│   ├── get-goals
│   ├── update-goal
│   └── move-goal
├── /subscriptions/
│   ├── scan
│   ├── consolidate
│   └── track
└── /health/
    ├── status
    └── metrics
```

---

## 📜 Scripts Directory (150+ scripts)

### **Core Business Logic**
```
scripts/
├── goals-service.mjs                    # Goals management
├── project-intelligence-agent.mjs      # Project AI agent
├── contact-discovery.mjs                # Contact discovery
├── sync-gmail-to-supabase.mjs         # Gmail sync
├── sync-notion-to-supabase.mjs        # Notion sync
├── sync-xero-to-supabase.mjs          # Xero sync
├── sync-calendar-full.mjs             # Calendar sync
├── generate-morning-brief.mjs         # Daily brief
├── generate-weekly-report.mjs         # Weekly report
├── health-check-service.mjs            # Health monitoring
├── grants-pipeline.mjs                 # Grants management
└── receipt-reconciliation-agent.mjs   # Receipt processing
```

### **Agent Scripts** (AI Agents)
```
scripts/
├── agent-learning-job.mjs             # Agent training
├── cultural-review-agent.mjs         # Cultural reviews
├── cultivator-agent.mjs              # Content cultivation
├── relationship-alert-agent.mjs      # Relationship alerts
├── project-enrichment.mjs            # Project enrichment
├── contact-manager.mjs                # Contact management
├── infrastructure-health.mjs         # Infrastructure monitoring
└── unified-search.mjs                # Unified search
```

### **Data Sync Scripts**
```
scripts/
├── sync-ghl-to-notion.mjs            # GoHighLevel → Notion
├── sync-ghl-to-supabase.mjs          # GoHighLevel → Supabase
├── sync-content-to-ghl.mjs           # Content → GHL
├── sync-storytellers-to-ghl.mjs      # Storytellers → GHL
├── sync-github-project-to-notion.mjs  # GitHub → Notion
└── sync-sprint-to-notion.mjs        # Sprints → Notion
```

### **Knowledge Management**
```
scripts/
├── ingest-knowledge-base-files.mjs   # Knowledge ingestion
├── knowledge-capture.mjs             # Knowledge capture
├── email-to-knowledge.mjs            # Email → Knowledge
├── chunk-knowledge.mjs               # Knowledge chunking
├── build-training-dataset.mjs        # Training data
└── generate-content-from-knowledge.mjs
```

### **Project Management**
```
scripts/
├── project-setup.mjs                  # Project setup
├── project-updates.mjs               # Project updates
├── project-review.mjs               # Project reviews
├── project-context.mjs               # Project context
├── project-contact-mapper.mjs        # Contact mapping
└── analyze-projects.mjs              # Project analysis
```

### **Financial Management**
```
scripts/
├── act-money.mjs                     # Money management
├── act-briefing.mjs                 # Financial briefing
├── scan-subscription-emails.mjs      # Subscription scanning
├── receipt-dashboard.mjs             # Receipt dashboard
├── calculate-flow-metrics.mjs        # Flow calculations
└── sync-xero-to-supabase.mjs        # Xero sync
```

### **Communication**
```
scripts/
├── auto-status-update.mjs           # Auto status updates
├── check-notifications.mjs           # Check notifications
├── discord-notify.mjs               # Discord notifications
├── smart-alerts.mjs                 # Smart alerts
└── smart-work-queue.mjs            # Work queue
```

### **Content Management**
```
scripts/
├── act-content.mjs                   # Content operations
├── expand-curiosity-examples.mjs     # Curiosity examples
├── expand-listen-examples.mjs        # Listen examples
├── expand-art-examples.mjs          # Art examples
└── generate-moon-cycles.mjs         # Moon cycles
```

### **Migration & Setup**
```
scripts/
├── create-notion-databases.mjs       # Create databases
├── migrate-farmhand-to-main.mjs     # Migration
├── setup-knowledge-tables.mjs       # Setup knowledge
├── setup-sprint-snapshots-table.mjs
└── verify-migration.mjs              # Verify migration
```

---

## 🔌 External Integrations

### **1. Notion**
**Scripts:**
- `sync-notion-to-supabase.mjs`
- `sync-notion-goals.mjs`
- `create-notion-databases.mjs`
- `check-notion-databases.mjs`

**API Client:**
```javascript
import { Client } from '@notionhq/client'
const notion = new Client({ auth: process.env.NOTION_TOKEN })
```

### **2. Gmail**
**Scripts:**
- `sync-gmail-to-supabase.mjs`
- `gmail-to-ghl-apps-script.js`
- `scan-org-mailboxes.mjs`

**API Client:**
```javascript
import { google } from 'googleapis'
const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
```

### **3. Xero**
**Scripts:**
- `sync-xero-to-supabase.mjs`

**API Client:**
```javascript
import { XeroClient } from 'xero-node'
const xero = new XeroClient()
```

### **4. Supabase**
**Scripts:**
- All sync scripts write to Supabase

**API Client:**
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
```

### **5. GoHighLevel (GHL)**
**Scripts:**
- `sync-ghl-to-notion.mjs`
- `sync-ghl-to-supabase.mjs`

---

## 📦 Packages

### **act-dashboard** ⭐
**Location:** `packages/act-dashboard/`  
**Purpose:** Main API server and dashboard UI

**Files:**
- `api-server.mjs` - Main Express server (177KB)
- `serve.mjs` - Dev server
- `index.html` - Main dashboard
- `goals-dashboard.html` - Goals dashboard
- `frontend/` - Frontend components

### **act-ui**
**Location:** `packages/act-ui/`  
**Purpose:** Shared UI components

### **act-voice**
**Location:** `packages/act-voice/`  
**Purpose:** Voice features

---

## 🗄️ Database (Supabase)

### **Migrations**
**Location:** `supabase/migrations/`  
**Purpose:** Database schema management

### **Functions**
**Location:** `supabase/functions/`  
**Purpose:** Supabase Edge Functions

---

## 🔧 Configuration

### **Environment**
```
.env              # Main environment file
.env.local        # Local environment (sensitive)
.envrc            # Dir environment
vercel.json       # Vercel config
```

### **Config Files**
```
config/
├── supabase.ts   # Supabase config
├── notion.ts     # Notion config
├── gmail.ts      # Gmail config
└── xero.ts      # Xero config
```

---

## 🚀 Running the Backend

### **Start API Server**
```bash
cd packages/act-dashboard
node api-server.mjs
# Runs on port 4000 (or 3000)
```

### **Run Individual Script**
```bash
# Example: Goals service
node scripts/goals-service.mjs

# Example: Gmail sync
node scripts/sync-gmail-to-supabase.mjs

# Example: Morning brief
node scripts/generate-morning-brief.mjs
```

### **Run All Scripts as Jobs**
```bash
# Setup cron jobs for automation
# See: crontab or job scheduler
```

---

## 🎯 Key Scripts (Most Important)

### **1. goals-service.mjs**
**Purpose:** Goals management (syncs with frontend)  
**Function:** CRUD operations for goals

### **2. api-server.mjs**
**Purpose:** Main API server  
**Function:** Serves frontend, handles API requests

### **3. sync-gmail-to-supabase.mjs**
**Purpose:** Gmail data sync  
**Function:** Imports emails to Supabase

### **4. sync-notion-to-supabase.mjs**
**Purpose:** Notion data sync  
**Function:** Imports Notion data to Supabase

### **5. generate-morning-brief.mjs**
**Purpose:** Daily briefing  
**Function:** Generates morning brief report

### **6. health-check-service.mjs**
**Purpose:** System monitoring  
**Function:** Checks system health

### **7. unified-search.mjs**
**Purpose:** Search functionality  
**Function:** Unified search across all data sources

### **8. project-intelligence-agent.mjs**
**Purpose:** AI project analysis  
**Function:** Analyzes projects using AI

### **9. contact-discovery.mjs**
**Purpose:** Contact discovery  
**Function:** Discovers and enriches contacts

### **10. grants-pipeline.mjs**
**Purpose:** Grants management  
**Function:** Manages grants pipeline

---

## 📊 Database Schema (Supabase)

### **Main Tables**
```
projects          # Project data
contacts          # Contact data
goals             # Goals data
communications     # Email/communications
subscriptions      # Subscription data
integrations      # Integration status
knowledge         # Knowledge base
storytellers       # Storyteller data
```

---

## 🔄 Development Workflow

### **1. Making Changes to API**
```bash
# Edit the main server
nano packages/act-dashboard/api-server.mjs

# Restart server
node packages/act-dashboard/api-server.mjs
```

### **2. Creating New Script**
```bash
# Create new script
touch scripts/new-script.mjs

# Add to scripts list in package.json
# Run with: node scripts/new-script.mjs
```

### **3. Database Changes**
```bash
# Create migration
nano supabase/migrations/$(date +%Y%m%d%H%M%S)_new_feature.sql

# Apply migration
supabase db push
```

### **4. Testing Integrations**
```bash
# Test Notion
node scripts/test-notion-connection.mjs

# Test Gmail
node scripts/test-env.mjs

# Test Xero
node scripts/test-new-token.mjs
```

---

## 📝 Common Tasks

### **Add New API Endpoint**
```javascript
// In api-server.mjs
app.get('/api/new-endpoint', async (req, res) => {
  const data = await // Logic
  res.json(data)
})
```

### **Add New Script**
```javascript
// In scripts/new-script.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

async function main() {
  // Script logic
  console.log('Running new script...')
}

main().catch(console.error)
```

### **Sync New Data Source**
```javascript
// Create sync script
// scripts/sync-new-source.mjs
import { sourceAPI } from 'source-sdk'

async function sync() {
  const data = await sourceAPI.fetch()
  await supabase.from('table').insert(data)
}

sync()
```

---

## 🎨 File Naming Conventions

### **Scripts**
- `action-name.mjs` - Action scripts
- `sync-source-to-destination.mjs` - Sync scripts
- `generate-thing.mjs` - Generation scripts
- `check-thing.mjs` - Check scripts
- `agent-name.mjs` - Agent scripts

### **Server Files**
- `api-server.mjs` - Main API server
- `serve.mjs` - Dev server

---

## 🔍 Finding Files

### **Find by Name**
```bash
# Find goal-related
find . -name "*goal*" -type f

# Find sync scripts
find . -name "*sync*" -type f

# Find Notion scripts
find . -name "*notion*" -type f
```

### **Find by Content**
```bash
# Search for function
grep -r "functionName" scripts/

# Search for endpoint
grep -r "/api/endpoint" api-server.mjs
```

---

## 📋 API Documentation

### **Main Endpoints**
```
GET  /api/dashboard/real-community-overview
GET  /api/dashboard/real-contacts
GET  /api/projects/real/projects
POST /api/goals/update
GET  /api/business-dashboard
GET  /api/health/status
```

### **Integration Endpoints**
```
POST /api/integrations/gmail/sync
POST /api/integrations/notion/sync
POST /api/integrations/xero/sync
GET  /api/integrations/status
```

---

## 💡 Development Tips

### **1. Environment Setup**
```bash
# Copy environment
cp .env.example .env

# Edit with your credentials
nano .env
```

### **2. Testing**
```bash
# Test individual script
node scripts/test-script.mjs

# Test API server
curl http://localhost:4000/api/health/status
```

### **3. Debugging**
```bash
# Enable debug mode
DEBUG=* node scripts/script.mjs

# Check logs
tail -f logs/app.log
```

---

## 🎯 Architecture Patterns

### **1. Script Pattern**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

async function main() {
  try {
    // 1. Fetch data
    const data = await fetchData()
    
    // 2. Transform
    const transformed = transform(data)
    
    // 3. Save
    await supabase.from('table').insert(transformed)
    
    console.log('Success!')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
```

### **2. API Pattern**
```javascript
import express from 'express'
const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/endpoint', async (req, res) => {
  try {
    const data = await getData()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
```

### **3. Sync Pattern**
```javascript
async function sync(source, destination) {
  const sourceData = await source.fetch()
  const destinationData = await destination.query()
  
  const toInsert = findChanges(sourceData, destinationData)
  await destination.insert(toInsert)
  
  return { inserted: toInsert.length }
}
```

---

## 📊 File Statistics

| Directory | Files | Purpose |
|-----------|-------|---------|
| **scripts** | 150+ | Automation & jobs |
| **packages** | 3 | Main packages |
| **supabase** | 20+ | Database |
| **api** | 10+ | API endpoints |

---

## ✅ Best Practices

### **1. Script Structure**
- Use ES modules (.mjs)
- Wrap in try/catch
- Log progress
- Handle errors gracefully

### **2. API Structure**
- Use async/await
- Return consistent JSON
- Handle errors with status codes
- Add CORS for frontend

### **3. Environment**
- Never commit .env
- Use .env.example as template
- Validate environment variables
- Use process.env

---

## 🎯 Quick Reference

### **Most Important Files**
1. **`packages/act-dashboard/api-server.mjs`** - Main server
2. **`scripts/goals-service.mjs`** - Goals sync
3. **`scripts/sync-gmail-to-supabase.mjs`** - Gmail sync
4. **`scripts/sync-notion-to-supabase.mjs`** - Notion sync
5. **`scripts/generate-morning-brief.mjs`** - Daily brief

### **Most Important Commands**
```bash
# Start server
node packages/act-dashboard/api-server.mjs

# Run script
node scripts/script-name.mjs

# Test integration
node scripts/test-integration.mjs

# Check health
curl http://localhost:4000/api/health
```

---

## 🚨 Troubleshooting

### **Server Won't Start**
```bash
# Check port
lsof -i :4000

# Kill process
kill -9 <PID>

# Restart
node packages/act-dashboard/api-server.mjs
```

### **Script Fails**
```bash
# Check logs
cat logs/error.log

# Debug mode
DEBUG=* node scripts/script.mjs

# Check env
node scripts/test-env.mjs
```

### **Integration Issues**
```bash
# Test connection
node scripts/test-notion-connection.mjs

# Refresh token
node scripts/test-new-token.mjs

# Check permissions
node scripts/verify-secrets.sh
```

---

**Happy Coding! 🚀**
