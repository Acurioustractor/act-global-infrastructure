# ALMA Integration Plan - ACT Intelligence Hub

**Status**: 🎯 Ready for Implementation

**Date**: December 31, 2025

---

## Executive Summary

This document outlines how to integrate **ALMA** (the sensemaking and action layer) into the newly completed ACT Intelligence Hub, connecting it with JusticeHub, Empathy Ledger, and the existing RAG/knowledge infrastructure.

**ALMA Definition**: The sensemaking and action layer that turns community knowledge + evidence + funding signals into decisions, tools, and accountable workflows.

**Integration Goal**: Extend the Intelligence Hub's RAG capabilities to support ALMA's portfolio intelligence, community governance, and ethical decision-making for youth justice (and later verticals).

---

## Current State (Intelligence Hub - Week 3 Complete)

### What We Have ✅

**Infrastructure** (100% operational):
- Vector database with 6,443+ lines of ACT knowledge
- Multi-provider AI (Claude, GPT, Perplexity, Ollama)
- Unified RAG service with confidence scoring
- Web query interface at `/ask`
- API endpoint `/api/v1/ask`
- GHL integration (partners + grants)
- Automated notifications
- Smart work queue

**Data Sources**:
- ACT Core Knowledge (LCAA, projects, operations)
- Partners (from GHL → Notion)
- Grants (from GHL → Notion)
- GitHub Issues
- Operational procedures

**Capabilities**:
- Natural language queries
- Source attribution
- Cost tracking
- Automated sync (every 6h)
- Daily notifications
- Work prioritization

---

## ALMA Integration Architecture

### Layer Model

```
┌────────────────────────────────────────────────────────┐
│                    ALMA Layer                          │
│  (Sensemaking + Action + Governance)                   │
└────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  JusticeHub  │  │   Empathy    │  │     ACT      │
│              │  │   Ledger     │  │ Intelligence │
│ • Projects   │  │ • Impact     │  │     Hub      │
│ • Evidence   │  │ • Funding    │  │ • Knowledge  │
│ • Community  │  │ • Stories    │  │ • Partners   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │   Shared Knowledge Store        │
        │                                 │
        │ • Vector DB (unstructured)      │
        │ • Airtable/Notion (structured)  │
        │ • Provenance + Consent Ledger   │
        └─────────────────────────────────┘
```

### Integration Points

**ALMA ← Intelligence Hub**:
- RAG retrieval for evidence synthesis
- Partner/grant intelligence
- Knowledge search across all sources

**ALMA → JusticeHub**:
- Draft project pages
- Evidence synthesis
- Replication recommendations

**ALMA → Empathy Ledger**:
- Portfolio analytics
- Impact attribution
- Funding recommendations

**ALMA → Intelligence Hub**:
- New knowledge ingestion
- Community contributions
- Lived experience data

---

## Phase 0: Define ALMA (Week 1)

### Goal
Create foundational documents and governance framework

### Deliverables

**1. ALMA Charter** (2 pages)

File: `/Users/benknight/act-global-infrastructure/docs/ALMA_CHARTER.md`

Contents:
```markdown
# ALMA Charter

## Purpose
ALMA is the sensemaking and action layer that turns community
knowledge + evidence + funding signals into decisions, tools,
and accountable workflows.

## What ALMA Is
- Intelligence engine for social impact
- Portfolio analytics for ethical grantmaking
- Evidence synthesis with community authority
- Knowledge commons builder

## What ALMA Is Not
- Not a replacement for human/community decision-making
- Not a black-box recommendation engine
- Not extractive of community knowledge
- Not culturally neutral

## Governance Gates
1. Authority gating (community consent required)
2. Consent ledger (tracked usage permissions)
3. Provenance-first (all claims sourced)
4. Human review loops (ALMA drafts, people decide)
5. Anti-extractive defaults (no unauthorized scraping)

## Consent Model
- Every contribution has explicit permissions
- Communities control their knowledge
- Downstream usage tracked
- Revenue sharing for value creation

## Node Operating Model
- Witta Harvest (national coordination)
- State nodes (local intelligence)
- Community authority embedded
- Indigenous leadership respected
```

**2. Youth Justice Ontology v0.1**

File: `/Users/benknight/act-global-infrastructure/config/alma-youth-justice-schema.json`

