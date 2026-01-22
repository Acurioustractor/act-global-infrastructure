#!/usr/bin/env node
/**
 * Analyze ACT Projects
 * Shows project knowledge, contacts, and coverage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(MAIN_URL, MAIN_KEY);

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ACT Projects Analysis');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all projects
    const { data: projects } = await supabase
        .from('notion_projects')
        .select('id, name, status, description')
        .order('name');

    console.log(`Total Projects: ${projects?.length || 0}\n`);

    // Get knowledge chunks
    const { data: chunks } = await supabase
        .from('knowledge_chunks')
        .select('source_type, project_id, content');

    const byType = {};
    const byProject = {};
    (chunks || []).forEach(k => {
        byType[k.source_type] = (byType[k.source_type] || 0) + 1;
        if (k.project_id) {
            if (!byProject[k.project_id]) byProject[k.project_id] = [];
            byProject[k.project_id].push(k);
        }
    });

    console.log('Knowledge by Source Type:');
    console.log('─'.repeat(40));
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`  ${type.padEnd(25)} ${count}`);
    });

    console.log('\nProjects with Knowledge Chunks:');
    console.log('─'.repeat(40));
    if (Object.keys(byProject).length === 0) {
        console.log('  (none - knowledge not linked to projects yet)');
    } else {
        Object.entries(byProject).forEach(([proj, chunks]) => {
            console.log(`  ${proj}: ${chunks.length} chunks`);
        });
    }

    // Get GHL contact tags
    const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags');

    const projectTags = {};
    const projectPatterns = [
        'justicehub', 'diagrama', 'goods', 'harvest', 'empathy',
        'fishers', 'contained', 'bimberi', 'picc', 'aime',
        'smart', 'tomnet', 'shed', 'confessional', 'indigenous'
    ];

    (contacts || []).forEach(c => {
        (c.tags || []).forEach(tag => {
            const lower = tag.toLowerCase();
            if (projectPatterns.some(p => lower.includes(p))) {
                if (!projectTags[tag]) projectTags[tag] = [];
                projectTags[tag].push(c);
            }
        });
    });

    console.log('\nProject-Related Contact Tags:');
    console.log('─'.repeat(40));
    Object.entries(projectTags)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([tag, contacts]) => {
            console.log(`  ${tag.padEnd(25)} ${contacts.length} contacts`);
        });

    // Map projects to potential contacts
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Project-Contact Mapping Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const projectContactMap = {
        'JusticeHub': projectTags['justicehub'] || [],
        'Diagrama': projectTags['diagrama'] || [],
        'Goods': projectTags['goods'] || [],
        'Empathy Ledger': projectTags['empathy-ledger'] || [],
        'Fishers Oysters': projectTags['fishers-oysters'] || [],
        'Indigenous Initiatives': projectTags['indigenous'] || []
    };

    Object.entries(projectContactMap).forEach(([project, contacts]) => {
        if (contacts.length > 0) {
            console.log(`${project}: ${contacts.length} contacts`);
            contacts.slice(0, 3).forEach(c => {
                console.log(`  - ${c.full_name}`);
            });
            if (contacts.length > 3) {
                console.log(`  ... and ${contacts.length - 3} more`);
            }
            console.log('');
        }
    });

    // Projects needing attention (no contacts, no knowledge)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Projects Needing Setup');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const activeProjects = (projects || []).filter(p =>
        !p.name.includes('Test') &&
        !p.name.includes('Overview') &&
        !p.name.includes('Audit')
    );

    console.log(`Active projects: ${activeProjects.length}`);
    console.log(`With knowledge: ${Object.keys(byProject).length}`);
    console.log(`With contact tags: ${Object.keys(projectContactMap).filter(k => projectContactMap[k].length > 0).length}`);
    console.log('');
    console.log('High-priority projects to set up:');

    const priorityProjects = [
        'JusticeHub', 'Diagrama', 'Empathy Ledger', 'Goods',
        'The Harvest', 'Contained', 'AIME', 'Fishers Oysters'
    ];

    priorityProjects.forEach(name => {
        const proj = activeProjects.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
        if (proj) {
            const hasContacts = Object.values(projectTags).some(tags =>
                tags.some(t => proj.name.toLowerCase().includes(t.toLowerCase?.() || ''))
            );
            console.log(`  - ${proj.name}`);
        }
    });
}

main();
