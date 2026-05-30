# Standard Ledger handoff — locked-period Project Tracking

**Generated:** 2026-05-30 · from `scripts/backfill-xero-tracking.mjs`

## Context

ACT is making Xero's `Project Tracking` category the source of truth for which project each
dollar belongs to. We've back-tagged all **unlocked** income invoices directly via the Xero API.

The **54 income invoices below ($1,076,907)** sit in **locked periods**
(invoice date ≤ 2025-09-30; FY26-Q1 BAS lodged), so the API refuses edits — correctly. They need
their `Project Tracking` option set as part of prior-period handling, or confirmation that locked-period
project classification isn't required for your process.

**Ask:** apply the `→ Set` option to each invoice's line items (or advise if a manual journal /
reclassification is the right mechanism for locked periods). No amounts change — this is dimensional tagging only.

## By project

| project_code → option | invoices | total |
|---|---|---|
| ACT-GD → ACT-GD — Goods | 12 | $482,500 |
| ACT-PI → ACT-PI — PICC | 4 | $271,700 |
| ACT-SM → ACT-SM — SMART | 6 | $126,500 |
| ACT-OO → ACT-OO — Oonchiumpa | 4 | $103,100 |
| ACT-JH → ACT-JH — JusticeHub | 6 | $37,555 |
| ACT-EL → ACT-EL — Empathy Ledger | 3 | $29,469 |
| ACT-FM → ACT-FM — The Farm | 16 | $13,070 |
| ACT-CF → ACT-CF — The Confessional | 1 | $7,150 |
| ACT-GP → ACT-GP — Gold Phone | 2 | $5,863 |

## Per invoice (54)

