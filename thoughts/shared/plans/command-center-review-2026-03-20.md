# ACT Command Center — Full Review
**Date:** 2026-03-20 | **Scope:** Complete React app audit

## The Numbers

| Metric | Count | Reality |
|--------|-------|---------|
| Pages | 72 | ~35 real, ~20 are redirects, ~17 are thin/stub |
| API routes | 196 | Many overlap, no auth on any |
| Finance pages | 24 | 6 real, 18 redirect |
| Today widgets | 14 | Dense — possibly too many |
| Agent tools | 19 | Telegram bot, well-structured |
| Nav items | ~30 | Overwhelming, no hierarchy clarity |
| External integrations | 10+ | Xero, GHL, Notion, Google, Telegram, etc. |
| Tests | 0 | Zero |

---

## What Works

### 1. The 6 Finance Pages Are Excellent
- **Overview** (643 lines) — 3-layer narrative: "Right Now" → "What's Coming" → "What If". Pipeline funnel, grants→revenue reconciliation, scenario modelling. Gold standard.
- **Board Report** (625 lines) — Executive-ready. Runway, burn rate, R&D offset (43.5%), studio economics. Board meeting-ready.
- **Accountant** (575 lines) — BAS prep checklist, reconciliation coverage, receipt score, compliance deadlines. Task-oriented.
- **Projects P&L** (298 lines) — All projects with revenue/expenses/margin/R&D%. Filterable. Clean hub.
- **Project Detail** (580 lines) — Monthly trends, AI-generated variance notes, budget vs actual, R&D breakdown.
- **Pipeline Kanban** (470 lines) — Drag-and-drop with change log and real-time updates. Best interactive piece.

### 2. @act/intel Shared Package
Excellent architectural direction — typed query functions used by bot, API routes, and Notion workers. Single source of truth for data access. 16+ functions covering briefing, finance, contacts, grants, knowledge.

### 3. Today Page
Well-designed daily command center with calendar, briefing, priorities, pipeline snapshot, finance summary, ecosystem pulse, partner touchpoints. Cmd+K search with hybrid results (contacts + knowledge). The "greeting + date + stats bar" header is clean.

### 4. Agent Architecture
19 Telegram bot tools (14 read, 5 write) with confirmation flow for write actions. Multi-provider TTS. grammY webhook on Vercel. The tool shape maps cleanly to Notion Workers format.

### 5. Visual Design
Glass-morphism dark theme is beautiful and consistent. Tremor charts are purposeful (not decorative). Color semantics are clear: green=good, red=bad, yellow=warning, lime=R&D, purple=scenarios. Typography hierarchy works (big numbers → labels → tables).

### 6. Webhook/Event System
Clean abstraction: webhooks → event_log → reactor → rules → actions. Xero webhook has proper HMAC-SHA256 validation. GHL and Telegram webhooks work but auth is optional (see below).

---

## What Doesn't Work

### 1. Navigation Is a Maze
30 nav items across 6 groups. 20 finance pages are redirects. Users can't tell real pages from dead ends. No breadcrumbs anywhere. The sidebar feels like a file explorer, not a business tool.

**Impact:** New users (Nicholas, board members, partners) would be lost immediately.

### 2. No API Authentication
Zero API routes verify user identity. Anyone with the Vercel URL can access ALL financial data, contacts, and business intelligence. The Telegram bot has a whitelist, but the web API is wide open.

**Impact:** Security risk. Not acceptable for a business tool with real financial data.

### 3. Inconsistent Patterns Everywhere
- **3 different Supabase client patterns** (shared singleton, inline createClient, variable env fallbacks)
- **5 different error handling patterns** (typed error object, generic string, no handling, 200-on-error for webhooks, silent catch in loops)
- **No request validation** (no zod, no yup — POST bodies are unchecked)
- **Morning briefing doesn't use @act/intel** despite @act/intel existing for exactly this purpose

### 4. Today Page Is Overloaded
14 widgets on a single page. Each fires its own API call on mount. On a slow connection this is 14 loading spinners. There's no prioritisation — the morning briefing is equally weighted with "Wiki & Dream Journal Quick Access" links.

**Missing:** No ability to customise which widgets appear. No "what should I do first?" focus.

### 5. No Operational Tools Where They're Needed
The finance section has beautiful reporting but no action tools:
- **No transaction tagger UI** — 900+ untagged transactions need manual work
- **No receipt matcher** — receipt coverage ~70%, needs hands-on drag-and-drop matching
- **No subscription manager** — board shows burn but no breakdown to act on
- **No reconciliation workflow** — no step-by-step month-end close

### 6. Sprawl Without Purpose
Several sections exist but feel like experiments that never matured:
- **/ideas**, **/vision**, **/dreams** — personal tools, not business tools
- **/chat**, **/agent**, **/intelligence** — three separate AI interfaces?
- **/business**, **/reports**, **/wiki** — generic names, unclear purpose
- **/development** — a page about development inside the app itself

