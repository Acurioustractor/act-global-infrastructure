#!/usr/bin/env node

/**
 * Contact Signal Engine — Multi-Signal Relationship Intelligence
 *
 * Enriches relationship_health with weighted cross-domain signals:
 *   - Email recency & frequency (25%)
 *   - Calendar meetings (20%)
 *   - Financial activity (20%)
 *   - GHL pipeline stage + momentum (20%)
 *   - Knowledge mentions (15%)
 *
 * Computes temperature (0-100), detects trends, sets risk flags,
 * and generates intelligence_insights for notable changes.
 *
 * Usage:
 *   node scripts/compute-contact-signals.mjs              # Run all
 *   node scripts/compute-contact-signals.mjs --verbose     # Detailed output
 *   node scripts/compute-contact-signals.mjs --dry-run     # Preview without writing
 *   node scripts/compute-contact-signals.mjs --limit 10    # Process N contacts
 *
 * Cron: daily 3am AEST (before daily briefing at 7am)
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIGNAL WEIGHTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WEIGHTS = {
  email: 0.25,
  calendar: 0.20,
  financial: 0.20,
  pipeline: 0.20,
  knowledge: 0.15,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIGNAL SCORERS (each returns 0-100)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scoreEmailSignal(commsData) {
  // commsData: { inbound_count, outbound_count, last_inbound_days, last_outbound_days, total_30d }
  if (!commsData || commsData.total_30d === 0) return { score: 0, details: 'No recent email activity' };

  let score = 0;

  // Recency: last email within 7 days = 40pts, 14d = 25pts, 30d = 10pts
  const lastDays = Math.min(commsData.last_inbound_days ?? 999, commsData.last_outbound_days ?? 999);
  if (lastDays <= 3) score += 40;
  else if (lastDays <= 7) score += 35;
  else if (lastDays <= 14) score += 25;
  else if (lastDays <= 30) score += 10;

  // Frequency: emails in last 30 days (capped at 30pts for 10+ emails)
  score += Math.min(commsData.total_30d * 3, 30);

  // Bidirectional: both inbound + outbound = 30pts, one-way = 15pts
  const hasInbound = (commsData.inbound_30d || 0) > 0;
  const hasOutbound = (commsData.outbound_30d || 0) > 0;
  if (hasInbound && hasOutbound) score += 30;
  else if (hasInbound || hasOutbound) score += 15;

  return {
    score: Math.min(score, 100),
    details: `${commsData.total_30d} emails (30d), last ${lastDays}d ago, ${hasInbound ? 'bi' : 'uni'}-directional`,
  };
}

function scoreCalendarSignal(calData) {
  // calData: { upcoming_meetings, past_30d_meetings, next_meeting_date }
  if (!calData) return { score: 0, details: 'No calendar data' };

  let score = 0;

  // Upcoming meeting = strong signal (40pts)
  if (calData.upcoming_meetings > 0) score += 40;

  // Recent meetings in past 30 days (up to 40pts)
  score += Math.min(calData.past_30d_meetings * 15, 40);

  // Had any meeting ever (baseline 20pts)
  if (calData.past_30d_meetings > 0 || calData.upcoming_meetings > 0) score += 20;

  return {
    score: Math.min(score, 100),
    details: `${calData.upcoming_meetings} upcoming, ${calData.past_30d_meetings} past 30d`,
    next_meeting_date: calData.next_meeting_date,
  };
}

function scoreFinancialSignal(finData) {
  // finData: { open_invoice_amount, paid_90d_amount, has_invoices }
  if (!finData || !finData.has_invoices) return { score: 0, details: 'No financial activity' };

  let score = 0;

  // Open invoices = active financial relationship (40pts)
  if (finData.open_invoice_amount > 0) score += 40;

  // Paid in last 90 days (30pts)
  if (finData.paid_90d_amount > 0) score += 30;

  // Any invoice history (baseline 30pts)
  if (finData.has_invoices) score += 30;

  return {
    score: Math.min(score, 100),
    details: `Open: $${finData.open_invoice_amount?.toFixed(0) || 0}, Paid 90d: $${finData.paid_90d_amount?.toFixed(0) || 0}`,
    open_invoice_amount: finData.open_invoice_amount || 0,
  };
}

function scorePipelineSignal(pipeData) {
  // pipeData: { open_value, stage, status, days_in_stage, opportunity_count }
  if (!pipeData || pipeData.opportunity_count === 0) return { score: 0, details: 'No pipeline activity' };

  let score = 0;

  // Has open opportunities (40pts)
  if (pipeData.open_count > 0) score += 40;

  // Value weighting (up to 30pts for high-value deals)
  if (pipeData.open_value > 50000) score += 30;
  else if (pipeData.open_value > 10000) score += 20;
  else if (pipeData.open_value > 0) score += 10;

  // Stage progression (advanced stages = warmer)
  const stageScore = {
    'won': 30, 'closed won': 30,
    'proposal': 25, 'negotiation': 25,
    'qualified': 20, 'discovery': 15,
    'new': 10,
  };
  const bestStage = pipeData.best_stage?.toLowerCase() || '';
  score += stageScore[bestStage] || 10;

  return {
    score: Math.min(score, 100),
    details: `${pipeData.open_count} open opps, $${pipeData.open_value?.toFixed(0) || 0} value, stage: ${pipeData.best_stage || 'unknown'}`,
  };
}

function scoreKnowledgeSignal(knowledgeData) {
  // knowledgeData: { mention_count_30d, meeting_count_30d, has_action_items }
  if (!knowledgeData) return { score: 0, details: 'No knowledge mentions' };

  let score = 0;

  // Meeting mentions in last 30 days (up to 40pts)
  score += Math.min(knowledgeData.meeting_count_30d * 20, 40);

  // Knowledge mentions (up to 30pts)
  score += Math.min(knowledgeData.mention_count_30d * 10, 30);

  // Has open action items (30pts)
  if (knowledgeData.has_action_items) score += 30;

  return {
    score: Math.min(score, 100),
    details: `${knowledgeData.meeting_count_30d} meetings, ${knowledgeData.mention_count_30d} mentions (30d)`,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RISK FLAG DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectRiskFlags(signals, prevTemperature, newTemperature) {
  const flags = [];

  // Going cold: temperature dropped below 30 or dropped >15 points
  if (newTemperature < 30 && prevTemperature >= 30) {
    flags.push('going_cold');
  }
  if (prevTemperature - newTemperature > 15) {
    flags.push('going_cold');
  }

  // One-way outbound: we're emailing them but they're not responding
  const emailDetails = signals.email;
  if (emailDetails && emailDetails.outbound_30d > 0 && (emailDetails.inbound_30d || 0) === 0) {
    flags.push('one_way_outbound');
  }

  // Awaiting response: last comm was inbound and >3 days ago
  if (emailDetails && emailDetails.last_inbound_days !== null && emailDetails.last_inbound_days <= 7 &&
      (emailDetails.last_outbound_days === null || emailDetails.last_outbound_days > emailDetails.last_inbound_days)) {
    flags.push('awaiting_response');
  }

  // High value inactive: pipeline value >$10k but email score < 20
  if (signals.pipeline?.open_value > 10000 && signals.emailScore < 20) {
    flags.push('high_value_inactive');
  }

  return [...new Set(flags)]; // dedupe
}

function detectTrend(prevTemperature, newTemperature) {
  const diff = newTemperature - (prevTemperature || 0);
  if (diff > 5) return 'rising';
  if (diff < -5) return 'falling';
  return 'stable';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA FETCHERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchEmailSignals(contactGhlIds) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

  // Direct query approach (no RPC needed)
  {
    const result = {};
    // Batch query communications_history
    const { data: comms } = await supabase
      .from('communications_history')
      .select('ghl_contact_id, direction, occurred_at')
      .in('ghl_contact_id', contactGhlIds)
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: false });

    for (const ghlId of contactGhlIds) {
      const contactComms = (comms || []).filter(c => c.ghl_contact_id === ghlId);
      const inbound = contactComms.filter(c => c.direction === 'inbound');
      const outbound = contactComms.filter(c => c.direction === 'outbound');

      const lastInbound = inbound[0]?.occurred_at;
      const lastOutbound = outbound[0]?.occurred_at;

      result[ghlId] = {
        total_30d: contactComms.length,
        inbound_30d: inbound.length,
        outbound_30d: outbound.length,
        last_inbound_days: lastInbound ? Math.floor((now - new Date(lastInbound)) / 86400000) : null,
        last_outbound_days: lastOutbound ? Math.floor((now - new Date(lastOutbound)) / 86400000) : null,
      };
    }
    return result;
  }
}

async function fetchCalendarSignals(contactGhlIds) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000).toISOString();

  // Get calendar events that mention contacts by name or email
  // We join through ghl_contacts to get names, then search attendees
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email')
    .in('ghl_id', contactGhlIds);

  const result = {};
  for (const ghlId of contactGhlIds) {
    result[ghlId] = { upcoming_meetings: 0, past_30d_meetings: 0, next_meeting_date: null };
  }

  if (!contacts || contacts.length === 0) return result;

  // Get all calendar events in the window
  const { data: events } = await supabase
    .from('calendar_events')
    .select('start_time, attendees, title')
    .gte('start_time', thirtyDaysAgo)
    .lte('start_time', thirtyDaysAhead)
    .order('start_time', { ascending: true });

  if (!events) return result;

  // Match events to contacts by attendee email or name in title
  for (const contact of contacts) {
    const contactEvents = events.filter(e => {
      const attendeeList = JSON.stringify(e.attendees || []).toLowerCase();
      const title = (e.title || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const name = (contact.full_name || '').toLowerCase();
      return (email && attendeeList.includes(email)) || (name && title.includes(name));
    });

    const upcoming = contactEvents.filter(e => new Date(e.start_time) > now);
    const past = contactEvents.filter(e => new Date(e.start_time) <= now);

    result[contact.ghl_id] = {
      upcoming_meetings: upcoming.length,
      past_30d_meetings: past.length,
      next_meeting_date: upcoming[0]?.start_time || null,
    };
  }

  return result;
}

async function fetchFinancialSignals(contactGhlIds) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now - 90 * 86400000).toISOString();

  const result = {};
  for (const ghlId of contactGhlIds) {
    result[ghlId] = { open_invoice_amount: 0, paid_90d_amount: 0, has_invoices: false };
  }

  // Get contacts with emails for Xero matching
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, email, full_name')
    .in('ghl_id', contactGhlIds)
    .not('email', 'is', null);

  if (!contacts || contacts.length === 0) return result;

  // Query xero_invoices for matching contact names/emails
  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('contact_name, status, amount_due, total, date')
    .or(contacts.map(c => `contact_name.ilike.%${(c.full_name || '').split(' ')[0]}%`).filter(Boolean).join(','));

  if (!invoices) return result;

  for (const contact of contacts) {
    const name = contact.full_name || '';
    const firstName = name.split(' ')[0]?.toLowerCase();
    if (!firstName) continue;

    const contactInvoices = invoices.filter(inv =>
      inv.contact_name?.toLowerCase().includes(firstName)
    );

    if (contactInvoices.length === 0) continue;

    const openAmount = contactInvoices
      .filter(inv => ['AUTHORISED', 'SUBMITTED'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.amount_due || 0), 0);

    const paidAmount = contactInvoices
      .filter(inv => inv.status === 'PAID' && inv.date >= ninetyDaysAgo)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    result[contact.ghl_id] = {
      open_invoice_amount: openAmount,
      paid_90d_amount: paidAmount,
      has_invoices: true,
    };
  }

  return result;
}

async function fetchPipelineSignals(contactGhlIds) {
  const result = {};
  for (const ghlId of contactGhlIds) {
    result[ghlId] = { open_count: 0, open_value: 0, best_stage: null, opportunity_count: 0 };
  }

  const { data: opportunities } = await supabase
    .from('ghl_opportunities')
    .select('contact_id, status, monetary_value, stage_name, pipeline_name')
    .in('contact_id', contactGhlIds);

  if (!opportunities) return result;

  for (const ghlId of contactGhlIds) {
    const contactOpps = opportunities.filter(o => o.contact_id === ghlId);
    const openOpps = contactOpps.filter(o => o.status === 'open');

    result[ghlId] = {
      opportunity_count: contactOpps.length,
      open_count: openOpps.length,
      open_value: openOpps.reduce((sum, o) => sum + (o.monetary_value || 0), 0),
      best_stage: openOpps[0]?.stage_name || contactOpps[0]?.stage_name || null,
    };
  }

  return result;
}

async function fetchKnowledgeSignals(contactGhlIds) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const result = {};
  for (const ghlId of contactGhlIds) {
    result[ghlId] = { mention_count_30d: 0, meeting_count_30d: 0, has_action_items: false };
  }

  // Get contacts with names for knowledge matching
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name')
    .in('ghl_id', contactGhlIds)
    .not('full_name', 'is', null);

  if (!contacts || contacts.length === 0) return result;

  // Query project_knowledge for mentions of contact names
  const { data: knowledge } = await supabase
    .from('project_knowledge')
    .select('title, summary, participants, knowledge_type, action_required, recorded_at')
    .gte('recorded_at', thirtyDaysAgo)
    .limit(200);

  if (!knowledge) return result;

  for (const contact of contacts) {
    const name = contact.full_name?.toLowerCase();
    if (!name || name.length < 3) continue;

    const mentions = knowledge.filter(k => {
      const text = `${k.title || ''} ${k.summary || ''} ${JSON.stringify(k.participants || [])}`.toLowerCase();
      return text.includes(name);
    });

    const meetings = mentions.filter(k => k.knowledge_type === 'meeting_note');
    const hasActions = mentions.some(k => k.action_required);

    result[contact.ghl_id] = {
      mention_count_30d: mentions.length,
      meeting_count_30d: meetings.length,
      has_action_items: hasActions,
    };
  }

  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSIGHT GENERATION (for notable changes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function insertInsight(insight, dryRun) {
  if (insight.dedup_key) {
    const { data: existing } = await supabase
      .from('intelligence_insights')
      .select('id')
      .eq('dedup_key', insight.dedup_key)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existing) return null;
  }

  if (dryRun) {
    console.log(`  [DRY] ${insight.insight_type}: ${insight.title}`);
    return insight;
  }

  const { data, error } = await supabase
    .from('intelligence_insights')
    .insert(insight)
    .select('id')
    .single();

  if (error) {
    console.error(`  [ERR] Insight insert failed: ${error.message}`);
    return null;
  }

  return data;
}

async function generateChangeInsights(contactName, ghlId, prevTemp, newTemp, trend, riskFlags, dryRun) {
  const today = new Date().toISOString().slice(0, 10);

  // Temperature drop > 15 points
  if (prevTemp && prevTemp - newTemp > 15) {
    await insertInsight({
      insight_type: 'relationship_change',
      title: `${contactName} temperature dropped ${prevTemp - newTemp} points`,
      description: `Relationship temperature fell from ${prevTemp} to ${newTemp}. ${riskFlags.length > 0 ? `Risk flags: ${riskFlags.join(', ')}` : 'No specific risk flags.'}`,
      priority: prevTemp - newTemp > 25 ? 'high' : 'medium',
      data: {
        contact_id: ghlId,
        contact_name: contactName,
        previous_temperature: prevTemp,
        new_temperature: newTemp,
        trend,
        risk_flags: riskFlags,
      },
      source_type: 'signal_engine',
      dedup_key: `signal_drop_${ghlId}_${today}`,
      expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, dryRun);
  }

  // New risk flags
  for (const flag of riskFlags) {
    await insertInsight({
      insight_type: 'risk_flag',
      title: `${contactName}: ${flag.replace(/_/g, ' ')}`,
      description: riskFlagDescription(flag, contactName),
      priority: flag === 'high_value_inactive' ? 'high' : 'medium',
      data: {
        contact_id: ghlId,
        contact_name: contactName,
        risk_flag: flag,
        temperature: newTemp,
      },
      source_type: 'signal_engine',
      dedup_key: `risk_${flag}_${ghlId}_${today}`,
      expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, dryRun);
  }
}

function riskFlagDescription(flag, name) {
  const descriptions = {
    going_cold: `${name}'s relationship temperature has dropped significantly. Consider reaching out with a check-in or relevant update.`,
    one_way_outbound: `Emails to ${name} are going unanswered. Consider a different channel (call, meeting) or check if the contact is still engaged.`,
    awaiting_response: `${name} sent a message recently that hasn't been replied to. Prioritize a response.`,
    high_value_inactive: `${name} has significant pipeline value but minimal recent communication. High risk of deal going cold.`,
  };
  return descriptions[flag] || `Risk flag "${flag}" detected for ${name}.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 500;

  console.log('\n[Signal Engine] Contact Signal Computation');
  console.log(`  Dry run: ${dryRun}, Limit: ${limit}\n`);

  // Get all contacts that have relationship_health records OR are active/prospect
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, engagement_status')
    .in('engagement_status', ['active', 'prospect', 'lead'])
    .not('full_name', 'is', null)
    .limit(limit);

  if (error) {
    console.error('Failed to fetch contacts:', error.message);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log('No contacts found to process.');
    return;
  }

  console.log(`Processing ${contacts.length} contacts...`);

  // Get existing relationship_health records for comparison
  const ghlIds = contacts.map(c => c.ghl_id);
  const { data: existingHealth } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, risk_flags')
    .in('ghl_contact_id', ghlIds);

  const healthMap = {};
  for (const h of (existingHealth || [])) {
    healthMap[h.ghl_contact_id] = h;
  }

  // Fetch all signals in parallel (batch queries)
  if (verbose) console.log('Fetching signals...');
  const [emailSignals, calendarSignals, financialSignals, pipelineSignals, knowledgeSignals] = await Promise.all([
    fetchEmailSignals(ghlIds),
    fetchCalendarSignals(ghlIds),
    fetchFinancialSignals(ghlIds),
    fetchPipelineSignals(ghlIds),
    fetchKnowledgeSignals(ghlIds),
  ]);

  if (verbose) console.log('Computing scores...\n');

  let updated = 0;
  let insightsGenerated = 0;

  for (const contact of contacts) {
    const ghlId = contact.ghl_id;

    // Score each signal
    const email = scoreEmailSignal(emailSignals[ghlId]);
    const calendar = scoreCalendarSignal(calendarSignals[ghlId]);
    const financial = scoreFinancialSignal(financialSignals[ghlId]);
    const pipeline = scorePipelineSignal(pipelineSignals[ghlId]);
    const knowledge = scoreKnowledgeSignal(knowledgeSignals[ghlId]);

    // Compute weighted temperature
    const newTemperature = Math.round(
      email.score * WEIGHTS.email +
      calendar.score * WEIGHTS.calendar +
      financial.score * WEIGHTS.financial +
      pipeline.score * WEIGHTS.pipeline +
      knowledge.score * WEIGHTS.knowledge
    );

    const prevHealth = healthMap[ghlId];
    const prevTemperature = prevHealth?.temperature;
    const trend = detectTrend(prevTemperature, newTemperature);
    const tempChange = prevTemperature != null ? newTemperature - prevTemperature : null;

    // Detect risk flags
    const riskFlags = detectRiskFlags(
      {
        email: emailSignals[ghlId],
        emailScore: email.score,
        pipeline: pipelineSignals[ghlId],
      },
      prevTemperature,
      newTemperature
    );

    if (verbose) {
      console.log(`  ${contact.full_name}: ${newTemperature}/100 (${trend}) [E:${email.score} C:${calendar.score} F:${financial.score} P:${pipeline.score} K:${knowledge.score}]${riskFlags.length ? ` ⚠ ${riskFlags.join(', ')}` : ''}`);
    }

    // Build update payload
    const updatePayload = {
      ghl_contact_id: ghlId,
      temperature: newTemperature,
      temperature_trend: trend,
      last_temperature_change: tempChange,
      risk_flags: riskFlags.length > 0 ? riskFlags : null,
      email_score: email.score,
      calendar_score: calendar.score,
      financial_score: financial.score,
      pipeline_score: pipeline.score,
      knowledge_score: knowledge.score,
      signal_breakdown: {
        email: email.details,
        calendar: calendar.details,
        financial: financial.details,
        pipeline: pipeline.details,
        knowledge: knowledge.details,
      },
      next_meeting_date: calendar.next_meeting_date || null,
      open_invoice_amount: financial.open_invoice_amount || 0,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!dryRun) {
      const { error: upsertError } = await supabase
        .from('relationship_health')
        .upsert(updatePayload, { onConflict: 'ghl_contact_id' });

      if (upsertError) {
        console.error(`  [ERR] Failed to update ${contact.full_name}: ${upsertError.message}`);
        continue;
      }
    }

    updated++;

    // Generate insights for notable changes
    if (prevTemperature != null) {
      await generateChangeInsights(
        contact.full_name, ghlId, prevTemperature, newTemperature, trend, riskFlags, dryRun
      );
    }
  }

  console.log(`\n[OK] Updated ${updated}/${contacts.length} contacts${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`  Insights generated: ${insightsGenerated}`);
  console.log();
}

try {
  await main();
} catch (err) {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
}
