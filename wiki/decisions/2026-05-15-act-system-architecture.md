---
title: ACT system architecture — discovery · entity · operations · money · ask
slug: act-system-architecture-2026-05-15
status: active
date: 2026-05-15
tags: [decision, architecture, integration, grantscope, supabase, ghl, xero, notion, ai]
audience: [Ben, Nic, Claude, Codex]
supersedes: partially [[finance-4-surface-model]]
related:
  - [[notion-platform-architecture-2026-05-14]]
  - [[notion-page-policy]]
  - [[finance-4-surface-model]]
  - [[contact-pipeline-alignment-2026-05-15]]
---

# ACT system architecture

## The decision

ACT's full operational backbone has four planes — **Discovery** (GrantScope), **Entity** (CivicGraph canonical layer), **Operations + Money** (GHL CRM + Xero ledger), and **Ask** (Notion + agent SDK) — joined by exactly three universal identifiers. Each plane is owned by exactly one system. Everything else is downstream.

This ADR sits above the tactical decisions in [[notion-platform-architecture-2026-05-14]] and [[contact-pipeline-alignment-2026-05-15]] — they become its tactical phases.

## The four planes

```
┌─ DISCOVERY ───────────────────────────────────────────────────────────┐
│  GrantScope (CivicGraph)                                              │
│  • 100K entities, 199K relationships, 18K grants, 10K foundations    │
│  • 672K AusTender contracts, 370K ACNC statements, 312K donations    │
│  • LLM enrichment, foundation profiles, match scoring                │
│  • Continuously polls 30+ data sources                                │
│  → Surfaces: new grants, new foundations, new people, new partners   │
└──────────────────┬────────────────────────────────────────────────────┘
                   ↓  ABN / email / name match (94.1% precision)
┌─ ENTITY ──────────────────────────────────────────────────────────────┐
│  canonical_entities (Supabase, shared schema)                         │
│  • The deduplicated reference for any organisation or person          │
│  • Foreign-keyed from ghl_contacts.canonical_entity_id (80% pop)      │
│  • Foreign-keyed from xero_contacts.canonical_entity_id (next)        │
│  • The bridge between discovery and operations                        │
└──────┬─────────────────────────────────────────────┬──────────────────┘
       ↓                                             ↓
┌─ OPERATIONS ─────────────────────────────┐  ┌─ MONEY ──────────────────┐
│  GHL (CRM)                               │  │  Xero (ledger)           │
│  • 2,079 canonical contacts              │  │  • 1,416 contacts        │
│  • 348 opportunities (Grants, Goods,     │  │  • 1,772 invoices        │
│    JH, EL, Events, Festivals pipelines)  │  │  • 3,112 transactions    │
│  • Tags drive workflows + sends           │  │  • 97.7% project-tagged  │
│  • All project-tagged ACT-XX              │  │                          │
│  • Storytellers linked to EL v2 profiles │  │  60+ contacts linked to  │
│    via empathy_ledger_id                  │  │  GHL via xero_contact_id │
└────────────────┬──────────────────────────┘  └─────────────┬────────────┘
                 ↓                                            ↓
┌─ ASK ─────────────────────────────────────────────────────────────────┐
│  Notion (Workers mirror everything; AI is the query interface)        │
│  • ACT Contacts          ← v_canonical_contacts                       │
│  • Opportunities         ← ghl_opportunities                          │
│  • Funding Frontier      ← GrantScope grants × ACT projects           │
│  • Funder Network        ← GrantScope foundations × person_identity   │
│  • Project Health        ← per-ACT-XX aggregate (contacts+opps+money) │
│  • Money Flow            ← Xero summaries                             │
│                                                                       │
│  Notion AI ↔ Agent SDK ↔ Claude / Codex / Telegram / Cockpit          │
└───────────────────────────────────────────────────────────────────────┘
```

## The three universal identifiers

For everything to join, every record carries at most three identifiers:

| Identifier | What it points at | Coverage today |
|---|---|---|
| `canonical_entity_id` | The CivicGraph entity (org or person) | 80% on `ghl_contacts`, 0% on `xero_contacts` (next backfill) |
| `project_code` | The ACT-XX project (from `projects.code`) | 97.7% on `xero_transactions`, 95.8% on `xero_invoices`, 82.5% on `ghl_opportunities`, 74.3% on `ghl_contacts` |
| `relationship_type` | `funder` · `partner` · `supplier` · `grantee` · `regulator` · `peer` · `storyteller` | Not yet formalised — inferred from tags |

When all three are present on a row, every cross-system question becomes a SQL join. When any one is missing, that row falls out of analysis. The job of this architecture is to keep all three populated everywhere.

