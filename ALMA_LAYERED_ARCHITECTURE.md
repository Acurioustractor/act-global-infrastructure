# ALMA as a Layer - Nuanced Architecture

**Date**: December 31, 2025

---

## Core Principle: ALMA is a Lens, Not a Replacement

ALMA doesn't replace your Intelligence Hub. It's a **specialized lens** that sits on top, adding:
- Domain-specific intelligence (youth justice, family violence, etc.)
- Governance constraints (consent, authority, provenance)
- Portfolio reasoning (what to fund, what to learn)
- Community accountability (not just efficiency)

**Your existing system continues to work exactly as it does now.**

---

## Current System (Keep As-Is)

```
User Query → /api/v1/ask → RAG Service → Vector DB
                                        ↓
                            Answer + Sources + Confidence
```

**This handles**:
- ACT internal knowledge (LCAA, operations, workflows)
- Partner/grant tracking (from GHL)
- GitHub project management
- General Q&A

**Don't touch this.** It's working.

---

## ALMA Layer (Add On Top)

```
User Query → ALMA Router → Is this an ALMA query?
                           │
                           ├─ NO → /api/v1/ask (existing)
                           │
                           └─ YES → ALMA Pipeline
                                    │
                                    ├─ Governance Check
                                    ├─ Domain Filter (youth justice, etc.)
                                    ├─ RAG Retrieval (reuse existing)
                                    ├─ Portfolio Reasoning (new)
                                    └─ Accountable Response
```

**This handles**:
- "What youth justice interventions work in X context?"
- "Show me underfunded evidence-backed programs"
- "What's the risk profile of intervention Y?"
- "Generate portfolio recommendations for funder Z"

---

## Nuanced Integration Points

### 1. Query Routing (Smart, Not Invasive)

**File**: `/Users/benknight/Code/act-regenerative-studio/src/app/api/v1/ask/route.ts`

**Add at the top of your existing handler**:

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, tier } = body;

  // ALMA routing layer (non-invasive)
  const almaIntent = detectALMAIntent(query);

  if (almaIntent.isALMAQuery && almaIntent.vertical) {
    // Route to ALMA pipeline
    return await handleALMAQuery(body, almaIntent);
  }

  // Otherwise, continue with existing RAG flow
  // [Your existing code unchanged]
  const response = await unifiedRAG.ask({...});
  return NextResponse.json(response);
}

function detectALMAIntent(query: string) {
  // Simple heuristics - no ML needed
  const lowerQuery = query.toLowerCase();

  // Domain signals
  const verticals = {
    youthJustice: ['youth justice', 'juvenile', 'diversion', 'detention', 'young people'],
    familyViolence: ['family violence', 'domestic violence', 'dv', 'safety'],
    housing: ['housing', 'homelessness', 'accommodation'],
  };

  // Action signals
  const almaActions = [
    'intervention', 'evidence', 'portfolio', 'recommend', 'fund',
    'risk', 'outcome', 'replicate', 'what works', 'underfunded'
  ];

  const hasVertical = Object.entries(verticals).find(([key, terms]) =>
    terms.some(term => lowerQuery.includes(term))
  );

  const hasAction = almaActions.some(action => lowerQuery.includes(action));

  return {
    isALMAQuery: hasVertical && hasAction,
    vertical: hasVertical ? hasVertical[0] : null,
    confidence: (hasVertical && hasAction) ? 'high' : 'low'
  };
}
```

**Result**:
- "What's the LCAA methodology?" → Existing RAG (unchanged)
- "What youth justice interventions work for diversion?" → ALMA pipeline
- Zero disruption to current functionality

---

### 2. Governance as Middleware (Not a Gatekeeper)

**Don't block existing queries.** Apply governance only to:
1. ALMA-specific actions (publish to JusticeHub, generate funder report)
2. Queries touching sensitive verticals (youth justice, family violence)
3. Knowledge contribution/ingestion

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/governance-middleware.ts`

