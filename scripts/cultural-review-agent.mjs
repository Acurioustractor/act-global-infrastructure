#!/usr/bin/env node
/**
 * Cultural Review Agent
 *
 * Automates the routing and tracking of content that requires cultural review.
 * Ensures culturally sensitive content is reviewed by appropriate liaisons
 * before sharing or external use.
 *
 * Usage:
 *   node scripts/cultural-review-agent.mjs scan              # Scan for new items needing review
 *   node scripts/cultural-review-agent.mjs pending           # Show pending reviews
 *   node scripts/cultural-review-agent.mjs assign <id>       # Manually assign a review
 *   node scripts/cultural-review-agent.mjs approve <id>      # Approve an item
 *   node scripts/cultural-review-agent.mjs flag <id>         # Flag an item for restriction
 *   node scripts/cultural-review-agent.mjs notify            # Send notifications to reviewers
 *   node scripts/cultural-review-agent.mjs stats             # Show review statistics
 *   node scripts/cultural-review-agent.mjs liaisons          # List cultural liaisons
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Database access
 *   DISCORD_WEBHOOK_ALERTS - For Discord notifications
 *   SIGNAL_PHONE - For Signal notifications (optional)
 */

import { createClient } from '@supabase/supabase-js';
import { sendDiscordMessage, sendEmbed } from './discord-notify.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AGENT_ID = 'cultural-review';

// Cultural keywords that trigger review (expanded from migration)
const SACRED_KEYWORDS = [
    'sacred', 'ceremony', 'dreaming', 'songline', 'initiation',
    "men's business", "women's business", 'secret', 'restricted',
    'law', 'lore'
];

const ELDER_KEYWORDS = [
    'elder', 'aunty', 'auntie', 'uncle', 'traditional owner',
    'custodian', 'knowledge keeper', 'lawman', 'lawwoman'
];

