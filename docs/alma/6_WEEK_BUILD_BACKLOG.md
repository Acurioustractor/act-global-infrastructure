# ALMA - 6-Week Build Backlog

**Version**: 1.0
**Date**: December 31, 2025
**Aligned to**: JusticeHub + Empathy Ledger
**Total Effort**: ~42 hours over 6 weeks

---

## Overview

This backlog implements ALMA as a **layered capability** on top of the existing ACT Intelligence Hub (Weeks 1-3 complete).

**Key principles**:
- ✅ Additive, not replacement
- ✅ Parallel systems with clear boundaries
- ✅ Opt-in ALMA mode
- ✅ Governance as technical controls
- ✅ Test existing behavior unchanged

**Phases**:
- **Week 1**: Foundation (documentation only, no code)
- **Weeks 2-3**: Parallel ingestion + extraction (ALMA runs alongside Hub)
- **Weeks 4-5**: Portfolio analytics + first Intelligence Pack
- **Week 6**: Integration points + JusticeHub publication

---

## Week 1: Foundation (7 hours)

**Goal**: Complete documentation and governance framework before any code

### Epic 1.1: ALMA Documentation

**Tickets**:

#### Ticket 1.1.1: ALMA Charter ✅
- **Status**: Complete
- **File**: `/Users/benknight/act-global-infrastructure/docs/alma/CHARTER.md`
- **Acceptance Criteria**:
  - [x] Purpose and problem statement defined
  - [x] 5 governance gates documented as technical controls
  - [x] Consent model with full lifecycle
  - [x] Node operating model (Witta Harvest + states)
  - [x] Portfolio intelligence approach explained
  - [x] Youth Justice vertical scoped
  - [x] Success criteria defined

#### Ticket 1.1.2: Youth Justice Ontology v0.1 ✅
- **Status**: Complete
- **File**: `/Users/benknight/act-global-infrastructure/config/alma-youth-justice-schema.json`
- **Acceptance Criteria**:
  - [x] 4 entity types defined (intervention, context, evidence, outcome)
  - [x] Field schemas for each entity (Airtable-ready)
  - [x] Relationships mapped (many-to-many)
  - [x] Governance rules specified per entity
  - [x] Portfolio signals defined
  - [x] Integration points documented (JusticeHub, Empathy Ledger, Intelligence Hub)
  - [x] Namespace strategy specified

#### Ticket 1.1.3: Data Posture Statement ✅
- **Status**: Complete
- **File**: `/Users/benknight/act-global-infrastructure/docs/alma/DATA_POSTURE.md`
- **Acceptance Criteria**:
  - [x] Three-tier classification (Private / Community / Public)
  - [x] Consent lifecycle documented (contribution → storage → usage → tracking → revenue)
  - [x] Technical safeguards specified (namespace isolation, consent middleware, audit logging)
  - [x] Data movement paths defined
  - [x] Cross-system boundaries clarified
  - [x] Revenue sharing model explained

#### Ticket 1.1.4: Governance Rules Reference
- **Status**: To Do
- **File**: `/Users/benknight/act-global-infrastructure/docs/alma/GOVERNANCE_RULES.md`
- **Effort**: 2 hours
- **Acceptance Criteria**:
  - [ ] Authority gating implementation guide
  - [ ] Consent ledger schema and middleware logic
  - [ ] Provenance tracking requirements
  - [ ] Human review workflow states and transitions
  - [ ] Anti-extractive defaults and enforcement
  - [ ] Code examples for each governance gate

---

### Epic 1.2: Airtable Setup

**Tickets**:

