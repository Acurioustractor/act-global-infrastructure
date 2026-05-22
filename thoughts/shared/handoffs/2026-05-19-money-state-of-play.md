---
title: Money state of play — receipt architecture redesign needed
date: 2026-05-19
status: archived — superseded by 2026-05-22 audit + MiniMax migration session
session: claude (Opus 4.7, 1M context) — 2026-05-18 marathon
related_handoffs:
  - 2026-05-17-finance-tagging-platform-handoff.md
  - 2026-05-18-xero-archive-walk-proposal.md
  - 2026-05-18-xero-pushback-dedicated-session.md
archive_note: |
  Reconstructed from 2026-05-22 session-start context (file existed in working tree as
  uncommitted changes; superseded before commit). Key info: receipt-ingestion path
  decision (grill-me Q1) was the open question that triggered the 2026-05-21 overnight
  audit. That audit + RCA + runbook subsequently resolved on 2026-05-22.
---

## Ledger
**Updated:** 2026-05-19T00:00:00Z
**Goal:** Finance tagging + receipt + reconciliation system rebuilt during 2026-05-18 marathon. Now stuck at architecture-level: parallel receipt-ingestion paths create duplicates. Grill-me started but only Q1 asked.
**Branch:** main (clean)
**Test:** open /finance/transactions — see 98% tagged, 81% receipted, 4 definite + 16 probable dups in audit panel.

### Now
[->] Awaiting Ben's answer to **grill-me Q1**: which path is the single canonical receipt-capture going forward? Recommended **B = Dext + auto-billing connectors only**. Once answered, design rest of receipt architecture.

### Today's session (2026-05-18 marathon — 6 PRs landed)

| PR | What landed |
|---|---|
| #81 | Finance tagging platform + ACT-HV audit + Xero cleanup (deleted 12 unused tracking options, renamed Rental hyphen, deduped ACT-IN) |
| #82 | Quick-tagger UI — Apply Tier A+B button · 🎨 paint-bucket · 📎 batch OCR · per-row tier chips |
| #83 | Reality-check strip — 4-tile health dashboard (Volume · Tagged% · Receipted% · Audit issues) |
| #84 | Duplicate detection tuning + Duplicates panel + plan-only void script |
| #85 | Exclude transfers + ATO from receipt-coverage denominator (76% → 80%) |
| (no PR) | Dext CSV cross-match script + sync-bill-attachments run (5 copied $2K) |

### Critical findings (load these before resuming)

1. **Receipts ARE being captured — they just stop at the AUTHORISE step.** 152 DRAFT bills sitting in Xero, $25K total, 150 with attachments, 149 from Dext. Need bulk-approve in Xero UI.

2. **Xero flags 51 sets as duplicates but most are FALSE POSITIVES.** Xero's dedup is vendor + amount only — recurring monthly subscriptions (Bitwarden $12, HighLevel $25, Cognition AI $200, Codeguide $29, Webflow $29) all get flagged. Rule: SAME date × 2+ = real dup (void one). DIFFERENT dates = monthly sub (Keep all).

3. **Real duplicate inflater is OUR pipeline + Dext both writing bills.** `scripts/gmail-to-xero-pipeline.mjs` + `scripts/push-receipts-to-xero.mjs` historically pushed receipts to Xero in parallel with Dext. Crons stopped (gmail-sync, receipt-capture, receipt-match — all status=stopped), but legacy duplicates remain in DB.

4. **Qantas "broken connector" mystery solved.** 11 Qantas 2026-05-10 charges ($11K) showed missing receipts. The receipts ARE in Dext (CSV export confirmed), they stopped at DRAFT in Xero. Same root cause as #1.

5. **RNM Carpentry corrected.** Was tagged ACT-HV via vendor_rule. Ben confirmed it's ACT-OO (Oonchiumpa station). Bad rule deleted, 3 rows retagged manual ACT-OO.

### Current numbers (`/api/finance/transactions/reality`)
- **3,034 deduped rows** ($1.95M total spend)
- **98% tagged** (69 untagged — including some from latest sync)
- **81% receipted** (539 missing, 225 correctly excluded as transfers/ATO)
- **263 bill↔spend matched pairs** (up from 36 at start of day — widened dedup +30d)
- **4 definite + 16 probable bill+bill duplicates** ($61K exposure) — Duplicates panel on /finance/audit shows one-click Xero links

