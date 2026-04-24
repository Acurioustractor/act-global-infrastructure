# Goods on Country — pitch pack appendices

> Continues from `01-cover-exec-problem-work.md` and `02-evidence-ecosystem-ask-appendix.md`.
> All data live as of 2026-04-24.

---

## Appendix A — Three-year budget

Total ask: $900,000. Structured to taper as the trade volume scales.

| Line | Year 1 | Year 2 | Year 3 | Notes |
|------|--------|--------|--------|-------|
| Operations staff (Goods pipeline lead + supplier liaison + buyer outreach) | $230,000 | $170,000 | $110,000 | Headcount 2.5 in Y1, drops to 1.5 by Y3 as the pipeline self-operates |
| Supplier onboarding (certification support, production readiness, first-run inventory) | $80,000 | $50,000 | $30,000 | 12 suppliers in Y1, 8 additional in Y2, 5 more in Y3 |
| Agent layer and systems (LLM operating cost, engineering retainer, infrastructure) | $25,000 | $25,000 | $25,000 | Flat across years; historical agent layer cost has been under $20 per month |
| Independent evaluation (Murawin scoped review on Woort Koorliny frame) | $40,000 | $40,000 | $20,000 | Y1 baseline, Y2 first full parity report, Y3 published case study |
| Buyer acquisition and partnership development | $15,000 | $10,000 | $10,000 | Travel, contract negotiation, legal review |
| Reserve (unforeseen logistics, community responsiveness) | $10,000 | $5,000 | $5,000 | Held as contingency, reported annually |
| **Annual total** | **$400,000** | **$300,000** | **$200,000** | **$900,000 over three years** |

The taper is not a cost-reduction. It is the expected profile of a catalytic investment: subsidy gives way to trade. If the pipeline hits the trade targets in the main pack, Year 3 is largely self-funded by operational margin.

Full line-item costing available on request.

---

## Appendix B — ACT governance

A Curious Tractor operates as a dual entity.

**ACT Foundation** (company limited by guarantee, DGR-endorsed) holds the charitable mission, the grant contracts, and the First Nations advisory structure. The Minderoo grant lands here.

**ACT Ventures** (mission-locked trading entity) operates the Goods pipeline, the CRM, and the agent layer. The QBE Catalysing Impact grant is structured against this entity because Catalysing Impact requires a trading or repayable-debt structure.

Both entities report to a single board and file acquittals on a single schedule. There is no conflict-of-interest layer between them; the mission lock is contractual.

**Board:** Benjamin Knight, Nicholas Marchesi OAM (Orange Sky Australia co-founder), [additional directors to name].

**First Nations advisory structure:** [to name]. The advisory is not decorative. It holds veto over supply-side decisions, product approvals, and community engagement protocols.

**Acquittal protocol:** quarterly against Demand Register signals closed and trade volume completed. Annual against the Woort Koorliny Indigenous Employment Index frame. Scored independently by Murawin.

Detailed constitutional documents and RAP artefacts on request.

---

## Appendix C — Evaluation frame

Goods on Country reports outcomes against the Woort Koorliny Indigenous Employment Index, the measurement standard Minderoo commissioned Bankwest Curtin Economics Centre and Murawin Consulting to build.

The mapping:

| Goods outcome | Indigenous Employment Index category |
|---------------|-------------------------------------|
| Number of First Nations suppliers onboarded and holding active contracts | Employment parity at the supplier-entity level |
| Dollar value of trade routed to First Nations suppliers | Economic participation |
| Number of First Nations workers employed in supplier production | Workforce engagement |
| Employee retention rate across supplier cohort | Workforce retention |
| Indigenous ownership of the contracting entity | Enterprise ownership |

Baseline set in Year 1. Mid-point report Year 2. Full parity report Year 3.

Murawin scope (proposed): independent review of the evaluation methodology, quarterly spot-check on data integrity, annual published report.

---

## Appendix D — Data and systems protocol

The Goods stack sits inside the ACT command centre. Three layers.

**Layer 1 — the CRM.** Twelve-stage Buyer Pipeline in GoHighLevel. Every opportunity has a named contact, a monetary value, a stage, and a project code. 119 opportunities sit in the pipeline today. Each opportunity links to its Xero invoice on the payment side.

**Layer 2 — the Demand Register.** Signals are curated from community requests, asset-end-of-life flags, and procurement analyst reports. 100 signals with a total identified demand of $16,006,450. Each signal carries a community identifier, product type, and unit quantity.