#### Ticket 1.2.1: Create Airtable Base "ALMA Youth Justice"
- **Status**: To Do
- **Effort**: 3 hours
- **Acceptance Criteria**:
  - [ ] New Airtable base created
  - [ ] 4 tables: Interventions, Contexts, Evidence, Outcomes
  - [ ] Fields match schema from `alma-youth-justice-schema.json`
  - [ ] Relationships configured (linked records)
  - [ ] Views created: All, Public, Community, Private
  - [ ] Sample records added (5-10 test interventions)
  - [ ] Airtable API key stored in GitHub Secrets
  - [ ] Base ID saved to `/Users/benknight/act-global-infrastructure/config/notion-database-ids.json` (extend for Airtable)

#### Ticket 1.2.2: Create Consent Ledger Database
- **Status**: To Do
- **Effort**: 2 hours
- **Options**: Supabase (recommended) or Airtable
- **Acceptance Criteria**:
  - [ ] Database created (Supabase preferred for governance controls)
  - [ ] Schema matches consent ledger from DATA_POSTURE.md
  - [ ] Indexes created on entityId, consentTier, expiryDate
  - [ ] Access controls configured (service account only)
  - [ ] Sample consent records created
  - [ ] Connection tested from Node.js script

---

## Week 2-3: Ingestion + Extraction (14 hours)

**Goal**: Ingest youth justice documents, extract structured entities, store with governance

### Epic 2.1: Document Ingestion Pipeline

**Tickets**:

#### Ticket 2.1.1: ALMA Document Ingestion Service
- **Status**: To Do
- **Effort**: 5 hours
- **File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/document-ingestion.ts`
- **Acceptance Criteria**:
  - [ ] Accepts PDF, DOCX, TXT files
  - [ ] Chunks documents (1000 tokens max per chunk)
  - [ ] Generates embeddings via OpenAI (text-embedding-3-small)
  - [ ] Stores in vector DB with namespace `alma:youth_justice:{tier}`
  - [ ] Requires consent metadata before ingestion (enforcement)
  - [ ] Links to consent ledger record
  - [ ] Returns ingestion summary (chunks, tokens, cost)
  - [ ] Test: Ingest 3 sample youth justice reports

**Code structure**:
```typescript
export class ALMADocumentIngestion {
  async ingest(file: File, metadata: IngestionMetadata): Promise<IngestionResult> {
    // 1. Validate consent metadata present
    if (!metadata.consentRecord) {
      throw new Error('Consent record required before ingestion');
    }

    // 2. Extract text from file
    const text = await extractText(file);

    // 3. Chunk document
    const chunks = chunkDocument(text, { maxTokens: 1000 });

    // 4. Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // 5. Determine namespace from consent tier
    const namespace = `alma:youth_justice:${metadata.consentRecord.consentTier.toLowerCase().replace(' ', '_')}`;

    // 6. Store in vector DB
    await storeEmbeddings(embeddings, namespace, metadata);

    // 7. Log ingestion in consent ledger
    await logIngestion(metadata.consentRecord.id, file.name, chunks.length);

    return {
      chunksCreated: chunks.length,
      tokensProcessed: chunks.reduce((sum, c) => sum + c.tokens, 0),
      namespace,
      cost: calculateCost(chunks)
    };
  }
}
```

**Test cases**:
1. Ingest with missing consent → Should throw error
2. Ingest with consent tier "Public" → Should store in `alma:youth_justice:public_knowledge_commons`
3. Ingest with consent tier "Private" → Should store in `alma:youth_justice:strictly_private`

---

#### Ticket 2.1.2: CLI Tool for Document Ingestion
- **Status**: To Do
- **Effort**: 2 hours
- **File**: `/Users/benknight/act-global-infrastructure/scripts/alma-ingest-document.mjs`
- **Acceptance Criteria**:
  - [ ] CLI accepts file path and consent metadata (interactive prompts)
  - [ ] Validates consent completeness
  - [ ] Calls ALMADocumentIngestion service
  - [ ] Outputs ingestion summary
  - [ ] Logs to consent ledger
  - [ ] Test: `npm run alma:ingest ./sample-report.pdf`

**Usage**:
```bash
npm run alma:ingest ./youth-justice-report.pdf

