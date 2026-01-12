# ACT Global Infrastructure Documentation

> Central documentation hub for the ACT ecosystem infrastructure.

## Quick Navigation

| Category | Description |
|----------|-------------|
| [Architecture](./architecture/) | System design, data models, AI patterns |
| [Guides](./guides/) | How-to guides for operational tasks |
| [Integrations](./integrations/) | External system connections (GHL, Notion, etc.) |
| [Reference](./reference/) | Executive overviews and strategic plans |
| [ALMA](./alma/) | JusticeHub intelligence layer documentation |
| [Archive](./archive/) | Historical documents and completed phases |

---

## Architecture

Core system design documents.

| Document | Description |
|----------|-------------|
| [UNIFIED_ARCHITECTURE.md](./architecture/UNIFIED_ARCHITECTURE.md) | Data flow and no-duplication schema design |
| [WORLD_CLASS_DEVELOPMENT_PIPELINE.md](./architecture/WORLD_CLASS_DEVELOPMENT_PIPELINE.md) | End-to-end dev workflow across 7 codebases |
| [SKILLS_SUBAGENTS_MCPS_GUIDE.md](./architecture/SKILLS_SUBAGENTS_MCPS_GUIDE.md) | Three-layer AI system (skills, subagents, MCPs) |
| [NOTION_INTEGRATION_SCHEMA.md](./architecture/NOTION_INTEGRATION_SCHEMA.md) | Canonical database schema for all Notion DBs |
| [RAG_LLM_BEST_PRACTICES.md](./architecture/RAG_LLM_BEST_PRACTICES.md) | Knowledge base and retrieval patterns |

---

## Guides

Operational how-to guides.

| Guide | Description |
|-------|-------------|
| [GLOBAL_MCPS_SETUP.md](./guides/GLOBAL_MCPS_SETUP.md) | Model Context Protocol configuration |
| [AUTO_SYNC_GUIDE.md](./guides/AUTO_SYNC_GUIDE.md) | Repository sync procedures |
| [NOTION_GITHUB_SYNC_SETUP.md](./guides/NOTION_GITHUB_SYNC_SETUP.md) | GitHub to Notion sync |
| [NOTION_TOKEN_SETUP_GUIDE.md](./guides/NOTION_TOKEN_SETUP_GUIDE.md) | Secure token management |
| [GHL_WORKFLOW_WEBHOOK_SETUP.md](./guides/GHL_WORKFLOW_WEBHOOK_SETUP.md) | GHL webhook configuration |
| [SMART_ALERTS_GUIDE.md](./guides/SMART_ALERTS_GUIDE.md) | Alert configuration |
| [SMART_WORK_QUEUE_GUIDE.md](./guides/SMART_WORK_QUEUE_GUIDE.md) | Work prioritization |
| [MOMENTUM_DASHBOARD_GUIDE.md](./guides/MOMENTUM_DASHBOARD_GUIDE.md) | Flow metrics dashboard |
| [AUTO_STATUS_DETECTION_GUIDE.md](./guides/AUTO_STATUS_DETECTION_GUIDE.md) | Automatic status from git |
| [NOTION_DATABASE_QUICK_GUIDE.md](./guides/NOTION_DATABASE_QUICK_GUIDE.md) | Quick database reference |

---

## Integrations

External system connections.

| Integration | Description | Status |
|-------------|-------------|--------|
| [GHL_INTEGRATIONS.md](./integrations/GHL_INTEGRATIONS.md) | GoHighLevel CRM integration | **Live** |
| [GHL_RESEARCH_SUMMARY.md](./integrations/GHL_RESEARCH_SUMMARY.md) | GHL API research reference | Reference |
| [ACT_PLACEMAT_INTEGRATION.md](./integrations/ACT_PLACEMAT_INTEGRATION.md) | ACT Placemat system | Planned |
| [GITHUB_ISSUES_DATABASE_OPTIONS.md](./integrations/GITHUB_ISSUES_DATABASE_OPTIONS.md) | GitHub issues design options | Reference |

---

## Reference

Strategic and executive documents.

| Document | Description |
|----------|-------------|
| [COMPLETE_SYSTEM_GUIDE.md](./reference/COMPLETE_SYSTEM_GUIDE.md) | Executive overview of entire system |
| [NEXT_LEVEL_PROJECT_MANAGEMENT.md](./reference/NEXT_LEVEL_PROJECT_MANAGEMENT.md) | Vision and gap analysis |
| [PERFORMANCE_OPTIMIZATION_PLAN.md](./reference/PERFORMANCE_OPTIMIZATION_PLAN.md) | Future optimization roadmap |

---

## ALMA (JusticeHub Intelligence)

Documentation for the ALMA intelligence layer.

| Document | Description |
|----------|-------------|
| [CHARTER.md](./alma/CHARTER.md) | Mission, principles, operating system |
| [DATA_POSTURE.md](./alma/DATA_POSTURE.md) | Data classification and privacy |
| [6_WEEK_BUILD_BACKLOG.md](./alma/6_WEEK_BUILD_BACKLOG.md) | Implementation roadmap |
| [JUSTICEHUB_COMPREHENSIVE_INTEGRATION_PLAN.md](./alma/JUSTICEHUB_COMPREHENSIVE_INTEGRATION_PLAN.md) | Full integration plan |
| [JUSTICEHUB_SUPABASE_INTEGRATION.md](./alma/JUSTICEHUB_SUPABASE_INTEGRATION.md) | Supabase schema design |

---

## Archive

Historical documents from completed work.

| Folder | Contents |
|--------|----------|
| [phase-logs/](./archive/phase-logs/) | Phase 1-4 completion reports |
| [setup-guides/](./archive/setup-guides/) | Completed setup documentation |
| [notion-research/](./archive/notion-research/) | Database audit and research |
| [one-time-checklists/](./archive/one-time-checklists/) | Implementation checklists |

See [archive/README.md](./archive/README.md) for details on archived content.

---

## Key Concepts

### LCAA Methodology
All ACT work follows **Listen → Curiosity → Action → Art**:
- Listen: Understand before proposing
- Curiosity: Ask better questions together
- Action: Build with, not for communities
- Art: Make change beautiful

### Data Flow
```
External Sources → GHL → Supabase → AI Intelligence → Actions
     ↓
Gmail, Calendar, Forms → GHL Contacts → ghl_contacts table → RAG + Recommendations
```

### AI System Layers
1. **Skills**: Reusable capabilities (planning, verification, notion-sync)
2. **Subagents**: Autonomous workers (sprint-planner, code-reviewer)
3. **MCPs**: External system bridges (GitHub, Notion, Postgres)

---

*Last reorganized: 2026-01-06*
