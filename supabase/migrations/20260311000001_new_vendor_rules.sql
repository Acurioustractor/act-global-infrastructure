-- New vendor rules for ~30 unmatched vendors discovered in reconciliation audit
-- These cover one-off purchases, travel, landscape supplies, and personal contacts

INSERT INTO vendor_project_rules (vendor_name, aliases, project_code, category, rd_eligible, auto_apply) VALUES

-- === People — ACT-HV (Harvest / Witta) ===
('Claire Marchesi', ARRAY['CLAIRE MARCHESI'], 'ACT-HV', 'Operations', FALSE, TRUE),
('Sophie Deirdre Hickey', ARRAY['SOPHIE DEIRDRE HICKEY', 'Sophie Hickey'], 'ACT-HV', 'Operations', FALSE, TRUE),
('Mapleton Public House', ARRAY['MAPLETON PUBLIC HOUSE'], 'ACT-HV', 'Meals & Entertainment', FALSE, TRUE),

-- === People — ACT-IN (Infrastructure / General) ===
('Kate Vernon', ARRAY['KATE VERNON'], 'ACT-IN', 'Operations', FALSE, TRUE),
('Will Holt', ARRAY['WILL HOLT'], 'ACT-IN', 'Operations', FALSE, TRUE),
('Mark Galvin', ARRAY['MARK GALVIN'], 'ACT-IN', 'Operations', FALSE, TRUE),

-- === People — ACT-GD (Goods on Country) ===
('Samuel Hafer', ARRAY['SAMUEL HAFER'], 'ACT-GD', 'Operations', FALSE, TRUE),

-- === Events — ACT-IN ===
('Celebrants Australia', ARRAY['CELEBRANTS AUSTRALIA'], 'ACT-CB', 'Operations', FALSE, TRUE),
('Humanitix', ARRAY['HUMANITIX'], 'ACT-IN', 'Operations', FALSE, TRUE),

-- === Landscape Supplies — ACT-HV ===
('Maleny Landscaping', ARRAY['MALENY LANDSCAPING'], 'ACT-HV', 'Materials & Supplies', FALSE, TRUE),
('Savage Landscape', ARRAY['SAVAGE LANDSCAPE', 'Savage Landscape Supplies'], 'ACT-HV', 'Materials & Supplies', FALSE, TRUE),

-- === Government — ACT-IN ===
('Queensland Government', ARRAY['QUEENSLAND GOVERNMENT', 'QLD GOVERNMENT', 'Qld Gov'], 'ACT-IN', 'Operations', FALSE, TRUE),

-- === Software — ACT-IN ===
('Paddle.com', ARRAY['PADDLE', 'PADDLE.COM', 'Paddle.com Market'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),

-- === Cafes / Restaurants / Personal — ACT-IN ===
('The Roastery', ARRAY['THE ROASTERY'], 'ACT-IN', 'Meals & Entertainment', FALSE, TRUE),
('Fat Thaiger', ARRAY['FAT THAIGER'], 'ACT-IN', 'Meals & Entertainment', FALSE, TRUE),
('McDonalds', ARRAY['MCDONALDS', 'McDonald''s', 'MCDONALD''S'], 'ACT-IN', 'Meals & Entertainment', FALSE, TRUE),
('Tune-Up Barber Shop', ARRAY['TUNE-UP BARBER', 'TUNE UP BARBER'], 'ACT-IN', 'Operations', FALSE, TRUE),

-- === Travel — ACT-IN ===
('Wifi Onboard', ARRAY['WIFI ONBOARD'], 'ACT-IN', 'Travel', FALSE, TRUE),

-- === Portugal Travel — ACT-IN ===
('ORDEM DO CARMO', ARRAY['ORDEM DO CARMO'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Croqueteria', ARRAY['CROQUETERIA'], 'ACT-IN', 'Travel', FALSE, TRUE),
('PACHECA HOTEL', ARRAY['PACHECA HOTEL', 'Pacheca'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Marlene Vieira', ARRAY['MARLENE VIEIRA'], 'ACT-IN', 'Travel', FALSE, TRUE),
('duro de matar', ARRAY['DURO DE MATAR'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Praia da Luz', ARRAY['PRAIA DA LUZ'], 'ACT-IN', 'Travel', FALSE, TRUE)

ON CONFLICT DO NOTHING;

-- Also create the dext_supplier_setup_status table for Phase 3 checklist persistence
CREATE TABLE IF NOT EXISTS dext_supplier_setup_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL UNIQUE,
    configured_in_dext BOOLEAN DEFAULT FALSE,
    configured_at TIMESTAMPTZ,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
