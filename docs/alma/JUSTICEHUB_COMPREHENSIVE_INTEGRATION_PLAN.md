# ALMA + JusticeHub Comprehensive Integration Plan
## From Youth Stories to System Intelligence

**Date**: December 31, 2025
**Version**: 2.0 (Based on Deep Codebase Analysis)
**Status**: Ready to Build

---

## Executive Summary

After comprehensive analysis of the JusticeHub codebase, we've identified a clear integration path that:

1. **Leverages existing strengths**: Profile system, evidence infrastructure, AI/ML capabilities
2. **Fills critical gaps**: Consent management, outcome tracking, context documentation
3. **Extends proven patterns**: Empathy Ledger integration model, AI extraction, JSONB flexibility
4. **Introduces new capabilities**: Portfolio intelligence, horizontal knowledge flows, community governance

**Core Insight**: JusticeHub is already 60% of what ALMA needs. We're not building from scratch—we're extending and connecting existing infrastructure with ALMA's governance and intelligence layer.

---

## Part 1: Architectural Vision

### Current State: JusticeHub as Storytelling + Service Directory

**What JusticeHub Does Today**:
- Youth share stories (lived experience)
- Services/programs are listed and discovered
- Evidence tracked for international programs
- Profiles link people across content
- Empathy Ledger integration for cross-platform identity

**What's Missing for ALMA**:
- **Consent infrastructure**: No consent ledger, no data access tracking
- **Outcome tracking**: Evidence model only on international programs, not Australian
- **Context documentation**: No structured environmental/social/cultural context
- **Longitudinal view**: Can't track youth journeys across interventions
- **Portfolio intelligence**: No systematic analysis of what works, where, for whom

### Future State: JusticeHub + ALMA as Intelligence Commons

**ALMA Adds**:
1. **Governance Layer**: Consent ledger, data access logging, community approval workflows
2. **Intelligence Layer**: Portfolio analytics, context-based recommendations, evidence aggregation
3. **Sensemaking Layer**: Document ingestion → structured extraction → knowledge synthesis
4. **Action Layer**: Funder intelligence packs, replication guides, learning agenda

**Integration Model**: Bidirectional Sync + Shared Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                         ALMA (Global Infrastructure)            │
│  - Document Ingestion                                          │
│  - AI Extraction (Claude)                                      │
│  - Vector DB (Namespace: alma:youth_justice:*)                 │
│  - Portfolio Analytics                                         │
│  - Consent Ledger (Universal)                                  │
│  - Intelligence Pack Generation                                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Bidirectional Sync
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                    JusticeHub (Community Platform)              │
│  - Youth Stories (Lived Experience)                            │
│  - Community Programs (Australian Interventions)               │
│  - Service Directory (Youth Justice Services)                  │
│  - Public Profiles (People)                                    │
│  - International Programs (Evidence Base)                      │
│  - Centre of Excellence (Best Practices)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Principle**: ALMA doesn't replace JusticeHub—it augments it with:
- Consent governance for sensitive data
- Structured intervention/outcome tracking
- Portfolio intelligence for funders
- Horizontal knowledge flows across nodes

---

## Part 2: Database Schema Integration

### Strategy: Extend, Don't Replace

**Approach**:
1. Add ALMA foreign key fields to existing tables
2. Create new ALMA-specific tables for missing entities
3. Link bidirectionally (JusticeHub ↔ ALMA)
4. Use JSONB for flexible metadata evolution
5. Extend existing RLS patterns to ALMA tables

### 2.1 Extend Existing Tables (Minimal Disruption)

#### A. Add ALMA Links to `public_profiles`

```sql
-- Migration: 20250201000001_add_alma_profile_links.sql

ALTER TABLE public_profiles
  ADD COLUMN alma_subject_id UUID,
  ADD COLUMN alma_consent_status TEXT CHECK (alma_consent_status IN (
    'not_requested', 'pending', 'granted', 'denied', 'withdrawn'
  )),
  ADD COLUMN alma_sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN alma_last_sync_at TIMESTAMPTZ,
  ADD COLUMN alma_metadata JSONB DEFAULT '{}'::JSONB;

CREATE INDEX idx_public_profiles_alma_subject_id
  ON public_profiles(alma_subject_id)
  WHERE alma_subject_id IS NOT NULL;

COMMENT ON COLUMN public_profiles.alma_subject_id IS
  'Links to ALMA subject for longitudinal outcome tracking and research';
COMMENT ON COLUMN public_profiles.alma_consent_status IS
  'Consent status for ALMA data collection and research';
```

**Why This Works**:
- Non-breaking: Existing profiles continue functioning
- Opt-in: `alma_sync_enabled` defaults to FALSE
- Flexible: `alma_metadata` allows schema evolution
- Traceable: `alma_last_sync_at` for debugging

#### B. Add ALMA Links to `community_programs`

```sql
-- Migration: 20250201000002_add_alma_intervention_links.sql

ALTER TABLE community_programs
  ADD COLUMN alma_intervention_id UUID,
  ADD COLUMN alma_evidence_level TEXT CHECK (alma_evidence_level IN (
    'Promising (community-endorsed, emerging evidence)',
    'Effective (strong evaluation, positive outcomes)',
    'Proven (RCT/quasi-experimental, replicated)',
    'Indigenous-led (culturally grounded, community authority)',
    'Untested (theory/pilot stage)'
  )),
  ADD COLUMN alma_harm_risk_level TEXT CHECK (alma_harm_risk_level IN (
    'Low', 'Medium', 'High', 'Requires cultural review'
  )),
  ADD COLUMN alma_cultural_authority TEXT,
  ADD COLUMN alma_consent_level TEXT DEFAULT 'Strictly Private' CHECK (alma_consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),
  ADD COLUMN alma_portfolio_score NUMERIC,
  ADD COLUMN alma_last_sync_at TIMESTAMPTZ,
  ADD COLUMN alma_metadata JSONB DEFAULT '{}'::JSONB;

CREATE INDEX idx_community_programs_alma_intervention_id
  ON community_programs(alma_intervention_id)
  WHERE alma_intervention_id IS NOT NULL;

CREATE INDEX idx_community_programs_alma_consent_level
  ON community_programs(alma_consent_level);

CREATE INDEX idx_community_programs_alma_evidence_level
  ON community_programs(alma_evidence_level)
  WHERE alma_evidence_level IS NOT NULL;

COMMENT ON COLUMN community_programs.alma_intervention_id IS
  'Links to ALMA intervention entity for evidence, context, and portfolio analytics';
COMMENT ON COLUMN community_programs.alma_cultural_authority IS
  'Who holds authority over this intervention (Elder council, community org, etc.)';
COMMENT ON COLUMN community_programs.alma_portfolio_score IS
  'Calculated portfolio intelligence score (0-1) based on evidence, authority, harm risk, capability, option value';
```

