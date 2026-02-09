#!/usr/bin/env node
/**
 * Link GHL Opportunities to Grant Applications
 *
 * Matches ghl_opportunities to grant_applications by name similarity and amount.
 * Sets ghl_opportunity_id on grant_applications for tighter joins.
 *
 * Usage:
 *   node scripts/link-grants-to-ghl.mjs           # Dry run
 *   node scripts/link-grants-to-ghl.mjs --apply    # Apply links
 */

import { createClient } from '@supabase/supabase-js';
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

const applyMode = process.argv.includes('--apply');

function similarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;

  // Check if one contains the other
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

  // Word overlap
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  const intersection = [...aWords].filter(w => bWords.has(w) && w.length > 2);
  const union = new Set([...aWords, ...bWords]);
  return intersection.length / union.size;
}

async function linkGrantsToGHL() {
  console.log(`\n🔗 Grant → GHL Linker ${applyMode ? '(APPLY)' : '(DRY RUN)'}`);
  console.log('═'.repeat(50));

  // Fetch grant applications without GHL link
  const { data: grants, error: gErr } = await supabase
    .from('grant_applications')
    .select('id, application_name, amount_requested, project_code, ghl_opportunity_id')
    .is('ghl_opportunity_id', null);

  if (gErr) {
    console.error('Error fetching grants:', gErr.message);
    return;
  }

  // Fetch GHL opportunities
  const { data: opportunities, error: oErr } = await supabase
    .from('ghl_opportunities')
    .select('id, name, monetary_value, stage_name, status');

  if (oErr) {
    console.error('Error fetching GHL opportunities:', oErr.message);
    return;
  }

  console.log(`Grant applications: ${grants?.length || 0}`);
  console.log(`GHL opportunities:  ${opportunities?.length || 0}`);

  if (!grants?.length || !opportunities?.length) {
    console.log('Nothing to link.');
    return;
  }

  const matches = [];

  for (const grant of grants) {
    let bestMatch = null;
    let bestScore = 0;

    for (const opp of opportunities) {
      // Name similarity
      const nameScore = similarity(grant.application_name, opp.name);

      // Amount proximity bonus (if within 20%)
      let amountBonus = 0;
      if (grant.amount_requested && opp.monetary_value) {
        const ratio = Math.min(grant.amount_requested, opp.monetary_value) /
                      Math.max(grant.amount_requested, opp.monetary_value);
        if (ratio > 0.8) amountBonus = 0.2;
      }

      const totalScore = nameScore + amountBonus;

      if (totalScore > bestScore && totalScore > 0.5) {
        bestScore = totalScore;
        bestMatch = opp;
      }
    }

    if (bestMatch) {
      matches.push({
        grantId: grant.id,
        grantName: grant.application_name,
        ghlId: bestMatch.id,
        ghlName: bestMatch.name,
        score: bestScore.toFixed(2),
      });
    }
  }

  console.log(`\nMatches found: ${matches.length}`);

  for (const m of matches) {
    console.log(`  ${m.grantName.substring(0, 35).padEnd(37)} → ${m.ghlName.substring(0, 35)} (${m.score})`);
  }

  if (applyMode && matches.length > 0) {
    let applied = 0;
    for (const m of matches) {
      const { error } = await supabase
        .from('grant_applications')
        .update({ ghl_opportunity_id: m.ghlId })
        .eq('id', m.grantId);

      if (!error) applied++;
      else console.error(`  Error linking ${m.grantId}:`, error.message);
    }
    console.log(`\n✅ Linked ${applied} grants to GHL opportunities`);
  } else if (!applyMode) {
    console.log('\n💡 Run with --apply to save links');
  }
}

await linkGrantsToGHL();
