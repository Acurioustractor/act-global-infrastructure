#!/usr/bin/env node
/**
 * Project Updates Tracker
 *
 * Captures project updates and milestones in Supabase.
 * These can be synced to Notion when ready.
 *
 * Usage:
 *   node scripts/project-updates.mjs add <project> "Update message"
 *   node scripts/project-updates.mjs list [project]
 *   node scripts/project-updates.mjs recent
 *   node scripts/project-updates.mjs setup  # Create table if needed
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

// Project ID mapping
const PROJECTS = {
    'justicehub': 'JusticeHub',
    'diagrama': 'Diagrama',
    'goods': 'Goods',
    'empathy-ledger': 'Empathy Ledger',
    'empathy': 'Empathy Ledger',
    'picc': 'PICC',
    'harvest': 'The Harvest',
    'contained': 'Contained',
    'fishers': 'Fishers Oysters',
    'smart': 'SMART',
    'confessional': 'The Confessional',
    'gold-phone': 'Gold Phone',
    'act-monthly': 'ACT Monthly Dinners',
    'mingaminga': 'MingaMinga Rangers',
    'qfcc': 'QFCC Empathy Ledger',
    'bcv': 'Black Cockatoo Valley',
    'bimberi': 'Bimberi',
    'maningrida': 'Maningrida'
};

// ============================================================================
// TABLE SETUP
// ============================================================================

async function setupTable() {
    console.log('Creating project_updates table...\n');

    const { error } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS project_updates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id TEXT NOT NULL,
                project_name TEXT NOT NULL,
                update_type TEXT DEFAULT 'update',
                content TEXT NOT NULL,
                author TEXT DEFAULT 'ben',
                tags TEXT[] DEFAULT '{}',
                notion_synced BOOLEAN DEFAULT FALSE,
                notion_page_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
            CREATE INDEX IF NOT EXISTS idx_project_updates_created ON project_updates(created_at DESC);
        `
    });

    if (error) {
        // Table might already exist, try a simple insert test
        const { error: testError } = await supabase
            .from('project_updates')
            .select('id')
            .limit(1);

        if (testError) {
            console.log('Table does not exist. Creating via migration...');
            console.log('\nRun this SQL in Supabase:');
            console.log(`
CREATE TABLE IF NOT EXISTS project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    update_type TEXT DEFAULT 'update',
    content TEXT NOT NULL,
    author TEXT DEFAULT 'ben',
    tags TEXT[] DEFAULT '{}',
    notion_synced BOOLEAN DEFAULT FALSE,
    notion_page_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created ON project_updates(created_at DESC);
            `);
        } else {
            console.log('Table already exists.');
        }
    } else {
        console.log('Table created successfully.');
    }
}

// ============================================================================
// ADD UPDATE
// ============================================================================

async function addUpdate(projectQuery, content, options = {}) {
    const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
    const projectName = PROJECTS[projectId] ||
        Object.values(PROJECTS).find(name =>
            name.toLowerCase().includes(projectQuery.toLowerCase())
        ) || projectQuery;

    const update = {
        project_id: projectId,
        project_name: projectName,
        update_type: options.type || 'update',
        content: content,
        author: options.author || 'ben',
        tags: options.tags || []
    };

    const { data, error } = await supabase
        .from('project_updates')
        .insert(update)
        .select()
        .single();

    if (error) {
        if (error.code === '42P01') {
            console.log('Table does not exist. Run: node scripts/project-updates.mjs setup');
            return null;
        }
        console.error('Error adding update:', error.message);
        return null;
    }

    console.log(`\n✅ Update added to ${projectName}`);
    console.log(`   "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`);
    console.log(`   ID: ${data.id}`);

    return data;
}

// ============================================================================
// LIST UPDATES
// ============================================================================

async function listUpdates(projectQuery) {
    let query = supabase
        .from('project_updates')
        .select('*')
        .order('created_at', { ascending: false });

    if (projectQuery) {
        const projectId = projectQuery.toLowerCase().replace(/\s+/g, '-');
        query = query.eq('project_id', projectId);
    }

    const { data: updates, error } = await query.limit(50);

    if (error) {
        if (error.code === '42P01') {
            console.log('Table does not exist. Run: node scripts/project-updates.mjs setup');
            return;
        }
        console.error('Error listing updates:', error.message);
        return;
    }

    if (!updates || updates.length === 0) {
        console.log('\nNo updates found.');
        return;
    }

    const title = projectQuery
        ? `Updates for ${PROJECTS[projectQuery.toLowerCase()] || projectQuery}`
        : 'All Project Updates';

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ${title}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group by project if showing all
    if (!projectQuery) {
        const byProject = {};
        updates.forEach(u => {
            if (!byProject[u.project_name]) byProject[u.project_name] = [];
            byProject[u.project_name].push(u);
        });

        Object.entries(byProject).forEach(([project, projectUpdates]) => {
            console.log(`📋 ${project} (${projectUpdates.length})`);
            console.log('─'.repeat(50));

            projectUpdates.slice(0, 5).forEach(u => {
                const date = new Date(u.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short'
                });
                const synced = u.notion_synced ? '✓' : '';
                console.log(`  ${date} ${synced} ${u.content.slice(0, 50)}${u.content.length > 50 ? '...' : ''}`);
            });

            if (projectUpdates.length > 5) {
                console.log(`  ... and ${projectUpdates.length - 5} more`);
            }
            console.log('');
        });
    } else {
        updates.forEach(u => {
            const date = new Date(u.created_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const type = u.update_type !== 'update' ? `[${u.update_type}]` : '';
            const synced = u.notion_synced ? '✓ Notion' : '';

            console.log(`${date} ${type}`);
            console.log(`  ${u.content}`);
            if (u.tags?.length > 0) {
                console.log(`  Tags: ${u.tags.join(', ')}`);
            }
            if (synced) {
                console.log(`  ${synced}`);
            }
            console.log('');
        });
    }

    console.log(`Total: ${updates.length} updates`);
}

// ============================================================================
// RECENT UPDATES
// ============================================================================

async function showRecent() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updates, error } = await supabase
        .from('project_updates')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code === '42P01') {
            console.log('Table does not exist. Run: node scripts/project-updates.mjs setup');
            return;
        }
        console.error('Error:', error.message);
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Recent Updates (Last 7 Days)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (!updates || updates.length === 0) {
        console.log('No updates in the last 7 days.');
        console.log('\nAdd an update:');
        console.log('  node scripts/project-updates.mjs add justicehub "Met with QFCC team"');
        return;
    }

    updates.forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        console.log(`${date} | ${u.project_name}`);
        console.log(`  ${u.content}`);
        console.log('');
    });

    console.log(`Total: ${updates.length} updates this week`);
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4).join(' ');

switch (command) {
    case 'setup':
        await setupTable();
        break;

    case 'add':
        if (!arg1 || !arg2) {
            console.log('Usage: node scripts/project-updates.mjs add <project> "Update message"');
            console.log('\nProjects:', Object.keys(PROJECTS).join(', '));
        } else {
            await addUpdate(arg1, arg2);
        }
        break;

    case 'list':
        await listUpdates(arg1);
        break;

    case 'recent':
        await showRecent();
        break;

    default:
        console.log('Project Updates Tracker');
        console.log('');
        console.log('Commands:');
        console.log('  add <project> "message"  - Add a project update');
        console.log('  list [project]           - List updates (all or by project)');
        console.log('  recent                   - Show recent updates (7 days)');
        console.log('  setup                    - Create database table');
        console.log('');
        console.log('Projects:', Object.keys(PROJECTS).slice(0, 10).join(', '), '...');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/project-updates.mjs add justicehub "Met with QFCC about CoE"');
        console.log('  node scripts/project-updates.mjs add goods "New maker partnership signed"');
        console.log('  node scripts/project-updates.mjs list justicehub');
}