const CULTURAL_KEYWORDS = [
    'first nations', 'aboriginal', 'indigenous', 'torres strait',
    'country', 'on country', 'welcome to country', 'acknowledgement',
    'traditional lands', 'sovereignty', 'treaty', 'land rights',
    'stolen generation', 'sorry day', 'naidoc'
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Find items that need cultural review but haven't been queued yet
 */
async function findPendingReviews() {
    const results = {
        voiceNotes: [],
        projectKnowledge: [],
        total: 0
    };

    // Find voice notes needing review
    const { data: voiceNotes, error: vnError } = await supabase
        .from('voice_notes')
        .select('id, summary, transcript, recorded_by_name, recorded_at, project_context')
        .eq('requires_cultural_review', true)
        .eq('cultural_review_status', 'pending')
        .order('recorded_at', { ascending: false });

    if (vnError) {
        console.error('Error fetching voice notes:', vnError.message);
    } else {
        results.voiceNotes = voiceNotes || [];
    }

    // Check if they're already queued
    for (const note of results.voiceNotes) {
        const { data: existing } = await supabase
            .from('cultural_review_queue')
            .select('id')
            .eq('item_type', 'voice_note')
            .eq('item_id', note.id)
            .in('status', ['pending', 'in_review'])
            .single();

        note.already_queued = !!existing;
    }

    // Filter to only unqueued items
    results.voiceNotes = results.voiceNotes.filter(n => !n.already_queued);

    // Find project knowledge needing review (if table exists)
    try {
        const { data: knowledge, error: pkError } = await supabase
            .from('project_knowledge')
            .select('id, title, content, project_code, recorded_at, knowledge_type')
            .or(`content.ilike.%elder%,content.ilike.%sacred%,content.ilike.%ceremony%`)
            .order('recorded_at', { ascending: false })
            .limit(50);

        if (!pkError && knowledge) {
            // Check if already queued
            for (const item of knowledge) {
                const { data: existing } = await supabase
                    .from('cultural_review_queue')
                    .select('id')
                    .eq('item_type', 'project_knowledge')
                    .eq('item_id', item.id)
                    .in('status', ['pending', 'in_review', 'approved', 'flagged'])
                    .single();

                if (!existing) {
                    results.projectKnowledge.push(item);
                }
            }
        }
    } catch (e) {
        // project_knowledge table may not exist
    }

    results.total = results.voiceNotes.length + results.projectKnowledge.length;
    return results;
}

/**
 * Queue an item for cultural review
 */
async function queueForReview(itemType, itemId, options = {}) {
    const { data: existing } = await supabase
        .from('cultural_review_queue')
        .select('id')
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .in('status', ['pending', 'in_review'])
        .single();

    if (existing) {
        return { success: false, message: 'Already queued', id: existing.id };
    }

    // Determine sensitivity level
    let sensitivityLevel = 'sensitive';
    const content = (options.content || '').toLowerCase();

    if (SACRED_KEYWORDS.some(k => content.includes(k))) {
        sensitivityLevel = 'sacred';
    }

    // Determine priority
    let priority = 'normal';
    if (sensitivityLevel === 'sacred') {
        priority = 'urgent';
    } else if (ELDER_KEYWORDS.some(k => content.includes(k))) {
        priority = 'high';
    }

    // Find flagged keywords
    const flaggedKeywords = [
        ...SACRED_KEYWORDS.filter(k => content.includes(k)),
        ...ELDER_KEYWORDS.filter(k => content.includes(k)),
        ...CULTURAL_KEYWORDS.filter(k => content.includes(k))
    ];

    const { data: queue, error } = await supabase
        .from('cultural_review_queue')
        .insert({
            item_type: itemType,
            item_id: itemId,
            item_title: options.title || null,
            review_reason: options.reason || 'cultural_keywords',
            flagged_keywords: flaggedKeywords.length > 0 ? flaggedKeywords : null,
            nation_community: options.community || null,
            sensitivity_level: sensitivityLevel,
            content_preview: content.slice(0, 200),
            priority
        })
        .select()
        .single();

    if (error) {
        return { success: false, message: error.message };
    }

    // Try to auto-assign
    await supabase.rpc('auto_assign_review', { p_review_id: queue.id });

    // Log to audit
    await logAudit('queue_review', {
        item_type: itemType,
        item_id: itemId,
        queue_id: queue.id,
        sensitivity: sensitivityLevel
    });

    return { success: true, id: queue.id, priority, sensitivity: sensitivityLevel };
}

/**
 * Route an item to the appropriate reviewer based on nation/community
 */
async function routeForReview(queueId) {
    // Get the queue item
    const { data: item, error } = await supabase
        .from('cultural_review_queue')
        .select('*')
        .eq('id', queueId)
        .single();

    if (error || !item) {
        return { success: false, message: 'Queue item not found' };
    }

    if (item.assigned_to) {
        return { success: false, message: 'Already assigned', assignedTo: item.assigned_to };
    }

    // Find appropriate liaison
    const { data: liaison } = await supabase
        .rpc('find_cultural_liaison', {
            p_community: item.nation_community,
            p_region: item.region,
            p_item_type: item.item_type
        });

    if (!liaison || liaison.length === 0) {
        // Escalate if no liaison available
        await supabase
            .from('cultural_review_queue')
            .update({
                status: 'escalated',
                reviewer_notes: 'No available cultural liaison for this community/region'
            })
            .eq('id', queueId);

        return { success: false, message: 'No available liaison - escalated' };
    }

    const selectedLiaison = liaison[0];

    // Assign the review
    const { error: updateError } = await supabase
        .from('cultural_review_queue')
        .update({
            assigned_to: selectedLiaison.email,
            assigned_at: new Date().toISOString(),
            status: 'in_review'
        })
        .eq('id', queueId);

    if (updateError) {
        return { success: false, message: updateError.message };
    }

    // Update liaison workload
    await supabase
        .from('cultural_liaisons')
        .update({
            reviews_this_week: selectedLiaison.workload + 1,
            last_assigned_at: new Date().toISOString()
        })
        .eq('id', selectedLiaison.id);

    await logAudit('assign_review', {
        queue_id: queueId,
        assigned_to: selectedLiaison.email,
        liaison_id: selectedLiaison.id
    });

    return {
        success: true,
        assignedTo: selectedLiaison.email,
        liaisonName: selectedLiaison.name
    };
}

/**
 * Update review status with decision
 */
async function updateReviewStatus(queueId, status, options = {}) {
    const validStatuses = ['approved', 'flagged', 'escalated', 'archived'];
    if (!validStatuses.includes(status)) {
        return { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    const updateData = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: options.reviewedBy || 'system'
    };

    if (options.notes) {
        updateData.reviewer_notes = options.notes;
    }

    if (options.decision) {
        updateData.review_decision = options.decision;
    }

    if (options.restrictions) {
        updateData.restrictions_applied = options.restrictions;
    }

    const { data: queue, error } = await supabase
        .from('cultural_review_queue')
        .update(updateData)
        .eq('id', queueId)
        .select()
        .single();

    if (error) {
        return { success: false, message: error.message };
    }

    // Update the source item based on type
    if (queue.item_type === 'voice_note') {
        await supabase
            .from('voice_notes')
            .update({
                cultural_review_status: status,
                cultural_reviewer_notes: options.notes || null
            })
            .eq('id', queue.item_id);
    }

    // If flagged/restricted, create cultural protocol entry
    if (status === 'flagged' && options.restrictions?.length > 0) {
        await supabase
            .from('cultural_protocols')
            .upsert({
                entity_type: queue.item_type,
                entity_id: queue.item_id,
                sensitivity_level: queue.sensitivity_level,
                permitted_uses: options.decision === 'restrict' ? ['internal'] : ['internal', 'external'],
                restrictions: options.restrictions,
                consent_notes: options.notes
            }, {
                onConflict: 'entity_type,entity_id'
            });
    }

    await logAudit('update_review_status', {
        queue_id: queueId,
        status,
        decision: options.decision
    });

    return { success: true, queue };
}

/**
 * Notify reviewers about pending items
 */
async function notifyReviewers(options = {}) {
    const notifications = [];

    // Get pending reviews grouped by assignee
    const { data: pending } = await supabase
        .from('cultural_review_queue')
        .select('*')
        .in('status', ['pending', 'in_review'])
        .eq('notification_sent', false)
        .order('priority', { ascending: true });

    if (!pending || pending.length === 0) {
        return { success: true, notifications: [], message: 'No pending notifications' };
    }

    // Group by assigned reviewer
    const byReviewer = {};
    const unassigned = [];

    for (const item of pending) {
        if (item.assigned_to) {
            if (!byReviewer[item.assigned_to]) {
                byReviewer[item.assigned_to] = [];
            }
            byReviewer[item.assigned_to].push(item);
        } else {
            unassigned.push(item);
        }
    }

    // Send Discord notification for overview
    if (options.discord !== false) {
        const embed = createNotificationEmbed(pending, unassigned.length);
        const sent = await sendEmbed('alerts', embed);
        if (sent) {
            notifications.push({ channel: 'discord', count: pending.length });
        }
    }

    // Mark notifications as sent
    const ids = pending.map(p => p.id);
    await supabase
        .from('cultural_review_queue')
        .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString(),
            notification_channel: 'discord'
        })
        .in('id', ids);

    // Send individual notifications to assignees if email configured
    // TODO: Implement email notifications when email service is available

    await logAudit('send_notifications', {
        total_items: pending.length,
        reviewers_notified: Object.keys(byReviewer).length,
        unassigned_count: unassigned.length
    });

    return {
        success: true,
        notifications,
        totalItems: pending.length,
        unassignedCount: unassigned.length
    };
}

