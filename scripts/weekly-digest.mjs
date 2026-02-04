#!/usr/bin/env node
/**
 * Weekly Digest Generator
 *
 * Generates a comprehensive weekly retrospective covering:
 * - What happened this week across all projects
 * - Relationship changes (who got warmer/colder)
 * - Financial summary
 * - Key decisions made
 * - Upcoming week preview
 *
 * Stores digest in project_summaries with project_code='_WEEKLY'
 * and serves via /api/briefing/weekly
 *
 * Usage:
 *   node scripts/weekly-digest.mjs
 *   node scripts/weekly-digest.mjs --dry-run
 *   node scripts/weekly-digest.mjs --verbose
 *
 * Schedule: Sunday 6pm AEST
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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SCRIPT_NAME = 'weekly-digest';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA COLLECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function collectWeekData() {
  const weekStart = daysAgo(7);

  // 1. Project summaries from this week
  const { data: projectSummaries } = await supabase
    .from('project_summaries')
    .select('project_code, summary_text, stats, generated_at')
    .gte('generated_at', weekStart)
    .neq('project_code', '_WEEKLY')
    .order('generated_at', { ascending: false });

  // Deduplicate — keep latest per project
  const latestByProject = {};
  for (const s of projectSummaries || []) {
    if (!latestByProject[s.project_code]) {
      latestByProject[s.project_code] = s;
    }
  }

  // 2. Knowledge items this week
  const { data: knowledge } = await supabase
    .from('project_knowledge')
    .select('project_code, title, knowledge_type, importance, action_required, recorded_at')
    .gte('recorded_at', weekStart)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // 3. Communications stats
  const { data: comms } = await supabase
    .from('communications_history')
    .select('direction, channel, sentiment, project_codes')
    .gte('occurred_at', weekStart);

  // 4. Relationship changes
  const { data: coolingContacts } = await supabase
    .from('ghl_contacts')
    .select('full_name, engagement_status, temperature, temperature_trend')
    .eq('temperature_trend', 'cooling')
    .not('full_name', 'is', null)
    .limit(10);

  const { data: warmingContacts } = await supabase
    .from('ghl_contacts')
    .select('full_name, engagement_status, temperature, temperature_trend')
    .eq('temperature_trend', 'warming')
    .not('full_name', 'is', null)
    .limit(10);

  // 5. Pipeline summary
  const { data: opportunities } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, status, stage_name, updated_at')
    .gte('updated_at', weekStart);

  // 6. Decisions made
  const { data: decisions } = await supabase
    .from('project_knowledge')
    .select('project_code, title, content, decision_status, recorded_at')
    .eq('knowledge_type', 'decision')
    .gte('recorded_at', weekStart)
    .order('recorded_at', { ascending: false });

  // 7. Upcoming calendar (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: upcomingEvents } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, location')
    .gte('start_time', new Date().toISOString())
    .lte('start_time', nextWeek.toISOString())
    .order('start_time', { ascending: true })
    .limit(15);

  return {
    projectSummaries: Object.values(latestByProject),
    knowledge: knowledge || [],
    comms: comms || [],
    coolingContacts: coolingContacts || [],
    warmingContacts: warmingContacts || [],
    opportunities: opportunities || [],
    decisions: decisions || [],
    upcomingEvents: upcomingEvents || [],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DIGEST GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function generateDigest(data) {
  // Build context
  const sections = [];

  // Project activity
  if (data.projectSummaries.length > 0) {
    const projLines = data.projectSummaries
      .map(s => `  ${s.project_code}: ${s.summary_text.substring(0, 200)}...`)
      .join('\n');
    sections.push(`PROJECT SUMMARIES:\n${projLines}`);
  }

  // Communications
  const commStats = {
    total: data.comms.length,
    inbound: data.comms.filter(c => c.direction === 'inbound').length,
    outbound: data.comms.filter(c => c.direction === 'outbound').length,
  };
  sections.push(`COMMUNICATIONS: ${commStats.total} total (${commStats.inbound} in, ${commStats.outbound} out)`);

  // Relationship changes
  if (data.coolingContacts.length > 0 || data.warmingContacts.length > 0) {
    const relLines = [];
    if (data.warmingContacts.length > 0) {
      relLines.push(`  Warming: ${data.warmingContacts.map(c => c.full_name).join(', ')}`);
    }
    if (data.coolingContacts.length > 0) {
      relLines.push(`  Cooling: ${data.coolingContacts.map(c => c.full_name).join(', ')}`);
    }
    sections.push(`RELATIONSHIP CHANGES:\n${relLines.join('\n')}`);
  }

  // Pipeline
  if (data.opportunities.length > 0) {
    const wonOpps = data.opportunities.filter(o => o.status === 'won');
    const openOpps = data.opportunities.filter(o => o.status === 'open');
    const totalValue = data.opportunities.reduce((s, o) => s + (o.monetary_value || 0), 0);
    sections.push(`PIPELINE: ${data.opportunities.length} opportunities moved ($${totalValue.toLocaleString()}). ${wonOpps.length} won, ${openOpps.length} open.`);
  }

  // Decisions
  if (data.decisions.length > 0) {
    const decLines = data.decisions.map(d => `  [${d.project_code}] ${d.title}`).join('\n');
    sections.push(`DECISIONS MADE (${data.decisions.length}):\n${decLines}`);
  }

  // Knowledge activity
  const knowledgeByType = {};
  for (const k of data.knowledge) {
    knowledgeByType[k.knowledge_type] = (knowledgeByType[k.knowledge_type] || 0) + 1;
  }
  if (data.knowledge.length > 0) {
    const typeStr = Object.entries(knowledgeByType).map(([t, c]) => `${c} ${t}s`).join(', ');
    sections.push(`KNOWLEDGE: ${data.knowledge.length} items (${typeStr})`);
  }

  // Upcoming
  if (data.upcomingEvents.length > 0) {
    const eventLines = data.upcomingEvents.slice(0, 8).map(e => {
      const date = new Date(e.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      return `  ${date}: ${e.title}`;
    }).join('\n');
    sections.push(`UPCOMING WEEK (${data.upcomingEvents.length} events):\n${eventLines}`);
  }

  const context = sections.join('\n\n');

  if (verbose) {
    console.log('Digest context:\n' + context);
  }

  const digestText = await trackedCompletion(
    [
      {
        role: 'system',
        content: `You write weekly digest summaries for ACT (A Curious Tractor), a social enterprise.
Write a 4-5 paragraph retrospective covering:
1. This Week's Highlights — what moved forward
2. Relationships — who's warming/cooling, who needs outreach
3. Decisions & Actions — key decisions made, what's pending
4. Looking Ahead — upcoming events, priorities for next week

Be specific, warm but professional. Use names and numbers. No markdown — plain text paragraphs.
Max 500 words.`,
      },
      {
        role: 'user',
        content: `Generate the weekly digest for the week ending ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}:\n\n${context}`,
      },
    ],
    SCRIPT_NAME,
    {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 800,
      operation: 'weekly_digest',
    }
  );

  return {
    digestText: digestText.trim(),
    stats: {
      projectCount: data.projectSummaries.length,
      communicationCount: commStats.total,
      knowledgeCount: data.knowledge.length,
      decisionCount: data.decisions.length,
      coolingContacts: data.coolingContacts.length,
      warmingContacts: data.warmingContacts.length,
      upcomingEvents: data.upcomingEvents.length,
      pipelineMovement: data.opportunities.length,
    },
    weekEnd: new Date().toISOString(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('=== Weekly Digest Generator ===');
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  if (dryRun) console.log('DRY RUN — no database writes');
  console.log('');

  // Collect data
  console.log('Collecting week data...');
  const data = await collectWeekData();
  console.log(`  ${data.projectSummaries.length} project summaries`);
  console.log(`  ${data.comms.length} communications`);
  console.log(`  ${data.knowledge.length} knowledge items`);
  console.log(`  ${data.decisions.length} decisions`);
  console.log(`  ${data.coolingContacts.length} cooling, ${data.warmingContacts.length} warming contacts`);
  console.log(`  ${data.upcomingEvents.length} upcoming events`);
  console.log('');

  // Generate digest
  console.log('Generating digest...');
  const result = await generateDigest(data);
  console.log(`  Digest: ${result.digestText.length} chars`);
  console.log('');

  if (verbose) {
    console.log('--- DIGEST ---');
    console.log(result.digestText);
    console.log('--- END ---');
    console.log('');
  }

  // Store
  if (!dryRun) {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('project_summaries')
      .upsert({
        project_code: '_WEEKLY',
        summary_text: result.digestText,
        data_sources_used: ['project_summaries', 'communications', 'contacts', 'pipeline', 'knowledge', 'calendar'],
        stats: result.stats,
        summary_date: today,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_code,summary_date',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Failed to store digest:', error.message);
    } else {
      console.log('Digest stored in project_summaries (code: _WEEKLY)');
    }
  }

  console.log('=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
