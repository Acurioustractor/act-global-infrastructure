-- Vendor project rules: single source of truth for vendor→project mapping
-- Replaces hardcoded VENDOR_RULES in scripts and VENDOR_SUGGESTIONS in API routes

CREATE TABLE IF NOT EXISTS vendor_project_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    project_code TEXT NOT NULL REFERENCES projects(code),
    category TEXT,
    rd_eligible BOOLEAN DEFAULT FALSE,
    auto_apply BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_rules_project ON vendor_project_rules(project_code);

-- Seed: 64 vendor rules across 7 categories
-- Categories: Software & Subscriptions, Travel, Operations, Materials & Supplies,
--             Bank Fees, Meals & Entertainment, Income

INSERT INTO vendor_project_rules (vendor_name, aliases, project_code, category, rd_eligible, auto_apply) VALUES

-- === ACT-GD (Goods Design) ===
('Defy Design', ARRAY['DEFY DESIGN'], 'ACT-GD', 'Materials & Supplies', FALSE, TRUE),
('Defy Manufacturing', ARRAY['DEFY MANUFACTURING'], 'ACT-GD', 'Materials & Supplies', FALSE, TRUE),

-- === ACT-HV (Hinterland Village) ===
('Kennards Hire', ARRAY['KENNARDS', 'Kennards Hire'], 'ACT-HV', 'Materials & Supplies', FALSE, TRUE),
('Maleny Hardware', ARRAY['MALENY HARDWARE', 'Maleny Hardware And Rural Supplies'], 'ACT-HV', 'Materials & Supplies', FALSE, TRUE),

-- === ACT-IN (Infrastructure / Operations) ===

-- Bank Fees
('NAB', ARRAY['NAB', 'National Australia Bank'], 'ACT-IN', 'Bank Fees', FALSE, TRUE),
('NAB International Fee', ARRAY['NAB INTERNATIONAL FEE'], 'ACT-IN', 'Bank Fees', FALSE, TRUE),

-- Income
('Nicholas Marchesi', ARRAY['NICHOLAS MARCHESI'], 'ACT-IN', 'Income', FALSE, TRUE),

-- Materials & Supplies
('Amazon', ARRAY['AMAZON'], 'ACT-IN', 'Materials & Supplies', FALSE, TRUE),
('Bunnings', ARRAY['BUNNINGS', 'Bunnings Warehouse'], 'ACT-IN', 'Materials & Supplies', FALSE, TRUE),
('Woolworths', ARRAY['WOOLWORTHS', 'Woolworths Group'], 'ACT-IN', 'Materials & Supplies', FALSE, TRUE),

-- Meals & Entertainment
('Uber Eats', ARRAY['UBER EATS'], 'ACT-IN', 'Meals & Entertainment', FALSE, TRUE),

-- Operations
('2Up Spending', ARRAY['2UP SPENDING'], 'ACT-IN', 'Operations', FALSE, TRUE),
('AHM', ARRAY['AHM'], 'ACT-IN', 'Operations', FALSE, TRUE),
('Belong', ARRAY['BELONG'], 'ACT-IN', 'Operations', FALSE, TRUE),
('GoPayID', ARRAY['GOPAYID'], 'ACT-IN', 'Operations', FALSE, TRUE),
('HelloFresh', ARRAY['HELLOFRESH', 'HelloFresh'], 'ACT-IN', 'Operations', FALSE, TRUE),
('MetLife', ARRAY['METLIFE'], 'ACT-IN', 'Operations', FALSE, TRUE),
('Telstra', ARRAY['TELSTRA'], 'ACT-IN', 'Operations', FALSE, TRUE),
('Updoc', ARRAY['UPDOC'], 'ACT-IN', 'Operations', FALSE, TRUE),