```json
{
  "version": "0.1",
  "vertical": "youth_justice",
  "entities": {
    "intervention": {
      "fields": [
        "name",
        "type",
        "description",
        "target_cohort",
        "place",
        "intended_outcomes",
        "indicators",
        "evidence_level",
        "cultural_authority",
        "consent_status",
        "harm_risks",
        "cost_range",
        "implementation_complexity",
        "replication_ready"
      ]
    },
    "community_context": {
      "fields": [
        "location",
        "population_size",
        "demographics",
        "cultural_considerations",
        "authority_holder",
        "local_priorities"
      ]
    },
    "evidence": {
      "fields": [
        "source_type",
        "date",
        "authority_level",
        "strength_rating",
        "consent_permissions",
        "cultural_sensitivity"
      ]
    },
    "outcome": {
      "fields": [
        "outcome_type",
        "measurement_approach",
        "timeframe",
        "attribution_confidence",
        "community_validation"
      ]
    }
  },
  "relationships": {
    "intervention_to_context": "many_to_many",
    "intervention_to_evidence": "one_to_many",
    "intervention_to_outcomes": "one_to_many"
  },
  "governance": {
    "consent_required_for": [
      "publication",
      "recommendation",
      "training_data",
      "external_sharing"
    ],
    "authority_levels": [
      "community_elder",
      "lived_experience",
      "service_provider",
      "researcher",
      "policy_maker"
    ]
  }
}
```

**3. Data Posture Statement**

File: `/Users/benknight/act-global-infrastructure/docs/ALMA_DATA_POSTURE.md`

```markdown
# ALMA Data Posture

## Private to Nodes (Never Public)
- Lived experience stories (unless explicit consent)
- Community deliberation notes
- Sensitive cultural knowledge
- Individual-level data
- Draft/in-progress work

## Community Commons (JusticeHub Public)
- Evidence-backed intervention models
- Anonymized outcome data
- Replication playbooks
- Research summaries
- Policy analysis

## Funder-Facing (Empathy Ledger)
- Portfolio analytics
- Evidence synthesis
- Impact attribution
- Funding recommendations
- Diligence briefs

## Governance Rules
- Default private, explicit consent to share
- Community authority controls publication
- Revenue sharing for commercial use
- Provenance always tracked
```

### Implementation Tasks

```bash
# Create ALMA documentation directory
mkdir -p /Users/benknight/act-global-infrastructure/docs/alma

# Files to create:
# 1. docs/alma/CHARTER.md
# 2. config/alma-youth-justice-schema.json
# 3. docs/alma/DATA_POSTURE.md
# 4. docs/alma/GOVERNANCE_RULES.md
```

---

## Phase 1: MVP - Youth Justice Intelligence Pack (Weeks 2-7)

### Goal
Build ALMA's core capabilities for youth justice vertical

### Architecture Extension

**New Components**:

1. **Document Ingestion Pipeline**
2. **Structured Extraction Service**
3. **Portfolio Analytics Engine**
4. **Governance Gate Middleware**
5. **ALMA Query Interface**

### Component Details

#### 1. Document Ingestion Pipeline

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/document-ingestion.ts`

```typescript
interface DocumentMetadata {
  source: string;
  date: Date;
  author: string;
  vertical: 'youth_justice' | 'housing' | 'family_violence';
  culturalSensitivity: 'public' | 'restricted' | 'private';
  consentStatus: 'explicit' | 'pending' | 'denied';
  authorityHolder?: string;
}

interface IngestedDocument {
  id: string;
  content: string;
  chunks: TextChunk[];
  embeddings: number[][];
  metadata: DocumentMetadata;
  extractedEntities: ExtractedEntity[];
  governanceFlags: GovernanceFlag[];
}

class ALMADocumentIngestion {
  async ingest(file: File, metadata: DocumentMetadata) {
    // 1. Extract text
    // 2. Check governance gates
    // 3. Chunk text
    // 4. Generate embeddings
    // 5. Extract structured entities
    // 6. Store with provenance
  }
}
```

#### 2. Structured Extraction Service

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/extraction-service.ts`

```typescript
interface ExtractedIntervention {
  name: string;
  type: string;
  targetCohort: string;
  place: string;
  outcomes: string[];
  evidenceLevel: 'anecdotal' | 'promising' | 'evidence-based' | 'proven';
  culturalAuthority: string;
  harmRisks: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
}

class ALMAExtractionService {
  async extractIntervention(document: IngestedDocument): Promise<ExtractedIntervention> {
    // Use LLM with schema-guided extraction
    // Validate against ontology
    // Flag for human review
  }

  async extractEvidence(document: IngestedDocument): Promise<Evidence[]> {
    // Extract evidence claims
    // Rate strength
    // Link to interventions
  }
}
```