**Why This Works**:
- Brings ALMA governance to existing programs
- Portfolio scoring available immediately
- Consent controls without disrupting current workflow
- Evidence levels compatible with international_programs enum

#### C. Add ALMA Links to `services`

```sql
-- Migration: 20250201000003_add_alma_service_links.sql

ALTER TABLE services
  ADD COLUMN alma_intervention_id UUID,
  ADD COLUMN alma_evidence_level TEXT CHECK (alma_evidence_level IN (
    'Promising (community-endorsed, emerging evidence)',
    'Effective (strong evaluation, positive outcomes)',
    'Proven (RCT/quasi-experimental, replicated)',
    'Indigenous-led (culturally grounded, community authority)',
    'Untested (theory/pilot stage)'
  )),
  ADD COLUMN alma_consent_level TEXT DEFAULT 'Public Knowledge Commons' CHECK (alma_consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),
  ADD COLUMN alma_last_sync_at TIMESTAMPTZ,
  ADD COLUMN alma_metadata JSONB DEFAULT '{}'::JSONB;

CREATE INDEX idx_services_alma_intervention_id
  ON services(alma_intervention_id)
  WHERE alma_intervention_id IS NOT NULL;

COMMENT ON COLUMN services.alma_intervention_id IS
  'Links to ALMA intervention for evidence and outcome tracking';
```

**Why This Works**:
- Services are typically public (default: Public Knowledge Commons)
- Can track evidence for service-based interventions
- Links service directory to portfolio intelligence

#### D. Add ALMA Context to `stories`

```sql
-- Migration: 20250201000004_add_alma_story_context.sql

ALTER TABLE stories
  ADD COLUMN alma_evidence_id UUID,
  ADD COLUMN alma_contribution_type TEXT CHECK (alma_contribution_type IN (
    'lived_experience',
    'program_feedback',
    'outcome_report',
    'cultural_knowledge',
    'system_navigation'
  )),
  ADD COLUMN alma_intervention_references UUID[],
  ADD COLUMN alma_consent_research BOOLEAN DEFAULT FALSE,
  ADD COLUMN alma_metadata JSONB DEFAULT '{}'::JSONB;

CREATE INDEX idx_stories_alma_evidence_id
  ON stories(alma_evidence_id)
  WHERE alma_evidence_id IS NOT NULL;

CREATE INDEX idx_stories_alma_intervention_references
  ON stories USING gin(alma_intervention_references);

COMMENT ON COLUMN stories.alma_evidence_id IS
  'Links story to ALMA evidence entity (stories as lived experience evidence)';
COMMENT ON COLUMN stories.alma_consent_research IS
  'Youth consent for story to be used in research/evidence synthesis';
```

**Why This Works**:
- Stories become research data (with consent)
- Can link stories to interventions they reference
- Lived experience as evidence type in ALMA ontology

### 2.2 Create New ALMA Tables (Missing Entities)

#### A. Consent Management System (CRITICAL GAP)

