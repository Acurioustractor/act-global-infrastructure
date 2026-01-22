#!/usr/bin/env node
/**
 * List all Notion projects from Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(MAIN_URL, MAIN_KEY);

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Notion Projects Review');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: projects, error } = await supabase
        .from('notion_projects')
        .select('id, name, status, description')
        .order('name');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Total Projects: ${projects?.length || 0}\n`);

    // Group by status
    const byStatus = {};
    (projects || []).forEach(p => {
        const status = p.status || 'Unknown';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(p);
    });

    // Show by status
    const statusOrder = ['Active', 'In Progress', 'Planning', 'On Hold', 'Completed', 'Unknown'];

    for (const status of statusOrder) {
        const projs = byStatus[status];
        if (!projs || projs.length === 0) continue;

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`  ${status.toUpperCase()} (${projs.length})`);
        console.log('─'.repeat(60));

        projs.forEach(p => {
            const desc = p.description ? ` - ${p.description.slice(0, 45)}...` : '';
            console.log(`  • ${p.name}${desc}`);
        });
    }

    // Show any other statuses
    const otherStatuses = Object.keys(byStatus).filter(s => !statusOrder.includes(s));
    for (const status of otherStatuses) {
        const projs = byStatus[status];
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`  ${status.toUpperCase()} (${projs.length})`);
        console.log('─'.repeat(60));
        projs.forEach(p => {
            console.log(`  • ${p.name}`);
        });
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    Object.entries(byStatus)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([status, projs]) => {
            console.log(`  ${status.padEnd(20)} ${projs.length}`);
        });
}

main();
