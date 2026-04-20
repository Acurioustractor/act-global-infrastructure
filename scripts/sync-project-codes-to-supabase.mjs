#!/usr/bin/env node

import '../lib/load-env.mjs';

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const configPath = join(rootDir, 'config', 'project-codes.json');
const identityRulesPath = join(rootDir, 'config', 'project-identity-rules.json');

const dryRun = process.argv.includes('--dry-run');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function readConfig() {
  const raw = JSON.parse(readFileSync(configPath, 'utf8'));
  return raw.projects || {};
}

function readIdentityRules() {
  const raw = JSON.parse(readFileSync(identityRulesPath, 'utf8'));
  return raw.legacy_wrappers || {};
}

function uniq(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function computeImportanceWeight(project) {
  const status = String(project.status || 'active').toLowerCase();
  const tier = String(project.tier || 'satellite').toLowerCase();

  if (status === 'archived') return 3;
  if (status === 'ideation') return tier === 'ecosystem' ? 6 : 4;
  if (tier === 'ecosystem') return 9;
  if (tier === 'studio') return 7;
  return 5;
}

function buildMetadata(project, existingRow) {
  const existing = existingRow?.metadata && typeof existingRow.metadata === 'object'
    ? existingRow.metadata
    : {};

  return {
    ...existing,
    canonical_slug: project.canonical_slug || existing.canonical_slug || null,
    slug_aliases: uniq(project.slug_aliases || existing.slug_aliases || []),
    legacy_codes: uniq(project.legacy_codes || existing.legacy_codes || []),
    xero_tracking_aliases: uniq(project.xero_tracking_aliases || existing.xero_tracking_aliases || []),
    notion_ids: project.notion_ids || existing.notion_ids || null,
    syndication_slug: project.syndication_slug || existing.syndication_slug || null,
    production_url: project.production_url || existing.production_url || null,
    funding: project.funding || existing.funding || null,
    launch_date: project.launch_date || existing.launch_date || null,
    sub_projects: uniq(project.sub_projects || existing.sub_projects || []),
  };
}

function buildExternalReferences(project, existingRow) {
  const existing = existingRow?.external_references && typeof existingRow.external_references === 'object'
    ? existingRow.external_references
    : {};

  return {
    ...existing,
    act_infrastructure: {
      ...(existing.act_infrastructure || {}),
      code: project.code,
      canonical_slug: project.canonical_slug || null,
      tier: project.tier || null,
      category: project.category || null,
      syndication_slug: project.syndication_slug || null,
      production_url: project.production_url || null,
    },
  };
}

function buildLegacyWrapperMetadata(code, wrapper, canonicalProject, existingRow) {
  const existing = existingRow?.metadata && typeof existingRow.metadata === 'object'
    ? existingRow.metadata
    : {};

  return {
    ...existing,
    legacy_wrapper: true,
    wrapper_type: wrapper.wrapper_type || existing.wrapper_type || null,
    tagging_mode: wrapper.tagging_mode || existing.tagging_mode || null,
    canonical_code: wrapper.canonical_code || existing.canonical_code || null,
    canonical_slug: wrapper.canonical_slug || existing.canonical_slug || null,
    canonical_name: canonicalProject?.name || existing.canonical_name || null,
    recommended_action: wrapper.recommended_action || existing.recommended_action || null,
  };
}

function buildLegacyWrapperExternalReferences(code, wrapper, canonicalProject, existingRow) {
  const existing = existingRow?.external_references && typeof existingRow.external_references === 'object'
    ? existingRow.external_references
    : {};

  return {
    ...existing,
    act_infrastructure: {
      ...(existing.act_infrastructure || {}),
      code,
      legacy_wrapper: true,
      wrapper_type: wrapper.wrapper_type || null,
      canonical_code: wrapper.canonical_code || null,
      canonical_slug: wrapper.canonical_slug || null,
      canonical_name: canonicalProject?.name || null,
      tagging_mode: wrapper.tagging_mode || null,
    },
  };
}

function pickDefaultOrganizationId(rows) {
  const counts = new Map();

  for (const row of rows) {
    if (!row.organization_id) continue;
    counts.set(row.organization_id, (counts.get(row.organization_id) || 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function toUpsertRow(project, existingRow, defaultOrganizationId) {
  return {
    code: project.code,
    name: project.name,
    description: project.description || null,
    category: project.category || null,
    tier: project.tier || existingRow?.tier || null,
    importance_weight: project.importance_weight || computeImportanceWeight(project),
    status: project.status || existingRow?.status || 'active',
    priority: project.priority || existingRow?.priority || null,
    leads: uniq(project.leads || []),
    notion_page_id: project.notion_page_id || existingRow?.notion_page_id || null,
    notion_pages: uniq(project.notion_pages || []),
    ghl_tags: uniq(project.ghl_tags || []),
    xero_tracking: project.xero_tracking || null,
    dext_category: project.dext_category || null,
    alma_program: project.alma_program || null,
    lcaa_themes: uniq(project.lcaa_themes || []),
    cultural_protocols: Boolean(project.cultural_protocols),
    parent_project: project.parent_project || null,
    organization_id: existingRow?.organization_id || defaultOrganizationId,
    act_project_code: project.code,
    cover_image_url: existingRow?.cover_image_url || null,
    metadata: buildMetadata(project, existingRow),
    external_references: buildExternalReferences(project, existingRow),
  };
}

async function fetchExistingRows(codes) {
  const { data, error } = await supabase
    .from('projects')
    .select('code, tier, status, priority, notion_page_id, organization_id, act_project_code, cover_image_url, metadata, external_references')
    .in('code', codes);

  if (error) throw error;
  return data || [];
}

async function upsertRows(rows) {
  const chunkSize = 50;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase
      .from('projects')
      .upsert(chunk, { onConflict: 'code' });

    if (error) throw error;
  }
}

async function patchLegacyWrappers(wrapperConfig, configProjects) {
  const wrapperCodes = Object.keys(wrapperConfig || {});
  if (!wrapperCodes.length) {
    return { updated: 0, missing: [] };
  }

  const existingRows = await fetchExistingRows(wrapperCodes);
  const existingByCode = new Map(existingRows.map((row) => [row.code, row]));
  const missing = [];
  let updated = 0;

  for (const code of wrapperCodes) {
    const existingRow = existingByCode.get(code);
    if (!existingRow) {
      missing.push(code);
      continue;
    }

    const wrapper = wrapperConfig[code] || {};
    const canonicalProject = wrapper.canonical_code
      ? configProjects[wrapper.canonical_code] || null
      : null;

    const payload = {
      act_project_code: wrapper.canonical_code || existingRow.act_project_code || code,
      metadata: buildLegacyWrapperMetadata(code, wrapper, canonicalProject, existingRow),
      external_references: buildLegacyWrapperExternalReferences(code, wrapper, canonicalProject, existingRow),
    };

    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('code', code);

    if (error) throw error;
    updated += 1;
  }

  return { updated, missing };
}

async function main() {
  const configProjects = readConfig();
  const legacyWrappers = readIdentityRules();
  const projectList = Object.values(configProjects);
  const codes = projectList.map((project) => project.code);
  const existingRows = await fetchExistingRows(codes);
  const existingByCode = new Map(existingRows.map((row) => [row.code, row]));
  const defaultOrganizationId = pickDefaultOrganizationId(existingRows);

  const upsertRowsPayload = projectList.map((project) =>
    toUpsertRow(project, existingByCode.get(project.code), defaultOrganizationId)
  );

  if (dryRun) {
    const missing = upsertRowsPayload.filter((row) => !existingByCode.has(row.code));
    console.log(JSON.stringify({
      mode: 'dry-run',
      totalConfigProjects: projectList.length,
      existingRows: existingRows.length,
      willInsert: missing.length,
      willUpsert: upsertRowsPayload.length,
      defaultOrganizationId,
      samples: upsertRowsPayload
        .filter((row) => ['ACT-CF', 'ACT-CM', 'ACT-CP', 'ACT-CT'].includes(row.code))
        .map((row) => ({
          code: row.code,
          name: row.name,
          tier: row.tier,
          status: row.status,
          canonical_slug: row.metadata?.canonical_slug || null,
          organization_id: row.organization_id || null,
        })),
    }, null, 2));
    return;
  }

  await upsertRows(upsertRowsPayload);
  const legacyWrapperResult = await patchLegacyWrappers(legacyWrappers, configProjects);

  console.log(
    `synced ${upsertRowsPayload.length} canonical projects into public.projects ` +
    `(${upsertRowsPayload.filter((row) => !existingByCode.has(row.code)).length} inserted, ` +
    `${upsertRowsPayload.filter((row) => existingByCode.has(row.code)).length} updated; ` +
    `${legacyWrapperResult.updated} legacy wrappers patched, ` +
    `${legacyWrapperResult.missing.length} missing wrappers)`
  );
}

main().catch((error) => {
  console.error('sync-project-codes-to-supabase failed:', error);
  process.exit(1);
});