**Layer 3 — the agent layer.** Five agents run on a PM2 schedule.

| Agent | Schedule | Role |
|-------|----------|------|
| Xero-to-GHL reconciler | daily 05:00 AEST | Flags contact records that have drifted from Xero financial truth |
| Funder cadence | daily 06:00 AEST | Nudges any dormant buyer contact past fourteen days |
| Procurement analyst | Monday 08:00 AEST | Surfaces seasonal buying patterns and product-fit signals from Xero history |
| Invoice drift detector | Monday 08:30 AEST | Catches any invoice that sits in draft more than three days |
| Narrative gatekeeper | ad-hoc | Reads outgoing drafts for voice |

Every agent call is logged to the `llm_usage` ledger with input tokens, output tokens, estimated cost, and latency. Agents early-exit when they find nothing. In the preceding thirty days, the full stack spent AUD$0.19 across nine calls.

**What Minderoo sees quarterly:** signals closed, trade routed, employment count, cost-per-dollar-routed, agent ledger snapshot. Delivered as a single PDF + data extract.

**What stays inside ACT:** individual buyer contact data, supplier commercial terms, and community-level narratives held under the OCAP governance protocol.

---

## Appendix E — The four products and their supply route advantage

Goods currently routes four products. The cost advantage per unit is the wedge.

| Product | Status | Material cost | Manufacturing | Wholesale | Typical delivered to remote | Goods delivered | Cost saving | Lifespan |
|---------|--------|---------------|---------------|-----------|------------------------------|-----------------|-------------|----------|
| Stretch Bed | active | $85 | $165 | $749 | $2,000 | $850 | 57.5% | 120 months |
| Remote Community Fridge | planned | $600 | $300 | $1,800 | $4,000 | $2,200 | 45.0% | 84 months |
| Pakkimjalki Kari Washing Machine | prototype | $800 | $400 | $2,200 | $5,500 | $3,200 | 41.8% | 60 months |
| Remote Community Mattress | planned | $45 | $35 | $180 | $800 | $280 | 65.0% | 24 months |

The Stretch Bed is the active product. Material cost $85, delivered to a remote community under the current procurement system $2,000, delivered through Goods $850. A bed that lasts a decade for less than half the delivered price.

The spread between material cost and typical delivered cost is what the Goods pipeline compresses. On the Stretch Bed, the typical system costs 23.5 times the material. Goods brings that ratio to ten. Every unit routed is a saving the community's existing budget can redirect.

Supply routes: 3,917 costed origin-to-last-mile paths across 1,546 mapped communities.

Community distribution by state:
- Northern Territory: 788 communities, 96,860 people
- Western Australia: 342, 51,053
- Queensland: 207, 31,047
- South Australia: 146, 21,743
- New South Wales: 56, 8,400
- Tasmania, Victoria, ACT: 7 combined

---

## Appendix F — Live pipeline state (2026-04-24)

**Buyer Pipeline by stage:**

| Stage | Deals | Total value |
|-------|-------|-------------|
| Paid | 11 | $426,926 |
| Invoiced (awaiting payment) | 4 | $255,750 |
| Proposed | 1 | $84,700 |
| Outreach Queued | 3 | $0 (pre-quote) |
| **Total active** | **19** | **$767,376** |

The one proposed deal at $84,700 is the Centrecorp Production Plant order on invoice INV-0314. The invoice sits in draft. The reconciler has been flagging it daily.

**Demand Register:** 100 signals, $16,006,450 total identified demand.

**Profiled buyer universe:** 4,952 entities, $2.18 billion estimated annual procurement spend, $19.9 billion in government contract value across the set. All currently prospect status.

**Agent ledger (last 30 days):** 9 calls, AUD$0.19 spend. Low utilisation reflects the agents' early-exit behaviour when no flag-worthy signal is present.

**Supply-side capacity:** 3,917 costed supply routes across 1,546 First Nations communities. Top five states account for 1,539 of those communities (99.5%).

Queries available on request.

---

## Appendix G — The through-line to JusticeHub

A parallel envelope reached Lucy's desk on 1 May. That envelope proposed five anchor communities for justice infrastructure: Oonchiumpa, PICC, MMEIC, BG Fit, Mounty Yarns.

This envelope proposes an anchor cohort of thirty buyers and twelve First Nations suppliers for supply-chain infrastructure.

The method is the same.

ACT curates a small number of vetted anchors. The funder catalyses the network. The work carries on the anchor relationships, not on the funder's attention.

Two markets. One logic. One institution behind both.
