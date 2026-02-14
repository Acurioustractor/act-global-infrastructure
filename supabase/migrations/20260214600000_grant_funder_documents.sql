-- Grant funder documents: files/templates provided by the grant funder
CREATE TABLE IF NOT EXISTS grant_funder_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other', -- guidelines, faq, template, budget_template, mou_template, other
  file_url TEXT,
  content_summary JSONB, -- extracted key points, sections, structured data
  original_filename TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grant_funder_docs_opp ON grant_funder_documents(opportunity_id);

-- Add structured grant knowledge columns to grant_opportunities
ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB,
  ADD COLUMN IF NOT EXISTS assessment_criteria JSONB,
  ADD COLUMN IF NOT EXISTS timeline_stages JSONB,
  ADD COLUMN IF NOT EXISTS funder_info JSONB,
  ADD COLUMN IF NOT EXISTS grant_structure JSONB; -- amount structure, duration, stages etc

-- ============================================================
-- Seed: Dads on Track - Paul Ramsay Foundation
-- ============================================================
INSERT INTO grant_opportunities (
  name, description, provider, program, source,
  amount_min, amount_max, deadline, closes_at, url,
  fit_score, relevance_score, discovered_by,
  aligned_projects, categories, focus_areas,
  eligibility_criteria, assessment_criteria, timeline_stages,
  funder_info, grant_structure, application_status
) VALUES (
  'Dads on Track National Grant Round',
  'Funding for organisations delivering specialist DFV programs for fathers who are using, or are at risk of using, violence. Up to $350K/year for 5 years ($1.75M total). Two-stage process: EOI then Panel Interview. Must be ACNC registered with existing programs.',
  'Paul Ramsay Foundation',
  'Dads on Track',
  'manual',
  350000, 1750000,
  '2026-03-02', '2026-03-02',
  'https://www.paulramsayfoundation.org.au',
  85, 85, 'manual',
  ARRAY['ACT-GOODS'],
  ARRAY['DFV', 'community', 'social-services'],
  ARRAY['domestic-violence', 'fathers-programs', 'behaviour-change', 'victim-survivor-safety'],

  -- Eligibility criteria
  '[
    {"criterion": "ACNC Registered", "description": "Organisation must be registered with the Australian Charities and Not-for-profits Commission", "category": "legal", "is_met": null},
    {"criterion": "Existing DFV Program", "description": "Must have an existing program working with fathers using or at risk of using domestic and family violence", "category": "program", "is_met": null},
    {"criterion": "Specialist DFV Services", "description": "Delivers specialist DFV services (not generalist family/community services)", "category": "program", "is_met": null},
    {"criterion": "Individualised Support", "description": "Provides individualised support for fathers (not group-only programs)", "category": "program", "is_met": null},
    {"criterion": "Victim-Survivor Safety Approach", "description": "Program centres victim-survivor safety in its approach and design", "category": "program", "is_met": null},
    {"criterion": "Operating in Australia", "description": "Program operates within Australia", "category": "legal", "is_met": null},
    {"criterion": "Not Government Agency", "description": "Applicant is not a government department or agency", "category": "legal", "is_met": null},
    {"criterion": "Child Safety Policy", "description": "Has a current Child Safety policy (required at Stage 2)", "category": "compliance", "is_met": null},
    {"criterion": "Modern Slavery Policy", "description": "Has a Modern Slavery policy or statement (required at Stage 2)", "category": "compliance", "is_met": null}
  ]'::jsonb,

  -- Assessment criteria
  '[
    {"name": "Organisation & Collaboration", "description": "Track record, capability, governance, and collaboration strength. Evidence of working with relevant communities and partner organisations.", "weight_pct": 25, "sort_order": 1},
    {"name": "Strength of Approach", "description": "Quality of program design, evidence base, individualised support model, integration of victim-survivor safety, and sustainability beyond grant period.", "weight_pct": 35, "sort_order": 2},
    {"name": "Priority Criteria", "description": "Focus on priority cohorts (First Nations, CALD) and/or priority circumstances (leaving prison, addiction, long-term unemployed, veterans, young fathers).", "weight_pct": 20, "sort_order": 3},
    {"name": "Alignment to Grant Round Outcomes", "description": "How well the program aligns to PRF Dads on Track outcomes: sustained behaviour change, maintained family connections, community safety.", "weight_pct": 20, "sort_order": 4}
  ]'::jsonb,

  -- Timeline stages
  '[
    {"stage": "EOI Open", "date": "2026-02-03", "description": "Expression of Interest period opens", "is_completed": true, "sort_order": 1},
    {"stage": "EOI Deadline", "date": "2026-03-02", "description": "EOI submissions close at 11:59pm AEDT", "is_completed": false, "sort_order": 2},
    {"stage": "EOI Assessment", "date": "2026-03-17", "description": "Assessment of EOI submissions by PRF panel", "is_completed": false, "sort_order": 3},
    {"stage": "Stage 2 Invitations", "date": "2026-04-14", "description": "Shortlisted applicants invited to Stage 2 panel interview", "is_completed": false, "sort_order": 4},
    {"stage": "Panel Interviews", "date": "2026-04-28", "description": "Panel interviews conducted 28 Apr - 8 May 2026", "is_completed": false, "sort_order": 5},
    {"stage": "Outcomes Announced", "date": "2026-06-01", "description": "Grant outcomes communicated to all applicants", "is_completed": false, "sort_order": 6},
    {"stage": "Funding Starts", "date": "2026-07-01", "description": "5-year funding agreements commence (indicative)", "is_completed": false, "sort_order": 7}
  ]'::jsonb,

  -- Funder info
  '{
    "org_name": "Paul Ramsay Foundation",
    "org_short": "PRF",
    "website": "https://www.paulramsayfoundation.org.au",
    "contact_email": "dadsontrack@paulramsayfoundation.org.au",
    "contact_note": "Email for questions about the grant round",
    "abn": null,
    "about": "PRF invests in efforts to break cycles of disadvantage in Australia. The Dads on Track initiative supports fathers to change their behaviour and strengthen family safety."
  }'::jsonb,

  -- Grant structure
  '{
    "amount_per_year": 350000,
    "duration_years": 5,
    "total_amount": 1750000,
    "currency": "AUD",
    "stages": ["EOI", "Panel Interview"],
    "evaluation_budget": 50000,
    "evaluation_note": "Minimum $50K per year must be budgeted for learning, evaluation, and reporting",
    "collaboration_required": false,
    "collaboration_note": "Collaborations encouraged but not required. If collaborating, MOU template must be used.",
    "number_of_grants": "8-12 grants nationally",
    "priority_cohorts": ["First Nations fathers", "CALD community fathers"],
    "priority_circumstances": ["Fathers leaving prison", "Fathers with addiction", "Long-term unemployed fathers", "Veteran fathers", "Young fathers"]
  }'::jsonb,

  'not_applied'
);

