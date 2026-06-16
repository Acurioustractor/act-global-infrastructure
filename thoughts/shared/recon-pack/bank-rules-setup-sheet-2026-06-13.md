# Bank-rules setup sheet — type these into Xero (2026-06-13)

**Why:** JAX reconciles by trying **Rule → Match → Memory → Prediction**. Rules are its highest-confidence input, so creating these lifts how much JAX auto-clears for you. Source: `07-bank-rules-proposal.md` + live coding in `RECONCILE-NOW.md`. **These are a draft to review at save time — rules fire silently, so a wrong default bakes in.**

**Where in Xero:** Accounting → Advanced → **Bank rules** → New Rule ▾ → **Spend Money Rule**. For each row below:
- **Conditions:** *Payee* · *contains* · the Match text
- **Set contact to:** the Contact
- **Allocate 100% to:** the Account + Tax
- **Tracking (if shown):** the Project
- **Apply rule to:** **NAB Visa ACT #8815** (add **NJ Marchesi Everyday** too if that vendor also hits the Everyday account)
- **Title → Save**

**Tax legend:** `GST` = GST on Expenses · `GSTFREE` = GST Free Expenses (overseas, no AU GST) · `BASEX` = BAS Excluded.

## Tier 1 — set these first (highest volume/value)

| # | Payee contains | Contact | Account | Tax | Project | ⚠ check before save |
|---|---|---|---|---|---|---|
| 1 | `Qantas` | Qantas | 493 Travel - National | GST | ACT-IN | catches "Qantas Group Accommodation" too — fine |
| 2 | `Uber` | Uber | 452 Parking, Tolls & Taxis | GST | ACT-IN | |
| 3 | `NAB Fee` | NAB | 407 Bank Fees | BASEX | ACT-CORE | keep condition tight so it doesn't catch transfers/repayments |
| 4 | `Telstra` | Telstra | 489 Telephone & Internet | GST | ACT-IN | |

## SaaS / subscriptions → 485 Subscriptions (the GST trap lives here)

Overseas vendors usually show **no AU GST → GSTFREE**; AU-registered entities charge GST. **Confirm on an actual invoice before saving** — if it shows a GST line, switch that rule to `GST`.

| # | Payee contains | Account | Tax | Project | ⚠ |
|---|---|---|---|---|---|
| 5 | `Webflow` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 6 | `Vercel` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 7 | `OpenAI` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 8 | `Anthropic` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 9 | `Firecrawl` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 10 | `HighLevel` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 11 | `Dialpad` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 12 | `Squarespace` | 485 Subscriptions | GSTFREE | ACT-IN | overseas |
| 13 | `Supabase` | 485 Subscriptions | GSTFREE | ACT-CORE | overseas (Singapore) |
| 14 | `Google` | 485 Subscriptions | **GST** | ACT-CORE | Google Australia charges AU GST — confirm |
| 15 | `Apple` | 485 Subscriptions | **GST** | ACT-IN | Apple Pty Ltd charges AU GST — confirm |

## Tier 2 — set after (clear category, lower volume)

| # | Payee contains | Account | Tax | Project | ⚠ |
|---|---|---|---|---|---|
| 16 | `Bunnings` | 446 Materials & Supplies | GST | ACT-FM | project varies — default, refine per line |
| 17 | `Maleny Hardware` | 446 Materials & Supplies | GST | ACT-FM | |
| 18 | `Maleny Landscaping` | 446 Materials & Supplies | GST | ACT-HV | |
| 19 | `Defy` | 446 Materials & Supplies | GST | ACT-GD | corrected from 400 Advertising (was miscoded) |
| 20 | `Kennards` | 432 Hire Expenses | GST | ACT-GD | 2 projects — refine |
| 21 | `Allclass` | 473 Repairs & Maintenance | GST | ACT-FM | |
| 22 | `AGL` | 445 Light, Power, Heating | GST | ACT-FM | |
| 23 | `Airbnb` | 493 Travel - National | GST | ACT-PI | confirm GST shows on the AU invoice |
| 24 | `BP` | 449 MV - Fuel & Oil | GST | ACT-FM | fuel — project varies |
| 25 | `Liberty Maleny` | 449 MV - Fuel & Oil | GST | ACT-GD | |
| 26 | `Taxi Receipt` | 452 Parking, Tolls & Taxis | GST | ACT-JH | |
| 27 | `Woolworths` | 421 Light meals | GST | ACT-JP | from the live worked example |
| 28 | `Avis` / `Budget` / `GoGet` | **432 Hire Expenses *or* 493 Travel** | GST | ACT-GD | car hire — account is ambiguous in the data (432 vs 449 vs 493); **pick one with SL** before saving |

## After you save each rule
1. **Run it over the open backlog** — Xero offers to apply the new rule to existing unreconciled lines; do it. Each rule knocks out its lines as pre-filled green **Create**s you click OK (or bulk via Cash coding, which you have on Grow+).
2. **Skip the 2-line tail** — vendors with only 1–2 lines aren't worth a rule; hand-code them.
3. **Don't make an `ALICE` rule** — "Alice Springs" is a place, not a vendor; it'd mis-catch. Tighten to the real merchant.
4. Once live, these feed JAX going forward — it'll auto-reconcile matching lines on import, so this is a one-time setup that compounds.

*Codes from `config/xero-chart.json` via the proposal. Account/tax/project are starting points; the human glance at Save is the safety net. Anything tax-affecting (the SaaS GST split, car-hire account) — confirm with Standard Ledger.*