## The four lifecycles

### Lifecycle A — Grant discovery → won/lost
```
GrantScope discovers grant
  → Mirror to Notion "Funding Frontier" (top-3 matched ACT projects)
  → Ben marks "pursue"
  → GHL opportunity created (Grants pipeline, stage=Identified, project_code=ACT-XX)
  → Foundation contact attached via canonical_entity_id
  → Pipeline progresses (Draft → Submitted → Decision)
  → If won: Xero invoice (project_code on invoice + transaction)
  → R&D pack auto-pulls: foundation → grant → project → invoice
```

### Lifecycle B — People discovery (foundation board members → leads)
```
We pursue a grant from Foundation F
  → person_identity_map → board, program officers, CEOs
  → For each not in GHL: create as 'civicgraph-discovery' lead
  → Surface in Notion "Funder Network" per project
  → Ben decides who to introduce / contact
```

### Lifecycle C — Money in (grant won → revenue → evidence)
```
Xero invoice issued to Foundation
  → ABN match against canonical_entities (CivicGraph)
  → xero_contact.canonical_entity_id set
  → project_code propagates: invoice → transaction → opportunity → contact
  → v_money_in_by_project aggregates per ACT-XX
  → Project Health page shows actual revenue
```

### Lifecycle D — Money out (supplier paid → IPP compliance + R&D)
```
Xero bill from a supplier
  → Match supplier ABN → ORIC corp / Supply Nation / B Corp in CivicGraph
  → Indigenous Procurement Policy compliance verified automatically
  → project_code on bill → ties to project + opportunity
  → v_money_out_by_project aggregates per ACT-XX
  → R&D pack distinguishes eligible spend from operational
```

## The six build phases

| Phase | Scope | Status |
|---|---|---|
| **1** | Contacts mirror to Notion (`packages/notion-workers/src/syncs/contacts.ts`) | scaffolded (this session) |
| **2** | Opportunities + Project Health mirrors | next |
| **3** | GrantScope backfill (`canonical_entity_id` on `xero_contacts` via ABN) | depends on Phase 2 |
| **4** | Funding Frontier mirror + Funder Network mirror | depends on Phase 3 |
| **5** | `relationship_type` column + role-aware views | depends on Phase 1 |
| **6** | Webhooks (GHL · Xero · GrantScope) → real-time push instead of polling | depends on Phase 1–5 |

Each phase is ~1 week. After Phase 6 the system runs without polling delays.

## Owners and writers (single-writer rule)

Each canonical fact has exactly one writer:

| Fact | Single writer | Read everywhere |
|---|---|---|
| Person identity (name, email, phone) | GHL (via inbound webhook, form, manual) | Supabase mirror, Notion mirror |
| Contact tags | GHL workflows + scripts/dedup-ghl-contacts.mjs | Supabase, Notion |
| Project codes on contacts | `scripts/lib/project-code-resolver.mjs` (called from sync) | All systems |
| Opportunity state | GHL pipelines | Supabase, Notion |
| Invoices + transactions | Xero | Supabase, Notion |
| Canonical entity | GrantScope (LLM resolution + 30+ data sources) | All systems via foreign key |
| EL storyteller profile | Empathy Ledger v2 (separate Supabase project) | GHL via `empathy_ledger_id` |
| Project definitions | `projects` table (with `ghl_tags`, `lcaa_themes`, etc.) | All systems |

Notion is **never** a writer for these facts. It mirrors and asks. Capture pages (Money Sync, meetings, decisions log) are bidirectional only for net-new content that doesn't exist elsewhere yet.

## Cost (full system, post Aug 11 free window)

| Worker | Schedule | Monthly |
|---|---|---|
| Contacts | 1h | $0.22 |
| Opportunities | 1h | $0.22 |
| Project Health | 4h | $0.05 |
| Funding Frontier | 4h | $0.05 |
| Funder Network | 12h | $0.02 |
| Money Flow | 1h | $0.22 |
| **Total** | | **~$0.78/month** |

GrantScope side: unchanged from its own cost basis (separate deploy, ongoing). Webhook URLs add zero marginal cost.

## Cultural-sensitivity guardrails

The Notion mirror never receives:
- `elder_consent` · `sacred_knowledge` · `sacred_knowledge_notes`
- `cultural_nation_details` · `cultural_protocols` per row
- `ocap_ownership` · `ocap_control` · `ocap_access` · `ocap_possession`
- `detailed_consent_history` · `elder_review_notes`