# Interactive prompts:
# → Who contributed this document? [Org Name]
# → What cultural authority applies? [Elder Council / Community Org / None]
# → Consent tier? [Private / Community / Public]
# → Permitted uses? [Query, Publish, Export, Training, Commercial]
# → Revenue sharing? [Yes / No]

# Output:
# ✅ Ingested 47 chunks (12,453 tokens)
# ✅ Stored in namespace: alma:youth_justice:community_controlled
# ✅ Consent record created: consent-uuid-123
# ✅ Cost: $0.0025
```

---

### Epic 2.2: Structured Extraction Service

**Tickets**:

#### Ticket 2.2.1: ALMA Extraction Service
- **Status**: To Do
- **Effort**: 7 hours
- **File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/extraction-service.ts`
- **Acceptance Criteria**:
  - [ ] Extracts interventions from documents using LLM (Claude Sonnet 4.5)
  - [ ] Returns structured JSON matching youth justice schema
  - [ ] Validates extracted entities against schema
  - [ ] Checks consent requirements before extraction
  - [ ] Creates Airtable records for extracted entities
  - [ ] Links entities to source document (provenance)
  - [ ] Test: Extract 3 interventions from sample reports

**Code structure**:
```typescript
export class ALMAExtractionService {
  async extractIntervention(documentId: string): Promise<Intervention[]> {
    // 1. Retrieve document from vector DB
    const document = await getDocument(documentId);

    // 2. Check consent allows extraction
    const consent = await getConsentRecord(document.consentRecordId);
    if (!consent.permittedUses.includes('extract')) {
      throw new Error('Extraction not permitted for this document');
    }

    // 3. Build extraction prompt from schema
    const schema = await loadSchema('youth_justice');
    const prompt = buildExtractionPrompt(document.text, schema.entities.intervention);

    // 4. Call LLM for structured extraction
    const response = await callClaude(prompt, {
      temperature: 0.2, // Lower temp for structured extraction
      maxTokens: 4000
    });

    // 5. Parse and validate extracted entities
    const interventions = parseInterventions(response);
    const validated = interventions.map(i => validateAgainstSchema(i, schema));

    // 6. Create Airtable records
    const airtableRecords = await Promise.all(
      validated.map(i => createAirtableRecord('Interventions', {
        ...i,
        'Source Documents': [{ url: document.url }],
        'Review Status': 'Draft',
        'Consent Level': consent.consentTier
      }))
    );

    // 7. Log extraction in consent ledger
    await logExtraction(consent.id, airtableRecords.length);

    return airtableRecords;
  }
}
```

**Extraction prompt template**:
```
You are extracting youth justice interventions from evaluation reports.

Schema: {youth_justice_schema.intervention}

Document: {document_text}

Extract all interventions mentioned. For each:
- Name
- Type (Prevention, Diversion, etc.)
- Target cohort
- Intended outcomes
- Evidence level
- Risks/harms
- Implementation cost

Return JSON array of interventions matching schema.
```

**Test cases**:
1. Extract from document with consent → Should create Airtable records
2. Extract from document without extraction permission → Should throw error
3. Validate extracted intervention missing required field → Should fail validation

---

## Week 4-5: Portfolio Analytics (12 hours)

**Goal**: Calculate portfolio signals, build recommendations, generate first Intelligence Pack

### Epic 3.1: Portfolio Analytics Engine

**Tickets**:

