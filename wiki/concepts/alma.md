---
title: ALMA - Australian Living Map of Alternatives
status: Active
source_of_truth: wiki/concepts/soul.md
reframed_by: wiki/decisions/2026-05-25-civic-cerebellum-reframe.md
rewritten: 2026-05-25
---

# ALMA - Australian Living Map of Alternatives

> The Living Map. A catalogue of community-led alternatives to detention, dependency, and extractive systems, each scored by evidence quality and cultural authority. A noun, not a verb.

> This concept sits downstream of [[soul|Soul]]. If anything on this page contradicts soul, soul is right. It was rewritten on 2026-05-25 as part of the [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe]] cleanup, after the name "Australian Living Map of Alternatives" was made canonical and the older "sensemaking process" framing was retired.

## What ALMA Is

Australian Living Map of Alternatives (ALMA) is ACT's catalogue of community-led interventions that work, do not work, or are still being learned. Today it holds 1,112 interventions from 507 organisations across the youth justice, child protection, family services, and adjacent fields. Each intervention is scored on six dimensions and tied back to evidence, source, cultural authority, and target cohort.

ALMA is **the map**. It is not a process, not a dashboard, not an AI agent. It is the curated reference that other parts of the civic operating system draw on when they need to answer "what works, and how do we know."

The map lives in the database: `alma_interventions`, `alma_evidence`, `alma_outcomes`. The catalogue is the canonical artifact. Any concept page or pitch deck that disagrees with what is actually in those tables is wrong; the tables are right.

## The Six Scoring Dimensions (the methodology)

Every intervention in ALMA is scored on six dimensions. The scoring methodology is what makes the map *governed* rather than just a list.

| Dimension | What it asks |
|---|---|
| **Evidence strength** | Is the claim sourced and reliable? What kind of evidence supports it (research, practice records, lived-experience accounts)? |
| **Community authority** | Who has the right to speak about this? Has cultural authority been verified? |
| **Harm risk** | What could go wrong if this is funded, replicated, or scaled? |
| **Implementation capability** | Can this be done responsibly now, with the people and infrastructure available? |
| **Option value** | Does adopting this open or close future possibilities? |
| **Community value return** | Does value flow back to the people and place involved, or only outward to funders and institutions? |

These six dimensions **are** ALMA's methodology. They are not external supports for some other thing called ALMA. The dimensions plus the catalogue plus the scoring records together are the Map.

## Where ALMA Sits

The conceptual lineage, updated to match the post-reframe architecture:

```text
Soul
  Why ACT exists

LCAA Method
  How ACT practises: Listen, Curiosity, Action, Art

ALMA
  The catalogue of community-led alternatives, evidence-graded and cultural-authority-verified

Empathy Ledger
  The consent infrastructure that protects the stories and storytellers feeding into evidence

Governed Proof
  The audit + review + publication layer that gates which claims from ALMA can be shared, and with what confidence

JusticeHub
  The practice layer. JusticeHub Atlas surfaces ALMA publicly; JusticeHub Practice draws on ALMA when partner orgs do the work
```

The short version:

```text
Soul tells us why.
LCAA tells us how we practise.
ALMA holds what we have learned about what works.
Empathy Ledger protects the consent of the people whose work and stories feed it.
Governed Proof gates what can be published and at what confidence.
JusticeHub is where the map gets used in the real world.
```

## How ALMA Connects to the Civic Operating System

Per the [[civic-operating-system|Civic Operating System]] architecture, ALMA is the **evidence catalogue** layer that the practice and intelligence layers draw on. Specifically:

- **[[justicehub|JusticeHub]] Atlas** is the public surface where ALMA is read. The Atlas is the user-facing brand; ALMA is the data layer behind it. In external copy, prefer "JusticeHub evidence map" or "the evidence catalogue" over bare "ALMA" (see [[../decisions/act-brand-alignment-map|brand alignment map]] line 196).
- **[[justicehub|JusticeHub]] Practice** queries ALMA when a partner organisation is doing operational work, to surface "what has worked for this cohort in this region."
- **[[civicgraph|CivicGraph]]** holds the financial and structural context (who funds whom, who contracts with whom). When CivicGraph and ALMA are composed, the question "what works AND who actually funds it" becomes answerable.
- **[[empathy-ledger|Empathy Ledger]]** holds the consented stories that feed evidence into ALMA. Stories do not enter ALMA without consent flowing through Empathy Ledger first.
- **[[governed-proof|Governed Proof]]** gates publication. A claim from ALMA does not become a public statement without Governed Proof's confidence rating, review status, and audit trail attached.

## How the Map Gets Curated

ALMA is a *Living* Map for a reason: the catalogue is added to, scored, and re-reviewed continuously, not built once. The curation process draws on the [[lcaa-method|LCAA Method]]:

