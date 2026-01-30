# ACT Regenerative Studio - Claude Code Context

> **Quick Reference for Claude Code**
> This document provides essential context about this codebase for AI-assisted development.

---

## 🎯 Project Overview

**Name**: ACT Regenerative Studio
**Purpose**: Unified platform for A Curious Tractor's regenerative innovation ecosystem
**Tech Stack**: Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pgvector), Tailwind CSS
**Primary Focus**: Living Wiki knowledge base + Multi-project operations hub

---

## 🚀 Quick Start

### Essential Commands
```bash
# Start development server
npm run dev        # Port 3001

# Database operations
npm run db:types   # Regenerate TypeScript types from Supabase

# Skills management
./.claude/skills-menu.sh   # Interactive skill launcher
```

### Key Files to Read First
1. [README.md](./README.md) - Project setup and overview
2. [docs/quick-starts/quick-start.md](./docs/quick-starts/quick-start.md) - Getting started
3. [docs/architecture/complete-system.md](./docs/architecture/complete-system.md) - System architecture
4. [.claude/SKILLS_GUIDE.md](./.claude/SKILLS_GUIDE.md) - Available Claude skills

---

## 📁 Codebase Structure

### Root Directories
```
/
├── src/                    # Next.js application code
│   ├── app/               # App router pages and API routes
│   ├── components/        # React components
│   ├── lib/               # Utilities, database clients, integrations
│   └── types/             # TypeScript type definitions
├── docs/                  # Organized documentation (see below)
├── scripts/               # Build, deployment, and utility scripts
├── supabase/             # Database migrations and config
├── .claude/              # Claude Code skills and configuration
└── public/               # Static assets
```

### Documentation Organization (`/docs/`)

