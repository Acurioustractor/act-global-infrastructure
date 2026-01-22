#!/usr/bin/env node
/**
 * Project Notifications System
 *
 * Monitors communications and sends Discord notifications when:
 * - A project-related contact reaches out
 * - A high-priority contact emails
 * - A dormant partner re-engages
 *
 * Usage:
 *   node scripts/project-notifications.mjs          # Check & notify
 *   node scripts/project-notifications.mjs check    # Check only (dry run)
 *   node scripts/project-notifications.mjs recent   # Show recent project comms
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { sendDiscordMessage, sendEmbed, templates } from './discord-notify.mjs';

dotenv.config({ path: '.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// Import project definitions
const PROJECTS = {
    'justicehub': { name: 'JusticeHub', tags: ['justicehub', 'justice', 'youth justice'], category: 'justice', priority: 'high' },
    'diagrama': { name: 'Diagrama', tags: ['diagrama'], category: 'justice', priority: 'high' },
    'goods': { name: 'Goods', tags: ['goods'], category: 'enterprise', priority: 'high' },
    'empathy-ledger': { name: 'Empathy Ledger', tags: ['empathy-ledger', 'empathy', 'storytelling'], category: 'stories', priority: 'high' },
    'picc': { name: 'PICC', tags: ['picc', 'palm-island'], category: 'indigenous', priority: 'high' },
    'mingaminga': { name: 'MingaMinga Rangers', tags: ['mingaminga', 'rangers'], category: 'indigenous', priority: 'high' },
    'harvest': { name: 'The Harvest', tags: ['harvest', 'the-harvest', 'witta'], category: 'regenerative', priority: 'medium' },
    'contained': { name: 'Contained', tags: ['contained'], category: 'enterprise', priority: 'medium' },
    'fishers-oysters': { name: 'Fishers Oysters', tags: ['fishers-oysters', 'fishers'], category: 'regenerative', priority: 'medium' },
    'smart': { name: 'SMART', tags: ['smart', 'smart-connect'], category: 'health', priority: 'medium' },
    'confessional': { name: 'The Confessional', tags: ['confessional'], category: 'stories', priority: 'medium' },
    'act-monthly': { name: 'ACT Monthly Dinners', tags: ['act-monthly', 'dinners'], category: 'community', priority: 'medium' },
    'qfcc': { name: 'QFCC Empathy Ledger', tags: ['qfcc'], category: 'stories', priority: 'high' },
    'maningrida': { name: 'Maningrida', tags: ['maningrida'], category: 'justice', priority: 'high' },
    'first-nations': { name: 'First Nations Youth Advocacy', tags: ['first-nations', 'youth-advocacy'], category: 'justice', priority: 'high' }
};

const CATEGORY_ICONS = {
    justice: '⚖️',
    indigenous: '🌏',
    stories: '📖',
    enterprise: '💼',
    regenerative: '🌱',
    health: '❤️',
    community: '👥'
};

// ============================================================================
// NOTIFICATION STATE
// ============================================================================

async function getLastCheckTime() {
    const { data } = await supabase
        .from('sync_state')
        .select('last_sync_at')
        .eq('id', 'project-notifications')
        .single();

    return data?.last_sync_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

async function updateLastCheckTime() {
    await supabase
        .from('sync_state')
        .upsert({
            id: 'project-notifications',
            sync_type: 'notifications',
            last_sync_at: new Date().toISOString()
        });
}

// ============================================================================
// NOTIFICATION DETECTION
// ============================================================================

async function findProjectCommunications(since) {
    // Get all inbound communications since last check
    const { data: comms } = await supabase
        .from('communications_history')
        .select('id, ghl_contact_id, subject, content_preview, occurred_at, direction, channel')
        .eq('direction', 'inbound')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false });

    if (!comms || comms.length === 0) {
        return [];
    }

    // Get all contacts with their tags
    const contactIds = [...new Set(comms.map(c => c.ghl_contact_id))];
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .in('ghl_id', contactIds);

    const contactMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    // Match communications to projects
    const notifications = [];

    for (const comm of comms) {
        const contact = contactMap.get(comm.ghl_contact_id);
        if (!contact) continue;

        const contactTags = (contact.tags || []).map(t => t.toLowerCase());
        const matchedProjects = [];

        for (const [projId, project] of Object.entries(PROJECTS)) {
            if (project.tags.some(pt => contactTags.includes(pt.toLowerCase()))) {
                matchedProjects.push(project);
            }
        }

        if (matchedProjects.length > 0) {
            // Check if contact is a partner/funder (high priority)
            const isHighValue = contactTags.includes('partner') || contactTags.includes('funder');
            const isResponsive = contactTags.includes('responsive');

            notifications.push({
                comm,
                contact,
                projects: matchedProjects,
                priority: isHighValue ? 'high' : (matchedProjects.some(p => p.priority === 'high') ? 'high' : 'medium'),
                isPartner: isHighValue,
                isResponsive
            });
        }
    }

    return notifications;
}

// ============================================================================
// DISCORD NOTIFICATIONS
// ============================================================================

async function sendProjectNotification(notification) {
    const { comm, contact, projects, priority, isPartner } = notification;

    const projectNames = projects.map(p => p.name).join(', ');
    const categoryIcon = CATEGORY_ICONS[projects[0].category] || '📬';
    const partnerBadge = isPartner ? ' 🤝 Partner' : '';

    const embed = {
        title: `${categoryIcon} ${projectNames}${partnerBadge}`,
        color: priority === 'high' ? 0xED4245 : 0x5865F2,
        description: `**${contact.full_name}** reached out`,
        fields: [
            {
                name: 'Subject',
                value: comm.subject?.slice(0, 100) || '(no subject)',
                inline: false
            },
            {
                name: 'Channel',
                value: comm.channel || 'email',
                inline: true
            },
            {
                name: 'When',
                value: new Date(comm.occurred_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                inline: true
            }
        ],
        footer: { text: 'ACT Studio Project Bot' },
        timestamp: new Date().toISOString()
    };

    // Add preview if available
    if (comm.content_preview) {
        embed.fields.push({
            name: 'Preview',
            value: comm.content_preview.slice(0, 200) + (comm.content_preview.length > 200 ? '...' : ''),
            inline: false
        });
    }

    return sendEmbed('alerts', embed);
}

async function sendSummaryNotification(notifications) {
    if (notifications.length === 0) return;

    // Group by project
    const byProject = {};
    notifications.forEach(n => {
        n.projects.forEach(p => {
            if (!byProject[p.name]) byProject[p.name] = [];
            byProject[p.name].push(n);
        });
    });

    const fields = Object.entries(byProject)
        .slice(0, 5)
        .map(([projName, notifs]) => ({
            name: projName,
            value: notifs.slice(0, 3).map(n =>
                `• ${n.contact.full_name}${n.isPartner ? ' 🤝' : ''}`
            ).join('\n'),
            inline: true
        }));

    const embed = {
        title: `📬 Project Activity (${notifications.length} messages)`,
        color: 0x00AE86,
        fields,
        footer: { text: 'ACT Studio Project Bot' },
        timestamp: new Date().toISOString()
    };

    return sendEmbed('alerts', embed);
}

// ============================================================================
// COMMANDS
// ============================================================================

async function checkAndNotify(dryRun = false) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Project Notifications Check');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const lastCheck = await getLastCheckTime();
    console.log(`Last check: ${new Date(lastCheck).toLocaleString()}`);
    console.log(`Checking since: ${lastCheck}\n`);

    const notifications = await findProjectCommunications(lastCheck);

    if (notifications.length === 0) {
        console.log('No new project-related communications.\n');
        if (!dryRun) {
            await updateLastCheckTime();
        }
        return;
    }

    console.log(`Found ${notifications.length} project-related messages:\n`);

    // Group by priority
    const highPriority = notifications.filter(n => n.priority === 'high');
    const mediumPriority = notifications.filter(n => n.priority === 'medium');

    if (highPriority.length > 0) {
        console.log(`🔥 HIGH PRIORITY (${highPriority.length})`);
        console.log('─'.repeat(50));
        highPriority.forEach(n => {
            const projects = n.projects.map(p => p.name).join(', ');
            const badge = n.isPartner ? ' [PARTNER]' : '';
            console.log(`  ${n.contact.full_name}${badge} → ${projects}`);
            console.log(`    "${n.comm.subject?.slice(0, 50) || '(no subject)'}"`);
        });
        console.log('');
    }

    if (mediumPriority.length > 0) {
        console.log(`📬 OTHER (${mediumPriority.length})`);
        console.log('─'.repeat(50));
        mediumPriority.slice(0, 10).forEach(n => {
            const projects = n.projects.map(p => p.name).join(', ');
            console.log(`  ${n.contact.full_name} → ${projects}`);
        });
        if (mediumPriority.length > 10) {
            console.log(`  ... and ${mediumPriority.length - 10} more`);
        }
        console.log('');
    }

    if (!dryRun) {
        console.log('Sending Discord notifications...');

        // Send individual notifications for high priority
        for (const n of highPriority.slice(0, 5)) {
            await sendProjectNotification(n);
        }

        // Send summary if there are many
        if (notifications.length > 3) {
            await sendSummaryNotification(notifications);
        }

        await updateLastCheckTime();
        console.log('Done!\n');
    } else {
        console.log('[DRY RUN] Would have sent Discord notifications.\n');
    }
}

async function showRecent() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Recent Project Communications (7 days)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const notifications = await findProjectCommunications(sevenDaysAgo);

    if (notifications.length === 0) {
        console.log('No project-related communications in the last 7 days.\n');
        return;
    }

    // Group by project
    const byProject = {};
    notifications.forEach(n => {
        n.projects.forEach(p => {
            if (!byProject[p.name]) byProject[p.name] = [];
            byProject[p.name].push(n);
        });
    });

    Object.entries(byProject)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([projName, notifs]) => {
            const icon = CATEGORY_ICONS[notifs[0].projects[0].category] || '📬';
            console.log(`${icon} ${projName} (${notifs.length})`);
            console.log('─'.repeat(50));

            notifs.slice(0, 5).forEach(n => {
                const date = new Date(n.comm.occurred_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short'
                });
                const badge = n.isPartner ? '🤝' : '';
                console.log(`  ${date} ${badge} ${n.contact.full_name}: ${n.comm.subject?.slice(0, 40) || '(no subject)'}`);
            });

            if (notifs.length > 5) {
                console.log(`  ... and ${notifs.length - 5} more`);
            }
            console.log('');
        });
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'notify';

switch (command) {
    case 'check':
        await checkAndNotify(true);
        break;
    case 'notify':
        await checkAndNotify(false);
        break;
    case 'recent':
        await showRecent();
        break;
    default:
        console.log('Project Notifications System');
        console.log('');
        console.log('Commands:');
        console.log('  notify   - Check and send notifications (default)');
        console.log('  check    - Check only (dry run)');
        console.log('  recent   - Show recent project communications');
}
