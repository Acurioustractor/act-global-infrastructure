---
title: Political Donations & Power
status: Active
source: donor_entity_matches, captured 2026-04-07
---

# Political Donations & Power

> Who buys access to Australian politics, and how the same names appear at the top of the pile year after year.

## Overview

CivicGraph holds **6,478 entity-matched political donor records** from the Australian Electoral Commission's disclosure regime. This is not philanthropy — it is the money that flows directly to political parties and party-aligned investment vehicles. The pattern is concentration, opacity, and a small number of names that recur across decades.

## Top 20 Donors by Total Disclosed Donations

| Donor | Total | Donations |
|-------|-------|-----------|
| Mineralogy Pty Ltd (Palmer) | $287.6M | 100 |
| MINERALOGY PTY LTD (duplicate) | $286.2M | 304 |
| Westpac Banking Corporation | $151.8M | 1,243 |
| Greaton Development Pty Ltd | $145.5M | 1 |
| Commonwealth Bank of Australia | $99.9M | 1,102 |
| Labor Holdings Pty Ltd | $61.4M | 185 |
| Woolworths Ltd | $45.7M | 37 |
| Queensland Nickel Pty Ltd (Palmer) | $43.4M | 598 |
| Cormack Foundation Pty Ltd | $43.1M | 53 |
| 112 Trenerry Crescent Pty Ltd | $41.8M | 2 |
| GPT Funds Management 2 | $41.5M | 1 |
| Trust Company of Australia Ltd | $35.3M | 3 |
| ANZ Banking Group | $32.0M | 13 |
| Cormack Foundation (variant) | $29.5M | 28 |
| Vapold Pty Ltd | $27.8M | 37 |
| Protect Severance Scheme No.2 | $22.1M | 10 |
| John Curtin House Limited | $20.4M | 26 |
| Tyro Payments Ltd | $19.7M | 852 |
| Smartpay Australia Pty Ltd | $19.5M | 814 |
| John Curtin House Ltd (variant) | $17.8M | 41 |

## What This Shows

### Mineralogy is a category unto itself

Combining Clive Palmer's two main donor vehicles — Mineralogy and Queensland Nickel — gives a total of **~$617M**. That is roughly **twice the next-largest donor** and an order of magnitude above any single bank. One man, two companies, $617M of political influence. This single fact shapes how the entire Australian campaign finance debate has unfolded since 2013.

### The Big Four banks are reliable funders

- **Westpac:** $151.8M across 1,243 donations
- **Commonwealth Bank:** $99.9M across 1,102 donations  
- **ANZ:** $32.0M across 13 donations

These aren't one-off contributions — Westpac and CBA each made over a thousand individual disclosures. That cadence suggests structured, year-round support for political infrastructure rather than tactical one-time gifts. (NAB doesn't appear in the top 20 — worth investigating whether that's an entity-matching gap or a genuine difference in posture.)

### Party-aligned investment vehicles

Some of the largest "donors" aren't ordinary companies — they're the parties' own money:

- **Cormack Foundation** ($72M across two name variants): the Liberal Party's investment vehicle, established 1988, holds $80M+ in equity reserves.
- **John Curtin House Limited** ($38M across two variants): the Australian Labor Party's fundraising and property arm.
- **Labor Holdings Pty Ltd** ($61.4M): another ALP investment vehicle.

These party vehicles distribute returns to their respective parties, effectively laundering investment income into "donations" that show up in the disclosure regime. Together they account for **~$170M** of the top 20.

### Payment processors as donation aggregators

**Tyro** ($19.7M across 852 donations) and **Smartpay** ($19.5M across 814 donations) appear high on the list because they aggregate fundraising platform transactions, not because they donate directly. This is an artifact of the AEC disclosure rules — and a reminder that "top 20 donors" is partly a function of how the data is shaped.

## Connecting to the Transparency Mission

The 6,478 matched records feed CivicGraph's **donor-contractor overlap analysis**: organisations that donate to political parties AND hold government contracts. The plan calls for surfacing the ~140 strongest overlaps as a public-interest dataset. As of April 2026, the matching layer is in place; the cross-reference against `funding_awards` and procurement records is the next milestone.

This work matters because it answers a question the existing transparency regime cannot: *not whether donations are legal, but whether they correlate with subsequent procurement outcomes for the same entities.*

## Caveats

- Entity matches are fuzzy — the duplicates in the table (Mineralogy, JCH, Cormack) need consolidation before publishing aggregate figures.
- The AEC's disclosure threshold has historically been high enough that significant funding remains undisclosed.
- "Political donations" in this dataset includes party investment income, which inflates the totals for party-aligned vehicles relative to pure third-party donors.

## Backlinks

- [[civicgraph|CivicGraph]] — the entity graph this lives inside
- [[funding-transparency|Funding Transparency]] — the broader transparency movement
- [[power-dynamics-philanthropy|Power Dynamics in Philanthropy]] — the parallel philanthropic concentration story
- [[justice-funding-landscape|Justice Funding Landscape]] — how government dollars then flow to community work
- [[civic-transparency-movement|Civic Transparency Movement]] — making government legible