#### 3. Portfolio Analytics Engine

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/portfolio-analytics.ts`

```typescript
interface PortfolioSignal {
  name: string;
  weight: number;
  value: number;
  source: string;
}

interface InterventionScore {
  intervention: ExtractedIntervention;
  signals: PortfolioSignal[];
  overallScore: number;
  confidence: number;
  recommendations: string[];
  risks: string[];
}

class ALMAPortfolioAnalytics {
  // Portfolio intelligence methods adapted from quant

  calculateSignals(intervention: ExtractedIntervention): PortfolioSignal[] {
    return [
      { name: 'evidence_strength', weight: 0.25, value: this.scoreEvidence(intervention) },
      { name: 'community_authority', weight: 0.20, value: this.scoreAuthority(intervention) },
      { name: 'implementation_capability', weight: 0.15, value: this.scoreCapability(intervention) },
      { name: 'cultural_fit', weight: 0.15, value: this.scoreCulturalFit(intervention) },
      { name: 'cost_effectiveness', weight: 0.10, value: this.scoreCost(intervention) },
      { name: 'harm_risk', weight: 0.10, value: this.scoreHarmRisk(intervention) },
      { name: 'learning_potential', weight: 0.05, value: this.scoreLearningValue(intervention) }
    ];
  }

  buildPortfolio(interventions: ExtractedIntervention[], constraints: PortfolioConstraints) {
    // Diversify across types, geographies, risk profiles
    // Allocate learning tranche
    // Apply risk controls
    // Ensure consent/authority flags satisfied
  }

  rebalance(currentPortfolio: Portfolio, newEvidence: Evidence[]) {
    // Update based on outcomes
    // Shift funding as priorities evolve
  }
}
```

#### 4. Governance Gate Middleware

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/governance.ts`

```typescript
interface GovernanceCheck {
  rule: string;
  passed: boolean;
  reason?: string;
  requiredAction?: string;
}

class ALMAGovernance {
  async checkAuthorityGate(entity: any): Promise<GovernanceCheck> {
    // Community-controlled practice must have authority flag
    if (entity.culturalAuthority === 'required' && !entity.authorityHolder) {
      return {
        rule: 'authority_gating',
        passed: false,
        reason: 'Community authority not specified',
        requiredAction: 'Obtain Elder council / community org approval'
      };
    }
    return { rule: 'authority_gating', passed: true };
  }

  async checkConsentLedger(entity: any, action: string): Promise<GovernanceCheck> {
    // Check if action is permitted
    const consent = await this.getConsent(entity.id);
    if (!consent.permits(action)) {
      return {
        rule: 'consent_ledger',
        passed: false,
        reason: `Action '${action}' not permitted`,
        requiredAction: 'Obtain explicit consent for this use'
      };
    }
    return { rule: 'consent_ledger', passed: true };
  }

  async enforceGates(entity: any, action: string): Promise<GovernanceCheck[]> {
    const checks = await Promise.all([
      this.checkAuthorityGate(entity),
      this.checkConsentLedger(entity, action),
      this.checkProvenance(entity),
      this.checkCulturalSafety(entity)
    ]);

    // Block if any check fails
    const failed = checks.filter(c => !c.passed);
    if (failed.length > 0) {
      throw new GovernanceViolation(failed);
    }

    return checks;
  }
}
```

#### 5. ALMA Query Interface

