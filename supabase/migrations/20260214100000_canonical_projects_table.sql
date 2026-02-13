-- Canonical projects table: single source of truth for all ACT project codes
-- Replaces config/project-codes.json as the authoritative project registry

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tier TEXT CHECK (tier IN ('ecosystem', 'studio', 'satellite')),
    importance_weight INTEGER DEFAULT 5 CHECK (importance_weight BETWEEN 1 AND 10),
    status TEXT DEFAULT 'active',
    priority TEXT,
    leads TEXT[] DEFAULT '{}',
    -- Cross-system mappings
    notion_page_id TEXT,
    notion_pages TEXT[] DEFAULT '{}',
    ghl_tags TEXT[] DEFAULT '{}',
    xero_tracking TEXT,
    dext_category TEXT,
    alma_program TEXT,
    lcaa_themes TEXT[] DEFAULT '{}',
    cultural_protocols BOOLEAN DEFAULT FALSE,
    parent_project TEXT REFERENCES projects(code),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Index for common queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_tier ON projects(tier);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_importance ON projects(importance_weight DESC);

-- Seed all 59 projects from config/project-codes.json
-- Importance weights: ecosystem active=9-10, studio active=7-8, satellite active=5-6, ideation=4-5, archived=2-3

-- First: insert projects WITHOUT parent_project references
INSERT INTO projects (code, name, description, category, tier, importance_weight, status, priority, leads, notion_page_id, notion_pages, ghl_tags, xero_tracking, dext_category, alma_program, lcaa_themes, cultural_protocols, metadata) VALUES

-- ECOSYSTEM (weight 9-10)
('ACT-JH', 'JusticeHub', 'Youth justice reform network', 'justice', 'ecosystem', 10, 'active', 'high',
 ARRAY['Ben Knight', 'Nic Marchesi'], '179ebcf9-81cf-8005-ad63-d2a736280011',
 ARRAY['JusticeHub', 'Justice Hub Network', 'JusticeHub - Centre of Excellence'],
 ARRAY['justicehub', 'justice', 'youth justice', 'youth-justice'], 'JusticeHub', 'Justice Projects', 'justice-reform',
 ARRAY['Listen', 'Connect', 'Act', 'Amplify'], FALSE, '{}'),

('ACT-GD', 'Goods', 'Social enterprise marketplace', 'enterprise', 'ecosystem', 9, 'active', 'high',
 ARRAY['Maddi Alderuccio'], '177ebcf9-81cf-805f-b111-f407079f9794',
 ARRAY['Goods.'], ARRAY['goods'], 'Goods', 'Social Enterprise', 'economic-empowerment',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-EL', 'Empathy Ledger', 'Story collection platform', 'stories', 'ecosystem', 10, 'active', 'high',
 ARRAY['Ben Knight'], '187ebcf9-81cf-8032-a28f-db8b76442ecd',
 ARRAY['Empathy Ledger', 'Empathy Ledger Platform'],
 ARRAY['empathy-ledger', 'empathy ledger', 'empathy', 'storytelling', 'storyteller'], 'Empathy Ledger', 'Technology', 'storytelling',
 ARRAY['Listen', 'Amplify'], FALSE, '{}'),

('ACT-FM', 'The Farm', 'Land-based healing and cultural connection', 'regenerative', 'ecosystem', 9, 'active', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['The Farm', 'ACT Farm'], ARRAY['farm', 'the-farm'], 'The Farm', 'Regenerative', 'land-healing',
 ARRAY[]::TEXT[], FALSE, '{"github_repo": "Acurioustractor/act-farm", "production_url": "https://act-farm.vercel.app"}'::jsonb),

('ACT-HV', 'The Harvest Witta', 'Community hub with therapeutic horticulture and heritage preservation in Witta', 'regenerative', 'ecosystem', 10, 'active', 'high',
 ARRAY['Nicholas Marchesi'], NULL,
 ARRAY['The Harvest Witta', 'Witta Harvest HQ'], ARRAY['harvest', 'the-harvest', 'witta', 'grant'], 'The Harvest', 'Regenerative', 'food-systems',
 ARRAY[]::TEXT[], FALSE, '{"github_repo": "Acurioustractor/harvest-community-hub", "production_url": "https://harvest-community.vercel.app", "location": "601 Maleny Kenilworth Rd, Witta QLD 4552", "place": "Gubbi Gubbi Country", "notion_id": "11debcf9-81cf-8082-8fd0-d6031a9709f2"}'::jsonb),

