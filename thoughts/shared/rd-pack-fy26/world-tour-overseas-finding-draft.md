# R&D Advance / Overseas Finding — Draft Application + National Priority Map

> Working draft for ACT's R&D adviser and the R&DTI customer portal. Built 2026-05-31.
> **Not tax advice. Not lodged.** Adviser confirms eligibility and numbers before submission.
> Notion mirror: child of "Empathy Ledger Business Tax and R&D Overview" (`371ebcf981cf8020b780c3c25616a44f`).
> Source experiments: the 🧪 R&D Experiment Log (8 rows) in that Notion system.

## Why an Overseas Finding (not just registration)

Registering R&DTI is self-assessment after year-end. An **Advance Finding** is a binding pre-decision on
eligibility; an **Overseas Finding** is **mandatory** before claiming any overseas R&D spend. The real
experiments run overseas on this trip, so ACT needs the Overseas Finding. Applications can cover **planned**
activities — lodge before/early in FY26-27, not after.

## Applicant and income year

- **Entity:** A Curious Tractor Pty Ltd, ACN 697 347 676 (ABN to confirm). Only eligible R&D entity (company).
  Knight Photography (partnership) and the sole trader are out.
- **Income year:** FY26-27 (1 Jul 2026 – 30 Jun 2027). Almost all trip activity. The 27–30 Jun 2026 sliver is
  FY25-26 → ordinary business, not R&D.
- **Hard deadline to lodge:** 30 Jun 2027. Processing ~90 days. **Lodge early in FY26-27 (planned activities),
  ideally pre-departure, for certainty before spending.**

## The four conditions for an overseas activity (verified — business.gov.au)

1. **Valid R&D activity** — core or supporting.
2. **Essential link** — at least one **core R&D activity conducted solely in Australia**, which **cannot be
   completed without** the overseas activity (overseas supplies data/outcomes the Australian work needs before
   it finishes).
3. **Cannot be conducted in Australia** — one of four allowed reasons only: (a) facility/expertise/equipment not
   available in Australia; (b) biosecurity/quarantine law; (c) **access to a population (of living things) not
   available in Australia**; (d) geographical/geological features not available in Australia. **Cost is not a
   valid reason.**
4. **Less-than expenditure** — total overseas cost **less than** the related Australian cost.

**Framing:** platform development = Australian core (solely in Australia); the overseas field work supplies test
populations/data finishing the core requires, that do not exist in Australia. Condition 3(c) is the main hook.

## Australian core activities (conducted solely in Australia)

- **C1** PRISM v2.0 extraction pipeline (Empathy Ledger)
- **C2** OCAP consent-as-code enforcement layer (Empathy Ledger)
- **C3** Guardian voice-authenticity gate (Empathy Ledger)
- **C4** Offline-first consent + revocation pipeline (Empathy Ledger)
- **C5** Consent-gated pgvector search at the RLS layer (JusticeHub)
- **C6** ALMA (Australian Living Map of Alternatives) multi-source AI ingestion (JusticeHub)
- **C7** Cross-platform syndication: embed tokens + consent propagation (EL → JusticeHub)

## Overseas activities (the trip)

| Overseas activity (field site) | Core | Why core can't finish without it (Cond. 2) | Cannot-do-in-Australia (Cond. 3) | Strength |
| --- | --- | --- | --- | --- |
| Multilingual oral-transcript validation (TZ/RW/UG) | C1 | PRISM fidelity only evaluable on real Swahili/Kinyarwanda/Luganda oral transcripts | 3(c) language populations not in Australia at scale | Strong |
| Cross-governance consent taxonomy test (Rwanda reconciliation; Kakuma; EU care-leavers) | C2 | Needs consent cases from governance systems absent in Australia | 3(c) those populations not in Australia | Strong |
| Bidirectional Travel Diary two-sided load test (YOPE Amsterdam) | C7 | Two-way protocol needs a live second cohort; YOPE is one half | 3(c)/3(a) YOPE cohort + context not in Australia | Strong |
| Multinational corpus RLS leak test | C5 | Cross-boundary leak test needs multi-sovereignty multilingual corpus | 3(c) multinational populations not in Australia | Moderate–strong |
| International justice-source ingestion (Diagrama, Justice Defenders, CARSA) | C6 | ALMA extraction tested on foreign-language justice sources + partner expertise | 3(a) Diagrama/Justice Defenders expertise not in Australia | Moderate–strong |
| Voice-gate test on translated/oral-culture speech | C3 | False-flag thresholds tested on translated/oral material | 3(c) language populations | Moderate |
| Offline/low-connectivity field test (Bidi Bidi, rural TZ) | C4 | Revocation guarantee tested on real low-bandwidth field networks | 3(a)/3(d) camp infrastructure not in Australia | Moderate |

## Condition 4 — less-than expenditure (fill from real numbers; do not fabricate)

