# ALMA Data Posture Statement

**Version**: 1.0
**Date**: December 31, 2025
**Status**: Foundation Document

---

## Core Principle

**Default Private, Explicit Consent to Share**

ALMA operates on the principle that all knowledge contributions are private by default. Movement from private to community commons to public requires explicit, informed consent from contributors and cultural authority holders.

---

## Three-Tier Data Classification

### Tier 1: Strictly Private (Node-Only Access)

**What it includes**:
- Lived experience stories and testimonies
- Community deliberation notes and internal discussions
- Sensitive cultural knowledge and protocols
- Individual-level data (names, identifying details)
- Draft work and in-progress research
- Proprietary program materials under development

**Storage**:
- Vector DB namespace: `alma:{vertical}:private`
- Airtable: Private views, restricted access
- Consent ledger: Usage = "Internal node access only"

**Access controls**:
- Node staff only (no external sharing)
- No aggregation across nodes without explicit consent
- No AI training or fine-tuning
- No export to external systems
- No publication to JusticeHub or Empathy Ledger

**Technical enforcement**:
```typescript
// Database constraint
consentLevel === 'Strictly Private'
  → namespace = 'alma:{vertical}:private'
  → access = ['node_staff']
  → export_blocked = true
  → training_blocked = true
  → publish_blocked = true
```

**Revenue model**: Not applicable (not commercially used)

**Rationale**: Protects vulnerable community members, respects cultural protocols, enables safe deliberation spaces.

---

### Tier 2: Community Controlled (Governed Access)

**What it includes**:
- Case studies and program evaluations (anonymized)
- Local context notes and implementation learnings
- Community-endorsed interventions and practices
- Cultural adaptations of existing models
- Partnership and collaboration details
- Success factors and replication considerations

**Storage**:
- Vector DB namespace: `alma:{vertical}:community`
- Airtable: Shared views with community review workflow
- Consent ledger: Usage = "Query with attribution, publish requires approval"

**Access controls**:
- Internal query: Allowed (with attribution tracking)
- JusticeHub publication: Requires community approval workflow
- Export to reports: Requires community sign-off
- AI training: Blocked unless explicit "Training (AI)" consent
- External sharing: Case-by-case approval

**Technical enforcement**:
```typescript
// Middleware check before action
if (consentLevel === 'Community Controlled') {
  if (action === 'publish' || action === 'export') {
    // Check approval status
    if (reviewStatus !== 'Approved') {
      return { blocked: true, reason: 'Requires community approval' };
    }
  }
  if (action === 'train' && !permittedUses.includes('Training (AI)')) {
    return { blocked: true, reason: 'AI training not permitted' };
  }
}
```

**Revenue model**:
- If used in funder products (reports, diligence briefs): Contributors receive revenue share
- Attribution tracked in reuse ledger
- Quarterly payments to contributing nodes/individuals

**Rationale**: Respects community ownership while enabling knowledge sharing; ensures communities benefit from their contributions.

---

### Tier 3: Public Knowledge Commons (Open with Attribution)

**What it includes**:
- Published evidence summaries and research synthesis
- Anonymized outcome data and aggregate statistics
- Replication playbooks and how-to guides
- Policy analysis and system-level insights
- Best practice frameworks
- Public evaluation reports

**Storage**:
- Vector DB namespace: `alma:{vertical}:public`
- Airtable: Public views (published to JusticeHub)
- Consent ledger: Usage = "Open query, citation required"

**Access controls**:
- Query: Open (internal and external)
- Publication: Allowed (with attribution)
- Export: Allowed (must cite source)
- AI training: Allowed (attribution preserved)
- Commercial use: Allowed (with revenue share to contributors)

**Technical enforcement**:
```typescript
// Provenance required on all outputs
if (consentLevel === 'Public Knowledge Commons') {
  // Always track usage even if open
  await logUsage({
    entity,
    action,
    destination,
    timestamp,
    attribution: entity.contributors
  });

  // Include provenance in all outputs
  return {
    data: entity,
    attribution: {
      contributors: entity.contributors,
      sources: entity.sourceDocuments,
      citation: generateCitation(entity)
    }
  };
}
```