**File**: `/Users/benknight/Code/act-regenerative-studio/src/app/api/v1/alma/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { query, vertical, action } = await req.json();

  // Example actions:
  // - 'retrieve': RAG search
  // - 'extract': document → structured record
  // - 'recommend': portfolio recommendations
  // - 'publish': create draft in JusticeHub/Empathy Ledger

  switch (action) {
    case 'retrieve':
      return await almaRetrieve(query, vertical);

    case 'extract':
      return await almaExtract(query);

    case 'recommend':
      return await almaRecommend(query, vertical);

    case 'publish':
      // Governance gates enforced here
      await governance.enforceGates(query.entity, 'publish');
      return await almaPublish(query);

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

### Deliverables

**1. Funder-Facing Portfolio Report**

Template: `Youth Justice Portfolio Intelligence - [Month] [Year]`

Sections:
- **Top Intervention Clusters**: What's working, where
- **Underfunded/High-Confidence Zones**: Evidence-backed gaps
- **Risk + Harm Flags**: What to avoid or approach carefully
- **Learning Agenda**: What to fund to learn more
- **Replication Candidates**: Ready-to-scale interventions

**2. Integration with Existing RAG**

Extend `/api/v1/ask` to support ALMA queries:

```typescript
// Add to existing route.ts
if (query.includes('youth justice') || query.includes('intervention') || query.includes('portfolio')) {
  // Route to ALMA-enhanced retrieval
  return await almaEnhancedQuery(query, tier);
}
```

**3. Airtable Schema**

Create Airtable bases aligned with ontology:
- Youth Justice Interventions
- Evidence Library
- Community Contexts
- Outcomes Tracking
- Consent Ledger

---

## Phase 2: Operationalize Nodes (Weeks 8-17)

### Goal
Enable community knowledge contribution with governance

### Components

#### 1. Node Workshop Templates

**File**: `/Users/benknight/act-global-infrastructure/docs/alma/node-workshop-guide.md`

Templates for:
- Lived experience gathering (with consent)
- Local context mapping
- Intervention documentation
- Outcome validation

#### 2. Contribution Portal

**UI**: `/alma/contribute` in ACT Studio

Features:
- Upload documents (with consent forms)
- Tag cultural sensitivity
- Specify authority holders
- Preview before submission
- Track contribution value

#### 3. Replication Pack Generator

Auto-generate JusticeHub project pages from ALMA data:

```typescript
class ReplicationPackGenerator {
  async generatePack(intervention: ExtractedIntervention) {
    return {
      title: intervention.name,
      summary: intervention.description,
      evidence: this.getLinkedEvidence(intervention),
      context: this.getSuccessFactors(intervention),
      howTo: this.extractImplementationSteps(intervention),
      risks: intervention.harmRisks,
      cost: intervention.costRange,
      contacts: this.getCommunityContacts(intervention)
    };
  }
}
```

---

## Phase 3: Expand Verticals (Ongoing)

### Goal
Clone youth justice model for other verticals

### Verticals Roadmap

1. **Youth Justice** (Phase 1-2)
2. **Family Violence** (Phase 3a)
3. **Housing/Homelessness** (Phase 3b)
4. **Disability Justice** (Phase 3c)
5. **Youth Mental Health** (Phase 3d)

### Reusable Components

Each vertical needs:
- Ontology schema (JSON)
- Evidence taxonomy
- Outcome indicators
- Cultural considerations
- Governance rules

---

## Integration with Existing Systems

### JusticeHub Integration

**Existing**: Airtable + Softr no-code platform

**ALMA Connection**:
```
ALMA (draft) → Human Review → JusticeHub (publish)

Flow:
1. ALMA generates project draft
2. Community reviews and approves
3. Published to JusticeHub as replication pack
4. Tracked in consent ledger
```

**API Endpoints to Build**:
```typescript
POST /api/justicehub/draft-project
POST /api/justicehub/submit-for-review
POST /api/justicehub/publish-project
```

### Empathy Ledger Integration

**Existing**: Impact mapping + funding intelligence

**ALMA Connection**:
```
ALMA (analytics) → Portfolio Report → Empathy Ledger (dashboard)

Flow:
1. ALMA computes portfolio recommendations
2. Generates funder diligence briefs
3. Displays in Empathy Ledger dashboards
4. Tracks attribution for contributions
```

**API Endpoints to Build**:
```typescript
POST /api/empathy-ledger/portfolio-analysis
POST /api/empathy-ledger/attribution-track
POST /api/empathy-ledger/impact-report
```

### ACT Intelligence Hub Integration

**Existing**: RAG + Web UI + CLI

**ALMA Connection**:
```
Intelligence Hub (knowledge) ⇄ ALMA (sensemaking)

Bidirectional:
- Hub provides retrieval for ALMA queries
- ALMA ingests community contributions into Hub
- Shared vector DB and consent ledger
```

**Enhanced Query Examples**:
```
"What youth justice interventions work in remote communities?"
→ ALMA retrieves + filters by evidence + community authority

"Show me underfunded opportunities in family violence prevention"
→ ALMA portfolio analysis + gap identification

