# Feature Plan: Mono-Repo Consolidation

Created: 2026-01-30
Author: architect-agent

## Overview

Consolidate three ACT ecosystem repositories (act-global-infrastructure, act-intelligence-platform, act-regenerative-studio) into a single pnpm workspace mono-repo. The existing act-global-infrastructure repo is the target; the other two repos are merged in as workspace packages with full git history preserved. The result is one repo, one install, one dev command, shared dependencies, and a single CI/CD surface.

## Current State (VERIFIED)

### Repo 1: act-global-infrastructure (this repo)
- **Role:** Backend brain -- 110+ scripts, 35 Supabase migrations, PM2 cron jobs, config, shared libs
- **Apps:**
  - `apps/command-center-v2/` -- Next.js React dashboard (port 3001), 16+ pages, Tailwind + shadcn/ui
  - `packages/act-dashboard/` -- LEGACY HTML dashboards + Express api-server.mjs (port 3456). DO NOT EXTEND.
  - `packages/act-ui/` -- Shared UI component library (nascent)
  - `packages/act-voice/` -- Voice processing (nascent)
  - `clawdbot-docker/` -- Telegram/Signal bot, Docker Compose, deploys to NAS
- **Scripts:** `scripts/` (110+ .mjs files), `scripts/lib/` (26 shared modules)
- **Config:** `config/` (14 JSON/MD files), `.github/workflows/` (27 workflows)
- **Infra:** `ecosystem.config.cjs` (PM2), `vercel.json`, `supabase/`
- **Root package.json:** 122 npm scripts, 10 dependencies, type: module

### Repo 2: act-intelligence-platform
- **Role:** React Intelligence UI -- 7 tabs, 80+ components, port 3999
- **Tech:** React, Supabase client, REST API routes
- **Status:** Being absorbed into command-center per ux-overhaul-single-dashboard.md plan
- **Key assets to preserve:** Component code for migration reference, any unique API routes
- **Note:** Most features already duplicated or planned for CC v2. This repo becomes an archive reference.

### Repo 3: act-regenerative-studio
- **Role:** ACT public website -- Next.js 15, React 19, TypeScript, Tailwind
- **Package name:** `act-main-website`
- **Tech:** Next.js app router, Supabase, Gmail OAuth, Google APIs, Notion
- **Features:** Living Wiki, Knowledge Base, GHL integration, Empathy Ledger, Multi-project dashboard
- **Has its own:** `ecosystem.config.js` (PM2 managing 6 project dev servers), `.claude/skills/`, `opc/`, `docs/`
- **Deploys:** Vercel (production website)

### Shared Data Layer
- **Supabase project:** `tednluwflfhxyucgwigh.supabase.co` -- used by all three repos
- **Shared env vars:** SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, NOTION_TOKEN, GHL_API_KEY, etc.

## Requirements

- [ ] Single `git clone` gets the entire ACT ecosystem
- [ ] Single `pnpm install` at root installs all workspace dependencies
- [ ] Each app can be built/dev'd independently (`pnpm --filter <app> dev`)
- [ ] Shared packages (supabase client, UI components, config) are workspace dependencies
- [ ] Git history from all three repos preserved
- [ ] Vercel deployments continue working (one per deployable app)
- [ ] ClawdBot Docker build still works from its subdirectory
- [ ] CI/CD workflows consolidated
- [ ] PM2 ecosystem config updated for mono-repo paths
- [ ] No breaking changes to Supabase schema or data

## Design

### Workspace Tooling Decision

**Use pnpm workspaces** (not Turborepo, not Nx).

Rationale:
- The project is 95% JavaScript/Node.js .mjs scripts, not compiled TypeScript libraries
- There is no complex build graph -- apps are independent Next.js projects
- pnpm workspaces give dependency hoisting and workspace protocol (`workspace:*`) with zero config overhead
- Turborepo adds value for build caching across many interdependent packages; ACT has 2-3 apps and some shared libs -- not enough to justify the tooling tax
- The founder works solo with Claude; simplicity beats sophistication

### Target Directory Layout

