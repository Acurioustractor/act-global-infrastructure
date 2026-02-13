#!/usr/bin/env node
/**
 * Poll Notion Checkboxes — Sync checked items back to project_knowledge
 *
 * Scans the "Project Intelligence" section on each project's Notion page
 * for checked to_do blocks. When a checkbox is ticked:
 *   - Actions:      set action_required = false
 *   - Decisions:    set decision_status = 'implemented'
 *   - Deliverables: insert a milestone record
 *
 * Usage:
 *   node scripts/poll-notion-checkboxes.mjs                    # All projects
 *   node scripts/poll-notion-checkboxes.mjs --project ACT-JH   # Single project
 *   node scripts/poll-notion-checkboxes.mjs --dry-run           # Preview
 *   node scripts/poll-notion-checkboxes.mjs --verbose           # Detail
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendEmbed } from './discord-notify.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const projectFilter = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;

// Clients
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes
const projectCodesData = await loadProjectsConfig();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Notion: Find Project Intelligence section & read to_do blocks
// ============================================

async function getCheckedTodos(pageId) {
  let cursor;
  let allBlocks = [];

  do {
    const children = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const block of children.results) {
      allBlocks.push(block);
    }

    cursor = children.has_more ? children.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);

  // Find the Project Intelligence heading
  let sectionStart = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_2' && block.heading_2?.rich_text) {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('Project Intelligence')) {
        sectionStart = i;
        break;
      }
    }
  }

  if (sectionStart === -1) return [];

  // Collect to_do blocks within the section (stop at next heading_1 or unrelated heading_2)
  const ourSubheadings = [
    'Recent Meetings', 'Action Items', 'Pipeline', 'AI Summary',
    'Key Decisions', 'Open Actions', 'Key People', 'Milestones',
    'Opportunities', 'Recent Activity', 'Funding',
  ];

  const todos = [];
  for (let i = sectionStart + 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_1') break;
    if (block.type === 'heading_2') {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (!ourSubheadings.some(h => text.includes(h))) break;
    }
    if (block.type === 'to_do' && block.to_do?.checked) {
      const plainText = block.to_do.rich_text.map(rt => rt.plain_text).join('');
      todos.push({ blockId: block.id, text: plainText });
    }
  }

  return todos;
}

// ============================================
// Parse to_do text → type + title
// ============================================

function parseTodoText(text) {
  // Patterns from buildAttentionCallout:
  //   "Decision: {title} — {date}"
  //   "Action: {title} — {date}"
  //   "Schedule a meeting ..."
  //   "Schedule first meeting"
  //   "Launch: {date} ..."
  //   "{deliverable text}"

  // Strip trailing date suffix " — 6 Feb" etc.
  const stripped = text.replace(/\s*—\s*\d{1,2}\s+\w{3}(\s+\d{4})?\s*$/, '').trim();

  if (/^Decision:\s*/i.test(stripped)) {
    return { type: 'decision', title: stripped.replace(/^Decision:\s*/i, '').trim() };
  }
  if (/^Action:\s*/i.test(stripped)) {
    return { type: 'action', title: stripped.replace(/^Action:\s*/i, '').trim() };
  }
  if (/^Schedule\s+(a\s+)?meeting/i.test(stripped)) {
    return { type: 'schedule_meeting', title: stripped };
  }
  if (/^Launch:\s*/i.test(stripped)) {
    return { type: 'launch', title: stripped.replace(/^Launch:\s*/i, '').trim() };
  }

  // Deliverable / key_deliverable
  return { type: 'deliverable', title: stripped };
}

// ============================================
// Match to project_knowledge + update
// ============================================

