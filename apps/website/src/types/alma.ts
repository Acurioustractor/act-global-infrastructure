/**
 * ALMA (Adaptive Learning & Measurement Architecture) TypeScript Types
 *
 * IMPACT OPERATING SYSTEM FOR THE ACT ECOSYSTEM
 * Generalized to cover Land, Studio, Harvest, and Art.
 *
 * Core Entities:
 * - Initiatives: Any action taken (projects, programs, enterprises, land practice)
 * - Contexts: Where it happens (Place, Community, Digital)
 * - Evidence: Why we do it (Research, Data, Story, Wisdom)
 * - Outcomes: What changed (Ecological, Social, Economic, Systemic)
 */

// =====================================
// ENUMS & CONSTANTS
// =====================================

export const InitiativeTypes = [
    // LAND
    'Regenerative Agriculture',
    'Conservation',
    'Rewilding',
    'Land Management',

    // STUDIO
    'Digital Infrastructure',
    'Open Source Tool',
    'Data Sovereignty',
    'Research/R&D',

    // HARVEST
    'Community Enterprise',
    'Food System',
    'Event/Gathering',
    'Education/Workshop',

    // ART
    'Cultural Production',
    'Storytelling',
    'Public Installation',

    // GOVERNANCE
    'Governance Framework',
    'Policy/Advocacy',
] as const;

export type InitiativeType = typeof InitiativeTypes[number];

export const OutcomeTypes = [
    // ECOLOGICAL
    'Biodiversity Increase',
    'Carbon Sequestration',
    'Soil Health',
    'Water Quality',
    'Habitat Restoration',

    // SOCIAL
    'Community Cohesion',
    'Cultural Safety',
    'Knowledge Sovereignty',
    'Health/Wellbeing',
    'Skills/Capability',

    // ECONOMIC
    'Local Wealth Circulated',
    'Cost Savings',
    'Artist/Maker Income',
    'Livelihood Creation',

    // SYSTEMIC
    'Policy Shift',
    'Narrative Change',
    'System Pattern Shift',
] as const;

export type OutcomeType = typeof OutcomeTypes[number];

export const EvidenceLevels = [
    'Promising (community-endorsed, emerging evidence)',
    'Effective (strong evaluation, positive outcomes)',
    'Proven (RCT/quasi-experimental, replicated)',
    'Indigenous-led (culturally grounded, community authority)',
    'Sensor-verified (IoT/biometric data)',
    'Untested (theory/pilot stage)',
] as const;

export type EvidenceLevel = typeof EvidenceLevels[number];

export const ConsentLevels = [
    'Public Knowledge Commons',
    'Community Controlled',
    'Strictly Private',
] as const;

export type ConsentLevel = typeof ConsentLevels[number];

export const PermittedUses = [
    'Query (internal)',
    'Publish (Public)',
    'Export (reports)',
    'Training (AI)',
    'Commercial',
] as const;

export type PermittedUse = typeof PermittedUses[number];

export const HarmRiskLevels = [
    'Low',
    'Medium',
    'High',
    'Requires cultural review',
] as const;

export type HarmRiskLevel = typeof HarmRiskLevels[number];

// Replaced ImplementationCosts with simpler T-shirt sizing
export const ResourceRequirements = [
    'Low (<$10k)',
    'Medium ($10k-$50k)',
    'High ($50k-$200k)',
    'Major (>$200k)',
    'Voluntary/In-kind',
] as const;

export type ResourceRequirement = typeof ResourceRequirements[number];

export const Scalabilities = [
    'Place-based (Local)',
    'Bioregional',
    'National',
    'Global/Digital',
    'Context-dependent',
] as const;

export type Scalability = typeof Scalabilities[number];

export const ReplicationReadinesses = [
    'Not ready (needs more development)',
    'Ready with support (requires adaptation guidance)',
    'Ready (playbook/forkable)',
    'Community authority required',
] as const;

export type ReplicationReadiness = typeof ReplicationReadinesses[number];

export const InitiativeStatuses = [
    'Idea/Concept',
    'Designing',
    'Active/Running',
    'Paused',
    'Completed',
    'Archived',
] as const;

export type InitiativeStatus = typeof InitiativeStatuses[number];

export const ContextTypes = [
    'Bioregion',
    'First Nations Country',
    'Rural Community',
    'Urban Community',
    'Digital Community',
    'Organization/Institution',
] as const;

export type ContextType = typeof ContextTypes[number];

export const EvidenceTypes = [
    'Academic Research',
    'Evaluation Report',
    'Case Study',
    'Lived Experience/Story',
    'Cultural Knowledge',
    'Sensor/Biometric Data',
    'Code/Github Commit',
    'Oral History',
    'Policy Analysis',
] as const;

export type EvidenceType = typeof EvidenceTypes[number];

