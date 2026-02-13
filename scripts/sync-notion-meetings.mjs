#!/usr/bin/env node
/**
 * Notion Meeting Sync → Supabase
 *
 * Discovers ALL meeting databases across Notion project pages,
 * extracts full content (block children), normalizes into
 * project_knowledge with knowledge_type='meeting', auto-detects
 * project codes, matches attendees to GHL contacts, generates
 * embeddings, and creates knowledge graph edges.
 *
 * Usage:
 *   node scripts/sync-notion-meetings.mjs              # Incremental (last 7 days)
 *   node scripts/sync-notion-meetings.mjs --full       # All meetings
 *   node scripts/sync-notion-meetings.mjs --dry-run    # Preview only
 *   node scripts/sync-notion-meetings.mjs --verbose    # Detailed output
 *   node scripts/sync-notion-meetings.mjs --discover   # List all meeting databases
 *
 * Environment Variables:
 *   NOTION_TOKEN                    - Notion API token
 *   SUPABASE_SERVICE_ROLE_KEY      - Supabase service role key
 *   OPENAI_API_KEY                 - For generating embeddings
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Config & Clients
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    discover: args.includes('--discover'),
    days: args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1]) : 7,
    help: args.includes('--help') || args.includes('-h')
  };
}

async function loadProjectCodes() {
  try {
    return await loadProjectsConfig();
  } catch (e) { /* ignore */ }
  return { projects: {} };
}

function getNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN not set');
  return new Client({ auth: token });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key);
}

async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000), dimensions: 384 })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch { return null; }
}

const stats = { databases: 0, meetings: 0, created: 0, updated: 0, skipped: 0, edges: 0, errors: 0, startTime: Date.now() };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Meeting Database Discovery
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Discover all meeting-related databases in Notion workspace.
 * Looks for databases with "meeting" or "Meeting Notes" in title.
 */