**Revenue model**:
- Funder products using this knowledge generate revenue
- Contributors receive proportional revenue share based on reuse tracking
- Public acknowledgment in all outputs

**Rationale**: Builds the knowledge commons; accelerates replication; creates feedback loops; compensates contributors.

---

## Consent Lifecycle Management

### 1. Contribution Phase

**Process**:
```
Node/Community submits knowledge
  ↓
Consent form presented:
  □ Who contributed this knowledge?
  □ What cultural authority applies?
  □ What tier: Private / Community / Public?
  □ What uses are permitted?
    □ Query (internal)
    □ Publish (JusticeHub)
    □ Export (reports)
    □ Training (AI)
    □ Commercial
  □ What restrictions apply?
  □ Revenue sharing: Yes / No
  ↓
Contribution accepted only with complete consent record
```

**Technical implementation**:
- Consent form required before ingestion
- Database constraint: Cannot create entity without consent record
- Default tier: "Strictly Private"
- Escalation path: If consent unclear, escalate to community contact

### 2. Storage Phase

**Consent ledger schema**:
```json
{
  "contributionId": "uuid",
  "entityType": "intervention | evidence | context | outcome",
  "entityId": "uuid",
  "contributors": ["Organization Name", "Individual Name"],
  "culturalAuthority": "Elder Council | Community Org | Individual",
  "consentTier": "Strictly Private | Community Controlled | Public Knowledge Commons",
  "permittedUses": ["query", "publish", "export", "train", "commercial"],
  "restrictions": "Free text",
  "consentDate": "ISO date",
  "expiryDate": "ISO date or null",
  "renewalRequired": "boolean",
  "revenueShareEnabled": "boolean"
}
```

**Enforcement**: Middleware checks consent ledger before every action

### 3. Usage Phase

**Query access check**:
```typescript
async function checkQueryAccess(entity, user, action) {
  const consent = await getConsentRecord(entity.id);

  // Tier 1: Strictly Private
  if (consent.consentTier === 'Strictly Private') {
    if (user.nodeId !== entity.nodeId) {
      return { allowed: false, reason: 'Strictly private to originating node' };
    }
  }

  // Tier 2: Community Controlled
  if (consent.consentTier === 'Community Controlled') {
    if (action === 'publish' && entity.reviewStatus !== 'Approved') {
      return { allowed: false, reason: 'Requires community approval' };
    }
  }

  // Tier 3: Public Knowledge Commons
  // Always allowed, but track usage

  // Log access
  await logUsage(entity, user, action);

  return { allowed: true };
}
```

### 4. Tracking Phase

**Reuse ledger**:
```json
{
  "usageId": "uuid",
  "entityId": "uuid",
  "action": "query | publish | export | train | commercial",
  "destination": "JusticeHub | Empathy Ledger | Funder Report | AI Training",
  "user": "user_id",
  "timestamp": "ISO datetime",
  "attribution": ["Contributors"],
  "revenueGenerated": "number or null"
}
```

**Queries logged**:
- Who accessed what knowledge
- When and for what purpose
- Where it was used downstream
- Whether it generated revenue

### 5. Revenue Sharing Phase

**When applicable**:
- Funder products (Intelligence Packs, diligence briefs)
- Consulting services using ALMA knowledge
- API access (if commercialized in future)
- Training/workshop materials

**Calculation**:
```typescript
function calculateRevenueShare(quarterlyRevenue, usageLogs) {
  // 1. Total revenue from funder products
  const totalRevenue = quarterlyRevenue;

  // 2. Platform fee (30% to ACT for operations)
  const platformFee = totalRevenue * 0.30;
  const distributableRevenue = totalRevenue * 0.70;

  // 3. Count contributions by entity
  const contributionCounts = usageLogs.reduce((acc, log) => {
    log.attribution.forEach(contributor => {
      acc[contributor] = (acc[contributor] || 0) + 1;
    });
    return acc;
  }, {});

  // 4. Proportional distribution
  const totalContributions = Object.values(contributionCounts).reduce((a, b) => a + b, 0);

  const shares = Object.entries(contributionCounts).map(([contributor, count]) => ({
    contributor,
    share: (count / totalContributions) * distributableRevenue
  }));

  return shares;
}
```