```
act-ecosystem/                          # renamed repo root
|-- pnpm-workspace.yaml                 # workspace definition
|-- package.json                        # root scripts, shared devDependencies
|-- .npmrc                              # pnpm config (shamefully-hoist for Next.js compat)
|-- .env.local                          # shared env vars (gitignored)
|-- .envrc                              # direnv loader
|
|-- apps/
|   |-- command-center/                 # renamed from command-center-v2
|   |   |-- package.json               # name: @act/command-center
|   |   |-- next.config.ts
|   |   +-- src/app/                    # all dashboard routes
|   |
|   |-- website/                        # FROM act-regenerative-studio
|   |   |-- package.json               # name: @act/website
|   |   |-- next.config.js
|   |   +-- src/                        # Next.js app router, components, lib
|   |
|   +-- clawdbot/                       # renamed from clawdbot-docker
|       |-- package.json               # name: @act/clawdbot
|       |-- Dockerfile
|       |-- docker-compose.yml
|       +-- ...
|
|-- packages/
|   |-- supabase-client/                # NEW: shared Supabase client + types
|   |   |-- package.json               # name: @act/supabase-client
|   |   |-- index.ts
|   |   +-- types/                     # generated from supabase gen types
|   |
|   |-- config/                         # FROM config/ (shared JSON configs)
|   |   |-- package.json               # name: @act/config
|   |   |-- notion-database-ids.json
|   |   |-- project-codes.json
|   |   +-- ...
|   |
|   |-- ui/                             # FROM packages/act-ui (shared components)
|   |   |-- package.json               # name: @act/ui
|   |   +-- src/
|   |
|   +-- shared/                         # NEW: shared utilities (env loading, LLM client)
|       |-- package.json               # name: @act/shared
|       |-- load-env.mjs
|       +-- llm-client.mjs
|
|-- scripts/                            # STAYS: all 110+ operational scripts
|   |-- lib/                            # STAYS: 26 shared script modules
|   +-- ...
|
|-- supabase/                           # STAYS: migrations, config
|   +-- migrations/
|
|-- .github/
|   +-- workflows/                      # CONSOLIDATED: all workflows
|
|-- docs/                               # MERGED: docs from all repos
|   |-- architecture/
|   |-- features/
|   |-- integrations/
|   |-- strategy/
|   +-- website/                        # FROM act-regenerative-studio/docs
|
|-- archive/
|   |-- act-dashboard/                  # FROM packages/act-dashboard (legacy HTML)
|   +-- intelligence-platform/          # Reference copy of key IP components
|
|-- ecosystem.config.cjs                # UPDATED: mono-repo paths
+-- CLAUDE.md                           # UPDATED: mono-repo rules
```

### Key Naming Decisions

| Current | New | Rationale |
|---------|-----|-----------|
| `act-global-infrastructure` | `act-ecosystem` | Reflects unified purpose |
| `apps/command-center-v2/` | `apps/command-center/` | Drop the "v2" -- there is no v1 anymore |
| `act-regenerative-studio` | `apps/website/` | Clear purpose; "regenerative studio" is the brand, not the code |
| `act-intelligence-platform` | `archive/intelligence-platform/` | Being absorbed into command-center |
| `clawdbot-docker/` | `apps/clawdbot/` | Consistent with apps/ convention |
| `packages/act-dashboard/` | `archive/act-dashboard/` | Legacy; archived not deleted |

### What Stays As-Is

| Item | Location | Why |
|------|----------|-----|
| `scripts/` (110+ files) | Root `scripts/` | Operational scripts, not app code. Moving into a package adds complexity for zero benefit. |
| `supabase/` | Root `supabase/` | Supabase CLI expects this location. One set of migrations for the whole ecosystem. |
| `.github/workflows/` | Root `.github/workflows/` | GitHub Actions requires this path. |
| `.claude/` | Root `.claude/` | Claude Code skills/config at repo root. |
| `config/` | Root `config/` | See "Critical Risk: Script Import Paths" below. |
| `lib/` | Root `lib/` | Same reason as config. |

### What Gets Deleted

| Item | Why |
|------|-----|
| `packages/act-voice/` | Empty/nascent; recreate when needed |
| Duplicate docs across repos | Merge and deduplicate |
| `act-regenerative-studio/ecosystem.config.js` | Superseded by root ecosystem.config.cjs |
| `act-regenerative-studio/opc/` | Merge into root `opc/` or keep if structure differs |

### Shared Dependencies (Hoisted to Root)

These dependencies are used by 2+ packages and should be in the root `package.json`:

| Dependency | Used By |
|------------|---------|
| `@supabase/supabase-js` | command-center, website, scripts, clawdbot |
| `@anthropic-ai/sdk` | scripts, website |
| `openai` | scripts, website |
| `@notionhq/client` | scripts, website |
| `dotenv` | scripts, website |
| `googleapis` | scripts, website, clawdbot |
| `react`, `react-dom` | command-center, website |
| `next` | command-center, website |
| `tailwindcss` | command-center, website, ui |
| `typescript` | command-center, website, ui |

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json (key fields)

