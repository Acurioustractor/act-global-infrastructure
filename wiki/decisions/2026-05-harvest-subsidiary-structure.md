---
title: The Harvest — Subsidiary Structure Decision
status: Active working decision
date: 2026-05-05
parent: 2026-04-five-year-plan
canonical_entity: the-harvest
canonical_code: ACT-HV
---

# The Harvest — Subsidiary Structure Decision

> **Decision.** The Harvest will be incorporated as a separate Pty Ltd subsidiary of A Curious Tractor Pty Ltd, with the property owner (philanthropist landlord) as a minority shareholder under a profit-share arrangement. ACT does not absorb Harvest into the parent's chart of accounts; ACT does not run it through Nic's sole trader past 30 June 2026; ACT does not register a charity for it. One company, one Xero file, one investor relationship.

**Decided:** 2026-05-05, in conversation with Standard Ledger.
**Owner:** Ben Knight (legal + Xero), Nic Marchesi (operations).
**Counterparty:** the landlord/investor — recently sold a logistics business, ~$60M exit, currently providing The Harvest site at 50% of market rent on a sliding scale until trading is profitable, plus has indicated interest in a profit-share entity.
**Target incorporation date:** before The Harvest opens — September 2026.

---

## Why a subsidiary, not a project line

[The Harvest](../projects/the-harvest/the-harvest.md) is structurally different from every other ACT project. The other projects (Goods, JusticeHub, Empathy Ledger, ALMA, etc.) are programs that ACT delivers; their economics belong inside the parent's P&L. The Harvest has:

1. **A third-party investor relationship.** The landlord wants to put cash and property into the venture and see returns. That relationship lives or dies on a clean cap table the landlord can read in one page. A project line buried inside ACT's ~$1.5M revenue and $1.4M expense P&L is unreadable.
2. **A physical-place trading footprint.** Cafe, shop, events, venue hire — these generate hundreds of small transactions, GST treatment that diverges from ACT's consulting/grants pattern, and product/public liability exposure that ACT shouldn't co-mingle.
3. **A sliding-scale rent + profit-share trigger.** That clause is a liability inside ACT but an asset inside a single-purpose entity. Standard accounting practice is to put both sides of a profit-share arrangement inside the same vehicle.
4. **Lease counterparty integrity.** The Harvest lease should be in The Harvest's own name from day one — not in ACT's name and not in Nic's sole trader. Anything else creates novation problems at every change of control.

Reasoning quote from the 5 May conversation: *"Anything that has got a partnership element with someone else, like that probably makes sense to be its own company as a subsidiary. We're not trying to build this big maze of companies, but for things like that, it just lets you do that cleanly."*

## Why not a charity / foundation

The team is "pretty over charities" and not keen on the regulatory overhead. The Harvest can run on a for-purpose basis without ACNC registration. The trade-off — limited access to a small subset of grants — is acceptable and can be partly mitigated through auspicing where it matters.

## Structure

```
A Curious Tractor Pty Ltd  (ACN 697 347 676)
    ├── Knight Family Trust   50%
    └── Marchesi Family Trust 50%

The Harvest Pty Ltd (subsidiary, to be incorporated)
    ├── A Curious Tractor Pty Ltd   majority %
    └── Landlord / investor entity  minority %
```

