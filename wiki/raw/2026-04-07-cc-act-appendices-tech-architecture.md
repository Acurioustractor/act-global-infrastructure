---
title: Technical Architecture
slug: tech-architecture
website_path: null
excerpt: "Detailed technical documentation for ACT infrastructure"
status: published
last_updated: 2026-01-12
shareability: INTERNAL
---

# Technical Architecture

Detailed technical documentation for ACT infrastructure. For high-level overview, see [Infrastructure](../05-operations/infrastructure.md).

---

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

---

## Database Schema

### Core Tables

```sql
-- Organizations (tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Stories (Empathy Ledger)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  author_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  consent_settings JSONB NOT NULL DEFAULT '{"public": false}',
  alma_signals JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Consent Log (audit trail)
CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  previous_settings JSONB,
  new_settings JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security

```sql
-- Organization isolation
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_isolation ON stories
  FOR ALL
  USING (organization_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Public read for consented stories
CREATE POLICY public_read ON stories
  FOR SELECT
  USING (consent_settings->>'public' = 'true' AND status = 'published');

-- Author full access
CREATE POLICY author_access ON stories
  FOR ALL
  USING (author_id = auth.uid());

-- Admin access within organization
CREATE POLICY admin_access ON stories
  FOR ALL
  USING (
    organization_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND auth.jwt() ->> 'role' IN ('admin', 'owner')
  );
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_stories_org ON stories(organization_id);
CREATE INDEX idx_stories_project ON stories(project_id);
CREATE INDEX idx_stories_author ON stories(author_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_consent_public ON stories((consent_settings->>'public'));

-- Full-text search
CREATE INDEX idx_stories_search ON stories
  USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
```

---

## API Architecture

### Registry Endpoint Pattern

Each project exposes a standardized `/api/registry` endpoint:

```typescript
// app/api/registry/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '20'), 100);
  const type = searchParams.get('type');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  let query = supabase
    .from('stories')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .eq('consent_settings->>public', 'true')
    .order('published_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    meta: {
      project: 'empathy-ledger',
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      total_items: count,
      filters_available: ['type', 'status', 'tag']
    },
    items: data?.map(story => ({
      id: story.id,
      type: 'story',
      title: story.title,
      summary: story.content?.substring(0, 200),
      slug: story.slug,
      canonical_url: `https://empathy-ledger.app/stories/${story.slug}`,
      tags: story.tags,
      status: story.status,
      created_at: story.created_at,
      updated_at: story.updated_at,
      metadata: {
        alma_signals: story.alma_signals
      }
    })),
    pagination: {
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      total_items: count
    }
  });
}
```

### Authentication Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // API routes with auth
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

---

## Data Flow Patterns

### User Story Creation Flow

```
1. User Creates Account
   ↓
   GitHub → Vercel → Next.js → Supabase Auth
   ↓
   JWT token with tenant_id + role
   ↓
   User profile created with RLS

2. User Shares Story
   ↓
   Form Submission → Validation (Zod)
   ↓
   API Route → Supabase Insert
   ↓
   RLS checks tenant_id
   ↓
   Story saved with default consent (private)

3. User Sets Consent
   ↓
   Consent Form → Granular Options
   ↓
   API Route → Update consent_settings JSON
   ↓
   Triggers: consent_log, audit_trail

4. Public Views Story
   ↓
   Browse Page → Fetch Public Stories
   ↓
   RLS filters: consent.public = true
   ↓
   Only consented stories returned

5. Story Appears in Registry
   ↓
   Cron Job (daily) → Build Registry
   ↓
   Aggregates consented stories
   ↓
   Caches at /api/registry

6. ACT Hub Aggregates
   ↓
   Fetches from Empathy Ledger registry
   ↓
   Displays in ecosystem feed
   ↓
   Links back to canonical URL
```

### GHL Integration Flow

```
User Submits Form (any ACT site)
   ↓
Form Data → Next.js API Route
   ↓
Validation → GHL API Call
   ↓
Create Contact in GHL
   ↓
Add to Pipeline (project-specific)
   ↓
Trigger Automation (email sequence)
   ↓
Webhook Back to Site (status update)
   ↓
Update UI + Send Notification
```

---

## Environment Configuration

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://example.com

# GoHighLevel
GHL_API_KEY=xxx
GHL_LOCATION_ID=xxx

# Notion
NOTION_TOKEN=xxx
NOTION_DATABASE_ID=xxx

# AI
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx

# Analytics
VERCEL_ANALYTICS_ID=xxx
SENTRY_DSN=xxx
```

### Environment Hierarchy

```
.env.local (local development - git ignored)
   ↓
Vercel Environment Variables (per environment)
   ↓
Injected at build time
   ↓
Available via process.env.VAR_NAME
```

---

## Caching Strategy

### Static Generation (SSG)

```typescript
// Revalidate every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}
```

### Server-Side Rendering (SSR)

```typescript
// Dynamic data, no caching
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchRealTimeData();
  return NextResponse.json(data);
}
```

### API Response Caching

```typescript
// Cache for 5 minutes
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

---

## Vector Search (pgvector)

### Setup

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE stories ADD COLUMN embedding vector(1536);

-- Create index
CREATE INDEX idx_stories_embedding ON stories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Semantic Search

```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

async function semanticSearch(query: string, limit = 10) {
  const openai = new OpenAI();
  const supabase = createClient(url, key);

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Search
  const { data, error } = await supabase.rpc('match_stories', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit,
  });

  return data;
}
```

```sql
-- Search function
CREATE FUNCTION match_stories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    stories.id,
    stories.title,
    stories.content,
    1 - (stories.embedding <=> query_embedding) as similarity
  FROM stories
  WHERE
    stories.status = 'published'
    AND stories.consent_settings->>'public' = 'true'
    AND 1 - (stories.embedding <=> query_embedding) > match_threshold
  ORDER BY stories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Deployment Pipeline

```
1. Developer pushes to branch
   ↓
2. GitHub Actions run:
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Tests (Jest, Playwright)
   ↓
3. Vercel detects push:
   - Build preview deployment
   - Run build checks
   - Deploy to preview URL
   ↓
4. PR review + approval
   ↓
5. Merge to main:
   - Vercel production build
   - Environment variables injected
   - Deploy to production
   ↓
6. Post-deploy:
   - Cache purge
   - Sitemap generation
   - Registry update (if applicable)
```

---

## Monitoring

### Metrics

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| API response time | Vercel Analytics | > 2s p95 |
| Error rate | Sentry | > 1% |
| Database connections | Supabase | > 80% pool |
| Build time | Vercel | > 5 min |

### Logging

```typescript
// Structured logging
import { logger } from '@/lib/logger';

logger.info('Story created', {
  storyId: story.id,
  organizationId: story.organization_id,
  userId: story.author_id,
});

logger.error('API error', {
  error: error.message,
  stack: error.stack,
  requestId: headers['x-request-id'],
});
```

---

*See also: [Infrastructure](../05-operations/infrastructure.md) | [Website Integration](../03-ecosystem/website-integration.md) | [Farmhand & AI](../05-operations/farmhand-ai.md)*
