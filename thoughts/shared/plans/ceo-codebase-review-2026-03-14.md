# ACT Global Infrastructure — CEO Codebase Review
## SCOPE EXPANSION Mode | 2026-03-14

---

## System Audit Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Active source files | 1,022 | Large |
| Scripts (standalone) | 250+ (~97k LOC) | Extremely large |
| Command Center | ~82.5k LOC | Large app |
| Shared lib modules | 38 files (16k LOC) | Underpowered for 250+ scripts |
| API routes | 63+ endpoints | Broad surface |
| DB migrations | 91 SQL files | Healthy |
| GitHub Actions | 32 workflows, 39 crons | Dense automation |
| PM2 cron scripts | 59 | Dense automation |
| Test files | **ZERO** | Critical gap |
| Auth layer | **None** | Intentional (internal tool) |
| CI pipeline | **None** (no lint/type-check/test in CI) | Critical gap |

### Taste Calibration (EXPANSION mode)

**Well-designed patterns (style references):**
1. `scripts/lib/llm-client.mjs` — Dual API (simple vs tracked), cost tracking, retry with backoff, CLI testing. This is what all lib modules should aspire to.
2. `scripts/lib/ghl-api-service.mjs` — Class-based, rate limiting, pagination, factory function. The GHL integration pattern is the gold standard.
3. `apps/command-center/src/lib/supabase.ts` — Lazy Proxy singleton, dual-instance support. Elegant deferred initialization.

**Anti-patterns (do not repeat):**
1. **144 scripts import dotenv directly** instead of using the centralized `lib/load-env.mjs` (only 60 use it). Three different env-loading patterns coexist.
2. **Error handling anarchy** — 4 different patterns (silent catch, console.warn, throw, stats tracking) with no standard. Scripts fail silently on cron.
3. **250KB `agent-tools.ts`** — monolith file with 19 tool definitions + all execution logic in one place.

---

## Step 0: Nuclear Scope Challenge

### 0A. Premise Challenge

**Is a full codebase review the right thing?**

Yes, but the framing matters. This isn't "is the code clean?" — it's **"is this codebase a platform or a prototype?"**

Right now ACT's infrastructure is a **brilliant prototype that works because Benjamin holds it all in his head.** The real question: can this system survive and thrive as ACT grows from 2 founders to 5 people? From 7 projects to 15? From $200k/year to $2M/year?

**What happens if we do nothing?** The system continues to work — until it doesn't. A silent cron failure goes unnoticed for days. A Xero token expires while Benjamin is at a conference. A new team member can't onboard without a week of pair programming. The cost of doing nothing is invisible today but compounds.

### 0B. Existing Code Leverage

The codebase has already solved hard problems:
- Multi-provider LLM orchestration with cost tracking ✓
- OAuth token rotation for Xero ✓
- Dual Supabase instance management ✓
- 90+ automated processes running across 3 environments ✓
- Telegram bot with 19 agent tools and confirmation flow ✓
- Daily intelligence pipeline (2am-11am AEST) ✓

The issue isn't capability — it's **consolidation**. The same patterns are solved differently across scripts.

### 0C. Dream State Mapping

```
  CURRENT STATE                    THIS REVIEW                    12-MONTH IDEAL
  ─────────────                    ───────────                    ──────────────
  250+ standalone scripts          Identify the 5 platform        Unified SDK: act-ops
  38 shared lib modules            pillars and consolidate        15-20 lib modules
  4 error handling patterns        into them                      1 error handling pattern
  3 env loading patterns                                          1 env loading pattern
  0 tests                          Define test strategy           Core paths tested
  0 CI checks                      Add CI pipeline                Type-check + lint in CI
  PM2 on dev laptop               Plan migration path             Critical crons in cloud
  Bus factor = 1                   Document ops runbook            Bus factor = 2
  Silent cron failures             Design alerting                 Every failure visible
  90+ automated processes          Categorise: keep/merge/kill     60 well-tested processes
```