**Open variables (TBD with Standard Ledger's lawyer):**

- Exact percentage split. Default position: ACT majority because ACT is doing the work and carrying operating risk; landlord minority because the contribution is the asset (property at below-market rent) plus potentially a cash injection. Final split to be negotiated.
- Profit-share trigger and waterfall. The current lease arrangement steps from 50% market rent to full market rent as Harvest becomes profitable; the subsidiary should mirror that economics in the share class structure (e.g. preference dividends to landlord up to a defined return, then ordinary dividends pro-rata).
- Voting rights, board composition, reserved matters. Standard Shareholders Agreement clauses.
- Pre-emption, drag-along, tag-along, exit. Standard Shareholders Agreement clauses.
- Whether the landlord prefers a personal shareholding, a family trust, or a corporate vehicle.

## What stays the same

- **The Harvest project page** in the wiki ([the-harvest.md](../projects/the-harvest/the-harvest.md)) and the cluster ([projects/the-harvest/](../projects/the-harvest/)) remain the place-and-program source of truth. The subsidiary is the legal wrapper around the existing identity, not a rebrand.
- **ACT-HV tracking code** in the parent Xero file continues to track ACT's pre-incorporation Harvest spend and the parent's interest post-incorporation (e.g. shared services charged to the subsidiary).
- **Existing Harvest brand and digital surfaces** (`theharvestwitta.com.au`, the GHL pipeline, EL content syndication) are unchanged. The subsidiary owns them on incorporation.
- **The Witta Farm lease** (Nic's trust → ACT) is separate and unchanged. The Harvest leases the Harvest site (different parcel, ~1km away), not the farm.

## What changes

- **A new Pty Ltd is incorporated** with ASIC, gets its own ABN, GST registration, TFN.
- **A new Xero file** is opened for The Harvest subsidiary, using the same chart of accounts (`config/xero-chart-import.csv`) and tracking categories (`scripts/seed-xero-tracking.mjs`) as the new ACT Pty file. Subsidiary-specific tracking categories: HARVEST-CSA, HARVEST-VENUE, HARVEST-EVENTS (already mapped per the Harvest wiki page).
- **A new bank account** is opened in the subsidiary's name.
- **The Harvest lease** is novated or re-signed in the subsidiary's name (whichever is cleaner with the landlord).
- **A Shareholders Agreement** is signed at incorporation between A Curious Tractor Pty Ltd and the landlord's chosen vehicle.
- **A Services Agreement** is signed between A Curious Tractor Pty Ltd (services provider — operations, finance, marketing, brand) and The Harvest Pty Ltd (services recipient), so shared work is paid for and reportable.

## Sequencing

| When | Step | Owner | Blocker |
|---|---|---|---|
| Week 4-5 (May 2026) | Lawyer drafts subsidiary heads of agreement + Shareholders Agreement | Standard Ledger's referred lawyer | Decision on % split + governance |
| Week 5 (May 2026) | Sign heads of agreement with landlord | Ben + Nic + landlord | Heads of agreement drafted |
| Week 6 (mid-May) | Incorporate The Harvest Pty Ltd via ASIC | Ben | Heads of agreement signed |
| Week 7 (late-May) | ABN + GST + TFN registration | Ben + Standard Ledger | ASIC registration |
| Week 8 (early-June) | Open subsidiary bank account, open Xero file, port chart + tracking | Ben | ABN issued |
| Week 9 (mid-June) | Novate Harvest lease into subsidiary name | Ben + landlord's lawyer | Subsidiary live |
| 1 July 2026 | Subsidiary trades from day one alongside the new ACT Pty | — | All of the above |
| September 2026 | Public opening | Nic + Ben | Site renovations + regional arts grant draw-down |

This sits **inside** the broader sole trader → ACT Pty cutover — see [Migration checklist §11.1](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md#d111--harvest-is-a-subsidiary-not-a-project-line).

## Risks and how we mitigate them

- **Landlord changes their mind on profit-share before incorporation.** Mitigation: heads of agreement signed before lawyer fees on the full Shareholders Agreement.
- **Subsidiary makes losses for longer than expected and the landlord's economic return is delayed.** Mitigation: profit-share waterfall with preference returns to the landlord makes that delay explicit and accepted.
- **Public liability or product liability event in The Harvest cafe/shop.** Mitigation: subsidiary holds its own PL + product liability insurance from day one of trading. Parent is shielded by the corporate veil.
- **ATO challenges related-party services pricing between parent and subsidiary.** Mitigation: arm's-length Services Agreement with documented pricing; mirrors approach already being used between Nic-the-landlord and ACT for the farm lease.
- **Family trust ownership doesn't extend to the subsidiary** (the Knight + Marchesi family trusts own ACT, not Harvest directly). This is fine — economic interest flows up via dividends from Harvest → ACT → trusts.
- **Landlord wants veto over operations they shouldn't have.** Mitigation: Shareholders Agreement carves "reserved matters" tightly (issue of shares, sale of business, change of constitution, related-party transactions above threshold) and leaves day-to-day operations to the board ACT controls.

## Status

- ✅ Decision agreed in principle by Ben + Nic (5 May 2026)
- ✅ Standard Ledger consulted (5 May 2026)
- 🔲 Landlord briefed on subsidiary proposal
- 🔲 Heads of agreement drafted by lawyer
- 🔲 Heads of agreement signed
- 🔲 ASIC incorporation lodged
- 🔲 Subsidiary trading

## See Also

- [The Harvest project page](../projects/the-harvest/the-harvest.md)
- [The Harvest cluster README](../projects/the-harvest/README.md)
- [Act-Farm Repositioning](2026-04-act-farm-repositioning.md) — sets the regenerative-capital frame Harvest sits inside
- [ACT Core Facts](act-core-facts.md) — entity structure, sole trader cutover
- [Migration checklist §11.1](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md#d111--harvest-is-a-subsidiary-not-a-project-line) — operational sequencing
- [Money Alignment Snapshot 2026-05-01](../../thoughts/shared/reports/act-money-alignment-2026-05-01.md) — current ACT-HV financial position pre-incorporation
- [Five-Year Cashflow Model](../finance/five-year-cashflow-model.md) — Harvest revenue trajectory
