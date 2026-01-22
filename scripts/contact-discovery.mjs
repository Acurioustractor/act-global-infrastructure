#!/usr/bin/env node
/**
 * Contact Discovery Service
 *
 * Discovers new contacts from communications, enriches them with context,
 * and suggests them for GHL creation.
 *
 * Part of the consolidated database architecture - uses:
 *   - pending_contacts: Queue of discovered contacts awaiting review
 *   - communications_history: Source of contact interactions
 *   - ghl_contacts: Existing CRM contacts
 *
 * Usage:
 *   node scripts/contact-discovery.mjs [command]
 *
 * Commands:
 *   status    - Show pending contacts overview (default)
 *   discover  - Process communications and discover new contacts
 *   review    - Interactive review of pending contacts
 *   approve   - Approve a contact for GHL creation
 *   reject    - Reject a contact
 *   create    - Create approved contacts in GHL
 *   brief     - Generate brief summary for morning report
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

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

// Common email domains to ignore for company extraction
const PERSONAL_DOMAINS = [
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
    'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'mail.com'
];

// ============================================================================
// DISCOVERY FUNCTIONS
// ============================================================================

/**
 * Extract company name from email domain
 */
function extractCompany(email) {
    if (!email) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || PERSONAL_DOMAINS.includes(domain)) return null;

    // Extract company name from domain (e.g., 'artgallery.com.au' → 'artgallery')
    const parts = domain.split('.');
    return parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1);
}

/**
 * Calculate importance score based on communication patterns
 */
function calculateImportance(contact) {
    let score = 0.3; // Base score

    // Communication frequency
    if (contact.communication_count >= 5) score += 0.3;
    else if (contact.communication_count >= 3) score += 0.2;
    else if (contact.communication_count >= 2) score += 0.1;

    // Has company (business contact)
    if (contact.company) score += 0.15;

    // Has name extracted
    if (contact.name) score += 0.1;

    // Topics relevance (would be enhanced with AI)
    if (contact.topics?.some(t =>
        t.includes('project') || t.includes('partner') || t.includes('funding')
    )) {
        score += 0.15;
    }

    return Math.min(1, score);
}

/**
 * Suggest tags based on contact info
 */
function suggestTags(contact) {
    const tags = [];

    // Company-based tags
    if (contact.company) {
        const companyLower = contact.company.toLowerCase();
        if (companyLower.includes('art') || companyLower.includes('gallery')) {
            tags.push('arts');
        }
        if (companyLower.includes('council') || companyLower.includes('gov')) {
            tags.push('government');
        }
        if (companyLower.includes('uni') || companyLower.includes('edu')) {
            tags.push('education');
        }
    }

    // Topic-based tags
    if (contact.topics?.includes('partnership')) tags.push('partner');
    if (contact.topics?.includes('funding')) tags.push('funder');
    if (contact.topics?.includes('media')) tags.push('media');

    // Default
    if (tags.length === 0) tags.push('prospect');

    return tags;
}

// ============================================================================
// COMMANDS
// ============================================================================

async function showStatus() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contact Discovery Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Count by status
    const { data: statusCounts } = await supabase
        .from('pending_contacts')
        .select('status');

    const counts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        created: 0
    };

    (statusCounts || []).forEach(row => {
        counts[row.status] = (counts[row.status] || 0) + 1;
    });

    console.log('By Status:');
    console.log(`  Pending:   ${counts.pending}`);
    console.log(`  Approved:  ${counts.approved}`);
    console.log(`  Created:   ${counts.created}`);
    console.log(`  Rejected:  ${counts.rejected}`);

    // Show top pending contacts
    const { data: topPending } = await supabase
        .from('pending_contacts')
        .select('*')
        .eq('status', 'pending')
        .order('importance_score', { ascending: false })
        .order('communication_count', { ascending: false })
        .limit(10);

    if (topPending && topPending.length > 0) {
        console.log('\nTop Pending Contacts:');
        console.log('─────────────────────────────────────────────────────────────────');

        for (const contact of topPending) {
            const name = contact.name || '(unknown)';
            const company = contact.company || '-';
            const score = (contact.importance_score * 100).toFixed(0);

            console.log(`  ${name.padEnd(25)} ${contact.email.padEnd(35)} ${company.padEnd(15)} ${contact.communication_count} comms  ${score}%`);
        }
    }

    // GHL contacts count
    const { count: ghlCount } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true });

    console.log('\n');
    console.log(`GHL Contacts: ${ghlCount || 0}`);
    console.log('\nCommands:');
    console.log('  node scripts/contact-discovery.mjs review   - Review pending contacts');
    console.log('  node scripts/contact-discovery.mjs create   - Create approved in GHL');
}

async function discoverContacts() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Discovering Contacts from Communications');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // This would normally be called automatically during gmail-sync.
    // Here we can re-process any communications that might have been missed.

    console.log('Note: Contact discovery happens automatically during gmail-sync.');
    console.log('Use this command to re-analyze pending contacts.\n');

    // Update importance scores for all pending contacts
    const { data: pending } = await supabase
        .from('pending_contacts')
        .select('*')
        .eq('status', 'pending');

    if (!pending || pending.length === 0) {
        console.log('No pending contacts to analyze.');
        return;
    }

    console.log(`Analyzing ${pending.length} pending contacts...`);

    let updated = 0;
    for (const contact of pending) {
        const importance = calculateImportance(contact);
        const tags = suggestTags(contact);

        const { error } = await supabase
            .from('pending_contacts')
            .update({
                importance_score: importance,
                suggested_tags: tags
            })
            .eq('id', contact.id);

        if (!error) updated++;
    }

    console.log(`✅ Updated ${updated} contacts with importance scores and tags.`);
}