### 7. Zero Tests
No unit tests, no integration tests, no E2E tests. For 196 API routes handling financial data, grant pipelines, and webhook integrations.

### 8. No Caching Strategy
- Morning briefing recalculates 12 parallel queries on every page load
- Project financials recalculated on every visit
- Only caching is React Query client-side defaults
- No ISR, no server-side caching, no CDN caching

---

## What's Missing for Business Agents & Dashboards

### The Core Problem
The command center was built as **Ben's personal operations cockpit**. It's excellent at that. But it's not yet a **business tool** that Nicholas, board members, partners, or an accountant could walk into and immediately get value from.

### What "Business Agent & Dashboard Clarity" Requires

#### A. Role-Based Views
Right now everyone sees the same 30-item sidebar. A board member needs 3 pages. An accountant needs 5. Ben needs 20. Nicholas needs 10. The app should know who you are and show you what matters.

| Role | Needs | Current Support |
|------|-------|-----------------|
| **Founder/CEO (Ben)** | Everything — today, finance, pipeline, projects, agent | Good (built for this) |
| **Co-founder (Nicholas)** | Today, projects, people, ecosystem, pipeline | Partial — too much noise |
| **Board member** | Board report, runway, project summaries | 1 page works, rest is noise |
| **Accountant** | BAS prep, reconciliation, receipts, transactions | 1 page, missing tools |
| **Grant writer** | Pipeline kanban, grant opportunities, deadlines | Good but buried |
| **Project lead** | Their project detail, budget, team | Good but no focused entry |

#### B. Action-Oriented Dashboards
Current pages are mostly **read-only reporting**. Business agents need to DO things:
- Tag a transaction → mark receipt as matched → close a reconciliation item
- Move a grant through pipeline stages → update probability → add notes
- Assign a task → set a deadline → notify someone
- Approve an invoice → flag an expense → categorise a subscription

#### C. Intelligent Routing
The morning briefing calculates priorities but doesn't route you to the relevant page. "You have 3 overdue invoices" should link directly to the invoices. "Receipt coverage dropped to 65%" should link to the receipt matcher. The briefing should be a launcher, not just a report.

#### D. Agentic AI as Co-Pilot
The Telegram bot has 19 tools. The web app has a /chat page. But the AI isn't embedded into workflows:
- Finance overview should have "Ask about this data" inline
- Pipeline should suggest next actions per deal
- Project detail should surface relevant knowledge automatically
- Transaction tagger should suggest tags based on vendor rules

---

## Improvement Roadmap

### Phase 1: Clean Up (1 week)
1. **Kill redirect pages** — delete all 20 redirect routes in finance
2. **Simplify nav** — reduce to ~15 items max. Group by audience, not system
3. **Add breadcrumbs** — everywhere
4. **Standardise Supabase client** — one pattern, add ESLint rule
5. **Add basic API auth** — middleware that checks a session or API key
6. **Migrate morning briefing to @act/intel** — remove inline queries

### Phase 2: Action Tools (2-3 weeks)
1. **Transaction Tagger** — table + dropdown + vendor rules editor
2. **Receipt Matcher** — drag receipts onto transactions, AI suggestions
3. **Reconciliation Checklist** — step-by-step month-end close
4. **Smart Briefing Links** — every insight links to the relevant action page

### Phase 3: Role-Based Experience (2-3 weeks)
1. **Role selector** — simple "I am a..." on first visit, stored in localStorage
2. **Filtered nav per role** — board sees 3 items, accountant sees 5, founder sees all
3. **Role-specific dashboards** — /board, /accountant, /founder entry points
4. **Shareable board report** — public link with auth token for board members

### Phase 4: Embedded AI (2-3 weeks)
1. **Inline "Ask about this" on finance pages** — context-aware queries
2. **Pipeline action suggestions** — "It's been 14 days since last contact with X"
3. **Smart transaction tagging** — AI suggests project code based on vendor + amount
4. **Knowledge surfacing** — project detail auto-shows relevant decisions/meetings

### Phase 5: Platform Hardening (ongoing)
1. **Add tests** — start with API routes for finance and pipeline
2. **Add caching** — ISR for briefing (5 min), staleTime for React Query
3. **Add monitoring** — error tracking, API latency, webhook delivery rate
4. **Split agent-tools.ts** — 5,797 lines → per-category files
5. **API documentation** — auto-generate from TypeScript types

---

## Verdict

**Quality of what exists: 8/10** — The real pages are genuinely excellent. Finance overview and board report are better than most commercial tools.

**Clarity for a business user: 4/10** — Too many pages, too many dead ends, no role awareness, no action tools. A new user would be overwhelmed.

**Readiness for business agents: 5/10** — The @act/intel package and Telegram bot show the architecture is there. But the web app doesn't leverage it. AI is in a separate /chat page instead of embedded in workflows.

**Overall: 6/10** — An 8/10 product hidden behind a 4/10 experience. Fix navigation and add action tools and you have something genuinely special.