```json
{
  "name": "act-ecosystem",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @act/command-center dev",
    "dev:website": "pnpm --filter @act/website dev",
    "dev:all": "pnpm --parallel --filter './apps/*' dev",
    "build": "pnpm --parallel --filter './apps/*' build",
    "build:cc": "pnpm --filter @act/command-center build",
    "build:website": "pnpm --filter @act/website build",
    "lint": "pnpm --parallel --filter './apps/*' lint",
    "pm2:start": "pm2 start ecosystem.config.cjs",
    "pm2:stop": "pm2 stop all"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

Note: All 122 existing npm scripts (`sync:ghl`, `project:status`, etc.) remain in root package.json unchanged.

### .npmrc

```ini
shamefully-hoist=true
```

### Data Flow (Unchanged)

```
                    +------------------+
                    |    Supabase      |
                    |  (PostgreSQL +   |
                    |   pgvector)      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
    +---------+------+ +----+------+ +-----+----------+
    | command-center | |  website  | |   scripts/     |
    | (Next.js API   | | (Next.js  | | (Node.js       |
    |  routes)       | |  public)  | |  cron/CLI)     |
    +----------------+ +-----------+ +----------------+
```

All apps share `@supabase/supabase-js` via pnpm hoisting. No cross-app API calls needed.

## Implementation Phases

### Phase 0: Preparation (Before Any Code Changes)
**Duration:** 1 session

**Steps:**
1. Create a new branch: `feat/mono-repo-consolidation`
2. Install pnpm globally: `npm install -g pnpm`
3. Snapshot current state:
   - Tag act-global-infrastructure: `git tag v1-pre-monorepo`
   - Tag act-regenerative-studio: `git tag v1-pre-monorepo`
   - Tag act-intelligence-platform: `git tag v1-pre-monorepo`
4. Verify all three repos have clean working trees
5. Export a list of all env vars used across repos (merge .env files)

**Acceptance:**
- [ ] All repos tagged
- [ ] pnpm installed
- [ ] Env var inventory complete

**Estimated effort:** Small

---

### Phase 1: Git History Merge
**Duration:** 1 session

**Strategy:** Use `git subtree add` to bring each external repo into the target repo with full commit history attribution.

```bash
# From act-global-infrastructure root:

# 1. Add act-regenerative-studio as subtree
git remote add studio-remote /Users/benknight/Code/act-regenerative-studio
git fetch studio-remote
git subtree add --prefix=_import/studio studio-remote main --squash

# 2. Add act-intelligence-platform as subtree
git remote add intel-remote /Users/benknight/Code/act-intelligence-platform
git fetch intel-remote
git subtree add --prefix=_import/intelligence intel-remote main --squash