async function discoverMeetingDatabases(notion) {
  const meetingDbs = [];
  const searchTerms = ['Meeting', 'Meetings', 'Meeting Notes'];

  for (const query of searchTerms) {
    let cursor;
    do {
      const response = await notion.search({
        query,
        filter: { property: 'object', value: 'database' },
        start_cursor: cursor,
        page_size: 100
      });

      for (const db of response.results) {
        // Deduplicate by ID
        if (meetingDbs.some(d => d.id === db.id)) continue;

        const title = db.title?.[0]?.plain_text || '';
        const titleLower = title.toLowerCase();

        // Must have "meeting" in the title
        if (!titleLower.includes('meeting')) continue;

        // Skip if in trash
        if (db.in_trash || db.archived) continue;

        meetingDbs.push({
          id: db.id,
          title,
          parentType: db.parent?.type,
          parentId: db.parent?.page_id || db.parent?.database_id || db.parent?.block_id || null,
          // Extract database parent page for project detection
          databaseParentPageId: db.database_parent?.page_id || null,
          properties: db.properties ? Object.keys(db.properties) : [],
          lastEdited: db.last_edited_time,
          url: db.url
        });
      }

      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
  }

  return meetingDbs;
}

/**
 * Resolve the project that a meeting database belongs to.
 * Walks up the parent chain to find a project page.
 */
async function resolveProjectForDatabase(notion, db, projectCodes) {
  // Strategy 1: database_parent is a page — check if that page title matches a project
  if (db.databaseParentPageId) {
    try {
      const page = await notion.pages.retrieve({ page_id: db.databaseParentPageId });
      const title = extractPageTitle(page);
      if (title) {
        const code = matchProjectCode(title, projectCodes);
        if (code) return { code, name: title, pageId: db.databaseParentPageId };
      }

      // Walk up one more level if the parent is inside another database/page
      if (page.parent?.page_id) {
        const grandparent = await notion.pages.retrieve({ page_id: page.parent.page_id });
        const gpTitle = extractPageTitle(grandparent);
        if (gpTitle) {
          const code = matchProjectCode(gpTitle, projectCodes);
          if (code) return { code, name: gpTitle, pageId: page.parent.page_id };
        }
      }
    } catch { /* page not accessible */ }
  }

  // Strategy 2: database title itself hints at the project
  const dbTitle = db.title || '';
  const code = matchProjectCode(dbTitle, projectCodes);
  if (code) return { code, name: dbTitle, pageId: null };

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Meeting Page Processing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractPageTitle(page) {
  const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title');
  return titleProp?.title?.[0]?.plain_text || null;
}

/**
 * Extract meeting metadata from page properties.
 * Handles the various schemas found across meeting databases.
 */
function extractMeetingMetadata(page) {
  const props = page.properties || {};
  const meta = { title: null, date: null, attendees: [], location: null, status: null, followUpRequired: false };

  // Title: always the title property
  meta.title = extractPageTitle(page);

  // Date: try various property names
  for (const name of ['Date', 'date', 'Meeting Date', 'meeting_date', 'Created time']) {
    const prop = props[name];
    if (prop?.date?.start) { meta.date = prop.date.start; break; }
    if (prop?.created_time) { meta.date = prop.created_time; break; }
  }
  // Fallback to page created_time
  if (!meta.date) meta.date = page.created_time;

  // Attendees: try people type, multi_select, and title parsing
  for (const name of ['Attendees', 'attendees', 'People', 'people', 'Participants']) {
    const prop = props[name];
    if (prop?.people?.length) {
      meta.attendees = prop.people.map(p => ({ name: p.name, email: p.person?.email }));
      break;
    }
    if (prop?.multi_select?.length) {
      meta.attendees = prop.multi_select.map(s => ({ name: s.name, email: null }));
      break;
    }
  }

  // If no attendees from properties, parse from title ("BK, Sally and April")
  if (meta.attendees.length === 0 && meta.title) {
    const parsed = parsePeopleFromTitle(meta.title);
    if (parsed.length > 0) meta.attendees = parsed;
  }

  // Location
  for (const name of ['Location', 'location']) {
    const prop = props[name];
    if (prop?.rich_text?.[0]?.plain_text) { meta.location = prop.rich_text[0].plain_text; break; }
  }

  // Status
  for (const name of ['Status', 'status']) {
    const prop = props[name];
    if (prop?.status?.name) { meta.status = prop.status.name; break; }
    if (prop?.select?.name) { meta.status = prop.select.name; break; }
  }

  // Follow-up
  const followUp = props['Follow-up Required'] || props['follow_up_required'];
  if (followUp?.checkbox) meta.followUpRequired = true;

  return meta;
}

/**
 * Parse people names from meeting titles like "BK, Sally and April"
 * or "David, Nic and BK".
 */
function parsePeopleFromTitle(title) {
  if (!title) return [];

  // Common patterns: "Name, Name and Name", "Name - topic", "Name // topic"
  let peoplePart = title;

  // Strip topic parts
  const separators = [' - ', ' // ', ' — ', ': ', ' | '];
  for (const sep of separators) {
    if (peoplePart.includes(sep)) {
      peoplePart = peoplePart.split(sep)[0];
    }
  }

  // Split on commas and "and"
  const names = peoplePart
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0 && n.length < 40);

  // Only return if it looks like a list of names (at least 2, short strings)
  if (names.length >= 2 && names.every(n => n.split(' ').length <= 3)) {
    return names.map(n => ({ name: n, email: null }));
  }

  return [];
}

/**
 * Extract full text content from a Notion page's blocks.
 */
async function extractPageContent(notion, pageId) {
  const blocks = [];
  let cursor;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
  } catch (e) {
    return ''; // Page not accessible
  }

  const lines = [];
  for (const block of blocks) {
    const text = extractBlockText(block);
    if (text) lines.push(text);

    // Recurse into children (toggle lists, callouts, etc.)
    if (block.has_children && block.type !== 'child_database' && block.type !== 'child_page') {
      try {
        const childContent = await extractPageContent(notion, block.id);
        if (childContent) lines.push(childContent);
      } catch { /* skip inaccessible children */ }
    }
  }

  return lines.join('\n');
}

/**
 * Extract text from a single Notion block.
 */
