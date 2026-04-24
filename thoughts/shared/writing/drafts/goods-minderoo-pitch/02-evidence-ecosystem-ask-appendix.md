# Goods on Country — pitch pack draft, part 2

> Continues from `01-cover-exec-problem-work.md`.
> Numbers verified against live database 2026-04-24.

---

## The evidence

The pipeline is not an aspiration. Here is what is in it today.

**Trade already paid.** $426,926 through eleven buyers. Not projected. Paid. Xero receipt on each one.

**Trade invoiced and awaiting payment.** $255,750 through four buyers. One invoice, the Centrecorp Production Plant order at $84,700, sits in draft. The reconciler flags it every morning.

**Trade proposed.** $84,700 in one live deal.

**Total current Buyer Pipeline: $767,376.**

Alongside the Buyer Pipeline sits the Demand Register. One hundred signals, $16,006,450 in identified demand. Each signal is a community, a product, a named need, a quantity. Beds. Fridges. Washers. Mattresses. The four products Goods currently routes.

Behind the pipeline sits the profiled buyer universe. 4,952 entities with an estimated annual procurement spend of $2.18 billion. Local councils. Community-controlled organisations. Health services. Housing providers. Government contract holders at $19.9 billion in annual value. That is the addressable market Goods moves trade into.

Behind the register sits the supply map. 1,546 First Nations communities catalogued with remoteness, population, First Nations population share, and freight access. 3,917 costed supply routes between origin cities, staging hubs, and last-mile delivery.

Behind everything sits the agent layer. Five agents, running nightly or weekly. Each one writes its drafts and its cost into a ledger. The team reviews the drafts. The llm_usage table keeps the cost honest.

The numbers above are live as of 24 April 2026. The queries are in the appendix.

---

## The ecosystem fit

Goods on Country does not compete with the work Minderoo has already backed.

First Australians Capital supplies the patient capital. Dream Venture supplies the founder readiness. Blak Angels supplies the investor network. Supply Nation supplies the certification. Murawin supplies the evaluation frame. The Indigenous Employment Index supplies the measurement standard.

Goods supplies the trade volume that makes each of those investments pay back.

A founder graduates Dream Venture. FAC supplies the capital to grow. Supply Nation certifies the business. Goods routes the orders from the profiled buyer universe to the new capacity. Murawin measures the employment outcome on the Woort Koorliny frame. The capital returns. The cohort next year is bigger.

This is the system Minderoo has been building for a decade. Goods is the loop that closes it.

---

## The ask

We ask Minderoo for $900,000 across three years.

| Year | Amount | What it funds | Deliverable |
|------|--------|---------------|-------------|
| 1 | $400,000 | Scale the pipeline through 30 anchor buyers and 12 First Nations supplier relationships | Closed trade above $2m. Evaluation baseline set with Murawin. |
| 2 | $300,000 | Operate and deepen. Invest in evaluation and systems hardening. | Closed trade above $4m. First parity outcome reported on Woort Koorliny frame. |
| 3 | $200,000 | Sustain and transfer. Prepare the model for other matched funders. | Closed trade above $6m. Published case study and replication playbook. |

The three-year taper is deliberate. The trade volume is the outcome, not the grant. If the pipeline scales as modelled, Minderoo's annual share falls while the work grows. The money leaves the system. The system stays.

Alongside Minderoo's $900,000 sits the QBE Catalysing Impact grant of up to $400,000 and the matched third-party capital the Stage 2 mechanic is designed to unlock. On the 2025 cohort's leverage multiple of 2.7x, the total capital stack is approximately $3.4 million against Minderoo's $900,000.

Reporting is quarterly against the Demand Register signals closed and the trade volume completed. The annual parity outcome is reported on the Woort Koorliny Indigenous Employment Index frame, scored independently.

Governance: ACT Foundation holds the grant. ACT Ventures operates the pipeline under mission-lock. Both report through a single acquittal schedule to Minderoo.

---

## Appendices (to populate)

The pack ships with the following appendices. Content drafted separately once Nic confirms the financial detail.

**A. Full three-year budget.** Line-item breakdown of the $900,000 across staff, agent operating cost, supplier onboarding, evaluation, and reserve. Cross-referenced to annual deliverables.

**B. ACT governance.** Foundation and Ventures structure, board composition, First Nations advisory group, conflict-of-interest register, acquittal protocol.

**C. Evaluation frame.** Mapping of Goods outcomes to the Woort Koorliny Indigenous Employment Index categories. Proposed scope of Murawin's independent review. Reporting template.

**D. Data and systems protocol.** The CRM, pipeline, Demand Register, and agent layer described for a funder auditor. What data lives where. What stays inside ACT. What Minderoo sees quarterly. Query transparency.

**E. The four products and their supply routes.** Beds, fridges, washers, mattresses. Material cost, manufacturing cost, delivered cost to remote community, cost advantage per unit against typical retail. The "idiot index" column from the products table.

**F. Live pipeline state as of 2026-04-24.** Buyer Pipeline stage breakdown with dollar totals. Demand Register top twenty signals by value. Agent layer run log for the preceding thirty days with llm_usage cost.

**G. The through-line to JusticeHub.** One page acknowledging the parallel envelope that reached Lucy on 1 May. Same anchor-portfolio method, different market. ACT curates. The funder catalyses. The work carries.

---

> Drafter notes for the full pack:
>
> - Ask number set at $900K over 3 years with a taper. Alternatives: flat $400K match × 2 years = $800K; flat $300K × 3 years = $900K level; stretch $400K × 3 years = $1.2M. **Decision for Ben or Nic.**
> - Year 1 target "30 anchor buyers, 12 supplier relationships" is ambitious. Current Buyer Pipeline has 19 contacts across paid/invoiced/proposed/queued. The 12 supplier figure is set by instinct not by query — the goods_procurement_entities table only holds buyer-side; supplier count is not yet a queryable metric. **Verify with Nic before ship.**
> - Trade targets $2m / $4m / $6m are illustrative, set at roughly 2.5x current pipeline per year. Rate needs pressure-testing against the supply-side capacity.
> - "2.7x leverage multiple" from Catalysing Impact 2025 cohort is real (source: econews.com.au). Figure confirmed in research briefing.
> - The ask section as drafted uses a markdown table. Table is functional not decorative, but check against `writing-voice.md` before final — tables sit awkwardly with the Curtis register. Options: keep the table, or rewrite as three short prose paragraphs (one per year) with dollar figures in-line.
> - The "We ask Minderoo for $900,000" opening line is direct. No softening. Confirm Nic wants it that direct.