-- STUDIO ACTIVE (weight 7-8)
('ACT-PI', 'PICC', 'Palm Island Community Company', 'indigenous', 'studio', 8, 'active', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['PICC Centre Precinct', 'PICC Photo Kiosk / Server'], ARRAY['picc', 'palm-island'], 'PICC', 'Indigenous Projects', 'first-nations',
 ARRAY[]::TEXT[], TRUE, '{"notion_ids": {"centre_precinct": "253ebcf9-81cf-80e8-a8a8-d5dc42530cc5", "photo_kiosk": "22eebcf9-81cf-8002-abe6-d81960ea19da"}, "sub_projects": ["ACT-PS", "ACT-SS", "ACT-UA", "ACT-ER"]}'::jsonb),

('ACT-PS', 'PICC On Country Photo Studio', 'Mobile photo studio for Palm Island community storytelling', 'indigenous', 'studio', 7, 'active', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['PICC On Country Photo Studio'], ARRAY['picc', 'palm-island', 'photo-studio'], 'PICC', 'Indigenous Projects', 'first-nations',
 ARRAY['Listen', 'Amplify'], TRUE, '{}'),

('ACT-UA', 'Uncle Allan Palm Island Art', 'Indigenous art project', 'indigenous', 'studio', 7, 'active', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Uncle Allan Palm Island Art'], ARRAY['uncle-allan', 'palm-island-art'], 'Uncle Allan Art', 'Indigenous Projects', 'cultural-arts',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-CF', 'The Confessional', 'Story booth and intimate storytelling', 'stories', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], '229ebcf9-81cf-8004-b7ee-fe9a9683c75a',
 ARRAY['The Confessional'], ARRAY['confessional'], 'Confessional', 'Stories', 'storytelling',
 ARRAY['Listen'], FALSE, '{}'),

('ACT-GP', 'Gold Phone', 'Community connection project', 'stories', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Gold.Phone'], ARRAY['gold-phone', 'goldphone'], 'Gold Phone', 'Stories', 'connection',
 ARRAY['Listen', 'Connect'], FALSE, '{}'),

('ACT-MY', 'Mounty Yarns', 'Community storytelling', 'stories', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Mounty Yarns'], ARRAY['mounty-yarns'], 'Mounty Yarns', 'Stories', 'storytelling',
 ARRAY['Listen', 'Amplify'], FALSE, '{}'),

('ACT-RA', 'Regional Arts Fellowship', 'Regional arts fellowship', 'arts', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Regional Arts Fellowship'], ARRAY['regional-arts'], 'Regional Arts', 'Arts', 'regional-arts',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-CA', 'Caring for those who care', 'Art project supporting carers', 'arts', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Caring for those who care'], ARRAY['caring'], 'Caring', 'Arts', 'arts-impact',
 ARRAY['Listen', 'Amplify'], FALSE, '{}'),

('ACT-MC', 'Cars and Microcontrollers', 'Art and technology crossover project', 'arts', 'studio', 7, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Cars and microcontrollers'], ARRAY['cars-microcontrollers'], 'Cars Micro', 'Arts', 'arts-impact',
 ARRAY[]::TEXT[], FALSE, '{}'),

-- SATELLITE ACTIVE (weight 5-6)
('ACT-CN', 'Contained', 'Container-based community spaces', 'enterprise', 'satellite', 6, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Contained'], ARRAY['contained'], 'Contained', 'Social Enterprise', 'community-spaces',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-FO', 'Fishers Oysters', 'Sustainable oyster farming', 'regenerative', 'satellite', 6, 'active', 'medium',
 ARRAY['Shaun Fisher'], NULL,
 ARRAY['Fishers Oysters'], ARRAY['fishers-oysters', 'fishers'], 'Fishers Oysters', 'Regenerative', 'aquaculture',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-SM', 'SMART', 'Health and recovery initiatives', 'health', 'satellite', 6, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['SMART Connect', 'SMART Recovery', 'SMART HCP GP Uplift Project'], ARRAY['smart', 'smart-connect'], 'SMART', 'Health', 'health-wellbeing',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-MD', 'ACT Monthly Dinners', 'Monthly community gatherings', 'community', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['ACT Monthly Dinners'], ARRAY['act-monthly', 'dinners'], 'Monthly Dinners', 'Events', 'community-building',
 ARRAY['Connect'], FALSE, '{}'),