function extractBlockText(block) {
  const type = block.type;
  if (type === 'unsupported') return null;

  const content = block[type];
  if (!content) return null;

  // Rich text blocks
  if (content.rich_text) {
    const text = content.rich_text.map(rt => rt.plain_text).join('');
    if (!text) return null;

    switch (type) {
      case 'heading_1': return `# ${text}`;
      case 'heading_2': return `## ${text}`;
      case 'heading_3': return `### ${text}`;
      case 'bulleted_list_item': return `- ${text}`;
      case 'numbered_list_item': return `1. ${text}`;
      case 'to_do': return `- [${content.checked ? 'x' : ' '}] ${text}`;
      case 'toggle': return `> ${text}`;
      case 'quote': return `> ${text}`;
      case 'callout': return `> ${text}`;
      default: return text;
    }
  }

  // Code blocks
  if (content.language && content.rich_text) {
    return '```' + content.language + '\n' + content.rich_text.map(rt => rt.plain_text).join('') + '\n```';
  }

  // Dividers
  if (type === 'divider') return '---';

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Attendee → GHL Contact Matching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Known name abbreviations used in Notion
const NAME_ALIASES = {
  'BK': 'Benjamin Knight',
  'Nic': 'Nicholas Marchesi',
  'NM': 'Nicholas Marchesi',
  'Sal': 'Sally',
  'Ben': 'Benjamin Knight'
};

async function matchAttendeesToContacts(supabase, attendees) {
  if (!attendees || attendees.length === 0) return [];

  const matched = [];

  for (const attendee of attendees) {
    let contact = null;

    // Try email match first
    if (attendee.email) {
      const { data } = await supabase
        .from('ghl_contacts')
        .select('id, ghl_id, first_name, last_name, email')
        .eq('email', attendee.email)
        .limit(1)
        .maybeSingle();
      if (data) contact = data;
    }

    // Try name match
    if (!contact && attendee.name) {
      const fullName = NAME_ALIASES[attendee.name] || attendee.name;
      const parts = fullName.split(' ');

      if (parts.length >= 2) {
        const { data } = await supabase
          .from('ghl_contacts')
          .select('id, ghl_id, first_name, last_name, email')
          .ilike('first_name', parts[0])
          .ilike('last_name', parts.slice(1).join(' '))
          .limit(1)
          .maybeSingle();
        if (data) contact = data;
      }

      // Try first name only if short name
      if (!contact && parts.length === 1 && fullName.length > 2) {
        const { data } = await supabase
          .from('ghl_contacts')
          .select('id, ghl_id, first_name, last_name, email')
          .ilike('first_name', fullName)
          .limit(3);
        if (data?.length === 1) contact = data[0]; // Only use if unique match
      }
    }

    matched.push({
      ...attendee,
      ghlContactId: contact?.ghl_id || null,
      ghlContactName: contact ? `${contact.first_name} ${contact.last_name}` : null
    });
  }

  return matched;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Project Code Matching (reused from sync-notion-to-supabase.mjs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function matchProjectCode(name, projectCodes) {
  if (!name || !projectCodes?.projects) return null;
  const nameLower = name.toLowerCase();

  for (const [code, config] of Object.entries(projectCodes.projects)) {
    if (config.notion_pages) {
      for (const notionPage of config.notion_pages) {
        if (nameLower.includes(notionPage.toLowerCase()) || notionPage.toLowerCase().includes(nameLower)) {
          return code;
        }
      }
    }
    if (config.name) {
      if (nameLower.includes(config.name.toLowerCase()) || config.name.toLowerCase().includes(nameLower)) {
        return code;
      }
    }
  }
  return null;
}

/**
 * Try to detect project from meeting content or title.
 */
function detectProjectFromContent(title, content, projectCodes) {
  if (!projectCodes?.projects) return null;

  const text = `${title || ''} ${content || ''}`.toLowerCase();

  for (const [code, config] of Object.entries(projectCodes.projects)) {
    const searchTerms = [
      config.name?.toLowerCase(),
      ...(config.notion_pages || []).map(p => p.toLowerCase()),
      ...(config.ghl_tags || [])
    ].filter(Boolean);

    for (const term of searchTerms) {
      if (text.includes(term)) return code;
    }
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Knowledge Graph Edge Creation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createMeetingEdges(supabase, meetingId, projectCode, matchedAttendees, options) {
  if (options.dryRun) return 0;

  let edgeCount = 0;

  // Link meeting to attendees via canonical_entities
  for (const attendee of matchedAttendees) {
    if (!attendee.ghlContactId) continue;

    // Find canonical entity for this GHL contact
    const { data: entity } = await supabase
      .from('entity_identifiers')
      .select('entity_id')
      .eq('source_system', 'ghl')
      .eq('source_id', attendee.ghlContactId)
      .limit(1)
      .maybeSingle();

    if (entity) {
      const { error } = await supabase
        .from('knowledge_edges')
        .upsert({
          source_type: 'project_knowledge',
          source_id: meetingId,
          target_type: 'entity',
          target_id: entity.entity_id,
          edge_type: 'about',
          strength: 0.8,
          confidence: 0.9,
          created_by: 'meeting-sync',
          reasoning: `Attendee: ${attendee.name}`
        }, { onConflict: 'source_type,source_id,target_type,target_id,edge_type' });

      if (!error) edgeCount++;
    }
  }

  // Link meeting to calendar events (same date, same project)
  if (projectCode) {
    const { data: calEvents } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('detected_project_code', projectCode)
      .limit(5);

    for (const event of (calEvents || [])) {
      const { error } = await supabase
        .from('knowledge_edges')
        .upsert({
          source_type: 'project_knowledge',
          source_id: meetingId,
          target_type: 'communication',
          target_id: event.id,
          edge_type: 'context_for',
          strength: 0.6,
          confidence: 0.7,
          created_by: 'meeting-sync',
          reasoning: `Calendar event for same project: ${projectCode}`
        }, { onConflict: 'source_type,source_id,target_type,target_id,edge_type' });

      if (!error) edgeCount++;
    }
  }

  return edgeCount;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncMeetings(options) {
  const projectCodes = await loadProjectCodes();
  const notion = getNotion();
  const supabase = getSupabase();

  console.log('\n===================================================================');
  console.log('   Notion Meeting Sync → Supabase');
  console.log('===================================================================\n');

  if (options.dryRun) console.log('   [DRY-RUN MODE]\n');

  // Step 1: Discover meeting databases
  console.log('Step 1: Discovering meeting databases...\n');
  const meetingDbs = await discoverMeetingDatabases(notion);
  stats.databases = meetingDbs.length;
  console.log(`   Found ${meetingDbs.length} meeting databases\n`);

  // Resolve project codes for each database
  for (const db of meetingDbs) {
    db.project = await resolveProjectForDatabase(notion, db, projectCodes);
    if (options.verbose || options.discover) {
      console.log(`   ${db.title}`);
      console.log(`     ID: ${db.id}`);
      console.log(`     Project: ${db.project ? `${db.project.code} (${db.project.name})` : 'Unknown'}`);
      console.log(`     Properties: ${db.properties.join(', ')}`);
      console.log(`     Last edited: ${db.lastEdited}`);
      console.log('');
    }
  }

  if (options.discover) {
    console.log('Discovery complete. Use --verbose to sync.\n');
    return stats;
  }

  // Step 2: Fetch meetings from each database
  console.log('Step 2: Fetching meetings from all databases...\n');

  const cutoffDate = options.full ? null : new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();

  for (const db of meetingDbs) {
    console.log(`   Processing: ${db.title} ${db.project ? `(${db.project.code})` : ''}`);

    try {
      const filter = cutoffDate ? {
        timestamp: 'last_edited_time',
        last_edited_time: { after: cutoffDate }
      } : undefined;

      let cursor;
      let dbMeetingCount = 0;

      do {
        const response = await notion.databases.query({
          database_id: db.id,
          start_cursor: cursor,
          filter,
          sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
        });

        for (const page of response.results) {
          try {
            const meta = extractMeetingMetadata(page);
            stats.meetings++;
            dbMeetingCount++;

            if (options.verbose) {
              console.log(`     Meeting: ${meta.title} (${meta.date || 'no date'})`);
              console.log(`       Attendees: ${meta.attendees.map(a => a.name).join(', ') || 'none detected'}`);
            }

            // Extract full page content
            const content = await extractPageContent(notion, page.id);

            if (!content || content.trim().length < 10) {
              stats.skipped++;
              if (options.verbose) console.log('       Skipped: empty content');
              continue;
            }

            // Detect project code
            let projectCode = db.project?.code || null;
            if (!projectCode) {
              projectCode = detectProjectFromContent(meta.title, content, projectCodes);
            }

            // Match attendees to GHL contacts
            const matchedAttendees = await matchAttendeesToContacts(supabase, meta.attendees);

            if (options.verbose) {
              const matched = matchedAttendees.filter(a => a.ghlContactId);
              if (matched.length > 0) {
                console.log(`       GHL matches: ${matched.map(a => `${a.name} → ${a.ghlContactName}`).join(', ')}`);
              }
              console.log(`       Project: ${projectCode || 'unassigned'}`);
              console.log(`       Content: ${content.length} chars`);
            }

            // Build the content string
            const participantNames = matchedAttendees.map(a => a.ghlContactName || a.name).filter(Boolean);
            const contentForEmbedding = [
              meta.title,
              meta.date ? `Date: ${meta.date}` : null,
              participantNames.length ? `Attendees: ${participantNames.join(', ')}` : null,
              meta.location ? `Location: ${meta.location}` : null,
              content
            ].filter(Boolean).join('\n');

            // Generate embedding
            const embedding = await generateEmbedding(contentForEmbedding);

            // Upsert to project_knowledge
            const notionPageId = page.id.replace(/-/g, '');
            const ghlContactIds = matchedAttendees.filter(a => a.ghlContactId).map(a => a.ghlContactId);

            const record = {
              project_code: projectCode || 'ACT-MISC',
              project_name: db.project?.name || db.title.replace(/Meeting Notes?/i, '').trim() || null,
              knowledge_type: 'meeting',
              title: meta.title,
              content: contentForEmbedding,
              source_type: 'notion',
              source_ref: notionPageId,
              source_url: page.url,
              participants: participantNames.length ? participantNames : null,
              contact_ids: ghlContactIds.length ? ghlContactIds : null,
              importance: meta.followUpRequired ? 'high' : 'normal',
              action_required: meta.followUpRequired,
              topics: projectCode ? [projectCode] : null,
              recorded_at: meta.date || page.created_time,
              recorded_by: 'meeting-sync',
              embedding
            };

            if (options.dryRun) {
              stats.created++;
              if (!options.verbose) process.stdout.write('+');
              continue;
            }

            // Check if exists
            const { data: existing } = await supabase
              .from('project_knowledge')
              .select('id')
              .eq('source_type', 'notion')
              .eq('source_ref', notionPageId)
              .eq('knowledge_type', 'meeting')
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('project_knowledge')
                .update(record)
                .eq('id', existing.id);

              if (error) throw new Error(`Update failed: ${error.message}`);
              stats.updated++;
              if (!options.verbose) process.stdout.write('.');

              // Create edges
              const edgeCount = await createMeetingEdges(supabase, existing.id, projectCode, matchedAttendees, options);
              stats.edges += edgeCount;
            } else {
              const { data: inserted, error } = await supabase
                .from('project_knowledge')
                .insert(record)
                .select('id')
                .single();

              if (error) throw new Error(`Insert failed: ${error.message}`);
              stats.created++;
              if (!options.verbose) process.stdout.write('+');

              // Create edges
              const edgeCount = await createMeetingEdges(supabase, inserted.id, projectCode, matchedAttendees, options);
              stats.edges += edgeCount;
            }

          } catch (err) {
            stats.errors++;
            if (!options.verbose) process.stdout.write('!');
            console.error(`\n     Error: ${err.message}`);
          }
        }

        cursor = response.has_more ? response.next_cursor : null;
      } while (cursor);

      console.log(`     → ${dbMeetingCount} meetings processed`);

    } catch (err) {
      stats.errors++;
      console.error(`   Error querying ${db.title}: ${err.message}`);
    }
  }

  // Step 3: Log sync
  if (!options.dryRun) {
    try {
      await supabase.from('agent_audit_log').insert({
        agent_name: 'meeting-sync',
        action_type: 'sync_complete',
        entity_type: 'notion_meetings',
        details: { stats, databases: meetingDbs.map(d => ({ title: d.title, project: d.project?.code })) }
      });
    } catch { /* audit log is optional */ }
  }

  return stats;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Notion Meeting Sync → Supabase

Discovers all meeting databases in Notion, extracts content,
normalizes into project_knowledge, matches attendees to GHL contacts,
and creates knowledge graph edges.

Usage:
  node scripts/sync-notion-meetings.mjs [options]

Options:
  --full          Sync all meetings (no time filter)
  --days <n>      Days back to sync (default: 7)
  --dry-run       Preview without writing
  --verbose       Detailed output
  --discover      List all meeting databases without syncing
  --help, -h      Show this help

Examples:
  # Discover meeting databases
  node scripts/sync-notion-meetings.mjs --discover

  # Sync last 7 days
  node scripts/sync-notion-meetings.mjs --verbose

  # Full sync
  node scripts/sync-notion-meetings.mjs --full --verbose

  # Preview
  node scripts/sync-notion-meetings.mjs --full --dry-run
`);
    process.exit(0);
  }

  try {
    await syncMeetings(options);

    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log('\n===================================================================');
    console.log('   Meeting Sync Complete');
    console.log('===================================================================\n');
    console.log(`   Databases found:  ${stats.databases}`);
    console.log(`   Meetings found:   ${stats.meetings}`);
    console.log(`   Created:          ${stats.created}`);
    console.log(`   Updated:          ${stats.updated}`);
    console.log(`   Skipped (empty):  ${stats.skipped}`);
    console.log(`   Graph edges:      ${stats.edges}`);
    console.log(`   Errors:           ${stats.errors}`);
    console.log(`   Duration:         ${duration}s\n`);

    if (stats.errors > 0) process.exit(1);
  } catch (error) {
    console.error('\nSync failed:', error.message);
    process.exit(1);
  }
}

main();

export { syncMeetings, discoverMeetingDatabases, extractPageContent, matchAttendeesToContacts, parsePeopleFromTitle };