| Side | Source | FY26-27 amount |
| --- | --- | --- |
| Australian core spend | Platform dev R&D salaries (timesheets), cloud, tooling | _adviser to confirm_ |
| Overseas spend | CT-RD bucket total, Expense Ledger | _from receipts_ |
| Test | Australian > overseas | Expected to pass (dev is the bulk) |

## National priority alignment (current needs / priority areas for Australia)

R&DTI eligibility is the four tests, NOT priority alignment. But alignment strengthens the new-knowledge/public-
benefit narrative and opens grant co-funding (relevant to QBE Catalysing Impact $400K, gated on ≥$400K matching).

| ACT R&D cluster | National Science & Research Priority (2024) | Other framework | Why it matters |
| --- | --- | --- | --- |
| Consent-as-code + data sovereignty (C2, C5, C7) | 3. Elevating Aboriginal and Torres Strait Islander knowledge systems | CtG Priority Reform 4 (shared data access); Indigenous Data Sovereignty (Maiam nayri Wingara) | Data sovereignty built into the architecture |
| Justice-evidence / alternatives to custody (C5, C6) | 2. Healthy & thriving communities + 5. Secure & resilient nation | CtG Target 11 (youth detention −30% by 2031); Target 10 (adult −15%) | Costed working alternatives to ~85% youth reoffending |
| Storytelling / voice infrastructure (C1, C3, C4) | 2 + 3 | Social cohesion; lived-experience authority | Substrate for consent-led community evidence |
| Circular-economy field data (waste-picker co-ops) | 1. Net zero + 4. Environment | National Waste Policy | Secondary to R&D claim; supports Goods narrative |

## Not in this submission (eligibility honesty)

- Photography / image creation — arts-excluded + KP partnership. Out.
- The Harvest website — content / known-solution web dev. Not R&D.
- Market/partnership research, meetings, general business travel — CT-BIZ, not R&D.
- Safari, family, private days — out.
- Any activity with a weak "cannot be done in Australia" case — drop, don't force.

## Adviser checklist

1. Confirm CT Pty R&D-entity status, ABN, FY26-27 registration.
2. Core-vs-supporting classification per overseas activity.
3. Pressure-test Condition 3 each row; drop weak ones.
4. Build Condition 4 table from real figures; confirm Australian > overseas.
5. Timing: lodge early FY26-27; deadline 30 Jun 2027; ~90-day processing.
6. Confirm this system meets the contemporaneous-record standard.

## Sources

- Apply for an overseas finding: https://business.gov.au/grants-and-programs/research-and-development-tax-incentive/apply-for-an-overseas-finding
- Apply for an advance finding: https://business.gov.au/grants-and-programs/research-and-development-tax-incentive/apply-for-an-advance-finding
- Advance/Overseas Finding application guide (PDF): https://business.gov.au/-/media/grants-and-programs/rdti/rdti-advance-overseas-finding-application-notes-pdf.pdf?sc_lang=en
- National Science and Research Priorities 2024: https://www.industry.gov.au/publications/national-science-and-research-priorities-2024
- Closing the Gap Target 11 (youth justice): https://www.closingthegap.gov.au/national-agreement/national-agreement-closing-the-gap/7-difference/b-targets/b11
- R&DTI customer portal: https://incentives.business.gov.au/

## Per-activity narratives (portal-ready draft)

Draft prose for the three Strong overseas activities, in the form's structure. Adviser refines and classifies
(core vs supporting). Not advice, not lodged.

### Narrative 1 — PRISM v2.0 cross-lingual extraction (core C1)

- **Australian core (solely in Australia).** PRISM v2.0: single forward-pass extraction of ~150 culturally-grounded
  fields from an unstructured oral-history transcript, built and run on Empathy Ledger infra in Australia.
- **Hypothesis.** A single-call structured extraction can populate the full ~150-field schema from a raw oral
  transcript at guardian-review fidelity, without field-collapse or culturally-specific hallucination, and this
  holds across typologically distinct, low-resource, oral-tradition languages.
- **New knowledge sought.** How a single-call long-schema extraction behaves across Bantu and other low-resource
  oral-tradition languages: the field-level fidelity profile, the failure surface, the architecture changes to close it.
- **Why unknown in advance.** Published benchmarks cover high-resource written, short-field extraction. The behaviour
  of a 150-field single-call extraction on Swahili/Kinyarwanda/Luganda oral transcripts is not predictable; only
  determinable by running real transcripts against native-speaker ground truth.
- **Sources investigated.** Extraction benchmarks (English/short-field); multilingual NLP evals (sentence/document
  level); internal Australian-English baselines. None resolve cross-lingual long-schema fidelity.
- **Experiment.** (1) capture consented in-language transcripts; (2) run PRISM unchanged; (3) native-speaker +
  guardian fidelity/hallucination scoring; (4) per-field/per-language failure rates vs baseline; (5) iterate
  architecture; (6) conclude on generalisation boundary.
