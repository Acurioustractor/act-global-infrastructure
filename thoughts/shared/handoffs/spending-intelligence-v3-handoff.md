# Spending Intelligence System v3 — Session Handoff
**Date:** 2026-04-13
**Previous handoff:** `thoughts/shared/handoffs/spending-intelligence-v2-handoff.md`

## What was built this session

### React frontend — complete rewrite
- **Inbox-first UI** at `/finance/reconciliation` — each unmatched item shows candidate matches from bills + receipt_emails with one-click Link/No Receipt/Skip actions
- **Dashboard view** (toggle) — project breakdown, R&D summary, vendor intelligence, receipt pipeline
- **BAS readiness ring** — compact header with coverage %, matched/unmatched/no-receipt counts
- **Quarter selector** — Q1/Q2/Q3/Q4 tabs
- **Impact strip** — unreceipted spend, GST at risk, R&D offset at risk, total at risk

### API layer
- `api/finance/reconciliation/route.ts` — rewritten to query `bank_statement_lines` as source of truth (was `xero_transactions`)
- `api/finance/reconciliation/inbox/route.ts` — NEW: serves each unmatched line with top-3 candidate matches scored by vendor/amount/date, supports POST for match/no_receipt/dismiss/tag actions
- `api/finance/projects/[code]/route.ts` — added `cardSpend` section from `bank_statement_lines`

### R&D tagging
- Migration: `rd_eligible` boolean column on `bank_statement_lines`
- Auto-set from project codes: ACT-EL, ACT-IN, ACT-JH, ACT-GD
- API serves R&D summary: total eligible, potential offset, offset at risk, coverage %
- UI: purple R&D card in dashboard view

### Bill-to-BSL alignment engine
- `scripts/align-bills-to-statements.mjs` — matches xero_invoices (ACCPAY with attachments) to bank_statement_lines by vendor/amount/date scoring
- Reuses Dice coefficient matching from reconciliation-report.mjs
- Greedy 1:1 matching (each candidate used once)
- Auto-apply at score >= 0.75, ambiguous 0.45-0.75, unresolved below

### Q3 FY26 ingestion
- 704 lines ingested from Xero UI paste ($375K, Jan-Mar 2026)
- 100% project-tagged (was 0%)
- 92.8% receipt coverage (was 0%)
- 540 R&D eligible lines ($94K)

### Learning loop upgraded
- Weekly reconciliation now auto-inserts location rules (3+ charges) and subscription patterns (3+ charges)
- Unique constraints added to `location_project_rules.location_pattern` and `subscription_patterns.vendor_pattern`
- Noise filter for location extraction (strips Xero status text, generic terms, major cities)
- 10 subscriptions and 11 location rules auto-inserted on first run

### Infrastructure fixes
- **Pagination bug**: all scripts reading bank_statement_lines now paginate past Supabase 1000-row default (tag-statement-lines, reconciliation-report, weekly-reconciliation, align-bills-to-statements)
- **Auto-pipeline after ingest**: ingest-statement-lines-raw.mjs now auto-runs tagger → matcher → R&D flagger
- **26 vendor rules** added to vendor_project_rules table (Carba Tec, Total Tools, Maleny Landscaping, etc.)
- **31 location rules** added (Slovenia, Budapest, Canberra, Yulara, Mittagong, Maroochydore, etc.)

## Current state

### Coverage numbers
| | Q2 (Oct-Dec) | Q3 (Jan-Mar) | Combined |
|---|---|---|---|
| Lines | 872 | 670 | 1,542 |
| Spend | $320K | $174K | $494K |
| Tagged | 100% | 100% | 100% |
| Receipted | 97.2% | 92.8% | 95.3% |
| Gaps | 24 | 48 | 72 |
| R&D eligible | $157K | $94K | $251K |
| R&D offset | $68K | $41K | **$109K** |

### Q3 project breakdown
| Project | Spend | Lines | Pattern |
|---|---|---|---|
| ACT-IN | $78K | 501 | Europe trip, SaaS, Uber/travel |
| ACT-HV | $52K | 38 | Heavy tools (Carba Tec $6.4K, Total Tools $4.5K) |
| ACT-FM | $25K | 90 | Maleny Landscaping, Seasons groceries, farm running costs |
| ACT-GD | $16K | 39 | Kallega $4.7K, Carla Furnishers $4.8K, NT trip Feb 2-6 |
| ACT-PI | $2K | 2 | Just Hatch Electrical — winding down |

### Q3 trips detected
1. **NT Central / Goods on Country** (Feb 2-6): Yulara → Erldunda → Ti Tree → Tennant Creek → Alice Springs
2. **NSW South Coast / Bundanon** (Feb 23-27): Sydney → Mittagong → Old Bar → Kempsey → Illaroo
3. **Tasmania** (Jan 14 + Feb 19): Hobart, Tullah Lakeside
4. **Europe** (Mar 23-30): Berlin → Ljubljana → Bled → Kranjska Gora → Budapest → Amsterdam
5. **Canberra** (Mar 27-30): Parliament House visit