This mirrors the `BLOCKED_FIELDS_TO_GHL` set in `scripts/sync-ghl-to-supabase.mjs`. Cultural-sensitivity data stays in Supabase only and is queryable only through the command-center web UI (which is access-controlled). The Notion DB is broader-access — only safe data lives there.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Multiple sources of truth drift | Single-writer rule (table above). Daily reconcile script flags rows where mirror is >24h stale. |
| Sensitive data leaks via Notion AI | Cultural-sensitivity column whitelist (above). Audit log of Notion AI queries that referenced contacts (Phase 2 deliverable). |
| ABN matching false positives | GrantScope match precision is 94.1% (LLM-assisted). The 5.9% needs human review — surface as `match_review_needed` flag in Notion. |
| GrantScope ingests stop | GrantScope has its own monitoring + alerting. Notion mirror keeps showing last known data, doesn't fabricate. |
| `relationship_type` taxonomy drifts | Documented in this ADR + enforced via CHECK constraint on the column when added. |
| External agents (Claude/Codex/etc.) misinterpret data | Each Notion DB has a description page explaining what it is, what it isn't, and known limits. Notion AI uses these as grounding. |
| Foundation contact-people exposed without consent | `person_identity_map` from CivicGraph is public-record data only (ACNC, ASIC, ORIC registers). Private contact info (personal email) stays gated. |
| Pricing changes for Notion Workers after Aug 11 | Code is portable. If Workers pricing breaks the model, replicate via Vercel cron + Notion API. No lock-in. |

## What this ADR does NOT change

- **GrantScope stays its own repo + deploy.** It's already production. We consume its outputs, we don't fork it.
- **Empathy Ledger v2 stays a separate Supabase project.** Storyteller content is the most sensitive data ACT holds. The link via `empathy_ledger_id` is one-way; we never write to EL from this system.
- **The 4-Surface model from [[finance-4-surface-model]] still holds.** This ADR adds a fifth (Claude/Codex CLI as a query surface) and explicitly names Discovery as a sixth (GrantScope). Operations + ask are the same.
- **The 17 outbound `sync-*-to-notion` scripts** retire incrementally as Workers cover their use cases — see [[notion-platform-architecture-2026-05-14]] Phase 4.

## How to use this architecture day-to-day

| Question | Where | How |
|---|---|---|
| "Who can I email about Goods?" | Notion AI | Queries v_newsletter_audience mirror |
| "What new grants this week?" | Notion AI | Queries Funding Frontier mirror |
| "What's our relationship with Minderoo?" | Notion AI | Joins Contacts + Opportunities + (via canonical_entity_id) CivicGraph dossier |
| "Show me funders silent 90+ days" | Notion AI | Contacts + last_contact_date filter |
| "How healthy is ACT-EL?" | Notion AI | Project Health mirror |
| "What's our R&D evidence for FY26?" | command-center `/finance/rd-evidence` | Direct Supabase, with provenance |
| "Tag this transaction to a project" | command-center `/finance/tagger-v2` | Direct Supabase write |
| "Send the Goods newsletter" | GHL → workflow on `goods-newsletter` tag where `newsletter_consent=true` | Operational; data fed by Supabase |
| "Did we get paid?" | Xero → `/finance/overview` cockpit | Native Xero data, project_code-tagged |
| "Draft a funder outreach email" | Claude / Codex via Notion AI | Pulls voice + context from Notion mirror |

## The standing order for new work

When designing any new feature:
1. **Decide which plane it belongs in** (Discovery / Entity / Operations / Money / Ask).
2. **Identify the single writer** for any fact it creates.
3. **Ensure all three identifiers** (`canonical_entity_id`, `project_code`, `relationship_type`) flow through.
4. **If it's a new asked question**, the answer is "add it to a Notion mirror" — not "build a new dashboard".
5. **If it's a new operational workflow**, the answer is "wire it in GHL" — not "build a new microservice".
6. **If it's new discovery**, the answer is "have GrantScope ingest the source" — not "scrape it ourselves".

## Sources

- [[notion-platform-architecture-2026-05-14]] — the Notion side
- [[contact-pipeline-alignment-2026-05-15]] — the contact side (if drafted)
- [[finance-4-surface-model]] — the operational surfaces
- [[notion-page-policy]] — what's editable in Notion
- `thoughts/shared/audits/ghl-tag-alignment-2026-05-13.md` — the cleanup that made this possible
- `/Users/benknight/Code/grantscope/README.md` — CivicGraph platform overview
- `scripts/backfill-ghl-civicgraph-links.mjs` (in grantscope repo) — proves the bridge already works
- GrantScope MCP server (`grantscope/mcp-server/`)
