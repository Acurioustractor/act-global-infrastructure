# Xero Bank Rules — Top 30 Setup Guide

**Purpose:** Configure Bank Rules in Xero UI for the 30 vendors that appear most often on card 1656 FY26. After this, ~80% of future bank reconciliations become 1-click.

**Time:** 30 min one-time.
**Pays back:** Forever (new transactions auto-code).

---

## How to create a Bank Rule

1. Xero → **Accounting → Bank Accounts → NAB Visa ACT #8815**
2. Top-right: **Manage Account** → **Bank Rules**
3. **Create Rule** → **Spend Money rule**
4. For each row below, fill in the fields and Save.

---

## Top 30 recurring vendors (Q2+Q3 FY26 data)

Table columns: **Contains** (match string) | **Contact** (vendor name) | **Account** | **Tax Rate** | **Tracking: BD** | **Tracking: Project** | Note

| # | Contains | Contact | Account | Tax Rate | BD | Project | Note |
|---|---|---|---|---|---|---|---|
| 1 | QANTAS | Qantas | 493 Travel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 100× · $53K — connector usually handles but backstop |
| 2 | UBER | Uber | 493 Travel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 196× · $7.2K |
| 3 | WEBFLOW | Webflow | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 35× · $1.9K · USD |
| 4 | STRIPE | Stripe | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | USD |
| 5 | VERCEL | Vercel | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | USD |
| 6 | OPENAI | OpenAI | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 11× · $497 · USD |
| 7 | ANTHROPIC | Anthropic | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 8× · $132 · USD |
| 8 | CLAUDE | Anthropic (Claude) | 485 Subscriptions | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 9× · $1.4K |
| 9 | FIRECRAWL | Firecrawl | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 7× · USD |
| 10 | SUPABASE | Supabase | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 6× · USD |
| 11 | SQUARESPACE | Squarespace | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 10× · USD |
| 12 | NOTION | Notion Labs | 485 Subscriptions | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 6× · $664 |
| 13 | MIGHTY NETWORKS | Mighty Networks | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 9× · USD |
| 14 | AUDIBLE | Audible | 485 Subscriptions | BAS Excluded | A Curious Tractor | ACT-IN — ACT Infrastructure | 9× · USD |
| 15 | GOHIGHLEVEL | HighLevel | 485 Subscriptions | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 8× · $843 |
| 16 | XERO | Xero | 485 Subscriptions | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 6× · $450 |
| 17 | APPLE | Apple | 485 Subscriptions | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 23× · $2.7K |
| 18 | BUNNINGS | Bunnings | 446 Equipment | GST on Expenses | A Curious Tractor | ACT-HV — The Harvest Witta | 23× · $19.8K — but some are ACT-FM, manually override when needed |
| 19 | KENNARDS | Kennards Hire | 446 Equipment | GST on Expenses | A Curious Tractor | ACT-HV — The Harvest Witta | 6× · $10.3K |
| 20 | MALENY HARDWARE | Maleny Hardware | 446 Equipment | GST on Expenses | A Curious Tractor | ACT-HV — The Harvest Witta | 8× · $1.9K |
| 21 | OFFICEWORKS | Officeworks | 446 Equipment | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 12× · $1.9K |
| 22 | AGL | AGL | 487 Utilities | GST on Expenses | A Curious Tractor | ACT-FM — The Farm | 8× · $3K |
| 23 | TELSTRA | Telstra | 489 Telecoms | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 7× · $660 |
| 24 | LIBERTY | Liberty | 449 Fuel | GST on Expenses | A Curious Tractor | ACT-FM — The Farm | 14× · $3.3K (no rule yet!) |
| 25 | BP | BP | 449 Fuel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 7× · $688 |
| 26 | AMPOL | Ampol | 449 Fuel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | — |
| 27 | WOOLWORTHS | Woolworths | 420 Meals | GST on Expenses | A Curious Tractor | ACT-FM — The Farm | 26× · $3.5K |
| 28 | COLES | Coles | 420 Meals | GST on Expenses | A Curious Tractor | ACT-FM — The Farm | 9× |
| 29 | BOOKING.COM | Booking.com | 493 Travel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | 7× · $1.4K |
| 30 | AIRBNB | Airbnb | 493 Travel | GST on Expenses | A Curious Tractor | ACT-IN — ACT Infrastructure | — |

---

## Rule creation tips

- **Match string**: put the exact uppercase string as it appears on bank statements (use the Bank Accounts → Reconcile view to double-check). Xero rules match on "Contains", so short strings are OK (just "QANTAS" will catch "QANTAS 081-237…", "QANTAS GROUP ACCOMMODATION", etc.)
- **Reference**: optional but useful for Qantas — the 081- prefix identifies connector-created bills
- **Tax Rate for USD vendors**: use "BAS Excluded" — overseas supply, no GST.
- **Project Tracking**: pick the most-common project for this vendor. Manual override is easy per-transaction in Xero reconcile UI.

## Vendors in our rules but low volume — skip for Bank Rules, keep for push pipeline

Vendors under 5× in FY26 that are still coded via our push script, but not worth a Bank Rule:
- Garmin, GitHub, Dialpad, Zapier, Cloudflare, GoPayID, Replit, Railway, Ideogram, Linktree, Humanitix, Paddle, Warp, HighLevel marketplace items

## Vendors MISSING from vendor_project_rules — add first

- **Seasons Supermarket** (Maleny) — 12×, probably ACT-FM / 420 Meals
- **Internet Transfer** (NAB internal) — 11× × $13K — these are transfers to other accounts, NOT spend. Special case: "Transfer" rule
- **News Pty Limited** — 7× — newspaper subs, ACT-IN / 485
- **TransportMainRds Brisbane** — 6× · $2K — tolls, ACT-IN / 493 Travel

Add to `vendor_project_rules` via the suggest UI before Bank Rule creation.

## Special cases — don't create a Bank Rule

- **NAB International Fee** (223×) — this is a foreign transaction fee, not a vendor. Handled via account code 452 or similar + ignore project. Could create a rule but keep description as "Foreign transaction fee" for BAS.
- **Internet Transfer** — these are transfers between your own accounts. Use the "Transfer" rule type in Xero instead of Spend Money.

## After rule creation — test

1. Go to Bank Accounts → Reconcile NAB Visa 8815
2. Find a bank line matching a rule you just created
3. Xero should show a green ✓ suggesting the rule
4. Click OK → reconciles with all fields pre-filled
5. If Xero didn't suggest, check the Contains string matches the bank descriptor exactly

## After first month — review

- Check which rules fired most (saves the most time)
- Check for rule mis-fires (wrong project assigned)
- Refine as needed
- Add any new high-volume vendors that weren't on this list
