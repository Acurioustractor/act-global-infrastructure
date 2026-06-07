# Phase 2 backfill — DRY RUN (no writes)

**Generated:** 2026-05-30 · scope: all projects · lock date `2025-09-30` · tool `scripts/backfill-xero-tracking.mjs`

Set the Xero `Project Tracking` option (keyed off the clean Supabase `project_code`) on income
invoices that lack it. Apply GET-fresh-validates each invoice against live Xero and skips any
already correct. **VOIDED/DELETED/DRAFT excluded; only AUTHORISED/PAID income.**

## Unlocked — apply in Xero (17 invoices · $647,411)

By project:

| project_code | invoices | total |
|---|---|---|
| ACT-GD → ACT-GD — Goods | 5 | $249,711 |
| ACT-PI → ACT-PI — PICC | 1 | $165,000 |
| ACT-HV → ACT-HV — The Harvest Witta | 6 | $112,500 |
| ACT-JH → ACT-JH — JusticeHub | 3 | $88,000 |
| ACT-SM → ACT-SM — SMART | 2 | $32,200 |

Per invoice:

| Invoice | Contact | Date | Status | Total | Now | → Set |
|---|---|---|---|---|---|---|
| INV-0321 | The Snow Foundation | 2026-05-22 | PAID | $132,000 | —none— | `ACT-GD — Goods` |
| INV-0291 | Centrecorp Foundation | 2025-11-26 | PAID | $85,712 | —none— | `ACT-GD — Goods` |
| INV-0282 | Julalikari Council Aborigina | 2025-10-21 | PAID | $19,800 | —none— | `ACT-GD — Goods` |
| INV-0308 | Our Community Shed Incorpora | 2026-01-20 | PAID | $6,765 | —none— | `ACT-GD — Goods` |
| INV-0283 | Mala’la Health Service Abori | 2025-10-21 | PAID | $5,434 | —none— | `ACT-GD — Goods` |
| INV-0316 | Sonas Properties Pty Ltd | 2026-02-16 | PAID | $44,000 | `The Harvest` | `ACT-HV — The Harvest Witta` |
| INV-0302 | Regional Arts Australia | 2025-12-16 | AUTHORISED | $16,500 | —none— | `ACT-HV — The Harvest Witta` |
| INV-0301 | Regional Arts Australia | 2025-12-16 | PAID | $16,500 | —none— | `ACT-HV — The Harvest Witta` |
| INV-0299 | Regional Arts Australia | 2025-12-11 | PAID | $16,500 | —none— | `ACT-HV — The Harvest Witta` |
| INV-0309 | Berry Obsession PTY LTD | 2026-02-10 | PAID | $13,000 | —none— | `ACT-HV — The Harvest Witta` |
| INV-0319 | Blue Gum Station | 2026-03-14 | PAID | $6,000 | —none— | `ACT-HV — The Harvest Witta` |
| INV-0303 | Homeland School Company | 2026-05-18 | AUTHORISED | $44,000 | `ACT-GD — Goods` | `ACT-JH — JusticeHub` |
| INV-0295 | Just Reinvest | 2026-03-01 | PAID | $27,500 | —none— | `ACT-JH — JusticeHub` |
| INV-0298 | Dusseldorp Forum | 2025-12-11 | PAID | $16,500 | `Mounty` | `ACT-JH — JusticeHub` |
| INV-0286 | Palm Island Community Compan | 2025-11-03 | PAID | $165,000 | —none— | `ACT-PI — PICC` |
| INV-0304 | SMART Recovery Australia | 2026-02-09 | PAID | $30,000 | —none— | `ACT-SM — SMART` |
| INV-0322 | SMART Recovery Australia | 2026-03-19 | PAID | $2,200 | —none— | `ACT-SM — SMART` |

## Locked (≤ 2025-09-30) — hand to Standard Ledger (54 invoices · $1,076,907)

Cannot edit in Xero (period lock). By project:

| project_code | invoices | total |
|---|---|---|
| ACT-GD | 12 | $482,500 |
| ACT-PI | 4 | $271,700 |
| ACT-SM | 6 | $126,500 |
| ACT-OO | 4 | $103,100 |
| ACT-JH | 6 | $37,555 |
| ACT-EL | 3 | $29,469 |
| ACT-FM | 16 | $13,070 |
| ACT-CF | 1 | $7,150 |
| ACT-GP | 2 | $5,863 |

_Full JSON: /tmp/xero-backfill-worklist.json. Nothing has been written to Xero._
