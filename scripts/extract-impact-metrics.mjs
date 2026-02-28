#!/usr/bin/env node
/**
 * Extract Impact Metrics
 *
 * Weekly script that uses LLM to extract quantitative impact data
 * from project_knowledge items (meeting notes, reports, action items).
 * Only processes items not yet scanned for metrics.
 *
 * Usage:
 *   node scripts/extract-impact-metrics.mjs
 *   node scripts/extract-impact-metrics.mjs --dry-run
 *   node scripts/extract-impact-metrics.mjs --project ACT-EL
 */

import { createClient } from '@supabase/supabase-js';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';
import { recordSyncStatus } from './lib/sync-status.mjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');
const projectFilter = process.argv.find(a => a.startsWith('--project'))?.split('=')?.[1]
  || process.argv[process.argv.indexOf('--project') + 1];

console.log(`Extracting impact metrics${dryRun ? ' (DRY RUN)' : ''}${projectFilter ? ` for ${projectFilter}` : ''}...`);

// Get knowledge items not yet scanned for impact (check metadata.impact_scanned)
let query = supabase
  .from('project_knowledge')
  .select('id, title, content, summary, project_code, knowledge_type, recorded_at')
  .or('metadata->>impact_scanned.is.null,metadata.is.null')
  .not('content', 'is', null)
  .order('recorded_at', { ascending: false })
  .limit(50);

if (projectFilter) query = query.eq('project_code', projectFilter);

const { data: items, error } = await query;

if (error) {
  console.error('Failed to fetch knowledge items:', error.message);
  process.exit(1);
}

console.log(`Found ${items.length} unscanned knowledge items.`);

if (items.length === 0) {
  console.log('Nothing to process.');
  await recordSyncStatus(supabase, 'impact_metrics', { status: 'healthy', recordCount: 0 }).catch(() => {});
  process.exit(0);
}

let metricsInserted = 0;

for (const item of items) {
  const text = item.summary || item.content?.substring(0, 2000) || '';
  if (text.length < 50) {
    // Mark as scanned but skip
    if (!dryRun) {
      await supabase.from('project_knowledge').update({
        metadata: { ...(item.metadata || {}), impact_scanned: new Date().toISOString() }
      }).eq('id', item.id);
    }
    continue;
  }

  const prompt = `You are an impact analyst for ACT (Australian Community Technologies), a nonprofit/social enterprise.

Extract any quantifiable impact metrics from this knowledge item. Return ONLY valid JSON — an array of objects with these fields:
- metric_type: one of "people_reached", "revenue_generated", "stories_collected", "jobs_created", "communities_supported", "events_held", "partnerships", "hours_volunteered", "products_shipped"
- value: number
- unit: string (e.g. "people", "dollars", "stories")
- confidence: 0.0 to 1.0 (how certain the number is)

If no quantifiable metrics are found, return an empty array: []

Knowledge item (${item.knowledge_type}, project ${item.project_code}):
Title: ${item.title}
Content: ${text}

JSON response:`;

  try {
    const response = await trackedClaudeCompletion(prompt, 'extract-impact-metrics', {
      maxTokens: 500,
      operation: 'impact_extraction',
    });

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Mark as scanned
      if (!dryRun) {
        await supabase.from('project_knowledge').update({
          metadata: { ...(item.metadata || {}), impact_scanned: new Date().toISOString() }
        }).eq('id', item.id);
      }
      continue;
    }

    const metrics = JSON.parse(jsonMatch[0]);

    if (Array.isArray(metrics) && metrics.length > 0) {
      const rows = metrics.map(m => ({
        project_code: item.project_code,
        metric_type: m.metric_type,
        value: m.value,
        unit: m.unit || null,
        confidence: m.confidence || 0.5,
        source: `project_knowledge:${item.knowledge_type}`,
        source_id: item.id,
        period_start: item.recorded_at ? item.recorded_at.split('T')[0] : null,
        notes: `Extracted from: ${item.title}`,
      }));

      if (!dryRun) {
        const { error: insertErr } = await supabase
          .from('impact_metrics')
          .insert(rows);
        if (insertErr) {
          console.error(`  Error inserting metrics for ${item.title}:`, insertErr.message);
        } else {
          metricsInserted += rows.length;
          console.log(`  ${item.project_code}: ${rows.length} metrics from "${item.title}"`);
        }
      } else {
        console.log(`  [DRY RUN] ${item.project_code}: ${rows.length} metrics from "${item.title}"`);
        metricsInserted += rows.length;
      }
    }

    // Mark as scanned
    if (!dryRun) {
      await supabase.from('project_knowledge').update({
        metadata: { ...(item.metadata || {}), impact_scanned: new Date().toISOString() }
      }).eq('id', item.id);
    }
  } catch (err) {
    console.error(`  Error processing ${item.title}:`, err.message);
  }

  // Rate limit
  await new Promise(r => setTimeout(r, 300));
}

console.log(`Done. ${metricsInserted} impact metrics ${dryRun ? 'would be' : ''} extracted.`);

try {
  await recordSyncStatus(supabase, 'impact_metrics', {
    status: metricsInserted > 0 || dryRun ? 'healthy' : 'warning',
    recordCount: metricsInserted,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}