### 0D. Expansion Analysis

#### 10x Check: What's 10x more ambitious for 2x the effort?

**The ACT Operations SDK.** Instead of 250 scripts, build `@act/ops` — a typed, tested, documented SDK that any ACT team member (or AI agent) can use:

```
@act/ops
├── clients/          # Supabase, Xero, GHL, Notion, Gmail, Telegram
├── sync/             # Unified sync framework (config-driven)
├── intelligence/     # LLM orchestration, embeddings, extraction
├── notifications/    # Telegram, Discord, email, Notion
├── auth/             # OAuth manager, token rotation
├── health/           # Monitoring, alerting, data freshness
└── cli/              # `act sync xero`, `act health`, `act brief`
```

**Why 10x?** Every new integration becomes a 30-minute config task instead of a 300-line script. New team members can `npm run act health` on day 1. AI agents get typed tool definitions automatically.

#### Platonic Ideal

The best version of this system feels like **a living organism that monitors itself.** You wake up, open the command center, and everything is green. When something breaks, you know immediately — not because you checked, but because the system told you. When you add a new data source, you configure it in one place and it flows through syncs, intelligence, notifications, and dashboards automatically.

The user experience: **"I never worry about whether the data is fresh."**

#### Delight Opportunities (30-min each)

1. **`act doctor`** — one-command health check: env vars set? Tokens fresh? DB reachable? Crons running? Last sync times? (Think `brew doctor`)
2. **Cron failure Telegram alert** — if any PM2 script exits non-zero, send a Telegram message with the error
3. **`.env.example` generator** — scan all scripts for `process.env.*`, generate a comprehensive `.env.example` automatically
4. **Script usage heatmap** — which of the 250 scripts actually ran in the last 30 days? Which are dead?
5. **Single-command onboarding** — `./dev setup` that checks Node version, installs deps, copies env template, verifies connections
6. **Dashboard "last synced" badges** — every widget shows when its data was last refreshed
7. **Type-check in pre-commit hook** — catch TypeScript errors before they reach production

---

## Decisions Log

| # | Issue | Decision | Action |
|---|-------|----------|--------|
| 1 | PM2 on dev laptop (SPOF) | Cloud VM | Spin up $5/mo VM, migrate ecosystem.config.cjs |
| 2 | Zero test coverage (182k LOC) | Integration-first | Test 10 critical lib modules with real Supabase |
| 3 | No CI pipeline | Type-check + lint on push/PR | Add GHA workflow: tsc + ESLint |
| 4 | query_database SQL injection | Read-only Supabase role | Create restricted role for agent tools |
| 5 | Silent cron failures | sync_runs table + Telegram watchdog | Foundation for @act/ops/health |

---

## Section 1: Architecture Review — COMPLETE

### Findings
- 3-layer execution model (Vercel + GHA + PM2) is viable but PM2 layer is fragile
- SDK consolidation path is clear: 38 lib modules → @act/ops package
- Dependency graph shows heavy duplication across scripts

---

## Section 2: Error & Rescue Map — COMPLETE

### Critical Gaps Found
- `query_database` tool: SQL injection via prompt injection (CRITICAL)
- All sync scripts: silent failures on cron (HIGH)
- 4 incompatible error handling patterns (MEDIUM)
- No structured error logging to database (MEDIUM)

---

## Full Decisions Log

