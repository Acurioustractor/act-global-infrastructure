#!/usr/bin/env node
/**
 * Notion -> Supabase Sync Script
 *
 * Syncs Notion project updates to Supabase project_knowledge table:
 * - Fetches all projects from Notion actProjects database
 * - Detects projects updated in the last 24 hours (configurable)
 * - Extracts: name, status, description, themes, leads, last_edited_time
 * - Upserts to project_knowledge with knowledge_type='notion_sync'
 * - Also syncs action items from Notion tasks (optional)
 *
 * Runs every 6 hours via GitHub Actions (sync-notion-inbound.yml)
 *
 * Usage:
 *   node scripts/sync-notion-to-supabase.mjs              # Default: 24 hours back
 *   node scripts/sync-notion-to-supabase.mjs --hours 48   # 48 hours back
 *   node scripts/sync-notion-to-supabase.mjs --full       # Full sync (all projects)
 *   node scripts/sync-notion-to-supabase.mjs --dry-run    # Preview without writing
 *   node scripts/sync-notion-to-supabase.mjs --verbose    # Detailed output
 *
 * Environment Variables:
 *   NOTION_TOKEN                    - Notion API token
 *   SUPABASE_SERVICE_ROLE_KEY      - Supabase service role key
 *   OPENAI_API_KEY                 - For generating embeddings (optional)
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { recordSyncStatus } from './lib/sync-status.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from project root
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

// Stats tracking
const stats = {
  fetched: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now()
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    hours: args.includes('--hours') ? parseInt(args[args.indexOf('--hours') + 1]) : 24,
    full: args.includes('--full'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h')
  };
}

// Load config files
async function loadConfig() {
  const configPath = join(__dirname, '../config/notion-database-ids.json');

  let databaseIds = {};
  let projectCodes = {};

  try {
    if (existsSync(configPath)) {
      databaseIds = JSON.parse(readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.warn('Warning: Could not load notion-database-ids.json');
  }

  try {
    projectCodes = await loadProjectsConfig();
  } catch (e) {
    console.warn('Warning: Could not load project-codes.json');
  }

  return { databaseIds, projectCodes };
}

// Initialize Notion client
function getNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable not set');
  }
  return new Client({ auth: token });
}

// Initialize Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  }

  return createClient(url, key);
}

// Generate embedding for semantic search
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
        dimensions: 384
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    return null;
  }
}

// Extract title from Notion page
function extractTitle(page) {
  const titleProp = Object.values(page.properties).find(p => p.type === 'title');
  return titleProp?.title?.[0]?.plain_text || 'Untitled';
}

// Extract status from Notion page
function extractStatus(page) {
  const statusProp = page.properties.Status || page.properties.status;
  return statusProp?.status?.name || statusProp?.select?.name || 'Unknown';
}

// Extract description/summary from Notion page
function extractDescription(page) {
  // Try common property names for description
  const descProps = ['Description', 'description', 'Summary', 'summary', 'Notes', 'notes'];

  for (const propName of descProps) {
    const prop = page.properties[propName];
    if (prop?.rich_text?.[0]?.plain_text) {
      return prop.rich_text[0].plain_text;
    }
  }

  return null;
}

// Extract themes/tags from Notion page
function extractThemes(page) {
  const themes = [];

  // Try common property names for themes
  const themeProps = ['Themes', 'themes', 'Tags', 'tags', 'Categories', 'categories'];

  for (const propName of themeProps) {
    const prop = page.properties[propName];
    if (prop?.multi_select) {
      themes.push(...prop.multi_select.map(t => t.name));
    }
    if (prop?.select?.name) {
      themes.push(prop.select.name);
    }
  }

  return [...new Set(themes)]; // Dedupe
}

// Extract leads/people from Notion page
function extractLeads(page) {
  const leads = [];

  // Try common property names for people
  const peopleProps = ['Lead', 'Leads', 'Owner', 'Owners', 'Assigned', 'People', 'Team'];

  for (const propName of peopleProps) {
    const prop = page.properties[propName];
    if (prop?.people) {
      leads.push(...prop.people.map(p => p.name || p.id));
    }
    if (prop?.rich_text?.[0]?.plain_text) {
      leads.push(prop.rich_text[0].plain_text);
    }
  }

  return [...new Set(leads)]; // Dedupe
}

// Extract priority from Notion page
function extractPriority(page) {
  const priorityProps = ['Priority', 'priority', 'Importance', 'importance'];

  for (const propName of priorityProps) {
    const prop = page.properties[propName];
    if (prop?.select?.name) {
      const priority = prop.select.name.toLowerCase();
      if (priority.includes('high') || priority.includes('urgent')) return 'high';
      if (priority.includes('low')) return 'low';
      if (priority.includes('critical')) return 'critical';
    }
  }

  return 'normal';
}

// Match Notion project name to project code
function matchProjectCode(projectName, projectCodes) {
  if (!projectName || !projectCodes?.projects) return null;

  const nameLower = projectName.toLowerCase();

  for (const [code, config] of Object.entries(projectCodes.projects)) {
    // Check if project name matches any notion_pages patterns
    if (config.notion_pages) {
      for (const notionPage of config.notion_pages) {
        if (nameLower.includes(notionPage.toLowerCase()) ||
            notionPage.toLowerCase().includes(nameLower)) {
          return code;
        }
      }
    }

    // Check if project name matches project name
    if (config.name) {
      if (nameLower.includes(config.name.toLowerCase()) ||
          config.name.toLowerCase().includes(nameLower)) {
        return code;
      }
    }
  }

  return null;
}

// Fetch all projects from Notion
async function fetchNotionProjects(notion, databaseId, options) {
  const projects = [];
  let cursor;

  const filter = options.full ? undefined : {
    timestamp: 'last_edited_time',
    last_edited_time: {
      after: new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString()
    }
  };

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      filter,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
    });

    projects.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return projects;
}

// Check if project already exists in project_knowledge
async function findExistingKnowledge(supabase, notionPageId) {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('id, updated_at')
    .eq('source_type', 'notion')
    .eq('source_ref', notionPageId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.warn(`Warning checking existing: ${error.message}`);
  }

  return data;
}

// Upsert project to project_knowledge
async function upsertProjectKnowledge(supabase, project, projectCode, options) {
  const notionPageId = project.id.replace(/-/g, '');

  // Build content from project data
  const contentParts = [
    `Status: ${project.status}`,
    project.description ? `Description: ${project.description}` : null,
    project.themes?.length ? `Themes: ${project.themes.join(', ')}` : null,
    project.leads?.length ? `Leads: ${project.leads.join(', ')}` : null
  ].filter(Boolean);

  const content = contentParts.join('\n');

  // Generate embedding for semantic search
  const textForEmbedding = `${project.title} ${content}`;
  const embedding = await generateEmbedding(textForEmbedding);

  const record = {
    project_code: projectCode || 'ACT-MISC',
    project_name: project.title,
    knowledge_type: 'notion_sync',
    title: `Notion Project: ${project.title}`,
    content,
    source_type: 'notion',
    source_ref: notionPageId,
    source_url: project.url,
    participants: project.leads?.length ? project.leads : null,
    importance: project.priority || 'normal',
    topics: project.themes?.length ? project.themes : null,
    recorded_at: project.lastEdited,
    recorded_by: 'notion-sync',
    embedding
  };

  // Check if exists
  const existing = await findExistingKnowledge(supabase, notionPageId);

  if (existing) {
    // Update existing record
    if (options.dryRun) {
      if (options.verbose) {
        console.log(`  [DRY-RUN] Would update: ${project.title}`);
      }
      return 'updated';
    }

    const { error } = await supabase
      .from('project_knowledge')
      .update(record)
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    return 'updated';
  } else {
    // Insert new record
    if (options.dryRun) {
      if (options.verbose) {
        console.log(`  [DRY-RUN] Would create: ${project.title}`);
      }
      return 'created';
    }

    const { error } = await supabase
      .from('project_knowledge')
      .insert(record);

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    return 'created';
  }
}

// Update sync state tracking
async function updateSyncState(supabase, syncType, recordCount, options) {
  if (options.dryRun) return;

  try {
    // Insert sync log entry
    await supabase
      .from('agent_audit_log')
      .insert({
        agent_name: 'notion-sync',
        action_type: 'sync_complete',
        entity_type: 'notion_projects',
        details: {
          sync_type: syncType,
          records_processed: recordCount,
          hours_back: options.full ? 'full' : options.hours,
          stats
        }
      });
  } catch (error) {
    // Silently fail - audit log is optional
    console.warn('Warning: Could not update sync state');
  }
}

// Main sync function
async function syncNotionToSupabase(options) {
  const { databaseIds, projectCodes } = await loadConfig();

  if (!databaseIds.actProjects) {
    throw new Error('actProjects database ID not found in config/notion-database-ids.json');
  }

  const notion = getNotion();
  const supabase = getSupabase();

  console.log('\n===================================================================');
  console.log('   Notion -> Supabase Sync');
  console.log('===================================================================\n');

  if (options.dryRun) {
    console.log('   [DRY-RUN MODE - No changes will be made]\n');
  }

  // Fetch projects from Notion
  console.log(`Fetching projects from Notion (${options.full ? 'full sync' : `last ${options.hours} hours`})...\n`);

  const notionProjects = await fetchNotionProjects(notion, databaseIds.actProjects, options);
  stats.fetched = notionProjects.length;

  console.log(`   Found ${notionProjects.length} projects to sync\n`);

  if (notionProjects.length === 0) {
    console.log('   No projects updated in the specified time range.\n');
    return stats;
  }

  // Process each project
  console.log('Processing projects...\n');

  for (const page of notionProjects) {
    try {
      const title = extractTitle(page);
      const status = extractStatus(page);
      const description = extractDescription(page);
      const themes = extractThemes(page);
      const leads = extractLeads(page);
      const priority = extractPriority(page);

      const project = {
        id: page.id,
        title,
        status,
        description,
        themes,
        leads,
        priority,
        url: page.url,
        lastEdited: page.last_edited_time
      };

      // Match to project code
      const projectCode = matchProjectCode(title, projectCodes);

      if (options.verbose) {
        console.log(`   Processing: ${title}`);
        console.log(`     Status: ${status}`);
        console.log(`     Code: ${projectCode || 'ACT-MISC'}`);
        if (themes.length) console.log(`     Themes: ${themes.join(', ')}`);
      }

      // Upsert to Supabase
      const result = await upsertProjectKnowledge(supabase, project, projectCode, options);

      if (result === 'created') {
        stats.created++;
        if (!options.verbose) process.stdout.write('+');
      } else if (result === 'updated') {
        stats.updated++;
        if (!options.verbose) process.stdout.write('.');
      }

    } catch (error) {
      stats.errors++;
      if (!options.verbose) process.stdout.write('!');
      console.error(`\n   Error processing ${extractTitle(page)}: ${error.message}`);
    }
  }

  if (!options.verbose) console.log('\n');

  // Update sync state
  await updateSyncState(supabase, options.full ? 'full' : 'incremental', notionProjects.length, options);

  return stats;
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Notion -> Supabase Sync

Syncs Notion project updates to Supabase project_knowledge table.

Usage:
  node scripts/sync-notion-to-supabase.mjs [options]

Options:
  --hours <n>   Hours back to sync (default: 24)
  --full        Full sync (all projects, ignore time filter)
  --dry-run     Preview changes without writing to database
  --verbose     Show detailed output
  --help, -h    Show this help

Examples:
  # Default: sync projects updated in last 24 hours
  node scripts/sync-notion-to-supabase.mjs

  # Sync projects updated in last 48 hours
  node scripts/sync-notion-to-supabase.mjs --hours 48

  # Full sync with verbose output
  node scripts/sync-notion-to-supabase.mjs --full --verbose

  # Preview what would be synced
  node scripts/sync-notion-to-supabase.mjs --dry-run

Environment Variables:
  NOTION_TOKEN                    - Notion API token (required)
  SUPABASE_SERVICE_ROLE_KEY      - Supabase service key (required)
  OPENAI_API_KEY                 - For embeddings (optional)
`);
    process.exit(0);
  }

  const supabase = getSupabase();

  try {
    const stats = await syncNotionToSupabase(options);

    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log('===================================================================');
    console.log('   Sync Complete');
    console.log('===================================================================\n');

    console.log('Results:');
    console.log(`   Fetched:  ${stats.fetched}`);
    console.log(`   Created:  ${stats.created}`);
    console.log(`   Updated:  ${stats.updated}`);
    console.log(`   Errors:   ${stats.errors}`);
    console.log(`   Duration: ${duration}s\n`);

    await recordSyncStatus(supabase, 'sync_notion', {
      success: stats.errors === 0,
      recordCount: stats.created + stats.updated,
      durationMs: Date.now() - stats.startTime,
    });

    if (stats.errors > 0) {
      console.log('Sync completed with errors (see above)\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\nSync failed:', error.message);
    console.error('\nCheck:');
    console.error('  - NOTION_TOKEN environment variable');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('  - Database ID in config/notion-database-ids.json (actProjects)');
    console.error('');
    await recordSyncStatus(supabase, 'sync_notion', { success: false, error: error.message });
    process.exit(1);
  }
}

main();

// Export for programmatic use
export {
  syncNotionToSupabase,
  fetchNotionProjects,
  matchProjectCode,
  extractTitle,
  extractStatus,
  extractDescription,
  extractThemes,
  extractLeads
};