### Open critical-path items (next session priority)

1. **🚨 Grill-me Q1 awaiting answer** — which canonical path? My rec: B (Dext + auto-bill connectors only). Then map Q2-7.
2. **Bulk-approve the 177 DRAFT bills in Xero** (after deduping the 51 same-date pairs). Will unlock ~$25K of receipted evidence.
3. **Triage the 20 duplicate groups** via Duplicates panel on /finance/audit. Click each Xero chip, verify, void via Xero UI.
4. **Archive `scripts/gmail-to-xero-pipeline.mjs` + `scripts/push-receipts-to-xero.mjs`** to `scripts/_archive/2026-05/` to prevent recurrence. Tier 1, ~30 sec.
5. **Dext setting check** — Dext-to-Xero integration probably set to "Save as Draft". Flip to "Auto-publish" (Dext settings → integrations → Xero).
6. **34 Dext-CSV matches** — receipts in Dext with permalinks, ready to attach to specific Xero rows. Report at `thoughts/shared/reports/dext-match-report-2026-05-18.md`.

### Tools shipped today (all live on main)
- `/finance/audit` — Duplicates panel, archive-candidate filter, OCR finds
- `/finance/transactions` — Reality strip, Quick Tagger toolbar, tier chips, paint-bucket mode, batch OCR
- `/api/finance/transactions/reality` — health metrics endpoint
- `config/tag-suggester-rules.json` — single source of truth for Tier A-D rules (33 vendors)
- `scripts/suggest-from-line-desc.mjs` — read-only tag suggester
- `scripts/match-dext-csv-to-unreceipted.mjs` — cross-match Dext export to unreceipted Xero
- `scripts/void-duplicate-bills.mjs` — plan-only (no Xero writes), lists candidates with links
- `scripts/dryrun-archive-xero-tracking-options.mjs` — Xero tracking option cleanup planner

### Decisions captured today
1. **RNM Carpentry → ACT-OO** (NOT ACT-HV, NOT ACT-FM). Oonchiumpa station project.
2. **Flight Bar Witta IS a real Witta wine bar** — but the Xero contact misroutes many NT-trip charges (Tennant Creek, Alice Springs, Davenport). Vendor splitting needed in Xero.
3. **Pre-Jan-26 Witta vendor spend → ACT-FM** (not ACT-HV). Harvest cutoff is 2026-01-01.
4. **Auto-tagger guard preserved** — `project_code_source LIKE 'manual%'` rows never re-tagged by sync or vendor rules.
5. **Xero tracking dropdown: 33 active options** (cleaned from 46). ACT-IN duplicate archived.
6. **Manual void via Xero UI is the way** — auto-void script intentionally stripped to plan-only after Ben's "screwing things up" concern.

### Open questions still needing Ben's answer (as of 2026-05-19; some resolved 2026-05-22)
1. **Grill-me Q1**: which receipt-capture path? (A/B/C above) — *2026-05-22 audit recommends B (Dext + connectors), not yet implemented*
2. **Sydney trip 2025-10-01 + 2025-10-13 cluster** — what project was it for? (~$141) — *still open*
3. **Hong Kong $63.70 SP BINGELI SAN PO KONG** (2025-09-08) — real trip or card-skim? — *still open*
4. **ACT Pty date** — repo says 24 Apr 2026, gmail thread said 22. Need ASIC extract to confirm — *still open*
5. **31 small untagged one-offs** ($1K total) — tag as ACT-CORE catch-all or leave? — *still open*

### How to resume (historical — 2026-05-22 audit happened next)
1. Load this current.md (auto-loaded by SessionStart hook).
2. Re-read the grill-me Q1 → respond with A/B/C/Other.
3. I'll continue grill-me Q2-7 based on the answer.
4. After grill-me complete: write the receipt architecture design doc.
5. Then implement: archive scripts, set Dext to auto-publish, bulk-approve DRAFTs, void real dups.

### Tools / state for next session (historical)
- Dev server should still be running on :3002 (PID may have changed)
- Branch: main, clean
- Latest sync ran 2026-05-18 ~6pm AEST — re-run before any new analysis: `node scripts/sync-xero-to-supabase.mjs full --days=350`