async function reviewContacts() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Interactive Contact Review');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: pending } = await supabase
        .from('pending_contacts')
        .select('*')
        .eq('status', 'pending')
        .order('importance_score', { ascending: false })
        .limit(20);

    if (!pending || pending.length === 0) {
        console.log('No pending contacts to review!');
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => rl.question(q, resolve));

    console.log(`Reviewing ${pending.length} contacts...\n`);
    console.log('Commands: [a]pprove, [r]eject, [s]kip, [q]uit\n');

    for (const contact of pending) {
        console.log('─────────────────────────────────────────────────────────────────');
        console.log(`Email:    ${contact.email}`);
        console.log(`Name:     ${contact.name || '(unknown)'}`);
        console.log(`Company:  ${contact.company || '(unknown)'}`);
        console.log(`Comms:    ${contact.communication_count}`);
        console.log(`Score:    ${(contact.importance_score * 100).toFixed(0)}%`);
        console.log(`Tags:     ${(contact.suggested_tags || []).join(', ') || '(none)'}`);
        console.log('');

        const action = await ask('Action [a/r/s/q]: ');

        switch (action.toLowerCase()) {
            case 'a':
                await supabase
                    .from('pending_contacts')
                    .update({ status: 'approved' })
                    .eq('id', contact.id);
                console.log('✅ Approved\n');
                break;
            case 'r':
                const reason = await ask('Reason (optional): ');
                await supabase
                    .from('pending_contacts')
                    .update({
                        status: 'rejected',
                        rejection_reason: reason || null
                    })
                    .eq('id', contact.id);
                console.log('❌ Rejected\n');
                break;
            case 's':
                console.log('⏭️  Skipped\n');
                break;
            case 'q':
                console.log('\nExiting review.');
                rl.close();
                return;
            default:
                console.log('Unknown command, skipping.\n');
        }
    }

    rl.close();
    console.log('\n✅ Review complete!');
}

async function createApprovedInGhl() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Creating Approved Contacts in GHL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: approved } = await supabase
        .from('pending_contacts')
        .select('*')
        .eq('status', 'approved');

    if (!approved || approved.length === 0) {
        console.log('No approved contacts to create.');
        return;
    }

    console.log(`Found ${approved.length} approved contacts to create.\n`);

    // Note: Actual GHL creation would use the GHL API
    // For now, we'll show what would be created

    for (const contact of approved) {
        console.log(`Would create in GHL:`);
        console.log(`  Email:   ${contact.email}`);
        console.log(`  Name:    ${contact.name || 'Unknown'}`);
        console.log(`  Company: ${contact.company || ''}`);
        console.log(`  Tags:    ${(contact.suggested_tags || []).join(', ')}`);
        console.log('');
    }

    console.log('Note: GHL API integration needed to actually create contacts.');
    console.log('After creating, update pending_contacts status to "created".');
}

async function generateBrief() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contact Discovery Brief');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get recent pending contacts (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentPending, count: pendingCount } = await supabase
        .from('pending_contacts')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .gte('first_seen_at', weekAgo.toISOString())
        .order('importance_score', { ascending: false })
        .limit(5);

    if (pendingCount === 0) {
        console.log('No new contacts discovered this week.');
        return;
    }

    console.log(`📬 ${pendingCount} new contacts discovered this week:\n`);

    for (const contact of recentPending || []) {
        const name = contact.name || contact.email.split('@')[0];
        const company = contact.company ? ` (${contact.company})` : '';
        const comms = contact.communication_count === 1 ? '1 email' : `${contact.communication_count} emails`;

        console.log(`  • ${name}${company} - ${comms}`);
    }

    if (pendingCount > 5) {
        console.log(`  ... and ${pendingCount - 5} more`);
    }

    console.log('\n→ Review at: node scripts/contact-discovery.mjs review');
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'status';
const args = process.argv.slice(3);

switch (command) {
    case 'status':
        await showStatus();
        break;
    case 'discover':
        await discoverContacts();
        break;
    case 'review':
        await reviewContacts();
        break;
    case 'create':
        await createApprovedInGhl();
        break;
    case 'brief':
        await generateBrief();
        break;
    case 'approve':
        if (!args[0]) {
            console.error('Usage: node scripts/contact-discovery.mjs approve <email>');
            process.exit(1);
        }
        await supabase
            .from('pending_contacts')
            .update({ status: 'approved' })
            .eq('email', args[0].toLowerCase());
        console.log(`✅ Approved: ${args[0]}`);
        break;
    case 'reject':
        if (!args[0]) {
            console.error('Usage: node scripts/contact-discovery.mjs reject <email> [reason]');
            process.exit(1);
        }
        await supabase
            .from('pending_contacts')
            .update({
                status: 'rejected',
                rejection_reason: args[1] || null
            })
            .eq('email', args[0].toLowerCase());
        console.log(`❌ Rejected: ${args[0]}`);
        break;
    default:
        console.log('Usage: node scripts/contact-discovery.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  status    - Show pending contacts overview (default)');
        console.log('  discover  - Re-analyze pending contacts');
        console.log('  review    - Interactive review of pending contacts');
        console.log('  approve   - Approve a contact: approve <email>');
        console.log('  reject    - Reject a contact: reject <email> [reason]');
        console.log('  create    - Create approved contacts in GHL');
        console.log('  brief     - Generate brief for morning report');
}
