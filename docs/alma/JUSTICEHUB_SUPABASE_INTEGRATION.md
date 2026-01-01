# ALMA + JusticeHub Integration Plan
## Supabase-Based Youth Justice Ontology

**Version**: 1.0
**Date**: December 31, 2025
**Alignment**: ACT First Principles + Community Sovereignty

---

## Overview

This document outlines how ALMA (the sensemaking and action layer) integrates with JusticeHub's existing Supabase database to create a **community-governed, evidence-based youth justice intelligence system**.

**Core Principle**: ALMA extends JusticeHub without disrupting its existing functionality. Knowledge flows horizontally (community ↔ community) not vertically (institution → community).

**Key Context from ACT's Mission**:
- **Community-centered innovation**: Co-designed solutions for remote and First Nations communities
- **First principles approach**: Deconstruct problems to fundamentals (human dignity, relational trust, adaptive systems)
- **Horizontal knowledge flows**: No extraction, only nourishment
- **Indigenous intelligence nodes**: State-based hubs embedding lived experience and cultural authority
- **Alma as method**: Translates between worlds (lived experience ↔ policy ↔ funding) using ethical AI

---

## Current JusticeHub Database Structure

### Existing Tables (Relevant to ALMA)

**Services Table** (Youth Justice Programs):
```sql
services (
  id, organization_id, name, slug, description,
  program_type, service_category[],
  target_age_min, target_age_max,
  delivery_method[], capacity_total, capacity_current,
  is_accepting_referrals, cost, eligibility_criteria[],

  -- Youth justice specific
  categories[], keywords[],
  youth_specific, indigenous_specific,
  gender_specific[], languages_supported[],
  accessibility_features[], service_type, location_type,

  -- Quality assurance
  data_source, data_source_url,
  last_verified_at, verification_status,
  scrape_confidence_score,

  -- Flexible metadata
  metadata JSONB,
  project
)
```

**Organizations Table**:
```sql
organizations (
  id, name, slug, type, description,
  verification_status, is_active,
  empathy_ledger_config JSONB, -- Can store ALMA config
  settings JSONB,
  tags[]
)
```

**Stories Table** (Lived Experience):
```sql
stories (
  id, title, content, author_id, youth_profile_id,
  organization_id, story_type, visibility,
  is_anonymous, tags[], content_warnings[],
  metadata JSONB
)
```

**Cross-Project Metrics**:
```sql
cross_project_metrics (
  id, project_id, organization_id,
  metric_type, metric_value, metric_date,
  metadata JSONB
)
```

**Consent Records** (Already exists!):
```sql
consent_records (
  id, storyteller_id, story_id,
  consent_type, status, consent_details JSONB,
  expires_at, granted_by
)
```

### Existing RLS Patterns