| Invoice | Contact | Date | Status | Total | → Set Project Tracking |
|---|---|---|---|---|---|
| INV-0273 | Brisbane Powerhouse Foundation | 2025-09-25 | PAID | $7,150 | `ACT-CF — The Confessional` |
| INV-0219 | State of Queensland (acting th | 2025-05-15 | PAID | $22,000 | `ACT-EL — Empathy Ledger` |
| INV-0221 | Paul Ramsay Foundation | 2025-03-23 | PAID | $4,400 | `ACT-EL — Empathy Ledger` |
| INV-0239 | Paul Ramsay Foundation | 2025-07-05 | PAID | $3,069 | `ACT-EL — Empathy Ledger` |
| INV-0214 | Bigmeats Qld Pty Ltd | 2025-02-09 | PAID | $5,720 | `ACT-FM — The Farm` |
| INV-0234 | Department of Housing | 2025-08-28 | PAID | $1,300 | `ACT-FM — The Farm` |
| INV-0269 | Aleisha J Keating | 2025-09-05 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0238 | Aleisha J Keating | 2025-07-04 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0256 | Aleisha J Keating | 2025-08-01 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0266 | Aleisha J Keating | 2025-08-22 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0274 | Aleisha J Keating | 2025-09-26 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0242 | Aleisha J Keating | 2025-07-11 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0257 | Aleisha J Keating | 2025-08-08 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0267 | Aleisha J Keating | 2025-08-29 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0254 | Aleisha J Keating | 2025-07-25 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0265 | Aleisha J Keating | 2025-08-15 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0250 | Aleisha J Keating | 2025-07-18 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0271 | Aleisha J Keating | 2025-09-19 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0270 | Aleisha J Keating | 2025-09-12 | AUTHORISED | $450 | `ACT-FM — The Farm` |
| INV-0235 | Department of Housing | 2025-09-05 | PAID | $200 | `ACT-FM — The Farm` |
| INV-0227 | The Snow Foundation | 2025-05-01 | PAID | $110,000 | `ACT-GD — Goods` |
| INV-0268 | The Snow Foundation | 2025-09-01 | PAID | $110,000 | `ACT-GD — Goods` |
| INV-0222 | Rotary Eclub Outback Australia | 2025-04-10 | AUTHORISED | $82,500 | `ACT-GD — Goods` |
| INV-0253 | Vincent Fairfax Family Foundat | 2025-07-24 | PAID | $50,000 | `ACT-GD — Goods` |
| INV-0259 | Centrecorp Foundation | 2025-08-11 | PAID | $37,620 | `ACT-GD — Goods` |
| INV-0208 | The Snow Foundation | 2025-02-04 | PAID | $27,500 | `ACT-GD — Goods` |
| INV-0240 | The Snow Foundation | 2025-06-29 | PAID | $16,600 | `ACT-GD — Goods` |
| INV-0255 | Red Dust Role Models Limited | 2025-07-30 | PAID | $15,950 | `ACT-GD — Goods` |
| INV-0260 | Our Community Shed Incorporate | 2025-08-11 | PAID | $13,500 | `ACT-GD — Goods` |
| INV-0232 | QIC LIMITED | 2025-06-30 | PAID | $12,000 | `ACT-GD — Goods` |
| INV-0258 | The Snow Foundation | 2025-08-11 | PAID | $5,545 | `ACT-GD — Goods` |
| INV-0220 | The Snow Foundation | 2025-03-13 | PAID | $1,285 | `ACT-GD — Goods` |
| INV-0228 | Jenn Brazier | 2025-07-01 | PAID | $3,888 | `ACT-GP — Gold Phone` |
| INV-0248 | Jenn Brazier | 2025-07-17 | PAID | $1,975 | `ACT-GP — Gold Phone` |
| INV-0245 | GREEN FOX TRAINING STUDIO LIMI | 2025-07-17 | PAID | $12,000 | `ACT-JH — JusticeHub` |
| INV-0246 | GREEN FOX TRAINING STUDIO LIMI | 2025-07-17 | PAID | $9,000 | `ACT-JH — JusticeHub` |
| INV-0247 | GREEN FOX TRAINING STUDIO LIMI | 2025-07-17 | PAID | $6,000 | `ACT-JH — JusticeHub` |
| INV-0261 | StreetSmart Australia | 2025-08-12 | PAID | $5,500 | `ACT-JH — JusticeHub` |
| INV-0223 | StreetSmart Australia | 2025-04-10 | PAID | $3,900 | `ACT-JH — JusticeHub` |
| INV-0249 | Minjerribah Moorgumpin (Elders | 2025-07-17 | PAID | $1,155 | `ACT-JH — JusticeHub` |
| INV-0276 | Ingkerreke Services Aboriginal | 2025-09-27 | PAID | $49,060 | `ACT-OO — Oonchiumpa` |
| INV-0277 | Ingkerreke Services Aboriginal | 2025-09-27 | PAID | $32,480 | `ACT-OO — Oonchiumpa` |
| INV-0275 | Ingkerreke Services Aboriginal | 2025-09-27 | PAID | $11,000 | `ACT-OO — Oonchiumpa` |
| INV-0278 | Ingkerreke Services Aboriginal | 2025-09-27 | PAID | $10,560 | `ACT-OO — Oonchiumpa` |
| INV-0264 | Palm Island Community Company  | 2025-08-14 | PAID | $81,400 | `ACT-PI — PICC` |
| INV-0231 | Palm Island Community Company  | 2025-05-28 | PAID | $71,500 | `ACT-PI — PICC` |
| INV-0262 | Palm Island Community Company  | 2025-08-14 | PAID | $68,200 | `ACT-PI — PICC` |
| INV-0263 | Palm Island Community Company  | 2025-08-14 | PAID | $50,600 | `ACT-PI — PICC` |
| INV-0230 | SMART Recovery Australia | 2025-07-01 | PAID | $27,500 | `ACT-SM — SMART` |
| INV-0213 | SMART Recovery Australia | 2025-05-04 | PAID | $27,500 | `ACT-SM — SMART` |
| INV-0212 | SMART Recovery Australia | 2025-02-14 | PAID | $27,500 | `ACT-SM — SMART` |
| INV-0210 | SMART Recovery Australia | 2025-02-07 | PAID | $16,500 | `ACT-SM — SMART` |
| INV-0211 | SMART Recovery Australia | 2025-04-01 | PAID | $16,500 | `ACT-SM — SMART` |
| INV-0224 | SMART Recovery Australia | 2025-04-11 | PAID | $11,000 | `ACT-SM — SMART` |

_Generated read-only from the Supabase mirror + chart. Unlocked invoices already tagged in live Xero._