async function matchAndUpdate(code, parsed) {
  if (parsed.type === 'decision') {
    const { data } = await supabase
      .from('project_knowledge')
      .select('id, title, decision_status')
      .eq('project_code', code)
      .eq('knowledge_type', 'decision')
      .ilike('title', `%${parsed.title}%`)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      verbose(`    No match for decision: "${parsed.title}"`);
      return null;
    }
    if (data.decision_status === 'implemented') {
      verbose(`    Already implemented: "${data.title}"`);
      return null;
    }

    if (!DRY_RUN) {
      await supabase
        .from('project_knowledge')
        .update({ decision_status: 'implemented' })
        .eq('id', data.id);
    }
    return { action: 'decision_implemented', title: data.title, id: data.id };
  }

  if (parsed.type === 'action') {
    const { data } = await supabase
      .from('project_knowledge')
      .select('id, title, action_required')
      .eq('project_code', code)
      .eq('knowledge_type', 'action')
      .ilike('title', `%${parsed.title}%`)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      verbose(`    No match for action: "${parsed.title}"`);
      return null;
    }
    if (data.action_required === false) {
      verbose(`    Already resolved: "${data.title}"`);
      return null;
    }

    if (!DRY_RUN) {
      await supabase
        .from('project_knowledge')
        .update({ action_required: false })
        .eq('id', data.id);
    }
    return { action: 'action_resolved', title: data.title, id: data.id };
  }

  if (parsed.type === 'deliverable' || parsed.type === 'launch' || parsed.type === 'schedule_meeting') {
    // Check if milestone already logged
    const { data: existing } = await supabase
      .from('project_knowledge')
      .select('id')
      .eq('project_code', code)
      .eq('knowledge_type', 'milestone')
      .ilike('title', `%${parsed.title}%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      verbose(`    Milestone already logged: "${parsed.title}"`);
      return null;
    }

    if (!DRY_RUN) {
      await supabase
        .from('project_knowledge')
        .insert({
          project_code: code,
          knowledge_type: 'milestone',
          title: parsed.title,
          content: `Completed (checked off in Notion)`,
          recorded_at: new Date().toISOString(),
          source: 'notion-checkbox',
          action_required: false,
        });
    }
    return { action: 'milestone_logged', title: parsed.title };
  }

  return null;
}

// ============================================
// Discord notification
// ============================================

async function notifyDiscord(code, projectName, results) {
  if (!results.length) return;

  const fields = results.map(r => ({
    name: r.action === 'decision_implemented' ? 'Decision Implemented'
      : r.action === 'action_resolved' ? 'Action Resolved'
      : 'Milestone Logged',
    value: r.title.slice(0, 100),
    inline: false,
  }));

  await sendEmbed('tasks', {
    title: `Notion Checkbox: ${projectName}`,
    color: 0x57F287,
    description: `${results.length} item${results.length === 1 ? '' : 's'} resolved via Notion checkboxes`,
    fields: fields.slice(0, 10),
    timestamp: new Date().toISOString(),
    footer: { text: `Project: ${code}` },
  });
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Notion Checkbox Polling ===');
  if (DRY_RUN) log('DRY RUN MODE - no changes will be made');

  const projects = projectCodesData.projects;
  const codes = projectFilter
    ? [projectFilter]
    : Object.keys(projects).filter(code => {
        const p = projects[code];
        return (p.notion_page_id || p.notion_id) && p.status !== 'archived';
      });

  log(`Processing ${codes.length} projects...`);

  const stats = { checked: 0, resolved: 0, skipped: 0, errors: 0 };

  for (const code of codes) {
    const project = projects[code];
    if (!project) {
      log(`  ${code}: Not found in project-codes.json`);
      stats.errors++;
      continue;
    }

    const pageId = project.notion_page_id || project.notion_id;
    if (!pageId) {
      verbose(`  ${code}: No notion page ID, skipping`);
      stats.skipped++;
      continue;
    }

    try {
      verbose(`  ${code}: Scanning ${project.name}...`);
      const todos = await getCheckedTodos(pageId);
      await sleep(350);

      if (!todos.length) {
        verbose(`  ${code}: No checked items`);
        continue;
      }

      log(`  ${code}: Found ${todos.length} checked item${todos.length === 1 ? '' : 's'}`);
      stats.checked += todos.length;

      const results = [];
      for (const todo of todos) {
        const parsed = parseTodoText(todo.text);
        verbose(`    "${todo.text}" → type=${parsed.type}, title="${parsed.title}"`);

        const result = await matchAndUpdate(code, parsed);
        if (result) {
          log(`    ${DRY_RUN ? '[DRY RUN] Would ' : ''}${result.action}: "${result.title}"`);
          results.push(result);
          stats.resolved++;
        }
      }

      if (!DRY_RUN && results.length > 0) {
        await notifyDiscord(code, project.name, results);
      }
    } catch (err) {
      log(`  ${code}: ERROR - ${err.message}`);
      stats.errors++;
    }

    await sleep(500);
  }

  log('');
  log('=== Summary ===');
  log(`Checked items found: ${stats.checked}`);
  log(`Resolved:            ${stats.resolved}`);
  log(`Skipped:             ${stats.skipped}`);
  log(`Errors:              ${stats.errors}`);
  if (DRY_RUN) log('(Dry run — no changes made)');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