-- Software & Subscriptions (R&D eligible marked)
('Anthropic', ARRAY['ANTHROPIC', 'Anthropic PBC'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('ChatGPT', ARRAY['CHATGPT', 'ChatGPT Plus'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Claude.AI', ARRAY['CLAUDE.AI', 'Claude AI'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Codeguide', ARRAY['CODEGUIDE'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Cursor AI', ARRAY['CURSOR', 'Cursor AI'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Descript', ARRAY['DESCRIPT', 'Descript Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Figma', ARRAY['FIGMA'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('GitHub', ARRAY['GITHUB', 'GitHub Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Google', ARRAY['GOOGLE', 'Google Cloud'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Midjourney', ARRAY['MIDJOURNEY', 'Midjourney Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Notion Labs', ARRAY['Notion', 'NOTION LABS'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('OpenAI', ARRAY['OPENAI', 'OpenAI, LLC'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Supabase', ARRAY['SUPABASE', 'Supabase Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Vercel', ARRAY['VERCEL', 'Vercel Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
('Webflow', ARRAY['WEBFLOW', 'Webflow Inc'], 'ACT-IN', 'Software & Subscriptions', TRUE, TRUE),
-- Non-R&D subscriptions
('Adobe', ARRAY['ADOBE', 'Adobe Systems'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Apple', ARRAY['APPLE PTY LTD', 'Apple Inc'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Audible', ARRAY['AUDIBLE', 'Audible Australia'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Calendly', ARRAY['CALENDLY'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Canva', ARRAY['CANVA'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Dext', ARRAY['DEXT'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Dialpad', ARRAY['DIALPAD'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('DocPlay', ARRAY['DOCPLAY'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Garmin', ARRAY['GARMIN', 'Garmin Australasia'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('HighLevel', ARRAY['HIGHLEVEL', 'GoHighLevel', 'GHL'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('LinkedIn', ARRAY['LINKEDIN', 'LinkedIn Singapore'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Linktree', ARRAY['LINKTREE'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Loom', ARRAY['LOOM'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Mighty Networks', ARRAY['MIGHTY NETWORKS'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Only Domains', ARRAY['ONLY DOMAINS', 'OnlyDomains'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Slack', ARRAY['SLACK'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Spotify', ARRAY['SPOTIFY'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Squarespace', ARRAY['SQUARESPACE'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Vidzflow', ARRAY['VIDZFLOW'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Xero', ARRAY['XERO', 'Xero Australia'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Zapier', ARRAY['ZAPIER'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),
('Zoom', ARRAY['ZOOM'], 'ACT-IN', 'Software & Subscriptions', FALSE, TRUE),

-- Travel
('Booking.com', ARRAY['BOOKING.COM', 'Booking Com'], 'ACT-IN', 'Travel', FALSE, TRUE),
('BP', ARRAY['BP', 'BP FUEL'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Cabcharge', ARRAY['CABCHARGE', 'CabCharge Australia'], 'ACT-IN', 'Travel', FALSE, TRUE),
('GoGet', ARRAY['GOGET', 'GoGet Carshare'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Overseas Travel', ARRAY['OVERSEAS TRAVEL', 'Overseas Travel - Misc small expenses'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Qantas', ARRAY['QANTAS', 'Qantas Airways Limited', 'Qantas Group Accommodation'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Taxi', ARRAY['TAXI RECEIPT', 'Taxi'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Uber', ARRAY['UBER', 'Uber Technologies', 'Uber Amsterdam', 'UBER AMSTERDAM'], 'ACT-IN', 'Travel', FALSE, TRUE),
('Virgin Australia', ARRAY['VIRGIN AUSTRALIA', 'Virgin Australia Airlines'], 'ACT-IN', 'Travel', FALSE, TRUE)

ON CONFLICT DO NOTHING;

-- Financial view: per-project financial summary
CREATE OR REPLACE VIEW v_project_financials AS
SELECT
    p.code,
    p.name,
    p.tier,
    p.importance_weight,
    -- Income (all time)
    COALESCE(SUM(CASE WHEN t.type = 'RECEIVE' THEN ABS(t.total) END), 0) AS total_income,
    -- Expenses (all time)
    COALESCE(SUM(CASE WHEN t.type = 'SPEND' THEN ABS(t.total) END), 0) AS total_expenses,
    -- Net position
    COALESCE(SUM(CASE WHEN t.type = 'RECEIVE' THEN ABS(t.total) ELSE -ABS(t.total) END), 0) AS net_position,
    -- Current FY (July 1 onwards)
    COALESCE(SUM(CASE WHEN t.type = 'SPEND' AND t.date >= date_trunc('year', CURRENT_DATE - interval '6 months') + interval '6 months' THEN ABS(t.total) END), 0) AS fy_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'RECEIVE' AND t.date >= date_trunc('year', CURRENT_DATE - interval '6 months') + interval '6 months' THEN ABS(t.total) END), 0) AS fy_income,
    -- Transaction count
    COUNT(t.id) AS transaction_count,
    -- Outstanding receivables
    COALESCE((SELECT SUM(i.amount_due) FROM xero_invoices i WHERE i.project_code = p.code AND i.type = 'ACCREC' AND i.amount_due > 0), 0) AS receivable,
    -- Pipeline value (GHL opportunities)
    COALESCE((SELECT SUM(o.monetary_value::numeric) FROM ghl_opportunities o WHERE o.project_code = p.code AND o.status != 'lost'), 0) AS pipeline_value,
    -- Grant funding (approved/acquitted)
    COALESCE((SELECT SUM(COALESCE(g.outcome_amount, g.amount_requested)) FROM grant_applications g WHERE g.project_code = p.code AND g.status IN ('approved', 'acquitted')), 0) AS grant_funding,
    -- Monthly subscription burn
    COALESCE((SELECT SUM(ABS(s.amount)) FROM subscriptions s WHERE p.code = ANY(s.project_codes) AND s.account_status = 'active'), 0) AS monthly_subscriptions
FROM projects p
LEFT JOIN xero_transactions t ON t.project_code = p.code
WHERE p.status IN ('active', 'ideation')
GROUP BY p.code, p.name, p.tier, p.importance_weight
ORDER BY p.importance_weight DESC;
