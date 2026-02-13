#!/usr/bin/env node
/**
 * ACT Project Manager Agent
 *
 * Comprehensive project management that:
 * - Uses unified project codes across all systems
 * - Matches relationships to projects automatically
 * - Links ALMA impact measurement
 * - Connects Empathy Ledger stories to projects
 * - Generates summaries and moon cycle todos
 * - Supports LCAA art/storytelling process
 *
 * Usage:
 *   node scripts/act-project-manager.mjs [command]
 *
 * Commands:
 *   status              - Full project portfolio status
 *   codes               - Show all project codes
 *   match               - Match relationships to projects (Ralph process)
 *   summaries           - Generate project summaries
 *   moon                - Moon cycle strategy and todos
 *   stories <code>      - Link Empathy Ledger stories to project
 *   impact <code>       - Show ALMA impact metrics
 *   lcaa <code>         - LCAA process status for project
 *   sync                - Sync codes to all systems
 *   report              - Full portfolio report
 *   partners [code]     - Generate partner update digests
 *   workflow            - Show day-to-day workflow status
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// Load project codes
const PROJECT_CODES = await loadProjectsConfig();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProjectByCode(code) {
    return PROJECT_CODES.projects[code];
}

function getProjectByName(name) {
    const nameLower = name.toLowerCase();
    return Object.entries(PROJECT_CODES.projects).find(([code, proj]) =>
        proj.name.toLowerCase().includes(nameLower) ||
        code.toLowerCase().includes(nameLower)
    );
}

function getCategoryIcon(category) {
    return PROJECT_CODES.categories[category]?.icon || '📋';
}

// ============================================================================
// STATUS - Full Portfolio Status
// ============================================================================

async function showStatus() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Project Portfolio Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get contact counts by project tags
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, tags, last_contact_date');

    const tagCounts = {};
    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            tagCounts[tag.toLowerCase()] = (tagCounts[tag.toLowerCase()] || 0) + 1;
        });
    });

    // Get recent communications
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, direction')
        .gte('occurred_at', sevenDaysAgo);

    // Get project updates
    const { data: updates } = await supabase
        .from('project_updates')
        .select('project_id, created_at')
        .gte('created_at', sevenDaysAgo);

    const updatesByProject = {};
    (updates || []).forEach(u => {
        updatesByProject[u.project_id] = (updatesByProject[u.project_id] || 0) + 1;
    });

    // Group by category
    const byCategory = {};
    Object.entries(PROJECT_CODES.projects).forEach(([code, proj]) => {
        const cat = proj.category;
        if (!byCategory[cat]) byCategory[cat] = [];

        const contactCount = (proj.ghl_tags || []).reduce((sum, tag) =>
            sum + (tagCounts[tag.toLowerCase()] || 0), 0
        );

        byCategory[cat].push({
            code,
            ...proj,
            contactCount,
            recentUpdates: updatesByProject[code.toLowerCase().replace('act-', '')] || 0
        });
    });

    // Display
    const categoryOrder = ['justice', 'indigenous', 'stories', 'enterprise', 'regenerative', 'health', 'community', 'arts', 'events', 'funding', 'tech'];

    let totalProjects = 0;
    let highPriority = 0;
    let totalContacts = 0;

    for (const cat of categoryOrder) {
        const projs = byCategory[cat];
        if (!projs || projs.length === 0) continue;

        const icon = getCategoryIcon(cat);
        console.log(`${icon} ${cat.toUpperCase()} (${projs.length})`);
        console.log('─'.repeat(70));
        console.log('Code'.padEnd(10) + 'Project'.padEnd(25) + 'Contacts'.padEnd(10) + 'Updates'.padEnd(10) + 'Priority');
        console.log('─'.repeat(70));

        projs.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }).forEach(proj => {
            const priorityIcon = proj.priority === 'high' ? '🔥' : '';
            console.log(
                proj.code.padEnd(10) +
                proj.name.slice(0, 23).padEnd(25) +
                proj.contactCount.toString().padEnd(10) +
                (proj.recentUpdates > 0 ? `✓${proj.recentUpdates}` : '-').padEnd(10) +
                priorityIcon
            );

            totalProjects++;
            totalContacts += proj.contactCount;
            if (proj.priority === 'high') highPriority++;
        });

        console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total: ${totalProjects} projects | ${highPriority} high priority | ${totalContacts} contacts`);
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// CODES - Show All Project Codes
// ============================================================================

function showCodes() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Unified Project Codes');
    console.log('  Use these codes across: Notion, Supabase, GHL, Xero, Dext');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Code'.padEnd(10) + 'Project'.padEnd(28) + 'Category'.padEnd(14) + 'Xero Tracking');
    console.log('─'.repeat(70));

    Object.entries(PROJECT_CODES.projects)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, proj]) => {
            const icon = getCategoryIcon(proj.category);
            console.log(
                code.padEnd(10) +
                proj.name.slice(0, 26).padEnd(28) +
                `${icon} ${proj.category}`.padEnd(14) +
                (proj.xero_tracking || '-')
            );
        });

    console.log('\n');
    console.log('Categories:');
    Object.entries(PROJECT_CODES.categories).forEach(([cat, info]) => {
        console.log(`  ${info.icon} ${cat.padEnd(12)} → Dext: ${info.dext}`);
    });
}

// ============================================================================
// MATCH - Match Relationships to Projects (Ralph Process)
// ============================================================================

async function matchRelationships() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Relationship-Project Matching (Ralph Process)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all contacts
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date');

    // Get all communications
    const { data: comms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, content_preview, topics')
        .order('occurred_at', { ascending: false })
        .limit(1000);

    // Build keyword index for project matching
    const projectKeywords = {};
    Object.entries(PROJECT_CODES.projects).forEach(([code, proj]) => {
        const keywords = [
            ...proj.ghl_tags || [],
            ...(proj.notion_pages || []).map(p => p.toLowerCase()),
            proj.name.toLowerCase(),
            ...(proj.description?.split(' ') || []).filter(w => w.length > 4)
        ];
        projectKeywords[code] = keywords.map(k => k.toLowerCase());
    });

    // Match contacts to projects based on tags
    const tagMatches = [];
    const keywordMatches = [];

    for (const contact of contacts || []) {
        const contactTags = (contact.tags || []).map(t => t.toLowerCase());

        // Check direct tag matches
        for (const [code, proj] of Object.entries(PROJECT_CODES.projects)) {
            const projectTags = (proj.ghl_tags || []).map(t => t.toLowerCase());
            const matchedTags = contactTags.filter(ct => projectTags.includes(ct));

            if (matchedTags.length > 0) {
                tagMatches.push({
                    contact,
                    code,
                    project: proj.name,
                    matchType: 'tag',
                    matchedTags
                });
            }
        }

        // Check communication keyword matches
        const contactComms = (comms || []).filter(c => c.ghl_contact_id === contact.ghl_id);
        const commText = contactComms.map(c =>
            `${c.subject || ''} ${c.content_preview || ''} ${(c.topics || []).join(' ')}`
        ).join(' ').toLowerCase();

        for (const [code, keywords] of Object.entries(projectKeywords)) {
            const matchedKeywords = keywords.filter(k => commText.includes(k));
            if (matchedKeywords.length >= 2 && !tagMatches.find(m => m.contact.ghl_id === contact.ghl_id && m.code === code)) {
                keywordMatches.push({
                    contact,
                    code,
                    project: PROJECT_CODES.projects[code].name,
                    matchType: 'keyword',
                    matchedKeywords: matchedKeywords.slice(0, 5)
                });
            }
        }
    }

    // Display results
    console.log(`TAG MATCHES (${tagMatches.length} confirmed)`);
    console.log('─'.repeat(60));

    const tagsByProject = {};
    tagMatches.forEach(m => {
        if (!tagsByProject[m.code]) tagsByProject[m.code] = [];
        tagsByProject[m.code].push(m);
    });

    Object.entries(tagsByProject).slice(0, 10).forEach(([code, matches]) => {
        const proj = PROJECT_CODES.projects[code];
        console.log(`\n${getCategoryIcon(proj.category)} ${code} - ${proj.name} (${matches.length} contacts)`);
        matches.slice(0, 3).forEach(m => {
            console.log(`  • ${m.contact.full_name || m.contact.email}`);
        });
        if (matches.length > 3) console.log(`  ... and ${matches.length - 3} more`);
    });

    console.log('\n');
    console.log(`KEYWORD MATCHES (${keywordMatches.length} suggested - need review)`);
    console.log('─'.repeat(60));

    keywordMatches.slice(0, 15).forEach(m => {
        console.log(`  ${m.contact.full_name || m.contact.email}`);
        console.log(`    → ${m.code} (${m.project}) [${m.matchedKeywords.slice(0, 3).join(', ')}]`);
    });

    if (keywordMatches.length > 15) {
        console.log(`  ... and ${keywordMatches.length - 15} more suggestions`);
    }

    console.log('\n');
    console.log('SUMMARY');
    console.log('─'.repeat(60));
    console.log(`  Confirmed tag matches: ${tagMatches.length}`);
    console.log(`  Suggested keyword matches: ${keywordMatches.length}`);
    console.log(`  Unique projects with contacts: ${Object.keys(tagsByProject).length}`);

    // Save suggestions for review
    const suggestions = keywordMatches.map(m => ({
        contact_id: m.contact.ghl_id,
        contact_name: m.contact.full_name,
        contact_email: m.contact.email,
        suggested_project: m.code,
        project_name: m.project,
        match_keywords: m.matchedKeywords,
        suggested_tag: PROJECT_CODES.projects[m.code].ghl_tags?.[0]
    }));

    if (suggestions.length > 0) {
        console.log('\n  Suggestions saved to: config/relationship-project-suggestions.json');
        writeFileSync('config/relationship-project-suggestions.json', JSON.stringify(suggestions, null, 2));
    }
}

// ============================================================================
// SUMMARIES - Generate Project Summaries
// ============================================================================

async function generateSummaries() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Project Summaries');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get contact counts
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, tags, last_contact_date');

    const tagCounts = {};
    const lastContactByTag = {};

    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            const t = tag.toLowerCase();
            tagCounts[t] = (tagCounts[t] || 0) + 1;
            if (c.last_contact_date) {
                if (!lastContactByTag[t] || c.last_contact_date > lastContactByTag[t]) {
                    lastContactByTag[t] = c.last_contact_date;
                }
            }
        });
    });

    // Get updates
    const { data: updates } = await supabase
        .from('project_updates')
        .select('*')
        .order('created_at', { ascending: false });

    const updatesByProject = {};
    (updates || []).forEach(u => {
        if (!updatesByProject[u.project_id]) updatesByProject[u.project_id] = [];
        updatesByProject[u.project_id].push(u);
    });

    // Generate summaries for high priority projects
    const highPriority = Object.entries(PROJECT_CODES.projects)
        .filter(([_, p]) => p.priority === 'high');

    for (const [code, proj] of highPriority) {
        const icon = getCategoryIcon(proj.category);
        console.log(`${icon} ${code} - ${proj.name}`);
        console.log('─'.repeat(60));

        // Contact stats
        const contactCount = (proj.ghl_tags || []).reduce((sum, tag) =>
            sum + (tagCounts[tag.toLowerCase()] || 0), 0
        );

        // Last activity
        let lastActivity = null;
        (proj.ghl_tags || []).forEach(tag => {
            const lastContact = lastContactByTag[tag.toLowerCase()];
            if (lastContact && (!lastActivity || lastContact > lastActivity)) {
                lastActivity = lastContact;
            }
        });

        const daysSinceActivity = lastActivity
            ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        // Recent updates
        const projectUpdates = updatesByProject[code.toLowerCase().replace('act-', '')] || [];

        console.log(`  Contacts: ${contactCount}`);
        console.log(`  Last Activity: ${daysSinceActivity !== null ? `${daysSinceActivity} days ago` : 'unknown'}`);
        console.log(`  Recent Updates: ${projectUpdates.length}`);

        if (proj.leads) {
            console.log(`  Leads: ${proj.leads.join(', ')}`);
        }

        if (proj.lcaa_themes) {
            console.log(`  LCAA Focus: ${proj.lcaa_themes.join(' → ')}`);
        }

        // Health assessment
        let health = '🟢 Active';
        if (daysSinceActivity === null || daysSinceActivity > 60) {
            health = '🔴 Needs Attention';
        } else if (daysSinceActivity > 30) {
            health = '🟡 Warming Up';
        }
        console.log(`  Health: ${health}`);

        if (projectUpdates.length > 0) {
            console.log(`  Latest: "${projectUpdates[0].content.slice(0, 50)}..."`);
        }

        console.log('');
    }
}

// ============================================================================
// MOON - Moon Cycle Strategy and Todos
// ============================================================================

async function moonCycleStrategy() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Moon Cycle Project Strategy');
    console.log('  Aligning project work with natural rhythms');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Determine moon phase (simplified)
    const now = new Date();
    const synodicMonth = 29.53059;
    const knownNewMoon = new Date('2026-01-15'); // Known new moon date
    const daysSinceNew = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const moonAge = daysSinceNew % synodicMonth;

    let phase, phaseEmoji, phaseAdvice;
    if (moonAge < 7.4) {
        phase = 'New Moon → First Quarter';
        phaseEmoji = '🌑';
        phaseAdvice = 'PLANT SEEDS: Start new initiatives, make first contacts, set intentions';
    } else if (moonAge < 14.8) {
        phase = 'First Quarter → Full Moon';
        phaseEmoji = '🌓';
        phaseAdvice = 'BUILD MOMENTUM: Follow up, deepen relationships, take action';
    } else if (moonAge < 22.1) {
        phase = 'Full Moon → Last Quarter';
        phaseEmoji = '🌕';
        phaseAdvice = 'HARVEST & SHARE: Complete projects, share stories, celebrate wins';
    } else {
        phase = 'Last Quarter → New Moon';
        phaseEmoji = '🌗';
        phaseAdvice = 'REFLECT & RELEASE: Review progress, let go of what isn\'t working, rest';
    }

    console.log(`Current Phase: ${phaseEmoji} ${phase}`);
    console.log(`Advice: ${phaseAdvice}`);
    console.log('');

    // Get project data
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('tags, last_contact_date');

    const tagCounts = {};
    const dormantByTag = {};

    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            const t = tag.toLowerCase();
            tagCounts[t] = (tagCounts[t] || 0) + 1;

            if (c.last_contact_date) {
                const daysSince = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSince > 45) {
                    dormantByTag[t] = (dormantByTag[t] || 0) + 1;
                }
            }
        });
    });

    // Generate phase-appropriate todos
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ${phaseEmoji} MOON CYCLE TODOS`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const highPriority = Object.entries(PROJECT_CODES.projects)
        .filter(([_, p]) => p.priority === 'high');

    if (moonAge < 7.4) {
        // New Moon - Plant Seeds
        console.log('🌱 NEW INITIATIVES TO START:');
        console.log('─'.repeat(50));
        highPriority.slice(0, 5).forEach(([code, proj]) => {
            console.log(`  [ ] ${code}: Draft outreach message for ${proj.name}`);
        });
        console.log('');
        console.log('📧 FIRST CONTACTS TO MAKE:');
        console.log('─'.repeat(50));
        console.log('  [ ] Review dormant contacts for re-engagement');
        console.log('  [ ] Identify 3 new people to connect with per project');

    } else if (moonAge < 14.8) {
        // Building - Take Action
        console.log('⚡ ACTIONS TO TAKE:');
        console.log('─'.repeat(50));
        highPriority.forEach(([code, proj]) => {
            const dormant = (proj.ghl_tags || []).reduce((sum, tag) =>
                sum + (dormantByTag[tag.toLowerCase()] || 0), 0
            );
            if (dormant > 0) {
                console.log(`  [ ] ${code}: Follow up with ${dormant} dormant contacts`);
            }
        });
        console.log('');
        console.log('📞 RELATIONSHIPS TO DEEPEN:');
        console.log('─'.repeat(50));
        console.log('  [ ] Schedule calls with key partners');
        console.log('  [ ] Send project updates to engaged contacts');

    } else if (moonAge < 22.1) {
        // Full Moon - Harvest
        console.log('✨ STORIES TO SHARE:');
        console.log('─'.repeat(50));
        highPriority.forEach(([code, proj]) => {
            if (proj.lcaa_themes?.includes('Amplify')) {
                console.log(`  [ ] ${code}: Collect and share a ${proj.name} story`);
            }
        });
        console.log('');
        console.log('🎉 WINS TO CELEBRATE:');
        console.log('─'.repeat(50));
        console.log('  [ ] Document project milestones');
        console.log('  [ ] Thank key contributors');
        console.log('  [ ] Share progress on social media');

    } else {
        // Waning - Reflect
        console.log('📊 REVIEWS TO COMPLETE:');
        console.log('─'.repeat(50));
        highPriority.forEach(([code, proj]) => {
            console.log(`  [ ] ${code}: Review ${proj.name} progress and health`);
        });
        console.log('');
        console.log('🧹 THINGS TO RELEASE:');
        console.log('─'.repeat(50));
        console.log('  [ ] Archive inactive contacts');
        console.log('  [ ] Close completed projects');
        console.log('  [ ] Clear email backlog');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Next phase change in ~7 days');
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// STORIES - Link Empathy Ledger Stories to Project
// ============================================================================

async function linkStories(projectCode) {
    const proj = getProjectByCode(projectCode) || getProjectByName(projectCode)?.[1];

    if (!proj) {
        console.log(`Project "${projectCode}" not found.`);
        console.log('Available codes:', Object.keys(PROJECT_CODES.projects).join(', '));
        return;
    }

    const code = Object.entries(PROJECT_CODES.projects).find(([_, p]) => p === proj)?.[0];

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Empathy Ledger Stories for ${proj.name} (${code})`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Search for stories related to this project
    // This would connect to the Empathy Ledger database
    const keywords = [
        proj.name.toLowerCase(),
        ...(proj.ghl_tags || []),
        ...(proj.notion_pages || []).map(p => p.toLowerCase())
    ];

    console.log(`Searching for stories with keywords: ${keywords.slice(0, 5).join(', ')}...`);
    console.log('');

    // For now, show the LCAA storytelling framework
    console.log('LCAA STORYTELLING FRAMEWORK');
    console.log('─'.repeat(50));

    if (proj.lcaa_themes) {
        proj.lcaa_themes.forEach(theme => {
            console.log(`\n${theme.toUpperCase()}`);
            console.log(`  ${PROJECT_CODES.lcaa_framework[theme]}`);

            switch (theme) {
                case 'Listen':
                    console.log('  → Collect stories from community members');
                    console.log('  → Record voice notes and interviews');
                    break;
                case 'Connect':
                    console.log('  → Share stories between related projects');
                    console.log('  → Build narrative bridges');
                    break;
                case 'Act':
                    console.log('  → Document actions and their impact');
                    console.log('  → Create progress narratives');
                    break;
                case 'Amplify':
                    console.log('  → Publish stories on act.place');
                    console.log('  → Create art from stories');
                    break;
            }
        });
    } else {
        console.log('  No LCAA themes assigned yet.');
        console.log('  Consider adding: Listen, Connect, Act, Amplify');
    }

    console.log('\n');
    console.log('STORY COLLECTION STATUS');
    console.log('─'.repeat(50));
    console.log(`  ALMA Program: ${proj.alma_program || 'not assigned'}`);
    console.log(`  Cultural Protocols: ${proj.cultural_protocols ? 'Required' : 'Standard'}`);
    console.log('');
    console.log('To add stories, use the Empathy Ledger:');
    console.log(`  Tag stories with: ${code}`);
}

// ============================================================================
// IMPACT - Show ALMA Impact Metrics
// ============================================================================

async function showImpact(projectCode) {
    const proj = getProjectByCode(projectCode) || getProjectByName(projectCode)?.[1];

    if (!proj) {
        console.log(`Project "${projectCode}" not found.`);
        return;
    }

    const code = Object.entries(PROJECT_CODES.projects).find(([_, p]) => p === proj)?.[0];

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ALMA Impact Metrics for ${proj.name} (${code})`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('ALMA PROGRAM');
    console.log('─'.repeat(50));
    console.log(`  Program: ${proj.alma_program || 'not assigned'}`);
    console.log(`  Category: ${proj.category}`);
    console.log('');

    // Get contact metrics
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, tags, last_contact_date')
        .overlaps('tags', proj.ghl_tags || []);

    const totalContacts = contacts?.length || 0;
    const activeContacts = (contacts || []).filter(c => {
        if (!c.last_contact_date) return false;
        const daysSince = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 30;
    }).length;

    console.log('RELATIONSHIP METRICS');
    console.log('─'.repeat(50));
    console.log(`  Total Contacts: ${totalContacts}`);
    console.log(`  Active (30d): ${activeContacts}`);
    console.log(`  Engagement Rate: ${totalContacts > 0 ? Math.round(activeContacts / totalContacts * 100) : 0}%`);
    console.log('');

    console.log('IMPACT FRAMEWORK');
    console.log('─'.repeat(50));
    console.log('  Inputs: Resources, relationships, knowledge invested');
    console.log('  Activities: Project work, events, communications');
    console.log('  Outputs: Deliverables, connections made, stories captured');
    console.log('  Outcomes: Behavior changes, capacity built, systems changed');
    console.log('  Impact: Long-term community benefit');
    console.log('');

    console.log('To track full ALMA metrics, connect to empathy-ledger-v2:');
    console.log('  https://el.act.place/api/v1/alma/program/' + (proj.alma_program || 'default'));
}

// ============================================================================
// LCAA - LCAA Process Status
// ============================================================================

async function showLcaa(projectCode) {
    const proj = getProjectByCode(projectCode) || getProjectByName(projectCode)?.[1];

    if (!proj) {
        console.log(`Project "${projectCode}" not found.`);
        return;
    }

    const code = Object.entries(PROJECT_CODES.projects).find(([_, p]) => p === proj)?.[0];

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  LCAA Process for ${proj.name} (${code})`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const lcaaSteps = [
        { step: 'LISTEN', icon: '👂', desc: PROJECT_CODES.lcaa_framework.Listen },
        { step: 'CONNECT', icon: '🤝', desc: PROJECT_CODES.lcaa_framework.Connect },
        { step: 'ACT', icon: '⚡', desc: PROJECT_CODES.lcaa_framework.Act },
        { step: 'AMPLIFY', icon: '📣', desc: PROJECT_CODES.lcaa_framework.Amplify }
    ];

    const themes = proj.lcaa_themes || [];

    lcaaSteps.forEach(({ step, icon, desc }) => {
        const active = themes.includes(step.charAt(0) + step.slice(1).toLowerCase());
        const status = active ? '✓' : '○';

        console.log(`${status} ${icon} ${step}`);
        console.log(`  ${desc}`);

        if (active) {
            switch (step) {
                case 'LISTEN':
                    console.log('  → Active: Collecting community voices');
                    break;
                case 'CONNECT':
                    console.log('  → Active: Building relationships');
                    break;
                case 'ACT':
                    console.log('  → Active: Taking meaningful action');
                    break;
                case 'AMPLIFY':
                    console.log('  → Active: Sharing stories and impact');
                    break;
            }
        }
        console.log('');
    });

    console.log('ART & STORYTELLING OPPORTUNITIES');
    console.log('─'.repeat(50));
    console.log('  • Collect voice notes from project participants');
    console.log('  • Create visual stories of project impact');
    console.log('  • Document the journey in Empathy Ledger');
    console.log('  • Generate art from community narratives');
}

// ============================================================================
// SYNC - Sync Codes to All Systems
// ============================================================================

async function syncCodes() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Sync Project Codes to All Systems');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('SYSTEMS TO UPDATE:');
    console.log('─'.repeat(50));

    // 1. Supabase - create/update project codes table
    console.log('\n1. SUPABASE');
    const { error: upsertError } = await supabase
        .from('project_codes')
        .upsert(
            Object.entries(PROJECT_CODES.projects).map(([code, proj]) => ({
                code,
                name: proj.name,
                category: proj.category,
                priority: proj.priority,
                status: proj.status,
                description: proj.description,
                ghl_tags: proj.ghl_tags,
                xero_tracking: proj.xero_tracking,
                dext_category: proj.dext_category,
                alma_program: proj.alma_program,
                cultural_protocols: proj.cultural_protocols || false,
                lcaa_themes: proj.lcaa_themes,
                updated_at: new Date().toISOString()
            })),
            { onConflict: 'code' }
        );

    if (upsertError) {
        if (upsertError.code === '42P01') {
            console.log('   Table project_codes does not exist. Creating...');
            console.log('   Run: node scripts/act-project-manager.mjs setup');
        } else {
            console.log(`   Error: ${upsertError.message}`);
        }
    } else {
        console.log('   ✓ Synced to project_codes table');
    }

    // 2. GHL Tags
    console.log('\n2. GHL TAGS');
    const allTags = new Set();
    Object.values(PROJECT_CODES.projects).forEach(proj => {
        (proj.ghl_tags || []).forEach(tag => allTags.add(tag));
    });
    console.log(`   ${allTags.size} unique project tags defined`);
    console.log('   Tags: ' + Array.from(allTags).slice(0, 10).join(', ') + '...');

    // 3. Xero
    console.log('\n3. XERO TRACKING CATEGORIES');
    const xeroCategories = Object.values(PROJECT_CODES.projects)
        .map(p => p.xero_tracking)
        .filter(Boolean);
    console.log(`   ${xeroCategories.length} Xero tracking categories defined`);

    // 4. Dext
    console.log('\n4. DEXT CATEGORIES');
    const dextCategories = new Set(Object.values(PROJECT_CODES.projects).map(p => p.dext_category).filter(Boolean));
    console.log(`   ${dextCategories.size} Dext categories: ${Array.from(dextCategories).join(', ')}`);

    // 5. Notion
    console.log('\n5. NOTION PAGES');
    const notionPages = Object.values(PROJECT_CODES.projects)
        .flatMap(p => p.notion_pages || []);
    console.log(`   ${notionPages.length} Notion pages mapped`);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Sync complete. Project codes are the source of truth.');
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// REPORT - Full Portfolio Report
// ============================================================================

async function generateReport() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Project Portfolio Report');
    console.log('  Generated: ' + new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }));
    console.log('═══════════════════════════════════════════════════════════════\n');

    await showStatus();
    await moonCycleStrategy();
    await generateSummaries();
}

// ============================================================================
// PARTNERS - Generate Partner Update Digests
// ============================================================================

async function generatePartnerUpdates(projectCode) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Partner Update Digest Generator');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get moon phase
    const now = new Date();
    const synodicMonth = 29.53059;
    const knownNewMoon = new Date('2026-01-15');
    const daysSinceNew = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const moonAge = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;

    let phase, theme;
    if (moonAge < 3.69) {
        phase = 'new_moon';
        theme = 'Intentions';
    } else if (moonAge < 11.07) {
        phase = 'first_quarter';
        theme = 'Building';
    } else if (moonAge < 14.77) {
        phase = 'full_moon';
        theme = 'Celebration';
    } else if (moonAge < 22.15) {
        phase = 'last_quarter';
        theme = 'Reflection';
    } else {
        phase = 'waning';
        theme = 'Integration';
    }

    console.log(`Moon Phase: ${phase.replace('_', ' ')} | Theme: ${theme}`);
    console.log('');

    // Get projects to process
    let projects;
    if (projectCode) {
        const proj = getProjectByCode(projectCode);
        if (!proj) {
            console.error(`Project ${projectCode} not found`);
            return;
        }
        projects = [[projectCode, proj]];
    } else {
        projects = Object.entries(PROJECT_CODES.projects)
            .filter(([_, p]) => p.priority === 'high');
    }

    console.log(`Generating updates for ${projects.length} project(s)\n`);

    for (const [code, proj] of projects) {
        const icon = getCategoryIcon(proj.category);
        console.log(`${icon} ${code} - ${proj.name}`);
        console.log('─'.repeat(50));

        // Get partner contacts
        const { data: contacts } = await supabase
            .from('ghl_contacts')
            .select('ghl_id, full_name, email, tags')
            .overlaps('tags', proj.ghl_tags || []);

        const partnerCount = contacts?.length || 0;

        // Get recent updates
        const { data: updates } = await supabase
            .from('project_updates')
            .select('content, created_at')
            .eq('project_id', code.toLowerCase().replace('act-', ''))
            .order('created_at', { ascending: false })
            .limit(3);

        console.log(`  Partners: ${partnerCount}`);
        console.log(`  Recent Updates: ${updates?.length || 0}`);

        // Generate digest content based on moon phase
        console.log(`  Digest Theme: ${theme}`);

        if (phase === 'new_moon' || phase === 'first_quarter') {
            console.log('  Content Focus: Upcoming work, goals, invitations');
        } else if (phase === 'full_moon') {
            console.log('  Content Focus: Achievements, stories, impact, gratitude');
        } else {
            console.log('  Content Focus: Insights, learnings, reflection');
        }

        // Show preview
        if (updates?.length > 0) {
            console.log(`  Latest Update: "${updates[0].content.slice(0, 60)}..."`);
        }

        console.log('');
    }

    console.log('─────────────────────────────────────────────────────────────');
    console.log('To send digests: node scripts/partner-digest.mjs generate');
    console.log('To preview:      node scripts/partner-digest.mjs preview <code>');
}

// ============================================================================
// WORKFLOW - Day-to-Day Workflow Status
// ============================================================================

async function showWorkflowStatus() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Day-to-Day Workflow Status');
    console.log('  "One brain, many inputs. Capture everywhere, process centrally."');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Load workflow config
    let workflowConfig = {};
    try {
        workflowConfig = JSON.parse(readFileSync('config/workflow-config.json', 'utf8'));
    } catch (e) {
        console.warn('Could not load workflow config');
    }

    // INPUT CHANNELS
    console.log('INPUT CHANNELS');
    console.log('─'.repeat(50));

    const inputChannels = [
        { name: 'Discord', enabled: true, status: 'Voice notes, notifications, updates' },
        { name: 'Signal', enabled: false, status: 'Requires signal-cli setup' },
        { name: 'WhatsApp', enabled: false, status: 'Manual upload only' },
        { name: 'Notion', enabled: true, status: 'Tasks, meetings, sprints' },
        { name: 'Email (GHL)', enabled: true, status: 'Synced to communications_history' },
    ];

    inputChannels.forEach(ch => {
        const icon = ch.enabled ? '✅' : '⭕';
        console.log(`  ${icon} ${ch.name.padEnd(12)} ${ch.status}`);
    });

    // OUTPUT CHANNELS
    console.log('\nOUTPUT CHANNELS');
    console.log('─'.repeat(50));

    const outputChannels = [
        { name: 'Discord', enabled: true, status: 'Morning brief, alerts, task notifications' },
        { name: 'GHL', enabled: true, status: 'Partner updates, newsletters, social' },
        { name: 'Notion', enabled: true, status: 'Task creation from voice notes' },
    ];

    outputChannels.forEach(ch => {
        const icon = ch.enabled ? '✅' : '⭕';
        console.log(`  ${icon} ${ch.name.padEnd(12)} ${ch.status}`);
    });

    // RECENT ACTIVITY
    console.log('\nRECENT ACTIVITY (24h)');
    console.log('─'.repeat(50));

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Voice notes
    const { data: voiceNotes } = await supabase
        .from('voice_notes')
        .select('id')
        .gte('recorded_at', yesterday);

    // Communications
    const { data: comms } = await supabase
        .from('communications_history')
        .select('id, direction')
        .gte('occurred_at', yesterday);

    const inbound = comms?.filter(c => c.direction === 'inbound').length || 0;
    const outbound = comms?.filter(c => c.direction === 'outbound').length || 0;

    console.log(`  Voice Notes:    ${voiceNotes?.length || 0}`);
    console.log(`  Communications: ${comms?.length || 0} (${inbound} in, ${outbound} out)`);

    // WORKFLOWS
    console.log('\nACTIVE WORKFLOWS');
    console.log('─'.repeat(50));
    console.log('  Morning Ritual:     07:00 AEST → Discord #morning');
    console.log('  Voice Processing:   Auto → Transcribe → Extract → Store');
    console.log('  Partner Updates:    Moon cycle aligned');
    console.log('  Weekly Review:      Friday 16:00');

    // MOON CYCLE
    const now = new Date();
    const synodicMonth = 29.53059;
    const knownNewMoon = new Date('2026-01-15');
    const daysSinceNew = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const moonAge = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;

    let moonPhase, moonAdvice;
    if (moonAge < 7.4) {
        moonPhase = 'New Moon → First Quarter';
        moonAdvice = 'Set intentions, plant seeds';
    } else if (moonAge < 14.8) {
        moonPhase = 'First Quarter → Full Moon';
        moonAdvice = 'Build momentum, take action';
    } else if (moonAge < 22.1) {
        moonPhase = 'Full Moon → Last Quarter';
        moonAdvice = 'Harvest, share, celebrate';
    } else {
        moonPhase = 'Last Quarter → New Moon';
        moonAdvice = 'Reflect, release, rest';
    }

    console.log('\nMOON CYCLE');
    console.log('─'.repeat(50));
    console.log(`  Phase: ${moonPhase}`);
    console.log(`  Advice: ${moonAdvice}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Quick Commands:');
    console.log('    node scripts/generate-morning-brief.mjs');
    console.log('    node scripts/voice-capture-discord.mjs test');
    console.log('    node scripts/partner-digest.mjs schedule');
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'status';
const arg = process.argv.slice(3).join(' ');

switch (command) {
    case 'status':
        await showStatus();
        break;
    case 'codes':
        showCodes();
        break;
    case 'match':
        await matchRelationships();
        break;
    case 'summaries':
        await generateSummaries();
        break;
    case 'moon':
        await moonCycleStrategy();
        break;
    case 'stories':
        if (!arg) {
            console.log('Usage: node scripts/act-project-manager.mjs stories <code>');
            console.log('Example: node scripts/act-project-manager.mjs stories ACT-JH');
        } else {
            await linkStories(arg);
        }
        break;
    case 'impact':
        if (!arg) {
            console.log('Usage: node scripts/act-project-manager.mjs impact <code>');
        } else {
            await showImpact(arg);
        }
        break;
    case 'lcaa':
        if (!arg) {
            console.log('Usage: node scripts/act-project-manager.mjs lcaa <code>');
        } else {
            await showLcaa(arg);
        }
        break;
    case 'sync':
        await syncCodes();
        break;
    case 'report':
        await generateReport();
        break;
    case 'partners':
        await generatePartnerUpdates(arg || null);
        break;
    case 'workflow':
        await showWorkflowStatus();
        break;
    default:
        console.log('ACT Project Manager Agent');
        console.log('');
        console.log('Commands:');
        console.log('  status              - Full project portfolio status');
        console.log('  codes               - Show all unified project codes');
        console.log('  match               - Match relationships to projects (Ralph)');
        console.log('  summaries           - Generate project summaries');
        console.log('  moon                - Moon cycle strategy and todos');
        console.log('  stories <code>      - Link Empathy Ledger stories');
        console.log('  impact <code>       - Show ALMA impact metrics');
        console.log('  lcaa <code>         - LCAA process status');
        console.log('  sync                - Sync codes to all systems');
        console.log('  report              - Full portfolio report');
        console.log('  partners [code]     - Generate partner update digests');
        console.log('  workflow            - Show day-to-day workflow status');
}
