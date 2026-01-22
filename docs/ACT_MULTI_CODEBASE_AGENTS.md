# ACT Multi-Codebase Agent Architecture

**Created:** 2026-01-21
**Purpose:** Enable Claude Code to work across all ACT ecosystem codebases with full context

---

## Overview

ACT operates as an ecosystem of interconnected projects. Each project has its own codebase, but they share:
- Common design patterns and brand identity
- Shared database infrastructure (Supabase)
- Common relationship management (GHL)
- Cross-project integrations
- Unified LCAA framework

This architecture gives Claude Code access to ALL codebases simultaneously, enabling:
- Cross-project recommendations
- Pattern replication
- Ecosystem-wide improvements
- Unified design decisions

---

## Codebases Included

| Codebase | Path | Purpose |
|----------|------|---------|
| **act-global-infrastructure** | `/Users/benknight/Code/act-global-infrastructure` | Central hub - automation, scripts, agents |
| **empathy-ledger-v2** | `/Users/benknight/Code/empathy-ledger-v2` | Storytelling platform, ALMA, Content Hub |
| **JusticeHub** | `/Users/benknight/Code/JusticeHub` | Justice services, CONTAINED campaign |
| **The Harvest Website** | `/Users/benknight/Code/The Harvest Website` | Community hub, CSA, events |
| **Goods Asset Register** | `/Users/benknight/Code/Goods Asset Register` | Circular economy marketplace |
| **act-farm** | `/Users/benknight/Code/act-farm` | Black Cockatoo Valley, conservation |
| **act-regenerative-studio** | `/Users/benknight/Code/act-regenerative-studio` | Multi-project orchestrator |
| **act-intelligence-platform** | `/Users/benknight/Code/act-intelligence-platform` | Dashboard, analytics |
| **act-placemat** | `/Users/benknight/Code/act-placemat` | Internal tools |
| **act-personal-ai** | `/Users/benknight/Code/act-personal-ai` | Voice models, ACT AI |

---

## How It Works

### MCP Filesystem Configuration

The `.mcp.json` file configures the Model Context Protocol filesystem server with access to all codebases:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/benknight/Code/act-global-infrastructure",
        "/Users/benknight/Code/empathy-ledger-v2",
        // ... all other codebases
      ]
    }
  }
}
```

### After Configuration

**Restart Claude Code** after modifying `.mcp.json` for changes to take effect.

Then use the MCP filesystem tools:
```
mcp__filesystem__read_text_file  - Read files from any codebase
mcp__filesystem__list_directory  - Browse directories
mcp__filesystem__search_files    - Search across codebases
mcp__filesystem__write_file      - Write files (with approval)
```

---

## Specialized Agent Domains

### 1. Design Agent
**Scope:** Visual consistency, brand alignment, UI patterns

**Cross-Codebase Tasks:**
- Audit all frontends for brand consistency
- Replicate successful components across projects
- Ensure ACT color palette and typography usage
- Review accessibility across sites

**Pattern Sources:**
- `empathy-ledger-v2/src/components/` - EL's polished components
- `act-regenerative-studio/src/styles/` - Brand guidelines
- `The Harvest Website/styles/` - Community-focused design

### 2. Communications Agent
**Scope:** Messaging, content, stakeholder engagement

**Cross-Codebase Tasks:**
- Audit email templates across projects
- Ensure consistent voice/tone (LCAA framework)
- Track relationship communications in GHL
- Generate project updates

**Data Sources:**
- GHL contacts and communications
- Notion project documentation
- Email templates in each codebase
- Discord notification patterns

### 3. Process Agent
**Scope:** Workflows, automation, operational efficiency

**Cross-Codebase Tasks:**
- Identify common workflow patterns
- Standardize build/deploy processes
- Replicate successful automations
- Optimize development workflows

**Pattern Sources:**
- `act-global-infrastructure/scripts/` - Automation library
- GitHub Actions workflows in each repo
- Package.json scripts patterns

### 4. Database Agent
**Scope:** Data architecture, migrations, queries

**Cross-Codebase Tasks:**
- Review schema consistency across projects
- Identify denormalization opportunities
- Plan cross-project data sharing
- Audit database performance

**Infrastructure:**
- Supabase as shared database
- `act-global-infrastructure/supabase/migrations/` - Central migrations
- Per-project Supabase functions

### 5. Relationships Agent
**Scope:** Contact management, engagement tracking

**Cross-Codebase Tasks:**
- Sync contacts across projects
- Track multi-project involvement
- Generate relationship health reports
- Suggest engagement actions

**Systems:**
- GHL as CRM
- `ghl_contacts` table in Supabase
- `communications_history` for tracking
- Tag-based organization

---

## Cross-Project Patterns

### Shared Services

| Service | Location | Used By |
|---------|----------|---------|
| GHL API | `act-global-infrastructure/scripts/lib/ghl-api-service.mjs` | All projects |
| Supabase Client | Each project's `.env` | All projects |
| Discord Notifications | `act-global-infrastructure/scripts/discord-notify.mjs` | Global |
| Notion Sync | `act-global-infrastructure/scripts/` | Global |

### Common Database Tables

| Table | Purpose | Projects |
|-------|---------|----------|
| `ghl_contacts` | Contact management | All |
| `communications_history` | Interaction tracking | All |
| `projects` | Project metadata | All |
| `entity_index` | Unified search | All |

### Tag Conventions

| Tag Pattern | Meaning |
|-------------|---------|
| `<project>-team` | Core team members |
| `<project>-advisory` | Advisory group |
| `<project>-partner` | Implementation partners |
| `<project>-funder` | Funding relationships |

---

## Usage Patterns

### Exploring Goods Codebase

```
# From any ACT project, use MCP filesystem:
mcp__filesystem__list_directory("/Users/benknight/Code/Goods Asset Register")
mcp__filesystem__read_text_file("/Users/benknight/Code/Goods Asset Register/package.json")
```

### Cross-Project Search

```
# Find all uses of Supabase client:
mcp__filesystem__search_files(
  path="/Users/benknight/Code",
  pattern="**/*.{js,ts,mjs}",
  // Then grep for supabase
)
```

### Replicating Patterns

When you find a good pattern in one project:
1. Read the implementation from source project
2. Understand the dependencies
3. Adapt for target project
4. Document the shared pattern

---

## Best Practices

### 1. Central Infrastructure First
Always check if `act-global-infrastructure` already has the script/pattern before creating project-specific versions.

### 2. Shared Services
Use shared services (GHL, Supabase, Discord) rather than creating per-project integrations.

### 3. Tag Consistency
Follow tag naming conventions so contacts can be queried across projects.

### 4. Document Cross-References
When a feature in one project depends on another, document the dependency.

### 5. Unified Testing
Test cross-project integrations in the infrastructure project.

---

## Setup for New Developers

1. **Clone all repos** to `/Users/benknight/Code/`
2. **Copy** `.mcp.json` to any project where you'll run Claude Code
3. **Restart** Claude Code after configuration changes
4. **Verify** access: `mcp__filesystem__list_allowed_directories`

---

## Agent Execution Flow

```
User Request
     ↓
Identify Domain (design/comms/process/db/relationships)
     ↓
Gather Cross-Project Context
     ↓
Find Existing Patterns
     ↓
Implement with Consistency
     ↓
Document Cross-References
```

---

## Future Enhancements

- [ ] Auto-sync CLAUDE.md across all repos
- [ ] Shared component library
- [ ] Cross-project test suites
- [ ] Unified deployment pipeline
- [ ] Ecosystem-wide analytics dashboard

---

*This architecture enables ACT to operate as one coherent system while maintaining project autonomy.*
