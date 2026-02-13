#!/usr/bin/env node
/**
 * GHL Tags Populator: Extract unique tags from ghl_contacts and insert into ghl_tags
 *
 * Reads ghl_contacts.tags arrays, deduplicates, categorizes against project-codes.json,
 * and inserts into ghl_tags table.
 *
 * Usage:
 *   node scripts/backfill-ghl-tags.mjs           # Dry run
 *   node scripts/backfill-ghl-tags.mjs --apply    # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const projectCodes = await loadProjectsConfig();
const applyMode = process.argv.includes('--apply');

// Build tag → project_code map from project-codes.json
function buildTagProjectMap() {
  const map = new Map(); // lowercase tag → { code, name }
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    for (const tag of project.ghl_tags || []) {
      map.set(tag.toLowerCase(), { code, name: project.name });
    }
  }
  return map;
}

async function main() {
  console.log(`\n🏷️  GHL Tags Populator ${applyMode ? '(APPLY MODE)' : '(DRY RUN)'}\n`);

  const tagProjectMap = buildTagProjectMap();

  // Fetch all contacts with tags
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('tags')
    .not('tags', 'is', null);

  if (error) {
    console.error('Error fetching contacts:', error.message);
    process.exit(1);
  }

  // Extract unique tags with counts
  const tagCounts = new Map();
  for (const contact of contacts) {
    if (!Array.isArray(contact.tags)) continue;
    for (const tag of contact.tags) {
      const lower = tag.toLowerCase().trim();
      if (!lower) continue;
      tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
    }
  }

  console.log(`Contacts with tags: ${contacts.length}`);
  console.log(`Unique tags found: ${tagCounts.size}\n`);

  // Categorize tags
  const projectTags = [];
  const uncategorized = [];

  for (const [tag, count] of [...tagCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const project = tagProjectMap.get(tag);
    if (project) {
      projectTags.push({ tag, count, projectCode: project.code, projectName: project.name });
    } else {
      uncategorized.push({ tag, count });
    }
  }

  console.log(`📂 Project-linked tags (${projectTags.length}):`);
  for (const t of projectTags) {
    console.log(`  "${t.tag}" → ${t.projectCode} (${t.projectName}) [${t.count} contacts]`);
  }

  console.log(`\n❓ Uncategorized tags (${uncategorized.length}):`);
  for (const t of uncategorized.slice(0, 20)) {
    console.log(`  "${t.tag}" [${t.count} contacts]`);
  }
  if (uncategorized.length > 20) console.log(`  ... and ${uncategorized.length - 20} more`);

  console.log(`\nSummary: ${projectTags.length} project-linked, ${uncategorized.length} uncategorized\n`);

  if (applyMode) {
    // Check existing tags in ghl_tags table
    const { data: existingTags } = await supabase
      .from('ghl_tags')
      .select('name');

    const existingSet = new Set((existingTags || []).map(t => t.name?.toLowerCase()));

    // Get the GHL location ID from contacts
    const { data: sampleContact } = await supabase
      .from('ghl_contacts')
      .select('ghl_location_id')
      .limit(1)
      .single();
    const locationId = sampleContact?.ghl_location_id || 'agzsSZWgovjwgpcoASWG';

    const toInsert = [];
    for (const [tag, count] of tagCounts) {
      if (existingSet.has(tag)) continue;
      const project = tagProjectMap.get(tag);
      toInsert.push({
        name: tag,
        ghl_location_id: locationId,
        category: project ? projectCodes.projects[project.code]?.category || null : null,
      });
    }

    if (toInsert.length === 0) {
      console.log('All tags already exist in ghl_tags. Nothing to insert.\n');
      return;
    }

    console.log(`Inserting ${toInsert.length} new tags...`);

    // Insert in batches of 50
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error: insertError } = await supabase
        .from('ghl_tags')
        .insert(batch);

      if (insertError) {
        console.error(`  Batch ${Math.floor(i / 50) + 1} failed: ${insertError.message}`);
      }
    }
    console.log(`✅ Inserted ${toInsert.length} tags\n`);
  } else {
    console.log('Run with --apply to write to ghl_tags table.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