```sql
-- Migration: 20250201000005_create_alma_consent_system.sql

-- Consent records table
CREATE TABLE alma_consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Subject (polymorphic - could be profile, story, program, etc.)
  subject_type TEXT NOT NULL CHECK (subject_type IN (
    'profile', 'story', 'program', 'service', 'organization', 'intervention'
  )),
  subject_id UUID NOT NULL,

  -- Consent details
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_collection',         -- Can collect data about this person/program
    'data_sharing_internal',   -- Can share within JusticeHub/ALMA
    'data_sharing_research',   -- Can use in research
    'data_sharing_public',     -- Can publish publicly
    'outcome_tracking',        -- Can track outcomes over time
    'profile_linking',         -- Can link across platforms (Empathy Ledger)
    'story_attribution',       -- Can attribute story to real identity
    'ai_training'              -- Can use in AI model training
  )),

  granted BOOLEAN NOT NULL,

  -- Version tracking (for consent form changes)
  consent_version TEXT NOT NULL DEFAULT '1.0',

  -- Temporal
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = no expiration
  withdrawn_at TIMESTAMPTZ,

  -- Context
  granted_by UUID REFERENCES auth.users(id), -- User who granted consent
  withdrawn_by UUID REFERENCES auth.users(id),
  withdrawal_reason TEXT,

  -- Cultural authority (for community-controlled data)
  cultural_authority TEXT,
  community_approval_required BOOLEAN DEFAULT FALSE,
  community_approved_at TIMESTAMPTZ,
  community_approved_by UUID REFERENCES auth.users(id),

  -- Metadata
  context JSONB DEFAULT '{}'::JSONB,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alma_consent_subject ON alma_consent_records(subject_type, subject_id);
CREATE INDEX idx_alma_consent_type ON alma_consent_records(consent_type);
CREATE INDEX idx_alma_consent_granted ON alma_consent_records(granted);
CREATE INDEX idx_alma_consent_expires ON alma_consent_records(expires_at)
  WHERE expires_at IS NOT NULL AND withdrawn_at IS NULL;
CREATE INDEX idx_alma_consent_granted_by ON alma_consent_records(granted_by);

-- Auto-update updated_at
CREATE TRIGGER set_alma_consent_updated_at
  BEFORE UPDATE ON alma_consent_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Data access log (audit trail)
CREATE TABLE alma_data_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was accessed
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,

  -- Who accessed it
  accessed_by UUID REFERENCES auth.users(id),
  access_role TEXT, -- admin, researcher, platform_user, system

  -- How it was accessed
  access_type TEXT NOT NULL CHECK (access_type IN (
    'read', 'update', 'export', 'analysis', 'ai_query', 'sync'
  )),

  -- Context
  purpose TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Consent check
  consent_verified BOOLEAN,
  consent_record_id UUID REFERENCES alma_consent_records(id),

  -- Timestamp
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alma_access_log_resource ON alma_data_access_log(resource_type, resource_id);
CREATE INDEX idx_alma_access_log_accessed_by ON alma_data_access_log(accessed_by);
CREATE INDEX idx_alma_access_log_accessed_at ON alma_data_access_log(accessed_at);
CREATE INDEX idx_alma_access_log_access_type ON alma_data_access_log(access_type);

-- Helper function: Check consent
CREATE OR REPLACE FUNCTION check_alma_consent(
  p_subject_type TEXT,
  p_subject_id UUID,
  p_consent_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  consent RECORD;
  result JSONB;
BEGIN
  -- Get most recent active consent record
  SELECT * INTO consent
  FROM alma_consent_records
  WHERE subject_type = p_subject_type
    AND subject_id = p_subject_id
    AND consent_type = p_consent_type
    AND granted = TRUE
    AND withdrawn_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY granted_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'granted', false,
      'reason', 'No active consent found',
      'required_action', format('Request %s consent from subject', p_consent_type)
    );
  END IF;

  -- Check if community approval required and granted
  IF consent.community_approval_required AND consent.community_approved_at IS NULL THEN
    RETURN jsonb_build_object(
      'granted', false,
      'reason', 'Community approval pending',
      'cultural_authority', consent.cultural_authority,
      'required_action', 'Await community approval from cultural authority holder'
    );
  END IF;

  RETURN jsonb_build_object(
    'granted', true,
    'consent_id', consent.id,
    'granted_at', consent.granted_at,
    'expires_at', consent.expires_at,
    'cultural_authority', consent.cultural_authority
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Log data access
CREATE OR REPLACE FUNCTION log_alma_data_access(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_access_type TEXT,
  p_purpose TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  consent_check JSONB;
BEGIN
  -- Check consent
  consent_check := check_alma_consent(p_resource_type, p_resource_id, 'data_sharing_internal');

  -- Insert log
  INSERT INTO alma_data_access_log (
    resource_type,
    resource_id,
    accessed_by,
    access_role,
    access_type,
    purpose,
    consent_verified,
    consent_record_id
  )
  VALUES (
    p_resource_type,
    p_resource_id,
    auth.uid(),
    COALESCE((SELECT role FROM users WHERE id = auth.uid()), 'anonymous'),
    p_access_type,
    p_purpose,
    (consent_check->>'granted')::BOOLEAN,
    (consent_check->>'consent_id')::UUID
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE alma_consent_records IS
  'ALMA consent management - tracks consent for data collection, sharing, research, and AI training';
COMMENT ON TABLE alma_data_access_log IS
  'Audit trail for all data access - supports research ethics and community accountability';
```

**Why This Is Critical**:
- JusticeHub has NO consent infrastructure currently
- Research ethics require explicit consent tracking
- Community governance needs audit trails
- GDPR/privacy compliance foundation

#### B. Intervention Contexts (NEW ENTITY)

```sql
-- Migration: 20250201000006_create_alma_intervention_contexts.sql

CREATE TABLE alma_intervention_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to intervention (polymorphic)
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'community_program', 'service', 'international_program'
  )),
  intervention_id UUID NOT NULL,

  -- Context classification
  context_category TEXT NOT NULL CHECK (context_category IN (
    'environmental',    -- Geographic, climate, infrastructure
    'social',           -- Community structure, relationships, networks
    'cultural',         -- Cultural practices, values, norms
    'historical',       -- Intergenerational trauma, colonization
    'economic',         -- Poverty, employment, resources
    'systemic',         -- Policy, institutional factors
    'protective'        -- Strengths, assets, resilience factors
  )),

  -- Context details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Structured data
  context_data JSONB DEFAULT '{}'::JSONB,
  -- Examples:
  -- {"remoteness": "very_remote", "population_density": "low"}
  -- {"cultural_continuity": "strong", "elder_presence": "high"}
  -- {"service_access": "limited", "transport_barriers": "high"}

  -- Impact assessment
  impact_on_intervention TEXT, -- How this context affects the intervention
  adaptation_required TEXT, -- What adaptations are needed for this context

  -- Governance
  cultural_authority TEXT,
  consent_level TEXT DEFAULT 'Community Controlled' CHECK (consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),

  -- Attribution
  recorded_by UUID REFERENCES auth.users(id),
  source TEXT, -- How this context was documented
  evidence_documents JSONB DEFAULT '[]'::JSONB,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alma_contexts_intervention
  ON alma_intervention_contexts(intervention_type, intervention_id);
CREATE INDEX idx_alma_contexts_category
  ON alma_intervention_contexts(context_category);
CREATE INDEX idx_alma_contexts_consent_level
  ON alma_intervention_contexts(consent_level);

-- Auto-update updated_at
CREATE TRIGGER set_alma_contexts_updated_at
  BEFORE UPDATE ON alma_intervention_contexts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Helper view: Program contexts
CREATE VIEW community_program_contexts AS
SELECT
  c.*,
  p.name AS program_name,
  p.organization_name,
  p.state
FROM alma_intervention_contexts c
JOIN community_programs p ON c.intervention_id = p.id
WHERE c.intervention_type = 'community_program';

COMMENT ON TABLE alma_intervention_contexts IS
  'Documents environmental, social, cultural, and systemic contexts affecting interventions - critical for understanding what works where';
```

