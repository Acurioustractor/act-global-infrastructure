# ACT Ecosystem Overview

## About A Curious Tractor (ACT)

A Curious Tractor is a regenerative innovation studio supporting Indigenous communities and social enterprises through technology, storytelling, and community-led development.

## Core Projects

### Empathy Ledger (`empathy-ledger-v2`)
**Purpose:** Multi-tenant storytelling platform for Indigenous communities
**Tech:** Next.js 15, Supabase, TypeScript
**Key Features:**
- Storyteller profiles with cultural protocols
- ALMA (AI-assisted transcript analysis)
- Multi-tenant organization management
- Privacy-first consent management
**Path:** `/Users/benknight/Code/empathy-ledger-v2`

### JusticeHub
**Purpose:** Legal advocacy platform for Indigenous communities
**Tech:** Next.js, Supabase
**Key Features:**
- Legal document management
- Case tracking
- Integration with Empathy Ledger for storytelling
**Path:** `/Users/benknight/Code/JusticeHub`

### ACT Farm (`act-farm`)
**Purpose:** Farm management and community resource platform
**Tech:** Next.js, Supabase
**Key Features:**
- Crop and resource tracking
- Community asset management
- Seasonal planning
**Path:** `/Users/benknight/Code/act-farm`

### The Harvest (`the-harvest`)
**Purpose:** Community harvest and resource sharing
**Tech:** Next.js
**Path:** `/Users/benknight/Code/the-harvest`

### Goods (`goods`)
**Purpose:** Community goods and asset register
**Tech:** Next.js
**Path:** `/Users/benknight/Code/goods`

### ACT Placemat (`act-placemat`)
**Purpose:** Community event and gathering management
**Tech:** Next.js
**Path:** `/Users/benknight/Code/act-placemat`

### ACT Regenerative Studio (`act-regenerative-studio`)
**Purpose:** Main ACT website - acurioustractor.com
**Tech:** Next.js
**Key Features:**
- Studio information
- Project showcases
- Partnership and residency applications
**Path:** `/Users/benknight/Code/act-regenerative-studio`

### ACT Global Infrastructure (`act-global-infrastructure`)
**Purpose:** Shared tools, skills, and infrastructure
**Contains:**
- Global Claude skills (symlinked to all projects)
- act-agent CLI (deprecated, replaced by Vibe Kanban)
- Shared knowledge base (this directory)
**Path:** `/Users/benknight/act-global-infrastructure`

## Shared Infrastructure

### Database
- **Supabase** - Primary database for most projects
- Multi-tenant architecture with `tenant_id` isolation
- Row Level Security (RLS) for data protection

### Authentication
- Supabase Auth across projects
- Shared user profiles where applicable

### AI/ML
- **ALMA** - AI analysis for transcripts (Empathy Ledger)
- OpenAI/Anthropic integrations for content enrichment

### Task Orchestration
- **Vibe Kanban** - `npx vibe-kanban`
- Parallel agent execution
- Git worktree isolation

## Cross-Project Patterns

### Code Patterns
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui components
- Server components with client islands

### API Patterns
- RESTful routes in `/app/api/`
- Supabase client for database access
- Error handling with proper status codes

### Cultural Considerations
- All storyteller-facing features require cultural review
- OCAP principles (Ownership, Control, Access, Possession)
- Elder approval workflows where applicable