('ACT-JP', 'June''s Patch', 'Community garden project', 'regenerative', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['June''s Patch'], ARRAY['junes-patch', 'patch'], 'Junes Patch', 'Regenerative', 'community-gardens',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-BG', 'BG Fit', 'Fitness and wellbeing program', 'health', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['BG Fit'], ARRAY['bg-fit', 'bgfit'], 'BG Fit', 'Health', 'fitness',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-DL', 'DadLab', 'Fatherhood and parenting', 'community', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Dad.Lab.25'], ARRAY['dadlab'], 'DadLab', 'Community', 'parenting',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-CE', 'Custodian Economy', 'Economic model for custodianship', 'enterprise', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Custodian Economy'], ARRAY['custodian-economy'], 'Custodian Economy', 'Social Enterprise', 'economic-models',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-OO', 'Oonchiumpa', 'Indigenous community partnership', 'indigenous', 'satellite', 6, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Oonchiumpa'], ARRAY['oonchiumpa'], 'Oonchiumpa', 'Indigenous Projects', 'first-nations',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-DO', 'Designing for Obsolescence', 'Technology design and sustainability', 'tech', 'satellite', 5, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Designing for Obsolescence'], ARRAY['obsolescence'], 'Design Obs', 'Technology', 'economic-models',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-GL', 'Global Laundry Alliance', 'Orange Sky''s global network expansion', 'enterprise', 'satellite', 6, 'active', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Global Laundry Alliance (GLA)'], ARRAY['gla', 'global-laundry'], 'GLA', 'Social Enterprise', 'economic-empowerment',
 ARRAY[]::TEXT[], FALSE, '{}'),

-- IDEATION (weight 4-5)
('ACT-BB', 'Barkly Backbone', 'Barkly region backbone infrastructure', 'indigenous', 'satellite', 4, 'ideation', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Barkly Backbone'], ARRAY['barkly'], 'Barkly', 'Indigenous Projects', 'first-nations',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-JC', 'JusticeHub Centre of Excellence', 'Centre of excellence for youth justice reform', 'justice', 'satellite', 5, 'ideation', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['JusticeHub - Centre of Excellence'], ARRAY['justicehub', 'coe'], 'JusticeHub', 'Justice Projects', 'justice-reform',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-TR', 'Treacher', 'Art project in ideation', 'arts', 'studio', 4, 'ideation', 'low',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Treacher'], ARRAY['treacher'], 'Treacher', 'Arts', 'arts-impact',
 ARRAY[]::TEXT[], FALSE, '{}'),

-- ARCHIVED (weight 2-3)
('ACT-DG', 'Diagrama', 'Alternative education and rehabilitation', 'justice', NULL, 3, 'archived', 'high',
 ARRAY['Tina Morris', 'Kristy Bloomfield'], '179ebcf9-81cf-8076-95f2-e39db7b980a5',
 ARRAY['Diagrama'], ARRAY['diagrama'], 'Diagrama', 'Justice Projects', 'education-rehab',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-ER', 'PICC Elders Room', 'Hull River Elders video premiere, Elders Room launch, and PICC Annual Report', 'indigenous', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['PICC Elders'' trip to Hull River in October', 'PICC Annual Report'],
 ARRAY['picc', 'palm-island', 'elders-room', 'hull-river', 'annual-report'], 'PICC', 'Indigenous Projects', 'first-nations',
 ARRAY['Listen', 'Amplify'], TRUE,
 '{"notion_ids": {"hull_river": "261ebcf9-81cf-8009-b935-d0224f7ae130", "annual_report": "22eebcf9-81cf-808f-bad4-f9e0a6640252"}, "launch_date": "2026-02-07", "funding": {"hull_river": 60000, "annual_report": 70000, "total": 130000}}'::jsonb),

('ACT-SS', 'Storm Stories', 'Documentary and storytelling project capturing Palm Island community resilience', 'indigenous', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['PICC - Storm Stories', 'PICC Storm Stories'], ARRAY['picc', 'palm-island', 'storm-stories'], 'PICC', 'Indigenous Projects', 'first-nations',
 ARRAY['Listen', 'Amplify'], TRUE, '{"notion_ids": {"main": "178ebcf9-81cf-801c-8815-fb32a9259a1c"}}'::jsonb),