- **Essential link (Cond. 2).** Overseas activity = capture + structured evaluation of in-language test transcripts;
  the Australian core cannot conclude on generalisation without it.
- **Cannot do in Australia (Cond. 3c).** Authentic oral-tradition narrators in these languages within their own
  community-governance context are not available in Australia at the needed register/scale. _Pressure-point:
  distinguish from diaspora speakers — the distinction is the in-situ oral-tradition register and place/kinship
  content, not the language alone._
- **Classification.** Likely supporting, or the field-evaluation phase of the core. Adviser to classify.

### Narrative 2 — OCAP consent-model cross-governance test (core C2)

- **Australian core (solely in Australia).** OCAP consent-as-code enforcement layer: typed consent state machine
  (states, transitions, 30-day media purge) enforcing OCAP in the EL data architecture, built/run in Australia.
- **Hypothesis.** A consent state machine derived from Australian Indigenous OCAP principles can represent and
  enforce the consent/ownership semantics of structurally different governance systems without a per-context fork.
- **New knowledge sought.** The generalisation boundary across survivor-perpetrator reconciliation consent,
  refugee-camp collective consent, and EU statutory care-leaver rights, and the model changes required.
- **Why unknown in advance.** Existing consent products/literature assume individual consent under one legal regime;
  cross-governance generalisation of a typed enforcement layer is undocumented; gaps surface only on encoding real
  scenarios.
- **Sources investigated.** OCAP/CARE frameworks; GDPR and CMP designs (individual model); refugee data-protection
  guidance. None resolve typed cross-governance generalisation.
- **Experiment.** (1) elicit real consent scenarios per context; (2) represent each in the OCAP type model; (3)
  record unrepresentable states / wrong enforcement; (4) evaluate extend-vs-fork; (5) conclude on the boundary.
- **Essential link (Cond. 2).** Overseas activity = elicitation/encoding of governance-specific consent scenarios;
  core cannot determine the boundary without them.
- **Cannot do in Australia (Cond. 3c).** Rwandan reconciliation cohorts, Kakuma refugee populations, EU statutory
  care-leaver systems do not exist in Australia. Strong.
- **Classification.** Likely supporting, or field phase of the core. Adviser to classify.

### Narrative 3 — Bidirectional Travel Diary two-sided test (core C7)

- **Australian core (solely in Australia).** Cross-platform bidirectional Travel Diary: story-exchange protocol with
  per-story embed tokens and consent propagation across EL and JusticeHub, built/run in Australia; each participant
  is author and audience with editorial control over their own entry.
- **Hypothesis.** The protocol maintains per-entry ownership, consent state and editorial control for two separated
  cohorts exchanging and responding in near-real-time, without consent-state divergence or cross-cohort leakage
  under real cross-continent latency.
- **New knowledge sought.** Behaviour of a two-sided consent-propagating exchange under two simultaneous live
  cohorts: the consistency/integrity/leakage profile one-directional syndication cannot reveal.
- **Why unknown in advance.** Existing system is one-directional. Two-sided real-time exchange with per-entry
  sovereignty is novel; race conditions and consent-state divergence manifest only with two real cohorts at once
  across latency; not reproducible single-cohort or simulated.
- **Sources investigated.** CRDT/sync literature (convergence, not consent sovereignty); internal one-directional
  baselines; collaborative-editing systems (no per-entry consent-ownership). None resolve two-sided
  consent-propagating exchange.
- **Experiment.** (1) run the Australian (Confit/Oonchiumpa) and YOPE Amsterdam cohorts live + simultaneously; (2)
  exchange/respond bidirectionally; (3) instrument consent consistency, ownership integrity, leakage; (4) observe
  failures under real latency; (5) iterate; (6) conclude on two-sided viability.
- **Essential link (Cond. 2).** The experiment is definitionally two-sided; the Australian cohort alone cannot test
  it; YOPE is the required second half. Clearest essential-link case.
- **Cannot do in Australia (Cond. 3c/3a).** The YOPE care-experienced cohort and its data-governance context are in
  Amsterdam; the experiment needs that specific second population in its own context. Strongest of the three.
- **Classification.** Integral to the core experiment; likely the field phase of the Australian core, not a separate
  supporting activity. Adviser to classify.

## Confidence ledger

- **Verified:** the four overseas-activity conditions; the 2024 National Science & Research Priorities; CtG Target 11
  (−30% youth detention by 2031); the business.gov.au links. (Web-checked 2026-05-31.)
- **From ACT records:** entity facts (CT Pty company; KP partnership); Path C; FY boundary; the 8 experiments
  (grounded in real EL/JusticeHub code per the repo scouts in `thoughts/shared/handoffs/world-tour-tax-rd/`).
- **Unverified / adviser-dependent:** whether each overseas activity truly satisfies Condition 3 (population/
  expertise genuinely unavailable in Australia); core-vs-supporting classification; all dollar figures; the
  Condition 4 less-than outcome. **Not tax advice.**