# 3. Clean up remotes
git remote remove studio-remote
git remote remove intel-remote
```

**Why `--squash`:** Full history merge creates a tangled commit graph. Squash gives a clean merge point while the original repos retain full history (tagged at v1-pre-monorepo). If detailed file history is needed later, check the original repo tags.

**Alternative (full history):** Use `git merge --allow-unrelated-histories` with a git-filter-repo prefix rewrite. This preserves every commit but makes `git log` noisy. Not recommended for this project scale.

**Acceptance:**
- [ ] Studio code exists at `_import/studio/`
- [ ] Intelligence code exists at `_import/intelligence/`
- [ ] Git log shows merge commits with source attribution

**Estimated effort:** Small

---

### Phase 2: Directory Restructure
**Duration:** 1-2 sessions

**Steps (in order):**

1. Initialize pnpm workspace: create `pnpm-workspace.yaml` and `.npmrc` at root
2. Move studio app into `apps/website/`:
   - `_import/studio/src` -> `apps/website/src`
   - `_import/studio/public` -> `apps/website/public`
   - `_import/studio/package.json` -> `apps/website/package.json`
   - `_import/studio/next.config.js` -> `apps/website/next.config.js`
   - `_import/studio/tailwind.config.ts` -> `apps/website/tailwind.config.ts`
   - `_import/studio/tsconfig.json` -> `apps/website/tsconfig.json`
   - `_import/studio/postcss.config.js` -> `apps/website/postcss.config.js`
   - `_import/studio/vercel.json` -> `apps/website/vercel.json`
3. Move studio docs: `_import/studio/docs` -> `docs/website/`
4. Move studio opc into root: `_import/studio/opc` -> `opc/` (merge if needed)
5. Rename command-center-v2: `apps/command-center-v2` -> `apps/command-center`
6. Move clawdbot: `clawdbot-docker` -> `apps/clawdbot`
7. Archive legacy dashboard: `packages/act-dashboard` -> `archive/act-dashboard`
8. Archive intelligence platform: `_import/intelligence` -> `archive/intelligence-platform`
9. Create shared packages: `packages/supabase-client/`, `packages/shared/`
10. Clean up: remove `_import/`, `packages/act-voice/`

**Acceptance:**
- [ ] `apps/command-center/` builds with `pnpm --filter @act/command-center build`
- [ ] `apps/website/` builds with `pnpm --filter @act/website build`
- [ ] `apps/clawdbot/` Docker builds
- [ ] All scripts still run from root
- [ ] No broken imports

**Estimated effort:** Medium

---

### Phase 3: Package Configuration
**Duration:** 1 session

**Steps:**

1. Update each app's `package.json` with `@act/` scoped workspace name
2. Create `packages/supabase-client/package.json` with shared Supabase client
3. Create `packages/shared/package.json` for env loading and LLM client
4. Update root `package.json`: name to `act-ecosystem`, add pnpm workspace scripts
5. Run `pnpm install` to generate lockfile
6. Update import paths in `apps/command-center/` and `apps/website/` to use workspace packages where beneficial (Supabase client, config)
7. Keep `scripts/` import paths unchanged (they use relative `../config/` etc.)

**Acceptance:**
- [ ] `pnpm install` succeeds at root with no errors
- [ ] `pnpm --filter @act/command-center dev` starts the dashboard
- [ ] `pnpm --filter @act/website dev` starts the website
- [ ] Workspace dependency graph is correct

**Estimated effort:** Medium

---

### Phase 4: PM2 and Dev Tooling Update
**Duration:** 1 session

**Update `ecosystem.config.cjs`:**

```javascript
const CWD = '/Users/benknight/Code/act-ecosystem'; // or current path

module.exports = {
  apps: [
    {
      name: 'command-center',
      script: 'pnpm',
      args: '--filter @act/command-center dev',
      cwd: CWD,
      // ...existing config
    },
    {
      name: 'website',
      script: 'pnpm',
      args: '--filter @act/website dev',
      cwd: CWD,
      // ...existing config
    },
    // All cron scripts stay unchanged -- they reference scripts/ from root
  ]
};
```

**Update `start-dev.sh`** to use pnpm filter commands.

**Acceptance:**
- [ ] `pm2 start ecosystem.config.cjs` launches all apps
- [ ] All cron scripts still trigger correctly
- [ ] `./start-dev.sh` works

**Estimated effort:** Small

---

### Phase 5: CI/CD Consolidation
**Duration:** 1 session

**Vercel:**
- Each app gets its own Vercel project pointing to the mono-repo
- Command Center: Root directory = `apps/command-center`, build = `pnpm --filter @act/command-center build`
- Website: Root directory = `apps/website`, build = `pnpm --filter @act/website build`
- Set install command to `pnpm install` in Vercel project settings

**GitHub Actions:**
- Merge workflows from act-regenerative-studio into `.github/workflows/`
- Add path filters so website-only changes do not trigger infrastructure workflows:

```yaml
# website-deploy.yml
on:
  push:
    branches: [main]
    paths:
      - 'apps/website/**'
      - 'packages/**'
