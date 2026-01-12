# ACT Tech Stack

## Frontend

### Framework
- **Next.js 15** - App Router, Server Components
- **React 18+** - With Server Components
- **TypeScript** - Strict mode enabled

### Styling
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library (not installed as dependency, copied into project)
- **Radix UI** - Accessible primitives

### State Management
- React Server Components (preferred)
- React Context for client state
- Zustand for complex client state (where needed)

## Backend

### Database
- **Supabase** - PostgreSQL with realtime
- Row Level Security (RLS) for multi-tenant isolation
- `tenant_id` column on all multi-tenant tables

### Authentication
- **Supabase Auth** - Email, OAuth providers
- Session-based with JWT tokens
- Role-based access (admin, org_admin, member, storyteller)

### API
- Next.js API Routes (`/app/api/`)
- Server Actions for form mutations
- RESTful patterns

### File Storage
- **Supabase Storage** - For media files
- Signed URLs for private content
- Image optimization via Next.js

## AI/ML

### LLM Integration
- **OpenAI** - GPT-4 for analysis
- **Anthropic Claude** - Alternative provider
- Rate limiting and cost controls

### ALMA (Empathy Ledger)
- Transcript analysis pipeline
- Theme extraction
- Relationship mapping
- Sentiment analysis

## DevOps

### Hosting
- **Vercel** - Frontend deployment
- **Supabase** - Database hosting
- Environment-based deployments (dev, staging, prod)

### CI/CD
- GitHub Actions for testing
- Vercel preview deployments on PR
- Database migrations via Supabase CLI

### Monitoring
- Vercel Analytics
- Supabase Dashboard
- Error tracking (consider Sentry)

## Development Tools

### Code Quality
- ESLint + Prettier
- TypeScript strict mode
- Husky pre-commit hooks

### Testing
- Jest for unit tests
- Playwright for E2E (where configured)
- Storybook for component development (where configured)

### AI Assistance
- **Claude Code** - Primary development assistant
- **Vibe Kanban** - Task orchestration (`npx vibe-kanban`)
- Claude skills in `.claude/skills/`

## Common Patterns

### API Route Pattern
```typescript
// app/api/resource/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('table')
    .select('*')

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
```

### Server Component Pattern
```typescript
// app/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('table').select('*')

  return <div>{/* render data */}</div>
}
```

### Multi-Tenant Query Pattern
```typescript
// Always filter by tenant_id
const { data } = await supabase
  .from('stories')
  .select('*')
  .eq('tenant_id', currentTenantId)
```
