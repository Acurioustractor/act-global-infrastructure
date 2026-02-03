# PM2 to GitHub Actions Migration Plan

## Overview

This document maps PM2 cron jobs to their GitHub Actions equivalents, identifies what must stay local vs what can migrate to the cloud, and lists required secrets.

## Migration Classification

### MUST STAY LOCAL (PM2)

These jobs access local macOS resources that can't run in the cloud:

| PM2 Job | Schedule | Reason |
|---------|----------|--------|
| `imessage-sync` | */15 * * * * | Accesses local ~/Library/Messages/chat.db |
| `embed-imessages` | 0 5 * * * | Depends on synced iMessage data |
| `detect-episodes` | 0 6 * * * | Depends on synced iMessage data |

### ALREADY HAS GITHUB ACTIONS EQUIVALENT

These PM2 jobs have corresponding workflows that can replace them:

| PM2 Job | PM2 Schedule | GitHub Actions Workflow | GHA Schedule |
|---------|--------------|------------------------|--------------|
| `daily-briefing` | 0 7 AEST | `daily-brief.yml` | 0 22 UTC (8am AEST) |
| `knowledge-pipeline` | 0 8 AEST | `knowledge-sync.yml` | 0 6 UTC (4pm AEST) |
| `meeting-sync` | 30 5 AEST | `knowledge-sync.yml` (step 1) | 0 6 UTC |

**Action:** Disable PM2 versions, rely on GitHub Actions.

### CAN MIGRATE TO GITHUB ACTIONS

These jobs have no cloud dependency and should move to GitHub Actions:

| PM2 Job | PM2 Schedule | Priority | Notes |
|---------|--------------|----------|-------|
| `storyteller-sync` | 30 4 AEST | HIGH | Needs EL_SUPABASE_* secrets |
| `storyteller-link` | 45 4 AEST | HIGH | Needs EL_SUPABASE_* secrets |
| `notion-sync` | */5 * * * * | HIGH | Fix code bug first, then migrate |
| `agent-learning` | 0 2 AEST | MEDIUM | Standalone, no dependencies |
| `data-freshness` | 0 */6 * * * | MEDIUM | Health monitoring |

### NEEDS CODE FIX BEFORE MIGRATION

| Job | Issue | Fix Required |
|-----|-------|--------------|
| `notion-sync` | `notion.databases.query is not a function` | Check Notion client initialization |
| `storyteller-sync` | Missing env vars | Add EL_SUPABASE_URL, EL_SUPABASE_SERVICE_KEY |
| `storyteller-link` | Missing env vars | Same as above |

---

## Implementation Plan

### Phase 1: Fix Broken Jobs (Week 1)

1. **Fix notion-sync code bug**
   - Diagnose `notion.databases.query is not a function`
   - Likely cause: Notion client not properly initialized
   - Test locally, then deploy

2. **Add EL Supabase secrets to .env.local**
   ```bash
   EL_SUPABASE_URL=https://xxx.supabase.co
   EL_SUPABASE_SERVICE_KEY=eyJhbGc...
   ```

3. **Add same secrets to GitHub**
   ```bash
   gh secret set EL_SUPABASE_URL
   gh secret set EL_SUPABASE_SERVICE_KEY
   ```

### Phase 2: Create Missing GitHub Actions (Week 2)

**Create these workflows:**

#### 1. `.github/workflows/storyteller-sync.yml`
```yaml
name: Storyteller Sync (EL → GHL)

on:
  schedule:
    - cron: '30 18 * * *'  # 4:30am AEST = 18:30 UTC
  workflow_dispatch: {}

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Sync storytellers to GHL
        env:
          EL_SUPABASE_URL: ${{ secrets.EL_SUPABASE_URL }}
          EL_SUPABASE_SERVICE_KEY: ${{ secrets.EL_SUPABASE_SERVICE_KEY }}
          GHL_API_KEY: ${{ secrets.GHL_API_KEY }}
          GHL_LOCATION_ID: ${{ secrets.GHL_LOCATION_ID }}
        run: node scripts/sync-storytellers-to-ghl.mjs
```

