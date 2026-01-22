# /enrich-project - Deep Project Intelligence

Enrich ACT projects with intelligence from ALL knowledge sources.

## Commands

```bash
# Single project enrichment
node scripts/project-enrichment.mjs enrich <PROJECT_CODE>

# Enrich all projects (full run)
node scripts/project-enrichment.mjs enrich-all

# ACT Frontends dashboard
node scripts/project-enrichment.mjs frontends

# Complete dashboard with all data
node scripts/project-enrichment.mjs dashboard

# Quick opportunity scan
node scripts/project-enrichment.mjs opportunities
```

## Knowledge Sources

The enrichment engine pulls from:

| Source | Data |
|--------|------|
| **Supabase** | contacts, communications, voice notes, relationship health |
| **GHL** | contacts, tags, pipelines, notes |
| **Notion** | project pages, compendium entries |
| **Empathy Ledger v2** | stories, storytellers, impact data |
| **ALMA** | research, evidence, interventions |
| **GitHub** | repos, codebases, activity |

## Project Codes

From `config/project-codes.json`:
- `ACT-JH` - JusticeHub
- `ACT-GOODS` - Goods Platform
- `ACT-EL` - Empathy Ledger
- `ACT-HARVEST` - The Harvest
- `ACT-FN` - First Nations Projects
- `ACT-STUDIO` - ACT Studio Website
- ... 40+ more projects

## Output

### Enrichment Data
Each project gets a cached intelligence file at:
`.claude/cache/project-intelligence/<code>.json`

Contains:
- **Health Score** (0-100)
- **Contacts** - count, active, stale, key people
- **Communications** - recent activity, channels
- **Stories** - from Empathy Ledger v2
- **Research** - ALMA evidence
- **Opportunities** - actionable suggestions
- **Relationship Health** - hot/warm/cool breakdown

### Opportunity Types

| Type | Priority | Description |
|------|----------|-------------|
| `relationship` | 🔥 | Re-engage dormant relationships |
| `communication` | 🔥 | No recent activity |
| `stories` | ⚡ | Collect stories from contacts |
| `research` | 💭 | Add research evidence |
| `documentation` | ⚡ | Create Notion page |

## Usage Patterns

### Daily Enrichment
```bash
# Morning routine - enrich key projects
node scripts/project-enrichment.mjs enrich ACT-JH
node scripts/project-enrichment.mjs enrich ACT-GOODS
```

### Weekly Full Scan
```bash
# Full enrichment of all 40+ projects
node scripts/project-enrichment.mjs enrich-all

# Generate opportunity report
node scripts/project-enrichment.mjs opportunities
```

### Dashboard Generation
```bash
# Full dashboard for Intelligence Platform
node scripts/project-enrichment.mjs dashboard
```

## LCAA Framework

Each project is enriched with LCAA stage data:
- **Listen** - Research, evidence, community voices
- **Connect** - Relationships, communications, network
- **Act** - Active projects, interventions
- **Amplify** - Stories, impact, visibility

## Integration

### With Cultivator
Enrichment identifies contacts needing outreach:
```bash
# After enrichment
node scripts/cultivator-agent.mjs run 5 --project ACT-JH
```

### With Intelligence Platform
Dashboard data feeds into React components at:
`/apps/frontend/src/components/projects/`

### With Morning Brief
Opportunities feed into daily morning brief:
```bash
node scripts/generate-morning-brief.mjs
```
