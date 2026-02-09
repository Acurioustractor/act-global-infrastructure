#!/usr/bin/env node

/**
 * Communication Enrichment Pipeline
 *
 * Dedicated cron script that processes unenriched communications:
 * 1. Filters out newsletters/automated emails via cultural-guard
 * 2. Batches 5-10 emails per AI call for cost efficiency
 * 3. Single combined prompt: summary + sentiment + topics + project codes
 * 4. Uses intelligence_version for idempotency
 *
 * Usage:
 *   node scripts/enrich-communications.mjs                    # Default: process up to 50
 *   node scripts/enrich-communications.mjs --limit 10         # Limit batch size
 *   node scripts/enrich-communications.mjs --dry-run          # Preview without writing
 *   node scripts/enrich-communications.mjs --verbose          # Detailed output
 */

import { createClient } from '@supabase/supabase-js';
import { trackedCompletion } from './lib/llm-client.mjs';
import { shouldProcessEmail, isOwnDomainEmail } from './lib/cultural-guard.mjs';
import { saveProjectLinks } from './lib/project-linker.mjs';

// Current enrichment version — bump to re-process all
const INTELLIGENCE_VERSION = 2;
const BATCH_SIZE = 8; // emails per AI call

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const COMBINED_SYSTEM_PROMPT = `You analyze emails for ACT (A Curious Tractor), a social enterprise ecosystem.
For each email, return a JSON object with:
- summary: 1-2 sentence summary
- sentiment: "positive" | "neutral" | "negative" | "urgent"
- topics: array of 1-3 short topic tags (lowercase)
- requires_response: boolean (see rules below)
- project_codes: array of 0-2 project codes from: JH, EL, HARVEST, FARM, STUDIO, GOODS, WORLD-TOUR, OPS, TECH, PICC
- project_confidence: 0.0-1.0

REQUIRES_RESPONSE RULES (strict):
- Calendar invites/responses (Invitation:, Accepted:, Declined:, Event:) → false
- Support ticket auto-replies ([Ticket #, [Case #, New Case:) → false
- Form submission confirmations → false
- Out-of-office / auto-reply messages → false
- Newsletter / marketing / bulk emails → false
- Receipts, invoices, payment confirmations → false
- Only set true for INBOUND emails from real people asking a question, making a request, or expecting a reply

Project code guide:
  JH = JusticeHub (digital justice), EL = Empathy Ledger (storytelling/impact),
  HARVEST = The Harvest (venue/events), FARM = The Farm (R&D/manufacturing),
  STUDIO = Innovation Studio (consulting), GOODS = marketplace,
  WORLD-TOUR = 2026 travel/field testing, OPS = business admin,
  TECH = infrastructure/dev, PICC = community program

Return a JSON array with one object per email (same order). No markdown, ONLY valid JSON.`;

