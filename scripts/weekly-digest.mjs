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
  const prevWeekStart = daysAgo(14);

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

  // 3. Communications — this week + last week for comparison
  const [{ data: comms }, { data: prevComms }] = await Promise.all([
    supabase
      .from('communications_history')
      .select('direction, channel, sentiment, project_codes')
      .gte('occurred_at', weekStart),
    supabase
      .from('communications_history')
      .select('direction')
      .gte('occurred_at', prevWeekStart)
      .lt('occurred_at', weekStart),
  ]);

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

  // 8. Xero spend — this week + last week for comparison
  const [{ data: xeroThisWeek }, { data: xeroLastWeek }] = await Promise.all([
    supabase.from('xero_transactions').select('total').gte('date', daysAgo(7).split('T')[0]),
    supabase.from('xero_transactions').select('total').gte('date', daysAgo(14).split('T')[0]).lt('date', daysAgo(7).split('T')[0]),
  ]);

  // 9. Knowledge items last week for comparison
  const { count: prevKnowledgeCount } = await supabase
    .from('project_knowledge')
    .select('id', { count: 'exact', head: true })
    .gte('recorded_at', prevWeekStart)
    .lt('recorded_at', weekStart);

  // 10. Grants — new opportunities + active applications
  const [{ data: newGrants }, { data: activeApps }, { count: totalOpen }] = await Promise.all([
    supabase
      .from('grant_opportunities')
      .select('name, provider, fit_score, relevance_score, amount_max, closes_at')
      .gte('created_at', weekStart)
      .order('relevance_score', { ascending: false })
      .limit(5),
    supabase
      .from('grant_applications')
      .select('application_name, status, amount_requested')
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),
    supabase
      .from('grant_opportunities')
      .select('id', { count: 'exact', head: true }),
  ]);

  // 11. Grant pipeline health
  const nextWeekDate = new Date(Date.now() + 7 * 86400000).toISOString();
  const [
    { count: enrichedCount },
    { count: unenrichedCount },
    { data: deadlinesThisWeek },
    { data: staleGrants },
    { count: autoCreatedApps },
  ] = await Promise.all([
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }).not('enriched_at', 'is', null),
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }).is('enriched_at', null),
    supabase.from('grant_opportunities')
      .select('name, closes_at, fit_score')
      .gte('closes_at', new Date().toISOString())
      .lte('closes_at', nextWeekDate)
      .order('closes_at', { ascending: true }),
    supabase.from('grant_opportunities')
      .select('name, application_status, fit_score')
      .eq('application_status', 'not_applied')
      .gte('fit_score', 70)
      .not('enriched_at', 'is', null)
      .limit(5),
    supabase.from('grant_applications').select('id', { count: 'exact', head: true }).eq('auto_created', true).gte('created_at', weekStart),
  ]);

  return {
    projectSummaries: Object.values(latestByProject),
    knowledge: knowledge || [],
    comms: comms || [],
    prevComms: prevComms || [],
    coolingContacts: coolingContacts || [],
    warmingContacts: warmingContacts || [],
    opportunities: opportunities || [],
    decisions: decisions || [],
    upcomingEvents: upcomingEvents || [],
    xeroThisWeek: xeroThisWeek || [],
    xeroLastWeek: xeroLastWeek || [],
    prevKnowledgeCount: prevKnowledgeCount || 0,
    newGrants: newGrants || [],
    activeApps: activeApps || [],
    totalOpenGrants: totalOpen || 0,
    grantPipelineHealth: {
      enrichedCount: enrichedCount || 0,
      unenrichedCount: unenrichedCount || 0,
      deadlinesThisWeek: deadlinesThisWeek || [],
      staleHighFit: staleGrants || [],
      autoCreatedApps: autoCreatedApps || 0,
    },
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

  // Communications with week-over-week
  const commStats = {
    total: data.comms.length,
    inbound: data.comms.filter(c => c.direction === 'inbound').length,
    outbound: data.comms.filter(c => c.direction === 'outbound').length,
    prevTotal: data.prevComms.length,
  };
  const commDelta = commStats.total - commStats.prevTotal;
  const commTrend = commDelta > 0 ? `+${commDelta} vs last week` : commDelta < 0 ? `${commDelta} vs last week` : 'same as last week';
  sections.push(`COMMUNICATIONS: ${commStats.total} total (${commStats.inbound} in, ${commStats.outbound} out) — ${commTrend}`);

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

  // Knowledge activity with week-over-week
  const knowledgeByType = {};
  for (const k of data.knowledge) {
    knowledgeByType[k.knowledge_type] = (knowledgeByType[k.knowledge_type] || 0) + 1;
  }
  if (data.knowledge.length > 0) {
    const typeStr = Object.entries(knowledgeByType).map(([t, c]) => `${c} ${t}s`).join(', ');
    const kDelta = data.knowledge.length - data.prevKnowledgeCount;
    const kTrend = kDelta > 0 ? `+${kDelta} vs last week` : kDelta < 0 ? `${kDelta} vs last week` : 'same as last week';
    sections.push(`KNOWLEDGE: ${data.knowledge.length} items (${typeStr}) — ${kTrend}`);
  }

  // Financial — spend comparison
  const spendThisWeek = data.xeroThisWeek.reduce((s, t) => s + Math.abs(parseFloat(t.total) || 0), 0);
  const spendLastWeek = data.xeroLastWeek.reduce((s, t) => s + Math.abs(parseFloat(t.total) || 0), 0);
  if (spendThisWeek > 0 || spendLastWeek > 0) {
    const spendDelta = spendThisWeek - spendLastWeek;
    const spendTrend = spendDelta > 0 ? `+$${spendDelta.toFixed(0)} vs last week` : spendDelta < 0 ? `-$${Math.abs(spendDelta).toFixed(0)} vs last week` : 'same as last week';
    sections.push(`SPEND: $${spendThisWeek.toFixed(0)} this week (${data.xeroThisWeek.length} transactions) — ${spendTrend}`);
  }

  // Grants
  {
    const grantLines = [];
    if (data.newGrants.length > 0) {
      const topGrants = data.newGrants.slice(0, 3).map(g => `${g.name} (${g.provider}, fit ${g.fit_score ?? g.relevance_score ?? '?'}%)`).join('; ');
      grantLines.push(`  New this week: ${data.newGrants.length} opportunities. Top: ${topGrants}`);
    }
    if (data.activeApps.length > 0) {
      const pipelineValue = data.activeApps.reduce((s, a) => s + (a.amount_requested || 0), 0);
      grantLines.push(`  Active applications: ${data.activeApps.length} ($${pipelineValue.toLocaleString()} pipeline)`);
    }
    grantLines.push(`  Total open opportunities: ${data.totalOpenGrants}`);

    // Pipeline health
    const ph = data.grantPipelineHealth;
    const enrichPct = (ph.enrichedCount + ph.unenrichedCount) > 0
      ? Math.round(ph.enrichedCount / (ph.enrichedCount + ph.unenrichedCount) * 100)
      : 0;
    grantLines.push(`  Enrichment coverage: ${enrichPct}% (${ph.enrichedCount} enriched, ${ph.unenrichedCount} pending)`);

    if (ph.deadlinesThisWeek.length > 0) {
      const deadlineNames = ph.deadlinesThisWeek.map(d => {
        const days = Math.ceil((new Date(d.closes_at) - Date.now()) / 86400000);
        return `${d.name} (${days}d, fit ${d.fit_score ?? '?'}%)`;
      }).join('; ');
      grantLines.push(`  ⚠ DEADLINES THIS WEEK: ${deadlineNames}`);
    }

    if (ph.staleHighFit.length > 0) {
      const staleNames = ph.staleHighFit.map(g => `${g.name} (${g.fit_score}%)`).join('; ');
      grantLines.push(`  Action needed — high-fit but not applied: ${staleNames}`);
    }

    if (ph.autoCreatedApps > 0) {
      grantLines.push(`  Auto-created ${ph.autoCreatedApps} draft application(s) this week`);
    }

    sections.push(`GRANTS PIPELINE:\n${grantLines.join('\n')}`);
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
Write a 5-6 paragraph retrospective covering:
1. This Week's Highlights — what moved forward
2. Relationships — who's warming/cooling, who needs outreach
3. Grants & Pipeline — new opportunities, deadlines, applications status, what needs action
4. Decisions & Actions — key decisions made, what's pending
5. Looking Ahead — upcoming events, priorities for next week

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
      prevCommunicationCount: commStats.prevTotal,
      knowledgeCount: data.knowledge.length,
      prevKnowledgeCount: data.prevKnowledgeCount,
      decisionCount: data.decisions.length,
      coolingContacts: data.coolingContacts.length,
      warmingContacts: data.warmingContacts.length,
      upcomingEvents: data.upcomingEvents.length,
      pipelineMovement: data.opportunities.length,
      spendThisWeek: Math.round(spendThisWeek),
      transactionCount: data.xeroThisWeek.length,
      newGrants: data.newGrants.length,
      activeGrantApps: data.activeApps.length,
      totalOpenGrants: data.totalOpenGrants,
      grantEnrichmentPct: (data.grantPipelineHealth.enrichedCount + data.grantPipelineHealth.unenrichedCount) > 0
        ? Math.round(data.grantPipelineHealth.enrichedCount / (data.grantPipelineHealth.enrichedCount + data.grantPipelineHealth.unenrichedCount) * 100) : 0,
      grantDeadlinesThisWeek: data.grantPipelineHealth.deadlinesThisWeek.length,
      grantAutoCreatedApps: data.grantPipelineHealth.autoCreatedApps,
    },
    weekEnd: new Date().toISOString(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TELEGRAM DELIVERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendToTelegram(digestText, stats) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log('  Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return;
  }

  const weekEnd = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const header = `📊 *Weekly Digest — ${weekEnd}*\n\n`;
  const footer = `\n\n_${stats.communicationCount} comms · ${stats.knowledgeCount} knowledge items · ${stats.decisionCount} decisions · ${stats.upcomingEvents} upcoming_`;

  const message = header + digestText + footer;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    if (res.ok) {
      console.log('  Sent to Telegram');
    } else {
      const err = await res.text();
      console.error('  Telegram send failed:', err);
    }
  } catch (err) {
    console.error('  Telegram send error:', err.message);
  }
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
        data_sources_used: ['project_summaries', 'communications', 'contacts', 'pipeline', 'knowledge', 'calendar', 'xero'],
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

    // Send to Telegram
    console.log('Sending to Telegram...');
    await sendToTelegram(result.digestText, result.stats);
  }

  console.log('=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