```

- Consolidate duplicate workflows (both repos had snapshot-sprint, sync-notion)
- Update all workflow steps to use `pnpm` instead of `npm`

**ClawdBot Docker:**
- Build context is now `apps/clawdbot/` instead of `clawdbot-docker/`
- Update `build-for-nas.sh` and `push-to-vps.sh` paths

**Acceptance:**
- [ ] Vercel deploys command-center on push to `apps/command-center/`
- [ ] Vercel deploys website on push to `apps/website/`
- [ ] All GitHub Actions pass
- [ ] ClawdBot Docker builds from new path

**Estimated effort:** Medium

---

### Phase 6: Cleanup and Documentation
**Duration:** 1 session

1. Update `CLAUDE.md` for mono-repo rules (new directory conventions, workspace commands)
2. Update all docs referencing old repo paths
3. Archive old repos on GitHub:
   - `act-intelligence-platform` -> Archive (read-only)
   - `act-regenerative-studio` -> Archive, add README pointing to mono-repo
   - Keep `act-global-infrastructure` as live repo (rename on GitHub to `act-ecosystem`)
4. Update `.mcp.json` paths
5. Update `config/repos.json` to reflect mono-repo structure
6. Update `.claude/skills/` paths if any reference old locations

**Acceptance:**
- [ ] All docs reference mono-repo paths
- [ ] Old repos archived on GitHub
- [ ] CLAUDE.md reflects new structure
- [ ] No scripts reference old paths

**Estimated effort:** Small

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Broken import paths after move | High | High | Grep for all old paths (`../config/`, `../../lib/`) before declaring Phase 2 complete. Use find-and-replace. |
| Vercel deployment breaks | High | Medium | Test Vercel preview deploys on a branch before merging to main. Each app needs its own Vercel project. |
| pnpm hoisting breaks Next.js | Medium | Low | Use `shamefully-hoist=true` in `.npmrc`. Standard workaround. |
| ClawdBot Docker context breaks | Medium | Medium | Test `docker build` from `apps/clawdbot/` before merging. Update COPY paths in Dockerfile. |
| PM2 paths break | Low | Medium | Test each PM2 app individually before running full ecosystem. |
| Env vars not found by apps | High | Medium | Both Next.js apps need `.env.local`. Use symlinks or a shared load-env utility that resolves to mono-repo root. |
| Git subtree makes history messy | Low | Medium | Use `--squash` for clean merge point. Tag original repos for full history. |

### Critical Risk: Script Import Paths

The 110+ scripts in `scripts/` use relative imports like:
```javascript
import { loadEnv } from '../lib/load-env.mjs';
import projectCodes from '../config/project-codes.json' assert { type: 'json' };
```

Moving `config/` and `lib/` into `packages/` would break every script.

**Recommended approach:** Keep `config/` and `lib/` at root as-is. Apps that want clean imports can use workspace packages that re-export from root locations. Scripts continue using relative paths unchanged. This avoids a 100+ file migration and is the pragmatic choice.

## Open Questions

- [ ] **Rename on GitHub?** Renaming `act-global-infrastructure` to `act-ecosystem` on GitHub will break existing links, CI references, and clone URLs. Should we rename immediately, or set up a redirect first?
- [ ] **Intelligence Platform scope?** How much IP code needs to be preserved vs. just archived? The UX overhaul plan identifies 6 features to migrate -- should those components be copied into `apps/command-center/src/` during this consolidation or deferred to the UX overhaul phase?
- [ ] **Website Vercel project?** Is act-regenerative-studio currently deployed to Vercel in production? If so, we need to update the Vercel project to point to the mono-repo `apps/website/` directory.
- [ ] **pnpm adoption friction?** The entire ecosystem currently uses npm. Switching to pnpm requires updating all CI workflows and developer habits. Is the founder ready for this change?
- [ ] **Studio src/ directory?** The `act-regenerative-studio` glob for `src/**/*` returned no files, suggesting the src directory may be inside a git submodule or the checkout is sparse. Verify the studio repo has a complete checkout before Phase 1.

## Success Criteria

1. `git clone <repo> && pnpm install` gets a working mono-repo
2. `pnpm --filter @act/command-center dev` starts dashboard on port 3001
3. `pnpm --filter @act/website dev` starts website on port 3002
4. All 110+ scripts run unchanged from root (`node scripts/<name>.mjs`)
5. All GitHub Actions workflows pass
6. Vercel deploys both apps independently
7. ClawdBot Docker builds and deploys to NAS
8. No duplicate dependencies across workspace packages
9. Single `.env.local` at root serves all apps and scripts
10. Old repos archived with README pointers to mono-repo

## Execution Order Summary

```
Phase 0: Prep + tagging               [1 session]
Phase 1: Git subtree merges           [1 session]
Phase 2: Directory restructure        [1-2 sessions]
Phase 3: Package configuration        [1 session]
Phase 4: PM2 + dev tooling            [1 session]
Phase 5: CI/CD consolidation          [1 session]
Phase 6: Cleanup + docs               [1 session]
                                      ---------------
Total estimated:                       6-8 sessions
```

Phases 1-3 can be done in a single focused day. Phases 4-6 follow the next day. The critical path is Phase 2 (directory moves) and Phase 3 (pnpm workspace wiring).