#### Ticket 3.1.1: Signal Calculator
- **Status**: To Do
- **Effort**: 5 hours
- **File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/portfolio-analytics.ts`
- **Acceptance Criteria**:
  - [ ] Calculates 5 signals per intervention (evidence, authority, harm risk, capability, option value)
  - [ ] Weighted combination produces portfolio score
  - [ ] Respects governance constraints (cultural authority required, harm risk caps)
  - [ ] Returns ranked interventions
  - [ ] Test: Calculate signals for 10 test interventions

**Signal calculation**:
```typescript
export class PortfolioAnalytics {
  calculateSignals(intervention: Intervention): PortfolioSignals {
    const signals = {
      evidenceStrength: this.scoreEvidence(intervention),
      communityAuthority: this.scoreCommunityAuthority(intervention),
      harmRisk: this.scoreHarmRisk(intervention),
      implementationCapability: this.scoreCapability(intervention),
      optionValue: this.scoreOptionValue(intervention)
    };

    // Weighted combination
    const portfolioScore =
      signals.evidenceStrength * 0.25 +
      signals.communityAuthority * 0.30 +
      (1 - signals.harmRisk) * 0.20 + // Inverse of harm risk
      signals.implementationCapability * 0.15 +
      signals.optionValue * 0.10;

    return { ...signals, portfolioScore };
  }

  private scoreEvidence(intervention: Intervention): number {
    // Map evidence levels to scores
    const evidenceLevelScores = {
      'Proven (RCT/quasi-experimental, replicated)': 1.0,
      'Effective (strong evaluation, positive outcomes)': 0.8,
      'Promising (community-endorsed, emerging evidence)': 0.6,
      'Indigenous-led (culturally grounded, community authority)': 0.9, // High weight
      'Untested (theory/pilot stage)': 0.3
    };

    const baseScore = evidenceLevelScores[intervention.evidenceLevel] || 0.5;

    // Boost if multiple evidence sources
    const evidenceBoost = Math.min(intervention.evidence.length * 0.1, 0.3);

    return Math.min(baseScore + evidenceBoost, 1.0);
  }

  private scoreCommunityAuthority(intervention: Intervention): number {
    // High score if culturally grounded and community-controlled
    if (intervention.evidenceLevel.includes('Indigenous-led')) return 1.0;
    if (intervention.culturalAuthority && intervention.consentLevel === 'Community Controlled') return 0.8;
    if (intervention.culturalAuthority) return 0.6;
    return 0.4; // Lower if no clear community authority
  }

  private scoreHarmRisk(intervention: Intervention): number {
    // Lower score = higher risk (so we can invert for portfolio score)
    const harmLevelScores = {
      'Low': 0.1,
      'Medium': 0.4,
      'High': 0.8,
      'Requires cultural review': 0.9
    };
    return harmLevelScores[intervention.harmRiskLevel] || 0.5;
  }

  private scoreCapability(intervention: Intervention): number {
    let score = 0;

    // Replication readiness
    if (intervention.replicationReadiness === 'Ready (playbook available)') score += 0.4;
    else if (intervention.replicationReadiness === 'Ready with support') score += 0.3;
    else score += 0.1;

    // Years operating (proxy for stability)
    if (intervention.yearsOperating >= 5) score += 0.3;
    else if (intervention.yearsOperating >= 2) score += 0.2;
    else score += 0.1;

    // Current funding
    if (intervention.currentFunding === 'Established') score += 0.3;
    else if (intervention.currentFunding === 'Pilot/seed') score += 0.2;
    else score += 0.1;

    return Math.min(score, 1.0);
  }