- **Listen** — new interventions enter the catalogue from practitioner accounts, lived-experience interviews, sector research, [[empathy-ledger|Empathy Ledger]] stories with consent, and partner-org self-reports. The intake is broad; the scoring is what filters.
- **Curiosity** — every new entry is scored on the six dimensions by a reviewer with cultural authority appropriate to the intervention. Indigenous-led interventions are scored by Indigenous reviewers; lived-experience interventions are scored with lived-experience input.
- **Action** — entries with sufficient confidence are surfaced through [[justicehub|JusticeHub]] Atlas, used in commissioned briefs, and quoted in sector publications. Low-confidence entries stay in the map but are flagged.
- **Art** — the map itself is published as a public artifact (the Atlas) and as a periodic State-of-the-Field synthesis. The art is in the curation, not in concealing the work.

Curation is a continuous practice, not a quarterly project. The map gets re-scored when new evidence arrives or when the cultural-authority assessment of a prior entry needs updating.

## What ALMA Is Not

ALMA is not:

- **A process.** ALMA is the map; the process of curating it draws on LCAA, and the process of publishing from it draws on Governed Proof. Don't conflate the noun with the verbs that act on it.
- **An AI agent.** ALMA does not "decide" anything. Reviewers with cultural authority do the scoring. Software helps the recording, the lookups, and the visualisations.
- **A ranking engine.** ALMA scores interventions on six dimensions; it does not produce a single "ALMA score" that ranks every intervention against every other. The dimensions are intentionally multi-axis to resist single-number ranking.
- **A measurement dashboard.** ALMA is the catalogue; impact dashboards built on top of it are derivative outputs, not ALMA itself.
- **The Soul.** [[soul|Soul]] is upstream. ALMA is downstream of Soul and LCAA.
- **A replacement for community authority.** ALMA records the community authority that scored each entry; it does not substitute for that authority.
- **A way to make extraction sound ethical.** Putting cultural-authority and evidence-confidence scores on extractive interventions does not redeem them. Low scores are honest; low scores are also a signal to stop funding the intervention.
- **Permission to publish without review.** Publication from ALMA goes through [[governed-proof|Governed Proof]]. The map is a reference, not a publication licence.
- **A user-facing brand.** Public copy prefers "JusticeHub evidence map" or "the evidence catalogue." ALMA is the internal name for the system behind the surface (see [[../decisions/act-brand-alignment-map|brand alignment map]]).

## First-Use Rule

Always spell out the first mention on any page:

```text
Australian Living Map of Alternatives (ALMA)
```

Do not use the bare acronym in public-facing writing unless it has already been defined on that page.

In external copy, prefer the user-facing brand:

```text
JusticeHub evidence map (drawn from ACT's Australian Living Map of Alternatives, ALMA)
```

Never use the older expansion ("Accountable Listening and Meaningful Action"). That expansion was retired on 2026-05-25 because it described a process the name did not match. If you find it in any surface, fix it.

## Composing ALMA into Impact Reporting

Impact reporting at ACT is not a separate system. It is what comes out when ALMA, [[empathy-ledger|Empathy Ledger]], [[civicgraph|CivicGraph]], and [[governed-proof|Governed Proof]] are composed correctly. A funder report draws on:

- ALMA for "which interventions are working and how confident are we"
- Empathy Ledger for the consented stories that put faces and voices to the evidence
- CivicGraph for the funding flows, contracts, and structural context that the interventions sit inside
- Governed Proof for the confidence rating, the audit trail, and the publication boundaries

See [[evidence-as-by-product|Evidence as a By-Product of the Work]] for the longer treatment of how reporting composes from the layers, why "evidence as a separate reporting task" is the wrong frame, and what funder/sector/internal reports look like in the composed architecture.

## Backlinks

- [[soul|Soul]] — the upstream why
- [[lcaa-method|LCAA Method]] — the practice loop that curates the map
- [[empathy-ledger|Empathy Ledger]] — the consent infrastructure that feeds ALMA
- [[governed-proof|Governed Proof]] — the audit and publication gate downstream of ALMA
- [[justicehub|JusticeHub]] — the surface where ALMA gets used (Atlas as public read, Practice as operational draw-down)
- [[civicgraph|CivicGraph]] — the financial and structural context ALMA composes with
- [[civic-operating-system|Civic Operating System]] — the architecture ALMA sits inside
- [[evidence-as-by-product|Evidence as a By-Product of the Work]] — how impact reporting composes from ALMA + EL + CivicGraph + Governed Proof
- [[governance-consent|Governance & Consent]] — the consent and authority rules ALMA depends on
- [[ai-ethics|AI Ethics]] — AI support remains subordinate to ALMA's consent, authority, evidence, and review rules
- [[beautiful-obsolescence|Beautiful Obsolescence]] — handover discipline for the catalogue
- [[transcript-analysis-method|Transcript Analysis Method]] — the story-analysis process that can feed ALMA review
- [[glossary|Glossary]] — shared language entry across the ecosystem
- [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe ADR]] — the decision that prompted this rewrite
- [[../decisions/act-brand-alignment-map|Brand Alignment Map]] — naming rules including the "JusticeHub evidence map" preference for external copy
