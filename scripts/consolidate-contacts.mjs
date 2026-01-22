#!/usr/bin/env node
/**
 * Consolidate Contacts
 *
 * Links person_identity_map records to ghl_contacts by email matching.
 * This creates a unified view of all contacts across systems.
 *
 * Usage:
 *   node scripts/consolidate-contacts.mjs [command]
 *
 * Commands:
 *   status   - Show consolidation status (default)
 *   link     - Link person_identity_map to GHL contacts
 *   report   - Show detailed breakdown by source
 *   quality  - Show contacts needing attention
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

// ============================================================================
// FUNCTIONS
// ============================================================================

async function showStatus() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contact Consolidation Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Count tables
    const { count: ghlCount } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true });

    const { count: identityCount } = await supabase
        .from('person_identity_map')
        .select('*', { count: 'exact', head: true });

    const { count: linkedCount } = await supabase
        .from('person_identity_map')
        .select('*', { count: 'exact', head: true })
        .not('ghl_contact_id', 'is', null);

    const { count: withEmailCount } = await supabase
        .from('person_identity_map')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);

    const { count: linkedinCount } = await supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact', head: true });

    const { count: commsCount } = await supabase
        .from('communications_history')
        .select('*', { count: 'exact', head: true });

    console.log('Contact Sources:');
    console.log(`  GHL Contacts:           ${ghlCount || 0}`);
    console.log(`  Person Identity Map:    ${identityCount || 0}`);
    console.log(`  LinkedIn Contacts:      ${linkedinCount || 0}`);
    console.log('');
    console.log('Consolidation Progress:');
    console.log(`  Identity Map with email:      ${withEmailCount || 0}`);
    console.log(`  Identity Map linked to GHL:   ${linkedCount || 0}`);
    console.log(`  Identity Map unlinked:        ${(identityCount || 0) - (linkedCount || 0)}`);
    console.log('');
    console.log('Communications:');
    console.log(`  Total records:          ${commsCount || 0}`);
    console.log('');
    console.log('To link contacts, run:');
    console.log('  node scripts/consolidate-contacts.mjs link');
}

async function linkContacts() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Linking Person Identity Map to GHL Contacts');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Build email → ghl_id lookup from ghl_contacts
    console.log('Building email lookup from GHL contacts...');
    const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, email, full_name')
        .not('email', 'is', null);

    const emailToGhlId = new Map();
    (ghlContacts || []).forEach(c => {
        if (c.email) {
            emailToGhlId.set(c.email.toLowerCase(), c.ghl_id);
        }
    });
    console.log(`  ${emailToGhlId.size} GHL contacts with email`);

    // Get unlinked person_identity_map records with email
    console.log('\nFetching unlinked identity records...');
    const { data: unlinkedIdentities } = await supabase
        .from('person_identity_map')
        .select('person_id, email, full_name, data_source')
        .is('ghl_contact_id', null)
        .not('email', 'is', null);

    if (!unlinkedIdentities || unlinkedIdentities.length === 0) {
        console.log('No unlinked identity records with email found!');
        return;
    }

    console.log(`  ${unlinkedIdentities.length} unlinked records with email`);

    // Match by email
    let matched = 0;
    let unmatched = 0;
    const matchedSources = {};
    const unmatchedSources = {};

    console.log('\nLinking by email match...');

    for (const identity of unlinkedIdentities) {
        const email = identity.email.toLowerCase();
        const ghlId = emailToGhlId.get(email);
        const source = identity.data_source || 'unknown';

        if (ghlId) {
            // Update person_identity_map with ghl_contact_id
            const { error } = await supabase
                .from('person_identity_map')
                .update({ ghl_contact_id: ghlId })
                .eq('person_id', identity.person_id);

            if (!error) {
                matched++;
                matchedSources[source] = (matchedSources[source] || 0) + 1;
            }
        } else {
            unmatched++;
            unmatchedSources[source] = (unmatchedSources[source] || 0) + 1;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Results');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Matched:      ${matched}`);
    console.log(`  Unmatched:    ${unmatched}`);
    console.log('');

    if (Object.keys(matchedSources).length > 0) {
        console.log('Matched by source:');
        Object.entries(matchedSources)
            .sort((a, b) => b[1] - a[1])
            .forEach(([source, count]) => {
                console.log(`  ${source.padEnd(20)} ${count}`);
            });
    }

    if (Object.keys(unmatchedSources).length > 0) {
        console.log('\nUnmatched by source (not in GHL):');
        Object.entries(unmatchedSources)
            .sort((a, b) => b[1] - a[1])
            .forEach(([source, count]) => {
                console.log(`  ${source.padEnd(20)} ${count}`);
            });
    }

    console.log('\nUnmatched contacts are discoverable people not yet in GHL.');
    console.log('To add high-priority ones to GHL, run:');
    console.log('  node scripts/contact-discovery.mjs discover');
}

async function showReport() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contact Breakdown by Source');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get source breakdown from person_identity_map
    const { data: identities } = await supabase
        .from('person_identity_map')
        .select('data_source, ghl_contact_id, linkedin_contact_id, email');

    const sourceStats = {};
    let withGhl = 0;
    let withLinkedIn = 0;
    let withEmail = 0;

    (identities || []).forEach(i => {
        const source = i.data_source || 'unknown';
        if (!sourceStats[source]) {
            sourceStats[source] = { total: 0, linked: 0, withEmail: 0 };
        }
        sourceStats[source].total++;
        if (i.ghl_contact_id) {
            sourceStats[source].linked++;
            withGhl++;
        }
        if (i.email) {
            sourceStats[source].withEmail++;
            withEmail++;
        }
        if (i.linkedin_contact_id) withLinkedIn++;
    });

    console.log('Source'.padEnd(20) + 'Total'.padEnd(10) + 'Email'.padEnd(10) + 'GHL Linked');
    console.log('─'.repeat(50));

    Object.entries(sourceStats)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([source, stats]) => {
            console.log(
                source.padEnd(20) +
                stats.total.toString().padEnd(10) +
                stats.withEmail.toString().padEnd(10) +
                stats.linked.toString()
            );
        });

    console.log('─'.repeat(50));
    console.log(
        'TOTAL'.padEnd(20) +
        (identities?.length || 0).toString().padEnd(10) +
        withEmail.toString().padEnd(10) +
        withGhl.toString()
    );

    console.log('\n');
    console.log('Cross-system links:');
    console.log(`  With LinkedIn ID:    ${withLinkedIn}`);
    console.log(`  With GHL ID:         ${withGhl}`);

    // GHL tag breakdown
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  GHL Contact Tags (Top 20)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('tags');

    const tagCounts = {};
    (ghlContacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([tag, count]) => {
            const pct = ((count / ghlContacts.length) * 100).toFixed(0);
            console.log(`  ${tag.padEnd(30)} ${count.toString().padEnd(6)} (${pct}%)`);
        });
}

async function showQuality() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contacts Needing Attention');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // High-priority unlinked contacts (real people, not bounces)
    const { data: highPriority } = await supabase
        .from('person_identity_map')
        .select('full_name, email, engagement_priority, total_emails_sent, total_emails_received, last_communication_at')
        .is('ghl_contact_id', null)
        .not('email', 'is', null)
        .in('engagement_priority', ['critical', 'high'])
        .order('total_emails_received', { ascending: false })
        .limit(20);

    console.log('High-Priority Unlinked (not in GHL):');
    console.log('Name'.padEnd(25) + 'Email'.padEnd(35) + 'Sent'.padEnd(6) + 'Recv'.padEnd(6) + 'Priority');
    console.log('─'.repeat(90));

    (highPriority || []).forEach(c => {
        // Skip obvious bounces/automations
        if (c.email.includes('noreply') || c.email.includes('no-reply') || c.email.includes('bounce')) return;
        if (c.full_name && (c.full_name.toLowerCase() === 'hello' || c.full_name.toLowerCase() === 'info')) return;

        console.log(
            (c.full_name || '').slice(0, 23).padEnd(25) +
            c.email.slice(0, 33).padEnd(35) +
            (c.total_emails_sent || 0).toString().padEnd(6) +
            (c.total_emails_received || 0).toString().padEnd(6) +
            (c.engagement_priority || '')
        );
    });

    // GHL contacts without recent communication
    console.log('\n');
    console.log('GHL Contacts - No Recent Communication (90+ days):');
    console.log('─'.repeat(70));

    const { data: dormantGhl } = await supabase
        .from('ghl_contacts')
        .select('full_name, email, tags, last_contact_date')
        .lt('last_contact_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .not('tags', 'cs', '{"dormant"}')
        .order('last_contact_date', { ascending: true })
        .limit(15);

    (dormantGhl || []).forEach(c => {
        const days = c.last_contact_date
            ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (24 * 60 * 60 * 1000))
            : '?';
        const tags = (c.tags || []).slice(0, 2).join(', ');
        console.log(
            (c.full_name || '').slice(0, 25).padEnd(27) +
            (days + ' days ago').padEnd(15) +
            tags.slice(0, 25)
        );
    });
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'status';

switch (command) {
    case 'status':
        await showStatus();
        break;
    case 'link':
        await linkContacts();
        break;
    case 'report':
        await showReport();
        break;
    case 'quality':
        await showQuality();
        break;
    default:
        console.log('Usage: node scripts/consolidate-contacts.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  status   - Show consolidation status (default)');
        console.log('  link     - Link person_identity_map to GHL contacts');
        console.log('  report   - Show detailed breakdown by source');
        console.log('  quality  - Show contacts needing attention');
}