  private scoreOptionValue(intervention: Intervention): number {
    // Learning potential for under-evidenced but community-endorsed
    if (
      intervention.evidenceLevel === 'Untested (theory/pilot stage)' &&
      intervention.consentLevel === 'Community Controlled' &&
      intervention.culturalAuthority
    ) {
      return 0.8; // High option value - worth funding to learn
    }

    if (intervention.evidenceLevel.includes('Promising')) {
      return 0.6; // Medium option value
    }

    return 0.3; // Low option value if already proven or not community-endorsed
  }
}
```

---

#### Ticket 3.1.2: Portfolio Constructor
- **Status**: To Do
- **Effort**: 4 hours
- **File**: Same as above (portfolio-analytics.ts)
- **Acceptance Criteria**:
  - [ ] Builds diversified portfolio across dimensions (type, geography, cohort, evidence maturity)
  - [ ] Enforces constraints (max 15% untested, min 80% community-endorsed, no high harm risk)
  - [ ] Returns recommendations: next best grant, underfunded zones, learning agenda
  - [ ] Test: Build portfolio from 20 interventions

**Portfolio construction**:
```typescript
export class PortfolioAnalytics {
  buildPortfolio(interventions: Intervention[], budget: number): Portfolio {
    // 1. Calculate signals for all
    const scored = interventions.map(i => ({
      intervention: i,
      signals: this.calculateSignals(i)
    }));

    // 2. Enforce hard constraints
    const eligible = scored.filter(s => this.meetsConstraints(s));

    // 3. Optimize for diversification
    const allocated = this.optimizePortfolio(eligible, budget);

    // 4. Identify gaps
    const gaps = this.identifyGaps(allocated, interventions);

    // 5. Generate recommendations
    const recommendations = this.generateRecommendations(allocated, gaps);

    return {
      allocated,
      totalBudget: budget,
      diversification: this.calculateDiversification(allocated),
      gaps,
      recommendations
    };
  }

  private meetsConstraints(scored: ScoredIntervention): boolean {
    const { intervention, signals } = scored;

    // No high harm risk without mitigation
    if (intervention.harmRiskLevel === 'High' && !intervention.risks.includes('mitigation')) {
      return false;
    }

    // Cultural authority required for community-controlled
    if (intervention.consentLevel === 'Community Controlled' && !intervention.culturalAuthority) {
      return false;
    }

    return true;
  }

  private optimizePortfolio(eligible: ScoredIntervention[], budget: number): Allocation[] {
    // Greedy algorithm with diversification penalties

    const allocated: Allocation[] = [];
    let remainingBudget = budget;

    // Diversification trackers
    const typeCount = {};
    const geoCount = {};
    const evidenceCount = {};

    while (remainingBudget > 0 && eligible.length > 0) {
      // Score each with diversification penalty
      const scoredWithPenalty = eligible.map(s => {
        let penalty = 0;

        // Penalty for over-concentration
        penalty += (typeCount[s.intervention.type] || 0) * 0.1;
        penalty += (geoCount[s.intervention.geography[0]] || 0) * 0.1;
        penalty += (evidenceCount[s.intervention.evidenceLevel] || 0) * 0.1;

        return {
          ...s,
          adjustedScore: s.signals.portfolioScore - penalty
        };
      });

      // Pick highest adjusted score
      const best = scoredWithPenalty.sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

      // Allocate funds
      const cost = best.intervention.costPerYoungPerson * 50; // Assume 50 young people
      if (cost <= remainingBudget) {
        allocated.push({
          intervention: best.intervention,
          allocation: cost,
          signals: best.signals
        });

        remainingBudget -= cost;

        // Update diversification trackers
        typeCount[best.intervention.type] = (typeCount[best.intervention.type] || 0) + 1;
        geoCount[best.intervention.geography[0]] = (geoCount[best.intervention.geography[0]] || 0) + 1;
        evidenceCount[best.intervention.evidenceLevel] = (evidenceCount[best.intervention.evidenceLevel] || 0) + 1;

        // Remove from eligible
        eligible = eligible.filter(s => s !== best);
      } else {
        break;
      }
    }

    return allocated;
  }

  private identifyGaps(allocated: Allocation[], allInterventions: Intervention[]): Gap[] {
    // Find underfunded zones

    const gaps: Gap[] = [];

    // Geography gaps
    const allocatedGeos = new Set(allocated.flatMap(a => a.intervention.geography));
    const allGeos = new Set(allInterventions.flatMap(i => i.geography));
    allGeos.forEach(geo => {
      if (!allocatedGeos.has(geo)) {
        gaps.push({
          dimension: 'geography',
          value: geo,
          interventions: allInterventions.filter(i => i.geography.includes(geo))
        });
      }
    });

    // Cohort gaps
    const allocatedCohorts = new Set(allocated.flatMap(a => a.intervention.targetCohort));
    const allCohorts = new Set(allInterventions.flatMap(i => i.targetCohort));
    allCohorts.forEach(cohort => {
      if (!allocatedCohorts.has(cohort)) {
        gaps.push({
          dimension: 'cohort',
          value: cohort,
          interventions: allInterventions.filter(i => i.targetCohort.includes(cohort))
        });
      }
    });

    return gaps;
  }