('ACT-MR', 'MingaMinga Rangers', 'Indigenous ranger program', 'indigenous', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['MingaMinga Rangers'], ARRAY['mingaminga', 'rangers'], 'MingaMinga', 'Indigenous Projects', 'land-management',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-MN', 'Maningrida', 'Justice reinvestment initiative', 'justice', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], '1e7ebcf9-81cf-8038-9969-ccc7fb897b43',
 ARRAY['Maningrida - Justice Reinvestment'], ARRAY['maningrida'], 'Maningrida', 'Justice Projects', 'justice-reinvestment',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-FN', 'First Nations Youth Advocacy', 'Advocacy for First Nations young people', 'justice', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['First Nations Youth Advocacy'], ARRAY['first-nations', 'youth-advocacy'], 'FN Youth Advocacy', 'Justice Projects', 'youth-advocacy',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-QF', 'QFCC Empathy Ledger', 'Queensland Family & Child Commission', 'stories', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], '1d7ebcf9-81cf-8075-8112-d0809ea7b64c',
 ARRAY['QFCC Empathy Ledger'], ARRAY['qfcc'], 'QFCC', 'Stories', 'child-wellbeing',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-DD', 'Double Disadvantage', 'Supporting young people with disabilities in justice system', 'justice', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], '1f8ebcf9-81cf-8070-a502-c5e9059a3c67',
 ARRAY['The Double Disadvantage'], ARRAY['double-disadvantage'], 'Double Disadvantage', 'Justice Projects', 'disability-justice',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-BM', 'Bimberi', 'Youth detention holiday programs', 'justice', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Bimberi - Holiday Programs'], ARRAY['bimberi'], 'Bimberi', 'Justice Projects', 'youth-detention',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-AI', 'AIME', 'AIME mentoring partnership', 'indigenous', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['AIME'], ARRAY['aime'], 'AIME', 'Indigenous Projects', 'mentoring',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-BV', 'Black Cockatoo Valley', 'Regenerative conservation', 'regenerative', 'satellite', 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['BCV Reforest', 'BCV: Regenerative Conservation'], ARRAY['bcv', 'black-cockatoo'], 'BCV', 'Regenerative', 'conservation',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-TN', 'TOMNET', 'Community network', 'community', NULL, 2, 'archived', 'low',
 ARRAY[]::TEXT[], NULL,
 ARRAY['TOMNET'], ARRAY['tomnet'], 'TOMNET', 'Community', 'network-building',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-10', '10x10 Retreat', 'Leadership retreat', 'events', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['10x10 Community Capital Leadership Retreat'], ARRAY['10x10', 'retreat'], '10x10 Retreat', 'Events', 'leadership',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-SH', 'The Shed', 'Maker space and tech hub', 'tech', NULL, 2, 'archived', 'low',
 ARRAY[]::TEXT[], '215ebcf9-81cf-8086-a781-fa9df2559a13',
 ARRAY['The Shed'], ARRAY['shed'], 'The Shed', 'Technology', 'maker-spaces',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-SE', 'SEFA Partnership', 'Social Enterprise Finance Australia', 'funding', 'satellite', 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['SEFA Partnership'], ARRAY['sefa'], 'SEFA', 'Funding', 'social-finance',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-AS', 'Art for Social Change', 'Art initiatives for social impact', 'arts', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Art for Social Change'], ARRAY['art-social-change'], 'Art Social Change', 'Arts', 'arts-impact',
 ARRAY['Act', 'Amplify'], FALSE, '{}'),