-- Insert funder documents for Dads on Track
DO $$
DECLARE
  dot_opp_id UUID;
BEGIN
  SELECT id INTO dot_opp_id FROM grant_opportunities WHERE name = 'Dads on Track National Grant Round' LIMIT 1;

  IF dot_opp_id IS NOT NULL THEN
    INSERT INTO grant_funder_documents (opportunity_id, name, doc_type, content_summary, original_filename, sort_order) VALUES
    (dot_opp_id, 'Grant Guidelines', 'guidelines', '{
      "pages": 9,
      "sections": [
        "About PRF & Dads on Track",
        "Grant Round Overview",
        "Eligibility & Priority Criteria",
        "What We Will Fund",
        "Budget Requirements ($50K eval minimum)",
        "Assessment Process (2-stage: EOI + Interview)",
        "Assessment Criteria",
        "Stage 2 Requirements",
        "Indicative Timeline"
      ],
      "key_points": [
        "Up to $350K/year for 5 years ($1.75M total)",
        "Must be ACNC registered charity",
        "Must have existing specialist DFV program for fathers",
        "Program must centre victim-survivor safety",
        "Individualised support required (not group-only)",
        "8-12 grants nationally",
        "$50K minimum per year for learning/evaluation/reporting",
        "Priority: First Nations and CALD communities",
        "Stage 2 needs: Child Safety policy, Modern Slavery policy, 2 references"
      ]
    }'::jsonb, '697fd38260f9bbe225289860_DoT-Grant-Guidelines.pdf', 1),

    (dot_opp_id, 'Frequently Asked Questions', 'faq', '{
      "pages": 7,
      "sections": [
        "Eligibility",
        "Assessment Criteria Detail",
        "Budget & Financials",
        "Collaborations",
        "Application Process"
      ],
      "key_points": [
        "Assessment criteria: Organisation/Collaboration, Strength of approach, Priority criteria, Alignment to outcomes",
        "Collaboration MOU template provided — must be submitted if collaborating",
        "Can apply for less than $350K/year",
        "Multi-site programs eligible",
        "Cannot fund capital works or vehicles",
        "Must demonstrate evidence-based practice",
        "Referees needed at Stage 2 only"
      ]
    }'::jsonb, '697fd343014cce849f62a491_FAQs.pdf', 2),

    (dot_opp_id, 'MOU Template (Collaborations)', 'mou_template', '{
      "pages": 7,
      "sections": [
        "Interpretation & Definitions",
        "Status of Document (non-binding except confidentiality)",
        "Term & Exit Notice (60 days)",
        "Purpose & Context",
        "Principles (5 core)",
        "Governance & Key Responsibilities",
        "Publications & Publicity",
        "Intellectual Property",
        "Confidentiality & Privacy"
      ],
      "key_points": [
        "Template for collaboration applications — Funded Member administers grant",
        "Non-binding except confidentiality clause",
        "60-day exit notice period",
        "Members collaborate as equals",
        "Privacy Act 1988 compliance required",
        "IP remains with original owner"
      ],
      "fillable_fields": [
        "Organisation names and ABNs",
        "Collaboration name",
        "Commencement date",
        "End date",
        "Purpose of collaboration",
        "Key responsibilities per member",
        "Additional principles",
        "Governance settings"
      ]
    }'::jsonb, '6989304978317302e6cdde6c_Template-MOU.pdf', 3),

    (dot_opp_id, 'Budget & Financials Template', 'budget_template', '{
      "pages": 1,
      "format": "xlsx",
      "sections": [
        "Annual budget breakdown",
        "5-year projection",
        "Evaluation costs line item",
        "Staff costs",
        "Program delivery costs"
      ],
      "key_points": [
        "Excel spreadsheet for individual (non-collaboration) applicants",
        "Must include $50K minimum for evaluation/learning/reporting",
        "5-year budget aligned to grant duration",
        "Standard PRF budget format"
      ]
    }'::jsonb, '698d537b130ab875b391483e_Budget-and-financials-template-INDIVIDUAL.xlsx', 4);
  END IF;
END $$;