  private generateRecommendations(allocated: Allocation[], gaps: Gap[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Next best grant
    if (allocated.length > 0) {
      recommendations.push({
        type: 'next_best_grant',
        title: 'Top Priority for Next Funding Round',
        intervention: allocated[0].intervention,
        rationale: `Highest portfolio score (${allocated[0].signals.portfolioScore.toFixed(2)}) with strong community authority and proven evidence.`
      });
    }

    // Underfunded zones
    gaps.forEach(gap => {
      recommendations.push({
        type: 'underfunded_zone',
        title: `Gap: ${gap.dimension} = ${gap.value}`,
        interventions: gap.interventions.slice(0, 3), // Top 3
        rationale: `No current allocation for ${gap.value}. Consider funding to improve portfolio diversification.`
      });
    });

    // Learning agenda
    const untested = allocated.filter(a => a.intervention.evidenceLevel.includes('Untested'));
    if (untested.length > 0) {
      recommendations.push({
        type: 'learning_agenda',
        title: 'Learning Tranche: Promising but Under-Evidenced',
        interventions: untested.map(a => a.intervention),
        rationale: 'Community-endorsed interventions with high option value. Fund to build evidence base.'
      });
    }

    return recommendations;
  }
}
```

---

#### Ticket 3.1.3: First Youth Justice Intelligence Pack
- **Status**: To Do
- **Effort**: 3 hours
- **File**: `/Users/benknight/act-global-infrastructure/scripts/generate-intelligence-pack.mjs`
- **Acceptance Criteria**:
  - [ ] CLI command: `npm run alma:intelligence-pack --vertical=youth_justice`
  - [ ] Fetches all interventions from Airtable
  - [ ] Calculates portfolio signals
  - [ ] Builds diversified portfolio (assume $2M budget)
  - [ ] Generates markdown report with sections:
    - Top intervention clusters
    - Underfunded/high-evidence zones
    - Risk + harm flags
    - Learning agenda
    - Replication candidates
  - [ ] Outputs to `/reports/alma-youth-justice-intelligence-pack-{date}.md`
  - [ ] Test: Generate pack with 15 test interventions

**Report structure**:
```markdown
# Youth Justice Intelligence Pack - Q1 2026

**Generated**: {date}
**Portfolio Budget**: $2,000,000
**Interventions Analyzed**: 47
**Evidence Sources**: 132

## Executive Summary

...

## Top Intervention Clusters

### 1. Diversion Programs (18% of portfolio)
- **Evidence**: Strong (avg 0.82)
- **Community Authority**: High (avg 0.91)
- **Top Pick**: [Intervention Name] - $250k allocation

...

## Underfunded Opportunities

### Remote Communities - High Evidence, Zero Funding
- [Intervention 1]
- [Intervention 2]

Rationale: Strong evidence + community authority, but no current funding. Recommend $400k allocation.

...

## Risk Flags

### High Harm Risk
- [Intervention X]: Requires cultural review before scaling

...

## Learning Agenda

Fund these to build evidence:
- [Untested Intervention 1]: Community-endorsed, high option value
- [Untested Intervention 2]: ...

...

## Replication Candidates

Ready for scale:
- [Intervention A]: Playbook available, proven in 3 sites
- [Intervention B]: ...

...

## Appendix: Methodology

Portfolio signals:
- Evidence strength (25%)
- Community authority (30%)
- Harm risk inverse (20%)
- Implementation capability (15%)
- Option value (10%)

Constraints:
- Max 15% untested
- Min 80% community-endorsed
- No high harm risk without mitigation
```

---

## Week 6: Integration + Publication (9 hours)

**Goal**: Connect ALMA to JusticeHub and Empathy Ledger, publish first replication packs

### Epic 4.1: Query Routing Integration

**Tickets**:

#### Ticket 4.1.1: ALMA Query Routing in API
- **Status**: To Do
- **Effort**: 3 hours
- **File**: `/Users/benknight/Code/act-regenerative-studio/src/app/api/v1/ask/route.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Add intent detection at top of `/api/v1/ask` endpoint
  - [ ] If ALMA intent detected, route to ALMA pipeline
  - [ ] Otherwise, continue with existing RAG flow (unchanged)
  - [ ] ALMA responses include governance metadata
  - [ ] Test: Query "youth justice interventions" → Routes to ALMA
  - [ ] Test: Query "What is LCAA?" → Routes to existing Hub
  - [ ] Test: Existing queries still work unchanged

**Implementation** (non-invasive):
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, tier } = body;

  // ALMA routing layer (NON-INVASIVE)
  const almaIntent = detectALMAIntent(query);

  if (almaIntent.isALMAQuery && almaIntent.vertical) {
    // Route to ALMA pipeline
    return await handleALMAQuery(body, almaIntent);
  }

  // OTHERWISE, continue with existing RAG flow (UNCHANGED)
  const response = await unifiedRAG.ask({
    query,
    tier: tier || 'deep',
    topK: 10,
    minSimilarity: 0.7,
    includeSources: true
  });

  return NextResponse.json(response);
}

