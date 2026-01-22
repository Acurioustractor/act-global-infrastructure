#!/usr/bin/env node
/**
 * Link Communications to Contacts
 *
 * Matches communications_history records to ghl_contacts by email.
 * This enables relationship health tracking and communication context.
 *
 * Usage:
 *   node scripts/link-communications-to-contacts.mjs [command]
 *
 * Commands:
 *   status   - Show linking status (default)
 *   link     - Link unlinked communications to contacts
 *   report   - Show contacts with most communications
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
    console.log('  Communication-Contact Linking Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Count communications
    const { count: totalComms } = await supabase
        .from('communications_history')
        .select('*', { count: 'exact', head: true });

    const { count: linkedComms } = await supabase
        .from('communications_history')
        .select('*', { count: 'exact', head: true })
        .not('ghl_contact_id', 'is', null);

    const { count: unlinkedComms } = await supabase
        .from('communications_history')
        .select('*', { count: 'exact', head: true })
        .is('ghl_contact_id', null);

    // Count GHL contacts with email
    const { count: contactsWithEmail } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);

    console.log('Communications:');
    console.log(`  Total:        ${totalComms || 0}`);
    console.log(`  Linked:       ${linkedComms || 0}`);
    console.log(`  Unlinked:     ${unlinkedComms || 0}`);
    console.log('');
    console.log('GHL Contacts:');
    console.log(`  With email:   ${contactsWithEmail || 0}`);
    console.log('');
    console.log('To link communications, run:');
    console.log('  node scripts/link-communications-to-contacts.mjs link');
}

async function linkCommunications() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Linking Communications to Contacts');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Build email → ghl_id lookup from ghl_contacts
    console.log('Building email lookup from GHL contacts...');
    const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, email')
        .not('email', 'is', null);

    const emailToGhlId = new Map();
    (ghlContacts || []).forEach(c => {
        if (c.email) {
            emailToGhlId.set(c.email.toLowerCase(), c.ghl_id);
        }
    });
    console.log(`  ${emailToGhlId.size} contacts with email`);

    // Get unlinked communications with key_decisions (where email is stored)
    console.log('\nFetching unlinked communications...');
    const { data: unlinkedComms } = await supabase
        .from('communications_history')
        .select('id, key_decisions, subject')
        .is('ghl_contact_id', null);

    if (!unlinkedComms || unlinkedComms.length === 0) {
        console.log('No unlinked communications found!');
        return;
    }

    console.log(`  ${unlinkedComms.length} unlinked communications`);

    // Match by email
    let matched = 0;
    let unmatched = 0;
    const unmatchedEmails = new Set();

    console.log('\nLinking by email match...');

    for (const comm of unlinkedComms) {
        // Extract email from key_decisions
        let contactEmail = null;
        if (Array.isArray(comm.key_decisions)) {
            for (const item of comm.key_decisions) {
                // Handle both string and object formats
                let parsed = item;
                if (typeof item === 'string') {
                    try {
                        parsed = JSON.parse(item);
                    } catch (e) {
                        continue;
                    }
                }
                if (parsed?.type === 'contact_info' && parsed?.email) {
                    contactEmail = parsed.email.toLowerCase();
                    break;
                }
            }
        }

        if (!contactEmail) {
            unmatched++;
            continue;
        }

        const ghlId = emailToGhlId.get(contactEmail);
        if (ghlId) {
            // Update communication with ghl_contact_id
            const { error } = await supabase
                .from('communications_history')
                .update({ ghl_contact_id: ghlId })
                .eq('id', comm.id);

            if (!error) {
                matched++;
            }
        } else {
            unmatched++;
            unmatchedEmails.add(contactEmail);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Results');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Matched:      ${matched}`);
    console.log(`  Unmatched:    ${unmatched}`);
    console.log(`  Unique unmatched emails: ${unmatchedEmails.size}`);

    // Show top unmatched emails
    if (unmatchedEmails.size > 0) {
        console.log('\nTop unmatched emails (potential new contacts):');
        [...unmatchedEmails].slice(0, 10).forEach(email => {
            console.log(`  • ${email}`);
        });
        if (unmatchedEmails.size > 10) {
            console.log(`  ... and ${unmatchedEmails.size - 10} more`);
        }
        console.log('\nTo add these to contact review queue, run:');
        console.log('  node scripts/contact-discovery.mjs discover');
    }
}

async function showReport() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contacts with Most Communications');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get communication counts by contact
    const { data: contactComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id')
        .not('ghl_contact_id', 'is', null);

    // Count by contact
    const counts = {};
    (contactComms || []).forEach(c => {
        counts[c.ghl_contact_id] = (counts[c.ghl_contact_id] || 0) + 1;
    });

    // Sort and get top 20
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    if (sorted.length === 0) {
        console.log('No linked communications found.');
        return;
    }

    // Get contact names
    const contactIds = sorted.map(s => s[0]);
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .in('ghl_id', contactIds);

    const contactMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    console.log('Top 20 contacts by communication volume:\n');
    console.log('Name'.padEnd(30) + 'Emails'.padEnd(10) + 'Tags');
    console.log('─'.repeat(70));

    for (const [ghlId, count] of sorted) {
        const contact = contactMap.get(ghlId);
        const name = contact?.full_name || contact?.email || ghlId;
        const tags = (contact?.tags || []).slice(0, 3).join(', ');
        console.log(`${name.slice(0, 28).padEnd(30)}${count.toString().padEnd(10)}${tags}`);
    }

    // Summary
    const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);
    const uniqueContacts = Object.keys(counts).length;
    console.log('');
    console.log(`Total: ${totalLinked} communications across ${uniqueContacts} contacts`);
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
        await linkCommunications();
        break;
    case 'report':
        await showReport();
        break;
    default:
        console.log('Usage: node scripts/link-communications-to-contacts.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  status   - Show linking status (default)');
        console.log('  link     - Link unlinked communications to contacts');
        console.log('  report   - Show contacts with most communications');
}
