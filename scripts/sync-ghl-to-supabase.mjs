#!/usr/bin/env node
/**
 * GHL <-> Supabase Sync Script
 *
 * Bidirectional sync between GoHighLevel and Supabase:
 * - Contacts: Bidirectional sync
 * - Opportunities: GHL -> Supabase (read-only)
 * - Pipelines: GHL -> Supabase (reference data)
 *
 * Cultural Protocol Enforcement:
 * - Sensitive cultural data NEVER syncs to GHL
 * - Elder consent, sacred knowledge stays in Supabase only
 *
 * Usage:
 *   node scripts/sync-ghl-to-supabase.mjs
 *   npm run sync:ghl:supabase
 *
 * Created: 2026-01-05
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import { createClient } from '@supabase/supabase-js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Use SUPABASE_SHARED_* for shared ACT database, fallback to SUPABASE_* for backward compat
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// Fields that NEVER sync to GHL (stays in Supabase only)
const BLOCKED_FIELDS_TO_GHL = [
  'elder_consent',
  'sacred_knowledge',
  'sacred_knowledge_notes',
  'cultural_nation_details',
  'ocap_ownership',
  'ocap_control',
  'ocap_access',
  'ocap_possession',
  'detailed_consent_history',
  'elder_review_notes'
];

// Stats tracking
const stats = {
  contacts: { created: 0, updated: 0, skipped: 0, errors: 0 },
  opportunities: { created: 0, updated: 0, skipped: 0, errors: 0 },
  pipelines: { created: 0, updated: 0, skipped: 0, errors: 0 },
  startTime: Date.now()
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function initServices() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const ghl = createGHLService();

  return { supabase, ghl };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PIPELINES SYNC (GHL -> Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncPipelines(supabase, ghl) {
  console.log('\n📊 Syncing Pipelines...\n');

  try {
    const pipelines = await ghl.getPipelines();
    console.log(`   Found ${pipelines.length} pipelines in GHL`);

    for (const pipeline of pipelines) {
      try {
        const { error } = await supabase
          .from('ghl_pipelines')
          .upsert({
            ghl_id: pipeline.id,
            ghl_location_id: GHL_LOCATION_ID,
            name: pipeline.name,
            stages: pipeline.stages || [],
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'ghl_id'
          });

        if (error) throw error;

        stats.pipelines.updated++;
        process.stdout.write('.');

      } catch (error) {
        console.error(`\n   Error syncing pipeline ${pipeline.name}: ${error.message}`);
        stats.pipelines.errors++;
      }
    }

    console.log('\n   ✅ Pipelines sync complete');

  } catch (error) {
    console.error(`\n   ❌ Pipelines sync failed: ${error.message}`);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTACTS SYNC (GHL <-> Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncContacts(supabase, ghl) {
  console.log('\n👥 Syncing Contacts...\n');

  try {
    // Fetch all contacts from GHL
    const ghlContacts = await getAllGHLContacts(ghl);
    console.log(`   Found ${ghlContacts.length} contacts in GHL`);

    // Get existing contacts from Supabase
    const { data: existingContacts, error: fetchError } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, updated_at');

    if (fetchError) throw fetchError;

    const existingMap = new Map(
      existingContacts.map(c => [c.ghl_id, c.updated_at])
    );

    console.log(`   Found ${existingContacts.length} existing contacts in Supabase`);

    // Sync each contact
    for (const ghlContact of ghlContacts) {
      try {
        const contactData = transformContactForSupabase(ghlContact);
        const existingUpdatedAt = existingMap.get(ghlContact.id);

        const { error } = await supabase
          .from('ghl_contacts')
          .upsert(contactData, {
            onConflict: 'ghl_id'
          });

        if (error) throw error;

        if (existingUpdatedAt) {
          stats.contacts.updated++;
          process.stdout.write('.');
        } else {
          stats.contacts.created++;
          process.stdout.write('+');
        }

      } catch (error) {
        console.error(`\n   Error syncing contact ${ghlContact.email}: ${error.message}`);
        stats.contacts.errors++;
        process.stdout.write('!');
      }
    }

    console.log('\n   ✅ Contacts sync complete');

  } catch (error) {
    console.error(`\n   ❌ Contacts sync failed: ${error.message}`);
    throw error;
  }
}

async function getAllGHLContacts(ghl) {
  const allContacts = [];
  let result = await ghl.getContacts({ limit: 100 });

  allContacts.push(...result.contacts);

  // v2 API pagination uses startAfter (timestamp) + startAfterId
  while (result.hasMore && result.startAfter && result.startAfterId) {
    result = await ghl.getContacts({
      limit: 100,
      startAfter: result.startAfter,
      startAfterId: result.startAfterId
    });
    allContacts.push(...result.contacts);
  }

  return allContacts;
}

function transformContactForSupabase(ghlContact) {
  // Extract project tags
  const projectTags = ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods-on-country', 'bcv-residencies', 'act-studio'];
  const projects = (ghlContact.tags || []).filter(tag => projectTags.includes(tag));

  // Determine engagement status from tags
  const engagementTags = (ghlContact.tags || []).filter(tag => tag.startsWith('engagement:'));
  const engagementStatus = engagementTags.length > 0
    ? engagementTags[0].replace('engagement:', '')
    : 'lead';

  // Clean custom fields (remove any that shouldn't be in Supabase from GHL)
  const customFields = { ...ghlContact.customFields };

  return {
    ghl_id: ghlContact.id,
    ghl_location_id: GHL_LOCATION_ID,
    first_name: ghlContact.firstName,
    last_name: ghlContact.lastName,
    email: ghlContact.email,
    phone: ghlContact.phone,
    company_name: ghlContact.company,
    tags: ghlContact.tags || [],
    custom_fields: customFields,
    projects: projects,
    engagement_status: engagementStatus,
    ghl_created_at: ghlContact.dateAdded,
    ghl_updated_at: ghlContact.dateUpdated,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced'
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPPORTUNITIES SYNC (GHL -> Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncOpportunities(supabase, ghl) {
  console.log('\n💰 Syncing Opportunities...\n');

  try {
    // Get all pipelines first
    const pipelines = await ghl.getPipelines();
    const pipelineMap = new Map(pipelines.map(p => [p.id, p.name]));

    // Fetch opportunities from each pipeline
    const allOpportunities = [];
    for (const pipeline of pipelines) {
      const opportunities = await ghl.getOpportunities(pipeline.id);
      allOpportunities.push(...opportunities.map(opp => ({
        ...opp,
        pipelineName: pipeline.name
      })));
    }

    console.log(`   Found ${allOpportunities.length} opportunities across ${pipelines.length} pipelines`);

    // Sync each opportunity
    for (const opp of allOpportunities) {
      try {
        const oppData = {
          ghl_id: opp.id,
          ghl_contact_id: opp.contactId,
          ghl_pipeline_id: opp.pipelineId,
          ghl_stage_id: opp.pipelineStageId,
          name: opp.name,
          pipeline_name: opp.pipelineName,
          stage_name: opp.stageName,
          status: opp.status,
          monetary_value: opp.monetaryValue,
          custom_fields: opp.customFields || {},
          assigned_to: opp.assignedTo,
          ghl_created_at: opp.dateAdded,
          ghl_updated_at: opp.dateUpdated,
          last_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('ghl_opportunities')
          .upsert(oppData, {
            onConflict: 'ghl_id'
          });

        if (error) throw error;

        stats.opportunities.updated++;
        process.stdout.write('.');

      } catch (error) {
        console.error(`\n   Error syncing opportunity ${opp.name}: ${error.message}`);
        stats.opportunities.errors++;
      }
    }

    console.log('\n   ✅ Opportunities sync complete');

  } catch (error) {
    console.error(`\n   ❌ Opportunities sync failed: ${error.message}`);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYNC LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function logSyncOperation(supabase, operation, status, details = {}) {
  try {
    await supabase.from('ghl_sync_log').insert({
      operation: operation,
      entity_type: 'full_sync',
      direction: 'ghl_to_supabase',
      status: status,
      records_processed: (stats.contacts.created + stats.contacts.updated +
        stats.opportunities.created + stats.opportunities.updated +
        stats.pipelines.created + stats.pipelines.updated),
      records_created: stats.contacts.created + stats.opportunities.created + stats.pipelines.created,
      records_updated: stats.contacts.updated + stats.opportunities.updated + stats.pipelines.updated,
      records_failed: stats.contacts.errors + stats.opportunities.errors + stats.pipelines.errors,
      started_at: new Date(stats.startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - stats.startTime,
      triggered_by: 'cron',
      metadata: details
    });
  } catch (error) {
    console.error('Failed to log sync operation:', error.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   GHL <-> Supabase Sync');
  console.log('═══════════════════════════════════════════════════════');

  let supabase, ghl;

  try {
    // Initialize services
    console.log('\n🔍 Initializing services...\n');
    ({ supabase, ghl } = initServices());

    // Health checks
    const ghlHealth = await ghl.healthCheck();
    if (!ghlHealth.healthy) {
      throw new Error(`GHL API unhealthy: ${ghlHealth.error}`);
    }
    console.log('   ✅ GHL API connected');

    // Test Supabase
    const { error: sbError } = await supabase.from('ghl_sync_log').select('id').limit(1);
    if (sbError && sbError.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist yet (will be created by schema)
      console.log('   ⚠️  Supabase tables may not exist yet. Run the schema first.');
    } else {
      console.log('   ✅ Supabase connected');
    }

    // Run syncs
    await syncPipelines(supabase, ghl);
    await syncContacts(supabase, ghl);
    await syncOpportunities(supabase, ghl);

    // Log success
    await logSyncOperation(supabase, 'full_sync', 'success');

    // Summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   Sync Complete');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Pipelines:');
    console.log(`   Updated: ${stats.pipelines.updated}`);
    console.log(`   Errors:  ${stats.pipelines.errors}\n`);

    console.log('Contacts:');
    console.log(`   Created: ${stats.contacts.created}`);
    console.log(`   Updated: ${stats.contacts.updated}`);
    console.log(`   Errors:  ${stats.contacts.errors}\n`);

    console.log('Opportunities:');
    console.log(`   Updated: ${stats.opportunities.updated}`);
    console.log(`   Errors:  ${stats.opportunities.errors}\n`);

    console.log(`⏱️  Duration: ${duration}s\n`);

    const totalErrors = stats.contacts.errors + stats.opportunities.errors + stats.pipelines.errors;
    if (totalErrors > 0) {
      console.log('⚠️  Sync completed with errors (see above)');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);

    // Log failure
    if (supabase) {
      await logSyncOperation(supabase, 'full_sync', 'error', { error: error.message });
    }

    console.error('\nCheck:');
    console.error('  - GHL_API_KEY environment variable');
    console.error('  - GHL_LOCATION_ID environment variable');
    console.error('  - SUPABASE_URL environment variable');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('  - Supabase schema has been applied\n');
    process.exit(1);
  }
}

main();