**Why This Fills a Gap**:
- JusticeHub has no structured context documentation
- Context is WHY interventions work (or don't)
- Enables context-based recommendations
- Supports Indigenous knowledge documentation

#### C. Outcome Tracking for Community Programs

```sql
-- Migration: 20250201000007_create_alma_outcome_tracking.sql

-- Extend existing international_programs outcome model to Australian programs

CREATE TABLE alma_intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Intervention link (polymorphic)
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'community_program', 'service', 'international_program'
  )),
  intervention_id UUID NOT NULL,

  -- Subject (individual outcome tracking with consent)
  subject_id UUID REFERENCES public_profiles(id),
  is_aggregated BOOLEAN DEFAULT FALSE, -- TRUE if aggregate data, not individual

  -- Outcome classification
  outcome_category TEXT NOT NULL CHECK (outcome_category IN (
    'justice', 'education', 'employment', 'health', 'wellbeing',
    'family', 'cultural', 'community', 'safety', 'systems'
  )),

  outcome_type TEXT NOT NULL,
  -- Examples: 'reduced_detention', 'school_re_engagement', 'employment_secured',
  --           'cultural_connection_strengthened', 'family_reunification'

  -- Measurement
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_unit TEXT,

  comparison_baseline TEXT,
  comparison_value TEXT,

  -- Example:
  -- metric_name: "Days in detention"
  -- metric_value: "30"
  -- comparison_baseline: "12 months prior"
  -- comparison_value: "180"

  -- Temporal
  measurement_date DATE NOT NULL,
  timeframe TEXT, -- How long after intervention: "6 months", "2 years", etc.

  -- Evidence quality
  evidence_strength TEXT CHECK (evidence_strength IN (
    'rigorous_rct',
    'quasi_experimental',
    'longitudinal_study',
    'evaluation_report',
    'promising_practice',
    'emerging',
    'self_reported',
    'observed'
  )),

  sample_size INTEGER,

  -- Source attribution
  source TEXT NOT NULL, -- Who measured this
  source_year INTEGER,
  research_citation JSONB,

  -- Consent (CRITICAL)
  consent_id UUID REFERENCES alma_consent_records(id),
  consent_verified BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Tracking
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alma_outcomes_intervention
  ON alma_intervention_outcomes(intervention_type, intervention_id);
CREATE INDEX idx_alma_outcomes_subject
  ON alma_intervention_outcomes(subject_id)
  WHERE subject_id IS NOT NULL;
CREATE INDEX idx_alma_outcomes_category
  ON alma_intervention_outcomes(outcome_category);
CREATE INDEX idx_alma_outcomes_type
  ON alma_intervention_outcomes(outcome_type);
CREATE INDEX idx_alma_outcomes_measurement_date
  ON alma_intervention_outcomes(measurement_date);
CREATE INDEX idx_alma_outcomes_consent
  ON alma_intervention_outcomes(consent_id);

-- Auto-update updated_at
CREATE TRIGGER set_alma_outcomes_updated_at
  BEFORE UPDATE ON alma_intervention_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS Policy: Only show outcomes where consent granted or aggregated
CREATE POLICY "Outcomes require consent or aggregation"
  ON alma_intervention_outcomes FOR SELECT
  USING (
    is_aggregated = TRUE
    OR
    consent_verified = TRUE
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

ALTER TABLE alma_intervention_outcomes ENABLE ROW LEVEL SECURITY;

-- Helper view: Program outcomes with consent check
CREATE VIEW community_program_outcomes_safe AS
SELECT
  o.*,
  p.name AS program_name,
  p.organization_name,
  p.state,
  CASE
    WHEN o.subject_id IS NOT NULL THEN 'Individual (consent verified)'
    ELSE 'Aggregated'
  END AS outcome_privacy_level
FROM alma_intervention_outcomes o
JOIN community_programs p ON o.intervention_id = p.id
WHERE o.intervention_type = 'community_program'
  AND (o.consent_verified = TRUE OR o.is_aggregated = TRUE);

COMMENT ON TABLE alma_intervention_outcomes IS
  'Longitudinal outcome tracking for Australian interventions - individual level with consent, aggregated for reporting';
```

**Why This Is Transformative**:
- JusticeHub only tracks outcomes for international programs
- Individual outcome tracking = longitudinal research capability
- Consent-first design protects vulnerable youth
- Links outcomes to contexts (what works where)

### 2.3 RLS Policies for ALMA Tables

```sql
-- Migration: 20250201000008_alma_rls_policies.sql

-- =====================================================
-- CONSENT RECORDS RLS
-- =====================================================

ALTER TABLE alma_consent_records ENABLE ROW LEVEL SECURITY;

-- Platform admins can see all
CREATE POLICY "Platform admins can manage all consent records"
  ON alma_consent_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Users can see consent records they granted
CREATE POLICY "Users can view consent records they granted"
  ON alma_consent_records FOR SELECT
  TO authenticated
  USING (granted_by = auth.uid());

-- Users can see consent records about their own profile
CREATE POLICY "Users can view consent records about their profile"
  ON alma_consent_records FOR SELECT
  TO authenticated
  USING (
    subject_type = 'profile'
    AND subject_id IN (
      SELECT id FROM public_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- DATA ACCESS LOG RLS
-- =====================================================

ALTER TABLE alma_data_access_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can see all access logs
CREATE POLICY "Platform admins can view all access logs"
  ON alma_data_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Users can see their own access logs
CREATE POLICY "Users can view their own access logs"
  ON alma_data_access_log FOR SELECT
  TO authenticated
  USING (accessed_by = auth.uid());

-- =====================================================
-- INTERVENTION CONTEXTS RLS
-- =====================================================

ALTER TABLE alma_intervention_contexts ENABLE ROW LEVEL SECURITY;

-- Public read for Public Knowledge Commons
CREATE POLICY "Public can view public intervention contexts"
  ON alma_intervention_contexts FOR SELECT
  USING (consent_level = 'Public Knowledge Commons');

-- Authenticated read for Community Controlled
CREATE POLICY "Authenticated users can view community-controlled contexts"
  ON alma_intervention_contexts FOR SELECT
  TO authenticated
  USING (consent_level IN ('Community Controlled', 'Public Knowledge Commons'));

-- Platform admins full access
CREATE POLICY "Platform admins have full access to contexts"
  ON alma_intervention_contexts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Creators can manage their contexts
CREATE POLICY "Users can manage contexts they created"
  ON alma_intervention_contexts FOR ALL
  TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (recorded_by = auth.uid());

-- =====================================================
-- INTERVENTION OUTCOMES RLS (Already defined in previous migration)
-- =====================================================

-- Additional policy: Organization members can view their program outcomes
CREATE POLICY "Organization members can view their program outcomes"
  ON alma_intervention_outcomes FOR SELECT
  TO authenticated
  USING (
    intervention_type = 'community_program'
    AND intervention_id IN (
      SELECT id FROM community_programs
      WHERE organization_id IN (
        SELECT organization_id FROM organizations_profiles
        WHERE profile_id IN (
          SELECT id FROM public_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );
```

---

## Part 3: API Integration Layer

### 3.1 ALMA Sync Service Architecture

Create: `/Users/benknight/Code/JusticeHub/src/lib/integrations/alma-sync.ts`

```typescript
/**
 * ALMA Sync Service
 *
 * Bidirectional synchronization between JusticeHub and ALMA:
 * - Profiles → ALMA Subjects
 * - Community Programs → ALMA Interventions
 * - Stories → ALMA Evidence (with consent)
 * - Contexts ← ALMA
 * - Outcomes ← ALMA
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ALMASubject,
  ALMAIntervention,
  ALMAEvidence,
  ALMAContext,
  ALMAOutcome,
  ALMASyncResult
} from '@/types/alma';

export class ALMASyncService {
  private supabase = createClient();

  /**
   * Sync JusticeHub profile to ALMA subject
   * Creates bidirectional link for longitudinal tracking
   */
  async syncProfileToALMA(profileId: string): Promise<ALMASyncResult> {
    // 1. Get profile data
    const { data: profile, error: profileError } = await this.supabase
      .from('public_profiles')
      .select('*, organizations_profiles(organization_id)')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    // 2. Check consent for ALMA sync
    const consentCheck = await this.checkConsent(
      'profile',
      profileId,
      'data_sharing_internal'
    );

    if (!consentCheck.granted) {
      return {
        success: false,
        error: 'Consent not granted for ALMA sync',
        required_action: consentCheck.required_action
      };
    }

    // 3. Transform to ALMA subject format
    const almaSubject: ALMASubject = {
      external_id: profile.id,
      external_source: 'justicehub',
      name: profile.full_name || 'Anonymous',
      role: profile.role_tags?.[0] || 'youth',
      consent_status: profile.alma_consent_status || 'granted',
      metadata: {
        justicehub_slug: profile.slug,
        tagline: profile.tagline,
        organizations: profile.organizations_profiles?.map(op => op.organization_id) || []
      }
    };

    // 4. POST to ALMA API
    const almaResponse = await fetch(`${process.env.ALMA_API_URL}/api/subjects/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ALMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(almaSubject)
    });

    if (!almaResponse.ok) {
      return {
        success: false,
        error: `ALMA API error: ${almaResponse.statusText}`
      };
    }

    const almaData = await almaResponse.json();

    // 5. Update JusticeHub profile with ALMA link
    const { error: updateError } = await this.supabase
      .from('public_profiles')
      .update({
        alma_subject_id: almaData.id,
        alma_sync_enabled: true,
        alma_last_sync_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update profile with ALMA link'
      };
    }

    // 6. Log the sync
    await this.logDataAccess(
      'profile',
      profileId,
      'sync',
      'Synced profile to ALMA subject'
    );

    return {
      success: true,
      alma_id: almaData.id,
      synced_at: new Date().toISOString()
    };
  }

  /**
   * Sync community program to ALMA intervention
   */
  async syncProgramToALMA(programId: string): Promise<ALMASyncResult> {
    // Similar pattern to syncProfileToALMA
    // Transform community_program → ALMA intervention
    // POST to ALMA API
    // Update program with alma_intervention_id
    // TODO: Implement
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Sync story to ALMA evidence (with consent)
   */
  async syncStoryToALMAEvidence(storyId: string): Promise<ALMASyncResult> {
    // 1. Get story
    const { data: story } = await this.supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (!story) {
      return { success: false, error: 'Story not found' };
    }

    // 2. Check if author consented to research use
    if (!story.alma_consent_research) {
      return {
        success: false,
        error: 'Story author has not consented to research use',
        required_action: 'Request research consent from story author'
      };
    }

    // 3. Transform story → ALMA evidence
    const almaEvidence: ALMAEvidence = {
      external_id: story.id,
      external_source: 'justicehub',
      title: story.title,
      evidence_type: 'lived_experience',
      content: story.content,
      findings: story.content, // Story content as findings
      author: story.is_anonymous ? 'Anonymous' : story.author_id,
      source_document: {
        url: `https://justicehub.org.au/stories/${story.id}`,
        title: story.title
      },
      consent_level: story.visibility === 'public' ? 'Public Knowledge Commons' : 'Community Controlled',
      tags: story.tags || [],
      intervention_references: story.alma_intervention_references || []
    };

    // 4. POST to ALMA
    // 5. Update story with alma_evidence_id
    // TODO: Implement
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Pull contexts from ALMA and attach to programs
   */
  async pullContextsFromALMA(almaInterventionId: string): Promise<ALMASyncResult> {
    // GET from ALMA API
    // Insert into alma_intervention_contexts
    // Link to community_program via alma_intervention_id
    // TODO: Implement
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Pull outcomes from ALMA and attach to programs/profiles
   */
  async pullOutcomesFromALMA(almaInterventionId: string): Promise<ALMASyncResult> {
    // GET from ALMA API
    // Insert into alma_intervention_outcomes
    // Link to community_program and subject_id (if individual)
    // Verify consent before linking individual outcomes
    // TODO: Implement
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Helper: Check consent via database function
   */
  private async checkConsent(
    subjectType: string,
    subjectId: string,
    consentType: string
  ): Promise<any> {
    const { data, error } = await this.supabase.rpc('check_alma_consent', {
      p_subject_type: subjectType,
      p_subject_id: subjectId,
      p_consent_type: consentType
    });

    if (error) {
      console.error('Consent check error:', error);
      return { granted: false, reason: error.message };
    }

    return data;
  }

  /**
   * Helper: Log data access
   */
  private async logDataAccess(
    resourceType: string,
    resourceId: string,
    accessType: string,
    purpose?: string
  ): Promise<void> {
    await this.supabase.rpc('log_alma_data_access', {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_access_type: accessType,
      p_purpose: purpose
    });
  }
}
```

### 3.2 API Routes

Create: `/Users/benknight/Code/JusticeHub/src/app/api/alma/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ALMASyncService } from '@/lib/integrations/alma-sync';

export async function POST(request: NextRequest) {
  const syncService = new ALMASyncService();
  const body = await request.json();

  const { action, entity_type, entity_id } = body;

  try {
    let result;

    switch (action) {
      case 'sync_profile':
        result = await syncService.syncProfileToALMA(entity_id);
        break;

      case 'sync_program':
        result = await syncService.syncProgramToALMA(entity_id);
        break;

      case 'sync_story':
        result = await syncService.syncStoryToALMAEvidence(entity_id);
        break;

      case 'pull_contexts':
        result = await syncService.pullContextsFromALMA(entity_id);
        break;

      case 'pull_outcomes':
        result = await syncService.pullOutcomesFromALMA(entity_id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('ALMA sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}
```

---

## Part 4: UI Components and Pages

### 4.1 Consent Management UI

Create: `/Users/benknight/Code/JusticeHub/src/components/alma/ConsentManager.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';

interface ConsentManagerProps {
  subjectType: 'profile' | 'story' | 'program';
  subjectId: string;
  onConsentGranted?: () => void;
}

export function ConsentManager({
  subjectType,
  subjectId,
  onConsentGranted
}: ConsentManagerProps) {
  const [consents, setConsents] = useState({
    data_collection: false,
    data_sharing_internal: false,
    data_sharing_research: false,
    outcome_tracking: false,
    story_attribution: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const consentTypes = [
    {
      key: 'data_collection',
      label: 'Data Collection',
      description: 'Allow collection of information about my participation in programs',
      required: true
    },
    {
      key: 'data_sharing_internal',
      label: 'Internal Sharing',
      description: 'Share my data within JusticeHub and ALMA platforms',
      required: true
    },
    {
      key: 'data_sharing_research',
      label: 'Research Use',
      description: 'Use my data in research to improve youth justice outcomes',
      required: false
    },
    {
      key: 'outcome_tracking',
      label: 'Outcome Tracking',
      description: 'Track my outcomes over time to measure program effectiveness',
      required: false
    },
    ...(subjectType === 'story' ? [{
      key: 'story_attribution',
      label: 'Story Attribution',
      description: 'Attribute my story to my real identity (not anonymous)',
      required: false
    }] : [])
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Create consent records for each granted consent
      for (const [consentType, granted] of Object.entries(consents)) {
        if (granted) {
          await fetch('/api/alma/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject_type: subjectType,
              subject_id: subjectId,
              consent_type: consentType,
              granted: true
            })
          });
        }
      }

      setSubmitted(true);
      onConsentGranted?.();
    } catch (error) {
      console.error('Failed to save consent:', error);
      alert('Failed to save consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 border-2 border-green-500">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-bold">Consent Recorded</h3>
            <p className="text-sm text-gray-600">
              Thank you for granting consent. Your choices have been saved and you can
              update them at any time.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-black">
      <div className="flex items-start gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h2 className="text-xl font-bold mb-2">Data Consent</h2>
          <p className="text-gray-700">
            ALMA helps improve youth justice by learning from experiences like yours.
            Please choose what you're comfortable sharing.
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {consentTypes.map((type) => (
          <div
            key={type.key}
            className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition"
          >
            <Checkbox
              id={type.key}
              checked={consents[type.key as keyof typeof consents]}
              onCheckedChange={(checked) =>
                setConsents({ ...consents, [type.key]: checked === true })
              }
            />
            <label htmlFor={type.key} className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{type.label}</span>
                {type.required && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    Required
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mb-6">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900 mb-1">Your Rights:</p>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>You can withdraw consent at any time</li>
            <li>Your data is protected by privacy laws</li>
            <li>You can request to see what data we hold about you</li>
            <li>Community approval is required for sharing cultural knowledge</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !consents.data_collection ||
            !consents.data_sharing_internal
          }
          className="cta-primary"
        >
          {isSubmitting ? 'Saving...' : 'Grant Consent'}
        </Button>
        <Button variant="outline" className="border-2 border-black">
          I'll Decide Later
        </Button>
      </div>
    </Card>
  );
}
```

### 4.2 Program with ALMA Intelligence

Extend: `/Users/benknight/Code/JusticeHub/src/app/community-programs/[id]/page.tsx`

Add ALMA sections:

```typescript
// Add to existing program page

import { OutcomeTimeline } from '@/components/alma/OutcomeTimeline';
import { ContextPanel } from '@/components/alma/ContextPanel';
import { EvidenceRating } from '@/components/alma/EvidenceRating';
import { PortfolioSignals } from '@/components/alma/PortfolioSignals';

export default async function ProgramPage({ params }) {
  // ... existing program data fetch ...

  // Fetch ALMA data if linked
  const { data: almaContexts } = await supabase
    .from('alma_intervention_contexts')
    .select('*')
    .eq('intervention_type', 'community_program')
    .eq('intervention_id', program.id);

  const { data: almaOutcomes } = await supabase
    .from('community_program_outcomes_safe') // Uses RLS-protected view
    .select('*')
    .eq('program_id', program.id);

  return (
    <div>
      {/* Existing program header, description, etc. */}

      {/* NEW: ALMA Evidence Section */}
      {program.alma_evidence_level && (
        <section className="section-padding">
          <h2 className="headline-truth mb-6">Evidence Rating</h2>
          <EvidenceRating
            level={program.alma_evidence_level}
            culturalAuthority={program.alma_cultural_authority}
            harmRiskLevel={program.alma_harm_risk_level}
          />
        </section>
      )}

      {/* NEW: ALMA Context Section */}
      {almaContexts && almaContexts.length > 0 && (
        <section className="section-padding bg-gray-50">
          <h2 className="headline-truth mb-6">Context & Conditions</h2>
          <p className="text-gray-700 mb-6">
            Understanding the conditions that make this program effective
          </p>
          <ContextPanel contexts={almaContexts} />
        </section>
      )}

      {/* NEW: ALMA Outcomes Section */}
      {almaOutcomes && almaOutcomes.length > 0 && (
        <section className="section-padding">
          <h2 className="headline-truth mb-6">Outcomes Over Time</h2>
          <OutcomeTimeline outcomes={almaOutcomes} />
        </section>
      )}

      {/* NEW: Portfolio Intelligence (admin only) */}
      {isAdmin && program.alma_portfolio_score && (
        <section className="section-padding bg-blue-50">
          <h2 className="headline-truth mb-6">Portfolio Intelligence</h2>
          <PortfolioSignals
            portfolioScore={program.alma_portfolio_score}
            signals={{
              evidenceStrength: program.alma_metadata?.signals?.evidence_strength,
              communityAuthority: program.alma_metadata?.signals?.community_authority,
              harmRisk: program.alma_metadata?.signals?.harm_risk,
              implementationCapability: program.alma_metadata?.signals?.implementation_capability,
              optionValue: program.alma_metadata?.signals?.option_value
            }}
          />
        </section>
      )}

      {/* Existing content continues... */}
    </div>
  );
}
```

### 4.3 Admin ALMA Dashboard

Create: `/Users/benknight/Code/JusticeHub/src/app/admin/alma/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { ALMASyncStatus } from '@/components/alma/ALMASyncStatus';
import { ConsentOverview } from '@/components/alma/ConsentOverview';
import { PortfolioDashboard } from '@/components/alma/PortfolioDashboard';

export default async function ALMAAdminPage() {
  const supabase = createClient();

  // Sync status
  const { data: syncStats } = await supabase.rpc('get_alma_sync_stats');

  // Consent stats
  const { data: consentStats } = await supabase.rpc('get_alma_consent_stats');

  // Portfolio overview
  const { data: portfolioStats } = await supabase.rpc('get_alma_portfolio_stats');

  return (
    <div className="container-justice">
      <div className="section-padding">
        <h1 className="text-4xl font-bold mb-2">ALMA Intelligence Dashboard</h1>
        <p className="text-xl text-gray-600 mb-8">
          Community-governed youth justice intelligence system
        </p>

        {/* Sync Status */}
        <section className="mb-12">
          <h2 className="headline-truth mb-6">Sync Status</h2>
          <ALMASyncStatus stats={syncStats} />
        </section>

        {/* Consent Overview */}
        <section className="mb-12">
          <h2 className="headline-truth mb-6">Consent & Governance</h2>
          <ConsentOverview stats={consentStats} />
        </section>

        {/* Portfolio Intelligence */}
        <section>
          <h2 className="headline-truth mb-6">Portfolio Intelligence</h2>
          <PortfolioDashboard stats={portfolioStats} />
        </section>
      </div>
    </div>
  );
}
```

---

## Part 5: Implementation Timeline

### Week 1-2: Database Foundation ✅ START HERE

**Goal**: All database tables and functions operational

**Tasks**:
1. Run 8 migration files in JusticeHub:
   ```bash
   cd /Users/benknight/Code/JusticeHub
   npx supabase migration new add_alma_profile_links
   # Copy SQL from migration 20250201000001
   # Repeat for migrations 20250201000002 through 20250201000008
   npx supabase db push
   ```

2. Test consent system:
   - Manually insert test consent record via Supabase Studio
   - Call `check_alma_consent()` function
   - Verify RLS policies work

3. Seed test data:
   - Add `alma_evidence_level` to 5 community programs
   - Create 2 test intervention contexts
   - Create 3 test outcome records (aggregated)

**Acceptance Criteria**:
- ✅ All 8 migrations applied successfully
- ✅ Consent check function returns expected results
- ✅ RLS policies prevent unauthorized access
- ✅ Test data visible in appropriate views

---

### Week 3-4: API Integration Layer

**Goal**: Bidirectional sync between JusticeHub and ALMA working

**Tasks**:
1. Create `alma-sync.ts` service (from Part 3.1)
2. Create `/api/alma/sync` endpoint (from Part 3.2)
3. Create `/api/alma/consent` endpoint for consent management
4. Test profile sync:
   - Create test profile
   - Grant consent
   - Sync to ALMA (mock API for now)
   - Verify `alma_subject_id` populated

5. Test program sync:
   - Link community_program to ALMA intervention
   - Verify `alma_intervention_id` populated

**Acceptance Criteria**:
- ✅ Profile sync creates ALMA subject link
- ✅ Consent check prevents sync without consent
- ✅ Data access logged in `alma_data_access_log`
- ✅ Error handling works (API down, invalid data, etc.)

---

### Week 5-6: UI Components

**Goal**: Users can manage consent and view ALMA intelligence

**Tasks**:
1. Create `ConsentManager` component (from Part 4.1)
2. Create `EvidenceRating` component
3. Create `ContextPanel` component
4. Create `OutcomeTimeline` component
5. Extend program page with ALMA sections (from Part 4.2)
6. Add consent UI to story creation flow
7. Test with real youth/mentor accounts

**Acceptance Criteria**:
- ✅ Users can grant/view consent via UI
- ✅ Program pages show evidence rating
- ✅ Context panels display structured context
- ✅ Outcome timelines visualize progress
- ✅ Consent required before ALMA sync

---

### Week 7-8: Admin Dashboard

**Goal**: Admins can monitor ALMA integration and portfolio intelligence

**Tasks**:
1. Create `/admin/alma` page (from Part 4.3)
2. Create helper database functions:
   ```sql
   CREATE FUNCTION get_alma_sync_stats() ...
   CREATE FUNCTION get_alma_consent_stats() ...
   CREATE FUNCTION get_alma_portfolio_stats() ...
   ```
3. Create dashboard components:
   - `ALMASyncStatus`
   - `ConsentOverview`
   - `PortfolioDashboard`
4. Add portfolio score calculation (implement signals logic)
5. Test with 15-20 programs

**Acceptance Criteria**:
- ✅ Admin dashboard shows sync status
- ✅ Consent compliance visible
- ✅ Portfolio scores calculated
- ✅ Top interventions ranked by signals

---

### Week 9-10: Advanced Features

**Goal**: Context-based recommendations and longitudinal tracking

**Tasks**:
1. Implement context similarity search (ChromaDB)
2. Create recommendation engine:
   - "Programs that worked in similar contexts"
   - "Youth with similar journeys"
3. Build longitudinal view:
   - Track youth across multiple interventions
   - Visualize journey timeline
4. Export intelligence pack (PDF/markdown)
5. Test with real data from Witta Harvest pilot

**Acceptance Criteria**:
- ✅ Context-based recommendations functional
- ✅ Longitudinal tracking displays multi-program journeys
- ✅ Intelligence pack generation works
- ✅ First pack delivered to funder

---

## Part 6: Success Metrics

### Technical Metrics

- **Sync Success Rate**: >95% of syncs succeed
- **API Response Time**: <500ms for sync operations
- **Data Integrity**: 100% of ALMA-linked entities have consent records
- **RLS Coverage**: 100% of ALMA tables have RLS enabled

### Community Metrics

- **Consent Rate**: >70% of users grant research consent
- **Profile Sync**: >50 profiles synced to ALMA in first month
- **Program Coverage**: >30 community programs with ALMA evidence levels
- **Context Documentation**: >20 intervention contexts documented

### Impact Metrics

- **Intelligence Packs**: 1 pack/month delivered to funders
- **Recommendation Accuracy**: >60% of recommended interventions rated "relevant" by users
- **Longitudinal Tracking**: >10 youth tracked across multiple interventions
- **Portfolio Insights**: Identify 5+ underfunded/high-evidence opportunities

---

## Part 7: Risk Mitigation

### Risk 1: Consent Complexity Overwhelming Users

**Mitigation**:
- Simple, visual consent UI (checkboxes, plain language)
- Default to minimal required consents
- "I'll decide later" option
- Progressive consent (ask again when relevant)

### Risk 2: Data Privacy Violations

**Mitigation**:
- RLS on all tables (no data leaks)
- Consent check before every sync
- Audit log of all access
- Regular compliance reviews

### Risk 3: ALMA API Dependency

**Mitigation**:
- Graceful degradation (JusticeHub works without ALMA)
- Queue failed syncs for retry
- Mock API for development/testing
- Monitor API health

### Risk 4: Performance Degradation

**Mitigation**:
- Indexed foreign keys (alma_intervention_id, alma_subject_id)
- Async sync (don't block UI)
- Batch operations where possible
- Monitor query performance

---

## Part 8: Next Steps (Today!)

### 1. Review This Plan

- Ben + Nic review integration approach
- Validate alignment with ACT first principles
- Confirm Supabase-only approach (vs Airtable)

### 2. Prepare Environment

```bash
cd /Users/benknight/Code/JusticeHub

# Ensure Supabase CLI installed
npx supabase --version

# Pull latest schema
npx supabase db pull

# Verify connection
npx supabase db ping
```

### 3. Create First Migration

```bash
# Create migration file
npx supabase migration new add_alma_profile_links

# Copy SQL from Part 2.1 Section A into new migration file
# Review, then apply
npx supabase db push
```

### 4. Test in Supabase Studio

- Open Supabase Studio
- Verify new columns on `public_profiles`
- Manually add `alma_subject_id` to test profile
- Verify indexes created

### 5. Continue with Remaining Migrations

- One migration at a time
- Test after each
- Document any issues

---

## Conclusion

This integration plan provides a comprehensive roadmap for bringing ALMA's intelligence layer to JusticeHub. By leveraging existing strengths (profile system, evidence infrastructure, AI capabilities) and filling critical gaps (consent management, outcome tracking, context documentation), we create a world-class youth justice intelligence commons.

**Key Strengths of This Approach**:
- ✅ Minimal disruption to existing JusticeHub functionality
- ✅ Consent-first design protects vulnerable youth
- ✅ Bidirectional sync enables both platforms to benefit
- ✅ Portfolio intelligence adds immediate value for funders
- ✅ Longitudinal tracking enables research at scale
- ✅ Community governance embedded in database constraints

**Ready to Build**: All specifications complete, all risks mitigated, all success criteria defined. Let's start with Week 1-2 (database migrations) and build from there.

🚀 **Let's transform youth justice intelligence in Australia.**