| # | Issue | Decision | Action | Priority |
|---|-------|----------|--------|----------|
| 1 | PM2 on dev laptop (SPOF) | Cloud VM | Spin up $5/mo VM, migrate ecosystem.config.cjs | P1 |
| 2 | Zero test coverage (182k LOC) | Integration-first | Test 10 critical lib modules with real Supabase | P1 |
| 3 | No CI pipeline | Type-check + lint on push/PR | Add GHA workflow: tsc + ESLint | P1 |
| 4 | query_database SQL injection | Read-only Supabase role | Create restricted role for agent tools | P0 |
| 5 | Silent cron failures | sync_runs table + Telegram watchdog | Foundation for @act/ops/health | P1 |
| 6 | Service role key everywhere, no auth | Keep internal + IP allowlist | Add Vercel edge middleware IP restriction | P2 |
| 7 | Supabase 1,000 row limit | Auto-paginating client | @act/ops/clients/supabase wraps with auto-pagination | P1 |
| 8 | agent-tools.ts 250KB monolith | Split as SDK seed | Refactor into @act/ops/agent/tools/ one-per-tool | P2 |
| 9 | 144 scripts use direct dotenv | Migrate to load-env.mjs | Batch migration, no question needed | P2 |
| 10 | No observability foundation | @act/ops/health FIRST module | sync_runs, data_freshness, alerting | P1 |
| 11 | ~160 possibly dead scripts | Audit + archive | Script usage heatmap → move unused to archive/ | P2 |

---

## SDK Build Order (Agreed)

```
  PHASE 1: Foundation (Weeks 1-2)
  ├── @act/ops/health         ← sync_runs table, Telegram alerting, data freshness
  ├── CI pipeline             ← tsc + ESLint on push/PR
  ├── Read-only Supabase role ← for agent tools (P0 security fix)
  └── Cloud VM setup          ← migrate PM2 crons off laptop

  PHASE 2: Core Modules (Weeks 3-4)
  ├── @act/ops/clients/supabase  ← auto-paginating wrapper
  ├── @act/ops/clients/xero      ← OAuth rotation, typed API
  ├── @act/ops/notify            ← unified Telegram/Discord/email
  └── Integration tests          ← for Phase 1+2 modules

  PHASE 3: Intelligence (Weeks 5-6)
  ├── @act/ops/intelligence      ← LLM client, embeddings, extraction
  ├── @act/ops/sync              ← unified sync framework
  └── agent-tools.ts refactor    ← split into per-tool modules

  PHASE 4: Migration (Weeks 7-8)
  ├── Script audit + archive     ← identify and archive dead scripts
  ├── Migrate active scripts     ← to use @act/ops modules
  └── env standardization        ← all scripts use load-env.mjs
```

---

## Architecture Diagrams

### System Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                         3 EXECUTION LAYERS                       │
├──────────────┬──────────────────┬────────────────────────────────┤
│   VERCEL     │  GITHUB ACTIONS  │  PM2 (dev laptop → cloud VM)  │
│   Next.js    │  32 workflows    │  59 cron scripts              │
│   63+ API    │  39 cron         │  1 dev server                 │
│   routes     │  schedules       │                               │
├──────────────┴──────────────────┴────────────────────────────────┤
│                    ┌─────────────┐                                │
│                    │  SUPABASE   │ ← 571 tables                  │
│                    │  (shared)   │                                │
│                    └──────┬──────┘                                │
│         ┌────────┬────────┼────────┬────────┬────────┐          │
│         ▼        ▼        ▼        ▼        ▼        ▼          │
│       Xero    Gmail(4)   GHL    Notion  Telegram  OpenAI/       │
│       OAuth2  Svc Acct   Key    Token   Webhook   Anthropic     │
└─────────────────────────────────────────────────────────────────┘
```

### SDK Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        @act/ops SDK                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ /health  │ /clients │ /sync    │ /notify  │ /intelligence       │
│          │          │          │          │                     │
│ sync_runs│ supabase │ unified  │ telegram │ llm-client          │
│ freshness│ xero     │ sync     │ discord  │ embeddings          │
│ alerting │ ghl      │ framework│ email    │ extraction          │
│ heartbeat│ notion   │ (config) │ notion   │ grant-scorer        │
│          │ gmail    │          │          │                     │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│                                                                   │
│  /agent/tools/    /auth/           /cli/                         │
│  19 tool modules  oauth-manager    act doctor                    │
│  (split from      token-rotation   act sync xero                │
│   monolith)                        act health                    │
└─────────────────────────────────────────────────────────────────┘
```

