# ACT Ecosystem - Claude Rules

## Mono-Repo Structure

This is a pnpm workspace mono-repo containing the entire ACT ecosystem.

```
apps/
  command-center/     # Main dashboard (Next.js, port 3001)
  website/            # Public website (Next.js, port 3002)
packages/
  act-ui/             # Shared UI components
scripts/              # 110+ operational scripts
scripts/lib/          # 26 shared script modules
config/               # Shared configuration JSON
supabase/             # Database migrations
archive/
  act-dashboard/      # LEGACY HTML dashboards (DO NOT USE)
  intelligence-platform/  # Reference only (absorbed into command-center)
```

## Where to Build New Features

| Feature Type | Location |
|-------------|----------|
| Dashboard UI | `apps/command-center/` (Next.js React) |
| Public website | `apps/website/` (Next.js) |
| API endpoints | `apps/command-center/src/app/api/` |
| Standalone scripts | `scripts/` |
| Shared libraries | `scripts/lib/` |

## NEVER Touch

- `archive/act-dashboard/` - Legacy HTML dashboards, archived
- `archive/intelligence-platform/` - Reference code only, being absorbed into command-center

## API Development

When building new API endpoints:
1. Add to `apps/command-center/src/app/api/` (Next.js API routes)
2. Use `@/lib/supabase` for server-side Supabase client in API routes

## Strict Rules

- **NEVER add features to `archive/`** - these are read-only reference code
- **ALL new UI work** goes in `apps/command-center/` or `apps/website/`
- **ALL new API routes** go in `apps/command-center/src/app/api/`
- The React app calls its own API routes (no external API server dependency)

## Workspace Commands

```bash
pnpm --filter @act/command-center dev   # Start dashboard
pnpm --filter @act/website dev          # Start website
./dev start                              # Start via PM2
./dev cron                               # Start cron scripts
./dev all                                # Start everything
```