/**
 * Create Discord embed for review notifications
 */
function createNotificationEmbed(items, unassignedCount) {
    const urgentCount = items.filter(i => i.priority === 'urgent').length;
    const highCount = items.filter(i => i.priority === 'high').length;

    const color = urgentCount > 0 ? 0xED4245 : highCount > 0 ? 0xFEE75C : 0x00AE86;

    const fields = [
        { name: 'Total Pending', value: items.length.toString(), inline: true },
        { name: 'Urgent', value: urgentCount.toString(), inline: true },
        { name: 'Unassigned', value: unassignedCount.toString(), inline: true }
    ];

    // Add top items
    const topItems = items
        .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        })
        .slice(0, 5);

    if (topItems.length > 0) {
        const itemsList = topItems.map(i => {
            const icon = i.priority === 'urgent' ? ':rotating_light:' :
                         i.priority === 'high' ? ':warning:' : ':small_blue_diamond:';
            return `${icon} ${i.item_title || i.item_type} (${i.sensitivity_level})`;
        }).join('\n');

        fields.push({
            name: 'Top Priority Items',
            value: itemsList,
            inline: false
        });
    }

    return {
        title: ':feather: Cultural Review Required',
        description: `${items.length} item(s) are waiting for cultural review.`,
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'ACT Cultural Review System'
        }
    };
}

