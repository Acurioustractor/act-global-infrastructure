# ALMA + Intelligence Hub - Quick Start Guide

**Created**: December 31, 2025

---

## What ALMA Is

**ALMA** = The sensemaking and action layer that turns community knowledge + evidence + funding signals into decisions, tools, and accountable workflows.

Think of it as:
- **Intelligence Engine** for social impact
- **Portfolio Analytics** for ethical grantmaking
- **Evidence Synthesis** with community authority
- **Knowledge Commons** builder

---

## How ALMA Extends Intelligence Hub

### Current Intelligence Hub (Week 3 Complete)

```
Web UI → API → RAG Service → Vector DB
                              (6,443 lines ACT knowledge)
```

**Capabilities**:
- Answer questions about ACT
- Track partners and grants
- Prioritize work
- Automated notifications

### ALMA-Enhanced Intelligence Hub

```
ALMA Layer (Governance + Portfolio Intelligence)
    │
    ├─→ JusticeHub (community-led replication)
    ├─→ Empathy Ledger (impact + funding)
    └─→ Intelligence Hub (knowledge + RAG)
            │
            ├─→ Vector DB (unstructured)
            ├─→ Airtable/Notion (structured)
            └─→ Consent Ledger (governance)
```

**New Capabilities**:
- Evidence-based intervention recommendations
- Portfolio analytics for funders
- Community-governed knowledge
- Ethical decision support
- Replication playbooks

---

## 3 Key Decisions Needed

### 1. ALMA Stance

**Option A** (Recommended): "Agent + governance rules"
- ALMA is a layer, not standalone product
- Embedded in existing tools
- Hard governance gates

**Option B**: "Full standalone product"
- Separate ALMA application
- Own UI and workflows
- Heavier infrastructure

**→ Which do you prefer?**

---

### 2. Data Posture

**Always Private to Nodes**:
- Lived experience stories
- Community deliberation
- Sensitive cultural knowledge
- Individual data

**Can Become Public** (with consent):
- Evidence-backed interventions
- Anonymized outcomes
- Replication playbooks

**→ Confirm this is correct?**

---

### 3. First Youth Justice Deliverable

**Option A** (Recommended): Funder-facing portfolio report
- Monthly/quarterly intelligence pack
- Portfolio recommendations
- Evidence synthesis
- Subscription revenue model

**Option B**: Community-facing replication library
- JusticeHub project pages
- How-to guides
- Success factors

**Option C**: Diligence engine for grantmakers
- Real-time intervention lookup
- Evidence assessment
- Risk flagging

**→ Which should we build first?**

---

## Implementation Timeline

### Phase 0: Define ALMA (Week 1)
- ALMA Charter (2 pages)
- Youth Justice Ontology v0.1
- Data Posture Statement
- Governance Rules

### Phase 1: MVP (Weeks 2-7)
- Document ingestion pipeline
- Structured extraction service
- Portfolio analytics engine
- First intelligence pack

### Phase 2: Operationalize (Weeks 8-17)
- Node workshop templates
- Community contribution portal
- Replication pack generator
- Scale to nodes

### Phase 3: Expand (Ongoing)
- Clone to other verticals
- Continuous improvement
- Community growth

---

## What We'll Build

### Core Components

**1. Document Ingestion**
```typescript
ALMADocumentIngestion.ingest(file, metadata)
  → chunks + embeddings + entities + governance flags
```

**2. Structured Extraction**
```typescript
ALMAExtractionService.extractIntervention(document)
  → {name, type, cohort, outcomes, evidence, authority}
```

**3. Portfolio Analytics**
```typescript
ALMAPortfolioAnalytics.buildPortfolio(interventions)
  → {recommendations, risks, diversification, learning}
```

**4. Governance Gates**
```typescript
ALMAGovernance.enforceGates(entity, action)
  → [authority, consent, provenance, cultural safety]
```

**5. ALMA Query API**
```typescript
POST /api/v1/alma
  actions: retrieve, extract, recommend, publish
```

### Integration Points

**With Intelligence Hub**:
- Shared vector DB
- Enhanced RAG queries
- Unified web UI

**With JusticeHub**:
- Draft project pages
- Replication packs
- Community approval workflow

**With Empathy Ledger**:
- Portfolio dashboards
- Impact attribution
- Funder reports

---

## Quick Reference

### Query Examples

**Current Intelligence Hub**:
```
"What is the LCAA methodology?"
"Who are our active partners?"
"What grants are due this month?"
```

