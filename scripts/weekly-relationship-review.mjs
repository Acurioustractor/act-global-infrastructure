#!/usr/bin/env node
/**
 * Weekly Relationship Review
 *
 * Identifies relationship risks and fires integration_events for alerting:
 *   - Temperature drops >20 points in the last week
 *   - Key contacts with no interaction in 30+ days
 *   - Untagged new contacts (no project codes)
 *
 * Usage:
 *   node scripts/weekly-relationship-review.mjs             # Run review
 *   node scripts/weekly-relationship-review.mjs --dry-run   # Preview
 *   node scripts/weekly-relationship-review.mjs --verbose    # Detailed output
 *
 * Schedule: Friday 6pm AEST via PM2
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

function verbose(...msg) {
  if (VERBOSE) console.log(...msg);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const KEY_TAGS = ['partner', 'funder', 'board', 'investor', 'government', 'key_contact'];

async function main() {
  const start = Date.now();
  const sections = [];

  // 1. Temperature drops — contacts with falling trend and low temp
  console.log('Checking relationship temperature drops...');
  const { data: fallingContacts } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, temperature_trend, previous_temperature')
    .eq('temperature_trend', 'falling')
    .order('temperature', { ascending: true })
    .limit(20);

  const significantDrops = (fallingContacts || []).filter(c => {
    const drop = (c.previous_temperature || 100) - (c.temperature || 0);
    return drop >= 20;
  });

  if (significantDrops.length) {
    const ghlIds = significantDrops.map(c => c.ghl_contact_id);
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, tags')
      .in('ghl_id', ghlIds);

    const nameMap = new Map((contacts || []).map(c => [c.ghl_id, c]));

    const lines = significantDrops.map(c => {
      const contact = nameMap.get(c.ghl_contact_id);
      const name = contact?.full_name || 'Unknown';
      const drop = (c.previous_temperature || 100) - (c.temperature || 0);
      const isKey = (contact?.tags || []).some(t => KEY_TAGS.some(k => t.toLowerCase().includes(k)));
      return `  ${isKey ? '⚠️' : '  '} ${name}: ${c.previous_temperature || '?'} → ${c.temperature} (-${drop}pts)`;
    });

    sections.push(`TEMPERATURE DROPS (>20pts):\n${lines.join('\n')}`);
    verbose(`  Found ${significantDrops.length} significant drops`);
  }

  // 2. Key contacts with no interaction in 30+ days
  console.log('Checking key contact engagement gaps...');
  const { data: keyContacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags, last_contact_date')
    .not('tags', 'is', null)
    .order('last_contact_date', { ascending: true, nullsFirst: true })
    .limit(100);

  const staleKeyContacts = (keyContacts || []).filter(c => {
    const isKey = (c.tags || []).some(t => KEY_TAGS.some(k => t.toLowerCase().includes(k)));
    if (!isKey) return false;
    if (!c.last_contact_date) return true;
    const daysSince = (Date.now() - new Date(c.last_contact_date).getTime()) / 86400000;
    return daysSince >= 30;
  });

  if (staleKeyContacts.length) {
    const lines = staleKeyContacts.slice(0, 15).map(c => {
      const daysSince = c.last_contact_date
        ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000)
        : 'never';
      return `  ${c.full_name || c.email}: last contact ${daysSince}${typeof daysSince === 'number' ? 'd ago' : ''}`;
    });

    sections.push(`KEY CONTACTS — NO INTERACTION 30+ DAYS (${staleKeyContacts.length}):\n${lines.join('\n')}`);
    verbose(`  Found ${staleKeyContacts.length} stale key contacts`);
  }

  // 3. Untagged new contacts (created in last 30 days, no project codes)
  console.log('Checking untagged new contacts...');
  const thirtyDaysAgo = daysAgo(30);
  const { data: newContacts } = await supabase
    .from('ghl_contacts')
    .select('full_name, email, created_at')
    .gte('created_at', thirtyDaysAgo)
    .or('projects.is.null,projects.eq.{}')
    .order('created_at', { ascending: false })
    .limit(20);

  if (newContacts?.length) {
    const lines = newContacts.slice(0, 10).map(c =>
      `  ${c.full_name || c.email || 'Unknown'} (added ${new Date(c.created_at).toLocaleDateString()})`
    );
    const overflow = newContacts.length > 10 ? `\n  ... and ${newContacts.length - 10} more` : '';
    sections.push(`UNTAGGED NEW CONTACTS (${newContacts.length}):\n${lines.join('\n')}${overflow}`);
    verbose(`  Found ${newContacts.length} untagged new contacts`);
  }

  // Print summary
  if (!sections.length) {
    console.log('\n✅ All relationships healthy — no alerts this week.');
  } else {
    const summary = `WEEKLY RELATIONSHIP REVIEW — ${new Date().toISOString().split('T')[0]}\n${'─'.repeat(50)}\n\n${sections.join('\n\n')}`;
    console.log('\n' + summary);

    // Fire integration_event for Telegram notification
    if (!DRY_RUN) {
      await supabase.from('integration_events').insert({
        source: 'weekly-relationship-review',
        event_type: 'relationship_review',
        entity_type: 'relationship_health',
        payload: {
          temperature_drops: significantDrops.length,
          stale_key_contacts: staleKeyContacts.length,
          untagged_new_contacts: newContacts?.length || 0,
          message: summary,
        },
        triggered_by: 'weekly-relationship-review',
      });
      verbose('  Fired integration_event for Telegram notification');
    }
  }

  const durationMs = Date.now() - start;
  console.log(`\nCompleted in ${(durationMs / 1000).toFixed(1)}s`);

  await recordSyncStatus(supabase, 'weekly_relationship_review', {
    success: true,
    recordCount: sections.length,
    durationMs,
  });
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  await recordSyncStatus(supabase, 'weekly_relationship_review', { success: false, error: err.message });
  process.exit(1);
});