/**
 * Log audit entry
 */
async function logAudit(action, details) {
    try {
        await supabase.from('agent_audit_log').insert({
            agent_id: AGENT_ID,
            action,
            target_table: 'cultural_review_queue',
            success: true,
            cultural_data_accessed: true,
            metadata: details
        });
    } catch (e) {
        // Audit log may not exist yet
        console.warn('Could not log audit:', e.message);
    }
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

/**
 * Scan for new items needing review and queue them
 */
async function cmdScan() {
    console.log('\n:feather: Cultural Review Agent - Scanning for items...\n');

    const pending = await findPendingReviews();

    if (pending.total === 0) {
        console.log(':white_check_mark: No new items require cultural review.');
        return;
    }

    console.log(`Found ${pending.total} items needing review:\n`);

    // Queue voice notes
    if (pending.voiceNotes.length > 0) {
        console.log(':studio_microphone: Voice Notes:');
        for (const note of pending.voiceNotes) {
            const result = await queueForReview('voice_note', note.id, {
                title: note.summary,
                content: note.transcript,
                reason: 'cultural_keywords'
            });

            const status = result.success ? ':white_check_mark: Queued' : `:x: ${result.message}`;
            console.log(`  ${status} - ${note.summary?.slice(0, 50) || 'Untitled'}`);
            if (result.success) {
                console.log(`    Priority: ${result.priority}, Sensitivity: ${result.sensitivity}`);
            }
        }
        console.log('');
    }

    // Queue project knowledge
    if (pending.projectKnowledge.length > 0) {
        console.log(':brain: Project Knowledge:');
        for (const item of pending.projectKnowledge) {
            const result = await queueForReview('project_knowledge', item.id, {
                title: item.title,
                content: item.content,
                reason: 'cultural_keywords'
            });

            const status = result.success ? ':white_check_mark: Queued' : `:x: ${result.message}`;
            console.log(`  ${status} - ${item.title?.slice(0, 50) || 'Untitled'}`);
        }
        console.log('');
    }

    console.log(`\n:clipboard: Queued ${pending.total} items for cultural review.`);
    console.log('Run "notify" to send notifications to reviewers.\n');
}

/**
 * Show pending reviews
 */
async function cmdPending() {
    console.log('\n:clipboard: Pending Cultural Reviews\n');

    const { data: pending, error } = await supabase
        .from('v_pending_cultural_reviews')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!pending || pending.length === 0) {
        console.log(':white_check_mark: No pending reviews.\n');
        return;
    }

    // Group by status
    const byStatus = {
        pending: pending.filter(p => !p.assigned_to),
        in_review: pending.filter(p => p.assigned_to)
    };

    if (byStatus.pending.length > 0) {
        console.log(':warning: UNASSIGNED (' + byStatus.pending.length + ')');
        console.log('-'.repeat(60));
        byStatus.pending.forEach(p => {
            const icon = p.priority === 'urgent' ? ':rotating_light:' :
                         p.priority === 'high' ? ':orange_circle:' : ':small_blue_diamond:';
            console.log(`${icon} [${p.sensitivity_level}] ${p.item_title || p.item_type}`);
            console.log(`  ID: ${p.id}`);
            console.log(`  Type: ${p.item_type} | Community: ${p.nation_community || 'Unknown'}`);
            console.log(`  Waiting: ${Math.floor(p.days_pending)} days`);
            console.log('');
        });
    }

    if (byStatus.in_review.length > 0) {
        console.log('\n:mag: IN REVIEW (' + byStatus.in_review.length + ')');
        console.log('-'.repeat(60));
        byStatus.in_review.forEach(p => {
            console.log(`[:hourglass_flowing_sand:] ${p.item_title || p.item_type}`);
            console.log(`  ID: ${p.id}`);
            console.log(`  Assigned to: ${p.assigned_to}`);
            console.log(`  Since: ${new Date(p.assigned_at).toLocaleDateString()}`);
            console.log('');
        });
    }

    console.log(`\nTotal: ${pending.length} pending reviews`);
    console.log('\nCommands:');
    console.log('  approve <id>   - Approve an item');
    console.log('  flag <id>      - Flag for restriction');
    console.log('  assign <id>    - Manually assign');
}