"What can we learn from [intervention name]?"
→ ALMA evidence synthesis + replication feasibility
```

---

## Technical Implementation Plan

### Week 1: Foundation

**Tasks**:
- [ ] Create ALMA documentation (Charter, Ontology, Data Posture)
- [ ] Set up ALMA directory structure
- [ ] Define governance rules file
- [ ] Update package.json with ALMA scripts

**Files**:
```
act-global-infrastructure/
├── docs/alma/
│   ├── CHARTER.md
│   ├── DATA_POSTURE.md
│   ├── GOVERNANCE_RULES.md
│   └── node-workshop-guide.md
├── config/
│   └── alma-youth-justice-schema.json
└── scripts/alma/
    └── (placeholder for future scripts)
```

### Weeks 2-3: Ingestion Pipeline

**Tasks**:
- [ ] Build document ingestion service
- [ ] Add PDF/doc extraction
- [ ] Implement chunking + embedding
- [ ] Create metadata schema
- [ ] Add to vector DB

**Files**:
```
act-regenerative-studio/
└── src/lib/alma/
    ├── document-ingestion.ts
    ├── text-extraction.ts
    ├── chunking.ts
    └── embedding.ts
```

### Weeks 4-5: Extraction Service

**Tasks**:
- [ ] Build structured extraction service
- [ ] Implement schema validation
- [ ] Create human review queue
- [ ] Link to Airtable

**Files**:
```
act-regenerative-studio/
└── src/lib/alma/
    ├── extraction-service.ts
    ├── schema-validator.ts
    └── review-queue.ts
```

### Week 6-7: Portfolio Analytics

**Tasks**:
- [ ] Build signal calculation
- [ ] Implement portfolio construction
- [ ] Create recommendation engine
- [ ] Generate funder reports

**Files**:
```
act-regenerative-studio/
└── src/lib/alma/
    ├── portfolio-analytics.ts
    ├── signal-calculator.ts
    └── report-generator.ts
```

### Week 7: MVP Complete

**Deliverables**:
- [ ] Youth Justice Intelligence Pack (first report)
- [ ] Working ingestion pipeline
- [ ] Portfolio analytics dashboard
- [ ] API endpoints operational

---

## Quick Start Commands

Once implementation begins:

```bash
# Ingest a document
npm run alma:ingest ./docs/youth-justice-report.pdf

# Extract interventions
npm run alma:extract --document-id=123

# Generate portfolio report
npm run alma:portfolio --vertical=youth_justice

# Check governance compliance
npm run alma:governance-check --entity-id=456

# Query ALMA
npm run alma:ask "What interventions work for diversion?"
```

---

## Questions to Answer (For Build Spec)

### 1. ALMA Stance

**Recommendation**: "Agent + governance rules"

ALMA should be:
- An intelligent layer (not standalone product)
- Embedded in existing tools (Intelligence Hub, JusticeHub, Empathy Ledger)
- With hard governance gates (not optional ethics)

### 2. Data Posture

**Recommendation**:

**Always Private to Nodes**:
- Lived experience stories (unless explicit consent)
- Community deliberation
- Sensitive cultural knowledge
- Individual data

**Can Become Public in JusticeHub** (with consent):
- Evidence-backed interventions
- Anonymized outcomes
- Replication playbooks
- Research summaries

### 3. First Youth Justice Deliverable

**Recommendation**: **Funder-facing portfolio report**

**Why**:
- Demonstrates immediate value
- Validates ALMA's portfolio intelligence
- Creates revenue opportunity
- Builds funder relationships
- Funds community contributions

**Format**:
- Monthly or quarterly report
- Subscription model for funders
- Revenue shared with contributing communities
- Includes action recommendations

---

## Next Steps

**Immediate** (This Week):
1. Review and approve ALMA Charter
2. Confirm data posture defaults
3. Choose first deliverable focus
4. Set up ALMA directory structure

**Week 1-2**:
1. Create foundational documents
2. Define youth justice ontology
3. Set up Airtable schemas
4. Begin ingestion pipeline

**Week 3-7**:
1. Build extraction service
2. Implement portfolio analytics
3. Create API endpoints
4. Generate first intelligence pack

**Week 8+**:
1. Operationalize nodes
2. Run community workshops
3. Scale to more verticals
4. Launch funder subscription

---

**Status**: 🎯 Ready for Your Decision

Once you answer the 3 questions (ALMA stance, data posture, first deliverable), I can immediately create:

1. **ALMA Charter** (1 page, ready to publish)
2. **Youth Justice Schema v0.1** (Airtable-ready)
3. **6-Week Build Backlog** (epics, tickets, acceptance criteria)

All integrated with the Intelligence Hub infrastructure we just completed! 🚀

