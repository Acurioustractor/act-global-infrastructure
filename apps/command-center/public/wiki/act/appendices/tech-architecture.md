---
title: ACT Technical Architecture
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/technical/act-architecture.md`.
> Regenerated: `2026-04-11T02:58:52.891Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# ACT Technical Architecture

> Infrastructure serves the work. Quiet systems create room for people to show up.

## Overview

ACT's technical stack is built around three principles: community data sovereignty (no vendor lock-in, exportable data), consent-first architecture (OCAP baked into database design), and beautiful obsolescence (open source, forkable, maintainable without ACT). This article documents the system architecture and key technical patterns.

## System Overview

```
                       ┌─────────────────┐
                       │   CDN/Edge      │
                       │   (Vercel)      │
                       └────────┬────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ↓                     ↓                     ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ ACT Studio      │   │ Empathy Ledger  │   │ JusticeHub      │
│ (Next.js)       │   │ (Next.js)       │   │ (Next.js)       │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                ↓
                       ┌─────────────────┐
                       │   Supabase      │
                       │   (PostgreSQL)  │
                       └────────┬────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ↓                     ↓                     ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Auth            │   │ Storage         │   │ Edge Functions  │
│ (JWT)           │   │ (S3-compat)     │   │ (Deno)          │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Three Supabase Instances

ACT runs three separate Supabase projects. Always verify which instance you're connecting to before running queries.

| Project | Ref | Used by |
|---------|-----|---------|
| **Shared ACT/GrantScope** | `tednluwflfhxyucgwigh` | Command Center, bot, GrantScope, scripts |
| **Empathy Ledger v2** | `yvnuayzslukamizrlhwb` | Empathy Ledger v2 app |
| **EL unused** | `uaxhjzqrdotoahjnxmbj` | No active credentials |

## Database Design

### Core Tables

The database is structured around organizations as the tenant root — enabling multi-tenancy while keeping community data isolated:

- **organizations** — tenant root with settings JSONB
- **users** — linked to auth.users, with role (member/admin/owner)
- **projects** — org-scoped, unique slug per org
- **stories** — Empathy Ledger content, with consent_settings JSONB and alma_signals JSONB
- **consent_log** — full audit trail of consent changes

### Row Level Security

All tables use RLS policies that enforce:
- Organization isolation (tenant_id from JWT)
- Public read only for explicitly consented stories
- Author full access to their own content
- Admin access within org boundary

RLS is non-negotiable. Consent cannot be bypassed at the query level.

### Consent Architecture

Consent is a separate `consent_records` table — not columns on storytellers — to maintain full audit history. See [[consent-as-infrastructure|Consent as Infrastructure]] for the detailed argument.

Consent is checked at query time on every access, not cached at publication. The 15ms performance cost is accepted as a sovereignty requirement.

### Vector Search (pgvector)

Stories include a vector embedding column (`vector(1536)`) for semantic search. Indexed with `ivfflat` for performance. Used for cross-story pattern matching in [[alma|ALMA]] analysis.

## API Patterns

### Registry Endpoint

Each project exposes a standardized `/api/registry` endpoint for ecosystem aggregation:

```typescript
// Standard response shape
{
  meta: {
    project: string,
    version: string,
    last_updated: string,
    total_items: number,
    filters_available: string[]
  },
  items: [...],
  pagination: { page, per_page, total_pages, total_items }
}
```

Only consented (`consent_settings->>'public' = 'true'`) published stories appear in registry responses.

### Authentication

JWT tokens carry `tenant_id` and `role`. Middleware protects `/dashboard/:path*` and `/api/protected/:path*`. Auth uses Supabase's session-based flow via `@supabase/auth-helpers-nextjs`.

### GHL Integration

User form submissions flow: Form → Next.js API Route → Validation → GHL API → Pipeline → Automation → Webhook back → UI update.

## Caching Strategy

| Pattern | Usage | Revalidation |
|---------|-------|-------------|
| SSG | Project pages, static content | Every hour |
| SSR | Dynamic data requiring auth | No cache |
| API cache headers | Registry endpoints | 5 minutes |

## Deployment Pipeline

```
1. Push to branch
2. GitHub Actions: lint + typecheck + tests
3. Vercel preview deployment (auto)
4. PR review + approval
5. Merge to main → Vercel production build
6. Post-deploy: cache purge, sitemap, registry update
```

## Monitoring

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| API response time | Vercel Analytics | > 2s p95 |
| Error rate | Sentry | > 1% |
| Database connections | Supabase | > 80% pool |
| Build time | Vercel | > 5 min |

## Environment Configuration

Required environment variables for each app:

```
NEXT_PUBLIC_SUPABASE_URL       Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  Public anon key
SUPABASE_SERVICE_KEY           Service role key (server-side only)
NEXTAUTH_SECRET                Session secret
NEXTAUTH_URL                   Canonical URL
GHL_API_KEY                    GoHighLevel CRM
GHL_LOCATION_ID
NOTION_TOKEN                   Notion integration
ANTHROPIC_API_KEY              AI analysis
OPENAI_API_KEY                 Embeddings
```

Environment hierarchy: `.env.local` → Vercel environment variables → injected at build time.

## Mono-Repo Structure

The codebase is a pnpm workspace:

```
apps/
  command-center/     # Main dashboard (Next.js, port 3002)
  website/            # Public website (Next.js)
packages/
  act-ui/             # Shared UI components
scripts/              # 110+ operational scripts
scripts/lib/          # 26 shared script modules
config/               # Shared configuration JSON
supabase/             # Database migrations
archive/              # Legacy code — do not add features
```

New features: UI goes in `apps/command-center/`, API routes in `apps/command-center/src/app/api/`, standalone scripts in `scripts/`.

## Data Flow: Story Creation

```
1. User creates account → JWT with tenant_id + role
2. User shares story → Validation (Zod) → Supabase insert with default consent (private)
3. User sets consent → Update consent_settings JSON → Triggers consent_log audit
4. Public views story → RLS filters: consent.public = true
5. Story appears in registry → Daily cron aggregates consented stories
6. ACT Hub aggregates → Fetches from project registries → Links to canonical URLs
```

## Backlinks

- [[transcription-workflow|Transcription Workflow]] — how Empathy Ledger transcripts flow through the system
- [[vignette-workflows|Vignette Workflows]] — how stories connect to the compendium
- [[consent-as-infrastructure|Consent as Infrastructure]] — architectural argument behind the consent design
- [[alma|ALMA]] — the impact model that reads from this data
- [[ways-of-working|Ways of Working]] — the operational discipline this architecture is meant to support quietly and reliably