async function handleALMAQuery(body: any, intent: ALMAIntent) {
  const { query } = body;

  // 1. Query ALMA namespace in vector DB
  const namespace = `alma:${intent.vertical}:public`; // Start with public, expand to community if needed
  const results = await queryVectorDB(query, { namespace, topK: 10 });

  // 2. Fetch full Airtable records for top results
  const interventions = await fetchAirtableRecords(results.map(r => r.id));

  // 3. Check governance for each
  const governed = await Promise.all(
    interventions.map(i => checkGovernance(i, 'query'))
  );

  // 4. Filter to allowed only
  const allowed = governed.filter(g => g.allowed);

  // 5. Generate answer with Claude + ALMA context
  const answer = await generateALMAAnswer(query, allowed, intent);

  // 6. Return with governance metadata
  return NextResponse.json({
    answer: answer.text,
    sources: allowed.map(a => ({
      title: a.intervention.name,
      type: a.intervention.type,
      evidenceLevel: a.intervention.evidenceLevel,
      contributors: a.intervention.contributors,
      consentTier: a.intervention.consentLevel
    })),
    governance: {
      totalFound: interventions.length,
      allowed: allowed.length,
      blocked: interventions.length - allowed.length,
      namespace
    },
    cost: answer.cost,
    tier: 'alma'
  });
}
```

---

#### Ticket 4.1.2: ALMA Mode Toggle in UI
- **Status**: To Do
- **Effort**: 2 hours
- **File**: `/Users/benknight/Code/act-regenerative-studio/src/components/AskACT.tsx` (modify)
- **Acceptance Criteria**:
  - [ ] Add toggle: "ALMA Mode (Youth Justice)" - default OFF
  - [ ] When ON, sends `almaMode: true` to API
  - [ ] Shows governance metadata in response
  - [ ] Test: Toggle ON → Query "diversion programs" → Returns ALMA results
  - [ ] Test: Toggle OFF → Query "What is LCAA?" → Returns Hub results

---

### Epic 4.2: JusticeHub Publication Workflow

**Tickets**:

#### Ticket 4.2.1: JusticeHub Replication Pack Generator
- **Status**: To Do
- **Effort**: 4 hours
- **File**: `/Users/benknight/act-global-infrastructure/scripts/publish-to-justicehub.mjs`
- **Acceptance Criteria**:
  - [ ] CLI: `npm run alma:publish-justicehub --intervention-id=xxx`
  - [ ] Checks governance: reviewStatus === 'Approved'
  - [ ] Generates replication pack markdown:
    - Intervention overview
    - Evidence summary
    - Success factors
    - Implementation guide
    - Risks and mitigations
    - Contact information
  - [ ] Creates Softr page in JusticeHub (Airtable + Softr integration)
  - [ ] Logs publication in consent ledger
  - [ ] Test: Publish 1 approved intervention

**Replication pack template**:
```markdown
# {Intervention Name}

