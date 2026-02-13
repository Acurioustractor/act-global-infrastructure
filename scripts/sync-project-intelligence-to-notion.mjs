#!/usr/bin/env node
/**
 * Sync Project Intelligence to Notion (v2 — LCAA-framed)
 *
 * Pushes real project data to each project's Notion page as a rich
 * "Project Intelligence" section. Notion = the project's brain.
 *
 * Each page answers: What's happening, what decisions need to be made,
 * what opportunities are live, and what's the LCAA energy?
 *
 * Data sources:
 *   - project_knowledge:  Meetings, decisions, actions (AI-extracted from Notion)
 *   - ghl_opportunities:  Pipeline deals with monetary values
 *   - ghl_contacts:       Key people linked to project
 *   - project_summaries:  AI-generated summaries
 *   - project-codes.json: LCAA themes, milestones, launch dates, config
 *
 * Usage:
 *   node scripts/sync-project-intelligence-to-notion.mjs                    # All projects
 *   node scripts/sync-project-intelligence-to-notion.mjs --project ACT-JH   # Single project
 *   node scripts/sync-project-intelligence-to-notion.mjs --dry-run          # Preview only
 *   node scripts/sync-project-intelligence-to-notion.mjs --verbose          # Detailed output
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const projectFilter = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'https://command-center.vercel.app';
const SECTION_MARKER = '\u{1F4CA} Project Intelligence';

// Clients
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes
const projectCodesData = await loadProjectsConfig();

// LCAA theme config
const LCAA_THEMES = {
  Listen: { emoji: '\u{1F50A}', color: 'blue' },
  Connect: { emoji: '\u{1F91D}', color: 'green' },
  Act: { emoji: '\u26A1', color: 'orange' },
  Amplify: { emoji: '\u{1F4E2}', color: 'purple' },
};

// GHL contacts.projects uses lowercase tags like "justicehub", "the-harvest"
function contactProjectTags(project) {
  return project.ghl_tags || [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function daysAgoLabel(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

// ============================================
// Supabase Queries
// ============================================

async function fetchLastActivity(code) {
  const { data } = await supabase
    .from('project_knowledge')
    .select('title, recorded_at, knowledge_type')
    .eq('project_code', code)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchMeetings(code) {
  const { data } = await supabase
    .from('project_knowledge')
    .select('title, summary, recorded_at, participants, source_url')
    .eq('project_code', code)
    .eq('knowledge_type', 'meeting')
    .order('recorded_at', { ascending: false })
    .limit(5);
  return data || [];
}

async function fetchAttentionItems(code) {
  // Decisions (last 12 months) + Actions (last 6 months) — unified priority list
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const [decisionsRes, actionsRes] = await Promise.all([
    supabase
      .from('project_knowledge')
      .select('title, content, recorded_at, source_url, knowledge_type')
      .eq('project_code', code)
      .eq('knowledge_type', 'decision')
      .gte('recorded_at', oneYearAgo)
      .order('recorded_at', { ascending: false })
      .limit(5),
    supabase
      .from('project_knowledge')
      .select('title, content, recorded_at, source_url, knowledge_type')
      .eq('project_code', code)
      .eq('knowledge_type', 'action')
      .eq('action_required', true)
      .gte('recorded_at', sixMonthsAgo)
      .order('recorded_at', { ascending: false })
      .limit(5),
  ]);

  return {
    decisions: decisionsRes.data || [],
    actions: actionsRes.data || [],
  };
}

async function fetchPipeline(project) {
  // Match by project name, xero_tracking, and GHL tags
  const searches = [project.name];
  if (project.xero_tracking && project.xero_tracking !== project.name) {
    searches.push(project.xero_tracking);
  }
  // Also search by GHL tags for broader matching
  for (const tag of (project.ghl_tags || []).slice(0, 3)) {
    if (tag !== project.name.toLowerCase() && tag.length > 3) {
      searches.push(tag);
    }
  }

  let results = [];
  for (const term of searches) {
    const { data } = await supabase
      .from('ghl_opportunities')
      .select('name, stage_name, monetary_value, status, updated_at')
      .ilike('name', `%${term}%`)
      .eq('status', 'open');
    if (data?.length) results.push(...data);
  }

  // Deduplicate by name
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

async function fetchKeyContacts(project) {
  const tags = contactProjectTags(project);
  if (!tags.length) return { contacts: [], lastEngaged: null };

  const primaryTag = tags[0];
  const { data } = await supabase
    .from('ghl_contacts')
    .select('first_name, last_name, company_name, engagement_status, last_contact_date')
    .contains('projects', [primaryTag])
    .order('last_contact_date', { ascending: false, nullsFirst: false })
    .limit(20);

  const contacts = data || [];
  const lastEngaged = contacts[0]?.last_contact_date
    ? daysAgo(contacts[0].last_contact_date)
    : null;

  return { contacts, lastEngaged };
}

async function fetchAISummary(code) {
  // Try both full code (ACT-JH) and short code (JH) since generate-project-summaries
  // stores with the short code while this script uses the full code
  const shortCode = code.replace('ACT-', '');
  const { data } = await supabase
    .from('project_summaries')
    .select('summary_text, generated_at')
    .or(`project_code.eq.${code},project_code.eq.${shortCode}`)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ============================================
// Notion Block Builders (primitives)
// ============================================

function richText(text, opts = {}) {
  const rt = { type: 'text', text: { content: text } };
  if (opts.link) rt.text.link = { url: opts.link };
  if (opts.bold || opts.italic || opts.color) {
    rt.annotations = {};
    if (opts.bold) rt.annotations.bold = true;
    if (opts.italic) rt.annotations.italic = true;
    if (opts.color) rt.annotations.color = opts.color;
  }
  return rt;
}

function heading2(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [richText(text)], is_toggleable: false },
  };
}

function heading3(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [richText(text)] },
  };
}

function paragraph(parts) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] },
  };
}

function bulletItem(parts) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] },
  };
}

function calloutBlock(parts, emoji, color) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: Array.isArray(parts) ? parts : [richText(parts)],
      icon: { type: 'emoji', emoji },
      color: color || 'default',
    },
  };
}

function todoItem(parts, checked = false) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: Array.isArray(parts) ? parts : [richText(parts)],
      checked,
    },
  };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

// ============================================
// Section Builders (v2 — LCAA-framed)
// ============================================

function buildLCAALine(project) {
  const themes = project.lcaa_themes;
  if (!themes || !themes.length) return null;

  const parts = [];
  themes.forEach((theme, i) => {
    const cfg = LCAA_THEMES[theme];
    if (!cfg) return;
    if (i > 0) parts.push(richText('  \u00B7  ', { color: 'gray' }));
    parts.push(richText(`${cfg.emoji} ${theme}`, { bold: true, color: cfg.color }));
  });

  if (!parts.length) return null;

  // Wrap with LCAA label
  const allParts = [
    richText('LCAA: ', { color: 'gray', italic: true }),
    ...parts,
  ];
  return paragraph(allParts);
}

function buildAttentionCallout(decisions, actions, meetings, project) {
  const items = [];

  // Pending decisions — as checkboxes so they can be ticked off in Notion
  for (const d of decisions) {
    const title = d.title || 'Untitled decision';
    const date = formatDateShort(d.recorded_at);
    const parts = [richText('Decision: ', { bold: true, color: 'orange' })];
    if (d.source_url) {
      parts.push(richText(title, { link: d.source_url }));
    } else {
      parts.push(richText(title));
    }
    parts.push(richText(` \u2014 ${date}`, { color: 'gray' }));
    items.push(todoItem(parts));
  }

  // Recent actions — as checkboxes
  for (const a of actions) {
    const title = a.title || a.content?.split('\n')[0] || 'Untitled action';
    const date = formatDateShort(a.recorded_at);
    const parts = [richText('Action: ', { bold: true, color: 'orange' })];
    if (a.source_url) {
      parts.push(richText(title, { link: a.source_url }));
    } else {
      parts.push(richText(title));
    }
    parts.push(richText(` \u2014 ${date}`, { color: 'gray' }));
    items.push(todoItem(parts));
  }

  // Staleness signal
  if (meetings.length > 0) {
    const lastMeetingDays = daysAgo(meetings[0].recorded_at);
    if (lastMeetingDays !== null && lastMeetingDays > 60) {
      items.push(todoItem([
        richText('Schedule a meeting ', { bold: true, color: 'red' }),
        richText(`(last one was ${lastMeetingDays} days ago)`, { color: 'gray' }),
      ]));
    }
  } else {
    items.push(todoItem([
      richText('Schedule first meeting', { bold: true, color: 'red' }),
    ]));
  }

  // Upcoming milestones from project config
  if (project.launch_date) {
    const d = daysAgo(project.launch_date);
    if (d !== null && d <= 0) {
      const dateStr = formatDate(project.launch_date);
      const urgency = Math.abs(d) <= 7 ? 'red' : 'orange';
      items.push(todoItem([
        richText('Launch: ', { bold: true, color: urgency }),
        richText(`${dateStr}`),
        richText(d === 0 ? ' (TODAY!)' : ` (in ${Math.abs(d)} days)`, { bold: true }),
      ]));
    }
  }

  if (project.key_deliverables?.length) {
    for (const del of project.key_deliverables.slice(0, 3)) {
      items.push(todoItem([
        richText(del),
      ]));
    }
  }

  // Choose callout color based on content
  const hasUrgent = decisions.length > 0 || actions.length > 0;
  const calloutColor = hasUrgent ? 'orange_background' : 'green_background';
  const calloutEmoji = hasUrgent ? '\u{1F3AF}' : '\u2705';
  const calloutText = hasUrgent
    ? `${decisions.length + actions.length} item${decisions.length + actions.length === 1 ? '' : 's'} need attention`
    : 'All clear \u2014 no pending decisions or actions';

  return {
    callout: calloutBlock([richText(calloutText, { bold: true })], calloutEmoji, calloutColor),
    items,
  };
}

function buildPipelineSection(pipeline) {
  const total = pipeline.reduce((sum, p) => sum + (Number(p.monetary_value) || 0), 0);
  const blocks = [];

  if (total > 0) {
    blocks.push(calloutBlock([
      richText(`$${total.toLocaleString()}`, { bold: true }),
      richText(` across ${pipeline.length} open opportunit${pipeline.length === 1 ? 'y' : 'ies'}`),
    ], '\u{1F4B0}', 'blue_background'));
  }

  for (const p of pipeline) {
    const val = p.monetary_value ? `$${Number(p.monetary_value).toLocaleString()}` : '';
    const stage = p.stage_name ? ` \u2014 ${p.stage_name}` : '';
    const parts = [richText(p.name, { bold: true })];
    if (val) parts.push(richText(` \u2014 ${val}`));
    if (stage) parts.push(richText(stage, { color: 'gray' }));
    blocks.push(bulletItem(parts));
  }

  // Dashboard link
  blocks.push(paragraph([
    richText('\u2192 ', { color: 'gray' }),
    richText('Full pipeline on Dashboard', { link: `${DASHBOARD_BASE_URL}/projects`, color: 'gray', italic: true }),
  ]));

  return blocks;
}

function buildRecentActivity(meetings, decisions) {
  // Interleave meetings and decisions by date
  const items = [];

  for (const m of meetings) {
    items.push({
      date: new Date(m.recorded_at),
      type: 'meeting',
      data: m,
    });
  }

  for (const d of decisions) {
    items.push({
      date: new Date(d.recorded_at),
      type: 'decision',
      data: d,
    });
  }

  // Sort by date descending
  items.sort((a, b) => b.date - a.date);

  // Take top 8
  return items.slice(0, 8).map(item => {
    const date = formatDateShort(item.data.recorded_at);

    if (item.type === 'meeting') {
      const m = item.data;
      const title = m.title || 'Untitled meeting';
      const snippet = m.summary ? m.summary.slice(0, 120).trim() + (m.summary.length > 120 ? '...' : '') : '';

      const parts = [];
      if (m.source_url) {
        parts.push(richText(title, { link: m.source_url, bold: true }));
      } else {
        parts.push(richText(title, { bold: true }));
      }
      parts.push(richText(` \u2014 ${date}`, { color: 'gray' }));
      if (snippet) parts.push(richText(`\n${snippet}`, { color: 'gray' }));
      return bulletItem(parts);
    }

    // Decision
    const d = item.data;
    const title = d.title || 'Untitled decision';
    const parts = [
      richText('Decision: ', { italic: true, color: 'purple' }),
    ];
    if (d.source_url) {
      parts.push(richText(title, { link: d.source_url }));
    } else {
      parts.push(richText(title));
    }
    parts.push(richText(` \u2014 ${date}`, { color: 'gray' }));
    return bulletItem(parts);
  });
}

function buildPeopleSection(contacts, lastEngaged, code) {
  const blocks = [];

  // Summary line
  const summaryParts = [
    richText(`${contacts.length} people`, { bold: true }),
  ];
  if (lastEngaged !== null) {
    summaryParts.push(richText(` \u00B7 Last engaged ${daysAgoLabel(lastEngaged)}`, { color: 'gray' }));
  }
  summaryParts.push(richText('  \u2192  ', { color: 'gray' }));
  summaryParts.push(richText('Full list on Dashboard', { link: `${DASHBOARD_BASE_URL}/people`, color: 'gray', italic: true }));

  blocks.push(heading3('\u{1F465} Key People'));
  blocks.push(paragraph(summaryParts));

  // List top 8 contacts by name
  for (const c of contacts.slice(0, 8)) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
    const parts = [richText(name, { bold: true })];
    if (c.company_name) parts.push(richText(` \u2014 ${c.company_name}`, { color: 'gray' }));
    if (c.last_contact_date) {
      const ago = daysAgo(c.last_contact_date);
      parts.push(richText(` (${daysAgoLabel(ago)})`, { color: 'gray' }));
    }
    blocks.push(bulletItem(parts));
  }

  if (contacts.length > 8) {
    blocks.push(paragraph([
      richText(`+ ${contacts.length - 8} more \u2192 `, { color: 'gray' }),
      richText('Dashboard', { link: `${DASHBOARD_BASE_URL}/people`, color: 'gray', italic: true }),
    ]));
  }

  return blocks;
}

function buildFooter(code, lastActivity) {
  const base = DASHBOARD_BASE_URL;
  const now = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const parts = [
    richText(`Updated ${now}`, { color: 'gray', italic: true }),
  ];

  if (lastActivity) {
    const ago = daysAgo(lastActivity.recorded_at);
    parts.push(richText(` \u00B7 Last active ${daysAgoLabel(ago)}`, { color: 'gray', italic: true }));
  }

  parts.push(richText('  \u00B7  ', { color: 'gray' }));
  parts.push(richText('Dashboard', { link: `${base}/projects/${code}` }));
  parts.push(richText('  \u00B7  ', { color: 'gray' }));
  parts.push(richText('Pipeline', { link: `${base}/projects/${code}?tab=pipeline` }));
  parts.push(richText('  \u00B7  ', { color: 'gray' }));
  parts.push(richText('People', { link: `${base}/people` }));

  return paragraph(parts);
}

// ============================================
// Build Intelligence Blocks (main assembly)
// ============================================

async function buildIntelligenceBlocks(code, project) {
  verbose(`  Fetching data for ${code}...`);

  const [lastActivity, meetings, attentionData, pipeline, contactData, summary] = await Promise.all([
    fetchLastActivity(code),
    fetchMeetings(code),
    fetchAttentionItems(code),
    fetchPipeline(project),
    fetchKeyContacts(project),
    fetchAISummary(code),
  ]);

  const { decisions, actions } = attentionData;
  const { contacts, lastEngaged } = contactData;

  verbose(`  Meetings: ${meetings.length}, Decisions: ${decisions.length}, Actions: ${actions.length}, Pipeline: ${pipeline.length}, Contacts: ${contacts.length}, Summary: ${summary ? 'yes' : 'no'}, Last active: ${lastActivity ? daysAgoLabel(daysAgo(lastActivity.recorded_at)) : 'never'}`);

  const blocks = [];

  // 1. Marker heading
  blocks.push(heading2(SECTION_MARKER));

  // 2. LCAA tags line
  const lcaaLine = buildLCAALine(project);
  if (lcaaLine) blocks.push(lcaaLine);

  // 3. AI Summary callout (purple, only if available)
  if (summary?.summary_text) {
    blocks.push(calloutBlock([
      richText(summary.summary_text, { italic: true }),
      richText(`\n\u2014 AI summary, ${formatDateShort(summary.generated_at)}`, { color: 'gray', italic: true }),
    ], '\u{1F9E0}', 'purple_background'));
  }

  // 4. "What Needs Attention" callout
  const attention = buildAttentionCallout(decisions, actions, meetings, project);
  blocks.push(attention.callout);
  blocks.push(...attention.items);

  // 5. Opportunities & Funding (only if pipeline exists)
  if (pipeline.length > 0) {
    blocks.push(heading3('\u{1F4B0} Opportunities'));
    blocks.push(...buildPipelineSection(pipeline));
  }

  // Funding from project config (if no pipeline deals but config has funding)
  if (pipeline.length === 0 && project.funding?.total) {
    blocks.push(heading3('\u{1F4B0} Funding'));
    blocks.push(calloutBlock([
      richText(`$${project.funding.total.toLocaleString()}`, { bold: true }),
      richText(' allocated'),
    ], '\u{1F4B0}', 'blue_background'));
  }

  // 6. Recent Activity (meetings + decisions interleaved by date)
  const activityBlocks = buildRecentActivity(meetings, decisions);
  if (activityBlocks.length > 0) {
    blocks.push(heading3('\u{1F4DD} Recent Activity'));
    blocks.push(...activityBlocks);
  }

  // 7. Key People (names listed)
  if (contacts.length > 0) {
    blocks.push(...buildPeopleSection(contacts, lastEngaged, code));
  }

  // 8. Footer with timestamp + dashboard links
  blocks.push(divider());
  blocks.push(buildFooter(code, lastActivity));

  return blocks;
}

// ============================================
// Notion Page Update
// ============================================

async function findSectionRange(pageId) {
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

  // Find the marker heading (or old Dashboard Links callout)
  let markerIndex = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_2' && block.heading_2?.rich_text) {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('Project Intelligence')) {
        markerIndex = i;
        break;
      }
    }
    if (block.type === 'callout' && block.callout?.rich_text) {
      const text = block.callout.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('Dashboard Links')) {
        markerIndex = i;
        break;
      }
    }
  }

  if (markerIndex === -1) return { blockIdsToDelete: [], insertAfterId: null };

  // Collect block IDs from marker until next heading_1 or unrelated heading_2
  const blockIdsToDelete = [allBlocks[markerIndex].id];
  const ourSubheadings = [
    'Recent Meetings', 'Action Items', 'Pipeline', 'AI Summary',
    'Key Decisions', 'Open Actions', 'Key People', 'Milestones',
    'Opportunities', 'Recent Activity', 'Funding',
  ];

  for (let i = markerIndex + 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_1') break;
    if (block.type === 'heading_2') {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (!ourSubheadings.some(h => text.includes(h))) break;
    }
    blockIdsToDelete.push(block.id);
  }

  const insertAfterId = markerIndex > 0 ? allBlocks[markerIndex - 1].id : null;
  return { blockIdsToDelete, insertAfterId };
}

async function updateProjectPage(code, project) {
  const pageId = project.notion_page_id || project.notion_id;
  if (!pageId) {
    verbose(`  ${code}: No notion_page_id, skipping`);
    return { status: 'skipped', reason: 'no_page_id' };
  }

  if (DRY_RUN) {
    const blocks = await buildIntelligenceBlocks(code, project);
    log(`  [DRY RUN] ${code} (${project.name}): Would push ${blocks.length} blocks to page ${pageId}`);
    return { status: 'dry_run' };
  }

  try {
    const blocks = await buildIntelligenceBlocks(code, project);
    await sleep(350);

    const { blockIdsToDelete, insertAfterId } = await findSectionRange(pageId);
    await sleep(350);

    // Delete old blocks
    if (blockIdsToDelete.length > 0) {
      verbose(`  ${code}: Deleting ${blockIdsToDelete.length} existing blocks`);
      for (const blockId of blockIdsToDelete) {
        try {
          await notion.blocks.delete({ block_id: blockId });
          await sleep(200);
        } catch (err) {
          verbose(`  ${code}: Warning - could not delete block ${blockId}: ${err.message}`);
        }
      }
    }

    // Append new blocks
    verbose(`  ${code}: Appending ${blocks.length} blocks`);
    const batchSize = 100;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      const appendOpts = { block_id: pageId, children: batch };
      if (i === 0 && insertAfterId) appendOpts.after = insertAfterId;
      await notion.blocks.children.append(appendOpts);
      await sleep(500);
    }

    return { status: blockIdsToDelete.length > 0 ? 'updated' : 'created' };
  } catch (err) {
    log(`  ${code}: ERROR - ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Notion Project Intelligence Sync (v2) ===');
  if (DRY_RUN) log('DRY RUN MODE - no changes will be made');
  log(`Dashboard URL: ${DASHBOARD_BASE_URL}`);
  log('');

  const projects = projectCodesData.projects;
  const codes = projectFilter
    ? [projectFilter]
    : Object.keys(projects).filter(code => {
        const p = projects[code];
        return (p.notion_page_id || p.notion_id) && p.status !== 'archived';
      });

  log(`Processing ${codes.length} projects...`);

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0, dry_run: 0 };

  for (const code of codes) {
    const project = projects[code];
    if (!project) {
      log(`  ${code}: Not found in project-codes.json`);
      stats.errors++;
      continue;
    }

    log(`  ${code}: ${project.name}`);
    const result = await updateProjectPage(code, project);
    stats[result.status] = (stats[result.status] || 0) + 1;
    await sleep(1000);
  }

  log('');
  log('=== Summary ===');
  log(`Created: ${stats.created}`);
  log(`Updated: ${stats.updated}`);
  log(`Skipped: ${stats.skipped}`);
  log(`Errors:  ${stats.errors}`);
  if (DRY_RUN) log(`Dry run: ${stats.dry_run}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