#### 2. `.github/workflows/storyteller-link.yml`
```yaml
name: Link Storytellers to Contacts

on:
  schedule:
    - cron: '45 18 * * *'  # 4:45am AEST = 18:45 UTC
  workflow_dispatch: {}

jobs:
  link:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Link storytellers
        env:
          EL_SUPABASE_URL: ${{ secrets.EL_SUPABASE_URL }}
          EL_SUPABASE_SERVICE_KEY: ${{ secrets.EL_SUPABASE_SERVICE_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node scripts/link-storytellers-to-contacts.mjs
```

#### 3. `.github/workflows/agent-learning.yml`
```yaml
name: Agent Learning Job

on:
  schedule:
    - cron: '0 16 * * *'  # 2am AEST = 16:00 UTC
  workflow_dispatch: {}

jobs:
  learn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run agent learning
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node scripts/agent-learning-job.mjs
```

#### 4. `.github/workflows/data-freshness.yml`
```yaml
name: Data Freshness Monitor

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch: {}

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Check data freshness
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node scripts/data-freshness-monitor.mjs
```

### Phase 3: Disable Redundant PM2 Jobs (Week 3)

Once GitHub Actions are verified working:

1. Remove from `ecosystem.config.cjs`:
   - `daily-briefing` (covered by `daily-brief.yml`)
   - `knowledge-pipeline` (covered by `knowledge-sync.yml`)
   - `meeting-sync` (covered by `knowledge-sync.yml`)
   - `storyteller-sync` (new workflow)
   - `storyteller-link` (new workflow)
   - `notion-sync` (migrate after fix)
   - `agent-learning` (new workflow)
   - `data-freshness` (new workflow)

2. Keep only local-only jobs:
   - `imessage-sync`
   - `embed-imessages`
   - `detect-episodes`

---

## Required GitHub Secrets

Verify these exist in repository settings:

| Secret | Used By | Status |
|--------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Most jobs | Check |
| `SUPABASE_SERVICE_ROLE_KEY` | Most jobs | Check |
| `EL_SUPABASE_URL` | Storyteller jobs | **ADD** |
| `EL_SUPABASE_SERVICE_KEY` | Storyteller jobs | **ADD** |
| `GHL_API_KEY` | Storyteller sync | Check |
| `GHL_LOCATION_ID` | Storyteller sync | Check |
| `NOTION_TOKEN` | Notion sync | Check |
| `OPENAI_API_KEY` | Embedding jobs | Check |
| `ANTHROPIC_API_KEY` | AI features | Check |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Gmail sync | Check |

---

## Final State

After migration:

### PM2 (Local Mac) - 3 jobs
- `imessage-sync` (every 15 min)
- `embed-imessages` (daily 5am)
- `detect-episodes` (daily 6am)

### GitHub Actions (Cloud) - 8+ workflows
- `daily-brief.yml` - Morning briefing
- `knowledge-sync.yml` - Knowledge pipeline
- `sync-gmail.yml` - Gmail sync
- `sync-notion-inbound.yml` - Notion sync
- `storyteller-sync.yml` - EL → GHL sync (NEW)
- `storyteller-link.yml` - Storyteller linking (NEW)
- `agent-learning.yml` - Learning consolidation (NEW)
- `data-freshness.yml` - Health monitoring (NEW)

---

## Benefits of Migration

1. **Reliability** - No dependency on local Mac being online
2. **Visibility** - GitHub Actions dashboard shows all job runs
3. **Alerting** - Easy to add Discord/Slack notifications on failure
4. **Secrets management** - GitHub's encrypted secrets vs .env files
5. **Logs** - Centralized, searchable job logs
6. **Manual triggers** - `workflow_dispatch` for on-demand runs
