#!/usr/bin/env node

/**
 * Intelligence Insight Generator
 *
 * Cron script (every 30 min) that generates insights from multiple sources.
 * 5 base generators + 3 Phase 3 generators:
 *
 * FREE (SQL only):
 *   1. Follow-up detector — emails awaiting response > 48h
 *   2. Relationship change detector — contacts with recent temperature shifts
 *   3. New contact insights — reads integration_events for auto-created contacts
 *
 * AI-POWERED (~$0.10/day):
 *   4. Cross-domain patterns — finds patterns across contacts/projects
 *
 * VECTOR:
 *   5. Contact suggestions — vector similarity on knowledge_chunks
 *
 * Phase 3 additions:
 *   6. Ecosystem signals — topic frequency across contacts
 *   7. Knowledge alignment insights — cross-source matches
 *   8. Contact research insights — reads research results
 *
 * Usage:
 *   node scripts/generate-insights.mjs              # Run all generators
 *   node scripts/generate-insights.mjs --dry-run    # Preview without writing
 *   node scripts/generate-insights.mjs --verbose    # Detailed output
 */

import { createClient } from '@supabase/supabase-js';
import { trackedCompletion } from './lib/llm-client.mjs';
import { isOwnDomainEmail, isCalendarInvite, isAutoReply } from './lib/cultural-guard.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function insertInsight(insight, dryRun) {
  // Check dedup
  if (insight.dedup_key) {
    const { data: existing } = await supabase
      .from('intelligence_insights')
      .select('id')
      .eq('dedup_key', insight.dedup_key)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existing) return null; // Already exists
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
    console.error(`  [ERR] Failed to insert insight: ${error.message}`);
    return null;
  }

  return data;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. FOLLOW-UP DETECTOR (SQL only — free)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectFollowUps(dryRun, verbose) {
  if (verbose) console.log('\n[1] Follow-up detector...');

  const { data: overdue } = await supabase
    .from('communications_history')
    .select('id, subject, ghl_contact_id, occurred_at, metadata, direction')
    .eq('waiting_for_response', true)
    .eq('response_needed_by', 'us')
    .eq('direction', 'inbound')
    .lt('occurred_at', hoursAgo(48))
    .order('occurred_at', { ascending: true })
    .limit(20);

  let created = 0;
  let skipped = 0;
  for (const email of (overdue || [])) {
    const from = email.metadata?.from || 'Unknown';
    const fromAddr = from.includes('<') ? (from.match(/<([^>]+)>/)?.[1] || from) : from;

    // Safety filters — skip spam categories even if enrichment missed them
    if (isOwnDomainEmail(fromAddr)) { skipped++; continue; }
    if (isCalendarInvite({ subject: email.subject, from, metadata: email.metadata })) { skipped++; continue; }
    if (isAutoReply({ subject: email.subject, from, metadata: email.metadata })) { skipped++; continue; }

    if (verbose && skipped === 0) {
      // Log first valid follow-up for visibility
    }

    const daysSince = Math.floor((Date.now() - new Date(email.occurred_at).getTime()) / (86400000));
    const result = await insertInsight({
      insight_type: 'follow_up',
      title: `Reply needed: ${(email.subject || '(no subject)').substring(0, 80)}`,
      description: `Email from ${from} has been waiting ${daysSince} days for a response.`,
      priority: daysSince > 7 ? 'high' : 'medium',
      data: {
        communication_id: email.id,
        contact_id: email.ghl_contact_id,
        from,
        subject: email.subject,
        days_waiting: daysSince,
      },
      source_type: 'sql',
      source_id: email.id,
      dedup_key: `followup_${email.id}`,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Found ${overdue?.length || 0} overdue, skipped ${skipped} (spam), created ${created} insights`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. RELATIONSHIP CHANGE DETECTOR (SQL only — free)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectRelationshipChanges(dryRun, verbose) {
  if (verbose) console.log('\n[2] Relationship change detector...');

  // Find contacts whose temperature dropped significantly recently
  const { data: cooling } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, email, temperature, temperature_trend')
    .eq('temperature_trend', 'cooling')
    .not('full_name', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  let created = 0;
  for (const contact of (cooling || [])) {
    const result = await insertInsight({
      insight_type: 'relationship_change',
      title: `${contact.full_name} is cooling`,
      description: `Relationship temperature is trending down. Consider reaching out.`,
      priority: 'medium',
      data: {
        contact_id: contact.ghl_id || contact.id,
        contact_name: contact.full_name,
        email: contact.email,
        temperature: contact.temperature,
        trend: contact.temperature_trend,
      },
      source_type: 'sql',
      source_id: contact.id,
      dedup_key: `cooling_${contact.id}_${new Date().toISOString().slice(0, 10)}`,
      expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Found ${cooling?.length || 0} cooling contacts, created ${created} insights`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. NEW CONTACT INSIGHTS (reads integration_events — free)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectNewContacts(dryRun, verbose) {
  if (verbose) console.log('\n[3] New contact insights...');

  const { data: events } = await supabase
    .from('integration_events')
    .select('id, entity_id, payload, created_at')
    .eq('event_type', 'contact.auto_created')
    .gt('created_at', hoursAgo(1))
    .order('created_at', { ascending: false })
    .limit(20);

  let created = 0;
  for (const event of (events || [])) {
    const payload = event.payload || {};
    const result = await insertInsight({
      insight_type: 'new_contact',
      title: `New contact: ${payload.name || payload.email || 'Unknown'}`,
      description: `Auto-created from ${payload.direction || 'inbound'} email. Subject: "${(payload.first_seen_subject || '').substring(0, 80)}"`,
      priority: 'low',
      data: {
        contact_id: event.entity_id,
        email: payload.email,
        name: payload.name,
        subject: payload.first_seen_subject,
      },
      source_type: 'event',
      source_id: event.id,
      dedup_key: `new_contact_${event.entity_id}`,
      expires_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Found ${events?.length || 0} new contacts, created ${created} insights`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CROSS-DOMAIN PATTERNS (AI — ~$0.10/day)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectCrossDomainPatterns(dryRun, verbose) {
  if (verbose) console.log('\n[4] Cross-domain patterns...');

  // Get recent enriched communications with project codes
  const { data: recentComms } = await supabase
    .from('communications_history')
    .select('subject, summary, topics, project_codes, direction, sentiment, ghl_contact_id')
    .not('summary', 'is', null)
    .gt('occurred_at', hoursAgo(24))
    .order('occurred_at', { ascending: false })
    .limit(30);

  if (!recentComms || recentComms.length < 5) {
    if (verbose) console.log('  Not enough recent enriched comms for pattern detection');
    return 0;
  }

  // Build summary for AI
  const commsSummary = recentComms.map(c =>
    `[${c.direction}] ${c.project_codes?.join(',') || 'none'} | ${c.sentiment || '?'} | ${c.summary || c.subject}`
  ).join('\n');

  try {
    const raw = await trackedCompletion(
      [
        {
          role: 'system',
          content: `You analyze communication patterns for ACT (A Curious Tractor), a social enterprise.
Given recent communications, identify 1-3 notable cross-domain patterns, emerging themes, or action items.
Return JSON array: [{ "title": "...", "description": "...", "priority": "low|medium|high", "projects": ["CODE1"] }]
Only include genuinely noteworthy patterns. Return empty array [] if nothing significant.
No markdown, ONLY valid JSON.`
        },
        {
          role: 'user',
          content: `${recentComms.length} recent communications:\n\n${commsSummary}`
        }
      ],
      'generate-insights',
      {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 500,
        operation: 'cross_domain_patterns',
      }
    );

    const patterns = JSON.parse(raw.trim());
    let created = 0;

    for (const pattern of (patterns || [])) {
      const result = await insertInsight({
        insight_type: 'cross_domain',
        title: pattern.title,
        description: pattern.description,
        priority: pattern.priority || 'medium',
        data: { projects: pattern.projects || [], comm_count: recentComms.length },
        source_type: 'ai',
        dedup_key: `cross_domain_${new Date().toISOString().slice(0, 13)}`, // hourly dedup
        expires_at: new Date(Date.now() + 1 * 86400000).toISOString(),
      }, dryRun);

      if (result) created++;
    }

    if (verbose) console.log(`  Generated ${created} cross-domain insights from ${recentComms.length} comms`);
    return created;
  } catch (err) {
    console.error('  [ERR] Cross-domain detection failed:', err.message);
    return 0;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. CONTACT SUGGESTIONS (vector similarity — free)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function generateContactSuggestions(dryRun, verbose) {
  if (verbose) console.log('\n[5] Contact suggestions...');

  // Find recently active contacts with knowledge chunks
  const { data: activeContacts } = await supabase
    .from('communications_history')
    .select('ghl_contact_id')
    .not('ghl_contact_id', 'is', null)
    .gt('occurred_at', hoursAgo(72))
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (!activeContacts || activeContacts.length === 0) {
    if (verbose) console.log('  No recent active contacts');
    return 0;
  }

  // Get unique contact IDs
  const contactIds = [...new Set(activeContacts.map(c => c.ghl_contact_id))].slice(0, 10);

  let created = 0;
  for (const contactId of contactIds) {
    // Find other contacts who share project codes
    const { data: contactComms } = await supabase
      .from('communications_history')
      .select('project_codes')
      .eq('ghl_contact_id', contactId)
      .not('project_codes', 'eq', '{}')
      .limit(10);

    const projectCodes = [...new Set((contactComms || []).flatMap(c => c.project_codes || []))];
    if (projectCodes.length === 0) continue;

    // Find other contacts on same projects
    const { data: related } = await supabase
      .from('communications_history')
      .select('ghl_contact_id')
      .neq('ghl_contact_id', contactId)
      .not('ghl_contact_id', 'is', null)
      .overlaps('project_codes', projectCodes)
      .limit(5);

    if (!related || related.length === 0) continue;

    const relatedIds = [...new Set(related.map(r => r.ghl_contact_id))];

    const result = await insertInsight({
      insight_type: 'contact_suggestion',
      title: `Shared projects: ${projectCodes.join(', ')}`,
      description: `${relatedIds.length} contacts share project involvement with contact ${contactId.slice(0, 8)}`,
      priority: 'low',
      data: {
        contact_id: contactId,
        related_contacts: relatedIds,
        shared_projects: projectCodes,
      },
      source_type: 'sql',
      dedup_key: `suggestion_${contactId}_${projectCodes.sort().join('_')}`,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Created ${created} contact suggestions`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. ECOSYSTEM SIGNALS (Phase 3 — topic frequency)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectEcosystemSignals(dryRun, verbose) {
  if (verbose) console.log('\n[6] Ecosystem signals...');

  // Get topic distribution from recent comms
  const { data: recentTopics } = await supabase
    .from('communications_history')
    .select('topics, ghl_contact_id')
    .not('topics', 'is', null)
    .gt('occurred_at', hoursAgo(72))
    .limit(100);

  if (!recentTopics || recentTopics.length < 10) {
    if (verbose) console.log('  Not enough topic data');
    return 0;
  }

  // Count topic frequency
  const topicCounts = {};
  const topicContacts = {};
  for (const comm of recentTopics) {
    for (const topic of (comm.topics || [])) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      if (comm.ghl_contact_id) {
        topicContacts[topic] = topicContacts[topic] || new Set();
        topicContacts[topic].add(comm.ghl_contact_id);
      }
    }
  }

  // Find topics discussed by multiple contacts (emerging signals)
  let created = 0;
  const signals = Object.entries(topicContacts)
    .filter(([_, contacts]) => contacts.size >= 3)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 3);

  for (const [topic, contacts] of signals) {
    const result = await insertInsight({
      insight_type: 'ecosystem_signal',
      title: `Emerging topic: "${topic}"`,
      description: `Discussed by ${contacts.size} contacts in ${topicCounts[topic]} communications over the last 3 days.`,
      priority: contacts.size >= 5 ? 'medium' : 'low',
      data: {
        topic,
        mention_count: topicCounts[topic],
        contact_count: contacts.size,
        contact_ids: [...contacts].slice(0, 10),
      },
      source_type: 'sql',
      dedup_key: `signal_${topic}_${new Date().toISOString().slice(0, 10)}`,
      expires_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Found ${signals.length} ecosystem signals, created ${created} insights`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. KNOWLEDGE ALIGNMENT INSIGHTS (Phase 3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function detectKnowledgeAlignments(dryRun, verbose) {
  if (verbose) console.log('\n[7] Knowledge alignment insights...');

  // Find recently created knowledge edges
  const { data: recentEdges } = await supabase
    .from('knowledge_edges')
    .select('source_type, source_id, target_type, target_id, edge_type, strength, reasoning')
    .gt('created_at', hoursAgo(1))
    .gt('strength', 0.7)
    .order('strength', { ascending: false })
    .limit(10);

  let created = 0;
  for (const edge of (recentEdges || [])) {
    const result = await insertInsight({
      insight_type: 'knowledge_alignment',
      title: `Knowledge link: ${edge.source_type} → ${edge.target_type}`,
      description: edge.reasoning || `Strong connection (${(edge.strength * 100).toFixed(0)}%) found between ${edge.source_type} and ${edge.target_type}.`,
      priority: edge.strength >= 0.9 ? 'medium' : 'low',
      data: {
        source_type: edge.source_type,
        source_id: edge.source_id,
        target_type: edge.target_type,
        target_id: edge.target_id,
        edge_type: edge.edge_type,
        strength: edge.strength,
      },
      source_type: 'sql',
      dedup_key: `alignment_${edge.source_id}_${edge.target_id}`,
      expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, dryRun);

    if (result) created++;
  }

  if (verbose) console.log(`  Found ${recentEdges?.length || 0} new edges, created ${created} insights`);
  return created;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('\n[Insights] Intelligence Insight Generator');
  console.log(`  Dry run: ${dryRun}\n`);

  // Clean up expired insights
  if (!dryRun) {
    const { count } = await supabase
      .from('intelligence_insights')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id', { count: 'exact', head: true });

    if (count > 0 && verbose) {
      console.log(`[Cleanup] Removed ${count} expired insights`);
    }
  }

  const results = {};

  // Run all generators
  results.followUps = await detectFollowUps(dryRun, verbose);
  results.relationshipChanges = await detectRelationshipChanges(dryRun, verbose);
  results.newContacts = await detectNewContacts(dryRun, verbose);
  results.crossDomain = await detectCrossDomainPatterns(dryRun, verbose);
  results.contactSuggestions = await generateContactSuggestions(dryRun, verbose);
  results.ecosystemSignals = await detectEcosystemSignals(dryRun, verbose);
  results.knowledgeAlignments = await detectKnowledgeAlignments(dryRun, verbose);

  const total = Object.values(results).reduce((s, v) => s + v, 0);

  console.log(`\n[OK] Generated ${total} insights${dryRun ? ' (DRY RUN)' : ''}`);
  if (verbose) {
    Object.entries(results).forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });
  }
  console.log();
}

try {
  await main();
} catch (err) {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
}