```typescript
export class GovernanceMiddleware {
  // PASSIVE mode for queries (log, don't block)
  async checkQueryAccess(query: string, vertical: string): Promise<GovernanceLog> {
    const checks = {
      culturalSafety: this.assessCulturalSafety(query, vertical),
      consentRequired: this.needsConsent(query),
      authorityRequired: this.needsAuthority(query)
    };

    // LOG but don't block queries
    await this.logAccess({
      query,
      vertical,
      checks,
      action: 'query',
      blocked: false
    });

    return { passed: true, warnings: checks, blocked: false };
  }

  // ACTIVE mode for actions (enforce gates)
  async enforceActionGates(action: ALMAAction): Promise<GovernanceCheck> {
    const gates = await Promise.all([
      this.checkAuthority(action.entity),
      this.checkConsent(action.entity, action.type),
      this.checkProvenance(action.entity)
    ]);

    const failed = gates.filter(g => !g.passed);

    if (failed.length > 0) {
      // Block the action, return clear explanation
      return {
        passed: false,
        blocked: true,
        reason: failed.map(f => f.reason).join('; '),
        requiredActions: failed.map(f => f.requiredAction)
      };
    }

    return { passed: true, blocked: false };
  }
}
```

**Two-tier approach**:
- **Queries**: Monitor, log, warn - but don't block
- **Actions** (publish, recommend, export): Enforce gates strictly

---

### 3. Portfolio Intelligence (Additive Analytics)

ALMA's portfolio reasoning **extends** your existing work queue, not replaces it.

**Current Work Queue**:
```
GitHub Issues + GHL Grants + GHL Partners
    ↓
Smart Priority Ranking
    ↓
"What to work on next"
```

**ALMA Portfolio Layer** (parallel, not replacement):
```
Youth Justice Interventions (from docs/Airtable)
    ↓
Portfolio Analytics
    ↓
"What to fund/learn next"
```

**Integration point**: Both feed into a **unified recommendation engine**

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/recommendation-engine.ts`

```typescript
export class ALMARecommendationEngine {
  async generateRecommendations(context: RecommendationContext) {
    // Fetch from existing sources
    const workQueue = await this.getWorkQueue(context.sprint);
    const grants = await this.getUpcomingGrants();
    const partners = await this.getPartnerCheckIns();

    // ALMA-specific: domain interventions
    const interventions = await this.getInterventions(context.vertical);

    // Portfolio reasoning (ALMA's specialty)
    const portfolioView = this.analyzePortfolio({
      interventions,
      grants,
      context: context.vertical
    });

    // Combine operational + strategic
    return {
      operational: {
        nextTask: workQueue[0],
        upcomingDeadlines: grants.filter(g => g.daysUntil < 7)
      },
      strategic: {
        fundingGaps: portfolioView.underfundedHighEvidence,
        learningOpportunities: portfolioView.promisingButUnproven,
        replicationCandidates: portfolioView.readyToScale
      },
      integrated: this.rankCombined(workQueue, portfolioView)
    };
  }

  analyzePortfolio(input: PortfolioInput) {
    // This is where quant methods live
    const signals = input.interventions.map(i => ({
      intervention: i,
      evidenceStrength: this.scoreEvidence(i),
      communityAuthority: this.scoreAuthority(i),
      culturalFit: this.scoreCulturalFit(i),
      costEffectiveness: this.scoreCost(i),
      harmRisk: this.scoreHarmRisk(i),
      learningValue: this.scoreLearningPotential(i),
      fundingGap: this.calculateFundingGap(i)
    }));

    // Portfolio construction rules
    return {
      underfundedHighEvidence: signals
        .filter(s => s.evidenceStrength > 0.7 && s.fundingGap > 0.5)
        .sort((a, b) => b.evidenceStrength - a.evidenceStrength),

      promisingButUnproven: signals
        .filter(s => s.evidenceStrength < 0.5 && s.learningValue > 0.6)
        .sort((a, b) => b.learningValue - a.learningValue),

      readyToScale: signals
        .filter(s => s.evidenceStrength > 0.8 && s.communityAuthority > 0.7)
        .sort((a, b) => (b.evidenceStrength + b.communityAuthority) - (a.evidenceStrength + a.communityAuthority))
    };
  }
}
```

**Key**: This runs **alongside** your work queue, not instead of it.

---

### 4. Knowledge Ingestion (Selective Enhancement)

Don't change your existing knowledge ingestion. **Add a parallel ALMA stream** for domain docs.

**Current Ingestion** (keep as-is):
```
Daily Knowledge Sync:
  ├─ ACT Core Docs (LCAA, operations)
  ├─ GitHub Issues
  ├─ GHL Partners/Grants
  └─ Codebase scanning
      ↓
  Vector DB (6,443+ lines)
```

**ALMA Ingestion** (new parallel stream):
```
ALMA Document Stream:
  ├─ Youth justice reports (PDFs, submissions)
  ├─ Evaluation studies
  ├─ Community workshop notes (with consent)
  └─ Service model documentation
      ↓
  ALMA Vector Store (separate index)
      ↓
  Structured Extraction → Airtable
