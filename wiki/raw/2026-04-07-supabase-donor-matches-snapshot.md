---
source: Supabase ACT shared (tednluwflfhxyucgwigh)
table: donor_entity_matches
captured_at: 2026-04-07
note: This is AEC political donations data (entity-matched), NOT philanthropic giving
---

# Political Donor Entity Matches — 2026-04-07 Snapshot

**Total matched records:** 6,478

## Top 20 by Total Donated

| Donor | Matched Entity | Type | Total ($) | Donations |
|-------|----------------|------|-----------|-----------|
| Mineralogy Pty Ltd | MINERALOGY PTY LTD | asic | $287.6M | 100 |
| MINERALOGY PTY LTD | MINERALOGY PTY LTD | asic | $286.2M | 304 |
| Westpac Banking Corporation | WESTPAC | asic | $151.8M | 1,243 |
| Greaton Development Pty Ltd | GREATON | asic | $145.5M | 1 |
| Commonwealth Bank of Australia | CBA | asic | $99.9M | 1,102 |
| Labor Holdings Pty Ltd | LABOR HOLDINGS | asic | $61.4M | 185 |
| Woolworths Ltd | WOOLWORTHS | asic | $45.7M | 37 |
| Queensland Nickel Pty Ltd | QLD NICKEL | asic | $43.4M | 598 |
| Cormack Foundation Pty Ltd | CORMACK FDN | asic | $43.1M | 53 |
| 112 Trenerry Crescent Pty Ltd | — | asic | $41.8M | 2 |
| GPT Funds Management 2 Pty Ltd | GPT | asic | $41.5M | 1 |
| Trust Company of Australia Ltd | — | asic | $35.3M | 3 |
| ANZ Banking Group | ANZ | asic | $32.0M | 13 |
| Cormack Foundation | CORMACK FDN | asic | $29.5M | 28 |
| Vapold Pty Ltd | VAPOLD | asic | $27.8M | 37 |
| Protect Severance Scheme No.2 | — | asic | $22.1M | 10 |
| John Curtin House Limited | JCH (ALP fundraiser) | asic | $20.4M | 26 |
| Tyro Payments Ltd | TYRO | asic | $19.7M | 852 |
| Smartpay Australia Pty Ltd | SMARTPAY | asic | $19.5M | 814 |
| John Curtin House Ltd | JCH (ALP fundraiser) | asic | $17.8M | 41 |

## Patterns Observed

- **Mineralogy/Palmer alone = ~$574M** across two name variants — Australia's single largest political donor, by an order of magnitude.
- **Big 4 banks present:** Westpac ($152M), CBA ($100M), ANZ ($32M).
- **Party-aligned vehicles:** Cormack Foundation ($72M total) is the Liberal Party's investment vehicle. John Curtin House ($38M total) is Labor's. Labor Holdings ($61M) is Labor's investment trust.
- **Payment processors are heavy:** Tyro, Smartpay — these aren't strategic donations, they're transaction-fee aggregations from political fundraising platforms.
- **Duplicate entries** (Mineralogy x2, JCH x2, Cormack x2) reveal the entity-matching is fuzzy — these need consolidation for the donor-contractor overlap analysis.

## What This Is For

This data feeds the GrantScope/CivicGraph "donor-contractor overlap" analysis: organisations that donate to political parties AND receive government contracts. The 140 overlaps mentioned in the project plan are derived from joining this table against `funding_awards` and procurement records.
