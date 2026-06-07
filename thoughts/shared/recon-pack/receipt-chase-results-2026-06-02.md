# Receipt-chase results — NAB Visa #8815 + ACCPAY bills (FY26)

**Prepared:** 2026-06-02 (READ-ONLY, night-shift) · **Entity:** Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066)
**Method:** `scripts/reconcile-ground-truth.mjs` (the gap) → `scripts/gmail-deep-search.mjs Q2 Q3` (tight ±7d hunt) → `scripts/receipt-broad-search.mjs` (full-FY, free-text + Stripe-relay hunt for the above-threshold misses).

## Headline (verified)
- **It is a matching gap, not a receipt gap.** Receipts are ~99% present (1,994 of 2,015 live ACCPAY bills receipted; 16 GST-bearing bills ≥$82.50 with no attachment = **$10,824**).
- The Gmail deep-search "hits" are **mostly false positives** — flight reminders, marketing ("120,000 Velocity Points"), reply threads — not tax invoices.
- The genuinely-missing **above-threshold** receipts are a short list. Most that *are* recoverable were missed by the tight search because they are **Stripe-/invoice-relayed** (e.g. `invoice+statements@supabase.com`), or the Xero contact name is **misspelled** ("Superbase" → Supabase). The broadened search recovers them.

## Recovery map — material (≥ $82.50) missing receipts

| Vendor (Xero) | $ | Date | Qtr | Status | Where to get it |
|---|--:|---|---|---|---|
| Supabase `#WSHNYD-00017` | 119.77 | 2025-12-22 | Q2 | ✅ **FOUND in Gmail** | nicholas@ · `invoice+statements@supabase.com` · msg `19b40af6d6c467ed` |
| Supabase `#WSHNYD-00019` | 124.47 | 2026-02-23 | Q3 | ✅ **FOUND in Gmail** | accounts@ · msg `19c7f9ba9c1677ec` |
| Supabase `#WSHNYD-00020` | 124.59 | 2026-03-23 | Q3 | ✅ **FOUND in Gmail** | hi@ · msg `19d1047eec9b68f1` |
| Anthropic / Claude.AI | 287.07 | 2026-02-06 | Q3 | ⚠️ **PORTAL** | No email exists (only a Jan receipt is emailed). Pull from **console.anthropic.com → Billing → Invoices** |
| Anthropic / Claude.AI | 286.45 | 2026-03-06 | Q3 | ⚠️ **PORTAL** | console.anthropic.com → Billing → Invoices |
| Descript | 447.62 | 2025-11-24 | Q2 | ⚠️ **PORTAL** | No email to act.place (verified). Pull from **web.descript.com → account → Billing** |
| Bunnings | 571.10 | 2026-02-26 | Q3 | ❌ **NOT EMAILED** | In-store purchase (only a *May* online invoice is in Gmail). Check PowerPass / physical receipt |
| Virgin Australia | 385.79 | 2025-10-22 | Q2 | ⚠️ **PORTAL / MATCH** | Velocity/Virgin "manage booking" itinerary; or match to an existing bill |
| Chris Witta | 591.00 | 2025-10-20 | Q2 | ❓ **IDENTIFY** | Only hit was an unrelated "AGM Run Sheet" (Food Connect Shed). Confirm what this $591 line actually is before chasing |
| Flight Bar Witta | 88.95 | 2026-02-05 | Q3 | ❌ **café/EFTPOS** | No tax invoice emailed; likely a card slip only |
| Qantas (multiple) | various | — | Q2/Q3 | 🔁 **MATCH not hunt** | Flights are auto-billed → the tax invoices are already on bills in Xero. The unreconciled card lines need *matching*, not a new receipt |

Found-in-Gmail message links open with `https://mail.google.com/mail/u/0/#inbox/<id>`. Full candidate lists: `thoughts/shared/reports/gmail-deep-search-Q{2,3}-FY26-2026-06-02.md` and `thoughts/shared/reports/receipt-broad-search-2026-06-02.md`.

## Sub-threshold tail (< $82.50) — record, not a tax invoice
Notion $75, Xero $75, LinkedIn $74.99, Squarespace $72.90, Mighty Networks $71.72, recurring Anthropic/OpenAI charges, Uber rides. Under $82.50 the ATO needs only *a record* (statement line), not a full tax invoice. Mostly retrievable from each vendor's billing page if maximal coverage is wanted; **does not move GST**. Low priority.

## What's now fixed for next time
`scripts/lib/gmail-vendor-queries.mjs` gained map entries for **Supabase** (+ the "Superbase" misspelling alias) and **Descript**, so the standard receipt pipeline (`gmail-deep-search.mjs` / `gmail-to-xero-pipeline.mjs`) finds the Stripe-relayed Supabase receipts automatically and stops wasting the broken first-token fallback on these vendors.

## Boundary (whose job is what)
- **Found-in-Gmail receipts:** downloading the PDF and **attaching it to the Xero bill/txn is a Xero write (Tier 3) — Ben's click**, or hand to Standard Ledger. The links above make it a copy-paste.
- **Portal pulls** (Anthropic, Descript, Bunnings, Virgin): Ben logs into the vendor and downloads — these are not in any act.place inbox.
- **Reconcile click is UI-only** (Xero API cannot set IsReconciled) — unchanged.

## Provenance
Numbers from `reconcile-ground-truth.mjs` against the synced mirror (current as of the 2026-06-02 09:35 sync — matches the post-delete diagnosis exactly: 493 unreconciled = 169 amount-matches + 324 no-bill; 359 AUTHORISED bills $609,925). Gmail searched read-only across all 4 delegated act.place mailboxes via the Google service account. No data was written to Xero or Gmail.