```

**File**: `/Users/benknight/Code/act-regenerative-studio/src/lib/alma/domain-ingestion.ts`

```typescript
export class ALMADomainIngestion {
  async ingestDocument(file: File, metadata: ALMAMetadata) {
    // Governance check BEFORE ingestion
    const governanceCheck = await this.governance.checkIngestion(metadata);
    if (!governanceCheck.passed) {
      throw new GovernanceViolation(governanceCheck.reason);
    }

    // Extract and chunk (reuse existing utilities)
    const text = await this.extractText(file);
    const chunks = await this.chunkText(text); // reuse from existing system

    // ALMA-specific: structured extraction
    const entities = await this.extractEntities(chunks, metadata.vertical);

    // Dual storage:
    // 1. Vector DB (for retrieval) - use existing infrastructure
    await this.storeEmbeddings(chunks, {
      ...metadata,
      namespace: `alma:${metadata.vertical}` // separate from main KB
    });

    // 2. Structured DB (for analytics) - ALMA-specific
    await this.storeStructured(entities, metadata);

    // Provenance ledger
    await this.recordProvenance({
      documentId: file.name,
      source: metadata.source,
      ingestedBy: metadata.contributor,
      consentStatus: metadata.consentStatus,
      authorityHolder: metadata.authorityHolder,
      timestamp: new Date()
    });

    return {
      documentId: this.generateId(),
      chunksCreated: chunks.length,
      entitiesExtracted: entities.length,
      governanceFlags: governanceCheck.warnings
    };
  }

  async extractEntities(chunks: TextChunk[], vertical: string) {
    // Load vertical-specific schema
    const schema = await this.loadSchema(vertical); // youth-justice-schema.json

    // Use LLM to extract (reuse existing AI providers)
    const extraction = await this.llm.extract({
      chunks,
      schema,
      instructions: `Extract interventions, evidence, and outcomes according to the schema.
                    Flag any content requiring community authority or consent review.`
    });

    return extraction.entities;
  }
}
```

**Result**:
- Your existing KB continues unchanged
- ALMA docs go into separate namespace
- Both are searchable, but ALMA adds structure

---

### 5. Web UI Enhancement (Non-Disruptive)

Don't change the existing `/ask` page. **Add ALMA as a tab or mode.**

**Current**: `/ask` → General Q&A interface

**Enhanced**: `/ask` → General Q&A (default) + ALMA Mode (opt-in)

**File**: `/Users/benknight/Code/act-regenerative-studio/src/components/AskACT.tsx`

```typescript
// Add to existing component state
const [mode, setMode] = useState<'general' | 'alma'>('general');
const [vertical, setVertical] = useState<string | null>(null);

// In the UI (add before existing query input)
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setMode('general')}
    className={mode === 'general' ? 'active' : 'inactive'}
  >
    General Q&A
  </button>
  <button
    onClick={() => setMode('alma')}
    className={mode === 'alma' ? 'active' : 'inactive'}
  >
    ALMA Intelligence
  </button>
</div>

{mode === 'alma' && (
  <select
    value={vertical || ''}
    onChange={(e) => setVertical(e.target.value)}
    className="mb-2"
  >
    <option value="">Select Domain...</option>
    <option value="youth_justice">Youth Justice</option>
    <option value="family_violence">Family Violence</option>
    <option value="housing">Housing</option>
  </select>
)}

// Modify query handler
async function handleAsk() {
  const endpoint = mode === 'alma' ? '/api/v1/alma' : '/api/v1/ask';

  const body = mode === 'alma'
    ? { query, vertical, action: 'retrieve', tier }
    : { query, tier, includeSources: showSources };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // ... rest unchanged
}
```

**User experience**:
- Default mode: Works exactly as before
- ALMA mode: Domain-specific intelligence with governance context
- Easy toggle, no disruption

---

### 6. Data Model (Layered, Not Merged)

**Current Data** (keep separate):
```
Intelligence Hub:
  ├─ Vector DB (ACT core knowledge)
  ├─ Notion (Partners, Grants)
  └─ GitHub (Issues, Projects)
```

**ALMA Data** (parallel layer):
```
ALMA Layer:
  ├─ Vector DB (domain docs, separate namespace)
  ├─ Airtable (structured entities)
  │   ├─ Interventions
  │   ├─ Evidence
  │   ├─ Outcomes
  │   └─ Contexts
  └─ Governance Ledger
      ├─ Consent records
      ├─ Authority holders
      ├─ Provenance tracking
      └─ Access logs