JusticeHub has robust Row-Level Security:
- Organization-scoped access (users see their org's data)
- Public access for verified/published content
- Platform admin override
- Author ownership for stories

---

## ALMA Integration Strategy

### Approach: Hybrid Extension Model

**Why Hybrid?**
1. **Preserve JusticeHub integrity**: Existing services table continues functioning
2. **Add ALMA structure**: New tables for intervention ontology
3. **Link bidirectionally**: Services ↔ Interventions via foreign keys
4. **Leverage existing RLS**: Extend patterns to ALMA tables
5. **Use JSONB for flexibility**: Ontology evolution without schema changes

**Core Insight**: JusticeHub's `services` table is already interventions! We're adding ALMA governance, evidence linking, and portfolio intelligence **on top**.

---

## Database Schema: ALMA Tables

### Migration 1: ALMA Core Entities

File: `/Users/benknight/Code/JusticeHub/supabase/migrations/20250131000001_alma_core_entities.sql`

```sql
-- =====================================================
-- ALMA Youth Justice Ontology - Core Entities
-- Integrates with existing JusticeHub services table
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. INTERVENTIONS (extends services)
-- =====================================================

CREATE TABLE alma_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to existing JusticeHub service (optional)
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  -- Link to organization
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info (can override service or be standalone)
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- ALMA-specific classification
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'Prevention',
    'Early Intervention',
    'Diversion',
    'Therapeutic',
    'Wraparound Support',
    'Family Strengthening',
    'Cultural Connection',
    'Education/Employment',
    'Justice Reinvestment',
    'Community-Led'
  )),

  -- Target cohort (multi-select)
  target_cohort TEXT[] DEFAULT '{}',
  -- Options: '10-14 years', '15-17 years', '18-21 years', 'First Nations',
  --          'CALD', 'LGBTQIA+', 'Disability', 'Care-experienced', etc.

  -- Evidence and risk
  evidence_level TEXT CHECK (evidence_level IN (
    'Promising (community-endorsed, emerging evidence)',
    'Effective (strong evaluation, positive outcomes)',
    'Proven (RCT/quasi-experimental, replicated)',
    'Indigenous-led (culturally grounded, community authority)',
    'Untested (theory/pilot stage)'
  )),

  harm_risk_level TEXT CHECK (harm_risk_level IN (
    'Low', 'Medium', 'High', 'Requires cultural review'
  )),
  risks TEXT, -- Description of potential harms

  -- Implementation details
  implementation_cost TEXT CHECK (implementation_cost IN (
    'Low (<$50k/year)', 'Medium ($50k-$250k)', 'High (>$250k)', 'Unknown'
  )),
  cost_per_young_person NUMERIC,

  scalability TEXT CHECK (scalability IN (
    'Local only', 'Regional', 'State-wide', 'National', 'Context-dependent'
  )),

  replication_readiness TEXT CHECK (replication_readiness IN (
    'Not ready (needs more development)',
    'Ready with support (requires adaptation guidance)',
    'Ready (playbook available)',
    'Community authority required'
  )),

  -- Operating context
  geography TEXT[] DEFAULT '{}',
  -- Options: 'VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
  --          'Remote', 'Regional', 'Metro'

  operating_organization TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  years_operating INTEGER,

  current_funding TEXT CHECK (current_funding IN (
    'Unfunded', 'Pilot/seed', 'Established', 'Oversubscribed', 'At-risk'
  )),

  -- ALMA Governance (critical!)
  cultural_authority TEXT, -- Who holds authority (Elder council, community org, etc.)

  consent_level TEXT NOT NULL DEFAULT 'Strictly Private' CHECK (consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),

  permitted_uses TEXT[] DEFAULT ARRAY['query_internal']::TEXT[],
  -- Options: 'query_internal', 'publish_justicehub', 'export_reports',
  --          'training_ai', 'commercial'

  contributors TEXT[] DEFAULT '{}', -- Organizations/individuals who contributed

  -- Source documents for provenance
  source_documents JSONB DEFAULT '[]'::JSONB,
  -- Format: [{ "url": "...", "title": "...", "date": "..." }]

  -- Review workflow
  review_status TEXT NOT NULL DEFAULT 'Draft' CHECK (review_status IN (
    'Draft', 'Community Review', 'Approved', 'Published', 'Archived'
  )),

  -- Portfolio signals (calculated)
  portfolio_score NUMERIC,
  evidence_strength_signal NUMERIC,
  community_authority_signal NUMERIC,
  harm_risk_signal NUMERIC,
  implementation_capability_signal NUMERIC,
  option_value_signal NUMERIC,

  -- Flexible metadata for ontology evolution
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_verified_at TIMESTAMPTZ,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(risks, '')), 'C')
  ) STORED
);

CREATE INDEX idx_alma_interventions_service_id ON alma_interventions(service_id);
CREATE INDEX idx_alma_interventions_organization_id ON alma_interventions(organization_id);
CREATE INDEX idx_alma_interventions_consent_level ON alma_interventions(consent_level);
CREATE INDEX idx_alma_interventions_review_status ON alma_interventions(review_status);
CREATE INDEX idx_alma_interventions_intervention_type ON alma_interventions(intervention_type);
CREATE INDEX idx_alma_interventions_search_vector ON alma_interventions USING gin(search_vector);
CREATE INDEX idx_alma_interventions_geography ON alma_interventions USING gin(geography);
CREATE INDEX idx_alma_interventions_target_cohort ON alma_interventions USING gin(target_cohort);

-- Auto-update updated_at
CREATE TRIGGER set_alma_interventions_updated_at
  BEFORE UPDATE ON alma_interventions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- 2. COMMUNITY CONTEXTS
-- =====================================================

CREATE TABLE alma_community_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  context_type TEXT CHECK (context_type IN (
    'First Nations community',
    'Remote community',
    'Regional area',
    'Metro suburb',
    'Cultural community',
    'Care system',
    'Education setting'
  )),

  location TEXT, -- Geographic location (respectful of privacy)

  population_size TEXT CHECK (population_size IN (
    '<1,000', '1,000-10,000', '10,000-50,000', '50,000+', 'Unknown'
  )),

  demographics TEXT, -- Relevant demographic context (culturally safe)
  system_factors TEXT, -- Systemic context (over-policing, service gaps, trauma)
  protective_factors TEXT, -- Community strengths, assets, protective factors

  -- Governance
  cultural_authority TEXT NOT NULL, -- Who has authority to speak about this context

  consent_level TEXT NOT NULL DEFAULT 'Strictly Private' CHECK (consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_alma_contexts_consent_level ON alma_community_contexts(consent_level);
CREATE INDEX idx_alma_contexts_context_type ON alma_community_contexts(context_type);

-- =====================================================
-- 3. EVIDENCE
-- =====================================================

CREATE TABLE alma_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,

  evidence_type TEXT CHECK (evidence_type IN (
    'RCT (Randomized Control Trial)',
    'Quasi-experimental',
    'Program evaluation',
    'Longitudinal study',
    'Case study',
    'Community-led research',
    'Lived experience',
    'Cultural knowledge',
    'Policy analysis'
  )),

  methodology TEXT,
  sample_size INTEGER,
  timeframe TEXT, -- Study period or observation window

  findings TEXT NOT NULL,

  effect_size TEXT CHECK (effect_size IN (
    'Large positive', 'Moderate positive', 'Small positive',
    'Null', 'Mixed', 'Not measured'
  )),

  cultural_safety TEXT CHECK (cultural_safety IN (
    'Culturally grounded (led by community)',
    'Culturally adapted (with community input)',
    'Culturally neutral',
    'Cultural safety concerns',
    'Unknown'
  )),

  limitations TEXT,

  -- Attribution
  author TEXT,
  organization TEXT,
  publication_date DATE,
  doi TEXT,

  source_document JSONB, -- { "url": "...", "file_path": "..." }

  -- Governance
  consent_level TEXT NOT NULL DEFAULT 'Strictly Private' CHECK (consent_level IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),

  contributors TEXT[] DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_alma_evidence_evidence_type ON alma_evidence(evidence_type);
CREATE INDEX idx_alma_evidence_consent_level ON alma_evidence(consent_level);

-- =====================================================
-- 4. OUTCOMES
-- =====================================================

CREATE TABLE alma_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,

  outcome_type TEXT CHECK (outcome_type IN (
    'Reduced detention/incarceration',
    'Reduced recidivism',
    'Diversion from justice system',
    'Educational engagement',
    'Employment/training',
    'Family connection',
    'Cultural connection',
    'Mental health/wellbeing',
    'Reduced substance use',
    'Community safety',
    'System cost reduction',
    'Healing/restoration'
  )),

  description TEXT,
  measurement_method TEXT, -- How this outcome is measured
  indicators TEXT, -- Specific quantitative or qualitative indicators

  time_horizon TEXT CHECK (time_horizon IN (
    'Immediate (<6 months)',
    'Short-term (6-12 months)',
    'Medium-term (1-3 years)',
    'Long-term (3+ years)'
  )),

  beneficiary TEXT CHECK (beneficiary IN (
    'Young person', 'Family', 'Community', 'System/Government'
  )),

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alma_outcomes_outcome_type ON alma_outcomes(outcome_type);
CREATE INDEX idx_alma_outcomes_beneficiary ON alma_outcomes(beneficiary);

-- =====================================================
-- 5. RELATIONSHIP TABLES (Many-to-Many)
-- =====================================================

-- Interventions ↔ Outcomes
CREATE TABLE alma_intervention_outcomes (
  intervention_id UUID REFERENCES alma_interventions(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES alma_outcomes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (intervention_id, outcome_id)
);

CREATE INDEX idx_intervention_outcomes_intervention ON alma_intervention_outcomes(intervention_id);
CREATE INDEX idx_intervention_outcomes_outcome ON alma_intervention_outcomes(outcome_id);

-- Interventions ↔ Evidence
CREATE TABLE alma_intervention_evidence (
  intervention_id UUID REFERENCES alma_interventions(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES alma_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (intervention_id, evidence_id)
);

CREATE INDEX idx_intervention_evidence_intervention ON alma_intervention_evidence(intervention_id);
CREATE INDEX idx_intervention_evidence_evidence ON alma_intervention_evidence(evidence_id);

-- Interventions ↔ Community Contexts
CREATE TABLE alma_intervention_contexts (
  intervention_id UUID REFERENCES alma_interventions(id) ON DELETE CASCADE,
  context_id UUID REFERENCES alma_community_contexts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (intervention_id, context_id)
);

CREATE INDEX idx_intervention_contexts_intervention ON alma_intervention_contexts(intervention_id);
CREATE INDEX idx_intervention_contexts_context ON alma_intervention_contexts(context_id);

-- Evidence ↔ Outcomes
CREATE TABLE alma_evidence_outcomes (
  evidence_id UUID REFERENCES alma_evidence(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES alma_outcomes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (evidence_id, outcome_id)
);

CREATE INDEX idx_evidence_outcomes_evidence ON alma_evidence_outcomes(evidence_id);
CREATE INDEX idx_evidence_outcomes_outcome ON alma_evidence_outcomes(outcome_id);

-- =====================================================
-- 6. CONSENT LEDGER (extends existing consent_records)
-- =====================================================

-- Extend existing consent_records table via metadata
-- OR create ALMA-specific consent tracking

CREATE TABLE alma_consent_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'intervention', 'evidence', 'context', 'outcome', 'story'
  )),
  entity_id UUID NOT NULL,

  -- Contributors
  contributors TEXT[] NOT NULL,
  cultural_authority TEXT,

  -- Consent details
  consent_tier TEXT NOT NULL CHECK (consent_tier IN (
    'Strictly Private',
    'Community Controlled',
    'Public Knowledge Commons'
  )),

  permitted_uses TEXT[] NOT NULL,
  restrictions TEXT,

  -- Lifecycle
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  renewal_required BOOLEAN DEFAULT false,

  -- Revenue sharing
  revenue_share_enabled BOOLEAN DEFAULT true,

  -- Tracking
  granted_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alma_consent_entity ON alma_consent_ledger(entity_type, entity_id);
CREATE INDEX idx_alma_consent_tier ON alma_consent_ledger(consent_tier);
CREATE INDEX idx_alma_consent_expiry ON alma_consent_ledger(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- 7. USAGE TRACKING (Reuse Ledger)
-- =====================================================

CREATE TABLE alma_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity reference
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'intervention', 'evidence', 'context', 'outcome', 'story'
  )),
  entity_id UUID NOT NULL,

  -- Action
  action TEXT NOT NULL CHECK (action IN (
    'query_internal',
    'publish_justicehub',
    'export_report',
    'training_ai',
    'commercial',
    'portfolio_analytics'
  )),

  -- Context
  user_id UUID REFERENCES auth.users(id),
  destination TEXT, -- 'JusticeHub', 'Empathy Ledger', 'Funder Report', etc.

  -- Attribution (for revenue share calculation)
  attribution TEXT[], -- Contributors credited

  -- Revenue tracking
  revenue_generated NUMERIC,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alma_usage_entity ON alma_usage_log(entity_type, entity_id);
CREATE INDEX idx_alma_usage_action ON alma_usage_log(action);
CREATE INDEX idx_alma_usage_user ON alma_usage_log(user_id);
CREATE INDEX idx_alma_usage_created ON alma_usage_log(created_at);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate portfolio signals
CREATE OR REPLACE FUNCTION calculate_portfolio_signals(intervention_id UUID)
RETURNS JSONB AS $$
DECLARE
  intervention RECORD;
  evidence_count INTEGER;
  signals JSONB;
BEGIN
  -- Get intervention
  SELECT * INTO intervention FROM alma_interventions WHERE id = intervention_id;

  -- Count evidence
  SELECT COUNT(*) INTO evidence_count
  FROM alma_intervention_evidence
  WHERE intervention_id = intervention_id;

  -- Calculate signals (simplified logic, expand in actual implementation)
  signals := jsonb_build_object(
    'evidence_strength', CASE intervention.evidence_level
      WHEN 'Proven (RCT/quasi-experimental, replicated)' THEN 1.0
      WHEN 'Effective (strong evaluation, positive outcomes)' THEN 0.8
      WHEN 'Indigenous-led (culturally grounded, community authority)' THEN 0.9
      WHEN 'Promising (community-endorsed, emerging evidence)' THEN 0.6
      ELSE 0.3
    END + LEAST(evidence_count * 0.1, 0.3),

    'community_authority', CASE
      WHEN intervention.evidence_level LIKE 'Indigenous-led%' THEN 1.0
      WHEN intervention.cultural_authority IS NOT NULL AND intervention.consent_level = 'Community Controlled' THEN 0.8
      WHEN intervention.cultural_authority IS NOT NULL THEN 0.6
      ELSE 0.4
    END,

    'harm_risk', CASE intervention.harm_risk_level
      WHEN 'Low' THEN 0.1
      WHEN 'Medium' THEN 0.4
      WHEN 'High' THEN 0.8
      ELSE 0.9
    END,

    'implementation_capability', 0.5, -- Placeholder, calculate from replication_readiness, years_operating, funding

    'option_value', CASE
      WHEN intervention.evidence_level = 'Untested (theory/pilot stage)'
        AND intervention.consent_level = 'Community Controlled'
        AND intervention.cultural_authority IS NOT NULL THEN 0.8
      WHEN intervention.evidence_level LIKE 'Promising%' THEN 0.6
      ELSE 0.3
    END
  );

  -- Calculate weighted portfolio score
  signals := signals || jsonb_build_object(
    'portfolio_score',
    (signals->>'evidence_strength')::NUMERIC * 0.25 +
    (signals->>'community_authority')::NUMERIC * 0.30 +
    (1 - (signals->>'harm_risk')::NUMERIC) * 0.20 +
    (signals->>'implementation_capability')::NUMERIC * 0.15 +
    (signals->>'option_value')::NUMERIC * 0.10
  );

  RETURN signals;
END;
$$ LANGUAGE plpgsql;

-- Function to check consent compliance
CREATE OR REPLACE FUNCTION check_consent_compliance(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
  consent RECORD;
  result JSONB;
BEGIN
  -- Get consent record
  SELECT * INTO consent
  FROM alma_consent_ledger
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  ORDER BY consent_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No consent record found',
      'required_action', 'Create consent record before proceeding'
    );
  END IF;

  -- Check if action is permitted
  IF p_action = ANY(consent.permitted_uses) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'consent_tier', consent.consent_tier,
      'contributors', consent.contributors
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Action "%s" not in permitted uses', p_action),
      'permitted_uses', consent.permitted_uses,
      'required_action', 'Request additional consent from contributors'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE alma_interventions IS 'ALMA youth justice interventions - extends JusticeHub services with evidence, governance, and portfolio intelligence';
COMMENT ON TABLE alma_community_contexts IS 'Place-based and cultural contexts where interventions operate';
COMMENT ON TABLE alma_evidence IS 'Research, evaluations, and outcome data supporting interventions';
COMMENT ON TABLE alma_outcomes IS 'Intended and measured outcomes for young people and communities';
COMMENT ON TABLE alma_consent_ledger IS 'Tracks consent, permissions, and usage rights for all ALMA knowledge contributions';
COMMENT ON TABLE alma_usage_log IS 'Tracks all usage of ALMA knowledge for attribution and revenue sharing';

COMMENT ON COLUMN alma_interventions.consent_level IS 'Private (node only), Community Controlled (requires approval), or Public (open with attribution)';
COMMENT ON COLUMN alma_interventions.cultural_authority IS 'Who holds authority over this intervention (Elder council, community org, etc.) - REQUIRED for community-controlled practices';
COMMENT ON COLUMN alma_interventions.portfolio_score IS 'Calculated portfolio intelligence score based on 5 weighted signals';
```

---

## Migration 2: Row-Level Security for ALMA

File: `/Users/benknight/Code/JusticeHub/supabase/migrations/20250131000002_alma_rls_policies.sql`

```sql
-- =====================================================
-- ALMA Row-Level Security Policies
-- Extends JusticeHub RLS patterns with ALMA governance
-- =====================================================

-- =====================================================
-- 1. ALMA INTERVENTIONS RLS
-- =====================================================

ALTER TABLE alma_interventions ENABLE ROW LEVEL SECURITY;

-- Public Read: Published interventions with Public consent level
CREATE POLICY "Public can view published public interventions"
  ON alma_interventions FOR SELECT
  USING (
    review_status = 'Published'
    AND consent_level = 'Public Knowledge Commons'
  );

-- Community Controlled Read: Approved interventions viewable by authenticated users
CREATE POLICY "Authenticated users can view approved community-controlled interventions"
  ON alma_interventions FOR SELECT
  TO authenticated
  USING (
    review_status IN ('Approved', 'Published')
    AND consent_level = 'Community Controlled'
  );

-- Organization Members: Can view their organization's interventions (any status)
CREATE POLICY "Organization members can view their organization's interventions"
  ON alma_interventions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Platform Admins: Full access
CREATE POLICY "Platform admins have full access to interventions"
  ON alma_interventions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Organization Admins: Can insert/update their organization's interventions
CREATE POLICY "Organization admins can manage their organization's interventions"
  ON alma_interventions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- 2. COMMUNITY CONTEXTS RLS
-- =====================================================

ALTER TABLE alma_community_contexts ENABLE ROW LEVEL SECURITY;

-- Public Read: Public consent level only
CREATE POLICY "Public can view public community contexts"
  ON alma_community_contexts FOR SELECT
  USING (consent_level = 'Public Knowledge Commons');

-- Authenticated Read: Community Controlled
CREATE POLICY "Authenticated users can view community-controlled contexts"
  ON alma_community_contexts FOR SELECT
  TO authenticated
  USING (consent_level IN ('Community Controlled', 'Public Knowledge Commons'));

-- Platform Admins: Full access
CREATE POLICY "Platform admins have full access to community contexts"
  ON alma_community_contexts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Creators: Can manage contexts they created
CREATE POLICY "Users can manage contexts they created"
  ON alma_community_contexts FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 3. EVIDENCE RLS
-- =====================================================

ALTER TABLE alma_evidence ENABLE ROW LEVEL SECURITY;

-- Public Read: Public consent level
CREATE POLICY "Public can view public evidence"
  ON alma_evidence FOR SELECT
  USING (consent_level = 'Public Knowledge Commons');

-- Authenticated Read: Community Controlled
CREATE POLICY "Authenticated users can view community-controlled evidence"
  ON alma_evidence FOR SELECT
  TO authenticated
  USING (consent_level IN ('Community Controlled', 'Public Knowledge Commons'));

-- Platform Admins: Full access
CREATE POLICY "Platform admins have full access to evidence"
  ON alma_evidence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Creators: Can manage evidence they created
CREATE POLICY "Users can manage evidence they created"
  ON alma_evidence FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 4. OUTCOMES RLS
-- =====================================================

ALTER TABLE alma_outcomes ENABLE ROW LEVEL SECURITY;

-- Public Read: All outcomes are reference data
CREATE POLICY "Everyone can view outcomes"
  ON alma_outcomes FOR SELECT
  USING (true);

-- Platform Admins: Can manage outcomes
CREATE POLICY "Platform admins can manage outcomes"
  ON alma_outcomes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =====================================================
-- 5. RELATIONSHIP TABLES RLS
-- =====================================================

-- Intervention-Outcome relationships
ALTER TABLE alma_intervention_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relationship visibility follows intervention visibility"
  ON alma_intervention_outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alma_interventions
      WHERE id = intervention_id
    ) -- If user can see intervention, they can see its relationships
  );

CREATE POLICY "Organization admins can manage intervention-outcome relationships"
  ON alma_intervention_outcomes FOR ALL
  TO authenticated
  USING (
    intervention_id IN (
      SELECT id FROM alma_interventions
      WHERE organization_id IN (
        SELECT organization_id FROM org_memberships
        WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'owner')
      )
    )
  );

-- Intervention-Evidence relationships (same pattern)
ALTER TABLE alma_intervention_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evidence relationship visibility follows intervention visibility"
  ON alma_intervention_evidence FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM alma_interventions WHERE id = intervention_id)
  );

CREATE POLICY "Organization admins can manage intervention-evidence relationships"
  ON alma_intervention_evidence FOR ALL
  TO authenticated
  USING (
    intervention_id IN (
      SELECT id FROM alma_interventions
      WHERE organization_id IN (
        SELECT organization_id FROM org_memberships
        WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'owner')
      )
    )
  );

-- Intervention-Context relationships (same pattern)
ALTER TABLE alma_intervention_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Context relationship visibility follows intervention visibility"
  ON alma_intervention_contexts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM alma_interventions WHERE id = intervention_id)
  );

CREATE POLICY "Organization admins can manage intervention-context relationships"
  ON alma_intervention_contexts FOR ALL
  TO authenticated
  USING (
    intervention_id IN (
      SELECT id FROM alma_interventions
      WHERE organization_id IN (
        SELECT organization_id FROM org_memberships
        WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'owner')
      )
    )
  );

-- Evidence-Outcome relationships
ALTER TABLE alma_evidence_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evidence-outcome relationships follow evidence visibility"
  ON alma_evidence_outcomes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM alma_evidence WHERE id = evidence_id)
  );

CREATE POLICY "Platform admins can manage evidence-outcome relationships"
  ON alma_evidence_outcomes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =====================================================
-- 6. CONSENT LEDGER RLS
-- =====================================================

ALTER TABLE alma_consent_ledger ENABLE ROW LEVEL SECURITY;

-- Platform admins and consent grantors can view
CREATE POLICY "Consent ledger viewable by admins and grantors"
  ON alma_consent_ledger FOR SELECT
  TO authenticated
  USING (
    -- Platform admins
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
    OR
    -- User who granted consent
    granted_by = auth.uid()
  );

-- Only platform admins can modify
CREATE POLICY "Only platform admins can modify consent ledger"
  ON alma_consent_ledger FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =====================================================
-- 7. USAGE LOG RLS
-- =====================================================

ALTER TABLE alma_usage_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all
CREATE POLICY "Platform admins can view all usage logs"
  ON alma_usage_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Users can view their own usage
CREATE POLICY "Users can view their own usage logs"
  ON alma_usage_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert (for tracking)
CREATE POLICY "Authenticated users can log usage"
  ON alma_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

---

## Linking ALMA to Existing JusticeHub Tables

### Strategy: Bidirectional Links

**Services ↔ Interventions**:
- `alma_interventions.service_id` → `services.id` (optional FK)
- Allows existing services to "become" ALMA interventions
- Services continue functioning independently
- ALMA adds governance + evidence layer

**Stories ↔ Evidence**:
- Stories can be linked as "Lived Experience" evidence
- `alma_evidence.source_document` can reference story ID
- Maintains anonymity via existing consent_records

**Organizations ↔ Interventions**:
- `alma_interventions.organization_id` → `organizations.id`
- Organizations get ALMA config in `empathy_ledger_config JSONB`
- RLS inherits organization membership patterns

**Cross-Project Metrics ↔ Portfolio Signals**:
- `cross_project_metrics` stores calculated portfolio scores
- Daily/weekly job aggregates ALMA signals
- Feeds into Empathy Ledger dashboards

---

## TypeScript Types for ALMA

File: `/Users/benknight/Code/JusticeHub/src/types/alma.ts`

```typescript
// ALMA Youth Justice Ontology Types

export type ConsentTier =
  | 'Strictly Private'
  | 'Community Controlled'
  | 'Public Knowledge Commons';

export type PermittedUse =
  | 'query_internal'
  | 'publish_justicehub'
  | 'export_reports'
  | 'training_ai'
  | 'commercial';

export type ReviewStatus =
  | 'Draft'
  | 'Community Review'
  | 'Approved'
  | 'Published'
  | 'Archived';

export type InterventionType =
  | 'Prevention'
  | 'Early Intervention'
  | 'Diversion'
  | 'Therapeutic'
  | 'Wraparound Support'
  | 'Family Strengthening'
  | 'Cultural Connection'
  | 'Education/Employment'
  | 'Justice Reinvestment'
  | 'Community-Led';

export type EvidenceLevel =
  | 'Promising (community-endorsed, emerging evidence)'
  | 'Effective (strong evaluation, positive outcomes)'
  | 'Proven (RCT/quasi-experimental, replicated)'
  | 'Indigenous-led (culturally grounded, community authority)'
  | 'Untested (theory/pilot stage)';

export interface ALMAIntervention {
  id: string;
  service_id?: string; // Link to existing JusticeHub service
  organization_id?: string;

  name: string;
  slug: string;
  description?: string;

  intervention_type: InterventionType;
  target_cohort: string[];

  evidence_level?: EvidenceLevel;
  harm_risk_level?: 'Low' | 'Medium' | 'High' | 'Requires cultural review';
  risks?: string;

  implementation_cost?: string;
  cost_per_young_person?: number;
  scalability?: string;
  replication_readiness?: string;

  geography: string[];
  operating_organization?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  years_operating?: number;
  current_funding?: string;

  // ALMA Governance
  cultural_authority?: string;
  consent_level: ConsentTier;
  permitted_uses: PermittedUse[];
  contributors: string[];
  source_documents: SourceDocument[];

  review_status: ReviewStatus;

  // Portfolio signals
  portfolio_score?: number;
  evidence_strength_signal?: number;
  community_authority_signal?: number;
  harm_risk_signal?: number;
  implementation_capability_signal?: number;
  option_value_signal?: number;

  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
  created_by?: string;
  last_verified_at?: string;

  // Relations (populated via joins)
  outcomes?: ALMAOutcome[];
  evidence?: ALMAEvidence[];
  contexts?: ALMACommunityContext[];
  service?: any; // JusticeHub service if linked
}

export interface ALMACommunityContext {
  id: string;
  name: string;
  slug: string;
  context_type?: string;
  location?: string;
  population_size?: string;
  demographics?: string;
  system_factors?: string;
  protective_factors?: string;

  cultural_authority: string;
  consent_level: ConsentTier;

  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ALMAEvidence {
  id: string;
  title: string;
  evidence_type?: string;
  methodology?: string;
  sample_size?: number;
  timeframe?: string;
  findings: string;
  effect_size?: string;
  cultural_safety?: string;
  limitations?: string;

  author?: string;
  organization?: string;
  publication_date?: string;
  doi?: string;
  source_document?: SourceDocument;

  consent_level: ConsentTier;
  contributors: string[];

  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relations
  outcomes?: ALMAOutcome[];
}

export interface ALMAOutcome {
  id: string;
  name: string;
  outcome_type?: string;
  description?: string;
  measurement_method?: string;
  indicators?: string;
  time_horizon?: string;
  beneficiary?: string;

  created_at: string;
  updated_at: string;
}

export interface SourceDocument {
  url?: string;
  file_path?: string;
  title?: string;
  date?: string;
}

export interface ConsentRecord {
  id: string;
  entity_type: 'intervention' | 'evidence' | 'context' | 'outcome' | 'story';
  entity_id: string;

  contributors: string[];
  cultural_authority?: string;

  consent_tier: ConsentTier;
  permitted_uses: PermittedUse[];
  restrictions?: string;

  consent_date: string;
  expiry_date?: string;
  renewal_required: boolean;
  revenue_share_enabled: boolean;

  granted_by?: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  entity_type: 'intervention' | 'evidence' | 'context' | 'outcome' | 'story';
  entity_id: string;

  action: PermittedUse | 'portfolio_analytics';
  user_id?: string;
  destination?: string;
  attribution: string[];
  revenue_generated?: number;

  created_at: string;
}

export interface PortfolioSignals {
  evidence_strength: number;
  community_authority: number;
  harm_risk: number;
  implementation_capability: number;
  option_value: number;
  portfolio_score: number;
}

export interface ConsentCheckResult {
  allowed: boolean;
  reason?: string;
  consent_tier?: ConsentTier;
  contributors?: string[];
  permitted_uses?: PermittedUse[];
  required_action?: string;
}
```

---

## Next Steps: Implementation Sequence

1. **Run migrations** (Weeks 2-3):
   ```bash
   cd /Users/benknight/Code/JusticeHub
   npx supabase migration up # Runs both ALMA migrations
   ```

2. **Create service layer** (Week 3):
   - `/src/lib/alma/intervention-service.ts` - CRUD for interventions
   - `/src/lib/alma/consent-service.ts` - Consent checking middleware
   - `/src/lib/alma/portfolio-service.ts` - Signal calculation

3. **Build UI components** (Week 4):
   - Intervention form with consent workflow
   - Evidence linking interface
   - Portfolio dashboard

4. **Integrate with vector DB** (Week 4):
   - Ingest ALMA interventions into Supabase pgvector
   - Namespace: `alma:youth_justice:{consent_tier}`
   - Enable semantic search

5. **Test governance** (Week 5):
   - Consent gating enforcement
   - RLS compliance
   - Usage tracking

6. **Launch pilot** (Week 6):
   - Seed with 10-15 test interventions
   - Witta Harvest node workshop
   - First portfolio analysis

---

## Alignment with ACT's First Principles

**Human Dignity**: Consent-first architecture ensures no knowledge extraction

**Relational Trust**: Community authority embedded in schema, not policy

**Adaptive Systems**: JSONB metadata allows ontology evolution

**Horizontal Flows**: RLS enables peer organization access to community-controlled knowledge

**Indigenous Intelligence**: Cultural authority field + Indigenous-led evidence level prioritizes First Nations wisdom

**Nourishment not Extraction**: Revenue share + usage tracking ensures contributors benefit

---

**This integration transforms JusticeHub from a service directory into Australia's first community-governed youth justice intelligence commons.**

