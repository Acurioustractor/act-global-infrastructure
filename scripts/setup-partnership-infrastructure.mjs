#!/usr/bin/env node
/**
 * Setup Partnership Infrastructure in GHL
 *
 * Seeds the Mukurtu Node Activation pipeline with initial community nodes
 * and applies partnership thread tags to relevant contacts.
 *
 * PREREQUISITE: You must first create these in GHL UI manually:
 *   1. Pipeline: "Mukurtu Node Activation" with stages:
 *      Scoping → Champion Identified → Technical Assessment → Setup → Live → Sustained
 *   2. Custom fields on contacts:
 *      - mukurtu_node_community (text)
 *      - world_tour_stop (text)
 *      - partnership_thread (text/multi-line)
 *   3. Tags are created automatically when applied to contacts.
 *
 * Usage:
 *   node scripts/setup-partnership-infrastructure.mjs              # Dry run
 *   node scripts/setup-partnership-infrastructure.mjs --apply      # Apply changes
 *   node scripts/setup-partnership-infrastructure.mjs --apply --seed-nodes   # + create pipeline opportunities
 *   node scripts/setup-partnership-infrastructure.mjs --apply --tag-contacts # + tag existing contacts
 *   node scripts/setup-partnership-infrastructure.mjs --apply --all         # Do everything
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

// GHL v2 requires contactId on all opportunities — fallback to Ben Knight's contact
const FALLBACK_CONTACT_ID = 'D7bV2Nax6h7lJXsnEFhC';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SEED_NODES = args.includes('--seed-nodes') || args.includes('--all');
const TAG_CONTACTS = args.includes('--tag-contacts') || args.includes('--all');

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================
// New Tags
// ============================================

const NEW_TAGS = [
  'ila-grant',           // Everyone involved in the ILA application
  'mukurtu-node',        // Community partners for distributed archive network
  'world-tour-partner',  // Confirmed partners (vs just researched contacts)
];

// ============================================
// Mukurtu Node Definitions
// ============================================

const MUKURTU_NODES = [
  {
    name: 'Palm Island — Mukurtu Node',
    community: 'Palm Island',
    champion: 'Rachel Atkinson',
    championEmail: null, // Find via GHL search
    status: 'Scoping',
    notes: 'ILA grant Year 3 deliverable. PICC as lead org. Manbarra language + Elder journey archives.',
  },
  {
    name: 'Stradbroke Island — Mukurtu Node',
    community: 'Stradbroke Island (Minjerribah)',
    champion: 'Shaun Fisher',
    championEmail: null,
    status: 'Scoping',
    notes: 'Quandamooka connection via The Harvest. Sea country knowledge.',
  },
  {
    name: 'Mount Druitt — Mukurtu Node',
    community: 'Mount Druitt',
    champion: null,
    championEmail: null,
    status: 'Scoping',
    notes: 'Urban Aboriginal community archive. JusticeHub crossover — justice stories + data ownership.',
  },
  {
    name: 'Alice Springs — Mukurtu Node',
    community: 'Alice Springs (Mparntwe)',
    champion: 'Bloomfield Family',
    championEmail: null,
    status: 'Scoping',
    notes: 'World Tour stop. Oonchiumpa partnership. Arrernte knowledge, youth diversion.',
  },
  {
    name: 'Tennant Creek — Mukurtu Node',
    community: 'Tennant Creek',
    champion: null,
    championEmail: null,
    status: 'Scoping',
    notes: 'Origin of Mukurtu (Warumungu). Wumpurrarni-kari archive already exists. Connection to source.',
  },
];

// ============================================
// Tag Rules — which existing contacts get which new tags
// ============================================

const TAG_RULES = [
  {
    newTag: 'ila-grant',
    matchBy: 'existingTags',
    matchValues: ['picc', 'palm-island', 'palm island'],
    description: 'Tag Palm Island contacts with ila-grant',
  },
  {
    newTag: 'mukurtu-node',
    matchBy: 'existingTags',
    matchValues: ['picc', 'palm-island', 'palm island'],
    description: 'Tag Palm Island contacts as mukurtu-node (first node)',
  },
  {
    newTag: 'world-tour-partner',
    matchBy: 'existingTags',
    matchValues: ['world-tour'],
    description: 'Upgrade world-tour tagged contacts to confirmed partners (review manually)',
  },
];

// ============================================
// Seed Mukurtu Node Pipeline
// ============================================

async function seedMukurtuNodes(ghl) {
  log('\n━━━ Seeding Mukurtu Node Pipeline ━━━');

  // Find the pipeline
  const pipeline = await ghl.getPipelineByName('Mukurtu Node');
  if (!pipeline) {
    log('ERROR: "Mukurtu Node Activation" pipeline not found in GHL.');
    log('Create it first in GHL UI with stages:');
    log('  Scoping → Champion Identified → Technical Assessment → Setup → Live → Sustained');
    return;
  }

  log(`Found pipeline: ${pipeline.name} (${pipeline.id})`);

  // Get first stage (Scoping)
  const scopingStage = pipeline.stages?.[0];
  if (!scopingStage) {
    log('ERROR: No stages found in pipeline. Add stages in GHL UI.');
    return;
  }
  log(`First stage: ${scopingStage.name} (${scopingStage.id})`);

  // Check existing opportunities to avoid duplicates
  const existing = await ghl.getOpportunities(pipeline.id);
  const existingNames = new Set(existing.map(o => o.name?.toLowerCase()));

  for (const node of MUKURTU_NODES) {
    if (existingNames.has(node.name.toLowerCase())) {
      log(`  SKIP: "${node.name}" already exists`);
      continue;
    }

    log(`  CREATE: "${node.name}" → ${scopingStage.name}`);

    if (APPLY) {
      // Find champion contact via Supabase ghl_contacts (more reliable than GHL search API)
      let contactId = null;
      if (node.champion) {
        const { data: matches } = await supabase
          .from('ghl_contacts')
          .select('ghl_id, full_name')
          .ilike('full_name', `%${node.champion.split(' ')[0]}%`)
          .limit(1);

        if (matches && matches.length > 0) {
          contactId = matches[0].ghl_id;
          log(`    Linked to contact: ${matches[0].full_name} (${contactId})`);
        } else {
          log(`    Note: Champion "${node.champion}" not found in contacts — creating without link`);
        }
      }

      // GHL v2 requires contactId — use fallback if no champion found
      if (!contactId) {
        contactId = FALLBACK_CONTACT_ID;
        log(`    Using fallback contact for opportunity`);
      }

      try {
        await ghl.createOpportunity({
          pipelineId: pipeline.id,
          stageId: scopingStage.id,
          name: node.name,
          status: 'open',
          contactId,
        });
        log(`    Created in pipeline`);
      } catch (err) {
        log(`    ERROR creating opportunity: ${err.message}`);
      }
    }
  }
}

// ============================================
// Tag Existing Contacts
// ============================================

async function tagContacts(ghl) {
  log('\n━━━ Applying Partnership Thread Tags ━━━');

  for (const rule of TAG_RULES) {
    log(`\n${rule.description}`);

    // Query contacts from Supabase ghl_contacts (GHL v2 API doesn't support tag filtering on list)
    let matchedContacts = [];
    for (const matchTag of rule.matchValues) {
      const { data, error } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .contains('tags', [matchTag]);

      if (error) {
        log(`  Error querying Supabase for tag "${matchTag}": ${error.message}`);
        continue;
      }
      if (data) matchedContacts.push(...data);
    }

    // Deduplicate by GHL ID
    const seen = new Set();
    matchedContacts = matchedContacts.filter(c => {
      if (seen.has(c.ghl_id)) return false;
      seen.add(c.ghl_id);
      return true;
    });

    log(`  Found ${matchedContacts.length} contacts matching [${rule.matchValues.join(', ')}]`);

    let applied = 0;
    for (const contact of matchedContacts) {
      const existingTags = contact.tags || [];
      if (existingTags.includes(rule.newTag)) {
        continue; // Already has this tag
      }

      const name = contact.full_name || contact.email || contact.ghl_id;
      log(`  TAG: "${name}" + ${rule.newTag}`);

      if (APPLY) {
        try {
          await ghl.addTagToContact(contact.ghl_id, rule.newTag);
          applied++;
        } catch (err) {
          log(`  ERROR tagging ${name}: ${err.message}`);
        }
      }
    }

    log(`  ${APPLY ? `Applied to ${applied}` : `Would apply to ${matchedContacts.length}`} contacts`);
  }
}

// ============================================
// Sync tags to Supabase ghl_contacts
// ============================================

async function syncTagsToSupabase() {
  log('\n━━━ Syncing Updated Tags to Supabase ━━━');

  // Pull fresh contact data from GHL and update Supabase tags column
  // This ensures the Notion sync picks up the new tags
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, tags')
    .or(NEW_TAGS.map(t => `tags.cs.{${t}}`).join(','));

  if (error) {
    log(`Note: Supabase sync skipped (tags will sync on next full GHL→Supabase sync)`);
    return;
  }

  log(`${contacts?.length || 0} contacts in Supabase already have new tags`);
  log('Run sync-ghl-to-supabase.mjs to pull latest tags from GHL → Supabase → Notion');
}

// ============================================
// Print Setup Checklist
// ============================================

function printChecklist() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GHL PARTNERSHIP INFRASTRUCTURE — SETUP CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Do these in the GHL UI FIRST (Settings → Pipelines / Custom Fields):

  ┌─────────────────────────────────────────────────────────────────┐
  │ 1. CREATE PIPELINE: "Mukurtu Node Activation"                  │
  │                                                                │
  │    Stages (in order):                                          │
  │    ○ Scoping                                                   │
  │    ○ Champion Identified                                       │
  │    ○ Technical Assessment                                      │
  │    ○ Setup                                                     │
  │    ○ Live                                                      │
  │    ○ Sustained                                                 │
  │                                                                │
  │    Settings → Pipelines → + New Pipeline                       │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │ 2. CREATE CUSTOM FIELDS (on Contacts):                         │
  │                                                                │
  │    ○ mukurtu_node_community  (Single Line Text)                │
  │      → Which community this contact champions                  │
  │                                                                │
  │    ○ world_tour_stop  (Single Line Text)                       │
  │      → Which tour stop this partner is linked to               │
  │                                                                │
  │    ○ partnership_thread  (Multi Line Text)                     │
  │      → Comma-separated: world-tour, ila-grant, mukurtu,       │
  │        justicehub, harvest                                     │
  │                                                                │
  │    Settings → Custom Fields → + Add Field                      │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │ 3. TAGS (created automatically by this script):                │
  │                                                                │
  │    ○ ila-grant          — ILA application contacts             │
  │    ○ mukurtu-node       — Distributed archive partners         │
  │    ○ world-tour-partner — Confirmed tour partners              │
  │                                                                │
  │    No manual action needed — tags are auto-created when        │
  │    applied to contacts via API.                                │
  └─────────────────────────────────────────────────────────────────┘

  After completing steps 1-2 in GHL UI, run:

    node scripts/setup-partnership-infrastructure.mjs --apply --all

  This will:
    • Seed 5 Mukurtu node opportunities in the pipeline
    • Apply ila-grant and mukurtu-node tags to Palm Island contacts
    • Flag world-tour contacts as confirmed partners

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// ============================================
// Main
// ============================================

async function main() {
  printChecklist();

  if (!APPLY) {
    log('DRY RUN — pass --apply to make changes');
    log('Options: --seed-nodes, --tag-contacts, or --all\n');
  }

  let ghl;
  try {
    ghl = createGHLService();
    const health = await ghl.healthCheck();
    if (!health.healthy) {
      log(`GHL connection failed: ${health.error}`);
      return;
    }
    log('GHL connection: OK');
  } catch (err) {
    log(`GHL not configured: ${err.message}`);
    log('Set GHL_API_KEY and GHL_LOCATION_ID in .env.local');
    return;
  }

  // List existing tags for reference (may fail on some GHL API versions)
  try {
    const existingTags = await ghl.getContactTags();
    log(`Existing tags in GHL: ${existingTags.length}`);
    const newTagsExist = NEW_TAGS.filter(t =>
      existingTags.some(et => (et.name || et).toLowerCase() === t.toLowerCase())
    );
    const newTagsMissing = NEW_TAGS.filter(t =>
      !existingTags.some(et => (et.name || et).toLowerCase() === t.toLowerCase())
    );
    if (newTagsExist.length > 0) log(`  Already exist: ${newTagsExist.join(', ')}`);
    if (newTagsMissing.length > 0) log(`  Will create: ${newTagsMissing.join(', ')}`);
  } catch {
    log(`Note: Could not list existing tags (API version). Tags will be created when applied to contacts.`);
    log(`  New tags to create: ${NEW_TAGS.join(', ')}`);
  }

  // List existing pipelines
  const pipelines = await ghl.getPipelines();
  log(`\nExisting pipelines: ${pipelines.map(p => p.name).join(', ')}`);

  const mukurtuPipeline = pipelines.find(p =>
    p.name.toLowerCase().includes('mukurtu')
  );
  if (mukurtuPipeline) {
    log(`  ✓ Mukurtu pipeline found: ${mukurtuPipeline.name}`);
  } else {
    log(`  ✗ Mukurtu pipeline NOT found — create in GHL UI first`);
  }

  // Execute requested operations
  if (SEED_NODES) {
    await seedMukurtuNodes(ghl);
  }

  if (TAG_CONTACTS) {
    await tagContacts(ghl);
    await syncTagsToSupabase();
  }

  if (!SEED_NODES && !TAG_CONTACTS) {
    log('\nNo operations selected. Use --seed-nodes, --tag-contacts, or --all');
  }

  log('\nDone!');
  if (!APPLY) log('💡 Run with --apply to make changes');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