### Remaining 72 gaps
- **Q2 (24 gaps, $25K)**: Carla Furnishers $5.6K, Kennards $2.9K, Defy Design $2.8K — same gaps from prior session
- **Q3 (48 gaps, $30K)**: Qatar Airways $5K, Carla Furnishers $4.8K, Retro Outdoor $4.5K, PayPal $3.8K, MYO Brendale $3.2K + physical receipts from hardware stores, restaurants, fuel
- All genuinely need: Xero app photo, vendor portal download, or Gmail forward

## Key learnings (also in gstack learnings)

1. **Vendor identity mismatch is the core problem** — EDITANDPRIN=TJ's Imaging, KALLEGA=Centre Canvas, Seasons=IGA. Amount-matching across sources catches what vendor-name matching misses.
2. **Location > vendor for project tagging** — 277 lines tagged in one pass from suburb rules. For project-based orgs, the place IS the project.
3. **$82.50 GST threshold** — below this, auto-mark everything. Zero tax impact. Eliminated 49 items.
4. **SaaS vendors always email receipts** — auto-mark as matched. The receipt exists, it just needs ingesting from Gmail.
5. **Supabase 1000-row cap** — silent truncation. Every script needs pagination.

## What to build next

### Phase 2 — Close the loop
- [ ] **Vendor alias table**: every manual match in inbox teaches system a new alias (EDITANDPRIN → TJ's Imaging)
- [ ] **Real-time Telegram alerts**: detect international/high-value charges, send "snap this receipt" reminder
- [ ] **Auto-link after Xero sync**: add align-bills-to-statements.mjs to weekly loop (after xero-sync cron)
- [ ] **Receipt freshness tracking**: days between purchase date and receipt capture — compliance metric

### Phase 3 — Eliminate the inbox
- [ ] **Sub-$82.50 auto-mark on ingest** (not as cleanup)
- [ ] **Pre-populate vendor aliases from Dext supplier rules**
- [ ] **Inbox trend metric**: if inbox grows quarter-over-quarter, something is wrong

### Phase 4 — Make it a product
- [ ] **Grant acquittal export** per project code (PDF-ready for funders)
- [ ] **Board-ready financial summary** with R&D offset tracking
- [ ] **Quarterly BAS pack** (one click, ready for accountant)
- [ ] **Subscription intelligence dashboard** (cost trends, renewal dates, receipt status)

### Dext sunset checklist
- [ ] Verify all Dext receipts are in receipt_emails table (1639 already imported)
- [ ] Confirm Xero app + Gmail sync covers all future receipt sources
- [ ] Cancel Dext subscription ($28-42/mo saved)

## Key files
| File | Purpose |
|------|---------|
| `apps/command-center/src/app/finance/reconciliation/page.tsx` | Inbox-first UI |
| `apps/command-center/src/app/api/finance/reconciliation/route.ts` | Dashboard API (BSL-based) |
| `apps/command-center/src/app/api/finance/reconciliation/inbox/route.ts` | Inbox API with candidate matching |
| `scripts/align-bills-to-statements.mjs` | Bill-to-BSL alignment engine |
| `scripts/tag-statement-lines.mjs` | Project tagger (vendor + location + subscription) |
| `scripts/reconciliation-report.mjs` | Receipt matcher |
| `scripts/weekly-reconciliation.mjs` | Monday cron (tag + match + learn + Telegram) |
| `scripts/ingest-statement-lines-raw.mjs` | Ingest + auto-pipeline |
| `data/statement-lines-q3-fy26.txt` | Raw Q3 data file |

## DB changes made
- `bank_statement_lines.rd_eligible` column added (migration)
- `location_project_rules`: unique constraint on `location_pattern`, 31 new rules
- `subscription_patterns`: unique constraint on `vendor_pattern`, 10 auto-inserted
- `vendor_project_rules`: 26 new vendor rules
- Q3 FY26: 704 lines ingested, 670 tagged, 587 receipted/no-receipt

## Prompt for next session

```
Read the handoff at thoughts/shared/handoffs/spending-intelligence-v3-handoff.md

The spending intelligence system now has two quarters of data (Q2+Q3 FY26, 1542 lines, $494K, 95.3% receipted). The inbox UI is live at /finance/reconciliation. 72 gaps remain — all genuinely need human receipt capture.

Next priorities:
1. Build vendor alias learning — when someone clicks "Link" in the inbox on a mismatched vendor name, store it as an alias so the matcher auto-links next time
2. Wire align-bills-to-statements.mjs into the weekly cron (after xero-sync)
3. Add sub-$82.50 auto-mark to the ingest pipeline
4. Build real-time Telegram alerts for high-value/international charges
5. Start Q4 FY26 ingestion when data available
```
