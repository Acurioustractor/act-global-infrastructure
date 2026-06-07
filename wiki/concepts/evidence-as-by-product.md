---
title: Evidence as a By-Product of the Work
status: Active
source_of_truth: wiki/concepts/soul.md
established_by: wiki/decisions/2026-05-25-civic-cerebellum-reframe.md
created: 2026-05-25
---

# Evidence as a By-Product of the Work

> Impact reporting is not a separate system. It is what composes when the existing layers do their jobs cleanly. Every intake, story, consent, referral, audit, and review writes to the evidence base. The report at the end of the quarter is generated from the ledger, not re-collected from memory.

> This concept sits downstream of [[soul|Soul]]. If anything on this page contradicts soul, soul is right. It was created on 2026-05-25 to give impact reporting a canonical home after the [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe]] tightened the boundaries between ALMA, Empathy Ledger, Governed Proof, and CivicGraph.

## The Principle

Most civic and social-impact organisations treat reporting as a separate task: the work happens, then someone writes up what happened, then the report goes to the funder. The report is a tax on the work. It draws on memory, partial notes, and selective interpretation. By the time it lands with the funder, the most useful evidence has been smoothed into narrative shape and the awkward parts have been quietly dropped.

ACT operates on a different principle: **evidence is a by-product of doing the work, not a separate task that happens after it.** Every intake captures consent and cohort. Every referral writes to an audit trail. Every story enters with explicit consent scope. Every AI inference writes to a ledger. Every published claim carries a confidence rating and a review record. When the funder asks for a report, the report assembles itself from the ledger.

This is the operational expression of the [[civic-reflex-automation|Civic Reflex Automation]] thesis applied to evidence. The reflex work (capturing, tagging, scoring, auditing) gets automated; the human work (interpreting, deciding, narrating, defending) stays human and gets faster because the underlying material is already structured.

## Why "Evidence as Separate Reporting Task" Is the Wrong Frame

Three failure modes that the separate-task frame produces:

1. **The work that should happen does not happen, because the reporting cost is paid later.** Consent gets verbally implied. Cultural authority gets assumed. Outcomes get observed without being recorded. Each of these is a small saving in the moment and a large debt at reporting time.
2. **Reports become marketing.** When evidence is reconstructed from memory at the end of a quarter, the natural pull is toward stories that make the work look good. The contrary signals (the intervention that did not work, the consent that was withdrawn, the outcome that came in worse than expected) get quietly omitted because they are harder to source and less rewarding to write.
3. **The next round of funding decisions is made on smoothed evidence.** Funders allocate the next dollar based on the last report. If the last report dropped the contrary signals, the next round of funding doubles down on interventions that the evidence would have recommended against. Smoothed evidence is not just a cosmetic problem; it shapes where money goes.

The by-product frame fixes all three. The work that should happen happens because the system writes it down as it goes. Reports cannot omit contrary signals because the signals are in the ledger. Funders can be shown the unvarnished record because the unvarnished record is what exists.

## The Layers That Compose Into Reporting

| Layer | What it contributes | What it does not contribute |
|---|---|---|
| **[[empathy-ledger\|Empathy Ledger]]** | Consented stories, AI-use ledger, audit trail, cultural-safety enforcement, storyteller-revocable permissions | Programmatic outcome data, financial flows, sector-wide context |
| **[[alma\|ALMA]]** | The catalogue of community-led interventions with evidence scoring and cultural-authority verification | Specific case-level outcomes, real-time consent state, financial context |
| **[[civicgraph\|CivicGraph]]** | Financial flows, contract data, donations, board interlocks, funding deserts, sector-wide structural context | Storyteller voice, intervention evidence quality, cultural authority assessments |
| **[[justicehub\|JusticeHub]] Practice** | Intake records, referrals, follow-up loops, case logs, outcomes captured during the work | The published surfaces those records support |
| **[[governed-proof\|Governed Proof]]** | Confidence ratings, review status, publication boundaries, audit trails for what is shared, with whom, when | Original source data; Governed Proof is a gate over the other layers, not a source |

The principle: **each layer does one thing.** When a funder, a sector publication, an internal cockpit, or a grant-application evidence bundle is needed, the report is composed from the layers, not re-collected from people's memory.

## Composition Patterns

The same underlying layers produce different reports depending on which slice is drawn. Four patterns ACT runs against:

### Funder report (e.g. PICC, JCF, Buttery, SMART Recovery, Oonchiumpa)

What the funder is asked to read: "what happened with the work you funded, with the people behind it, with what confidence, and what the evidence says you should fund next."

What composes it:
- Empathy Ledger surfaces the consented stories from the cohort
- ALMA surfaces the interventions used and their evidence scoring
- JusticeHub Practice surfaces the intake-to-outcome trail for the cohort
- CivicGraph surfaces the financial context (what other funding flowed into the same place, what the dependency profile looks like)
- Governed Proof gates which specific claims are shared with the funder under what confidence rating

The report is shaped to the funder's audience and time budget; the underlying ledger is the same one that produces every other report.

### Sector report (e.g. State of Civic Money quarterly, the annual flagship publication)

What the sector is asked to read: "what is happening across the field, what works at scale, what is being abandoned, what the structural pattern looks like."

