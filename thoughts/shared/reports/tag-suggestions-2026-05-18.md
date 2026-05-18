# Tagging suggestions from Dext line desc + vendor rules · 2026-05-18

Source: untagged ACT-only rows since 2025-07-01 (NAB Visa #8815 + ACT Everyday).
Dedup: bank-payment-of-bill collapsed (same vendor/amount/±14d).

- Input: **32** untagged rows
- Got a suggestion: **0** (0%)
- No rule fired: **32**

## Tiers

- **A** — Dext line description contains explicit ACT-* code (highest confidence)
- **A\*** — Dext said ACT-HV but pre-2026-01-01 cutoff overrides → ACT-FM
- **B** — Vendor whitelist (always one project in FY26 data)
- **C** — Date-bounded Witta vendor (post-cutoff = Harvest, pre = farm general)
- **D** — Known-ambiguous (Avis/Thrifty) — surfaced as MANUAL with no auto-tag

## Summary by suggested code

| Code | Rows | $ | A | A* | B | C | D |
|---|---|---|---|---|---|---|---|

## No rule fired — manual review (32 rows)

| Date | Vendor | $ | Src | Line desc |
|---|---|---|---|---|
| 2025-09-08 | SeaLink Queensland | $77.67 | bill | . |
| 2025-08-05 | Unknown Supplier | $69.24 | bill | . |
| 2025-07-01 | 3 Legged Thing | $58.24 | bill | . |
| 2025-08-06 | Im-Am Thai | $57.00 | bill | . |
| 2025-08-20 | Loco Burrito Alice Springs | $56.37 | bill | . \| . |
| 2025-07-31 | Freedom Fuels | $54.36 | bill | . |
| 2025-08-20 | Mooloolah River Waterwatch & Landcare | $52.99 | bill | . |
| 2025-10-02 | The Shack Fish & Chippery | $48.50 | bill | . |
| 2025-12-04 | Hermit Park - Good Morning Coffee | $48.17 | bill | . \| . |
| 2026-03-03 | GROUP SINGLE | $45.60 | bill | . |
| 2026-03-03 | Eventfinda Australia | $45.60 | bill | . |
| 2025-10-22 | Mooloolah Valley Community Association | $42.00 | bill | . |
| 2025-08-05 | Pearl Energy | $34.83 | bill | . |
| 2025-10-13 | Sydney Domestic Airport | $30.00 | bill | . |
| 2025-08-09 | Pop Rocket Cafe And Blast Coffee Roasters | $29.00 | bill | . |
| 2025-10-15 | Lucinda Store | $26.37 | bill | . \| . |
| 2026-03-05 | Elsies Kitchen | $24.38 | bill | . |
| 2025-08-05 | Butcher Baker | $19.98 | bill | . \| . |
| 2025-07-07 | Do Film! Lab | $19.28 | bill | . |
| 2025-10-01 | BRIDGECLIMB SYDNEY | $13.50 | bill | . \| . |
| 2025-12-28 | Fresh & Save Food Warehouse | $12.78 | bill | . \| . |
| 2025-08-07 | The Cool Spot | $12.69 | bill | . \| . |
| 2025-12-29 | NUDE JUICE | $12.24 | bill | . |
| 2025-11-22 | Little Rosebery Cafe | $11.15 | bill | . |
| 2025-09-04 | Little Florence Coffee | $10.40 | bill | . |
| 2025-10-17 | Tully Bakery | $8.90 | bill | . |
| 2025-09-26 | The Lord Lamington | $6.99 | bill | . |
| 2025-10-13 | T3 Domestic Airport | $6.60 | bill | . \| . |
| 2025-09-29 | The Quarters TSV | $6.50 | bill | . |
| 2025-08-02 | The Barn Cafe | $6.08 | bill | . |
| 2025-09-12 | Norfino | $4.59 | bill | . |
| 2025-10-13 | The Cheesecake Shop | $4.50 | bill | . |

## How to apply

This script is **read-only by design** (per the auto-tagger guard).
Open <http://localhost:3002/finance/transactions?status=untagged> and bulk-tag using this report as the punch list.
For each Tier-A suggestion, the Dext line desc already carries the code — bulk-tagging is just confirming Dext's work.