**Essential Categories:**
- **quick-starts/** - Getting started guides, OAuth setup, deployment
- **architecture/** - System design, database schema, integration patterns
- **features/** - Knowledge base, dashboard, media gallery, project enrichment
- **integrations/** - GHL, Notion, Gmail, OpenAI, Supabase, Empathy Ledger
- **projects/** - All ACT ecosystem projects (Empathy Ledger, JusticeHub, etc.)
- **strategy/** - Roadmaps, master plan, vision
- **operations/** - Multi-repo management, deployment, monitoring
- **development/** - Dev environment setup, best practices, env management
- **standards/** - Coding standards, naming conventions, unified project standards
- **brand/** - Voice, tone, messaging, content drafts
- **archive/** - Historical snapshots and deprecated docs

---

## 🔧 Core Features

### 1. Living Wiki Knowledge Base
**What**: Auto-extract knowledge from Gmail, Notion, Calendar → Review queue → Published wiki
**Key Files**:
- `src/lib/knowledge/gmail-scanner.ts` - Gmail knowledge extraction
- `src/lib/knowledge/notion-scanner.ts` - Notion knowledge extraction
- `src/app/admin/wiki/page.tsx` - Wiki admin interface
- `src/app/api/knowledge/` - Knowledge API endpoints

**Docs**: [docs/features/knowledge-base/](./docs/features/knowledge-base/)

### 2. Multi-Project Dashboard
**What**: Unified operations hub for all ACT projects
**Key Files**:
- `src/app/page.tsx` - Main dashboard
- `src/components/dashboard/` - Dashboard components

**Docs**: [docs/features/dashboard/](./docs/features/dashboard/)

### 3. GoHighLevel Integration
**What**: CRM automation for The Harvest, Empathy Ledger, JusticeHub, BCV
**Key Files**:
- `src/lib/ghl/` - GHL client and utilities
- `src/app/api/webhooks/ghl/` - GHL webhook handlers

**Docs**: [docs/integrations/ghl/](./docs/integrations/ghl/)

### 4. Empathy Ledger Integration
**What**: Ethical storytelling platform integration
**Key Files**:
- `src/lib/empathy-ledger/` - Empathy Ledger client
- `src/app/api/empathy-ledger/` - Integration endpoints

**Docs**: [docs/integrations/empathy-ledger/](./docs/integrations/empathy-ledger/)

---

## 🤖 Claude Code Skills

This project has specialized skills to help with common tasks. Invoke with `/skill-name`.

### Available Skills

**1. `/act-brand-alignment`** - Brand voice and content
- Use for: Writing web pages, marketing copy, grant applications
- Use for: Reviewing content for ACT voice/tone consistency
- Reference: [.claude/skills/act-brand-alignment/SKILL.md](./.claude/skills/act-brand-alignment/SKILL.md)

**2. `/ghl-crm-advisor`** - GoHighLevel CRM strategy
- Use for: Designing pipelines, workflows, email sequences
- Use for: Troubleshooting GHL integrations
- Reference: [.claude/skills/ghl-crm-advisor/SKILL.md](./.claude/skills/ghl-crm-advisor/SKILL.md)

**3. `act-knowledge-base`** - Knowledge extraction system
- Status: In development
- Use for: Living Wiki improvements, knowledge extraction workflows
- Reference: [.claude/skills/act-knowledge-base/skill.md](./.claude/skills/act-knowledge-base/skill.md)

### Skill Discovery

Run interactive menu to explore skills:
```bash
./.claude/skills-menu.sh
```

Or see comprehensive guide: [.claude/SKILLS_GUIDE.md](./.claude/SKILLS_GUIDE.md)

---

## 🗄️ Database Schema

**Platform**: Supabase (PostgreSQL + pgvector)
**Key Tables**:
- `wiki_pages` - Published knowledge base articles
- `knowledge_extraction_queue` - Pending knowledge items for review
- `knowledge_sources` - Source tracking (Gmail, Notion, Calendar)
- `ghl_*` - GoHighLevel integration tables
- `empathy_ledger_*` - Empathy Ledger integration tables
- `media_*` - Media gallery and asset management

**Regenerate Types**:
```bash
npm run db:types
```

**Schema Docs**: [docs/architecture/knowledge-system.md](./docs/architecture/knowledge-system.md)

---

## 🔐 Environment Variables

**Required**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tednluwflfhxyucgwigh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI (for embeddings)
OPENAI_API_KEY=...

# Gmail OAuth (for knowledge extraction)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/gmail/callback

# Notion (for knowledge extraction)
NOTION_TOKEN=...
NOTION_WORKSPACE_ID=...

# GoHighLevel
GHL_API_KEY=...
GHL_LOCATION_ID=...
```

**Setup Guide**: [docs/quick-starts/env-setup.md](./docs/quick-starts/env-setup.md)

---

## 🏗️ ACT Ecosystem Projects

This codebase serves 6+ ACT projects:

1. **Empathy Ledger** - Ethical storytelling platform, consent-first, OCAP® principles
2. **JusticeHub** - Open-source justice network, forkable program models
3. **The Harvest** - Community hub, therapeutic horticulture, heritage preservation
4. **Black Cockatoo Valley** - 150-acre regeneration estate, conservation-first
5. **Goods on Country** - Circular economy, waste-to-wealth manufacturing
6. **Art Program** - Revolution through creativity, installations and residencies

**Project Docs**: [docs/projects/](./docs/projects/)
**Ecosystem Overview**: [docs/projects/act-ecosystem.md](./docs/projects/act-ecosystem.md)

---

## 🎨 Brand Voice & Methodology

### LCAA Method
**Listen** → **Curiosity** → **Action** → **Art**

Frame all solutions through this lens:
- **Listen**: Deep listening to place, people, history, community voice
- **Curiosity**: Think deeply, prototype boldly, test rigorously
- **Action**: Build tangible solutions alongside communities
- **Art**: Translate change into culture, challenge status quo

### Voice Characteristics
- **Grounded yet Visionary** - Plant seeds today for forests tomorrow
- **Humble yet Confident** - We don't have all answers, but we're cultivating solutions
- **Warm yet Challenging** - Let's get our hands dirty with hard truths
- **Poetic yet Clear** - Use metaphor to illuminate, not obscure

### Avoid
- Savior narratives, paternalistic framing, luxury positioning
- Corporate jargon, glossy marketing speak, overclaiming

**Brand Docs**: [docs/brand/](./docs/brand/)

---

## 🛠️ Development Workflows

### Adding a New Feature
1. Read relevant architecture docs in `docs/architecture/`
2. Check existing patterns in `src/lib/` and `src/components/`
3. Update database schema in `supabase/migrations/` if needed
4. Run `npm run db:types` to regenerate TypeScript types
5. Write feature code following existing patterns
6. Test locally on port 3001
7. Document in appropriate `docs/features/` file

### Working with Knowledge Base
1. Review: [docs/architecture/knowledge-system.md](./docs/architecture/knowledge-system.md)
2. Gmail scanner: `src/lib/knowledge/gmail-scanner.ts`
3. Notion scanner: `src/lib/knowledge/notion-scanner.ts`
4. Admin interface: `src/app/admin/wiki/page.tsx`
5. See Phase 3 roadmap: [docs/strategy/next-steps-roadmap.md](./docs/strategy/next-steps-roadmap.md)

### Working with GHL Integration
1. Review: [docs/integrations/ghl/setup-guide.md](./docs/integrations/ghl/setup-guide.md)
2. Client lib: `src/lib/ghl/client.ts`
3. Webhook handlers: `src/app/api/webhooks/ghl/`
4. Use `/ghl-crm-advisor` skill for strategy questions

---

## 📚 Finding Documentation

### By Task
- **Getting started?** → `docs/quick-starts/`
- **Understanding architecture?** → `docs/architecture/`
- **Setting up integration?** → `docs/integrations/`
- **Learning about features?** → `docs/features/`
- **Strategic planning?** → `docs/strategy/`
- **Multi-repo operations?** → `docs/operations/`

### By Project
- **Empathy Ledger** → `docs/integrations/empathy-ledger/` + `docs/projects/empathy-ledger/`
- **JusticeHub** → `docs/projects/justicehub/`
- **The Harvest** → `docs/projects/harvest/`
- **GHL CRM** → `docs/integrations/ghl/`

### Navigation Aids
- [docs/README.md](./docs/README.md) - Documentation index (if exists)
- [.claude/SKILLS_MAP.md](./.claude/SKILLS_MAP.md) - Visual skill selection guide
- This file (CLAUDE.md) - You are here!

---

## 🔄 Multi-Codebase Context

This project is part of a larger ACT ecosystem with multiple codebases:

- **ACT Studio** (`/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/`) - This repo
- **Empathy Ledger** (`/Users/benknight/Code/Empathy Ledger v.02/`) - GitHub: `empathy-ledger-v2`
- **JusticeHub** (`/Users/benknight/Code/JusticeHub/`) - GitHub: `justicehub-platform`
- **The Harvest** (`/Users/benknight/Code/The Harvest Website/`) - GitHub: `harvest-community-hub`
- **Goods** (`/Users/benknight/Code/Goods Asset Register/`) - GitHub: `goods-asset-tracker`
- **ACT Farm** (`/Users/benknight/Code/ACT Farm/act-farm/`) - GitHub: `act-farm`

**Multi-Codebase Skills Architecture**: [docs/architecture/multi-codebase-skills.md](./docs/architecture/multi-codebase-skills.md)

**Planned**: Global skills repository at `~/act-global-skills/` with symlinks to project-specific `.claude/skills/global/`

---

## 🚦 Common Tasks Reference

### Task: "Help me write homepage copy"
**Skill**: `/act-brand-alignment`
**Docs**: `docs/brand/`, `docs/projects/`
**Pattern**: Use LCAA method, ACT voice, avoid savior narratives

### Task: "Set up Gmail OAuth for knowledge scanner"
**Docs**: `docs/quick-starts/gmail-oauth-setup.md`
**Code**: `src/lib/gmail/auth.ts`, `src/lib/knowledge/gmail-scanner.ts`
**Troubleshooting**: `docs/quick-starts/fix-gmail-auth.md`

### Task: "Design new GHL pipeline"
**Skill**: `/ghl-crm-advisor`
**Docs**: `docs/integrations/ghl/pipeline-strategy.md`
**Code**: `src/lib/ghl/`

### Task: "Add new wiki page type"
**Docs**: `docs/architecture/knowledge-system.md`
**Code**: `src/types/wiki.ts`, `supabase/migrations/`
**Process**: Update schema → Run `npm run db:types` → Update UI

### Task: "Deploy to production"
**Docs**: `docs/quick-starts/deploy-now.md`
**Platform**: Vercel (inferred from Next.js stack)

---

## 📖 Additional Resources

- **Project README**: [README.md](./README.md)
- **Skills Guide**: [.claude/SKILLS_GUIDE.md](./.claude/SKILLS_GUIDE.md)
- **Architecture Overview**: [docs/architecture/complete-system.md](./docs/architecture/complete-system.md)
- **Master Plan**: [docs/strategy/master-plan.md](./docs/strategy/master-plan.md)
- **Multi-Repo Management**: [docs/operations/multi-repo-management.md](./docs/operations/multi-repo-management.md)

---

## 💡 Tips for AI-Assisted Development

1. **Always check docs first** - Documentation is organized by category in `docs/`
2. **Use skills for domain expertise** - Brand, CRM, and knowledge extraction skills available
3. **Follow existing patterns** - Check similar features before creating new patterns
4. **Respect brand voice** - Use `/act-brand-alignment` for any user-facing content
5. **Update types after schema changes** - Run `npm run db:types`
6. **Test knowledge extractors carefully** - Gmail and Notion scanners affect real data
7. **Document as you go** - Add to appropriate `docs/` category

---

**Last Updated**: 2024-12-26
**Maintained By**: Ben Knight + Claude AI
**Questions?** Check `.claude/SKILLS_GUIDE.md` or ask for help!
