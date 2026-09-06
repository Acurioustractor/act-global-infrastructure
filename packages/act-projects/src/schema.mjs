import { z } from 'zod';

// Values seen in config/project-codes.json on 2026-09-06. Adding a value here is a
// decision, not a typo fix: it changes which guards apply.
export const TIERS = ['ecosystem', 'studio', 'satellite', 'background'];
export const STATUSES = ['active', 'ideation', 'sunsetting', 'archived', 'transferred'];
export const SITE_ROLES = ['primary', 'campaign', 'archive', 'external'];

const code = z.string().regex(/^ACT-[A-Z0-9]{2,4}$/, 'code must look like ACT-XX');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case');
const url = z.string().url();

export const Site = z
  .object({
    role: z.enum(SITE_ROLES).default('primary'),
    production_url: url.optional(),
    vercel_project_id: z.string().regex(/^prj_[A-Za-z0-9]+$/).optional(),
    vercel_project_name: z.string().min(1).optional(),
    github_repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo').optional(),
  })
  .strict();

export const Notion = z
  .object({
    page_id: z.string().uuid().optional(),
    database_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

export const Ghl = z
  .object({
    tags: z.array(z.string().min(1)).default([]),
    pipeline_id: z.string().min(1).optional(),
  })
  .strict();

export const EmpathyLedger = z
  .object({
    // false: this project keeps no stories or media in Empathy Ledger (admin codes,
    // or a partner that runs its own EL organisation). align.mjs stops asking.
    tracked: z.boolean().default(true),
    // Codes a partner tenant uses for this work inside its own EL organisation
    // (PICC-CP, BG-FIT, CONFIT-CORE, SMART-SC). align.mjs counts them as matches.
    partner_codes: z.array(z.string().min(1)).default([]),
    project_id: z.string().uuid().optional(),
    project_key: slug.optional(),
    syndication_slug: z.string().regex(/^[a-z0-9_]+$/).optional(),
  })
  .strict();

export const Art = z
  .object({
    media: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).default([]),
    piece_slug: slug,
    wiki_path: z.string().min(1).optional(),
  })
  .strict();

// Fields the file carries today that the record keeps verbatim. Listed so the
// schema stays strict: an unknown key is a typo until it is added here.
const legacy = {
  priority: z.string().optional(),
  leads: z.array(z.string()).optional(),
  lead: z.string().optional(),
  notion_page_id: z.string().optional(),
  notion_pages: z.array(z.string()).optional(),
  notion_ids: z.union([z.array(z.string()), z.record(z.string())]).optional(),
  notion_id: z.string().optional(),
  ghl_tags: z.array(z.string()).optional(),
  xero_tracking: z.string().optional(),
  xero_tracking_aliases: z.array(z.string()).optional(),
  dext_category: z.string().optional(),
  alma_program: z.string().optional(),
  github_repo: z.string().optional(),
  lcaa_themes: z.array(z.string()).optional(),
  syndication_slug: z.string().optional(),
  production_url: z.string().optional(),
  slug_aliases: z.array(z.string()).optional(),
  legacy_codes: z.array(z.string()).optional(),
  cultural_protocols: z.unknown().optional(),
  sub_projects: z.array(z.string()).optional(),
  parent_project: z.string().optional(),
  launch_date: z.string().optional(),
  funding: z.unknown().optional(),
  key_deliverables: z.unknown().optional(),
  art_medium: z.union([z.string(), z.array(z.string())]).optional(),
  art_tags: z.array(z.string()).optional(),
  location: z.unknown().optional(),
  place: z.unknown().optional(),
  landlord: z.unknown().optional(),
  lease_start: z.string().optional(),
  early_access_start: z.string().optional(),
  budget_config: z.unknown().optional(),
  capital_improvement_fund: z.unknown().optional(),
  base_rent_annual: z.unknown().optional(),
  cost_centres: z.unknown().optional(),
};

export const ProjectRecord = z
  .object({
    code,
    name: z.string().min(1),
    canonical_slug: slug,
    category: z.string().min(1),
    tier: z.enum(TIERS),
    status: z.enum(STATUSES),
    description: z.string().min(1),
    wiki_path: z.string().min(1).optional(),
    // An admin or cost-centre code with no public face (ACT-IN). Exempt from the
    // site guard; still needs a Notion page so the work is visible.
    internal: z.boolean().default(false),
    sites: z.array(Site).default([]),
    notion: Notion.default({}),
    ghl: Ghl.default({}),
    empathy_ledger: EmpathyLedger.default({}),
    art: Art.optional(),
    ...legacy,
  })
  .strict();

export const ProjectCodesFile = z
  .object({
    _meta: z.record(z.unknown()),
    projects: z.record(code, ProjectRecord),
    categories: z.unknown().optional(),
    lcaa_framework: z.unknown().optional(),
    alma_programs: z.unknown().optional(),
  })
  .strict();