/**
 * Manually assign a review
 */
async function cmdAssign(queueId) {
    if (!queueId) {
        console.log('Usage: node scripts/cultural-review-agent.mjs assign <queue-id>');
        return;
    }

    console.log(`\n:link: Assigning review: ${queueId}\n`);

    const result = await routeForReview(queueId);

    if (result.success) {
        console.log(`:white_check_mark: Assigned to ${result.liaisonName} (${result.assignedTo})`);
    } else {
        console.log(`:x: ${result.message}`);
        if (result.assignedTo) {
            console.log(`  Already assigned to: ${result.assignedTo}`);
        }
    }
}

/**
 * Approve an item
 */
async function cmdApprove(queueId, notes) {
    if (!queueId) {
        console.log('Usage: node scripts/cultural-review-agent.mjs approve <queue-id> [notes]');
        return;
    }

    console.log(`\n:white_check_mark: Approving review: ${queueId}\n`);

    const result = await updateReviewStatus(queueId, 'approved', {
        reviewedBy: 'cli',
        notes: notes || 'Approved via CLI',
        decision: 'approve_internal'
    });

    if (result.success) {
        console.log(':white_check_mark: Item approved.');
        console.log(`  Type: ${result.queue.item_type}`);
        console.log(`  Title: ${result.queue.item_title || 'N/A'}`);
    } else {
        console.log(`:x: ${result.message}`);
    }
}

/**
 * Flag an item for restriction
 */
async function cmdFlag(queueId, notes) {
    if (!queueId) {
        console.log('Usage: node scripts/cultural-review-agent.mjs flag <queue-id> [notes]');
        return;
    }

    console.log(`\n:rotating_light: Flagging review: ${queueId}\n`);

    const result = await updateReviewStatus(queueId, 'flagged', {
        reviewedBy: 'cli',
        notes: notes || 'Flagged for restriction via CLI',
        decision: 'restrict',
        restrictions: ['no_external_sharing', 'elder_review_required']
    });

    if (result.success) {
        console.log(':warning: Item flagged and restricted.');
        console.log(`  Type: ${result.queue.item_type}`);
        console.log(`  Title: ${result.queue.item_title || 'N/A'}`);
        console.log('  Restrictions: no_external_sharing, elder_review_required');
    } else {
        console.log(`:x: ${result.message}`);
    }
}

/**
 * Send notifications
 */
async function cmdNotify() {
    console.log('\n:bell: Sending review notifications...\n');

    const result = await notifyReviewers({ discord: true });

    if (result.notifications.length > 0) {
        console.log(`:white_check_mark: Notifications sent:`);
        result.notifications.forEach(n => {
            console.log(`  - ${n.channel}: ${n.count} items`);
        });
    } else {
        console.log(result.message || ':white_check_mark: No notifications needed.');
    }

    if (result.unassignedCount > 0) {
        console.log(`\n:warning: ${result.unassignedCount} items are unassigned and need manual assignment.`);
    }
}

/**
 * Show statistics
 */
