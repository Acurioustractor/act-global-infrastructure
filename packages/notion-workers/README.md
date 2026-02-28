# ACT Notion Workers

Custom AI agent tools for Notion, powered by the ACT ecosystem's Supabase data layer.

## Quick Start

```bash
# 1. Install Notion CLI
npm i -g ntn

# 2. Login to Notion
ntn login

# 3. Set secrets
ntn workers env set SUPABASE_URL=<your-supabase-url>
ntn workers env set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# 4. Deploy
cd packages/notion-workers
ntn workers deploy
```

## Tools

| Tool | Description | Notion Agent Prompt |
|------|-------------|---------------------|
| `check_grant_deadlines` | Upcoming deadlines + milestone progress | "What grants are closing this week?" |
| `get_daily_briefing` | Overdue actions, follow-ups, decisions, relationship alerts | "Give me today's briefing" |
| `lookup_contact` | Relationship intelligence by name/email | "What's our relationship with Sarah?" |
| `get_project_health` | Activity scores, meetings, decisions, grant pipeline per project | "How healthy is the Empathy Ledger?" |
| `get_financial_summary` | Spend by project, untagged transactions, grant pipeline | "What's our spend on PICC this quarter?" |

## Adding to a Notion Custom Agent

1. Deploy the worker (`ntn workers deploy`)
2. Copy the Worker URL from the deploy output
3. In Notion, create or edit a Custom Agent
4. Add a new tool for each tool name above
5. Paste the Worker URL as the connection

## Architecture

```
Notion Agent (natural language)
  └─ calls Worker tool
       └─ queries Supabase (same DB as Command Center + scripts)
            └─ returns structured text to Notion Agent
                 └─ Agent formats response in Notion page
```

Same data, different interface. Telegram bot = mobile. Command Center = dashboard. Notion Workers = inline in your workspace.

## Development

```bash
# Type check
npm run check

# Test locally
ntn workers exec check_grant_deadlines '{"days_ahead": 7}'

# View logs
ntn workers runs logs <run-id>
```

## Status: Alpha

Notion Workers is in extreme pre-release alpha. Expect breaking changes. This package tracks the `@notionhq/workers` SDK.
