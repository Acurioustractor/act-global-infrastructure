# Manual Setup: ACT Agent Tasks Database in Notion

Since the Notion MCP is currently not connected, follow these steps to manually create the database.

## Step 1: Create New Database

1. Open Notion
2. Go to your ACT workspace
3. Create a new page called "ACT Agent Tasks"
4. Add a database (inline or full-page)

## Step 2: Configure Properties

Add these properties to the database:

| Property Name | Type | Options |
|---------------|------|---------|
| **Name** | Title | (default) |
| **Status** | Select | `Backlog`, `In Progress`, `Blocked`, `Done` |
| **Project** | Select | `Empathy Ledger`, `JusticeHub`, `ACT Studio`, `The Harvest`, `Goods`, `ACT Farm`, `ACT Placemat` |
| **Skill** | Multi-select | See skill list below |
| **Agent Notes** | Text | (long text) |
| **Blocked Reason** | Text | (long text) |
| **Your Response** | Text | (long text) |
| **Priority** | Select | `High`, `Medium`, `Low` |
| **Started** | Date | |
| **Completed** | Date | |

## Step 3: Add All Skills to Multi-Select

Copy-paste these skills into the "Skill" multi-select property:

### Empathy Ledger (26)
- empathy-ledger-codebase
- codebase-explorer
- empathy-ledger-dev
- design-system-guardian
- design-component
- database-navigator
- supabase-connection
- supabase-sql-manager
- supabase-deployment
- data-analysis
- supabase
- data-integrity-guardian
- cultural-review
- gdpr-compliance
- empathy-ledger-mission
- analytics-dashboard-dev
- story-craft
- api-integration-webhooks
- frontend-backend-auditor
- visual-testing
- deployment-workflow
- local-dev-server
- local-deployment
- sprint-tracker
- ralph-runner

### JusticeHub (7)
- act-code-reviewer
- justicehub-context
- justicehub-reviewer
- justicehub-brand-alignment
- alma-scraper
- apply-migration
- ralph-storyteller

### ACT Studio (6)
- act-brand-alignment
- ghl-crm-advisor
- act-knowledge-base
- act-sprint-workflow
- act-project-enrichment
- multi-repo-sync

### Global (6)
- global/act-brand-alignment
- global/act-sprint-workflow
- global/ghl-crm-advisor
- global/ralph-agent
- global/env-secrets-manager
- agent-kanban

## Step 4: Create Kanban View

1. Click "+ Add a view"
2. Select "Board"
3. Group by: Status
4. The columns will automatically be: Backlog → In Progress → Blocked → Done

## Step 5: Set Status Colors

Edit the Status property to set colors:
- **Backlog**: Gray
- **In Progress**: Blue
- **Blocked**: Red (IMPORTANT - this alerts you!)
- **Done**: Green

## Step 6: Share with Integration

1. Click "..." menu in top-right
2. Click "Connections"
3. Add your Notion integration (the one with token `ntn_633000104474...`)
4. Grant full access

## Step 7: Get Database ID

1. Open the database as a full page
2. Copy the URL
3. The database ID is the part after the workspace name and before the `?`
   - Example: `notion.so/workspace/ABC123DEF456?v=...`
   - Database ID: `ABC123DEF456`

## Step 8: Update Skill File

Edit `/Users/benknight/act-global-infrastructure/.claude/skills/agent-kanban/skill.md`

Find this line:
```
DATABASE_ID: [paste-your-database-id-here]
```

Replace with your actual database ID.

## Step 9: Create Notification Automation (Optional)

1. Go to database settings
2. Add automation: "When Status changes to Blocked → Send notification"
3. This will ping you on Notion mobile when a task needs attention

## Verification

Once complete, restart Claude Code and the Notion MCP should be able to:
- Create tasks in the database
- Update task status
- Query for blocked tasks
- Read human responses

The agent-kanban skill is already symlinked to all 7 projects and ready to use!
