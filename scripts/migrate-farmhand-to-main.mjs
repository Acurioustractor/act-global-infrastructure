#!/usr/bin/env node
/**
 * Migrate Farmhand Data to Main Database
 *
 * Consolidates all Farmhand (bhwyqqbovcjoefezgfnq) data into Main (tednluwflfhxyucgwigh)
 *
 * Migration order (respects foreign keys):
 *   1. sync_state (preserve sync tokens!)
 *   2. learned_thresholds
 *   3. contact_communications → communications_history
 *   4. calendar_events → communications_history (channel='calendar')
 *   5. knowledge_chunks (will need re-embedding)
 *   6. recommendation_outcomes
 *
 * Usage:
 *   node scripts/migrate-farmhand-to-main.mjs [command]
 *
 * Commands:
 *   plan     - Show what will be migrated (dry run)
 *   migrate  - Run the full migration
 *   sync     - Migrate sync_state only
 *   comms    - Migrate communications only
 *   calendar - Migrate calendar events only
 *   knowledge - Migrate knowledge chunks only
 *   verify   - Verify migration completed successfully
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

// Database configuration
const FARMHAND_URL = 'https://bhwyqqbovcjoefezgfnq.supabase.co';
const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';

// Farmhand service role key (source database)
const FARMHAND_KEY = process.env.FARMHAND_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3lxcWJvdmNqb2VmZXpnZm5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU3ODU0NywiZXhwIjoyMDgzMTU0NTQ3fQ.KOqi5dwkGSG3smTA2C1GzYE3osL6AC1Q5Vs9tqHJzps';

// Main service role key (destination database)
const MAIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo';

// Validate configuration
function validateConfig() {
    // Keys have hardcoded fallbacks, so just verify they're present
    if (!FARMHAND_KEY || !MAIN_KEY) {
        console.error('Configuration error: Missing database credentials');
        process.exit(1);
    }
    console.log('✓ Database credentials configured');
    console.log(`  Farmhand: ${FARMHAND_URL}`);
    console.log(`  Main: ${MAIN_URL}`);
}

// Create clients
let farmhand, main;

function initClients() {
    validateConfig();
    farmhand = createClient(FARMHAND_URL, FARMHAND_KEY);
    main = createClient(MAIN_URL, MAIN_KEY);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function countRows(client, table) {
    const { count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
}

async function fetchAllRows(client, table, batchSize = 1000) {
    let allData = [];
    let offset = 0;

    while (true) {
        const { data, error } = await client
            .from(table)
            .select('*')
            .range(offset, offset + batchSize - 1);

        if (error) {
            console.error(`  Error fetching ${table}: ${error.message}`);
            break;
        }

        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        offset += batchSize;
        if (data.length < batchSize) break;
    }

    return allData;
}

async function insertBatch(client, table, rows, options = {}) {
    const { onConflict = null, batchSize = 100, ignoreDuplicates = false } = options;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        let result;

        if (onConflict) {
            // Use upsert for conflict handling
            result = await client.from(table).upsert(batch, {
                onConflict: onConflict,
                ignoreDuplicates: ignoreDuplicates
            });
        } else {
            result = await client.from(table).insert(batch);
        }

        const { error } = result;

        if (error) {
            errors += batch.length;
            console.error(`    Batch error: ${error.message}`);
        } else {
            inserted += batch.length;
        }
    }

    return { inserted, errors };
}

// ============================================================================
// MIGRATION: SYNC STATE
// ============================================================================

async function migrateSyncState() {
    console.log('\n📋 Migrating sync_state...');

    const rows = await fetchAllRows(farmhand, 'sync_state');
    console.log(`  Found ${rows.length} sync states in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Upsert to Main (preserve existing sync tokens!)
    const { inserted, errors } = await insertBatch(main, 'sync_state', rows, {
        onConflict: 'id'
    });

    console.log(`  ✓ Migrated ${inserted} sync states (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: LEARNED THRESHOLDS
// ============================================================================

async function migrateLearnedThresholds() {
    console.log('\n📊 Migrating learned_thresholds...');

    const rows = await fetchAllRows(farmhand, 'learned_thresholds');
    console.log(`  Found ${rows.length} thresholds in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Main schema: id, threshold_type, segment, value, confidence, sample_size,
    //              prior_value, prior_strength, last_learned_at, learning_data, created_at, updated_at
    // Farmhand:    id, segment, threshold_days, confidence, sample_size, prior_alpha, prior_beta, last_updated
    const mapped = rows.map(r => ({
        threshold_type: 'contact_frequency',  // Add type for Main schema
        segment: r.segment,
        value: r.threshold_days,  // threshold_days → value
        confidence: r.confidence,
        sample_size: r.sample_size,
        prior_value: r.prior_alpha || 2,  // Map beta prior to prior_value
        prior_strength: r.prior_beta || 2,  // Map to prior_strength
        last_learned_at: r.last_updated || new Date().toISOString(),
        learning_data: {}  // Empty JSONB
    }));

    const { inserted, errors } = await insertBatch(main, 'learned_thresholds', mapped, {
        onConflict: 'segment',
        ignoreDuplicates: true  // Skip existing segments
    });

    console.log(`  ✓ Migrated ${inserted} thresholds (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: CONTACT COMMUNICATIONS (LEGACY TABLE)
// ============================================================================

async function migrateContactCommunications() {
    console.log('\n📧 Migrating contact_communications → communications_history...');

    const rows = await fetchAllRows(farmhand, 'contact_communications');
    console.log(`  Found ${rows.length} communications in Farmhand contact_communications`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate from contact_communications');
        return { migrated: 0 };
    }

    // Fetch ALL GHL contacts to map email → ghl_id and validate existing IDs
    const { data: ghlContacts } = await main
        .from('ghl_contacts')
        .select('ghl_id, email');

    const emailToGhlId = new Map();
    const validGhlIds = new Set();
    for (const c of (ghlContacts || [])) {
        validGhlIds.add(c.ghl_id);  // Track all valid GHL IDs
        if (c.email) {
            emailToGhlId.set(c.email.toLowerCase(), c.ghl_id);
        }
    }
    console.log(`  Loaded ${ghlContacts?.length || 0} GHL contacts (${emailToGhlId.size} with email) for mapping`);

    // Map sentiment score to text
    function mapSentiment(score) {
        if (score === null || score === undefined) return null;
        if (score >= 0.6) return 'positive';
        if (score <= -0.3) return 'negative';
        if (score <= -0.6) return 'urgent';
        return 'neutral';
    }

    // UUID regex for validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Transform to communications_history schema
    const mapped = rows.map(r => {
        // Try to resolve ghl_contact_id (might be email, UUID, or other identifier)
        let ghlContactId = r.ghl_contact_id;
        let contactEmail = null;

        // Check if ghl_contact_id is a valid UUID AND exists in GHL contacts
        if (ghlContactId) {
            if (uuidRegex.test(ghlContactId)) {
                // It's a valid UUID format - but verify it exists in GHL
                if (!validGhlIds.has(ghlContactId)) {
                    ghlContactId = null;  // UUID doesn't exist in GHL, set to null
                }
            } else if (ghlContactId.includes('@')) {
                // It's an email, try to lookup GHL contact
                contactEmail = ghlContactId.toLowerCase();
                ghlContactId = emailToGhlId.get(contactEmail) || null;
            } else {
                // Not a UUID or email - set to null
                ghlContactId = null;
            }
        }

        // Extract email from metadata if available
        if (!contactEmail && r.metadata) {
            const from = r.metadata.from || '';
            const match = from.match(/<([^>]+@[^>]+)>/) || from.match(/([^\s<]+@[^\s>]+)/);
            if (match) contactEmail = match[1].toLowerCase();
        }

        // Store contact info in key_decisions for retroactive linking
        // (from_identity is UUID type, can't store emails there)
        const contactInfo = contactEmail ? [{
            type: 'contact_info',
            email: contactEmail,
            name: r.metadata?.fromName || null
        }] : null;

        return {
            ghl_contact_id: ghlContactId,
            channel: r.comm_type || 'email',
            direction: r.direction || 'inbound',
            // from_identity is UUID - leave null, use key_decisions for contact info
            subject: r.subject,
            content_preview: (r.summary || r.full_content || '').slice(0, 500),
            summary: r.summary,
            sentiment: mapSentiment(r.sentiment_score),
            topics: r.topics || [],
            action_items: r.action_items ? r.action_items.map(a =>
                typeof a === 'string' ? { text: a } : a
            ) : null,
            key_decisions: contactInfo,  // Store contact email here for retroactive linking
            occurred_at: r.occurred_at,
            source_system: r.source || 'gmail',
            source_id: r.source_id,
            source_thread_id: r.metadata?.threadId || null,
            synced_at: r.created_at,
            created_at: r.created_at,
            updated_at: r.updated_at
        };
    });

    // Insert with conflict handling on source_system + source_id
    const { inserted, errors } = await insertBatch(main, 'communications_history', mapped);

    console.log(`  ✓ Migrated ${inserted} from contact_communications (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: COMMUNICATION HISTORY (NEWER TABLE WITH THREADING)
// ============================================================================

async function migrateCommunicationHistory() {
    console.log('\n📧 Migrating communication_history (newer table with threading)...');

    const rows = await fetchAllRows(farmhand, 'communication_history');
    console.log(`  Found ${rows.length} communications in Farmhand communication_history`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate from communication_history');
        return { migrated: 0 };
    }

    // Transform to Main communications_history schema
    const mapped = rows.map(r => ({
        ghl_contact_id: r.ghl_contact_id,
        contact_email: r.contact_email?.toLowerCase() || null,
        contact_name: r.contact_name,
        channel: r.channel || 'email',
        direction: r.direction || 'inbound',
        subject: r.subject,
        content_preview: r.content_summary?.slice(0, 500) || null,
        summary: r.content_summary,
        // Threading fields (NEW in Main schema)
        is_reply: r.is_reply || false,
        has_reply: r.has_reply || false,
        requires_response: r.requires_response || false,
        response_received_at: r.response_received_at,
        // Source tracking
        occurred_at: r.communicated_at,
        source_system: r.source || 'gmail',
        source_id: r.external_id,
        source_thread_id: r.thread_id,
        synced_at: r.created_at,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));

    // Insert (skip conflicts - contact_communications may have already inserted some)
    const { inserted, errors } = await insertBatch(main, 'communications_history', mapped);

    console.log(`  ✓ Migrated ${inserted} from communication_history (${errors} errors/skipped)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: ENTITIES (CANONICAL PERSON RECORDS)
// ============================================================================

async function migrateEntities() {
    console.log('\n👤 Migrating entities (canonical person records)...');

    const rows = await fetchAllRows(farmhand, 'entities');
    console.log(`  Found ${rows.length} entities in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    const { inserted, errors } = await insertBatch(main, 'entities', rows, {
        onConflict: 'primary_email'
    });

    console.log(`  ✓ Migrated ${inserted} entities (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: ENTITY MAPPINGS
// ============================================================================

async function migrateEntityMappings() {
    console.log('\n🔗 Migrating entity_mappings...');

    const rows = await fetchAllRows(farmhand, 'entity_mappings');
    console.log(`  Found ${rows.length} entity mappings in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    const { inserted, errors } = await insertBatch(main, 'entity_mappings', rows);

    console.log(`  ✓ Migrated ${inserted} entity mappings (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: CONTACT REVIEW DECISIONS
// ============================================================================

async function migrateContactReviewDecisions() {
    console.log('\n📋 Migrating contact_review_decisions...');

    const rows = await fetchAllRows(farmhand, 'contact_review_decisions');
    console.log(`  Found ${rows.length} contact review decisions in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Remove generated column before insert
    const mapped = rows.map(r => {
        const { normalized_email, ...rest } = r;
        return rest;
    });

    const { inserted, errors } = await insertBatch(main, 'contact_review_decisions', mapped, {
        onConflict: 'email'
    });

    console.log(`  ✓ Migrated ${inserted} contact review decisions (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: CALENDAR EVENTS
// ============================================================================

async function migrateCalendarEvents() {
    console.log('\n📅 Migrating calendar_events → communications_history...');

    const rows = await fetchAllRows(farmhand, 'calendar_events');
    console.log(`  Found ${rows.length} calendar events in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Transform to communications_history schema
    const mapped = rows.map(r => ({
        channel: 'calendar',
        direction: 'internal',
        subject: r.title || r.summary,
        content_preview: (r.description || '').slice(0, 500),
        summary: r.description,
        topics: r.event_type ? [r.event_type] : [],
        occurred_at: r.start_time || r.start,
        source_system: 'google_calendar',
        source_id: r.google_event_id || r.id,
        synced_at: r.created_at,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));

    const { inserted, errors } = await insertBatch(main, 'communications_history', mapped);

    console.log(`  ✓ Migrated ${inserted} calendar events (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// MIGRATION: KNOWLEDGE CHUNKS
// ============================================================================

async function migrateKnowledgeChunks() {
    console.log('\n🧠 Migrating knowledge_chunks...');

    const rows = await fetchAllRows(farmhand, 'knowledge_chunks');
    console.log(`  Found ${rows.length} knowledge chunks in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Transform - NOTE: embeddings will need re-generation (different dimensions)
    // Main schema: id, content, embedding, source_type, source_id, project_id, file_path, metadata, confidence, created_at, updated_at
    // Farmhand has extra: chunk_index, summary, topics, content_hash - store in metadata
    const mapped = rows.map(r => ({
        content: r.content,
        embedding: null,  // Will be re-embedded with 384-dim model
        source_type: r.source_type || 'document',
        source_id: r.source_id,
        project_id: r.project_id,
        file_path: r.file_path,
        confidence: r.confidence || 0.8,
        metadata: {
            ...(r.metadata || {}),
            chunk_index: r.chunk_index,
            summary: r.summary,
            topics: r.topics,
            content_hash: r.content_hash
        },
        created_at: r.created_at,
        updated_at: r.updated_at
    }));

    const { inserted, errors } = await insertBatch(main, 'knowledge_chunks', mapped);

    console.log(`  ✓ Migrated ${inserted} knowledge chunks (${errors} errors)`);
    console.log(`  ⚠️  Note: Embeddings need regeneration with reembed-knowledge.mjs`);
    return { migrated: inserted, errors, needsReembedding: true };
}

// ============================================================================
// MIGRATION: RECOMMENDATION OUTCOMES
// ============================================================================

async function migrateRecommendationOutcomes() {
    console.log('\n🎯 Migrating recommendation_outcomes...');

    const rows = await fetchAllRows(farmhand, 'recommendation_outcomes');
    console.log(`  Found ${rows.length} recommendations in Farmhand`);

    if (rows.length === 0) {
        console.log('  Nothing to migrate');
        return { migrated: 0 };
    }

    // Direct mapping (schema should be compatible)
    const { inserted, errors } = await insertBatch(main, 'recommendation_outcomes', rows);

    console.log(`  ✓ Migrated ${inserted} recommendations (${errors} errors)`);
    return { migrated: inserted, errors };
}

// ============================================================================
// COMMANDS
// ============================================================================

async function showPlan() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Migration Plan: Farmhand → Main');
    console.log('═══════════════════════════════════════════════════════════════\n');

    initClients();

    const tables = [
        // Sync state
        { source: 'sync_state', target: 'sync_state', category: 'Core' },
        { source: 'learned_thresholds', target: 'learned_thresholds', category: 'Core' },

        // Entity resolution
        { source: 'entities', target: 'entities', category: 'Entities' },
        { source: 'entity_mappings', target: 'entity_mappings', category: 'Entities' },

        // Communications (BOTH tables!)
        { source: 'contact_communications', target: 'communications_history', category: 'Communications' },
        { source: 'communication_history', target: 'communications_history (merge)', category: 'Communications' },
        { source: 'calendar_events', target: 'communications_history (calendar)', category: 'Communications' },

        // Contact discovery
        { source: 'contact_review_decisions', target: 'contact_review_decisions', category: 'Contacts' },

        // Intelligence
        { source: 'knowledge_chunks', target: 'knowledge_chunks (re-embed)', category: 'Intelligence' },
        { source: 'recommendation_outcomes', target: 'recommendation_outcomes', category: 'Intelligence' },
    ];

    console.log('Source: Farmhand (bhwyqqbovcjoefezgfnq)');
    console.log('Target: Main (tednluwflfhxyucgwigh)');
    console.log('');

    let currentCategory = '';
    let totalFarmhand = 0;
    let totalMain = 0;

    for (const t of tables) {
        if (t.category !== currentCategory) {
            console.log(`\n${t.category}:`);
            console.log('─────────────────────────────────────────────────────────────────');
            currentCategory = t.category;
        }

        const count = await countRows(farmhand, t.source);
        const targetTable = t.target.split(' ')[0];
        const targetCount = await countRows(main, targetTable);

        totalFarmhand += count;
        totalMain += targetCount;

        const status = count > 0 ? '📦' : '○';
        console.log(`  ${status} ${t.source.padEnd(25)} → ${t.target}`);
        console.log(`      Farmhand: ${count.toString().padStart(6)} rows | Main: ${targetCount.toString().padStart(6)} rows`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total Farmhand rows to migrate: ${totalFarmhand}`);
    console.log(`  Current Main rows: ${totalMain}`);

    // Check GHL contacts for linking
    const { count: ghlCount } = await main
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);
    console.log(`  GHL contacts with email (for linking): ${ghlCount}`);

    console.log('');
    console.log('Run with: node scripts/migrate-farmhand-to-main.mjs migrate');
    console.log('');
    console.log('Or run individual steps:');
    console.log('  node scripts/migrate-farmhand-to-main.mjs comms     # Communications');
    console.log('  node scripts/migrate-farmhand-to-main.mjs entities  # Entity resolution');
    console.log('  node scripts/migrate-farmhand-to-main.mjs link      # Retroactive contact linking');
}

// ============================================================================
// RETROACTIVE CONTACT LINKING
// Link historical communications to GHL contacts by email
// ============================================================================

async function retroactiveLinkContacts() {
    console.log('\n🔗 Retroactively linking communications to GHL contacts...');

    // Get all GHL contacts with emails
    const { data: ghlContacts } = await main
        .from('ghl_contacts')
        .select('ghl_id, email')
        .not('email', 'is', null);

    const emailToGhlId = new Map();
    for (const c of (ghlContacts || [])) {
        if (c.email) {
            emailToGhlId.set(c.email.toLowerCase(), c.ghl_id);
        }
    }
    console.log(`  Loaded ${emailToGhlId.size} GHL contacts`);

    // Find communications with contact_info in key_decisions but no ghl_contact_id
    const { data: unlinked } = await main
        .from('communications_history')
        .select('id, key_decisions')
        .not('key_decisions', 'is', null)
        .is('ghl_contact_id', null);

    console.log(`  Found ${unlinked?.length || 0} unlinked communications with contact info`);

    if (!unlinked || unlinked.length === 0) {
        console.log('  ✓ All communications already linked!');
        return { linked: 0 };
    }

    let linked = 0;
    let batches = 0;
    const batchSize = 100;
    const updates = [];

    for (const comm of unlinked) {
        // Extract email from key_decisions contact_info
        let email = null;
        if (Array.isArray(comm.key_decisions)) {
            const contactInfo = comm.key_decisions.find(d =>
                d && (d.type === 'contact_info' || d.email)
            );
            if (contactInfo && contactInfo.email) {
                email = contactInfo.email.toLowerCase();
            }
        }
        if (!email) continue;
        const ghlId = emailToGhlId.get(email);
        if (ghlId) {
            updates.push({ id: comm.id, ghl_contact_id: ghlId });
        }
    }

    console.log(`  ${updates.length} communications can be linked to contacts`);

    // Update in batches
    for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        for (const update of batch) {
            await main
                .from('communications_history')
                .update({ ghl_contact_id: update.ghl_contact_id })
                .eq('id', update.id);
            linked++;
        }
        batches++;
        process.stdout.write(`\r  Processing batch ${batches}... (${linked}/${updates.length})`);
    }

    console.log(`\n  ✓ Linked ${linked} communications to GHL contacts`);

    // Trigger relationship_health updates for newly linked contacts
    console.log('\n  Triggering relationship health recalculation...');

    return { linked };
}

async function runFullMigration() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Full Migration: Farmhand → Main');
    console.log('═══════════════════════════════════════════════════════════════\n');

    initClients();

    const results = {
        // Core sync state (FIRST - preserves sync tokens)
        sync_state: await migrateSyncState(),
        learned_thresholds: await migrateLearnedThresholds(),

        // Entity resolution
        entities: await migrateEntities(),
        entity_mappings: await migrateEntityMappings(),

        // Communications (BOTH tables)
        contact_communications: await migrateContactCommunications(),
        communication_history: await migrateCommunicationHistory(),
        calendar: await migrateCalendarEvents(),

        // Contact discovery
        contact_reviews: await migrateContactReviewDecisions(),

        // Intelligence
        knowledge: await migrateKnowledgeChunks(),
        recommendations: await migrateRecommendationOutcomes(),
    };

    // Retroactive linking
    const linkResults = await retroactiveLinkContacts();
    results.retroactive_linking = linkResults;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Migration Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalMigrated = 0;
    let totalErrors = 0;

    for (const [table, result] of Object.entries(results)) {
        const migrated = result.migrated || result.linked || 0;
        const errors = result.errors || 0;
        console.log(`  ${table.padEnd(25)} ${migrated} migrated, ${errors} errors`);
        totalMigrated += migrated;
        totalErrors += errors;
    }

    console.log('');
    console.log(`  Total: ${totalMigrated} records migrated, ${totalErrors} errors`);

    if (results.knowledge?.needsReembedding) {
        console.log('\n⚠️  Next step: Re-embed knowledge chunks');
        console.log('   Run: node scripts/reembed-knowledge.mjs');
    }

    console.log('\n✅ Migration complete!');
    console.log('   Run verification: node scripts/migrate-farmhand-to-main.mjs verify');
}

async function verifyMigration() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Migration Verification');
    console.log('═══════════════════════════════════════════════════════════════\n');

    initClients();

    const checks = [
        { name: 'sync_state', farmhand: 'sync_state', main: 'sync_state' },
        { name: 'learned_thresholds', farmhand: 'learned_thresholds', main: 'learned_thresholds' },
        { name: 'communications', farmhand: 'contact_communications', main: 'communications_history' },
        { name: 'knowledge', farmhand: 'knowledge_chunks', main: 'knowledge_chunks' },
        { name: 'recommendations', farmhand: 'recommendation_outcomes', main: 'recommendation_outcomes' },
    ];

    let allPassed = true;

    for (const check of checks) {
        const farmhandCount = await countRows(farmhand, check.farmhand);
        const mainCount = await countRows(main, check.main);

        // Main should have at least as many rows as Farmhand
        const passed = mainCount >= farmhandCount;
        const icon = passed ? '✅' : '❌';

        console.log(`${icon} ${check.name.padEnd(20)} Farmhand: ${farmhandCount.toString().padStart(5)} | Main: ${mainCount.toString().padStart(5)}`);

        if (!passed) allPassed = false;
    }

    console.log('');
    if (allPassed) {
        console.log('✅ All verification checks passed!');
    } else {
        console.log('❌ Some verification checks failed. Review the migration.');
    }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'plan';

switch (command) {
    case 'plan':
        await showPlan();
        break;
    case 'migrate':
        await runFullMigration();
        break;
    case 'sync':
        initClients();
        await migrateSyncState();
        break;
    case 'comms':
        initClients();
        await migrateContactCommunications();
        await migrateCommunicationHistory();
        break;
    case 'calendar':
        initClients();
        await migrateCalendarEvents();
        break;
    case 'entities':
        initClients();
        await migrateEntities();
        await migrateEntityMappings();
        break;
    case 'knowledge':
        initClients();
        await migrateKnowledgeChunks();
        break;
    case 'link':
        initClients();
        await retroactiveLinkContacts();
        break;
    case 'verify':
        await verifyMigration();
        break;
    default:
        console.log('Usage: node scripts/migrate-farmhand-to-main.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  plan      - Show migration plan (default)');
        console.log('  migrate   - Run full migration (ALL tables + linking)');
        console.log('  sync      - Migrate sync_state only');
        console.log('  comms     - Migrate BOTH communication tables');
        console.log('  entities  - Migrate entities + mappings');
        console.log('  calendar  - Migrate calendar events');
        console.log('  knowledge - Migrate knowledge chunks');
        console.log('  link      - Retroactively link communications to GHL contacts');
        console.log('  verify    - Verify migration completed');
}
