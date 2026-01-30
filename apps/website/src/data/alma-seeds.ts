
// Static data for ALMA Impact Dashboard (Local Mock)

export type AlmaType = 'Land' | 'Studio' | 'Harvest';
export type EvidenceStrength = 'High' | 'Medium' | 'Low' | 'Emerging';
export type CommunityAuthority = 'High' | 'Medium' | 'Low' | 'None';

export interface Initiative {
    title: string;
    slug: string;
    type: AlmaType;
    description: string;
    status: 'active' | 'incubating' | 'completed' | 'archived';
    outcome_focus: string;
    community_authority: CommunityAuthority;
    evidence_strength: EvidenceStrength;
    context_tags: string[];
}

export const REAL_INITIATIVES: Initiative[] = [
    {
        title: '10x10 Community Capital Leadership Retreat', slug: '10x10-retreat', type: 'Harvest',
        description: 'Leadership retreat to grow community capital and shared enterprise practice.', status: 'active',
        outcome_focus: 'Community capital growth, shared practice', community_authority: 'Medium', evidence_strength: 'Medium',
        context_tags: ['Leadership', 'Community Capital', 'Retreat', 'Education/Workshop']
    },
    { title: 'ACT Monthly Dinners', slug: 'act-dinners', type: 'Harvest', description: 'Regular community dinners for listening, connection, and relationship-building.', status: 'active', outcome_focus: 'Relationship building, community connection', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Community', 'Connection', 'Gathering', 'Event/Gathering'] },
    { title: 'ACT stop, revive, thrive in Bali', slug: 'act-bali-retreat', type: 'Studio', description: 'Rest and renewal program for capacity and strategy reset.', status: 'active', outcome_focus: 'Capacity building, strategy reset, wellbeing', community_authority: 'Low', evidence_strength: 'Low', context_tags: ['Wellbeing', 'Retreat', 'Strategy', 'Education/Workshop'] },
    { title: 'ANAT SPECTRA 2025', slug: 'anat-spectra-2025', type: 'Studio', description: 'Storytelling and creative research collaboration.', status: 'active', outcome_focus: 'Creative research, storytelling', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Arts', 'Research', 'Storytelling'] },
    { title: 'BG Fit', slug: 'bg-fit', type: 'Studio', description: 'Lived-experience youth wellbeing and justice program in Mount Isa.', status: 'active', outcome_focus: 'Youth wellbeing, justice diversion', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Mount Isa', 'Youth Justice', 'Wellbeing', 'Community Enterprise'] },
    { title: 'Cars and microcontrollers', slug: 'cars-microcontrollers', type: 'Studio', description: 'Hands-on learning and making program for skills and confidence.', status: 'active', outcome_focus: 'Skills development, confidence', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Education', 'Tech', 'Youth', 'Education/Workshop'] },
    { title: 'Contained', slug: 'contained', type: 'Studio', description: 'Experiential justice installation exploring alternatives to detention.', status: 'active', outcome_focus: 'Public awareness, policy advocacy', community_authority: 'Medium', evidence_strength: 'Medium', context_tags: ['Justice', 'Arts', 'Installation', 'Public Installation'] },
    { title: 'Custodian Economy', slug: 'custodian-economy', type: 'Studio', description: 'Economic model work for community ownership and stewardship.', status: 'active', outcome_focus: 'Economic modeling, community ownership', community_authority: 'High', evidence_strength: 'High', context_tags: ['Economics', 'Stewardship', 'Research', 'Research/R&D'] },
    { title: 'Dad.Lab.25', slug: 'dad-lab-25', type: 'Studio', description: 'Father connection and wellbeing program.', status: 'active', outcome_focus: 'Family connection, wellbeing', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Family', 'Wellbeing', 'Men', 'Education/Workshop'] },
    { title: 'Designing for Obsolescence', slug: 'designing-obsolescence', type: 'Studio', description: 'Core methodology for handover and community ownership.', status: 'active', outcome_focus: 'Methodology development, sustainable exit strategies', community_authority: 'High', evidence_strength: 'High', context_tags: ['Methodology', 'Design', 'Community Ownership', 'Research/R&D'] },
    { title: 'Diagrama', slug: 'diagrama', type: 'Studio', description: 'Justice learning partnership and reference practice from Spain.', status: 'active', outcome_focus: 'International knowledge exchange, best practice', community_authority: 'Medium', evidence_strength: 'Medium', context_tags: ['Justice', 'International', 'Partnership', 'Research/R&D'] },
    { title: 'Empathy Ledger', slug: 'empathy-ledger', type: 'Studio', description: 'Consent-first storytelling platform for community voice.', status: 'active', outcome_focus: 'Narrative sovereignty, data rights', community_authority: 'High', evidence_strength: 'High', context_tags: ['Tech', 'Storytelling', 'Data Rights', 'Digital Infrastructure'] },
    { title: 'Fairfax & PLACE tech', slug: 'fairfax-place-tech', type: 'Studio', description: 'Place-based technology partnership and research.', status: 'active', outcome_focus: 'Place-based tech research', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Tech', 'Place', 'Research', 'Research/R&D'] },
    { title: 'Fishers Oysters', slug: 'fishers-oysters', type: 'Land', description: 'Indigenous-led aquaculture restoring oyster reefs and sovereignty.', status: 'active', outcome_focus: 'Economic sovereignty, land restoration', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Aquaculture', 'Indigenous', 'Land Care', 'Community Enterprise'] },
    { title: 'Gold.Phone', slug: 'gold-phone', type: 'Studio', description: 'Experimental communication tool for community storytelling.', status: 'active', outcome_focus: 'Storytelling innovation', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Tech', 'Storytelling', 'Experiment', 'Digital Infrastructure'] },
    { title: 'Goods.', slug: 'goods', type: 'Harvest', description: 'Essential goods co-designed with community for health and dignity.', status: 'active', outcome_focus: 'Health, dignity, economic outcome', community_authority: 'High', evidence_strength: 'High', context_tags: ['Health', 'Co-design', 'Enterprise', 'Community Enterprise'] },
    { title: 'June\'s Patch', slug: 'junes-patch', type: 'Land', description: 'Land-based wellbeing and food program.', status: 'active', outcome_focus: 'Food security, wellbeing', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Food', 'Land', 'Wellbeing', 'Land Management'] },
    { title: 'JusticeHub', slug: 'justicehub', type: 'Studio', description: 'Community-owned justice infrastructure and knowledge sharing.', status: 'active', outcome_focus: 'Infrastructure, knowledge sharing', community_authority: 'High', evidence_strength: 'High', context_tags: ['Justice', 'Infrastructure', 'Community', 'Digital Infrastructure'] },
    { title: 'MingaMinga Rangers', slug: 'mingaminga-rangers', type: 'Land', description: 'Ranger pathway supporting land care and local capability.', status: 'active', outcome_focus: 'Land care, employment pathways', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Rangers', 'Land Care', 'Employment', 'Land Management'] },
    { title: 'MMEIC - Justice Projects', slug: 'mmeic-justice', type: 'Harvest', description: 'Justice reinvestment partnership with Minjerribah Moorgumpin Elders-In-Council.', status: 'active', outcome_focus: 'Justice reinvestment, community partnership', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Justice', 'Minjerribah', 'Elders', 'Community Enterprise'] },
    { title: 'Mounty Yarns', slug: 'mounty-yarns', type: 'Studio', description: 'Storytelling and youth justice connection in Melbourne.', status: 'active', outcome_focus: 'Storytelling, connection', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Storytelling', 'Melbourne', 'Youth Justice', 'Storytelling'] },
    { title: 'NFP leaders interview project', slug: 'nfp-leaders-interview', type: 'Studio', description: 'Research interviews to map sector learning.', status: 'active', outcome_focus: 'Sector learning, research insights', community_authority: 'Low', evidence_strength: 'Emerging', context_tags: ['Research', 'Leadership', 'NFP', 'Research/R&D'] },
    { title: 'Oonchiumpa', slug: 'oonchiumpa', type: 'Studio', description: 'Community-led healing and justice initiative in Central Australia.', status: 'active', outcome_focus: '95% offending reduction, healing', community_authority: 'High', evidence_strength: 'High', context_tags: ['Healing', 'Central Australia', 'Justice', 'Aboriginal Led', 'Land Management'] },
    { title: 'PICC - Storm Stories', slug: 'picc-storm-stories', type: 'Studio', description: 'Community storytelling on storm memory and recovery.', status: 'active', outcome_focus: 'Community recovery, storytelling', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Storytelling', 'Recovery', 'PICC', 'Storytelling'] },
    { title: 'PICC Annual Report', slug: 'picc-annual-report', type: 'Studio', description: 'Community-led annual report and storytelling output.', status: 'active', outcome_focus: 'Communication, reporting', community_authority: 'Medium', evidence_strength: 'Low', context_tags: ['Reporting', 'Storytelling', 'PICC', 'Storytelling'] },
    { title: 'PICC Centre Precinct', slug: 'picc-centre-precinct', type: 'Land', description: 'Youth justice precinct and community hub development.', status: 'active', outcome_focus: 'Infrastructure, community hub', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Infrastructure', 'Development', 'PICC', 'Land Management'] },
    { title: 'PICC Elders\' trip to Hull River', slug: 'picc-elders-trip', type: 'Land', description: 'Elders\' on-Country visit and cultural reconnection.', status: 'active', outcome_focus: 'Cultural reconnection, wellbeing', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Culture', 'Elders', 'On-Country', 'PICC', 'Land Management'] },
    { title: 'PICC Photo Kiosk / Server', slug: 'picc-photo-kiosk', type: 'Studio', description: 'Community photo kiosk and local archive infrastructure.', status: 'active', outcome_focus: 'Archiving, community access', community_authority: 'Medium', evidence_strength: 'Medium', context_tags: ['Tech', 'Archive', 'PICC', 'Digital Infrastructure'] },
    { title: 'Project Her Self design', slug: 'project-her-self', type: 'Studio', description: 'Design and storytelling project for women\'s empowerment.', status: 'active', outcome_focus: 'Empowerment, design', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Women', 'Design', 'Storytelling', 'Storytelling'] },
    { title: 'Regional Arts Fellowship', slug: 'regional-arts-fellowship', type: 'Studio', description: 'Fellowship supporting regional arts practice.', status: 'active', outcome_focus: 'Arts practice support', community_authority: 'Low', evidence_strength: 'Emerging', context_tags: ['Arts', 'Fellowship', 'Cultural Production'] },
    { title: 'SMART Connect', slug: 'smart-connect', type: 'Studio', description: 'Connection pathway for recovery and community support.', status: 'active', outcome_focus: 'Recovery, connection', community_authority: 'Medium', evidence_strength: 'Medium', context_tags: ['Recovery', 'Support', 'SMART', 'Education/Workshop'] },
    { title: 'SMART HCP GP Uplift Project', slug: 'smart-hcp-gp-uplift', type: 'Studio', description: 'Primary care referral and uplift workstream.', status: 'active', outcome_focus: 'Healthcare integration, referral pathways', community_authority: 'Low', evidence_strength: 'Medium', context_tags: ['Health', 'SMART', 'System Integration', 'Research/R&D'] },
    { title: 'The Confessional', slug: 'the-confessional', type: 'Studio', description: 'Storytelling installation for anonymous truth-telling.', status: 'active', outcome_focus: 'Truth-telling, emotional release', community_authority: 'Low', evidence_strength: 'Emerging', context_tags: ['Arts', 'Installation', 'Storytelling', 'Public Installation'] },
    { title: 'Travelling women\'s car', slug: 'travelling-womens-car', type: 'Studio', description: 'Mobile cultural preservation and storytelling project.', status: 'active', outcome_focus: 'Cultural preservation, storytelling', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Culture', 'Women', 'Mobile', 'Cultural Production'] },
    { title: 'Uncle Allan Palm Island Art', slug: 'uncle-allan-art', type: 'Studio', description: 'Art practice and cultural knowledge sharing.', status: 'active', outcome_focus: 'Cultural knowledge, art', community_authority: 'High', evidence_strength: 'Medium', context_tags: ['Art', 'Culture', 'Palm Island', 'Cultural Production'] },
    { title: 'Witta Harvest HQ', slug: 'witta-harvest-hq', type: 'Harvest', description: 'Witta enterprise hub and community innovation site.', status: 'active', outcome_focus: 'Enterprise hub, innovation', community_authority: 'Medium', evidence_strength: 'Emerging', context_tags: ['Enterprise', 'Hub', 'Witta', 'Community Enterprise'] }
];

export interface Context {
    name: string;
    context_type: string;
    cultural_authority: string;
    location_description?: string;
    bioregion?: string;
    description?: string;
    ecological_features?: string;
}

export const REAL_CONTEXTS: Context[] = [
    {
        name: 'Black Cockatoo Valley', context_type: 'Rural Community', cultural_authority: 'Jinibara',
        bioregion: 'South East Queensland', location_description: 'Running Creek',
        description: 'A regenerative living lab and home of the ACT Studio.',
        ecological_features: 'Wet sclerophyll forest, creek system, endangered species habitat.'
    },
    {
        name: 'Witta', context_type: 'Rural Community', cultural_authority: 'Jinibara',
        bioregion: 'South East Queensland', location_description: 'Maleny Plateau',
        description: 'Community node for regenerative agriculture and food systems.',
        ecological_features: 'High rainfall, volcanic soil, plateau ecosystem.'
    },
    {
        name: 'Minjerribah (North Stradbroke Island)', context_type: 'First Nations Country', cultural_authority: 'Quandamooka',
        bioregion: 'Moreton Bay', location_description: 'Island sand mass',
        description: 'Traditional Country of the Quandamooka people, site of justice reinvestment and aquaculture.',
        ecological_features: 'Sand island, wetlands, marine ecosystem, wallum heath.'
    },
    {
        name: 'Palm Island (Bwgcolman)', context_type: 'First Nations Country', cultural_authority: 'Bwgcolman',
        bioregion: 'Great Barrier Reef', location_description: 'Tropical Island',
        description: 'Aboriginal community with strong cultural governance and economic sovereignty initiatives.',
        ecological_features: 'Tropical island, reef, mountain.'
    },
    {
        name: 'Central Australia (Arrernte Country)', context_type: 'First Nations Country', cultural_authority: 'Arrernte',
        bioregion: 'Central Desert', location_description: 'Alice Springs / Surrounds',
        description: 'Site of Oonchiumpa Youth Services and deep cultural healing work.',
        ecological_features: 'Desert landscape, river red gums, ranges.'
    },
    {
        name: 'Mount Isa', context_type: 'Rural Community', cultural_authority: 'Kalkadoon',
        bioregion: 'North West Queensland', location_description: 'Mining Town',
        description: 'Regional hub for youth justice and wellbeing programs like BG Fit.',
        ecological_features: 'Semi-arid, mineral rich, ranges.'
    },
    {
        name: 'ACT Global Studio', context_type: 'Digital Community', cultural_authority: 'ACT Governance',
        bioregion: 'Global', description: 'The digital connective tissue and knowledge commons for the ecosystem.',
        ecological_features: 'Digital infrastructure, knowledge graph.'
    }
];

export interface Evidence {
    title: string;
    evidence_type: string;
    findings: string;
    consent_level: string;
}

export const REAL_EVIDENCE: Evidence[] = [
    { title: 'Oonchiumpa Outcomes Framework 2024', evidence_type: 'Evaluation Report', findings: '95% reduction in offending behaviour; 72% re-engagement with education; 89% retention rate in program.', consent_level: 'Community Controlled' },
    { title: 'Goods. Impact Assessment', evidence_type: 'Case Study', findings: '$550,000 in funding secured; 5 partner organisations onboarded; established sovereign procurement channels.', consent_level: 'Public Knowledge Commons' },
    { title: 'Empathy Ledger Pilot Data', evidence_type: 'Lived Experience/Story', findings: 'Validated "Story Sovereignty" model with 50+ participants; developed reusable digital infrastructure.', consent_level: 'Public Knowledge Commons' },
    { title: 'Fishers Oysters Annual Review', evidence_type: 'Evaluation Report', findings: 'Successful seeding of new oyster beds; 5 youth employed in land-sea management roles.', consent_level: 'Community Controlled' },
    { title: 'Diagrama Impact Analysis', evidence_type: 'Policy Analysis', findings: 'Spanish model demonstrates 30% lower recidivism than standard detention models.', consent_level: 'Public Knowledge Commons' }
];