```

**Cross-references** (not duplication):
```
ALMA Intervention ──references──> Intelligence Hub Partner
ALMA Evidence ──references──> Intelligence Hub Grant
```

**File**: `/Users/benknight/act-global-infrastructure/config/alma-data-model.json`

```json
{
  "dataSeparation": {
    "intelligenceHub": {
      "purpose": "Operational knowledge, partner/grant tracking",
      "storage": "Vector DB + Notion",
      "access": "General (internal team)"
    },
    "almaLayer": {
      "purpose": "Domain intelligence, evidence synthesis, portfolio analytics",
      "storage": "Vector DB (namespaced) + Airtable + Governance Ledger",
      "access": "Domain-specific (governed)"
    }
  },
  "crossReferences": {
    "enabled": true,
    "bidirectional": false,
    "examples": [
      "ALMA intervention links to Hub partner (who implements it)",
      "ALMA evidence links to Hub grant (who funded the study)"
    ]
  },
  "namespacing": {
    "vectorDB": {
      "hub": "namespace: default",
      "alma": "namespace: alma:{vertical} (e.g., alma:youth_justice)"
    },
    "queryRouting": {
      "general": "search namespace: default",
      "alma": "search namespace: alma:{vertical}"
    }
  }
}
```

---

## Implementation Phases (Nuanced)

### Phase 0: Foundation (Week 1) - Documentation Only

**No code changes. Just define the model.**

- [ ] ALMA Charter (2 pages)
- [ ] Youth Justice Ontology v0.1 (JSON schema)
- [ ] Data Posture Statement
- [ ] Governance Rules
- [ ] Namespacing Strategy

**Deliverable**: Clear documentation that can be reviewed/approved without touching production.

---

### Phase 1: Minimal Viable Layer (Weeks 2-4) - Additive Only

**Add ALMA routing, don't touch existing flows.**

**Week 2**:
- [ ] Add `detectALMAIntent()` to `/api/v1/ask` (non-breaking)
- [ ] Create `/api/v1/alma` endpoint (parallel)
- [ ] Test: Existing queries still work identically

**Week 3**:
- [ ] Build ALMA ingestion pipeline (separate from main KB)
- [ ] Set up Airtable with youth justice schema
- [ ] Ingest 3-5 test documents
- [ ] Test: Main KB unaffected

**Week 4**:
- [ ] Build governance middleware
- [ ] Add ALMA mode toggle to UI (optional, not default)
- [ ] Test: Default UI behavior unchanged

**Deliverable**: ALMA layer exists but is opt-in, zero impact on current operations.

---

### Phase 2: Portfolio Intelligence (Weeks 5-7) - Parallel Analytics

**Build portfolio analytics that runs alongside work queue.**

**Week 5**:
- [ ] Build signal calculator (evidence, authority, cost, risk)
- [ ] Build portfolio analyzer
- [ ] Test with synthetic data

**Week 6**:
- [ ] Integrate with real Airtable data
- [ ] Generate first portfolio view
- [ ] Test: Work queue still operates independently

**Week 7**:
- [ ] Create funder report template
- [ ] Generate first Youth Justice Intelligence Pack
- [ ] Test: Can be run on-demand without affecting other systems

**Deliverable**: Portfolio analytics capability, callable via API or CLI, doesn't auto-run.

---

### Phase 3: Integration (Weeks 8-10) - Thoughtful Merging

**Only after Phase 1-2 are stable, carefully integrate.**

**Week 8**:
- [ ] Add ALMA recommendations to work queue display (as separate section)
- [ ] Test: Original work queue unchanged, ALMA adds context

**Week 9**:
- [ ] Add ALMA context to partner pages (e.g., "Implements intervention X")
- [ ] Test: Partner pages still work, ALMA adds value

**Week 10**:
- [ ] Add ALMA intelligence to grant tracking (e.g., "Evidence level: High")
- [ ] Test: Grant tracking still works, ALMA enriches it

**Deliverable**: ALMA enhances existing systems without replacing them.

---

## Key Design Principles

### 1. Parallel, Not Replacement
- ALMA runs alongside existing systems
- Two query paths: general (existing) + domain (ALMA)
- Data in separate namespaces

### 2. Opt-In, Not Default
- Default behavior unchanged
- ALMA mode requires explicit selection
- Gradual rollout, user-controlled

### 3. Governance as Service, Not Gatekeeper
- Passive monitoring for queries
- Active enforcement only for actions (publish, export)
- Clear feedback, not silent blocking

### 4. Additive Analytics
- Work queue continues as-is
- Portfolio view adds strategic layer
- Both are useful, neither replaces the other

### 5. Clear Boundaries
- Intelligence Hub: Operational (what's happening now)
- ALMA: Strategic (what should happen next, based on evidence)
- Cross-reference where valuable

---

## What This Means Practically

### For Current Users

**Nothing changes unless they choose ALMA mode:**
- `/ask` works exactly the same
- Work queue shows same results
- Partner/grant tracking unchanged
- All existing scripts/APIs work

**ALMA is available when needed:**
- Toggle "ALMA Intelligence" mode
- Select domain (youth justice, etc.)
- Get evidence-based recommendations
- See governance context

### For ALMA Use Cases

**Domain experts get specialized tools:**
- "What youth justice interventions work in rural Victoria?" → ALMA
- "Show me underfunded evidence-backed programs" → ALMA portfolio view
- "Generate funder diligence brief for program X" → ALMA report

**But they can still use general tools:**
- "What's the LCAA methodology?" → Regular RAG (unchanged)
- "Who are our partners in Queensland?" → Regular query (unchanged)

### For System Administrators

**Two parallel systems to maintain:**
- Intelligence Hub (existing)
- ALMA Layer (new)

**But with clear separation:**
- Different namespaces
- Different databases (Vector DB namespaced, Airtable separate)
- Different access patterns

**Shared infrastructure:**
- Same AI providers
- Same embedding service
- Same hosting

---

## Technical Debt Prevention

### Anti-Patterns to Avoid

❌ **Merging ALMA into main RAG pipeline**
- Creates complexity
- Hard to maintain governance
- Difficult to debug

✅ **Keep separate query paths**
- Clear responsibilities
- Easy to test
- Independent scaling

❌ **Single namespace for all data**
- General queries polluted with domain docs
- Hard to apply domain-specific rules
- Consent/authority unclear

✅ **Namespaced data model**
- Clean separation
- Domain-specific governance
- Clear data lineage

❌ **Mandatory ALMA for all queries**
- Breaking change
- User confusion
- Performance impact

✅ **Opt-in ALMA mode**
- Backward compatible
- User choice
- Gradual adoption

---

## Success Metrics

### Phase 1 (Weeks 1-4)
- [ ] Zero regression in existing query performance
- [ ] Zero user complaints about changed behavior
- [ ] ALMA endpoint responds to test queries
- [ ] Governance middleware logs (doesn't block) queries

### Phase 2 (Weeks 5-7)
- [ ] First portfolio report generated
- [ ] 10+ interventions extracted and structured
- [ ] Portfolio analytics run without errors
- [ ] Zero impact on work queue performance

### Phase 3 (Weeks 8-10)
- [ ] ALMA context visible in partner pages
- [ ] Work queue shows both operational + strategic
- [ ] Users opt into ALMA mode >5 times/week
- [ ] Zero breaking changes to existing workflows

---

## Migration Path (If Needed Later)

If ALMA proves valuable and you want tighter integration:

**Option 1: Gradual Merge**
- Move high-value ALMA features into main query path
- Keep governance layer separate
- Deprecate ALMA mode toggle

**Option 2: ALMA as Default**
- Make ALMA intent detection automatic
- Keep general mode as fallback
- Seamless user experience

**Option 3: Unified Intelligence**
- Single query interface
- ALMA logic embedded throughout
- Transparent to users

**But start separated.** Easy to merge later, hard to separate once merged.

---

## Next Steps

**Immediate (This Week)**:
1. Review this layered architecture
2. Confirm separation approach
3. Approve Phase 0 documentation

**Week 1-2**:
1. Write ALMA Charter + Ontology (no code)
2. Design namespace strategy
3. Plan governance middleware API

**Week 3-4**:
1. Build parallel `/api/v1/alma` endpoint
2. Add intent detection to existing `/api/v1/ask`
3. Test: existing behavior unchanged

**Then reassess** before Phase 2.

---

**This is a lens, not a rebuild.**

ALMA adds capability without disrupting what works. Your Intelligence Hub continues doing what it does well (operational intelligence), and ALMA adds a strategic layer for domain-specific decisions.

Ready to proceed with this nuanced approach?

