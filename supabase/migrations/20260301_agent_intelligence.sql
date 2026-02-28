-- Agent Intelligence Layer — Phase 4
-- Impact metrics, knowledge links, email templates, public knowledge

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: impact_metrics
-- Extracted impact data from knowledge items and project activities
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS impact_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  metric_type text NOT NULL, -- 'people_reached', 'revenue_generated', 'stories_collected', 'jobs_created', 'communities_supported', 'events_held', 'knowledge_items', 'partnerships'
  value numeric NOT NULL,
  unit text, -- 'people', 'dollars', 'stories', 'jobs', etc.
  period_start date,
  period_end date,
  source text, -- where the metric was extracted from
  source_id uuid, -- reference to knowledge item or other source
  confidence numeric DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  verified boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_im_project ON impact_metrics(project_code);
CREATE INDEX IF NOT EXISTS idx_im_type ON impact_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_im_period ON impact_metrics(period_start, period_end);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: knowledge_links
-- Auto-generated links between related knowledge items
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS knowledge_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES project_knowledge(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES project_knowledge(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'related', -- 'related', 'builds_on', 'contradicts', 'supersedes', 'supports'
  strength numeric DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  reason text, -- why these are linked
  auto_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),

  UNIQUE(source_id, target_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_kl_source ON knowledge_links(source_id);
CREATE INDEX IF NOT EXISTS idx_kl_target ON knowledge_links(target_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: email_response_templates
-- Template library for common email responses
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS email_response_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL, -- 'grant_inquiry', 'partnership_request', 'thank_you', 'follow_up', 'introduction', 'referral'
  subject_template text,
  body_template text NOT NULL, -- supports {{variable}} placeholders
  variables jsonb DEFAULT '[]', -- [{ "name": "contact_name", "required": true }]
  tone text DEFAULT 'professional', -- 'professional', 'warm', 'formal', 'casual'
  use_count int DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ALTER: project_knowledge — add public/published_at for open-sourcing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS public boolean DEFAULT false;
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_pk_public ON project_knowledge(public) WHERE public = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Seed: email response templates
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO email_response_templates (name, category, subject_template, body_template, variables, tone) VALUES
  ('grant_inquiry_response', 'grant_inquiry', 'Re: {{grant_name}} — ACT Expression of Interest',
   'Hi {{contact_name}},

Thank you for reaching out about {{grant_name}}. We''d love to explore how ACT''s work aligns with this opportunity.

ACT (Australian Community Technologies) works at the intersection of technology and community empowerment, with active projects across First Nations storytelling, community farming, and digital infrastructure.

I''d be happy to schedule a brief call to discuss how our work might fit. Would {{suggested_time}} work for you?

Warm regards,
{{sender_name}}
ACT Global',
   '[{"name": "contact_name", "required": true}, {"name": "grant_name", "required": true}, {"name": "suggested_time", "required": false}, {"name": "sender_name", "required": true}]',
   'warm'),

  ('partnership_response', 'partnership_request', 'Re: Partnership with ACT',
   'Hi {{contact_name}},

Thank you for your interest in partnering with ACT. We''re always excited to connect with organisations that share our values of community empowerment and technological innovation.

I''d love to learn more about what you have in mind. Could you share a bit more about:
- The scope of collaboration you''re envisioning
- Timeline and key milestones
- How you see our work complementing each other

Looking forward to the conversation.

Best,
{{sender_name}}',
   '[{"name": "contact_name", "required": true}, {"name": "sender_name", "required": true}]',
   'professional'),

  ('thank_you_note', 'thank_you', 'Thank you — {{occasion}}',
   'Hi {{contact_name}},

Just wanted to send a quick note to say thank you for {{occasion}}. It means a lot to the ACT team and the communities we serve.

{{personal_note}}

Warmly,
{{sender_name}}',
   '[{"name": "contact_name", "required": true}, {"name": "occasion", "required": true}, {"name": "personal_note", "required": false}, {"name": "sender_name", "required": true}]',
   'warm'),

  ('follow_up', 'follow_up', 'Following up — {{topic}}',
   'Hi {{contact_name}},

Hope you''re doing well. I wanted to follow up on {{topic}} from our last conversation.

{{context}}

Would you have time for a quick catch-up this week?

Best,
{{sender_name}}',
   '[{"name": "contact_name", "required": true}, {"name": "topic", "required": true}, {"name": "context", "required": false}, {"name": "sender_name", "required": true}]',
   'professional')
ON CONFLICT (name) DO NOTHING;