async function enrichBatch(emails, dryRun, verbose) {
  const emailList = emails.map((e, i) => {
    const from = e.metadata?.from || '';
    return `[${i}] Dir: ${e.direction} | From: ${from}\nSubject: ${e.subject || '(no subject)'}\nPreview: ${(e.content_preview || '').substring(0, 300)}`;
  }).join('\n---\n');

  const raw = await trackedCompletion(
    [
      { role: 'system', content: COMBINED_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze these ${emails.length} emails:\n\n${emailList}` },
    ],
    'enrich-communications',
    {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: emails.length * 120 + 100,
      operation: 'enrich_batch',
    }
  );

  const results = JSON.parse(raw.trim());

  if (!Array.isArray(results) || results.length !== emails.length) {
    console.warn(`[Enrich] Expected ${emails.length} results, got ${Array.isArray(results) ? results.length : 'non-array'}`);
  }

  let enrichedCount = 0;
  const projectClassifications = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const result = results[i] || {};

    // Safety override: own-domain senders never need follow-up
    const senderAddr = email.metadata?.from || '';
    const senderEmail = senderAddr.includes('<') ? (senderAddr.match(/<([^>]+)>/)?.[1] || senderAddr) : senderAddr;
    if (isOwnDomainEmail(senderEmail)) {
      result.requires_response = false;
    }

    if (verbose) {
      console.log(`  [${i}] ${(email.subject || '').substring(0, 50)} → ${result.sentiment || '?'} | ${(result.project_codes || []).join(', ') || 'none'}`);
    }

    if (dryRun) {
      enrichedCount++;
      continue;
    }

    // Update communications_history
    const { error } = await supabase
      .from('communications_history')
      .update({
        summary: result.summary || null,
        sentiment: result.sentiment || null,
        topics: Array.isArray(result.topics) ? result.topics : null,
        waiting_for_response: result.requires_response === true,
        response_needed_by: result.requires_response
          ? (email.direction === 'inbound' ? 'us' : 'them')
          : null,
        project_codes: Array.isArray(result.project_codes) ? result.project_codes : [],
        ai_project_confidence: result.project_confidence || 0,
        intelligence_version: INTELLIGENCE_VERSION,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', email.id);

    if (error) {
      console.error(`  [ERR] Failed to update ${email.id}:`, error.message);
    } else {
      enrichedCount++;
    }

    // Collect project classifications for link table
    if (result.project_codes?.length > 0 && (result.project_confidence || 0) >= 0.5) {
      projectClassifications.push({
        id: email.id,
        codes: result.project_codes,
        confidence: result.project_confidence || 0,
        reasoning: result.summary || '',
      });
    }
  }

  // Save project links
  if (!dryRun && projectClassifications.length > 0) {
    await saveProjectLinks(supabase, projectClassifications, 0.5);
  }

  // Fire integration event for the batch
  if (!dryRun && enrichedCount > 0) {
    await supabase.from('integration_events').insert({
      source: 'gmail',
      event_type: 'communication.enriched',
      entity_type: 'batch',
      entity_id: `batch_${Date.now()}`,
      action: 'created',
      payload: {
        count: enrichedCount,
        project_links: projectClassifications.length,
      },
      processed_at: new Date().toISOString(),
    });
  }

  return enrichedCount;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || 50 : 50;

  console.log('\n[Enrich] Communication Enrichment Pipeline');
  console.log(`  Limit: ${limit} | Dry run: ${dryRun} | Version: ${INTELLIGENCE_VERSION}\n`);

  // Fetch unenriched emails (missing enrichment or older version)
  const { data: unenriched, error } = await supabase
    .from('communications_history')
    .select('id, subject, content_preview, direction, metadata, channel')
    .eq('channel', 'email')
    .or(`intelligence_version.is.null,intelligence_version.lt.${INTELLIGENCE_VERSION}`)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Enrich] Failed to fetch emails:', error.message);
    process.exit(1);
  }

  if (!unenriched || unenriched.length === 0) {
    console.log('[Enrich] No emails need enrichment. All up to date.\n');
    return;
  }

  console.log(`[Enrich] Found ${unenriched.length} emails to process\n`);

  // Filter through cultural guard
  const toProcess = [];
  let skippedNewsletter = 0;
  let sacredFlagged = 0;

  for (const email of unenriched) {
    const check = shouldProcessEmail({
      subject: email.subject,
      content_preview: email.content_preview,
      from: email.metadata?.from,
      metadata: email.metadata,
    });

    if (!check.shouldProcess) {
      skippedNewsletter++;
      // Mark as processed so we don't re-check
      if (!dryRun) {
        await supabase
          .from('communications_history')
          .update({ intelligence_version: INTELLIGENCE_VERSION })
          .eq('id', email.id);
      }
      continue;
    }

    if (check.reason === 'sacred_content_flagged') {
      sacredFlagged++;
    }

    toProcess.push(email);
  }

  console.log(`[Filter] Processing: ${toProcess.length} | Skipped (newsletter/auto): ${skippedNewsletter} | Sacred flagged: ${sacredFlagged}\n`);

  if (toProcess.length === 0) {
    console.log('[Enrich] No emails to enrich after filtering.\n');
    return;
  }

  // Process in batches
  let totalEnriched = 0;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}] Processing ${batch.length} emails...`);

    try {
      const count = await enrichBatch(batch, dryRun, verbose);
      totalEnriched += count;
    } catch (err) {
      console.error(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}] Failed:`, err.message);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n[OK] Enriched ${totalEnriched}/${toProcess.length} emails${dryRun ? ' (DRY RUN)' : ''}\n`);
}

try {
  await main();
} catch (err) {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
}
