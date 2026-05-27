---
title: Civic Reflex Automation
status: Active
source_of_truth: wiki/concepts/soul.md
established_by: wiki/decisions/2026-05-25-civic-cerebellum-reframe.md
promotes: wiki/operations/act-operational-thesis.md §5 (Automate the Boring, Amplify the Art)
---

# Civic Reflex Automation

> AI in civic work has one job: remove the friction between intention and action. Automate the boring. Amplify the art. Never replace human judgment on relationships, consent, or creative direction.

> This concept sits downstream of [[soul|Soul]]. If anything in this page contradicts soul, soul is right. It is the public-facing version of an internal thesis that ACT has been running against its own operations for two years; the internal application is documented at [[../operations/act-operational-thesis|the operational thesis]] §5. It is established as a portfolio-level concept by [[../decisions/2026-05-25-civic-cerebellum-reframe|the Civic Cerebellum Reframe ADR]] (2026-05-25).

## The Premise

Most AI being built for the social sector is trying to do the most interesting work: decide, strategise, advise, "agent." That is not where civic systems usually fail. They fail because the basic reflexes break down. The follow-up does not happen. The consent is not logged. The referral gets lost. The evidence is not captured. The report is written too late. The community feedback never makes it back into the system.

Civic Reflex Automation is the thesis that the highest-leverage use of AI in civil society is the **boring-but-essential** work: tagging, matching, syncing, reporting, reminding, documenting, audit-trailing. The work that humans should not have to do, that they will quietly stop doing under load, and that the system depends on happening every time.

The point is not to replace human judgment. The point is to offload the repetitive, friction-heavy, easy-to-drop work into trusted routines, so people can spend more time on the work that only humans should do: care, relationships, strategy, art, and the decisions that matter.

This is the cerebellum thesis. It is the load-bearing argument for the [[civic-operating-system|Civic Operating System]].

## The Principle

```
Automate: tagging, matching, syncing, reporting, compliance, reminding, auditing
Amplify:  storytelling, design, community engagement, research, art, strategy
Never:    replace human judgment on relationships, consent, or creative direction
```

The matrix is short on purpose. Every product decision, every funding pitch, every feature request gets held against it. If a proposed AI capability sits in Automate, build it. If it sits in Amplify, design it carefully and keep the human in the loop. If it sits in Never, refuse it on principle even when the customer is paying.

The Never row is what most AI vendors will not commit to. It is what makes Civic Reflex Automation a real thesis instead of a marketing line.

## How ACT Applies This Thesis to Itself First

ACT runs Civic Reflex Automation against its own operations before pitching it to anyone else. The internal application is documented at [[../operations/act-operational-thesis|the operational thesis]] §5. The short version:

| System | What it automates | Human effort |
|---|---|---|
| Weekly reconciliation cron | Tags transactions, matches receipts, learns rules, sends Telegram summary | Glance at message |
| Receipt matching engine | Dice-coefficient fuzzy matching across 4 receipt sources | Approve candidates |
| Wiki CI pipeline | Push-triggered rebuild, auto-sync across 3 surfaces | Nothing |
| Xero token sync | Detects drift across 3 token stores, auto-refreshes | Run script on auth errors |
| Telegram bot ("Farmhand") | 19 agent tools — query projects, search wiki, draft writing | Talk to it |
| Project tagging rules | Self-learning location/vendor/subscription rules | Approve new rules |
| Dext + bill connectors | Auto-extract and attach receipts | Nothing |

The rule: anything that two humans cannot reliably do twice a week gets automated. Anything that needs care, judgment, or relational presence does not.

This is the proof-of-concept that the thesis works. The thesis is not theoretical. ACT runs on it.

## The Five Fundable Build Areas

Civic Reflex Automation is the umbrella thesis. Five named build areas operationalise it across the [[civic-operating-system|Civic Operating System]]. Each is grant-fundable on its own. Together they form the portfolio.

### 1. Civic Reflex Automation

The base layer. AI that makes the necessary work happen reliably: intake flows, referral pathways, reminders, documentation, reporting, partner updates, meeting notes, grant evidence, consent records, risk flags, follow-up loops.

This is the layer that turns repetitive, necessary, high-friction civic work into trusted routines. It is the cerebellum directly.

Where it lives in the civic OS: primarily [[justicehub|JusticeHub Practice]], with reflex primitives ([[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|FY27 ops plan]] §7.4) reusable across any community organisation that adopts the stack.

Who funds it: justice innovation funds, place-based collaboratives, philanthropic infrastructure grants, government social services modernisation programs.

### 2. Ethical AI Infrastructure

The trust layer. Audit trails, consent records, human-in-the-loop checkpoints, explainability notes, risk registers, AI-use ledger, sovereignty primitives, Guardian Checks against fabrication.

This is the layer that makes invisible decisions visible. It is what lets a civic organisation use AI without losing accountability, dignity, or human oversight. The biggest risk in civic AI is not bad answers; it is invisible decisions. This layer fixes that.

Where it lives in the civic OS: [[empathy-ledger|Empathy Ledger]], with the accountability API exposed for sibling products and external partners ([[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|FY27 ops plan]] §7.2).

Who funds it: AI safety funders, governance and transparency philanthropy, government digital responsibility programs, Indigenous data sovereignty initiatives.

Funding line: *We are not building AI tools. We are building the accountability infrastructure that lets civic organisations use AI safely.*

### 3. Justice and Early-Intervention Practice Systems

The practice layer. Practical, co-designed workflows for youth justice, diversion, restorative approaches, social enterprise pathways, place-based support, community-led intervention.