**Payment process**:
- Quarterly revenue share calculations
- Payment via ACT (not directly to ALMA)
- Transparent reporting to all contributors
- Option to reinvest in node operations or community programs

---

## Data Movement Paths

### Private → Community Controlled

**Trigger**: Node decides knowledge is ready for broader sharing

**Process**:
1. Node staff reviews contribution
2. Confirms cultural authority holder approves
3. Updates consent tier in ledger
4. Moves to community namespace in vector DB
5. Enables community review workflow
6. Notifies relevant stakeholders

**Reversibility**: Can move back to Private if concerns arise

### Community Controlled → Public Knowledge Commons

**Trigger**: Community approval workflow completed, knowledge ready for publication

**Process**:
1. Community review status = "Approved"
2. Cultural authority holder signs off
3. JusticeHub publication drafted
4. Final check by ALMA governance layer
5. Publish to JusticeHub + public namespace
6. Enable revenue sharing tracking

**Reversibility**: Can unpublish and move back to Community Controlled if issues arise

### Public Knowledge Commons → Strictly Private

**Trigger**: Community requests retraction (rare, but must be possible)

**Process**:
1. Community authority holder submits retraction request
2. Immediate removal from JusticeHub
3. Archive in Strictly Private namespace
4. Notify all prior users of retraction
5. Cease all future uses
6. Audit where knowledge was used previously

**Rationale**: Communities must have the right to retract consent

---

## Cross-System Data Boundaries

### Intelligence Hub (Operational Knowledge)

**Scope**: ACT internal operations, partner relationships, grant tracking
**Data classification**: Mostly internal (not governed by ALMA)
**Namespace**: `default` (vector DB)
**Overlap with ALMA**: Partners and grants can link to ALMA interventions

### ALMA Layer (Domain Intelligence)

**Scope**: Youth justice interventions, evidence, community contexts
**Data classification**: Three-tier (Private / Community / Public)
**Namespace**: `alma:youth_justice:{tier}` (vector DB)
**Overlap with Hub**: ALMA queries can reference Hub data (partners, grants)

### JusticeHub (Community Platform)

**Scope**: Public-facing knowledge exchange, replication playbooks
**Data classification**: Public Knowledge Commons only
**Namespace**: Published Airtable views via Softr
**Data source**: ALMA (after community approval workflow)

### Empathy Ledger (Funder Intelligence)

**Scope**: Portfolio analytics, funding recommendations, impact attribution
**Data classification**: Aggregated, not raw (privacy-preserving)
**Namespace**: Empathy Ledger database
**Data source**: ALMA analytics (portfolio signals, gap analysis)

---

## Technical Safeguards

### 1. Namespace Isolation

**Vector DB**:
```sql
-- Strictly Private
INSERT INTO embeddings (namespace, content, metadata)
VALUES ('alma:youth_justice:private', ...)
WHERE user.nodeId = entity.nodeId;

-- Community Controlled
SELECT * FROM embeddings
WHERE namespace = 'alma:youth_justice:community'
AND consent_check(entity.id, user.id, 'query') = true;

-- Public Knowledge Commons
SELECT * FROM embeddings
WHERE namespace = 'alma:youth_justice:public';
-- Always log usage even if open
```

### 2. Consent Middleware

**Every API call**:
```typescript
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/v1/alma')) {
    const { action, entityId } = req.body;
    const consentCheck = await enforceConsentGates(entityId, action, req.user);

    if (!consentCheck.allowed) {
      return res.status(403).json({
        error: 'Consent gate failed',
        reason: consentCheck.reason,
        requiredAction: consentCheck.requiredAction
      });
    }
  }
  next();
});
```

### 3. Provenance Tracking

**All outputs**:
```typescript
function generateALMAResponse(query, results) {
  return {
    answer: synthesizedAnswer,
    sources: results.map(r => ({
      title: r.title,
      contributors: r.contributors,
      consentTier: r.consentTier,
      citation: generateCitation(r)
    })),
    attribution: {
      primaryContributors: extractTopContributors(results),
      communityAuthorities: extractAuthorities(results),
      revenueShareApplies: results.some(r => r.consentTier !== 'Strictly Private')
    },
    governance: {
      culturalSafetyChecked: true,
      consentVerified: true,
      provenanceComplete: true
    }
  };
}
```