export const CulturalSafeties = [
    'Culturally grounded (led by community)',
    'Culturally adapted (with community input)',
    'Culturally neutral',
    'Cultural safety concerns',
    'Unknown',
] as const;

export type CulturalSafety = typeof CulturalSafeties[number];

export const TimeHorizons = [
    'Immediate (<6 months)',
    'Short-term (6-12 months)',
    'Medium-term (1-3 years)',
    'Long-term (3+ years)',
    'Intergenerational',
] as const;

export type TimeHorizon = typeof TimeHorizons[number];

export const EntityTypes = [
    'initiative',
    'context',
    'evidence',
    'outcome',
] as const;

export type EntityType = typeof EntityTypes[number];

export const UsageActions = [
    'query',
    'view',
    'export',
    'publish',
    'training',
    'commercial',
] as const;

export type UsageAction = typeof UsageActions[number];

// =====================================
// CORE ENTITY TYPES
// =====================================

export interface ALMAInitiative {
    id: string;
    created_at: string;
    updated_at: string;

    // Basic Information
    name: string;
    type: InitiativeType;
    description: string;
    status: InitiativeStatus;

    // Target & Context
    target_audience: string[]; // e.g., 'Artists', 'Farmers', 'Youth'
    locations: string[]; // e.g., 'Black Cockatoo Valley', 'Witta'

    // Evidence & Authority
    evidence_level?: EvidenceLevel;
    cultural_authority?: string;
    consent_level: ConsentLevel;
    permitted_uses: PermittedUse[];
    contributors: string[];
    source_documents: any[]; // JSONB

    // Risk Assessment
    risks?: string;
    harm_risk_level?: HarmRiskLevel;

    // Implementation Details
    resource_requirement?: ResourceRequirement;
    cost_description?: string; // Generalized from cost_per_young_person
    scalability?: Scalability;
    replication_readiness?: ReplicationReadiness;

    // Operating Entity
    lead_organization?: string; // Replaced operating_organization
    contact_person?: string;
    contact_email?: string;
    website?: string;
    start_date?: string;
    end_date?: string;

    // Portfolio Analytics
    portfolio_score?: number;
    evidence_strength_signal?: number;
    community_authority_signal?: number;
    harm_risk_signal?: number;
    implementation_capability_signal?: number;
    option_value_signal?: number;

    // Workflow & Review
    review_status: string; // Draft, Published etc.
    reviewed_by?: string;
    reviewed_at?: string;

    // Activity Linking (ACT Specific)
    linked_project_id?: string; // Link to ACT Projects

    // Metadata
    metadata?: Record<string, any>;
}

export interface ALMAContext {
    id: string;
    created_at: string;
    updated_at: string;

    // Basic Information
    name: string;
    context_type: ContextType;

    // Location
    location_description?: string;
    bioregion?: string;
    coordinates?: string; // GeoJSON or string

    // Context Description
    description?: string;
    ecological_features?: string;
    cultural_features?: string;

    // Governance (ALWAYS REQUIRED)
    cultural_authority: string;
    consent_level: ConsentLevel;
    contributors: string[];

    // Metadata
    metadata?: Record<string, any>;
}

export interface ALMAEvidence {
    id: string;
    created_at: string;
    updated_at: string;

    // Basic Information
    title: string;
    evidence_type: EvidenceType;

    // Details
    methodology?: string;
    findings: string;
    limitations?: string;

    // Cultural Safety
    cultural_safety?: CulturalSafety;

    // Source Information
    author?: string;
    organization?: string;
    publication_date?: string;
    source_url?: string;

    // Governance
    consent_level: ConsentLevel;
    contributors: string[];

    // Metadata
    metadata?: Record<string, any>;
}

export interface ALMAOutcome {
    id: string;
    created_at: string;
    updated_at: string;

    // Basic Information
    name: string;
    outcome_type: OutcomeType;
    description?: string;

    // Measurement
    unit?: string; // e.g. 'tonnes', 'people', '%'
    measurement_method?: string;
    indicators?: string;
    time_horizon?: TimeHorizon;

    // Alignment
    sdg_targets?: string[]; // UN SDGs

    // Metadata
    metadata?: Record<string, any>;
}

// =====================================
// RELATIONSHIP TYPES
// =====================================

export interface ALMAInitiativeOutcome {
    id: string;
    initiative_id: string;
    outcome_id: string;
    created_at: string;
}

export interface ALMAInitiativeEvidence {
    id: string;
    initiative_id: string;
    evidence_id: string;
    created_at: string;
}

export interface ALMAInitiativeContext {
    id: string;
    initiative_id: string;
    context_id: string;
    created_at: string;
}

// =====================================
// EXPORT ALL
// =====================================

export type {
    ALMAInitiative as Initiative,
    ALMAContext as Context,
    ALMAEvidence as Evidence,
    ALMAOutcome as Outcome,
};