This is not software in the traditional sense. It is a repeatable practice system for community-led justice innovation. The software is the spine; the practice is the product.

Where it lives in the civic OS: [[justicehub|JusticeHub]] (Atlas as the public evidence map, Practice as the operational reflex layer), powered by the [[alma|Australian Living Map of Alternatives (ALMA)]] catalogue.

Who funds it: justice reform funders (Justice Reform Initiative, Paul Ramsay Foundation), state government innovation programs, community foundations, place-based justice collaboratives.

### 4. Civic Intelligence and Opportunity Mapping

The intelligence layer. AI that helps organisations understand what is happening across communities, policy, partners, funding, risks, and needs. Turns fragmented civic information into usable intelligence.

This is the layer that gives the system situational awareness. Without it, even the best practice workflows are flying blind.

Where it lives in the civic OS: [[civicgraph|CivicGraph]], with three named revenue flywheels (public-good legitimacy, commissioned intelligence, ACT advisory) per [[../decisions/2026-05-25-civic-cerebellum-reframe|the Reframe ADR]].

Who funds it: research infrastructure funders (ARC, philanthropic data-for-good initiatives), peak bodies, government transparency programs, philanthropic networks who want honest mirrors held to their own sector.

### 5. Evidence, Learning, and Reporting as a By-Product

The cross-cutting layer. Funders do not just want activity; they want evidence. Most small organisations struggle to produce it because reporting is painful and time-consuming.

This build area treats impact evidence as a **by-product of doing the work**, not a separate task. Every intake, workshop, referral, decision, consent process, and follow-up writes to the evidence base. The report at the end of the year is generated from the ledger, not re-collected from memory.

Where it lives in the civic OS: cross-cutting. Reflex primitives in JusticeHub write to the audit log in Empathy Ledger; CivicGraph rolls up sector-wide data for benchmarks. The evidence-export bundle in the [[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|FY27 ops plan]] §7.4 is the user-facing surface.

Who funds it: evaluation-focused funders, government outcomes-based programs, philanthropic networks tired of reading shallow narrative reports.

Funding line: *Every intake, workshop, referral, decision, consent process, and follow-up becomes part of a living evidence base. Reporting stops being a tax on the work and starts being a by-product of it.*

## What Civic Reflex Automation is NOT

The thesis is precise on purpose. Calling out what it is not protects the work from drift:

- **Not "AI agents that decide."** Civic Reflex Automation does not advocate for AI making consequential decisions about people, programs, or funding. It automates the work that should happen every time so humans have more time for the decisions that should not be automated.
- **Not "replace caseworkers / advocates / community workers."** The point is to free those roles from admin drag, not to substitute for them. If an AI tool can do a caseworker's listening, the caseworker was never doing listening.
- **Not "automate compassion."** Care, relational presence, cultural authority, and creative judgment sit in the Never row. They are not even candidates for automation.
- **Not "AI optimism."** The thesis is grounded in scepticism: most AI claims in civic work are oversold, and the highest-leverage use of AI in civil society is the boring stuff, not the impressive stuff.

## Who This Thesis is For

Civic Reflex Automation is the argument ACT brings into rooms with:

- **Foundations and philanthropic networks** weighing how to fund AI in the social sector. The thesis gives them a defensible criterion for what to fund and what to refuse.
- **Government social services modernisation programs** under pressure to "use AI" without harming service users. The thesis gives them a category of use that is safe, useful, and measurable.
- **Boards of community organisations** asking whether they should adopt AI. The thesis gives them a posture: yes for the boring stuff, only with consent infrastructure, never for the judgment calls.
- **Peer organisations in the civic AI space** who have been pulled toward the agentic-CEO framing. The thesis is the counter-position.

It is also the argument behind ACT's own thought leadership work: the annual flagship publication, the keynote at Philanthropy Australia, the co-authored academic whitepaper ("Civic Cerebellum vs Civic CEO"), and the founder-led witness work on the Empathy Ledger Field Trip (June to August 2026). Full operational treatment in the [[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|FY27 Launch Operations Plan]].

## Sibling Concepts

- [[civic-operating-system|Civic Operating System]] — the architecture that Civic Reflex Automation operationalises
- [[soul|Soul]] — the why behind it
- [[ai-ethics|AI Ethics]] — the constraints (especially the consent and authority rules that define the Never row)
- [[consent-as-infrastructure|Consent as Infrastructure]] — the principle Empathy Ledger operationalises in service of this thesis
- [[lcaa-method|LCAA Method]] — Listen, Curiosity, Action, Art as the human work this thesis protects
- [[beautiful-obsolescence|Beautiful Obsolescence]] — the design discipline (automation that survives community handover counts; automation that requires ACT to maintain it forever does not)
- [[governed-proof|Governed Proof]] — the verification layer that makes claims from this thesis defensible
- [[alma|Australian Living Map of Alternatives (ALMA)]] — the cultural authority methodology that the practice layer draws on

## Cross-links to Add

This concept page is new (2026-05-25). The following pages should be updated to link to it on their next edit cycle:

- [[soul|soul.md]] — add Civic Reflex Automation as a named load-bearing concept
- [[ai-ethics|ai-ethics.md]] — link to this page as the operational expression of the ethics principles
- [[../operations/act-operational-thesis|operational thesis §5]] — add a forward link noting that this page is the public-facing version of the internal thesis; the operational thesis section stays as the internal application proof
- [[civic-operating-system|civic-operating-system.md]] — the "Fundable Build Areas" section in that file should link each build area heading to the corresponding section here once the full set of concept pages is in place
