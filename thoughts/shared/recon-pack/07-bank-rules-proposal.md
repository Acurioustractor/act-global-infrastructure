# 07 — Xero Bank-Rules Proposal (auto-code the recurring spend)

**Date:** 2026-05-29 · **For:** Ben / Standard Ledger to implement in **Xero → Bank rules**
**Why:** ~$100K+ of Q2/Q3 spend is recurring, predictable vendors. Bank rules auto-code them on import → reconciliation becomes one click, and the tagging stays consistent (kills the "General Expenses" drift). **Bank rules are set up in the Xero UI** (no API) — this is the copy-list.

> **How a bank rule works:** match on payee/contains text → set account code + tax rate + (optionally) a tracking/project default. Applies to new feed lines and can be run over existing unreconciled lines. Where a vendor spans multiple projects, the rule sets the **account** + a **default project**, and the vendor auto-tagger / a quick review refines the project.

## Tier 1 — set these now (highest volume / value)

| Match (payee contains) | n (Q2/Q3) | $ | → Account | Tax | Default project | Note |
|---|---|---:|---|---|---|---|
| `Qantas` (+ `Qantas Group Accommodation`) | 123 | $83,334 | **493 Travel - National** | GST on Expenses | ACT-IN | You flagged this one. Biggest single rule. |
| `Uber` | 222 | $8,314 | **452 Parking, Tolls & Taxis** | GST on Expenses | ACT-IN | Rideshare. |
| `NAB Fee` / `NAB ` (fees) | 237 | $830 | **407 Bank Fees** | BAS Excluded | ACT-CORE | High count, tiny $ — pure noise removal. |
| `Webflow`,`Vercel`,`OpenAI`,`Anthropic`,`Firecrawl`,`HighLevel`,`Dialpad`,`Squarespace`,`Google`,`Apple` | ~100 | ~$4.4K | **485 Subscriptions** | ⚠️ see note | ACT-IN / ACT-CORE | **GST varies** — overseas SaaS often GST-free; AU-registered charge GST. SL to set per-vendor tax. |
| `Telstra` | 6 | $580 | **489 Telephone & Internet** | GST on Expenses | ACT-IN | |

## Tier 2 — set after (clear category, lower volume)

| Match | n | $ | → Account | Default project |
|---|---|---:|---|---|
| `Bunnings`,`Maleny Hardware`,`Maleny Landscaping` | 27 | $11,632 | 446 Materials & Supplies | ACT-FM / ACT-HV (refine) |
| `Defy` / `Defy Manufacturing` | 13 | $74,229 | 446 Materials & Supplies | ACT-GD |
| `Kennards Hire` | 7 | $14,086 | 432 Hire Expenses | ACT-GD |
| `Avis`,`Budget`,`GoGet Carshare` | 14 | $5,286 | 449 MV / 432 Hire | ACT-GD / ACT-IN |
| `BP`,`Liberty Maleny` | 17 | $3,032 | 449 MV - Fuel & Oil | ACT-FM / ACT-GD |
| `AGL` | 4 | $1,317 | 445 Light, Power, Heating | ACT-FM |
| `Airbnb` | 5 | $9,943 | 493 Travel - National | ACT-PI (refine) |
| `Allclass` | 5 | $10,609 | 473 Repairs & Maintenance | ACT-FM |
| `Taxi Receipt` | 6 | $330 | 452 Parking, Tolls & Taxis | ACT-JH |

## Important caveats (so the rules don't create new problems)

1. **Qantas is NOT a duplicate problem** — same-day multi-charges are legitimate bookings. A bank rule is safe here; do *not* dedup Qantas.
2. **SaaS GST is the trap** — `accounting.transactions` shows many SaaS at GST-free (overseas). Don't blanket-apply GST on Expenses to the SaaS rule; SL sets tax per vendor (e.g. Google Australia / Apple Pty Ltd = AU GST; OpenAI/Anthropic/Vercel = often GST-free).
3. **Project defaults are starting points** — multi-project vendors (Bunnings, fuel) still need the auto-tagger / a glance to land the right project. The rule fixes the *account* (kills the 429 drift); the project is refined after.
4. **Run rules over existing unreconciled lines** — after creating each rule, Xero can apply it to the open Q2/Q3 lines, which knocks out a chunk of the reconciliation backlog immediately.

## Beyond bank rules — the other automations to re-enable

- **`vendor_project_rules` auto-tagger** (cron) — sets project_code by vendor (with the `manual%` source guard). Keep running.
- **Dext supplier rules** — auto-route bills to the right project/account at capture (so bills don't land in 429 in the first place). This is the upstream fix for the General-Expenses problem.
- **Repeating bills** in Xero for fixed subscriptions — auto-creates the bill each month.

*Source: `xero_transactions` SPEND, AUTHORISED, ACT accounts, 2025-10-01..2026-03-31, vendors with ≥3 occurrences (Supabase, SELECT-only). Account codes from `config/xero-chart.json`.*
