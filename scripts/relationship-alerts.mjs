#!/usr/bin/env node
/**
 * Relationship Alerts & Morning Brief
 *
 * Surfaces contacts needing attention based on relationship health,
 * response patterns, and dormancy by segment.
 *
 * Usage:
 *   node scripts/relationship-alerts.mjs [command]
 *
 * Commands:
 *   brief     - Morning brief with priorities (default)
 *   dormant   - Show contacts going cold by segment
 *   awaiting  - Show contacts awaiting your response
 *   critical  - Show critical relationships needing immediate attention
 *   weekly    - Full weekly relationship report
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

// Dormancy thresholds by tag (days)
const DORMANCY_THRESHOLDS = {
    'partner': 30,
    'funder': 45,
    'collaborator': 45,
    'responsive': 21,
    'needs-attention': 14,
    'ai-flagged': 21,
    'community': 60,
    'default': 45
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function daysSince(date) {
    if (!date) return Infinity;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
    if (!date) return 'never';
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function getThresholdForContact(tags) {
    if (!tags || tags.length === 0) return DORMANCY_THRESHOLDS.default;

    // Find the shortest threshold among contact's tags
    let minThreshold = DORMANCY_THRESHOLDS.default;
    for (const tag of tags) {
        if (DORMANCY_THRESHOLDS[tag] && DORMANCY_THRESHOLDS[tag] < minThreshold) {
            minThreshold = DORMANCY_THRESHOLDS[tag];
        }
    }
    return minThreshold;
}

// ============================================================================
// MORNING BRIEF
// ============================================================================

async function showBrief() {
    const today = new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ACT RELATIONSHIP PULSE - ${today}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Contacts awaiting response (they replied, you haven't)
    const awaiting = await getAwaitingResponse();
    if (awaiting.length > 0) {
        console.log('🔥 NEEDS YOUR RESPONSE');
        console.log('─────────────────────────────────────────────────────────────────');
        awaiting.slice(0, 5).forEach(c => {
            console.log(`  ${c.full_name.padEnd(25)} ${daysSince(c.last_inbound)}d waiting  ${c.subject?.slice(0, 30) || ''}`);
        });
        if (awaiting.length > 5) {
            console.log(`  ... and ${awaiting.length - 5} more`);
        }
        console.log('');
    }

    // 2. Going cold (by priority)
    const goingCold = await getGoingCold();
    const critical = goingCold.filter(c => c.priority === 'critical');
    const warning = goingCold.filter(c => c.priority === 'warning');

    if (critical.length > 0) {
        console.log('🚨 GOING COLD - PRIORITY CONTACTS');
        console.log('─────────────────────────────────────────────────────────────────');
        critical.slice(0, 5).forEach(c => {
            const tags = (c.tags || []).slice(0, 2).join(', ');
            console.log(`  ${c.full_name.padEnd(25)} ${c.days_since}d ago    ${tags}`);
        });
        if (critical.length > 5) {
            console.log(`  ... and ${critical.length - 5} more priority contacts need attention`);
        }
        console.log('');
    }

    if (warning.length > 0) {
        console.log('⚠️  APPROACHING DORMANCY');
        console.log('─────────────────────────────────────────────────────────────────');
        warning.slice(0, 5).forEach(c => {
            const tags = (c.tags || []).slice(0, 2).join(', ');
            console.log(`  ${c.full_name.padEnd(25)} ${c.days_since}d ago    ${tags}`);
        });
        if (warning.length > 5) {
            console.log(`  ... and ${warning.length - 5} more`);
        }
        console.log('');
    }

    // 3. New contacts to review
    const pendingReview = await getPendingContacts();
    if (pendingReview > 0) {
        console.log(`📥 NEW CONTACTS TO REVIEW: ${pendingReview}`);
        console.log('   Run: node scripts/contact-discovery.mjs review');
        console.log('');
    }

    // 4. Quick stats
    const stats = await getQuickStats();
    console.log('📊 NETWORK HEALTH');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`  Active (30d):    ${stats.active}    Responsive: ${stats.responsive}`);
    console.log(`  Going cold:      ${goingCold.length}    Dormant:    ${stats.dormant}`);
    console.log(`  Total GHL:       ${stats.total}`);
    console.log('');

    // 5. Suggested actions
    console.log('💡 SUGGESTED ACTIONS');
    console.log('─────────────────────────────────────────────────────────────────');
    if (awaiting.length > 0) {
        console.log(`  1. Reply to ${awaiting[0].full_name} (waiting ${daysSince(awaiting[0].last_inbound)} days)`);
    }
    if (critical.length > 0) {
        console.log(`  2. Reach out to ${critical[0].full_name} (${critical[0].days_since} days cold)`);
    }
    if (pendingReview > 0) {
        console.log(`  3. Review ${pendingReview} new contacts`);
    }
    console.log('');
}

// ============================================================================
// AWAITING RESPONSE
// ============================================================================

async function getAwaitingResponse() {
    // Get contacts where last communication was inbound (they're waiting)
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags');

    const awaiting = [];

    for (const contact of (contacts || []).slice(0, 200)) { // Check top 200
        const { data: lastComm } = await supabase
            .from('communications_history')
            .select('direction, occurred_at, subject')
            .eq('ghl_contact_id', contact.ghl_id)
            .order('occurred_at', { ascending: false })
            .limit(1);

        if (lastComm && lastComm.length > 0 && lastComm[0].direction === 'inbound') {
            const days = daysSince(lastComm[0].occurred_at);
            if (days >= 2 && days <= 30) { // 2-30 days waiting
                awaiting.push({
                    ...contact,
                    last_inbound: lastComm[0].occurred_at,
                    subject: lastComm[0].subject,
                    days_waiting: days
                });
            }
        }
    }

    return awaiting.sort((a, b) => b.days_waiting - a.days_waiting);
}

async function showAwaiting() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contacts Awaiting Your Response');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const awaiting = await getAwaitingResponse();

    if (awaiting.length === 0) {
        console.log('✨ No one waiting on a response from you!');
        return;
    }

    console.log('Name'.padEnd(28) + 'Waiting'.padEnd(10) + 'Last Subject');
    console.log('─'.repeat(70));

    awaiting.forEach(c => {
        console.log(
            (c.full_name || c.email).slice(0, 26).padEnd(28) +
            `${c.days_waiting}d`.padEnd(10) +
            (c.subject || '').slice(0, 30)
        );
    });

    console.log('');
    console.log(`Total: ${awaiting.length} contacts awaiting response`);
}

// ============================================================================
// GOING COLD / DORMANT
// ============================================================================

async function getGoingCold() {
    // Get contacts with their last communication
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date')
        .not('tags', 'cs', '{"dormant"}'); // Exclude already-dormant

    const goingCold = [];

    for (const contact of contacts || []) {
        const threshold = getThresholdForContact(contact.tags);
        const days = daysSince(contact.last_contact_date);

        // Warning: 70-100% of threshold
        // Critical: 100%+ of threshold
        if (days >= threshold * 0.7) {
            goingCold.push({
                ...contact,
                days_since: days,
                threshold,
                priority: days >= threshold ? 'critical' : 'warning'
            });
        }
    }

    return goingCold.sort((a, b) => {
        // Sort by priority first, then by days overdue
        if (a.priority !== b.priority) {
            return a.priority === 'critical' ? -1 : 1;
        }
        return (b.days_since / b.threshold) - (a.days_since / a.threshold);
    });
}

async function showDormant() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Contacts Going Cold (By Segment)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const goingCold = await getGoingCold();

    // Group by primary tag
    const bySegment = {};
    goingCold.forEach(c => {
        const segment = (c.tags || [])[0] || 'untagged';
        if (!bySegment[segment]) bySegment[segment] = [];
        bySegment[segment].push(c);
    });

    Object.entries(bySegment)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([segment, contacts]) => {
            const criticalCount = contacts.filter(c => c.priority === 'critical').length;
            const icon = criticalCount > 0 ? '🚨' : '⚠️';
            console.log(`\n${icon} ${segment.toUpperCase()} (threshold: ${DORMANCY_THRESHOLDS[segment] || DORMANCY_THRESHOLDS.default}d)`);
            console.log('─'.repeat(50));

            contacts.slice(0, 8).forEach(c => {
                const status = c.priority === 'critical' ? '🔴' : '🟡';
                console.log(`  ${status} ${c.full_name?.slice(0, 25).padEnd(27)} ${c.days_since}d`);
            });

            if (contacts.length > 8) {
                console.log(`     ... and ${contacts.length - 8} more`);
            }
        });

    console.log('\n');
    console.log(`Total: ${goingCold.length} contacts approaching/past dormancy`);
    console.log(`  🔴 Critical (past threshold): ${goingCold.filter(c => c.priority === 'critical').length}`);
    console.log(`  🟡 Warning (approaching):     ${goingCold.filter(c => c.priority === 'warning').length}`);
}

// ============================================================================
// CRITICAL RELATIONSHIPS
// ============================================================================

async function showCritical() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Critical Relationships - Immediate Attention Needed');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Critical = past dormancy threshold AND has important tags
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date')
        .or('tags.cs.{"partner"},tags.cs.{"funder"},tags.cs.{"responsive"},tags.cs.{"ai-flagged"}');

    const critical = [];

    for (const contact of contacts || []) {
        const threshold = getThresholdForContact(contact.tags);
        const days = daysSince(contact.last_contact_date);

        if (days >= threshold) {
            critical.push({
                ...contact,
                days_since: days,
                threshold,
                overdue_pct: Math.round((days / threshold) * 100)
            });
        }
    }

    if (critical.length === 0) {
        console.log('✨ No critical relationships at the moment!');
        return;
    }

    critical.sort((a, b) => b.overdue_pct - a.overdue_pct);

    console.log('Name'.padEnd(28) + 'Days'.padEnd(8) + 'Overdue'.padEnd(10) + 'Tags');
    console.log('─'.repeat(70));

    critical.slice(0, 20).forEach(c => {
        const tags = (c.tags || []).slice(0, 3).join(', ');
        console.log(
            (c.full_name || c.email).slice(0, 26).padEnd(28) +
            `${c.days_since}`.padEnd(8) +
            `${c.overdue_pct}%`.padEnd(10) +
            tags.slice(0, 25)
        );
    });

    console.log('\n');
    console.log(`Total critical: ${critical.length}`);
    console.log('');
    console.log('Suggested: Pick top 3 and reach out today.');
}

// ============================================================================
// WEEKLY REPORT
// ============================================================================

async function showWeekly() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Weekly Relationship Report');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const stats = await getQuickStats();
    const goingCold = await getGoingCold();
    const awaiting = await getAwaitingResponse();

    // Summary
    console.log('SUMMARY');
    console.log('─'.repeat(50));
    console.log(`  Total contacts:      ${stats.total}`);
    console.log(`  Active (30d):        ${stats.active}`);
    console.log(`  Responsive:          ${stats.responsive}`);
    console.log(`  Going cold:          ${goingCold.length}`);
    console.log(`  Already dormant:     ${stats.dormant}`);
    console.log(`  Awaiting response:   ${awaiting.length}`);
    console.log('');

    // By tag segment
    console.log('BY SEGMENT');
    console.log('─'.repeat(50));

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('tags, last_contact_date');

    const segments = {};
    (contacts || []).forEach(c => {
        (c.tags || ['untagged']).forEach(tag => {
            if (!segments[tag]) segments[tag] = { total: 0, active: 0, cold: 0 };
            segments[tag].total++;
            const days = daysSince(c.last_contact_date);
            if (days <= 30) segments[tag].active++;
            else if (days > 60) segments[tag].cold++;
        });
    });

    Object.entries(segments)
        .filter(([_, s]) => s.total >= 10)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 15)
        .forEach(([tag, s]) => {
            const activeRate = Math.round((s.active / s.total) * 100);
            console.log(`  ${tag.padEnd(25)} ${s.total.toString().padEnd(5)} ${activeRate}% active`);
        });

    console.log('');

    // Top priorities
    console.log('TOP 5 PRIORITIES THIS WEEK');
    console.log('─'.repeat(50));

    const priorities = [
        ...awaiting.slice(0, 2).map(c => ({ name: c.full_name, reason: `awaiting response ${c.days_waiting}d` })),
        ...goingCold.filter(c => c.priority === 'critical').slice(0, 3).map(c => ({ name: c.full_name, reason: `${c.days_since}d cold` }))
    ].slice(0, 5);

    priorities.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} - ${p.reason}`);
    });

    console.log('');
}

// ============================================================================
// HELPER QUERIES
// ============================================================================

async function getPendingContacts() {
    const { count } = await supabase
        .from('pending_contacts')
        .select('*', { count: 'exact', head: true });
    return count || 0;
}

async function getQuickStats() {
    const { count: total } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true });

    const { count: responsive } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true })
        .contains('tags', ['responsive']);

    const { count: dormant } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true })
        .contains('tags', ['dormant']);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: active } = await supabase
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true })
        .gte('last_contact_date', thirtyDaysAgo);

    return {
        total: total || 0,
        responsive: responsive || 0,
        dormant: dormant || 0,
        active: active || 0
    };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'brief';

switch (command) {
    case 'brief':
        await showBrief();
        break;
    case 'dormant':
        await showDormant();
        break;
    case 'awaiting':
        await showAwaiting();
        break;
    case 'critical':
        await showCritical();
        break;
    case 'weekly':
        await showWeekly();
        break;
    default:
        console.log('Usage: node scripts/relationship-alerts.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  brief     - Morning brief with priorities (default)');
        console.log('  dormant   - Show contacts going cold by segment');
        console.log('  awaiting  - Show contacts awaiting your response');
        console.log('  critical  - Show critical relationships needing attention');
        console.log('  weekly    - Full weekly relationship report');
}