**Type**: {type}
**Target Cohort**: {cohort}
**Evidence Level**: {evidenceLevel}
**Geography**: {geography}

## Overview

{description}

## What It Does

{intended outcomes}

## Evidence

{evidence summary from linked evidence records}

## Success Factors

- Factor 1
- Factor 2
...

## Implementation Guide

### Prerequisites
- ...

### Steps
1. ...
2. ...

### Resources Needed
- ...

## Risks and Mitigations

{risks}

Mitigations:
- ...

## Cultural Considerations

{culturalAuthority context}

## Contact

{operatingOrganization} - {contactPerson}

## Attribution

This replication pack was contributed by: {contributors}

Used with permission. Consent tier: {consentLevel}
```

---

## Ongoing: Maintenance and Expansion

### Monitoring (Automated via GitHub Actions)

**Daily**:
- Check consent expiry (renew or downgrade)
- Audit access logs for anomalies
- Calculate revenue share (quarterly, but track daily)

**Weekly**:
- Review new interventions in Draft status
- Flag interventions needing community review
- Check for governance violations

**Monthly**:
- Generate updated Intelligence Pack
- Send to funder subscribers
- Distribute revenue share to contributors

---

## Summary: 6-Week Timeline

| **Week** | **Epic** | **Hours** | **Deliverables** |
|----------|----------|-----------|------------------|
| 1 | Foundation Docs | 7h | Charter ✅, Ontology ✅, Data Posture ✅, Governance Rules, Airtable setup, Consent ledger |
| 2-3 | Ingestion + Extraction | 14h | Document ingestion service, CLI tool, Extraction service, Test with 3 reports |
| 4-5 | Portfolio Analytics | 12h | Signal calculator, Portfolio constructor, First Intelligence Pack |
| 6 | Integration + Publication | 9h | Query routing, UI toggle, JusticeHub publisher, First replication pack |
| **Total** | | **42h** | **ALMA operational as layered capability** |

---

## Acceptance Criteria: System Complete

**Week 6 Complete When**:

- ✅ All documentation complete and published
- ✅ Airtable base created with 10+ test interventions
- ✅ Consent ledger operational with sample records
- ✅ Can ingest youth justice documents via CLI
- ✅ Can extract interventions to Airtable automatically
- ✅ Can calculate portfolio signals for interventions
- ✅ Can generate Intelligence Pack with recommendations
- ✅ Query routing works (ALMA vs Hub)
- ✅ UI toggle for ALMA mode functional
- ✅ Can publish approved intervention to JusticeHub
- ✅ Governance gates enforced (consent checked, logs created)
- ✅ Revenue share tracking enabled
- ✅ Existing Intelligence Hub behavior unchanged (critical!)

---

## Post-Week 6: Next Verticals

**Clone for**:
- Family violence (Week 7-12)
- Housing/homelessness (Week 13-18)
- Disability justice (Week 19-24)

**Process**: Duplicate ontology, customize fields, repeat build

---

**End of 6-Week Build Backlog**

ALMA will be operational as a governed, community-owned, evidence-driven intelligence layer for youth justice, integrated with JusticeHub and Empathy Ledger, running parallel to (not replacing) the existing ACT Intelligence Hub.

