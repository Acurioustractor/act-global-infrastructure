# ACT Operational Systems — Thesis Research Summary
Generated: 2026-04-13

---

## Receipt System: How It Works Week-to-Week

### Architecture
`bank_statement_lines` is the source of truth for all card spend (not `xero_transactions`, which only captured ~65% of spend). Two quarters of NAB Visa data are ingested: Q2 FY26 (Oct-Dec 2025) and Q3 FY26 (Jan-Mar 2026).

### Ingest pipeline (triggered manually or on new bank export)
1. `ingest-statement-lines-raw.mjs <file>` — parses raw Xero UI paste, writes rows to `bank_statement_lines`, then auto-chains:
2. `tag-statement-lines.mjs --apply` — project tagger (see below)
3. `reconciliation-report.mjs --match --apply` — receipt matcher
4. R&D flag auto-set from project codes (ACT-EL, ACT-IN, ACT-JH, ACT-GD)

### Weekly cron (Monday 8am via PM2)
`weekly-reconciliation.mjs` runs:
- Step 1: tag-statement-lines + reconciliation-report to update state
- Step 2: compute BAS readiness stats (paginated past Supabase 1000-row cap)
- Step 3: auto-insert new location rules (3+ charges) and subscription patterns (3+ charges) from untagged lines
- Step 4: Telegram summary to Ben (coverage %, gaps, R&D offset at risk)

### Receipt matching engine
Dice coefficient bigrams on vendor name + amount scoring + date proximity. Thresholds:
- >= 0.75: auto-apply match
- 0.45–0.75: ambiguous (inbox for human review)
- < 0.45: unresolved

GST threshold: $82.50 — anything below auto-marked "no receipt needed" (no GST recovery at stake).

### Current coverage (Q2 + Q3 FY26 combined)
| Metric | Q2 (Oct-Dec) | Q3 (Jan-Mar) | Combined |
|---|---|---|---|
| Lines | 872 | 670 | 1,542 |
| Spend | $320K | $174K | $494K |
| Project-tagged | 100% | 100% | 100% |
| Receipted | 97.2% | 92.8% | 95.3% |
| Gaps (lines) | 24 | 48 | 72 |
| Gap value | $25K | $30K | $55K |

72 remaining gaps are all human-capture needed (Xero app photo, vendor portal, Gmail forward).

### Receipt sources
- 1,787 rows in `receipt_emails` table — source column: `dext_import` (1,639), `gmail`, `xero_me` (96), `manual_upload`
- Files stored in Supabase Storage `receipt-attachments` bucket
- Bill-to-BSL alignment: `align-bills-to-statements.mjs` matches Xero ACCPAY bills (which have auto-attached PDF receipts from Qantas, Uber, Webflow connectors) to statement lines

### Inbox UI
Live at `/finance/reconciliation` in Command Center. Toggle between inbox (unmatched items with top-3 candidate matches, one-click Link/No Receipt/Skip) and dashboard (project breakdown, R&D summary, vendor intelligence, quarter selector).

---

## R&D: How Tagging Works, What Qualifies, Current State

### Auto-tagging
Column `rd_eligible` (boolean) on `bank_statement_lines`, auto-set true when `project_code` IN ('ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'). These four codes cover Empathy Ledger (ethical tech R&D), Internal/infrastructure (platform R&D), JusticeHub (justice tech), and Goods on Country (circular economy R&D).

### R&D totals (Q2 + Q3 FY26)
| Quarter | Eligible spend | Potential 43.5% offset |
|---|---|---|
| Q2 | $157K | $68K |
| Q3 | $94K | $41K |
| Combined | $251K | $109K |

### Receipt coverage for R&D offset
95.3% coverage means ~$5.2K of eligible spend lacks receipts — that's ~$2.3K of R&D offset at risk if receipts not recovered before BAS.

### How the 43.5% offset works
Australian R&D Tax Incentive: eligible activities must be experimental with uncertain outcomes, aimed at generating new knowledge. Contemporaneous records + receipts required. 43.5% refundable offset for turnover < $20M.

---

## Projects: Codes, Names, Current Status

### Active project codes (from tagging scripts and handoffs)
| Code | Project | Notes |
|---|---|---|
| ACT-IN | Internal / ACT Infrastructure | SaaS, ops, travel for general ACT work, Europe trips |
| ACT-GD | Goods on Country | Alice Springs, NT trips, furniture supply chain |
| ACT-FM | ACT Farm / Black Cockatoo Valley | Maleny landscaping, farm running costs, groceries |
| ACT-HV | The Harvest | Townsville, heavy tools (Carba Tec, Total Tools), events |
| ACT-JH | JusticeHub | Sydney site visits, justice tech work |
| ACT-MY | Mounty Yarns | Mt Druitt build, container, ground cover |
| ACT-PI | PICC (Pacific Islands Cultural Centre) | Winding down — just Hatch Electrical in Q3 |
| ACT-EL | Empathy Ledger | R&D eligible, storytelling platform |

