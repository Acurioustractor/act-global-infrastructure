#!/usr/bin/env node
/**
 * ACT Studio Project Bot
 *
 * A comprehensive project intelligence assistant that:
 * - Understands all ACT projects deeply
 * - Answers questions from knowledge, emails, GHL, and other sources
 * - Suggests updates and notifies when project-related contacts reach out
 * - Supports specific project tasks and workflows
 *
 * Usage:
 *   node scripts/act-studio-bot.mjs [command]
 *
 * Commands:
 *   projects          - List all projects with status
 *   project <name>    - Deep dive on a specific project
 *   contacts <name>   - Show contacts for a project
 *   activity <name>   - Show recent activity for a project
 *   notify            - Check for project-related notifications
 *   suggest <name>    - Get suggested actions for a project
 *   search <query>    - Search across all project knowledge
 *   brief             - Daily project brief
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// ============================================================================
// PROJECT DEFINITIONS - Full project list from Notion (78 projects)
// ============================================================================

const PROJECTS = {
    // === HIGH PRIORITY - ACTIVE ===
    'justicehub': {
        name: 'JusticeHub',
        notion_names: ['JusticeHub', 'Justice Hub Network', 'JusticeHub - Centre of Excellence'],
        description: 'Youth justice reform network - connecting advocates, research, and action',
        tags: ['justicehub', 'justice', 'youth justice', 'youth-justice', 'yj'],
        keywords: ['justice', 'youth', 'reform', 'incarceration', 'detention', 'advocacy'],
        status: 'active',
        priority: 'high',
        leads: ['Ben Knight', 'Nic Marchesi'],
        category: 'justice'
    },
    'diagrama': {
        name: 'Diagrama',
        notion_names: ['Diagrama'],
        description: 'Alternative education and rehabilitation programs',
        tags: ['diagrama'],
        keywords: ['diagrama', 'education', 'rehabilitation', 'youth'],
        status: 'active',
        priority: 'high',
        leads: ['Tina Morris', 'Kristy Bloomfield'],
        category: 'justice'
    },
    'goods': {
        name: 'Goods',
        notion_names: ['Goods.'],
        description: 'Social enterprise marketplace connecting makers with markets',
        tags: ['goods'],
        keywords: ['goods', 'products', 'manufacturing', 'social enterprise', 'marketplace'],
        status: 'active',
        priority: 'high',
        leads: ['Maddi Alderuccio'],
        category: 'enterprise'
    },
    'empathy-ledger': {
        name: 'Empathy Ledger',
        notion_names: ['Empathy Ledger', 'Empathy Ledger Platform'],
        description: 'Story collection platform - preserving community narratives',
        tags: ['empathy-ledger', 'empathy', 'storytelling'],
        keywords: ['empathy', 'stories', 'storytelling', 'narrative', 'oral history'],
        status: 'active',
        priority: 'high',
        leads: ['Ben Knight'],
        category: 'stories'
    },

    // === INDIGENOUS INITIATIVES - HIGH PRIORITY ===
    'picc': {
        name: 'PICC',
        notion_names: ['PICC - Storm Stories', 'PICC Annual Report', 'PICC Centre Precinct', "PICC Elders' trip to Hull River", 'PICC Photo Kiosk'],
        description: 'Palm Island Community Company - cultural preservation and community projects',
        tags: ['picc', 'palm-island'],
        keywords: ['palm island', 'picc', 'indigenous', 'community', 'elders'],
        status: 'active',
        priority: 'high',
        category: 'indigenous'
    },
    'mingaminga': {
        name: 'MingaMinga Rangers',
        notion_names: ['MingaMinga Rangers'],
        description: 'Indigenous ranger program',
        tags: ['mingaminga', 'rangers'],
        keywords: ['rangers', 'indigenous', 'land management', 'environment'],
        status: 'active',
        priority: 'high',
        category: 'indigenous'
    },
    'uncle-allan': {
        name: 'Uncle Allan Palm Island Art',
        notion_names: ['Uncle Allan Palm Island Art'],
        description: 'Indigenous art project with Uncle Allan',
        tags: ['uncle-allan', 'palm-island-art'],
        keywords: ['art', 'indigenous', 'palm island', 'cultural'],
        status: 'active',
        priority: 'high',
        category: 'indigenous'
    },
    'maningrida': {
        name: 'Maningrida Justice Reinvestment',
        notion_names: ['Maningrida - Justice Reinvestment'],
        description: 'Justice reinvestment initiative in Maningrida',
        tags: ['maningrida'],
        keywords: ['justice', 'reinvestment', 'indigenous', 'maningrida'],
        status: 'active',
        priority: 'high',
        category: 'justice'
    },
    'first-nations-youth': {
        name: 'First Nations Youth Advocacy',
        notion_names: ['First Nations Youth Advocacy'],
        description: 'Advocacy for First Nations young people',
        tags: ['first-nations', 'youth-advocacy'],
        keywords: ['indigenous', 'youth', 'advocacy', 'first nations'],
        status: 'active',
        priority: 'high',
        category: 'justice'
    },
    'deadly-homes': {
        name: 'Deadly Homes and Gardens',
        notion_names: ['Deadly Homes and Gardens'],
        description: 'Indigenous housing and community gardens project',
        tags: ['deadly-homes'],
        keywords: ['indigenous', 'housing', 'gardens', 'community'],
        status: 'active',
        priority: 'medium',
        category: 'indigenous'
    },

    // === MEDIUM PRIORITY - ACTIVE ===
    'harvest': {
        name: 'The Harvest',
        notion_names: ['Witta Harvest HQ'],
        description: 'Food systems and regenerative agriculture',
        tags: ['harvest', 'the-harvest', 'witta'],
        keywords: ['harvest', 'food', 'agriculture', 'regenerative', 'farm'],
        status: 'active',
        priority: 'medium',
        category: 'regenerative'
    },
    'contained': {
        name: 'Contained',
        notion_names: ['Contained'],
        description: 'Container-based community spaces',
        tags: ['contained'],
        keywords: ['contained', 'container', 'space', 'community'],
        status: 'active',
        priority: 'medium',
        category: 'enterprise'
    },
    'fishers-oysters': {
        name: 'Fishers Oysters',
        notion_names: ['Fishers Oysters'],
        description: 'Sustainable oyster farming and community',
        tags: ['fishers-oysters', 'fishers'],
        keywords: ['oysters', 'aquaculture', 'fishing', 'sustainable'],
        status: 'active',
        priority: 'medium',
        leads: ['Shaun Fisher'],
        category: 'regenerative'
    },
    'aime': {
        name: 'AIME',
        notion_names: ['AIME'],
        description: 'AIME mentoring partnership',
        tags: ['aime'],
        keywords: ['aime', 'mentoring', 'indigenous', 'education'],
        status: 'active',
        priority: 'medium',
        category: 'indigenous'
    },
    'smart': {
        name: 'SMART',
        notion_names: ['SMART Connect', 'SMART Recovery', 'SMART HCP GP Uplift Project'],
        description: 'SMART health and recovery initiatives',
        tags: ['smart', 'smart-connect'],
        keywords: ['smart', 'recovery', 'health', 'wellbeing', 'gp', 'hcp'],
        status: 'active',
        priority: 'medium',
        category: 'health'
    },
    'bimberi': {
        name: 'Bimberi',
        notion_names: ['Bimberi - Holiday Programs'],
        description: 'Youth detention holiday programs',
        tags: ['bimberi'],
        keywords: ['bimberi', 'youth', 'detention', 'programs'],
        status: 'active',
        priority: 'medium',
        category: 'justice'
    },
    'mmeic': {
        name: 'MMEIC Justice',
        notion_names: ['MMEIC - Justice Projects'],
        description: 'MMEIC Justice initiatives',
        tags: ['mmeic'],
        keywords: ['mmeic', 'justice', 'indigenous'],
        status: 'active',
        priority: 'medium',
        category: 'justice'
    },
    'confessional': {
        name: 'The Confessional',
        notion_names: ['The Confessional'],
        description: 'Story booth and intimate storytelling',
        tags: ['confessional'],
        keywords: ['confessional', 'stories', 'booth', 'recording'],
        status: 'active',
        priority: 'medium',
        category: 'stories'
    },
    'gold-phone': {
        name: 'Gold Phone',
        notion_names: ['Gold.Phone'],
        description: 'Gold Phone community connection project',
        tags: ['gold-phone', 'goldphone'],
        keywords: ['phone', 'connection', 'community', 'gold'],
        status: 'active',
        priority: 'medium',
        category: 'stories'
    },
    'act-monthly': {
        name: 'ACT Monthly Dinners',
        notion_names: ['ACT Monthly Dinners'],
        description: 'Monthly community gathering events',
        tags: ['act-monthly', 'dinners'],
        keywords: ['dinner', 'event', 'gathering', 'monthly', 'community'],
        status: 'active',
        priority: 'medium',
        category: 'community'
    },
    'junes-patch': {
        name: "June's Patch",
        notion_names: ["June's Patch"],
        description: 'Community garden project',
        tags: ['junes-patch', 'patch'],
        keywords: ['garden', 'community', 'june', 'regenerative'],
        status: 'active',
        priority: 'medium',
        category: 'regenerative'
    },
    'bg-fit': {
        name: 'BG Fit',
        notion_names: ['BG Fit'],
        description: 'Fitness and wellbeing program',
        tags: ['bg-fit', 'bgfit'],
        keywords: ['fitness', 'health', 'wellbeing', 'exercise'],
        status: 'active',
        priority: 'medium',
        category: 'health'
    },
    'bcv': {
        name: 'Black Cockatoo Valley',
        notion_names: ['BCV Reforest', 'BCV: Regenerative Conservation'],
        description: 'Regenerative conservation and reforestation',
        tags: ['bcv', 'black-cockatoo'],
        keywords: ['conservation', 'regenerative', 'reforestation', 'environment'],
        status: 'active',
        priority: 'medium',
        category: 'regenerative'
    },

    // === ENTERPRISE & FUNDING ===
    'sefa': {
        name: 'SEFA Partnership',
        notion_names: ['SEFA Partnership'],
        description: 'Social Enterprise Finance Australia partnership',
        tags: ['sefa'],
        keywords: ['sefa', 'finance', 'social enterprise', 'funding'],
        status: 'active',
        priority: 'medium',
        category: 'funding'
    },
    'custodian-economy': {
        name: 'Custodian Economy',
        notion_names: ['Custodian Economy'],
        description: 'Economic model for custodianship',
        tags: ['custodian-economy'],
        keywords: ['economy', 'custodian', 'economic', 'model'],
        status: 'active',
        priority: 'medium',
        category: 'enterprise'
    },
    'dgr': {
        name: 'DGR Application',
        notion_names: ['DGR Community category application'],
        description: 'Deductible Gift Recipient application',
        tags: ['dgr'],
        keywords: ['dgr', 'tax', 'deductible', 'charity'],
        status: 'active',
        priority: 'medium',
        category: 'funding'
    },

    // === ARTS & CULTURE ===
    'art-social-change': {
        name: 'Art for Social Change',
        notion_names: ['Art for Social Change'],
        description: 'Art initiatives for social impact',
        tags: ['art-social-change'],
        keywords: ['art', 'social change', 'creative', 'impact'],
        status: 'active',
        priority: 'medium',
        category: 'arts'
    },
    'regional-arts': {
        name: 'Regional Arts Fellowship',
        notion_names: ['Regional Arts Fellowship'],
        description: 'Regional arts fellowship program',
        tags: ['regional-arts'],
        keywords: ['arts', 'regional', 'fellowship', 'creative'],
        status: 'active',
        priority: 'medium',
        category: 'arts'
    },
    'mounty-yarns': {
        name: 'Mounty Yarns',
        notion_names: ['Mounty Yarns'],
        description: 'Community yarn and storytelling',
        tags: ['mounty-yarns'],
        keywords: ['yarns', 'stories', 'community', 'mounty'],
        status: 'active',
        priority: 'medium',
        category: 'stories'
    },
    'tomnet': {
        name: 'TOMNET',
        notion_names: ['TOMNET'],
        description: 'TOMNET community network',
        tags: ['tomnet'],
        keywords: ['tomnet', 'network', 'community'],
        status: 'active',
        priority: 'medium',
        category: 'community'
    },

    // === EVENTS & RETREATS ===
    '10x10': {
        name: '10x10 Retreat',
        notion_names: ['10x10 Community Capital Leadership Retreat'],
        description: 'Leadership retreat for community capital',
        tags: ['10x10', 'retreat'],
        keywords: ['retreat', 'leadership', 'community', 'capital'],
        status: 'active',
        priority: 'medium',
        category: 'events'
    },
    'dadlab': {
        name: 'DadLab 25',
        notion_names: ['Dad.Lab.25'],
        description: 'Fatherhood and parenting program',
        tags: ['dadlab'],
        keywords: ['dad', 'father', 'parenting', 'men'],
        status: 'active',
        priority: 'medium',
        category: 'community'
    },
    'sxsw': {
        name: 'SXSW 2025',
        notion_names: ['SXSW 2025'],
        description: 'SXSW Sydney participation',
        tags: ['sxsw'],
        keywords: ['sxsw', 'conference', 'sydney', 'tech'],
        status: 'active',
        priority: 'medium',
        category: 'events'
    },
    'bali-retreat': {
        name: 'ACT Bali Retreat',
        notion_names: ['ACT stop, revive, thrive in Bali'],
        description: 'Team retreat in Bali',
        tags: ['bali-retreat'],
        keywords: ['bali', 'retreat', 'team', 'revive'],
        status: 'active',
        priority: 'low',
        category: 'events'
    },

    // === TECH & PLATFORM ===
    'the-shed': {
        name: 'The Shed',
        notion_names: ['The Shed'],
        description: 'Maker space and technology hub',
        tags: ['shed'],
        keywords: ['shed', 'maker', 'tech', 'hub'],
        status: 'active',
        priority: 'medium',
        category: 'tech'
    },
    'fairfax-place': {
        name: 'Fairfax PLACE',
        notion_names: ['Fairfax & PLACE tech'],
        description: 'Technology for Fairfax and PLACE',
        tags: ['fairfax', 'place-tech'],
        keywords: ['fairfax', 'place', 'tech', 'technology'],
        status: 'active',
        priority: 'medium',
        category: 'tech'
    },
    'cars-microcontrollers': {
        name: 'Cars & Microcontrollers',
        notion_names: ['Cars and microcontrollers'],
        description: 'Automotive and microcontroller projects',
        tags: ['cars', 'microcontrollers'],
        keywords: ['cars', 'microcontrollers', 'tech', 'automotive'],
        status: 'active',
        priority: 'low',
        category: 'tech'
    },

    // === OTHER ACTIVE ===
    'travelling-womens-car': {
        name: "Travelling Women's Car",
        notion_names: ["Travelling women's car | Cultural preservation"],
        description: 'Cultural preservation project for women',
        tags: ['travelling-womens-car'],
        keywords: ['women', 'cultural', 'preservation', 'travelling'],
        status: 'active',
        priority: 'medium',
        category: 'indigenous'
    },
    'project-herself': {
        name: 'Project Her-Self',
        notion_names: ['Project Her Self design'],
        description: 'Self-design program for women',
        tags: ['project-herself'],
        keywords: ['women', 'self', 'design', 'empowerment'],
        status: 'active',
        priority: 'medium',
        category: 'community'
    },
    'qfcc-empathy': {
        name: 'QFCC Empathy Ledger',
        notion_names: ['QFCC Empathy Ledger'],
        description: 'Empathy Ledger for Queensland Family & Child Commission',
        tags: ['qfcc'],
        keywords: ['qfcc', 'empathy', 'family', 'child', 'commission'],
        status: 'active',
        priority: 'high',
        category: 'stories'
    },
    'wilya-janta': {
        name: 'Wilya Janta Communications',
        notion_names: ['Wilya Janta Communications'],
        description: 'Indigenous communications project',
        tags: ['wilya-janta'],
        keywords: ['communications', 'indigenous', 'wilya', 'janta'],
        status: 'active',
        priority: 'medium',
        category: 'indigenous'
    },
    'yac': {
        name: 'YAC Story and Action',
        notion_names: ['YAC story and action'],
        description: 'Youth Advisory Council storytelling',
        tags: ['yac'],
        keywords: ['yac', 'youth', 'advisory', 'council', 'story'],
        status: 'active',
        priority: 'medium',
        category: 'justice'
    },
    'double-disadvantage': {
        name: 'Double Disadvantage',
        notion_names: ['The Double Disadvantage: Supporting Young People with Disabilities'],
        description: 'Supporting young people with disabilities in justice system',
        tags: ['double-disadvantage'],
        keywords: ['disability', 'youth', 'justice', 'support'],
        status: 'active',
        priority: 'high',
        category: 'justice'
    }
};

// Category colors for display
const CATEGORY_ICONS = {
    justice: '⚖️',
    indigenous: '🌏',
    stories: '📖',
    enterprise: '💼',
    regenerative: '🌱',
    health: '❤️',
    community: '👥',
    arts: '🎨',
    events: '📅',
    funding: '💰',
    tech: '💻'
};

// ============================================================================
// FUNCTIONS
// ============================================================================

async function listProjects() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Studio - All Projects');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get contact counts
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('tags');

    const tagCounts = {};
    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            tagCounts[tag.toLowerCase()] = (tagCounts[tag.toLowerCase()] || 0) + 1;
        });
    });

    // Group projects by category
    const byCategory = {};
    Object.values(PROJECTS).forEach(proj => {
        const cat = proj.category || 'other';
        if (!byCategory[cat]) byCategory[cat] = [];

        const contactCount = proj.tags.reduce((sum, tag) =>
            sum + (tagCounts[tag.toLowerCase()] || 0), 0
        );

        byCategory[cat].push({ ...proj, contactCount });
    });

    // Display by category
    const categoryOrder = ['justice', 'indigenous', 'stories', 'enterprise', 'regenerative', 'health', 'community', 'arts', 'events', 'funding', 'tech'];

    for (const cat of categoryOrder) {
        const projs = byCategory[cat];
        if (!projs || projs.length === 0) continue;

        const icon = CATEGORY_ICONS[cat] || '📋';
        console.log(`\n${icon} ${cat.toUpperCase()} (${projs.length})`);
        console.log('─'.repeat(55));

        projs
            .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .forEach(proj => {
                const priorityIcon = proj.priority === 'high' ? '🔥' : '';
                const contacts = proj.contactCount > 0 ? `(${proj.contactCount})` : '';
                console.log(`  ${priorityIcon} ${proj.name.padEnd(28)} ${contacts}`);
            });
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const highPriority = Object.values(PROJECTS).filter(p => p.priority === 'high');
    const withContacts = Object.values(PROJECTS).filter(p =>
        p.tags.some(t => tagCounts[t.toLowerCase()] > 0)
    );

    console.log(`  Total projects: ${Object.keys(PROJECTS).length}`);
    console.log(`  High priority: ${highPriority.length}`);
    console.log(`  With contacts: ${withContacts.length}`);
    console.log(`  Categories: ${categoryOrder.length}`);
}

async function showProject(projectQuery) {
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
    console.log(`  ${project.name}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Description: ${project.description}`);
    console.log(`Status: ${project.status}`);
    console.log(`Priority: ${project.priority}`);
    if (project.leads) {
        console.log(`Leads: ${project.leads.join(', ')}`);
    }
    console.log(`Tags: ${project.tags.join(', ')}`);
    console.log('');

    // Get contacts
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date');

    const projectContacts = (contacts || []).filter(c => {
        const contactTags = (c.tags || []).map(t => t.toLowerCase());
        return project.tags.some(pt => contactTags.includes(pt.toLowerCase()));
    });

    console.log(`Contacts: ${projectContacts.length}`);
    console.log('─'.repeat(50));

    // Group by role
    const partners = projectContacts.filter(c => c.tags?.includes('partner'));
    const funders = projectContacts.filter(c => c.tags?.includes('funder'));
    const responsive = projectContacts.filter(c => c.tags?.includes('responsive'));

    if (partners.length > 0) {
        console.log(`\n  Partners (${partners.length}):`);
        partners.slice(0, 5).forEach(c => console.log(`    - ${c.full_name}`));
    }
    if (funders.length > 0) {
        console.log(`\n  Funders (${funders.length}):`);
        funders.slice(0, 5).forEach(c => console.log(`    - ${c.full_name}`));
    }
    if (responsive.length > 0) {
        console.log(`\n  Responsive (${responsive.length}):`);
        responsive.slice(0, 5).forEach(c => console.log(`    - ${c.full_name}`));
    }

    // Recent activity
    console.log('\n');
    console.log('Recent Activity:');
    console.log('─'.repeat(50));

    const contactIds = projectContacts.map(c => c.ghl_id);
    const { data: recentComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, direction, occurred_at')
        .in('ghl_contact_id', contactIds.slice(0, 50))
        .order('occurred_at', { ascending: false })
        .limit(10);

    if (recentComms && recentComms.length > 0) {
        const contactMap = new Map(projectContacts.map(c => [c.ghl_id, c]));
        recentComms.forEach(comm => {
            const contact = contactMap.get(comm.ghl_contact_id);
            const date = new Date(comm.occurred_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
            const dir = comm.direction === 'inbound' ? '←' : '→';
            console.log(`  ${date} ${dir} ${contact?.full_name || 'Unknown'}: ${comm.subject?.slice(0, 40) || '(no subject)'}`);
        });
    } else {
        console.log('  No recent communications found');
    }
}

async function showProjectContacts(projectQuery) {
    const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
    const project = PROJECTS[projectId] ||
        Object.values(PROJECTS).find(p =>
            p.name.toLowerCase().includes(projectQuery.toLowerCase())
        );

    if (!project) {
        console.log(`\nProject "${projectQuery}" not found.`);
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ${project.name} - Contacts`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, tags, last_contact_date')
        .order('last_contact_date', { ascending: false, nullsFirst: false });

    const projectContacts = (contacts || []).filter(c => {
        const contactTags = (c.tags || []).map(t => t.toLowerCase());
        return project.tags.some(pt => contactTags.includes(pt.toLowerCase()));
    });

    console.log('Name'.padEnd(28) + 'Last Contact'.padEnd(14) + 'Role');
    console.log('─'.repeat(60));

    projectContacts.forEach(c => {
        const lastContact = c.last_contact_date
            ? new Date(c.last_contact_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
            : 'never';
        const roles = (c.tags || [])
            .filter(t => ['partner', 'funder', 'responsive', 'community'].includes(t.toLowerCase()))
            .join(', ');

        console.log(
            (c.full_name || c.email).slice(0, 26).padEnd(28) +
            lastContact.padEnd(14) +
            roles.slice(0, 18)
        );
    });

    console.log('\n');
    console.log(`Total: ${projectContacts.length} contacts`);
}

async function checkNotifications() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Studio - Project Notifications');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get recent inbound communications (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, occurred_at, direction')
        .eq('direction', 'inbound')
        .gte('occurred_at', sevenDaysAgo)
        .order('occurred_at', { ascending: false });

    // Get all contacts with tags
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags');

    const contactMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    // Match communications to projects
    const projectNotifications = {};

    for (const comm of recentComms || []) {
        const contact = contactMap.get(comm.ghl_contact_id);
        if (!contact) continue;

        const contactTags = (contact.tags || []).map(t => t.toLowerCase());

        for (const [projId, project] of Object.entries(PROJECTS)) {
            if (project.tags.some(pt => contactTags.includes(pt.toLowerCase()))) {
                if (!projectNotifications[projId]) {
                    projectNotifications[projId] = [];
                }
                projectNotifications[projId].push({
                    contact: contact.full_name,
                    subject: comm.subject,
                    date: comm.occurred_at
                });
            }
        }
    }

    // Display notifications by project
    let hasNotifications = false;

    for (const [projId, notifications] of Object.entries(projectNotifications)) {
        if (notifications.length > 0) {
            hasNotifications = true;
            const project = PROJECTS[projId];
            console.log(`📬 ${project.name} (${notifications.length} messages)`);
            console.log('─'.repeat(50));

            notifications.slice(0, 5).forEach(n => {
                const date = new Date(n.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
                console.log(`  ${date} - ${n.contact}: ${n.subject?.slice(0, 40) || '(no subject)'}`);
            });

            if (notifications.length > 5) {
                console.log(`  ... and ${notifications.length - 5} more`);
            }
            console.log('');
        }
    }

    if (!hasNotifications) {
        console.log('No project-related messages in the last 7 days.');
    }
}

async function suggestActions(projectQuery) {
    const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
    const project = PROJECTS[projectId] ||
        Object.values(PROJECTS).find(p =>
            p.name.toLowerCase().includes(projectQuery.toLowerCase())
        );

    if (!project) {
        console.log(`\nProject "${projectQuery}" not found.`);
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ${project.name} - Suggested Actions`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get project contacts
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags, last_contact_date');

    const projectContacts = (contacts || []).filter(c => {
        const contactTags = (c.tags || []).map(t => t.toLowerCase());
        return project.tags.some(pt => contactTags.includes(pt.toLowerCase()));
    });

    // Analyze contact health
    const now = Date.now();
    const dormantPartners = [];
    const needsFollowUp = [];
    const activeEngaged = [];

    projectContacts.forEach(c => {
        const isPartner = c.tags?.includes('partner') || c.tags?.includes('funder');
        const daysSince = c.last_contact_date
            ? Math.floor((now - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;

        if (isPartner && daysSince > 60) {
            dormantPartners.push({ ...c, daysSince });
        } else if (daysSince > 30 && daysSince < 90) {
            needsFollowUp.push({ ...c, daysSince });
        } else if (daysSince <= 30) {
            activeEngaged.push({ ...c, daysSince });
        }
    });

    // Generate suggestions
    console.log('📊 PROJECT HEALTH');
    console.log('─'.repeat(50));
    console.log(`  Total contacts: ${projectContacts.length}`);
    console.log(`  Active (30d): ${activeEngaged.length}`);
    console.log(`  Needs follow-up: ${needsFollowUp.length}`);
    console.log(`  Dormant partners: ${dormantPartners.length}`);
    console.log('');

    if (dormantPartners.length > 0) {
        console.log('🚨 RE-ENGAGE DORMANT PARTNERS');
        console.log('─'.repeat(50));
        dormantPartners.slice(0, 5).forEach(c => {
            console.log(`  ${c.full_name} - ${c.daysSince} days since contact`);
        });
        console.log('');
    }

    if (needsFollowUp.length > 0) {
        console.log('📬 FOLLOW UP');
        console.log('─'.repeat(50));
        needsFollowUp.slice(0, 5).forEach(c => {
            console.log(`  ${c.full_name} - ${c.daysSince} days`);
        });
        console.log('');
    }

    console.log('💡 SUGGESTED ACTIONS');
    console.log('─'.repeat(50));

    if (dormantPartners.length > 0) {
        console.log(`  1. Schedule calls with ${dormantPartners.slice(0, 3).map(c => c.full_name).join(', ')}`);
    }
    if (needsFollowUp.length > 0) {
        console.log(`  2. Send project update to ${needsFollowUp.length} contacts`);
    }
    console.log(`  3. Review Notion page for ${project.name} updates`);
    if (activeEngaged.length > 5) {
        console.log(`  4. Consider a project gathering with ${activeEngaged.length} active contacts`);
    }
}

async function showBrief() {
    const today = new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ACT Studio Daily Brief - ${today}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get recent activity across all projects
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, direction, occurred_at')
        .gte('occurred_at', sevenDaysAgo);

    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags, last_contact_date');

    const contactMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    // Count activity by project
    const projectActivity = {};
    for (const proj of Object.values(PROJECTS)) {
        projectActivity[proj.name] = { inbound: 0, outbound: 0, contacts: 0 };
    }

    for (const contact of contacts || []) {
        const contactTags = (contact.tags || []).map(t => t.toLowerCase());

        for (const [projId, proj] of Object.entries(PROJECTS)) {
            if (proj.tags.some(pt => contactTags.includes(pt.toLowerCase()))) {
                projectActivity[proj.name].contacts++;
            }
        }
    }

    for (const comm of recentComms || []) {
        const contact = contactMap.get(comm.ghl_contact_id);
        if (!contact) continue;

        const contactTags = (contact.tags || []).map(t => t.toLowerCase());

        for (const [projId, proj] of Object.entries(PROJECTS)) {
            if (proj.tags.some(pt => contactTags.includes(pt.toLowerCase()))) {
                if (comm.direction === 'inbound') {
                    projectActivity[proj.name].inbound++;
                } else {
                    projectActivity[proj.name].outbound++;
                }
            }
        }
    }

    console.log('PROJECT ACTIVITY (Last 7 Days)');
    console.log('─'.repeat(55));
    console.log('Project'.padEnd(22) + 'In'.padEnd(8) + 'Out'.padEnd(8) + 'Contacts');
    console.log('─'.repeat(55));

    Object.entries(projectActivity)
        .filter(([_, a]) => a.contacts > 0)
        .sort((a, b) => (b[1].inbound + b[1].outbound) - (a[1].inbound + a[1].outbound))
        .forEach(([name, activity]) => {
            const icon = activity.inbound > 0 ? '📬' : '📋';
            console.log(
                `${icon} ${name.padEnd(20)}`.padEnd(22) +
                activity.inbound.toString().padEnd(8) +
                activity.outbound.toString().padEnd(8) +
                activity.contacts.toString()
            );
        });

    console.log('');

    // Top priorities
    console.log('TOP PRIORITIES TODAY');
    console.log('─'.repeat(55));

    // Find projects with recent inbound activity
    const activeProjects = Object.entries(projectActivity)
        .filter(([_, a]) => a.inbound > 0)
        .sort((a, b) => b[1].inbound - a[1].inbound)
        .slice(0, 3);

    activeProjects.forEach(([name, activity], i) => {
        console.log(`  ${i + 1}. ${name} - ${activity.inbound} messages received`);
    });

    if (activeProjects.length === 0) {
        console.log('  No urgent project activity');
    }

    console.log('');
    console.log('Commands: project <name>, contacts <name>, suggest <name>, notify');
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'brief';
const arg = process.argv.slice(3).join(' ');

switch (command) {
    case 'projects':
        await listProjects();
        break;
    case 'project':
        if (!arg) {
            console.log('Usage: node scripts/act-studio-bot.mjs project <name>');
            console.log('\nProjects:', Object.values(PROJECTS).map(p => p.name).join(', '));
        } else {
            await showProject(arg);
        }
        break;
    case 'contacts':
        if (!arg) {
            console.log('Usage: node scripts/act-studio-bot.mjs contacts <project>');
        } else {
            await showProjectContacts(arg);
        }
        break;
    case 'notify':
    case 'notifications':
        await checkNotifications();
        break;
    case 'suggest':
        if (!arg) {
            console.log('Usage: node scripts/act-studio-bot.mjs suggest <project>');
        } else {
            await suggestActions(arg);
        }
        break;
    case 'brief':
        await showBrief();
        break;
    default:
        console.log('ACT Studio Project Bot');
        console.log('');
        console.log('Commands:');
        console.log('  projects          - List all projects with status');
        console.log('  project <name>    - Deep dive on a specific project');
        console.log('  contacts <name>   - Show contacts for a project');
        console.log('  notify            - Check for project-related notifications');
        console.log('  suggest <name>    - Get suggested actions for a project');
        console.log('  brief             - Daily project brief');
}