**ALMA-Enhanced**:
```
"What youth justice interventions work in remote communities?"
→ Retrieves + filters by evidence + community authority + context

"Show me underfunded opportunities in family violence prevention"
→ Portfolio analysis + gap identification + recommendations

"What can we learn from [intervention name]?"
→ Evidence synthesis + replication feasibility + risks
```

### Commands (Future)

```bash
# Ingest document
npm run alma:ingest ./youth-justice-report.pdf

# Extract interventions
npm run alma:extract --document-id=123

# Portfolio analysis
npm run alma:portfolio --vertical=youth_justice

# Governance check
npm run alma:governance-check --entity-id=456

# Query
npm run alma:ask "What works for diversion?"
```

---

## Revenue Model

### Funder Subscription
- Monthly/quarterly intelligence packs
- Portfolio recommendations
- Diligence briefs
- Evidence synthesis

### Value Flow
```
Funder pays → ACT (platform) → Community contributors
                              → Node operators
                              → Knowledge curators
```

### Attribution Tracking
Every knowledge contribution tracked:
- Who contributed
- Where it was used
- Revenue share calculated
- Payments automated

---

## Governance Framework

### 5 Hard Rules

**1. Authority Gating**
- Community practices require authority holder
- No publication without consent
- Indigenous leadership respected

**2. Consent Ledger**
- All uses tracked
- Permissions explicit
- Revenue sharing enabled

**3. Provenance-First**
- Every claim sourced
- Evidence level rated
- Confidence scored

**4. Human Review**
- ALMA drafts, people decide
- Community approves where required
- No black-box decisions

**5. Anti-Extractive**
- No unauthorized scraping
- No training on restricted data
- Private by default

---

## Next Actions

### Once You Answer the 3 Questions:

I will immediately create:

**1. ALMA Charter** (1 page, publication-ready)
```markdown
# ALMA Charter
## Purpose
## What ALMA Is/Isn't
## Governance Gates
## Consent Model
## Node Operating Model
```

**2. Youth Justice Schema v0.1** (Airtable-ready)
```json
{
  "entities": {...},
  "relationships": {...},
  "governance": {...}
}
```

**3. 6-Week Build Backlog** (ready to start)
```
Week 1: Foundation (Charter, Ontology, Governance)
Week 2-3: Ingestion Pipeline
Week 4-5: Extraction Service
Week 6-7: Portfolio Analytics + First Intelligence Pack
```

---

## Integration with Existing Work

### Builds On (All Operational)

**Week 1 (GHL Integration)**:
- Partners and grants already syncing
- Data ready for ALMA portfolio analysis

**Week 2 (Notifications)**:
- Grant deadline tracking
- Partner check-in reminders
- Extends to intervention deadlines

**Week 3 (Web UI)**:
- `/ask` interface ready
- API endpoint exists
- Easy to add ALMA queries

### Extends With

**ALMA-Specific**:
- Youth justice vertical
- Portfolio intelligence
- Community governance
- Evidence synthesis
- Replication packs

---

## Files Created

**Documentation**:
- `ALMA_INTEGRATION_PLAN.md` - Full technical plan
- `ALMA_QUICK_START.md` - This file

**To Be Created** (Week 1):
- `docs/alma/CHARTER.md`
- `docs/alma/DATA_POSTURE.md`
- `docs/alma/GOVERNANCE_RULES.md`
- `config/alma-youth-justice-schema.json`

**To Be Created** (Weeks 2-7):
- `src/lib/alma/document-ingestion.ts`
- `src/lib/alma/extraction-service.ts`
- `src/lib/alma/portfolio-analytics.ts`
- `src/lib/alma/governance.ts`
- `src/app/api/v1/alma/route.ts`

---

## Questions?

**Integration with existing systems**: Yes, fully integrated
**Cost**: Uses existing infrastructure, minimal new costs
**Timeline**: 7 weeks to first intelligence pack
**Governance**: Hard gates, not optional
**Revenue**: Funder subscriptions + community revenue sharing

---

## Ready to Start

Answer these 3 questions (one sentence each):

1. **ALMA stance**: "agent + governance rules" or "standalone product"?
2. **Data posture**: Confirm private-by-default is correct?
3. **First deliverable**: Funder portfolio report, replication library, or diligence engine?

Then I'll create:
- ALMA Charter (publication-ready)
- Youth Justice Schema (Airtable-ready)
- 6-Week Build Backlog (implementation-ready)

All integrated with the Intelligence Hub we just completed! 🚀

