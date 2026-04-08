# Funding Transparency

> The principle that public money flows — government contracts, grants, charitable subsidies, political donations — should be legible to the citizens and communities they are meant to serve.

## Overview

Australia has no single system connecting its public money flows. $107 billion in government funding flows to the charitable sector annually. 672,000+ federal contracts are awarded through AusTender. $312 million+ moves through political donations. $8.86 billion in grants were distributed by charities in 2023 alone.

The data exists — scattered across AusTender, ACNC returns, AEC disclosures, ATO statistics, state grant portals, and foundation annual reports — but it has never been assembled into a coherent decision layer accessible to ordinary citizens, community organisations, or journalists.

Funding transparency is the civic infrastructure requirement that [[civicgraph|CivicGraph]] is built to address.

---

## Why It Matters

### The information asymmetry problem

When public data is fragmented, access to it becomes itself a form of power. Large foundations, corporate advisors, and government agencies can employ researchers to navigate complexity. Community organisations, small businesses, journalists, and citizens cannot.

The result: those who most need to understand funding flows — communities competing for grants, journalists investigating procurement, small organisations benchmarking their grant success — have the least access to the information required.

### Tax subsidies deserve public scrutiny

When the government foregoes **$2.26 billion** in revenue annually to subsidise charitable giving, and **82% of that benefit** flows to the top income decile, that is a policy choice deserving informed public debate. The debate cannot happen if the data is locked in ATO statistics tables, Treasury working papers, and ACNC annual reports that few people read.

### Procurement transparency reveals structural patterns

**140 entities** in Australia donate to political parties AND hold government contracts. They donated $80M and received $4.7B in contracts — a 58x correlation. Both major parties benefit. Government procurement officers currently have no tool to check this cross-reference.

**87.5%** of federal procurement value goes to just **10 entities**. SMEs win 52% of contracts by number but only 35% by value. These structural patterns are invisible without a unified procurement intelligence layer.

---

## What Civic Intelligence Means

Funding transparency is not just about publishing data. It is about making data **navigable** — turning fragmented public records into answers that ordinary people can use:

- Who funds what, where, and does it work?
- Which postcodes are most underserved relative to their disadvantage level?
- Which organisations donate to political parties AND hold government contracts?
- Which foundations fund issues that communities say they need addressed?
- Are government programs actually reaching the communities they target?

This kind of **civic intelligence** — the ability to ask meaningful questions of public money data — is what [[civicgraph|CivicGraph]] calls decision infrastructure.

---

## The Legibility Ladder

Making funding transparent requires moving through layers:

1. **Publication** — data is published somewhere (AusTender, ACNC, AEC)
2. **Accessibility** — data is in usable formats with clear licensing
3. **Linkability** — records from different systems can be joined (ABN as universal key)
4. **Searchability** — a person can find what they need without a data science background
5. **Intelligibility** — the data is presented with context that makes it meaningful
6. **Accountability** — findings can be acted on (advocacy, policy, funding decisions)

Most Australian public data sits at step 1 or 2. CivicGraph works to reach step 5 and 6.

---

## The Double-Counting Problem

A critical structural reality: philanthropic flows are counted multiple times across different systems. A high-net-worth individual's donation appears in their tax return, then in the PAF's accounts, then in the recipient charity's revenue, and later in that charity's program expenditure. There is **no single official "total philanthropy" figure** in Australia that avoids double-counting.

This isn't just a measurement problem — it is a power problem. When data is fragmented, those with resources to navigate the complexity have information advantages over those who need funding most.

Assembling all fragments into one decision layer doesn't solve the double-counting problem. But it makes the landscape navigable for everyone — not just those with research budgets.

---

## Funding Transparency vs. Grants Databases

Funding transparency is not the same as a grants database. Grants databases show funding opportunities. Funding transparency shows:

- Who received what funding, not just what is available
- Whether funding correlates with community need or with political relationships
- Whether the same organisations appear across contracts, donations, and grants
- Whether communities getting funding are the ones saying they need it

This is the distinction between a **reactive tool** (find grants to apply for) and **civic intelligence infrastructure** (understand and hold accountable the system that allocates public resources).

---

## International Context

Other countries have advanced further on civic intelligence:

- **OpenSecrets** (US) — tracks political money flows, 40+ staff at peak, laid off a third in 2024
- **Sunlight Foundation** (US) — government transparency platform, closed 2020
- **360Giving** (UK) — grants data standard, 275 funders, £265B in grants, foundation-funded and fragile
- **GrantConnect** (AU) — government grants register but no outcome tracking, no cross-reference

The pattern: funding transparency platforms struggle financially because the institutions that benefit most from opacity (donors, procurement winners, political donors) don't fund them, and the institutions that should (government, philanthropy) are inconsistent funders.

CivicGraph's response to this is the **cross-subsidy model**: institutional users (procurement officers, compliance firms, foundations) pay, and community organisations get free access. Revenue comes from the value of the data, not from charitable goodwill.

---

## Related Concepts

- **[[civic-world-model|Civic World Model]]** — the architectural vision for how civic data should be structured
- **[[power-dynamics-philanthropy|Power Dynamics in Australian Philanthropy]]** — empirical findings about money concentration
- **[[civicgraph|CivicGraph]]** — the platform implementing funding transparency for Australia

---

## Sources

- Raw: `wiki/raw/2026-04-07-gs-why.md`
- Raw: `wiki/raw/2026-04-07-gs-strategy.md`
- Raw: `wiki/raw/2026-04-07-gs-mission.md`
