# ALMA Charter

**Version**: 1.0
**Date**: December 31, 2025
**Status**: Foundation Document

---

## Purpose

ALMA (the sensemaking and action layer) turns community knowledge + evidence + funding signals into decisions, tools, and accountable workflows.

ALMA exists to build **continuous, compounding intelligence** across Australia's fragmented social impact system by:
- Making evidence legible without stripping cultural meaning
- Creating feedback loops: what worked, where, for whom, under what conditions
- Converting community truth into better grantmaking, program design, and accountability

---

## What ALMA Is

**ALMA is an operating system / agent layer** that:

1. **Ingests** sources (documents, datasets, lived experience notes, grant docs)
2. **Extracts** structured meaning (entities, outcomes, risks, evidence strength)
3. **Reasons** about what works in what contexts (portfolio intelligence)
4. **Recommends** actions (next best grant, missing evidence, replication candidates)
5. **Pushes** results into JusticeHub/Empathy Ledger workflows **with consent and accountability**

**ALMA is NOT**:
- A replacement for human/community decision-making
- A black-box recommendation engine
- Extractive of community knowledge
- Culturally neutral or values-free
- A standalone product (it's a capability layer)

---

## The Stack (How ALMA Fits)

```
JusticeHub (community system)
  ↓
  Collaboration + knowledge exchange platform
  Built on: Airtable + Softr
  Purpose: Profiles, projects, outcomes, replication, community governance

Empathy Ledger (funding + impact system)
  ↓
  Impact mapping + funding intelligence layer
  Purpose: Money flows, outcomes, storytelling, attribution

ALMA (intelligence + action)
  ↓
  Operating system / agent layer
  Purpose: Connect unstructured ⇄ structured, community ⇄ funders, evidence ⇄ decisions
```

ALMA is the **engine** that keeps JusticeHub and Empathy Ledger evidence-backed and up to date.

---

## Core Problem We're Solving

Australia's social impact system is fragmented:
- Scattered data across organizations
- Inconsistent outcome definitions
- Short-term funding cycles
- Knowledge trapped inside organizations
- Evidence lost or inaccessible

**ALMA's solution**: Turn "stories and documents" into **shared, queryable system knowledge** that compounds over time, creating feedback loops that improve decisions.

---

## Governance Gates (Hard Technical Controls)

ALMA implements community ownership as **technical controls**, not just values statements:

### 1. Authority Gating
**Rule**: Any record about a community-controlled practice carries an "authority" field (Elder council / community org / nominated custodian).

**Enforcement**: ALMA **cannot** publish or recommend without authority flag satisfied.

**Implementation**: Database constraint + middleware check before any public action.

### 2. Consent Ledger
**Rule**: ALMA must track consent and permitted uses for stories, data, and outcomes—especially lived experience content.

**Enforcement**: Every knowledge contribution has:
- Contributor(s)
- Community authority
- Usage permissions (query, publish, train, export, commercial)
- Downstream reuse log ("where it was used")

**Implementation**: Separate consent database, required before ingestion, checked before every action.

### 3. Provenance-First Outputs
**Rule**: Every ALMA answer includes "where this came from" and confidence/evidence level.

**Enforcement**: No response without source attribution + evidence rating.

**Implementation**: RAG retrieval must return sources, extracted entities must link to origin docs.

### 4. Human + Community Review Loops
**Rule**: ALMA drafts; people decide; communities approve where required.

**Enforcement**:
- Queries: Passive monitoring (log, don't block)
- Actions (publish, recommend, export): Active gates (block until approved)

**Implementation**: Two-tier governance middleware (see architecture doc).

### 5. Anti-Extractive Defaults
**Rules**:
- No scraping of sensitive content without explicit permission
- No training/fine-tuning on restricted cultural materials
- Strong separation between "private node knowledge" and "public knowledge commons"

**Enforcement**:
- Ingestion requires consent metadata
- Training/fine-tuning blocked on restricted namespaces
- Data stored in separate namespaces with access controls

**Implementation**: Namespace strategy + access control layer.

---

## Consent Model

### Contribution Lifecycle

**1. Contribution**
```
Node/Community submits knowledge
  ↓
Consent form completed:
  - Who contributed?
  - What authority do they hold?
  - What uses are permitted?
  - What restrictions apply?
```

**2. Storage**
```
Knowledge stored with consent record
  ↓
Consent ledger tracks:
  - Contribution ID
  - Permitted uses
  - Restrictions
  - Expiry/renewal
```

**3. Usage**
```
Query/Action attempted
  ↓
Consent check:
  - Is this use permitted?
  - Are restrictions satisfied?
  - Is consent still valid?
```

**4. Tracking**
```
Usage logged in reuse ledger
  ↓
Attribution tracked:
  - Where was it used?
  - Who benefited?
  - What value was created?
```

**5. Revenue Sharing** (when applicable)
```
Commercial use generates revenue
  ↓
Revenue share computed from reuse logs
  ↓
Contributors compensated
```

### Consent Categories

**Public Knowledge Commons**:
- Permission: Open query, citation required
- Restriction: Must attribute, cannot strip context
- Example: Published evidence summaries, replication playbooks

**Community Controlled**:
- Permission: Query with attribution, publish requires approval
- Restriction: Cannot use for training, community approval for external sharing
- Example: Case studies, local context notes

**Strictly Private**:
- Permission: Internal node access only
- Restriction: No external sharing, no aggregation, no AI training
- Example: Lived experience stories, sensitive cultural knowledge

---

## Node Operating Model

### National Coordination (Witta Harvest)
- Maintains ALMA infrastructure
- Coordinates across state nodes
- Manages consent ledger + provenance
- Distributes revenue from commercial uses

### State Nodes (VIC, NSW, QLD, SA, WA)
- Contribute local intelligence
- Run community workshops
- Validate interventions in their context
- Control access to their knowledge

### Community Authority
- Embedded at ingestion (who has authority?)
- Enforced at publication (community approval required)
- Tracked in provenance (whose knowledge is this?)
- Honored in attribution (who gets credit/compensation?)

---

## Capabilities (Minimum Viable)

### 1. Ingest
Bring in policies, evaluations, submissions, grant applications, service models, lived-experience workshop outputs.

### 2. Extract
Produce structured records:
- Program/intervention
- Target cohort
- Place/community context
- Intended outcomes + indicators
- Risks/harms
- Evidence level
- Cultural authority/ownership
- Consent + permissions

### 3. Reason + Compare
- What interventions work in what contexts?
- What is overfunded vs underfunded relative to need/evidence?
- What patterns emerge across geographies/cohorts?

### 4. Recommend Actions
- "Next best grant" suggestions
- Missing evidence to collect
- "Replication candidates" for JusticeHub
- Learning agenda (what to fund to learn)

### 5. Accountability Layer
- Human review queues
- Community sign-off workflows
- Traceable provenance
- Audit logs

---

## Portfolio Intelligence (Quant Methods, Ethically Adapted)

ALMA applies portfolio logic **without financializing people**:

### Signals (Examples)
- Evidence strength (not just anecdotes)
- Community authority and consent
- Implementation capability
- Cultural fit / sovereignty protection
- Cost per outcome proxy (careful, not reductive)
- Harm risk (high weight)
- "Option value" (learning potential)

### Portfolio Construction
- Diversify across intervention types (prevention, diversion, wraparound)
- Diversify across geography, cohorts, and risk profile
- Allocate a "learning tranche" to under-evidenced but community-endorsed approaches

### Risk Controls
- **Never** allocate without consent/authority flags satisfied
- Caps on "untested at scale"
- Mandatory community feedback checkpoints

### Performance Tracking
- Track outcomes **and learnings**, not just spend
- Include qualitative truth alongside quantitative indicators
- Community validation of impact claims

### Rebalancing
- Shift funding as evidence and community priorities evolve
- Continuous learning loops

---

## Data Posture

### Always Private to Nodes
- Lived experience stories (unless explicit consent)
- Community deliberation notes
- Sensitive cultural knowledge
- Individual-level data
- Draft/in-progress work

### Community Commons (JusticeHub Public)
**With explicit consent only**:
- Evidence-backed intervention models
- Anonymized outcome data
- Replication playbooks
- Research summaries
- Policy analysis

### Funder-Facing (Empathy Ledger)
**Aggregated, not raw**:
- Portfolio analytics
- Evidence synthesis
- Impact attribution
- Funding recommendations
- Diligence briefs

### Governance Rules
- **Default private**, explicit consent to share
- Community authority controls publication
- Revenue sharing for commercial use
- Provenance always tracked
- Access logged and auditable

---

## First Vertical: Youth Justice

**Why youth justice first?**
- Clear need (system is failing young people)
- ACT has relationships + authority
- Contained scope for MVP
- High impact potential

**Deliverable**: Youth Justice Intelligence Pack (quarterly)
- Top intervention clusters
- Underfunded/high-evidence zones
- Risk + harm flags
- Learning agenda (what to fund to learn)
- Replication candidates

**Revenue model**: Funder subscription
- Supports ongoing ALMA operations
- Funds community contributions
- Enables node expansion

---

## Success Criteria

### Technical
- Zero unauthorized access to private data
- 100% provenance tracking on all outputs
- All actions pass governance gates or are blocked
- Consent ledger complete and auditable

### Community
- Nodes control their knowledge
- Contributors are attributed and compensated
- Indigenous authority is respected and embedded
- No extractive patterns

### Impact
- Better funding decisions (evidence-based)
- Faster replication of what works
- Reduced duplication of effort
- Knowledge compounds over time

### Financial
- Revenue from funder products
- Community contributors compensated
- Nodes sustainably resourced
- System self-funding within 12 months

---

## Evolution Path

### Phase 0: Foundation (Week 1)
Define ALMA, document governance, design ontology

### Phase 1: MVP (Weeks 2-7)
Youth Justice Intelligence Pack, ingestion + extraction, portfolio analytics

### Phase 2: Operationalize (Weeks 8-17)
Node workshops, contribution portal, replication packs

### Phase 3: Expand (Ongoing)
Family violence, housing, disability justice, mental health

---

## Accountability

**ALMA is accountable to**:
- Communities whose knowledge powers it
- Nodes who contribute intelligence
- Funders who use its insights
- Young people and families it ultimately serves

**Accountability mechanisms**:
- Open governance (this charter is public)
- Consent ledger (all permissions tracked)
- Provenance tracking (all claims sourced)
- Community review (drafts before publication)
- Revenue sharing (contributors compensated)
- Audit logs (all access recorded)

---

## Living Document

This charter evolves as ALMA evolves:
- Community feedback shapes governance
- Technical learnings refine implementation
- Evidence of impact guides priorities
- Node input drives features

**Current version**: 1.0 (Foundation)
**Next review**: After Phase 1 (Week 7)
**Steward**: Witta Harvest + ACT Leadership
**Community input**: via state nodes + workshops

---

**ALMA = The sensemaking and action layer that turns community knowledge + evidence + funding signals into decisions, tools, and accountable workflows.**

**Built with consent. Governed by community. Powered by evidence. Accountable always.**

