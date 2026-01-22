#!/usr/bin/env node
/**
 * Project-Contact Mapper
 *
 * Maps contacts to projects based on tags, communications, and domain patterns.
 * Answers "who should know about project X?" and "what projects is contact Y involved in?"
 *
 * Usage:
 *   node scripts/project-contact-mapper.mjs [command]
 *
 * Commands:
 *   projects         - List all projects with contact counts (default)
 *   contacts <proj>  - Show contacts for a specific project
 *   involved <email> - Show projects a contact is involved in
 *   suggest <proj>   - Suggest contacts for outreach about a project
 *   map              - Build/update project-contact mappings
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// Project definitions with tag mappings
const PROJECTS = {
    'justicehub': {
        name: 'JusticeHub',
        tags: ['justicehub', 'justice', 'youth justice', 'youth-justice', 'yj'],
        keywords: ['justice', 'youth', 'reform', 'incarceration'],
        description: 'Youth justice reform network'
    },
    'diagrama': {
        name: 'Diagrama',
        tags: ['diagrama'],
        keywords: ['diagrama', 'education', 'rehabilitation'],
        description: 'Alternative education and rehabilitation'
    },
    'harvest': {
        name: 'The Harvest',
        tags: ['harvest', 'the-harvest'],
        keywords: ['harvest', 'food', 'agriculture'],
        description: 'Food systems and agriculture'
    },
    'goods': {
        name: 'Goods',
        tags: ['goods'],
        keywords: ['goods', 'products', 'manufacturing'],
        description: 'Goods and products initiative'
    },
    'empathy-ledger': {
        name: 'Empathy Ledger',
        tags: ['empathy-ledger', 'empathy', 'storytelling'],
        keywords: ['empathy', 'stories', 'storytelling', 'narrative'],
        description: 'Story collection and community narratives'
    },
    'fishers-oysters': {
        name: 'Fishers Oysters',
        tags: ['fishers-oysters', 'fishers'],
        keywords: ['oysters', 'aquaculture', 'fishing'],
        description: 'Oyster farming and aquaculture'
    },
    'act-monthly': {
        name: 'ACT Monthly Dinners',
        tags: ['act-monthly', 'dinners', 'events'],
        keywords: ['dinner', 'event', 'gathering', 'monthly'],
        description: 'Community gathering events'
    },
    'indigenous': {
        name: 'Indigenous Initiatives',
        tags: ['indigenous', 'first-nations', 'aboriginal'],
        keywords: ['indigenous', 'aboriginal', 'first nations', 'elders'],
        description: 'Indigenous community projects'
    }
};

// Non-project tags to exclude from project detection
const EXCLUDE_TAGS = [
    'linkedin', 'linkedin-ben', 'linkedin-nic',
    'ai-flagged', 'needs-attention', 'responsive', 'dormant',
    'community', 'technology', 'government', 'education',
    'partner', 'funder', 'arts', 'research', 'prospect',
    'interest:justice-reform', 'foundation', 'regenerative'
];

// ============================================================================
// FUNCTIONS
// ============================================================================

async function listProjects() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Projects & Contact Counts');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags');

    const projectCounts = {};

    for (const [projectId, project] of Object.entries(PROJECTS)) {
        projectCounts[projectId] = {
            name: project.name,
            description: project.description,
            contacts: []
        };

        for (const contact of contacts || []) {
            const contactTags = (contact.tags || []).map(t => t.toLowerCase());
            const hasProjectTag = project.tags.some(pt => contactTags.includes(pt.toLowerCase()));

            if (hasProjectTag) {
                projectCounts[projectId].contacts.push(contact);
            }
        }
    }

    console.log('Project'.padEnd(25) + 'Contacts'.padEnd(10) + 'Description');
    console.log('─'.repeat(70));

    Object.entries(projectCounts)
        .sort((a, b) => b[1].contacts.length - a[1].contacts.length)
        .forEach(([id, proj]) => {
            console.log(
                proj.name.padEnd(25) +
                proj.contacts.length.toString().padEnd(10) +
                proj.description.slice(0, 35)
            );
        });

    // Show unmatched project-like tags
    console.log('\n');
    console.log('Other Tags (potential projects):');
    console.log('─'.repeat(50));

    const tagCounts = {};
    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            const lowerTag = tag.toLowerCase();
            const isExcluded = EXCLUDE_TAGS.includes(lowerTag);
            const isProjectTag = Object.values(PROJECTS).some(p =>
                p.tags.map(t => t.toLowerCase()).includes(lowerTag)
            );

            if (!isExcluded && !isProjectTag) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
        });
    });

    Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tag, count]) => {
            console.log(`  ${tag.padEnd(30)} ${count}`);
        });
}

async function showProjectContacts(projectQuery) {
    const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
    const project = PROJECTS[projectId] ||
        Object.values(PROJECTS).find(p =>
            p.name.toLowerCase().includes(projectQuery.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(projectQuery.toLowerCase()))
        );

    if (!project) {
        console.log(`\nProject "${projectQuery}" not found.`);
        console.log('\nAvailable projects:');
        Object.values(PROJECTS).forEach(p => console.log(`  - ${p.name}`));
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Contacts for: ${project.name}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date');

    const projectContacts = [];

    for (const contact of contacts || []) {
        const contactTags = (contact.tags || []).map(t => t.toLowerCase());
        const hasProjectTag = project.tags.some(pt => contactTags.includes(pt.toLowerCase()));

        if (hasProjectTag) {
            projectContacts.push(contact);
        }
    }

    if (projectContacts.length === 0) {
        console.log('No contacts tagged for this project.');
        return;
    }

    // Sort by last contact (most recent first)
    projectContacts.sort((a, b) => {
        if (!a.last_contact_date) return 1;
        if (!b.last_contact_date) return -1;
        return new Date(b.last_contact_date) - new Date(a.last_contact_date);
    });

    console.log('Name'.padEnd(28) + 'Last Contact'.padEnd(14) + 'Tags');
    console.log('─'.repeat(70));

    projectContacts.slice(0, 30).forEach(c => {
        const lastContact = c.last_contact_date
            ? new Date(c.last_contact_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
            : 'never';
        const tags = (c.tags || [])
            .filter(t => !project.tags.includes(t.toLowerCase()))
            .slice(0, 3)
            .join(', ');

        console.log(
            (c.full_name || c.email || 'Unknown').slice(0, 26).padEnd(28) +
            lastContact.padEnd(14) +
            tags.slice(0, 28)
        );
    });

    if (projectContacts.length > 30) {
        console.log(`\n... and ${projectContacts.length - 30} more`);
    }

    console.log('\n');
    console.log(`Total: ${projectContacts.length} contacts for ${project.name}`);
}

async function showContactProjects(emailOrName) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Projects for: ${emailOrName}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags')
        .or(`email.ilike.%${emailOrName}%,full_name.ilike.%${emailOrName}%`)
        .limit(5);

    if (!contacts || contacts.length === 0) {
        console.log('Contact not found.');
        return;
    }

    for (const contact of contacts) {
        console.log(`\n${contact.full_name || contact.email}`);
        console.log('─'.repeat(40));

        const contactTags = (contact.tags || []).map(t => t.toLowerCase());
        const involvedProjects = [];

        for (const [projectId, project] of Object.entries(PROJECTS)) {
            const hasProjectTag = project.tags.some(pt => contactTags.includes(pt.toLowerCase()));
            if (hasProjectTag) {
                involvedProjects.push(project);
            }
        }

        if (involvedProjects.length === 0) {
            console.log('  No project associations found');
        } else {
            involvedProjects.forEach(p => {
                console.log(`  ✓ ${p.name} - ${p.description}`);
            });
        }

        // Show other tags
        const otherTags = (contact.tags || []).filter(t =>
            !EXCLUDE_TAGS.includes(t.toLowerCase()) &&
            !Object.values(PROJECTS).some(p => p.tags.map(pt => pt.toLowerCase()).includes(t.toLowerCase()))
        );

        if (otherTags.length > 0) {
            console.log(`\n  Other tags: ${otherTags.join(', ')}`);
        }
    }
}

async function suggestContacts(projectQuery) {
    const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
    const project = PROJECTS[projectId] ||
        Object.values(PROJECTS).find(p =>
            p.name.toLowerCase().includes(projectQuery.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(projectQuery.toLowerCase()))
        );

    if (!project) {
        console.log(`\nProject "${projectQuery}" not found.`);
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Suggested Outreach for: ${project.name}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date');

    const projectContacts = [];

    for (const contact of contacts || []) {
        const contactTags = (contact.tags || []).map(t => t.toLowerCase());
        const hasProjectTag = project.tags.some(pt => contactTags.includes(pt.toLowerCase()));

        if (hasProjectTag) {
            // Calculate priority score
            let score = 0;
            if (contactTags.includes('partner')) score += 30;
            if (contactTags.includes('funder')) score += 25;
            if (contactTags.includes('responsive')) score += 20;
            if (contactTags.includes('ai-flagged')) score += 15;
            if (contactTags.includes('needs-attention')) score += 10;

            // Recency bonus
            if (contact.last_contact_date) {
                const daysSince = Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSince < 30) score += 15;
                else if (daysSince < 60) score += 10;
                else if (daysSince > 90) score -= 10; // Penalty for dormant
            } else {
                score -= 20; // Penalty for no contact history
            }

            projectContacts.push({ ...contact, score });
        }
    }

    // Sort by score
    projectContacts.sort((a, b) => b.score - a.score);

    // Group into tiers
    const tiers = {
        'REACH OUT NOW': projectContacts.filter(c => c.score >= 40),
        'CONSIDER CONTACTING': projectContacts.filter(c => c.score >= 20 && c.score < 40),
        'LOWER PRIORITY': projectContacts.filter(c => c.score < 20)
    };

    for (const [tierName, tierContacts] of Object.entries(tiers)) {
        if (tierContacts.length === 0) continue;

        const emoji = tierName === 'REACH OUT NOW' ? '🔥' :
                      tierName === 'CONSIDER CONTACTING' ? '👋' : '📋';

        console.log(`${emoji} ${tierName} (${tierContacts.length})`);
        console.log('─'.repeat(50));

        tierContacts.slice(0, 10).forEach(c => {
            const daysSince = c.last_contact_date
                ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            const recency = daysSince !== null ? `${daysSince}d ago` : 'never';
            const keyTags = (c.tags || [])
                .filter(t => ['partner', 'funder', 'responsive'].includes(t.toLowerCase()))
                .join(', ');

            console.log(
                `  ${(c.full_name || c.email).slice(0, 25).padEnd(27)} ` +
                `${recency.padEnd(12)} ${keyTags}`
            );
        });

        if (tierContacts.length > 10) {
            console.log(`  ... and ${tierContacts.length - 10} more`);
        }
        console.log('');
    }

    // Suggestions
    console.log('💡 SUGGESTED MESSAGE THEMES');
    console.log('─'.repeat(50));
    console.log(`  • "${project.name} update" - Share recent progress`);
    console.log(`  • "Your input on ${project.name}" - Seek feedback`);
    console.log(`  • "${project.name} opportunity" - Invite involvement`);
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'projects';
const arg = process.argv[3];

switch (command) {
    case 'projects':
        await listProjects();
        break;
    case 'contacts':
        if (!arg) {
            console.log('Usage: node scripts/project-contact-mapper.mjs contacts <project>');
            console.log('\nProjects:', Object.values(PROJECTS).map(p => p.name).join(', '));
        } else {
            await showProjectContacts(arg);
        }
        break;
    case 'involved':
        if (!arg) {
            console.log('Usage: node scripts/project-contact-mapper.mjs involved <email-or-name>');
        } else {
            await showContactProjects(arg);
        }
        break;
    case 'suggest':
        if (!arg) {
            console.log('Usage: node scripts/project-contact-mapper.mjs suggest <project>');
            console.log('\nProjects:', Object.values(PROJECTS).map(p => p.name).join(', '));
        } else {
            await suggestContacts(arg);
        }
        break;
    default:
        console.log('Usage: node scripts/project-contact-mapper.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  projects         - List all projects with contact counts');
        console.log('  contacts <proj>  - Show contacts for a specific project');
        console.log('  involved <email> - Show projects a contact is involved in');
        console.log('  suggest <proj>   - Suggest contacts for outreach about a project');
}
