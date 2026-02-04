#!/usr/bin/env node
/**
 * Generate Project Summaries
 *
 * Queries all data sources per project and generates AI narrative summaries:
 * - Recent communications (last 7 days)
 * - Calendar events (upcoming week)
 * - Pipeline movement (GHL opportunities)
 * - Financial activity (Xero via ghl_opportunities)
 * - Storyteller data (Empathy Ledger)
 * - Knowledge items (meetings, decisions, actions)
 *
 * Stores in project_summaries table for dashboard display.
 *
 * Usage:
 *   node scripts/generate-project-summaries.mjs
 *   node scripts/generate-project-summaries.mjs --project=JH
 *   node scripts/generate-project-summaries.mjs --dry-run
 *   node scripts/generate-project-summaries.mjs --verbose
 *
 * Schedule: Daily after all syncs complete (9am AEST)
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { trackedCompletion } from './lib/llm-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SCRIPT_NAME = 'generate-project-summaries';

// Project codes with all known aliases (tags, knowledge codes, comm codes)
const PROJECT_CODES = [
  { code: 'JH', name: 'JusticeHub', aliases: ['justicehub', 'justice', 'ACT-JH'] },
  { code: 'EL', name: 'Empathy Ledger', aliases: ['empathy-ledger', 'empathy ledger', 'ACT-EL'] },
  { code: 'TH', name: 'The Harvest', aliases: ['harvest', 'the-harvest', 'ACT-HV'] },
  { code: 'TF', name: 'The Farm', aliases: ['farm', 'the-farm', 'ACT-TF'] },
  { code: 'TS', name: 'The Studio', aliases: ['studio', 'the-studio', 'act-regenerative-studio', 'ACT-TS'] },
  { code: 'GD', name: 'Goods', aliases: ['goods', 'GOODS', 'ACT-GD'] },
  { code: 'WT', name: 'World Tour', aliases: ['world-tour', 'world tour', 'ACT-WT'] },
  { code: 'PICC', name: 'PICC', aliases: ['picc', 'palm-island', 'ACT-PI'] },
  { code: 'OPS', name: 'Operations', aliases: ['operations', 'ops', 'ACT-OP'] },
  { code: 'ACT', name: 'ACT Global', aliases: ['act', 'act-global', 'ACT-10'] },
];

// CLI args
const args = process.argv.slice(2);
const projectFilter = args.find(a => a.startsWith('--project='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA GATHERING PER PROJECT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gatherProjectData(code, name, aliases = []) {
  const allCodes = [code, name, ...aliases];
  const allCodesLower = allCodes.map(c => c.toLowerCase());
  const sources = [];

  // 1. Recent communications (last 7 days) — match any alias in project_codes array
  const { data: comms } = await supabase
    .from('communications_history')
    .select('subject, summary, direction, sentiment, occurred_at, channel')
    .overlaps('project_codes', allCodes)
    .gte('occurred_at', daysAgo(7))
    .order('occurred_at', { ascending: false })
    .limit(15);

  if (comms?.length) sources.push('communications');

  // 2. Knowledge items — match ACT-XX prefixed codes + bare codes
  const knowledgeCodes = allCodes.filter(c => c.startsWith('ACT-') || c === code);
  const { data: knowledge } = await supabase
    .from('project_knowledge')
    .select('title, summary, content, knowledge_type, importance, action_required, follow_up_date, recorded_at')
    .in('project_code', knowledgeCodes)
    .gte('recorded_at', daysAgo(14))
    .order('recorded_at', { ascending: false })
    .limit(10);

  if (knowledge?.length) sources.push('knowledge');

  // 3. Pipeline opportunities
  const { data: opportunities } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, status, stage_name, updated_at')
    .or(allCodesLower.map(c => `project_code.ilike.${c}`).join(','))
    .order('updated_at', { ascending: false })
    .limit(10);

  if (opportunities?.length) sources.push('pipeline');

  // 4. Contacts tagged with this project — match any alias in tags array
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('id, full_name, engagement_status, last_contact_date, tags, projects')
    .overlaps('tags', allCodes)
    .order('last_contact_date', { ascending: false, nullsFirst: false })
    .limit(10);

  if (contacts?.length) sources.push('contacts');

  // 5. Overdue actions for this project
  const { data: overdueActions } = await supabase
    .from('project_knowledge')
    .select('title, follow_up_date, importance')
    .in('project_code', knowledgeCodes)
    .eq('action_required', true)
    .lt('follow_up_date', new Date().toISOString().split('T')[0])
    .order('follow_up_date', { ascending: true })
    .limit(5);

  if (overdueActions?.length) sources.push('overdue_actions');

  return {
    comms: comms || [],
    knowledge: knowledge || [],
    opportunities: opportunities || [],
    contacts: contacts || [],
    overdueActions: overdueActions || [],
    sources,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI SUMMARY GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPromptContext(code, name, data) {
  const sections = [];

  if (data.comms.length > 0) {
    const commLines = data.comms.map(c =>
      `  - [${c.direction}] ${c.channel || 'email'}: ${c.summary || c.subject || '(no subject)'} (${c.sentiment || 'neutral'})`
    ).join('\n');
    sections.push(`RECENT COMMUNICATIONS (${data.comms.length}):\n${commLines}`);
  }

  if (data.knowledge.length > 0) {
    const knLines = data.knowledge.map(k =>
      `  - [${k.knowledge_type}] ${k.title}${k.action_required ? ' (ACTION REQUIRED)' : ''}${k.importance === 'high' || k.importance === 'critical' ? ` [${k.importance.toUpperCase()}]` : ''}`
    ).join('\n');
    sections.push(`KNOWLEDGE ITEMS (${data.knowledge.length}):\n${knLines}`);
  }

  if (data.opportunities.length > 0) {
    const oppLines = data.opportunities.map(o =>
      `  - ${o.name}: $${o.monetary_value || 0} — ${o.status} (${o.stage_name || 'unknown stage'})`
    ).join('\n');
    sections.push(`PIPELINE (${data.opportunities.length}):\n${oppLines}`);
  }

  if (data.contacts.length > 0) {
    const contactLines = data.contacts.slice(0, 5).map(c =>
      `  - ${c.full_name || 'Unknown'}: ${c.engagement_status || 'unknown'} (temp: ${c.temperature || '?'})`
    ).join('\n');
    sections.push(`KEY CONTACTS (${data.contacts.length} total, top 5):\n${contactLines}`);
  }

  if (data.overdueActions.length > 0) {
    const actionLines = data.overdueActions.map(a =>
      `  - ${a.title} (due ${a.follow_up_date}, ${a.importance || 'normal'} priority)`
    ).join('\n');
    sections.push(`OVERDUE ACTIONS (${data.overdueActions.length}):\n${actionLines}`);
  }

  if (sections.length === 0) {
    return null; // No data to summarize
  }

  return sections.join('\n\n');
}

async function generateSummary(code, name, data) {
  const context = buildPromptContext(code, name, data);

  if (!context) {
    return {
      summary: `No recent activity recorded for ${name}. Awaiting data from syncs.`,
      sources: [],
      stats: { comms: 0, knowledge: 0, opportunities: 0, contacts: 0, overdueActions: 0 },
    };
  }

  const prompt = `You are summarizing project activity for "${name}" (code: ${code}), part of the ACT (A Curious Tractor) social enterprise ecosystem.

Write a concise 2-3 paragraph narrative summary covering:
1. What's happening now — key recent activity, communications, meetings
2. What needs attention — overdue actions, cooling relationships, blocked items
3. What's next — upcoming events, pipeline movement, emerging opportunities

Be specific with names, dates, and numbers. Use a warm but professional tone. Focus on actionable intelligence, not just listing data.

If there's very little data, say so honestly and suggest what to focus on.

PROJECT DATA:
${context}`;

  try {
    const summary = await trackedCompletion(
      [
        { role: 'system', content: 'You write brief, actionable project status summaries for a social enterprise dashboard. No markdown formatting — plain text paragraphs only. Max 300 words.' },
        { role: 'user', content: prompt },
      ],
      SCRIPT_NAME,
      {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 500,
        operation: `summary_${code}`,
      }
    );

    return {
      summary: summary.trim(),
      sources: data.sources,
      stats: {
        comms: data.comms.length,
        knowledge: data.knowledge.length,
        opportunities: data.opportunities.length,
        contacts: data.contacts.length,
        overdueActions: data.overdueActions.length,
      },
    };
  } catch (err) {
    console.error(`  Failed to generate summary for ${code}: ${err.message}`);
    return {
      summary: `Summary generation failed for ${name}. Error: ${err.message}`,
      sources: data.sources,
      stats: {
        comms: data.comms.length,
        knowledge: data.knowledge.length,
        opportunities: data.opportunities.length,
        contacts: data.contacts.length,
        overdueActions: data.overdueActions.length,
      },
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('=== Generate Project Summaries ===');
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  if (projectFilter) console.log(`Project filter: ${projectFilter}`);
  if (dryRun) console.log('DRY RUN — no database writes');
  console.log('');

  const projects = projectFilter
    ? PROJECT_CODES.filter(p => p.code === projectFilter.toUpperCase())
    : PROJECT_CODES;

  if (projects.length === 0) {
    console.error(`Unknown project code: ${projectFilter}`);
    process.exit(1);
  }

  let generated = 0;
  let skipped = 0;

  for (const project of projects) {
    const start = Date.now();
    if (verbose) console.log(`\n--- ${project.name} (${project.code}) ---`);

    // Gather data
    const data = await gatherProjectData(project.code, project.name, project.aliases || []);

    if (verbose) {
      console.log(`  Data: ${data.comms.length} comms, ${data.knowledge.length} knowledge, ${data.opportunities.length} opps, ${data.contacts.length} contacts`);
    }

    // Generate summary
    const result = await generateSummary(project.code, project.name, data);

    if (verbose) {
      console.log(`  Summary (${result.summary.length} chars): ${result.summary.substring(0, 100)}...`);
    }

    // Store in database (upsert on project_code + summary_date unique index)
    if (!dryRun) {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('project_summaries')
        .upsert({
          project_code: project.code,
          summary_text: result.summary,
          data_sources_used: result.sources,
          stats: result.stats,
          summary_date: today,
          generated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_code,summary_date',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`  DB error for ${project.code}: ${error.message}`);
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${project.code} ${project.name}: ${data.sources.length} sources, ${result.summary.length} chars (${elapsed}s)`);
    generated++;
  }

  console.log(`\n=== Done: ${generated} summaries generated, ${skipped} skipped ===`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