async function cmdStats() {
    console.log('\n:bar_chart: Cultural Review Statistics\n');

    const { data: stats } = await supabase
        .from('v_cultural_review_stats')
        .select('*')
        .single();

    if (stats) {
        console.log('Overview:');
        console.log('-'.repeat(40));
        console.log(`  Pending:        ${stats.pending_count || 0}`);
        console.log(`  In Review:      ${stats.in_review_count || 0}`);
        console.log(`  Approved (7d):  ${stats.approved_this_week || 0}`);
        console.log(`  Flagged (7d):   ${stats.flagged_this_week || 0}`);
        console.log(`  Escalated:      ${stats.escalated_count || 0}`);
        if (stats.avg_review_hours) {
            console.log(`  Avg Review Time: ${Math.round(stats.avg_review_hours)} hours`);
        }
    }

    // By community
    const { data: byCommunity } = await supabase
        .from('v_reviews_by_community')
        .select('*')
        .limit(10);

    if (byCommunity && byCommunity.length > 0) {
        console.log('\nBy Community:');
        console.log('-'.repeat(40));
        byCommunity.forEach(c => {
            console.log(`  ${c.community.padEnd(20)} Total: ${c.total_reviews} | Pending: ${c.pending} | Flagged: ${c.flagged}`);
        });
    }

    // Liaison workload
    const { data: workload } = await supabase
        .from('v_liaison_workload')
        .select('*');

    if (workload && workload.length > 0) {
        console.log('\nLiaison Workload:');
        console.log('-'.repeat(40));
        workload.forEach(l => {
            console.log(`  ${l.name.padEnd(25)} ${l.reviews_this_week}/${l.max_weekly_reviews} (${l.capacity_remaining} remaining)`);
        });
    }

    console.log('');
}

/**
 * List cultural liaisons
 */
async function cmdLiaisons() {
    console.log('\n:bust_in_silhouette: Cultural Liaisons\n');

    const { data: liaisons, error } = await supabase
        .from('cultural_liaisons')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!liaisons || liaisons.length === 0) {
        console.log(':warning: No cultural liaisons registered.');
        console.log('\nTo add a liaison, insert into the cultural_liaisons table.');
        return;
    }

    liaisons.forEach(l => {
        console.log(`${l.name}`);
        console.log(`  Email: ${l.email}`);
        console.log(`  Communities: ${l.communities?.join(', ') || 'All'}`);
        console.log(`  Capacity: ${l.reviews_this_week}/${l.max_weekly_reviews} this week`);
        console.log(`  Notification: ${l.preferred_notification_channel}`);
        console.log('');
    });

    console.log(`Total: ${liaisons.length} active liaison(s)`);
}

/**
 * Show help
 */
function showHelp() {
    console.log(`
:feather: Cultural Review Agent - Content Review Automation

Commands:
  scan              Scan for new items needing review and queue them
  pending           Show all pending reviews
  assign <id>       Manually assign a review to a liaison
  approve <id>      Approve an item
  flag <id>         Flag an item for restriction
  notify            Send notifications to reviewers
  stats             Show review statistics
  liaisons          List cultural liaisons

Workflow:
  1. Voice notes/content are auto-flagged by cultural keyword detection
  2. "scan" finds flagged items and queues them for review
  3. Items are auto-assigned to appropriate cultural liaisons
  4. Liaisons receive notifications via Discord/email
  5. Liaisons approve or flag items
  6. Flagged items get cultural protocols applied

Examples:
  node scripts/cultural-review-agent.mjs scan
  node scripts/cultural-review-agent.mjs pending
  node scripts/cultural-review-agent.mjs approve abc123-def456 "Content is appropriate for sharing"
  node scripts/cultural-review-agent.mjs flag abc123-def456 "Contains restricted knowledge"

Environment:
  SUPABASE_SERVICE_ROLE_KEY   Required for database access
  DISCORD_WEBHOOK_ALERTS      For notification delivery
`);
}

// ============================================================================
// MAIN
// ============================================================================

const command = process.argv[2] || 'help';
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4).join(' ');

switch (command) {
    case 'scan':
        await cmdScan();
        break;

    case 'pending':
        await cmdPending();
        break;

    case 'assign':
        await cmdAssign(arg1);
        break;

    case 'approve':
        await cmdApprove(arg1, arg2);
        break;

    case 'flag':
        await cmdFlag(arg1, arg2);
        break;

    case 'notify':
        await cmdNotify();
        break;

    case 'stats':
        await cmdStats();
        break;

    case 'liaisons':
        await cmdLiaisons();
        break;

    case 'help':
    default:
        showHelp();
}

// Export functions for use by other scripts
export {
    findPendingReviews,
    queueForReview,
    routeForReview,
    updateReviewStatus,
    notifyReviewers,
    SACRED_KEYWORDS,
    ELDER_KEYWORDS,
    CULTURAL_KEYWORDS
};