What composes it:
- CivicGraph drives the headline numbers (funding flows by sector, region, deserts, concentration)
- ALMA's catalogue contributes the "what works" pattern across many interventions
- Empathy Ledger contributes selected consented stories that put voices to the patterns (with cultural-authority sign-off per the brand alignment rules)
- Governed Proof gates publication, ensuring named entities, foundations, and orgs are mentioned only at the confidence level the audit trail supports

Sector reports follow the [[../decisions/2026-05-25-civic-cerebellum-reframe|public-good non-negotiable rule]]: they publish openly even when commissioned customers are named in unflattering positions.

### Internal cockpit (CEO daily / weekly view)

What ACT internal needs: "are we on mission, what is breaking, what decisions need our attention this week."

What composes it:
- JusticeHub Practice surfaces intake volume, referral throughput, follow-up loop completion rates
- Empathy Ledger surfaces consent state, AI-use volume, Guardian Check exceptions
- ALMA surfaces which scoring backlog has grown
- CivicGraph surfaces grant pipeline state and funder engagement metrics
- Governed Proof surfaces what is awaiting review and what is approaching publication

The cockpit does not need new data collection. It is a live read of the existing ledgers, refreshed daily.

### Grant-application evidence bundle

What a grant application needs: "show that the work you are proposing has evidence behind it, consent infrastructure in place, and an honest track record of what has and has not worked."

What composes it:
- ALMA evidence of the intervention type the application proposes
- Empathy Ledger consent infrastructure documentation
- Past funder reports (composed using the patterns above) as proof of track record
- Governed Proof confidence ratings on the specific claims the application is making

The bundle is generated, not re-written. The first grant application takes time to design the composition; the next twenty applications draw on the same composition.

## What "By-Product" Means Operationally

For evidence to be a by-product rather than a separate task, four operational disciplines have to be in place at the source layers:

1. **No untracked work.** Every intake, every referral, every story, every AI inference writes to the ledger at the moment it happens. The ledger is authoritative; anything not in the ledger does not count as evidence at reporting time.
2. **Consent is captured at intake, not at publication.** [[empathy-ledger|Empathy Ledger]] enforces granular consent with cultural-safety scoring at the moment a story is recorded. Re-asking for consent at publication is a sign the original consent capture was insufficient.
3. **Scoring is continuous, not batched.** [[alma|ALMA]] entries get scored when they enter the catalogue or when new evidence arrives, not in quarterly review sprints. A backlog of unscored entries is a debt, not a normal state.
4. **Publication is reviewed once, audited forever.** [[governed-proof|Governed Proof]] gates the publication moment. Once a claim is published, the review record stays with it. Corrections and retractions are recorded; they do not erase the original.

These disciplines are documented per layer in [[empathy-ledger|Empathy Ledger]], [[alma|ALMA]], and [[governed-proof|Governed Proof]]. This concept page is the explanation of *why* the disciplines matter together, not their individual specification.

## What ACT Stops Doing

Adopting this principle means actively stopping a few practices that creep into evidence work by default:

- **Stop writing "what happened" narratives from memory at quarter-end.** If the work was not captured live, it does not get re-invented; the gap is reported honestly.
- **Stop holding "impact report" as a separate workstream with its own team or budget line.** Reports compose from the layers; the budget goes into making the layers reliable.
- **Stop treating the report as the deliverable.** The deliverable is the work. The report is a read on the work. If the report is the only place the work shows up, the work was not actually done.
- **Stop using ALMA as the answer to every evidence question.** ALMA is the catalogue, not the funder report. Composing ALMA with the other layers produces the report; ALMA alone does not.
- **Stop letting funder formats dictate which layer is the source of truth.** A funder asking for a particular metric does not get to decide which ACT layer owns the corresponding evidence; the architecture decides, and the composition shapes the answer to the funder's format.

## Sibling Concepts

- [[civic-operating-system|Civic Operating System]] — the architecture that makes this composition technically real
- [[civic-reflex-automation|Civic Reflex Automation]] — the AI thesis underneath the "by-product" principle
- [[soul|Soul]] — the why
- [[alma|ALMA]] — the catalogue layer
- [[empathy-ledger|Empathy Ledger]] — the consent and audit layer
- [[civicgraph|CivicGraph]] — the intelligence and financial-context layer
- [[justicehub|JusticeHub]] — the practice layer
- [[governed-proof|Governed Proof]] — the publication gate
- [[lcaa-method|LCAA Method]] — the human practice the layers serve
- [[consent-as-infrastructure|Consent as Infrastructure]] — the principle Empathy Ledger operationalises
- [[ai-ethics|AI Ethics]] — the principles that constrain how AI is used at any layer

## Cross-links to Add

This concept page is new (2026-05-25). The following pages should be updated on next edit cycle to link to it:

- [[soul|soul.md]] — name the evidence-as-by-product principle as a load-bearing concept
- [[alma|alma.md]] — already links here; verify on next read
- [[governed-proof|governed-proof.md]] — already links here; verify on next read
- [[civic-operating-system|civic-operating-system.md]] — add as a related concept under "Fundable Build Areas" §5
- [[civic-reflex-automation|civic-reflex-automation.md]] — already names this as build area §5; add a direct link to this page
- [[../decisions/ceo-operating-model|ceo-operating-model.md]] — should reference this principle as the standing answer to "how do we do reporting"
- [[../operations/act-operational-thesis|act-operational-thesis.md]] — should reference this principle as the answer to "how does the studio's evidence work compose"