### Error Flow (Target)

```
  SCRIPT EXECUTION
       │
       ├─► SUCCESS ──► sync_runs.insert(status='success', rows_affected=N)
       │                    └─► data_freshness.update(last_synced=now)
       │
       └─► FAILURE ──► sync_runs.insert(status='error', error=message)
                            └─► alerting.check_threshold()
                                    │
                                    ├─► Below threshold → log only
                                    └─► Above threshold → Telegram alert
                                            └─► Include: script name, error,
                                                last success time, retry count
```

### Daily Intelligence Pipeline (Dependency Graph)

```
  2:00 ─► agent-learning
  3:00 ─► contact-signals ─┐
  4:00 ─► gmail-sync ──────┤
  5:00 ─► embed-imessages ─┼─► 6:00 ─► discover-grants ─┐
  5:30 ─► meeting-sync ────┘                              │
                                  6:30 ─► daily-priorities ◄┘
                                  6:45 ─► sync-to-notion
                                  7:00 ─► daily-briefing ◄── depends on all above
```

---

## Failure Modes Registry

```
  CODEPATH                  | FAILURE MODE        | RESCUED? | TEST? | USER SEES    | LOGGED?
  ──────────────────────────|─────────────────────|──────────|───────|──────────────|────────
  sync-xero (OAuth)         | Token expired       | Partial  | N     | Stale data   | Y (warn)
  sync-xero (API)           | Rate limit 429      | N        | N     | Stale data   | N ← CRITICAL
  sync-gmail (DNS)          | DNS failure          | N        | N     | Partial sync | N ← CRITICAL
  sync-gmail (volume)       | 4k+ msg timeout     | N        | N     | Incomplete   | N ← CRITICAL
  daily-briefing (LLM)      | Anthropic timeout   | Partial  | N     | No briefing  | Y
  daily-briefing (delivery) | Telegram send fail  | N        | N     | No briefing  | N ← CRITICAL
  agent query_database      | SQL injection       | N        | N     | Data leak    | N ← CRITICAL
  agent query_database      | Prompt injection    | N        | N     | Data mutation| N ← CRITICAL
  PM2 cron (any)            | Script crash        | N        | N     | Stale data   | /tmp log only
  Xero token rotation       | Refresh token exp   | Y        | N     | Manual re-auth| Y
  GHL API                   | Rate limit          | Y        | N     | Delayed sync | Y
  LLM client                | All providers down  | Y        | N     | "exhausted"  | Y
```

**CRITICAL GAPS (RESCUED=N, TEST=N, USER SEES=Silent):** 6 entries. All become P1 fixes in SDK Phase 1.

---

## NOT in Scope

| Item | Rationale |
|------|-----------|
| Goods on Country codebase | Separate repo, separate Supabase |
| GrantScope codebase | Separate repo |
| Empathy Ledger v2 | Separate Supabase project |
| Website (apps/website/) | Low-traffic, lower risk |
| Notion Workers | Alpha experiment, separate review |
| UI/UX redesign | Command center works, architecture is the bottleneck |

---

## What Already Exists

| Sub-problem | Existing Solution | SDK Module |
|-------------|-------------------|------------|
| LLM orchestration | lib/llm-client.mjs (excellent) | @act/ops/intelligence |
| GHL API wrapper | lib/ghl-api-service.mjs (excellent) | @act/ops/clients/ghl |
| Env loading | lib/load-env.mjs (good, underadopted) | @act/ops root |
| Project config | lib/project-loader.mjs | @act/ops/config |
| Grant scoring | lib/grant-scorer.mjs | @act/ops/intelligence |
| Meeting extraction | lib/meeting-intelligence.mjs | @act/ops/intelligence |
| Notion SDK migration | lib/notion-datasource.mjs | @act/ops/clients/notion |
| Receipt matching | lib/receipt-matcher.mjs | @act/ops/finance |
| Supabase client | apps/command-center/src/lib/supabase.ts | @act/ops/clients/supabase |
| PM2 monitoring | sync-pm2-status.mjs | @act/ops/health |
| Data freshness | data-freshness-monitor.mjs | @act/ops/health |

