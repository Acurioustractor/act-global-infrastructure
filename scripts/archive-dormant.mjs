#!/usr/bin/env node
/**
 * Archive Dormant Projects
 *
 * Identifies and optionally archives projects with no activity
 * for 60+ days. Supports both interactive and automatic modes.
 *
 * Dormancy criteria:
 * - No contact activity in 60+ days
 * - No voice notes in 60+ days
 * - No project updates in 60+ days
 *
 * Usage:
 *   node scripts/archive-dormant.mjs              # List dormant projects
 *   node scripts/archive-dormant.mjs --preview    # Preview what would be archived
 *   node scripts/archive-dormant.mjs --archive    # Archive all dormant projects
 *   node scripts/archive-dormant.mjs --archive <code>  # Archive specific project
 *   node scripts/archive-dormant.mjs --revive <code>   # Revive archived project
 *   node scripts/archive-dormant.mjs --threshold 90    # Custom threshold (days)
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes');
}

const DEFAULT_THRESHOLD = 60; // days

// ============================================================================
// DORMANCY DETECTION
// ============================================================================

async function getProjectActivity(projectCode, project) {
  const activity = {
    code: projectCode,
    name: project.name,
    category: project.category,
    priority: project.priority,
    lastContactActivity: null,
    lastVoiceNote: null,
    lastUpdate: null,
    contactCount: 0,
    daysSinceActivity: null
  };

  if (!supabase) return activity;

  const projectTags = (project.ghl_tags || []).map(t => t.toLowerCase());
  const codePattern = projectCode.toLowerCase().replace('act-', '');

  // 1. Check contact activity
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, last_contact_date')
    .overlaps('tags', project.ghl_tags || []);

  activity.contactCount = contacts?.length || 0;

  if (contacts && contacts.length > 0) {
    const lastContact = contacts
      .filter(c => c.last_contact_date)
      .sort((a, b) => new Date(b.last_contact_date) - new Date(a.last_contact_date))[0];

    if (lastContact) {
      activity.lastContactActivity = lastContact.last_contact_date;
    }
  }

  // 2. Check voice notes
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('recorded_at')
    .or(`project_context.ilike.%${codePattern}%`)
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (voiceNotes && voiceNotes.length > 0) {
    activity.lastVoiceNote = voiceNotes[0].recorded_at;
  }

  // 3. Check project updates
  const { data: updates } = await supabase
    .from('project_updates')
    .select('created_at')
    .eq('project_id', codePattern)
    .order('created_at', { ascending: false })
    .limit(1);

  if (updates && updates.length > 0) {
    activity.lastUpdate = updates[0].created_at;
  }

  // Calculate most recent activity
  const dates = [
    activity.lastContactActivity,
    activity.lastVoiceNote,
    activity.lastUpdate
  ].filter(Boolean).map(d => new Date(d));

  if (dates.length > 0) {
    const mostRecent = new Date(Math.max(...dates));
    activity.daysSinceActivity = Math.floor(
      (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return activity;
}

async function findDormantProjects(threshold = DEFAULT_THRESHOLD) {
  const dormant = [];

  for (const [code, project] of Object.entries(PROJECT_CODES.projects || {})) {
    if (project.status !== 'active') continue;

    const activity = await getProjectActivity(code, project);

    if (activity.daysSinceActivity === null || activity.daysSinceActivity >= threshold) {
      dormant.push(activity);
    }
  }

  return dormant.sort((a, b) => {
    // Sort by days since activity (most dormant first), then by priority
    const daysDiff = (b.daysSinceActivity || 999) - (a.daysSinceActivity || 999);
    if (daysDiff !== 0) return daysDiff;

    const priorityOrder = { low: 0, medium: 1, high: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });
}

// ============================================================================
// ARCHIVE/REVIVE OPERATIONS
// ============================================================================

async function archiveProject(projectCode, reason = 'dormant') {
  const normalizedCode = projectCode.toUpperCase().startsWith('ACT-')
    ? projectCode.toUpperCase()
    : `ACT-${projectCode.toUpperCase()}`;

  const project = PROJECT_CODES.projects?.[normalizedCode];

  if (!project) {
    console.error(`Project ${normalizedCode} not found`);
    return false;
  }

  if (project.status === 'archived') {
    console.log(`Project ${normalizedCode} is already archived`);
    return false;
  }

  // Update in memory
  project.status = 'archived';
  project.archived_at = new Date().toISOString();
  project.archived_reason = reason;

  // Save to file
  writeFileSync('config/project-codes.json', JSON.stringify(PROJECT_CODES, null, 2));
  console.log(`✓ Archived ${normalizedCode} in config/project-codes.json`);

  // Update in Supabase
  if (supabase) {
    const { error } = await supabase
      .from('project_codes')
      .upsert({
        code: normalizedCode,
        status: 'archived',
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });

    if (error && error.code !== '42P01') {
      console.warn(`Warning: Could not update Supabase: ${error.message}`);
    } else if (!error) {
      console.log(`✓ Updated ${normalizedCode} in Supabase`);
    }
  }

  return true;
}

async function reviveProject(projectCode) {
  const normalizedCode = projectCode.toUpperCase().startsWith('ACT-')
    ? projectCode.toUpperCase()
    : `ACT-${projectCode.toUpperCase()}`;

  const project = PROJECT_CODES.projects?.[normalizedCode];

  if (!project) {
    console.error(`Project ${normalizedCode} not found`);
    return false;
  }

  if (project.status === 'active') {
    console.log(`Project ${normalizedCode} is already active`);
    return false;
  }

  // Update in memory
  project.status = 'active';
  project.revived_at = new Date().toISOString();
  delete project.archived_at;
  delete project.archived_reason;

  // Save to file
  writeFileSync('config/project-codes.json', JSON.stringify(PROJECT_CODES, null, 2));
  console.log(`✓ Revived ${normalizedCode} in config/project-codes.json`);

  // Update in Supabase
  if (supabase) {
    const { error } = await supabase
      .from('project_codes')
      .upsert({
        code: normalizedCode,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });

    if (!error) {
      console.log(`✓ Updated ${normalizedCode} in Supabase`);
    }
  }

  return true;
}

// ============================================================================
// DISPLAY
// ============================================================================

function displayDormantProjects(dormant, threshold) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Dormant Projects (${threshold}+ days inactive)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dormant.length === 0) {
    console.log('No dormant projects found. All active projects have recent activity.\n');
    return;
  }

  console.log(`Found ${dormant.length} dormant projects:\n`);
  console.log('Code'.padEnd(10) + 'Project'.padEnd(25) + 'Days'.padEnd(8) + 'Contacts'.padEnd(10) + 'Priority');
  console.log('-'.repeat(70));

  dormant.forEach(p => {
    const priorityIcon = p.priority === 'high' ? '🔥' : p.priority === 'low' ? '🌱' : '📋';
    const categoryIcon = PROJECT_CODES.categories?.[p.category]?.icon || '📋';

    console.log(
      p.code.padEnd(10) +
      `${categoryIcon} ${p.name.slice(0, 21)}`.padEnd(25) +
      (p.daysSinceActivity?.toString() || '∞').padEnd(8) +
      p.contactCount.toString().padEnd(10) +
      priorityIcon
    );
  });

  console.log('');
}

async function displayArchivePreview(dormant) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Archive Preview');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dormant.length === 0) {
    console.log('No projects to archive.\n');
    return;
  }

  console.log('The following projects would be archived:\n');

  dormant.forEach(p => {
    console.log(`  ${p.code}: ${p.name}`);
    console.log(`    - Last activity: ${p.daysSinceActivity ? `${p.daysSinceActivity} days ago` : 'Never'}`);
    console.log(`    - Contacts: ${p.contactCount}`);
    console.log(`    - Priority: ${p.priority}`);
    console.log('');
  });

  console.log('-'.repeat(60));
  console.log(`Total: ${dormant.length} projects`);
  console.log('');
  console.log('To archive all:  node scripts/archive-dormant.mjs --archive');
  console.log('To archive one:  node scripts/archive-dormant.mjs --archive <code>');
  console.log('');
}

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

async function interactiveArchive(dormant) {
  if (dormant.length === 0) {
    console.log('No dormant projects to archive.\n');
    return;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Interactive Archive Mode');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Review each project and decide: Archive (a), Skip (s), or Quit (q)\n');

  for (const project of dormant) {
    console.log('-'.repeat(60));
    console.log(`\n${project.code}: ${project.name}`);
    console.log(`  Category: ${project.category}`);
    console.log(`  Priority: ${project.priority}`);
    console.log(`  Days inactive: ${project.daysSinceActivity || '∞'}`);
    console.log(`  Contacts: ${project.contactCount}`);
    console.log('');

    const answer = await new Promise((resolve) => {
      rl.question('  [a]rchive / [s]kip / [q]uit? ', resolve);
    });

    if (answer.toLowerCase() === 'a') {
      await archiveProject(project.code);
      console.log(`  → Archived ${project.code}\n`);
    } else if (answer.toLowerCase() === 'q') {
      console.log('\nExiting interactive mode.\n');
      break;
    } else {
      console.log(`  → Skipped ${project.code}\n`);
    }
  }

  rl.close();
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    list: true,
    preview: false,
    archive: null,      // true for all, or specific code
    revive: null,       // specific code
    interactive: false,
    threshold: DEFAULT_THRESHOLD,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--preview' || arg === '-p') {
      options.preview = true;
      options.list = false;
    } else if (arg === '--archive' || arg === '-a') {
      options.list = false;
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        options.archive = next;
        i++;
      } else {
        options.archive = true;
      }
    } else if (arg === '--revive' || arg === '-r') {
      options.list = false;
      options.revive = args[++i];
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
      options.list = false;
    } else if (arg === '--threshold' || arg === '-t') {
      options.threshold = parseInt(args[++i]) || DEFAULT_THRESHOLD;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Archive Dormant Projects

Identify and archive projects with no activity for 60+ days.

Usage:
  node scripts/archive-dormant.mjs                     List dormant projects
  node scripts/archive-dormant.mjs --preview           Preview archive candidates
  node scripts/archive-dormant.mjs --archive           Archive all dormant
  node scripts/archive-dormant.mjs --archive <code>    Archive specific project
  node scripts/archive-dormant.mjs --revive <code>     Revive archived project
  node scripts/archive-dormant.mjs --interactive       Interactive review mode
  node scripts/archive-dormant.mjs --threshold 90      Custom threshold (days)

Options:
  --preview, -p         Show what would be archived
  --archive, -a [code]  Archive projects (all or specific)
  --revive, -r <code>   Revive an archived project
  --interactive, -i     Review each project interactively
  --threshold, -t <n>   Days of inactivity (default: 60)
  --help, -h            Show this help

Examples:
  node scripts/archive-dormant.mjs
  node scripts/archive-dormant.mjs --threshold 90
  node scripts/archive-dormant.mjs --archive ACT-XX
  node scripts/archive-dormant.mjs --revive ACT-XX
  node scripts/archive-dormant.mjs --interactive
`);
    return;
  }

  // Handle revive
  if (options.revive) {
    console.log(`\nReviving project: ${options.revive}\n`);
    await reviveProject(options.revive);
    return;
  }

  // Handle specific archive
  if (options.archive && typeof options.archive === 'string') {
    console.log(`\nArchiving project: ${options.archive}\n`);
    await archiveProject(options.archive);
    return;
  }

  // Find dormant projects
  console.log(`\nScanning for dormant projects (${options.threshold}+ days inactive)...`);
  const dormant = await findDormantProjects(options.threshold);

  if (options.preview) {
    await displayArchivePreview(dormant);
    return;
  }

  if (options.interactive) {
    await interactiveArchive(dormant);
    return;
  }

  if (options.archive === true) {
    // Archive all
    console.log(`\nArchiving ${dormant.length} dormant projects...\n`);

    for (const project of dormant) {
      await archiveProject(project.code);
    }

    console.log(`\n✓ Archived ${dormant.length} projects\n`);
    return;
  }

  // Default: just list
  displayDormantProjects(dormant, options.threshold);

  console.log('Actions:');
  console.log('  --preview     See archive details');
  console.log('  --archive     Archive all dormant projects');
  console.log('  --interactive Review each project');
  console.log('');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
