#!/usr/bin/env node
/**
 * Verify Migration
 *
 * Comprehensive verification of the Farmhand → Main database consolidation.
 * Checks data integrity, row counts, relationships, and service functionality.
 *
 * Usage:
 *   node scripts/verify-migration.mjs [command]
 *
 * Commands:
 *   all       - Run all verifications (default)
 *   counts    - Verify row counts
 *   relations - Verify relationships work
 *   views     - Verify views are functional
 *   services  - Test service connectivity
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

// Database configuration
const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// Verification results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

function pass(check, details = '') {
    results.passed++;
    results.details.push({ status: '✅', check, details });
    console.log(`✅ ${check}${details ? `: ${details}` : ''}`);
}

function fail(check, details = '') {
    results.failed++;
    results.details.push({ status: '❌', check, details });
    console.log(`❌ ${check}${details ? `: ${details}` : ''}`);
}

function warn(check, details = '') {
    results.warnings++;
    results.details.push({ status: '⚠️', check, details });
    console.log(`⚠️  ${check}${details ? `: ${details}` : ''}`);
}

// ============================================================================
// VERIFICATION: TABLE EXISTENCE & ROW COUNTS
// ============================================================================

async function verifyRowCounts() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Table Existence & Row Counts');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const tables = [
        { name: 'ghl_contacts', minRows: 100 },
        { name: 'ghl_opportunities', minRows: 10 },
        { name: 'communications_history', minRows: 0 },
        { name: 'relationship_health', minRows: 0 },
        { name: 'user_identities', minRows: 2 },
        { name: 'voice_notes', minRows: 0 },
        { name: 'sync_state', minRows: 0 },
        { name: 'learned_thresholds', minRows: 5 },
        { name: 'recommendation_outcomes', minRows: 0 },
        { name: 'knowledge_chunks', minRows: 0 },
        { name: 'pending_contacts', minRows: 0 }
    ];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });

        if (error) {
            fail(`Table ${table.name}`, `Error: ${error.message}`);
        } else if (count >= table.minRows) {
            pass(`Table ${table.name}`, `${count} rows`);
        } else {
            warn(`Table ${table.name}`, `${count} rows (expected >= ${table.minRows})`);
        }
    }
}

// ============================================================================
// VERIFICATION: RELATIONSHIPS
// ============================================================================

async function verifyRelationships() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Relationships');
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Test communications_history → ghl_contacts relationship
    const { data: commsWithContact, error: commsError } = await supabase
        .from('communications_history')
        .select(`
            id,
            ghl_contact_id,
            ghl_contacts!inner(full_name, email)
        `)
        .not('ghl_contact_id', 'is', null)
        .limit(5);

    if (commsError) {
        fail('communications_history → ghl_contacts', commsError.message);
    } else if (commsWithContact && commsWithContact.length > 0) {
        pass('communications_history → ghl_contacts', `${commsWithContact.length} linked records found`);
    } else {
        warn('communications_history → ghl_contacts', 'No linked records (may be expected if new)');
    }

    // Test relationship_health → ghl_contacts relationship
    const { data: healthWithContact, error: healthError } = await supabase
        .from('relationship_health')
        .select(`
            id,
            ghl_contact_id,
            ghl_contacts!inner(full_name)
        `)
        .limit(5);

    if (healthError) {
        fail('relationship_health → ghl_contacts', healthError.message);
    } else if (healthWithContact && healthWithContact.length > 0) {
        pass('relationship_health → ghl_contacts', `${healthWithContact.length} linked records found`);
    } else {
        warn('relationship_health → ghl_contacts', 'No linked records');
    }

    // Test user_identities exist
    const { data: identities, error: identityError } = await supabase
        .from('user_identities')
        .select('canonical_name, display_name')
        .limit(10);

    if (identityError) {
        fail('user_identities', identityError.message);
    } else if (identities && identities.length >= 2) {
        const names = identities.map(i => i.canonical_name).join(', ');
        pass('user_identities', `Found: ${names}`);
    } else {
        warn('user_identities', 'Expected at least 2 team members');
    }
}

// ============================================================================
// VERIFICATION: VIEWS
// ============================================================================

async function verifyViews() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Views');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const views = [
        'v_recent_communications',
        'v_awaiting_response',
        'v_need_to_respond',
        'v_contact_communication_summary',
        'v_team_voice_notes',
        'v_pending_contacts_review'
    ];

    for (const view of views) {
        const { data, error } = await supabase
            .from(view)
            .select('*')
            .limit(1);

        if (error) {
            // View might not have data, but should be queryable
            if (error.message.includes('does not exist')) {
                fail(`View ${view}`, 'Does not exist');
            } else {
                warn(`View ${view}`, error.message);
            }
        } else {
            pass(`View ${view}`, data?.length > 0 ? 'Has data' : 'Empty (OK)');
        }
    }
}

// ============================================================================
// VERIFICATION: SYNC STATE
// ============================================================================

async function verifySyncState() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Sync State');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const { data: syncStates, error } = await supabase
        .from('sync_state')
        .select('*');

    if (error) {
        fail('sync_state table', error.message);
        return;
    }

    if (!syncStates || syncStates.length === 0) {
        warn('sync_state', 'No sync states found (sync tokens not migrated?)');
        return;
    }

    for (const state of syncStates) {
        if (state.last_sync_token) {
            pass(`Sync state: ${state.id}`, `Token preserved, last sync: ${state.last_sync_at}`);
        } else {
            warn(`Sync state: ${state.id}`, 'Missing sync token');
        }
    }
}

// ============================================================================
// VERIFICATION: LEARNED THRESHOLDS
// ============================================================================

async function verifyLearnedThresholds() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Learned Thresholds');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const expectedSegments = ['advocate', 'active_partner', 'warm_prospect', 'cold_prospect', 'dormant', 'default'];

    const { data: thresholds, error } = await supabase
        .from('learned_thresholds')
        .select('segment, value, confidence');

    if (error) {
        fail('learned_thresholds', error.message);
        return;
    }

    const foundSegments = new Set(thresholds?.map(t => t.segment) || []);

    for (const segment of expectedSegments) {
        if (foundSegments.has(segment)) {
            const t = thresholds.find(x => x.segment === segment);
            pass(`Threshold: ${segment}`, `${t.value} days, confidence: ${t.confidence}`);
        } else {
            warn(`Threshold: ${segment}`, 'Missing');
        }
    }
}

// ============================================================================
// VERIFICATION: KNOWLEDGE CHUNKS & EMBEDDINGS
// ============================================================================

async function verifyKnowledgeChunks() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Knowledge Chunks');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const { count: total } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true });

    const { count: withEmbeddings } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

    if (total === 0) {
        warn('Knowledge chunks', 'No chunks found (may need migration)');
        return;
    }

    pass('Knowledge chunks', `${total} total`);

    if (withEmbeddings === total) {
        pass('Embeddings', `All ${total} chunks have embeddings`);
    } else {
        warn('Embeddings', `${withEmbeddings}/${total} have embeddings - run reembed-knowledge.mjs`);
    }
}

// ============================================================================
// VERIFICATION: SERVICE CONNECTIVITY
// ============================================================================

async function verifyServices() {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  Verifying Service Connectivity');
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Test that we can read from key tables
    const testQueries = [
        { name: 'GHL Contacts', table: 'ghl_contacts', select: 'ghl_id, full_name' },
        { name: 'Communications', table: 'communications_history', select: 'id, channel' },
        { name: 'Knowledge', table: 'knowledge_chunks', select: 'id, source_type' }
    ];

    for (const test of testQueries) {
        const { data, error } = await supabase
            .from(test.table)
            .select(test.select)
            .limit(1);

        if (error) {
            fail(`Read ${test.name}`, error.message);
        } else {
            pass(`Read ${test.name}`, 'OK');
        }
    }

    // Test insert capability (into a safe table)
    const testId = `verify-test-${Date.now()}`;
    const { error: insertError } = await supabase
        .from('sync_state')
        .upsert({
            id: testId,
            sync_type: 'gmail',  // Must use allowed type
            last_sync_at: new Date().toISOString()
        });

    if (insertError) {
        fail('Write capability', insertError.message);
    } else {
        pass('Write capability', 'OK');

        // Clean up
        await supabase.from('sync_state').delete().eq('id', testId);
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllVerifications() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Migration Verification Report');
    console.log('  Database: Main (tednluwflfhxyucgwigh)');
    console.log('═══════════════════════════════════════════════════════════════');

    await verifyRowCounts();
    await verifyRelationships();
    await verifyViews();
    await verifySyncState();
    await verifyLearnedThresholds();
    await verifyKnowledgeChunks();
    await verifyServices();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`  ✅ Passed:   ${results.passed}`);
    console.log(`  ⚠️  Warnings: ${results.warnings}`);
    console.log(`  ❌ Failed:   ${results.failed}`);
    console.log('');

    if (results.failed === 0) {
        console.log('🎉 Migration verification passed!');
        if (results.warnings > 0) {
            console.log('   (Some warnings may require attention)');
        }
    } else {
        console.log('❌ Migration verification has failures.');
        console.log('   Review the issues above before proceeding.');
    }
}

// CLI
const command = process.argv[2] || 'all';

switch (command) {
    case 'all':
        await runAllVerifications();
        break;
    case 'counts':
        await verifyRowCounts();
        break;
    case 'relations':
        await verifyRelationships();
        break;
    case 'views':
        await verifyViews();
        break;
    case 'services':
        await verifyServices();
        break;
    default:
        console.log('Usage: node scripts/verify-migration.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  all       - Run all verifications (default)');
        console.log('  counts    - Verify row counts');
        console.log('  relations - Verify relationships');
        console.log('  views     - Verify views');
        console.log('  services  - Test service connectivity');
}
