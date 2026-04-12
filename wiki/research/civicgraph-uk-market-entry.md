---
title: CivicGraph UK Market Entry — Deep Research
status: Research complete, decision pending
date: 2026-04-12
parent: 2026-04-five-year-plan
source: Deep research report (external analysis tool, April 2026)
---

# CivicGraph UK Market Entry — Deep Research

> Research synthesis: the UK is a viable second market for [[civicgraph|CivicGraph]] based on data accessibility, market size, and a defensible "integrity/social value/ecosystem mapping" wedge. Entry is a Y2–Y3 move (not Y1). Resourcing estimate: ~4.5 FTE for 12-month build. Multi-market coverage is the CivicGraph exit-valuation lever.

This research was produced via external deep-research tooling on 2026-04-12 and is stored here as a strategic input to [[2026-04-five-year-plan|Five-Year Plan — Voice, Flow, Ground]].

## Key findings

### Market size signals

- UK procurement from the private sector: £340.9bn (2023/24), up from £245.6bn (2014/15). Broader gross measure: £434bn (2024/25).
- UK charity sector: ~171K charities, ~£106bn annual income. Income is highly concentrated: 1,699 charities (income >£10m) account for £71bn (~67% of total).
- For comparison, Australian Commonwealth procurement: A$104.9bn in 2024/25 (86,926 contracts).

### Data feasibility (UK "minimum viable graph")

| Domain | Dataset | Access | Notes |
|---|---|---|---|
| Procurement (UK-wide) | Find a Tender (central platform) | OCDS JSON API | Enhanced post-24 Feb 2025; notice regime expanding |
| Procurement (England) | Contracts Finder | Web API + OCDS export | Identifier/doc quality varies |
| Procurement (Scotland) | Public Contracts Scotland | OCDS Web API | Devolved rules add complexity |
| Procurement (Wales) | Sell2Wales | OCDS-oriented API | Devolved rules |
| Charity register (E&W) | Charity Commission | Daily extract + API (beta) | Income-band segmentation data unusually rich |
| Charity register (Scotland) | OSCR | Daily downloads + beta API | Separate regulator |
| Company register (UK) | Companies House | Public API, live data | Officer/PSC data = personal data under UK GDPR |
| Licensing | Open Government Licence v3.0 | Enables commercial reuse | Attribution required |

### Competitive landscape

| Competitor | Focus | CivicGraph differentiation |
|---|---|---|
| Tussell | Procurement analytics, "Procurement Act-enabled" | CivicGraph competes on graph-level relationship insights, not dashboards |
| Stotles | Supplier-side B2G sales platform | CivicGraph differentiates on integrity/network context, not pipeline |
| Spend Network | Global procurement data collection at scale | CivicGraph competes on depth (entity resolution + charity/governance linking) |
| BiP Solutions / Tracker | Tender intelligence and alerts | Alerting is commoditising; graph insights are the premium layer |

### Recommended entry wedge

**"Integrity / social value / ecosystem mapping"** — not generic tender discovery. The differentiated position:
- Entity resolution + canonical IDs across procurement + company + charity registers
- Network views linking suppliers to charity affiliations and corporate structures
- Procurement Act notice-sequence literacy translating "notice noise" into signals
- Social value context from charity income/activity data that tender-only tools lack

### Regulatory constraints

- UK GDPR + Data Protection Act 2018 apply. Even "public" data (trustees, officers, PSC) = personal data.
- Must design governance in from day one: lawful basis, data minimisation, retention rules, rights response mechanisms.
- The Procurement Act transparency regime increases both data volume and compliance obligations.

## Implications for [[2026-04-five-year-plan|Five-Year Plan]]

1. **UK expansion is Y2–Y3 (not Y1).** Y1 calendar is fully committed (Minderoo, CONTAINED, World Tour, PICC delivery).
2. **Resourcing: ~4.5 FTE for 12-month entry.** 2 FTE data eng + 1 FTE product + 0.2–0.4 FTE compliance + 1 FTE GTM. Cannot self-fund from salary; options: CivicGraph AU revenue reinvestment, small impact raise, or R&D tax offset ($43.5K refund per $100K data engineering spend).
3. **Exit multiplier rises with multi-market.** AU-only at $1M ARR × 4x = $4M. AU+UK at $2M ARR × 5–6x = $10–12M. UK expansion IS the valuation lever.
4. **"Integrity/social value" aligns with ACT brand.** CivicGraph making public money flows visible is the same story as Empathy Ledger making community voices visible. Same [[lcaa-method|LCAA]] verb (Curiosity), different domain.
5. **Charity income-band data defines the UK ICP.** Start with £1m+ income charities (high budget, clear need for procurement/relationship intelligence) + integrity/risk roles in public bodies.
6. **The "minimum viable graph" approach** (procurement + company + charity, England & Wales first, devolved after) is consistent with CivicGraph's existing "start narrow, graph outward" data strategy.

## Staged roadmap (from research)

- **Months 1–3**: Legal/licensing posture + dataset spine definition + data quality benchmarks
- **Months 2–5**: Ingest procurement + charity + company data; entity resolution v1
- **Months 4–7**: UK graph explorer MVP + explainability layer
- **Months 6–8**: Design-partner beta (3–6 orgs)
- **Months 7–10**: UK positioning, pricing (GBP), packaging
- **Months 9–12**: Launch v1 (England & Wales) → devolved portals → sales scale

## Decision required

Before Y2 planning: should CivicGraph commit to a UK data spine build? Gate on:
- CivicGraph AU MRR reaching $30K/month (validates product-market fit locally before expanding)
- Founder Lanes capacity check (UK build must not compete for Benjamin's product/story time)
- R&D tax treatment confirmed with CPA (UK data engineering as eligible R&D activity)

## Backlinks

- [[2026-04-five-year-plan|Five-Year Plan — Voice, Flow, Ground]]
- [[civicgraph|CivicGraph]]
- [[grantscope|GrantScope (CivicGraph)]]
- [[2026-04-founder-lanes-and-top-two-bets|Founder Lanes and Top Two Bets]]
- [[funding-transparency|Funding Transparency]]
- [[civic-transparency-movement|Civic Transparency Movement]]