---

## Dream State Delta

**Where this review leaves us relative to the 12-month ideal:**

```
  CURRENT         THIS REVIEW PRODUCES           12-MONTH IDEAL
  ───────         ─────────────────────           ──────────────
  Prototype       Remediation roadmap +           Platform
                  SDK architecture +
                  Phase 1 foundation

  Gap remaining: ~70% of the journey. This review is the map.
  The SDK build is the territory.
```

---

## Delight Opportunities

| # | Opportunity | Effort | Impact |
|---|------------|--------|--------|
| 1 | `act doctor` — one-command health check | S | High (onboarding, debugging) |
| 2 | Cron failure Telegram alert | S | High (immediate visibility) |
| 3 | `.env.example` auto-generator | S | Medium (onboarding) |
| 4 | Script usage heatmap | S | Medium (dead code discovery) |
| 5 | `./dev setup` onboarding command | S | High (bus factor) |
| 6 | Dashboard "last synced" badges | S | High (trust in data) |
| 7 | Type-check pre-commit hook | S | Medium (catch errors early) |

---

## Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | SCOPE EXPANSION                             |
| System Audit         | 182k LOC, 0 tests, 0 CI, bus factor=1       |
| Step 0               | SDK Platform trajectory confirmed            |
| Section 1  (Arch)    | 3 issues: SPOF, tests, CI                   |
| Section 2  (Errors)  | 12 error paths mapped, 6 CRITICAL GAPS      |
| Section 3  (Security)| 2 issues: SQL injection (P0), no auth       |
| Section 4  (Data/UX) | 1 edge case: 1,000 row limit                |
| Section 5  (Quality) | 2 issues: monolith, DRY violations          |
| Section 6  (Tests)   | 10 priority test targets identified          |
| Section 7  (Perf)    | Covered by SDK design                       |
| Section 8  (Observ)  | @act/ops/health as first module             |
| Section 9  (Deploy)  | Cloud VM migration path                     |
| Section 10 (Future)  | Reversibility: 4/5, debt items: 11          |
+--------------------------------------------------------------------+
| NOT in scope         | 6 items                                     |
| What already exists  | 11 modules mapped to SDK                    |
| Dream state delta    | ~70% of journey remaining                   |
| Error/rescue registry| 12 methods, 6 CRITICAL GAPS                 |
| Failure modes        | 12 total, 6 CRITICAL GAPS                   |
| TODOS/decisions      | 11 items decided                            |
| Delight opportunities| 7 identified                                |
| Diagrams produced    | 5 (system arch, SDK target, error flow,     |
|                      |    pipeline deps, before/after)             |
| Stale diagrams found | 0 (no existing ASCII diagrams in codebase)  |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## Implementation Priority

### Immediate (This Week)
1. **P0: Create read-only Supabase role** for agent tools (1 hour)
2. **P1: Add CI pipeline** — GHA workflow with tsc + ESLint (2 hours)
3. **P1: Cron failure Telegram alert** — delight #2, quick win (1 hour)

### Short-Term (Weeks 1-2)
4. **P1: @act/ops/health module** — sync_runs table, Telegram watchdog, data freshness
5. **P1: Cloud VM setup** — migrate PM2 off laptop
6. **P1: Integration tests** for llm-client.mjs and ghl-api-service.mjs

### Medium-Term (Weeks 3-4)
7. **P1: @act/ops/clients/supabase** — auto-paginating wrapper
8. **P2: agent-tools.ts split** — one file per tool, SDK seed
9. **P2: Script audit + archive** — usage heatmap, move dead code

### Ongoing
10. **P2: Migrate 144 scripts** to load-env.mjs
11. **P2: IP allowlist** for command center on Vercel