('ACT-WJ', 'Wilya Janta', 'Indigenous communications', 'indigenous', NULL, 2, 'archived', 'low',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Wilya Janta Communications'], ARRAY['wilya-janta'], 'Wilya Janta', 'Indigenous Projects', 'indigenous-comms',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-YC', 'YAC Story and Action', 'Youth Advisory Council', 'justice', NULL, 2, 'archived', 'low',
 ARRAY[]::TEXT[], NULL,
 ARRAY['YAC story and action'], ARRAY['yac'], 'YAC', 'Justice Projects', 'youth-voice',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-TW', 'Travelling Women''s Car', 'Cultural preservation for women', 'indigenous', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Travelling women''s car'], ARRAY['travelling-womens-car'], 'Travelling Womens Car', 'Indigenous Projects', 'cultural-preservation',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-HS', 'Project Her-Self', 'Self-design program for women', 'community', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Project Her Self design'], ARRAY['project-herself'], 'Project HerSelf', 'Community', 'womens-empowerment',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-DH', 'Deadly Homes and Gardens', 'Indigenous housing and gardens', 'indigenous', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Deadly Homes and Gardens'], ARRAY['deadly-homes'], 'Deadly Homes', 'Indigenous Projects', 'housing',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-MM', 'MMEIC Justice', 'MMEIC Justice initiatives', 'justice', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['MMEIC - Justice Projects'], ARRAY['mmeic'], 'MMEIC', 'Justice Projects', 'justice-reform',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-MU', 'Murrup + ACT', 'Partnership with Murrup for indigenous programs', 'indigenous', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Murrup + ACT'], ARRAY['murrup'], 'Murrup', 'Indigenous Projects', 'first-nations',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-CC', 'ACT Conservation Collective', 'Conservation collective partnership', 'regenerative', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['A Curious Tractor Conservation Collective (ACT-CC)'], ARRAY['conservation-collective'], 'ACT-CC', 'Regenerative', 'conservation',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-FP', 'Fairfax PLACE Tech', 'Fairfax and PLACE technology partnership', 'tech', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Fairfax & PLACE tech'], ARRAY['fairfax', 'place-tech'], 'Fairfax PLACE', 'Technology', 'economic-models',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-FA', 'Festival Activations', 'Festival presence and activations', 'events', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Festival Activations'], ARRAY['festivals', 'activations'], 'Festival Activations', 'Events', 'community-building',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-SF', 'SAF Foundation', 'SAF Foundation master partnership', 'funding', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['SAF Foundation Master'], ARRAY['saf-foundation'], 'SAF Foundation', 'Funding', 'social-finance',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-SX', 'SXSW 2025', 'South by Southwest conference presence', 'events', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['SXSW 2025'], ARRAY['sxsw', 'sxsw-2025'], 'SXSW', 'Events', 'leadership',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-WE', 'Westpac Summit 2025', 'Westpac Social Sector Summit', 'events', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Westpac Summit 2025'], ARRAY['westpac', 'summit'], 'Westpac Summit', 'Events', 'leadership',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-RP', 'RPPP Stream Two', 'Regional Precincts and Partnerships Program - Precinct Delivery', 'indigenous', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['RPPP Stream Two: Precinct delivery'], ARRAY['rppp', 'precinct'], 'RPPP', 'Indigenous Projects', 'first-nations',
 ARRAY[]::TEXT[], TRUE, '{}'),

('ACT-OE', 'Olive Express', 'Olive-based regenerative project', 'regenerative', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Olive Express'], ARRAY['olive-express'], 'Olive Express', 'Regenerative', 'food-systems',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-OS', 'Orange Sky EL', 'Orange Sky Empathy Ledger project repository', 'stories', NULL, 2, 'archived', 'low',
 ARRAY[]::TEXT[], NULL,
 ARRAY['Orange Sky Empathy Ledger Project Repository - review'], ARRAY['orange-sky'], 'Orange Sky', 'Stories', 'storytelling',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-IN', 'ACT Infrastructure', 'Internal operations, technology, and admin costs', 'tech', NULL, 3, 'archived', 'high',
 ARRAY[]::TEXT[], NULL,
 ARRAY['ACT business set up', 'ACT Notion / Tool Audit {Farm Plan}'], ARRAY['infrastructure', 'operations'], 'Operations', 'Technology', 'economic-models',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-BR', 'ACT Bali Retreat', 'ACT team retreat and planning in Bali', 'events', NULL, 2, 'archived', 'medium',
 ARRAY[]::TEXT[], NULL,
 ARRAY['ACT stop, revive, thrive in Bali'], ARRAY['bali', 'retreat'], 'Bali Retreat', 'Events', 'leadership',
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-GCC', 'Global Community Connections', 'Building bridges between local and international communities', 'community', NULL, 2, 'archived', NULL,
 ARRAY[]::TEXT[], NULL,
 ARRAY['Global Community Connections'], ARRAY[]::TEXT[], NULL, NULL, NULL,
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-EFI', 'Economic Freedom Initiative', 'Creating pathways for economic empowerment in regional communities', 'enterprise', NULL, 2, 'archived', NULL,
 ARRAY[]::TEXT[], NULL,
 ARRAY['Economic Freedom Initiative'], ARRAY[]::TEXT[], NULL, NULL, NULL,
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-APO', 'Active Projects Overview', 'Notion overview page - not a real project', 'tech', NULL, 1, 'archived', NULL,
 ARRAY[]::TEXT[], NULL,
 ARRAY['Active Projects Overview'], ARRAY[]::TEXT[], NULL, NULL, NULL,
 ARRAY[]::TEXT[], FALSE, '{}'),