### Q3 spend breakdown by project
- ACT-IN: $78K / 501 lines (largest — Europe trip, SaaS, Uber)
- ACT-HV: $52K / 38 lines (heavy tools)
- ACT-FM: $25K / 90 lines (farm running costs)
- ACT-GD: $16K / 39 lines (NT field work, furniture)
- ACT-PI: $2K / 2 lines (winding down)

### Active programs from canon / brand docs
From `living-ecosystem-canon.json` and brand-core:
- **Empathy Ledger** (`empathyledger.com`) — ethical storytelling, 226 storytellers, consent/sovereignty layer
- **JusticeHub** (`justicehub.com.au`) — justice network, CivicGraph integration, 6 live AI agent tools
- **Goods on Country** (`goodsoncountry.com`) — circular economy, beds/mattresses/washing machines for remote communities
- **Black Cockatoo Valley** — 150-acre (117 ha) regeneration estate, eco-cottages, Indigenous land-care jobs, biodiversity credits
- **The Harvest** (`theharvestwitta.com.au`) — CSA + seasonal gatherings at the valley
- **ACT Farm** — home base on Jinibara Country (Maleny/Sunshine Coast)
- **Art** — residencies, exhibitions, commissions

### STAY / JusticeHub extended program
STAY is a 3-year program producing: 7 method books (The STAY Series), 10 community volumes from 10 anchor Indigenous communities, ~50 hand-stitched young person Journals, national edition to every electorate office.
Infrastructure stack already live: CivicGraph (100,036 entities, 199,001 relationships, 96% postcode coverage) + Living Map of Alternatives (1,775 community models, 128 verified top-tier) + JusticeHub + Empathy Ledger + CONTAINED (shipping container exhibition, active tour at Mounty Yarns).
Cost of detaining one child one year: $1.33M (ROGS 2024-25).

---

## Revenue Streams (inferred from spend patterns and project descriptions)

From spend analysis and project structure (inferred, not from a revenue report):
- **Grants / philanthropy** — primary revenue source for CLG foundation entity; JusticeHub/STAY actively pitching funders
- **R&D Tax Incentive** — $109K potential 43.5% offset tracked (Q2+Q3 FY26), cash refundable
- **Ecosystem services** — R&D residencies (accommodation + prototyping on land), workshops, events
- **CSA / Harvest gatherings** — The Harvest farm box program
- **Biodiversity / carbon credits** — Black Cockatoo Valley regeneration finance model
- **Circular economy** — Goods on Country supply chain for remote communities
- **Dual entity structure**: Foundation (charitable CLG, grant-eligible) + Ventures (mission-locked trading arm); 40% of Ventures profits flow to community ownership

---

## AI / Automation: What Is Already Running

### Weekly automated loop
- `weekly-reconciliation.mjs` — cron every Monday 8am via PM2
- Auto-tags untagged lines, auto-matches receipts, auto-inserts new location/subscription rules, sends Telegram summary

### Learning loop (self-improving)
- Auto-inserts location rules when a suburb appears 3+ times in untagged lines
- Auto-inserts subscription patterns when a vendor appears 3+ times
- Unique constraints prevent duplicate rules

### Ingest auto-pipeline
- `ingest-statement-lines-raw.mjs` auto-chains: tag → match → R&D flag on every ingest

### Telegram bot (grammY, deployed on Vercel)
- 19 agent tools wired to Claude claude-3-5-haiku
- Sends weekly reconciliation summary to Ben
- Sends real-time alerts (planned: high-value/international charges)

### AI matching engine
- Dice coefficient bigrams for fuzzy vendor name matching
- Greedy 1:1 assignment (no double-matching)
- Vendor identity alias system (known: EDITANDPRIN = TJ's Imaging, KALLEGA = Centre Canvas)

### Knowledge / wiki pipeline
- Push-triggered CI: wiki rebuilds viewer, syncs snapshot, dispatches to regenerative-studio
- Tractorpedia: 183 articles auto-synced to 4 surfaces
- PM2 cron for wiki-sync as safety net

### Xero sync
- Xero webhook → Supabase via `api/webhooks/xero/`
- `sync-xero-to-supabase.mjs` — OAuth2 with refresh token rotation via `sync-xero-tokens.mjs`
- Connector receipts (Qantas, Uber, Webflow, Virgin, Booking.com) auto-attach PDFs to ACCPAY bills

### Data infrastructure (Supabase, ref tednluwflfhxyucgwigh)
- 254 tables, 148K+ funding records
- Key tables: `bank_statement_lines`, `receipt_emails`, `xero_transactions`, `xero_invoices`, `vendor_project_rules` (~90 rules), `location_project_rules` (31 rules), `subscription_patterns` (38)
- GrantScope (separate repo/instance): 52K justice funding records, 672K AusTender contracts, 312K AEC donations