### 4. Audit Logging

**All access logged**:
```sql
CREATE TABLE access_audit_log (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50),
  action VARCHAR(50), -- query, publish, export, train
  user_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  consent_tier VARCHAR(50),
  approved BOOLEAN,
  blocked_reason TEXT
);

-- Query for revenue share calculation
SELECT entity_id, COUNT(*) as usage_count
FROM access_audit_log
WHERE action IN ('publish', 'export', 'commercial')
AND approved = true
GROUP BY entity_id;
```

---

## Consent Renewal and Expiry

### Time-Limited Consent

Some knowledge contributions may have time-limited consent:

**Example**: "Allow use for 2 years, then review"

**Technical implementation**:
```typescript
// Daily job checks for expiring consent
async function checkConsentExpiry() {
  const expiring = await db.query(`
    SELECT * FROM consent_ledger
    WHERE expiry_date <= NOW() + INTERVAL '30 days'
    AND renewal_required = true
  `);

  for (const consent of expiring) {
    // Notify contributor
    await sendRenewalRequest(consent.contributors, consent.entityId);

    // If expired and not renewed, downgrade to Strictly Private
    if (consent.expiryDate < new Date()) {
      await downgradeToPrivate(consent.entityId);
    }
  }
}
```

---

## Community Authority Verification

### Who Can Speak for Whom

**Authority holders**:
- Elder councils for cultural practices
- Community organizations for local interventions
- Researchers for their own studies
- Individuals for their lived experience

**Verification process**:
1. On contribution, record cultural authority holder
2. Before publication, verify authority holder approves
3. Store verification in consent ledger
4. Include authority attribution in all outputs

**Escalation**: If authority unclear or contested, pause publication until resolved

---

## Exceptions and Edge Cases

### 1. Aggregated Data

**Question**: Can we publish aggregate statistics from Strictly Private data?

**Answer**: Only with explicit consent. Aggregation does not override privacy.

**Example**: "50% of youth reported positive outcomes" requires consent to publish, even if anonymized.

### 2. Publicly Available Documents

**Question**: If we ingest a published research paper, what's the consent tier?

**Answer**: Public Knowledge Commons (already public). Still track provenance and attribute original authors.

### 3. Cross-Node Collaboration

**Question**: Can VIC node query NSW node's Community Controlled data?

**Answer**: Yes, if permitted uses include "Query (internal)". Usage logged for attribution.

### 4. Emergency Situations

**Question**: What if there's urgent need to share Strictly Private data (e.g., safety concern)?

**Answer**: Manual override by governance committee + immediate notification to contributors + audit trail. Rare exception, not routine.

---

## Accountability Mechanisms

### 1. Quarterly Consent Audits

- Review all consent records for completeness
- Check for expired consents
- Verify cultural authority holders still approve
- Audit access logs for anomalies

### 2. Community Feedback Channels

- Each node has designated contact for consent concerns
- Escalation path: Node → State coordinator → Witta Harvest → Governance committee
- Anonymous reporting option

### 3. Revenue Share Transparency

- Quarterly reports to all contributors showing:
  - Total revenue generated
  - Platform fee breakdown
  - Individual contributor shares
  - Where knowledge was used (attribution)

### 4. Right to Retract

- Contributors can request retraction at any time
- Immediate cessation of use
- Notification to all prior users
- Archive (not delete) for audit trail

---

## Summary: Data Posture in Practice

| **Tier** | **Storage** | **Query** | **Publish** | **AI Training** | **Revenue** |
|----------|-------------|-----------|-------------|-----------------|-------------|
| **Strictly Private** | Private namespace | Node only | Blocked | Blocked | N/A |
| **Community Controlled** | Community namespace | Internal with attribution | Requires approval | Requires explicit consent | Revenue share if used commercially |
| **Public Knowledge Commons** | Public namespace | Open with citation | Allowed with attribution | Allowed | Revenue share if used commercially |

**Default**: Strictly Private
**Movement**: Requires explicit consent
**Revenue**: Contributors compensated when knowledge used commercially
**Accountability**: Audit logs, quarterly reviews, right to retract

---

**ALMA's data posture is not a policy document. It is a technical architecture enforcing community ownership through code.**