('ACT-AMT', 'API Migration Test', 'Test project for Notion API migration', 'tech', NULL, 1, 'archived', NULL,
 ARRAY[]::TEXT[], NULL,
 ARRAY['API Migration Test Project'], ARRAY[]::TEXT[], NULL, NULL, NULL,
 ARRAY[]::TEXT[], FALSE, '{}')

ON CONFLICT (code) DO NOTHING;

-- Now set parent_project references
UPDATE projects SET parent_project = 'ACT-PI' WHERE code IN ('ACT-PS', 'ACT-SS', 'ACT-UA', 'ACT-ER');
UPDATE projects SET parent_project = 'ACT-JH' WHERE code = 'ACT-JC';

-- Create alignment view: per-project coverage across all systems
CREATE OR REPLACE VIEW v_project_alignment AS
WITH email_coverage AS (
    SELECT DISTINCT unnest(project_codes) AS project_code
    FROM communications_history
    WHERE project_codes IS NOT NULL AND array_length(project_codes, 1) > 0
),
calendar_coverage AS (
    SELECT DISTINCT project_code
    FROM calendar_events
    WHERE project_code IS NOT NULL
),
xero_coverage AS (
    SELECT DISTINCT project_code
    FROM xero_transactions
    WHERE project_code IS NOT NULL
),
contact_coverage AS (
    SELECT DISTINCT p.code AS project_code
    FROM projects p
    CROSS JOIN LATERAL unnest(p.ghl_tags) AS tag
    WHERE EXISTS (
        SELECT 1 FROM ghl_contacts c
        WHERE tag = ANY(c.tags)
    )
),
knowledge_counts AS (
    SELECT project_code, COUNT(*) AS cnt
    FROM project_knowledge
    WHERE project_code IS NOT NULL
    GROUP BY project_code
)
SELECT
    p.id,
    p.code,
    p.name,
    p.tier,
    p.category,
    p.status,
    p.importance_weight,
    p.cultural_protocols,
    -- Coverage flags
    EXISTS (SELECT 1 FROM email_coverage e WHERE e.project_code = p.code) AS has_gmail_coverage,
    EXISTS (SELECT 1 FROM calendar_coverage cal WHERE cal.project_code = p.code) AS has_calendar_coverage,
    EXISTS (SELECT 1 FROM xero_coverage x WHERE x.project_code = p.code) AS has_xero_coverage,
    EXISTS (SELECT 1 FROM contact_coverage cc WHERE cc.project_code = p.code) AS has_contacts,
    (p.notion_page_id IS NOT NULL OR array_length(p.notion_pages, 1) > 0) AS has_notion_page,
    COALESCE(kc.cnt, 0) AS knowledge_count,
    -- Coverage score (0-100)
    (
        (CASE WHEN EXISTS (SELECT 1 FROM email_coverage e WHERE e.project_code = p.code) THEN 20 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM calendar_coverage cal WHERE cal.project_code = p.code) THEN 20 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM xero_coverage x WHERE x.project_code = p.code) THEN 20 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM contact_coverage cc WHERE cc.project_code = p.code) THEN 20 ELSE 0 END) +
        (CASE WHEN p.notion_page_id IS NOT NULL OR array_length(p.notion_pages, 1) > 0 THEN 10 ELSE 0 END) +
        (CASE WHEN COALESCE(kc.cnt, 0) > 0 THEN 10 ELSE 0 END)
    ) AS coverage_score,
    -- Gap detection for ecosystem projects
    (p.tier = 'ecosystem' AND (
        NOT EXISTS (SELECT 1 FROM email_coverage e WHERE e.project_code = p.code) OR
        NOT EXISTS (SELECT 1 FROM calendar_coverage cal WHERE cal.project_code = p.code) OR
        NOT EXISTS (SELECT 1 FROM xero_coverage x WHERE x.project_code = p.code) OR
        NOT EXISTS (SELECT 1 FROM contact_coverage cc WHERE cc.project_code = p.code)
    )) AS has_coverage_gaps
FROM projects p
LEFT JOIN knowledge_counts kc ON kc.project_code = p.code
ORDER BY p.importance_weight DESC, p.name;
