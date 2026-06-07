---
date: 2026-06-01
repo: act-global-infrastructure
topic: Make Xero → GHL → Notion one money pipe for Goods (extend the opportunity sync)
status: ready to pick up (fresh Claude Code instance) — self-contained, no prior context needed
authored_by: Goods-repo session (handoff into this repo)
---

# Handoff — close the GHL→Notion money seam for Goods

## Mission (one sentence)
Extend the **existing GHL→Notion opportunity sync** so it (a) **upserts on `External ID`** (kills duplicate
pages) and (b) **carries the 7 money-alignment fields** (Funding type / Match-eligible / Capital status /
Amount basis / Actual-paid / Xero contact ID / Xero invoice #), so Notion shows the *reconciled* Goods money
picture (Secured / Committed / grant-vs-commercial) instead of raw asks. Optionally wire the durable
**Xero→GHL Actual-paid sync** that feeds it.

## Why (what happened upstream this week, in the Goods repo)
In the Goods v2 repo, 7 "money-alignment" custom fields were created on GHL **opportunities** and backfilled
across the 3 Goods pipelines, and a reconciled cockpit was built at Goods `v2 /admin/loi-tracker`. The model:
- **GHL** = relationships + pipeline + classification (source of truth for *who / what stage*).
- **Xero** (Goods org "Nicholas Marchesi" `786af1ed`) = money truth. `monetaryValue` = the ASK; real cash only
  ever lives in **Actual-paid** (Xero-sourced).
- **Secured match** = Σ Actual-paid where Funding type ∈ {Grant, Philanthropic} & Match-eligible = Yes &
  Capital status = Paid = **$758,670**. **Committed** (Signed LOI / Contracted) = **$0** = the QBE gate (open).

A read-only review then found a **GHL→Notion sync already runs** but predates these fields → Notion still shows
raw asks + has duplicate pages. This handoff fixes that.

**Reference docs (in the GOODS repo `/Users/benknight/Code/Goods Asset Register`):**
- `wiki/outputs/2026-06-01-goods-notion-surfaces-alignment.md` — the full Notion alignment map (read this first)
- `wiki/outputs/2026-06-01-ghl-money-alignment-fields-and-rules.md` — field IDs + rules
- `wiki/outputs/2026-06-01-ghl-backfill-mapping-DRAFT.md` — the per-opp classification that was applied

## The exact targets

### The 7 GHL opportunity custom fields (location `agzsSZWgovjwgpcoASWG`)
| Field | ID | Values |
|---|---|---|
| Funding type | `UCFe9cyjk3sVKwtInfSG` | Grant · Philanthropic · Commercial sale · Community contribution · Demand signal · Other |
| Match-eligible (QBE) | `6tSoVICqtrTGQAzpPHn1` | Yes · No · TBC |
| Capital status | `QbfHdeNpz2JiMe5iRESS` | Signal · Ask made · Verbal yes · Signed LOI · Contracted · Invoiced · Paid |
| Amount basis | `LM1U3fVHJNB4KwvuK9ZF` | Estimate · Quote · Invoiced · Xero-actual |
| Xero contact ID | `e1GTAmBc3HLwxNiRVZjS` | text |
| Xero invoice # | `YFy6JM5tGjl4J4B5cHSV` | text |
| Actual paid (Xero) AUD | `R4QAmlXhi6gRRPrfuuz5` | number |

GHL returns these on opp search as `customFields: [{ id, fieldValueString | fieldValueNumber }]`.
**GHL write gotcha:** `PUT /opportunities/{id}` `customFields` must be **objects** `{ id, field_value }` —
passing JSON *strings* is silently dropped (200 OK, no change). `Version: 2021-07-28`.

### The Notion target DB
- **"ACT Opportunities"** — database `a28b97ba80b248c89d3d65486d865a07` / data source
  `collection://f09e2a15-42ec-4ba1-a8ee-66bb4304be40` (under *ACT Money Framework → Mission Control*).
- Current synced page properties: `Amount`, **`External ID` (`ghl:<oppId>`)**, `Funder / Contact`, `Name`,
  `Pile` (currently "Uncoded"), `Pipeline`, `Project Code` (blank), `Source` (= "GHL"), `Source URL`
  (GHL deep link), `Stage`, `Deadline`, `Last Synced`. Page body is blank.

### The 3 Goods pipelines (GHL)
Demand Register `UQsrmuqzxMSdCTklxEcG` · Buyer `FjMyJM3YzWQFmKqR9fur` · Supporter Journey `JvBFYpVpyKsw899lkFgj`.

## The sync scripts (in THIS repo)
- **`scripts/sync-opportunities-to-notion-db.mjs`** ← the GHL→Notion opportunity sync (writes `External ID`).
  **PRIME file to extend.**
- `scripts/sync-notion-changes-to-ghl.mjs` — reverse (Notion→GHL); also references `External ID`. Mind
  bidirectional loops when you add fields.
- `scripts/sync-ghl-to-notion.mjs`, `scripts/sync-opportunities-to-notion.mjs` — related; confirm which is
  canonical / which is retired before editing.
- **Scheduling:** `ecosystem.config.cjs` (pm2). The opp sync did **not** obviously appear as a cron entry there
  — confirm whether it runs on a schedule or manually. The Notion DB id is **not** hardcoded in the script →
  look in `config/`.

## The 3 problems (from the review)
1. **Missing fields** — sync carries only Amount(=ask)/Stage/Pipeline, not the 7 money fields → Notion shows
   raw asks, not Secured/Committed.
2. **Duplicates** — QIC has **two** Notion pages with the same `External ID: ghl:97JpDZ8tcaLXuh0Au89k` → the
   sync inserts instead of upserting. Likely repeated across the set → inflated Notion totals.
3. **Fragmentation** (context, not in scope for the sync fix) — funder $ also lives in a "Sales Pipeline" DB
   (`36cebcf981cf8017ac53c52aa06524be`, in Goods Enterprise HQ `36cebcf981cf8081b83ee6acb0ea2a9e`), Capital
   Stack, Investor Pipeline. The Investor Pipeline page already says "the authoritative version is the admin app."

## The work (in order)
1. **Read** `scripts/sync-opportunities-to-notion-db.mjs` + the `config/` entry for the DB id and field map.
   Understand: how it lists GHL opps, how it maps fields, and create-vs-update logic.
2. **Upsert on `External ID`** — before creating, query the ACT Opportunities data source for an existing page
   with the same `External ID` and update it; only insert if none. Then a **one-off dedupe** of existing
   duplicates — **dry-run first** (list which pages would be archived/merged) before any delete/archive.
3. **Add the 7-field mapping** — add the Notion properties to the DB if missing (Funding type [select],
   Match-eligible [select], Capital status [select], Amount basis [select], Actual paid (Xero) AUD [number],
   Xero invoice # [text], Xero contact ID [text]); read the 7 GHL customFields per opp and write them. Keep
   `Amount` = monetaryValue (the ask) and add `Actual paid` as the separate cash number.
4. **(Optional, Layer B — the durable Xero→GHL feed)** read `xero_invoices`/`xero_payments` from the mirror,
   match to GHL opps, write **Actual-paid + Xero contact ID + Amount basis=Xero-actual** back to GHL.
   **⚠️ CRITICAL — attribute by PROJECT CODE, not raw contact totals.** A Xero *contact* total is org-wide
   (all ACT projects), so it overstates the Goods slice. Proven live 2026-06-01: the Xero contact "The Snow
   Foundation" = **$493,130** across all projects (3-yr window, $0 outstanding), but the **Goods**-attributed
   figure is **$402,930** — the ~$90K gap is non-Goods Snow money. So Actual-paid must come from invoices/
   payments filtered to the Xero tracking category **"Project Tracking" → "ACT-GD — Goods"**
   (`1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe` → option `63aee6ea-0005-48b8-8019-5fe9666ead29`) / the
   `project_code='ACT-GD'` layer — NOT `get_top_customers_by_revenue` (which is contact-level/org-wide).
   The Goods session set these by hand from the project-attributed verified figures: **Centrecorp 123,332
   (DONE — Xero-validated, $0 outstanding, single-project)** · VFFF 50,000 · TFN 144,558 · AMP 21,900 ·
   Red Dust 15,950 · QIC 12,000 · Julalikari 19,800 · Our Community Shed 20,265 · Mala'la 5,434. **Snow
   402,930 still TODO** — needs the project-attributed figure (its contact total is org-wide $493,130).
   The *automated* version of all of this belongs here.

## Live access (from THIS repo's env)
- **GHL:** `GHL_API_KEY` + `https://services.leadconnectorhq.com`, header `Version: 2021-07-28`.
- **Notion:** the sync scripts already carry Notion auth (token in env/config).
- **Xero:** live via the app's OAuth token in `xero_tokens` (id='default') in the Supabase mirror
  `tednluwflfhxyucgwigh`; refresh via the sync's flow if expired. Org "Nicholas Marchesi" `786af1ed`;
  header `xero-tenant-id` = `XERO_TENANT_ID`. Mirror tables: `xero_invoices`, `xero_payments`,
  `xero_bank_transactions`. **Period lock = 30-Sep-2025** (no writes to records on/before it).

## Guardrails / tiers
- Notion DB schema add + sync writes + GHL writes = **Tier 2** (propose → run on Ben's go).
- **Never** run the dedupe destructively without a dry-run listing the affected pages first.
- Confirm scope with Ben: is "ACT Opportunities" org-wide (all ACT projects) or should the field-mapping be
  Goods-only? (The 3 Goods pipeline IDs above scope it to Goods.)
- Watch the **bidirectional loop**: `sync-notion-changes-to-ghl.mjs` pushes Notion→GHL — make sure new fields
  flow one direction (Xero→GHL→Notion) and don't ping-pong.

## Done when
- QIC (`ghl:97JpDZ8tcaLXuh0Au89k`) is **one** Notion page with Capital status=Paid, Match-eligible=No,
  Funding type=Grant, Actual paid=12000.
- Snow / TFN / VFFF etc. show Capital status + Actual-paid; the Secured rollup is derivable in Notion ≈ $758,670.
- Re-running the sync is **idempotent** (no new dupes).
- Leave a 2-line note back in the Goods ledger
  (`/Users/benknight/Code/Goods Asset Register/thoughts/shared/handoffs/network-consolidation/current.md`)
  and update memory `[[ghl-money-alignment]]`.

## First moves
1. `cat scripts/sync-opportunities-to-notion-db.mjs` and the relevant `config/` file.
2. `grep -n "External ID\|customFields\|monetaryValue\|properties" scripts/sync-opportunities-to-notion-db.mjs`
3. Confirm the dupe: query ACT Opportunities for `External ID = ghl:97JpDZ8tcaLXuh0Au89k` → expect 2 pages.
4. Propose the upsert + field-mapping patch to Ben → dry-run → run.
