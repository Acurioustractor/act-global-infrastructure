#!/usr/bin/env node
/**
 * Detect Entity Duplicates
 *
 * Scans canonical_entities for potential duplicates using:
 * 1. The find_potential_duplicates() SQL function (name/email/company similarity)
 * 2. Additional pre-filter checks (name substrings like "Ben" vs "Benjamin")
 *
 * Inserts results into entity_potential_matches with status='pending'.
 * Designed to run nightly via GitHub Actions.
 *
 * Usage:
 *   node scripts/detect-entity-duplicates.mjs
 *   node scripts/detect-entity-duplicates.mjs --threshold 0.4
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse threshold from CLI args
const thresholdArg = process.argv.indexOf('--threshold');
const THRESHOLD = thresholdArg !== -1 ? parseFloat(process.argv[thresholdArg + 1]) : 0.5;

let inserted = 0;
let skipped = 0;
let errors = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NAME SUBSTRING CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if two names share a first or last name component.
 * Catches "Ben Knight" vs "Benjamin Knight", "J Smith" vs "John Smith"
 */
function nameSubstringMatch(name1, name2) {
  if (!name1 || !name2) return false;
  const parts1 = name1.toLowerCase().trim().split(/\s+/);
  const parts2 = name2.toLowerCase().trim().split(/\s+/);

  // Check if any name part of one is a prefix of a part in the other
  for (const p1 of parts1) {
    for (const p2 of parts2) {
      if (p1.length >= 2 && p2.length >= 2) {
        if (p1.startsWith(p2) || p2.startsWith(p1)) return true;
        if (p1 === p2) return true;
      }
    }
  }

  // Check if last names match (most common dedup signal)
  if (parts1.length >= 2 && parts2.length >= 2) {
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];
    if (last1 === last2 && last1.length >= 3) return true;
  }

  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`=== Entity Duplicate Detection (threshold=${THRESHOLD}) ===\n`);

  // Get all canonical entities
  const { data: entities, error } = await supabase
    .from('canonical_entities')
    .select('id, canonical_name, canonical_email, canonical_phone, canonical_company')
    .eq('entity_type', 'person')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch canonical_entities:', error.message);
    process.exit(1);
  }

  console.log(`Scanning ${entities.length} entities for duplicates...\n`);

  // Track already-checked pairs to avoid re-checking
  const checkedPairs = new Set();

  // Phase 1: Use SQL function for each entity
  let processed = 0;
  for (const entity of entities) {
    processed++;
    if (processed % 50 === 0) {
      console.log(`  Progress: ${processed}/${entities.length} (found ${inserted} matches so far)`);
    }

    try {
      const { data: candidates, error: rpcError } = await supabase.rpc('find_potential_duplicates', {
        p_entity_id: entity.id,
        p_threshold: THRESHOLD,
      });

      if (rpcError) {
        console.error(`  Error for ${entity.canonical_name}: ${rpcError.message}`);
        errors++;
        continue;
      }

      for (const candidate of (candidates || [])) {
        // Ensure consistent ordering (a < b)
        const [entityA, entityB] = entity.id < candidate.candidate_id
          ? [entity.id, candidate.candidate_id]
          : [candidate.candidate_id, entity.id];

        const pairKey = `${entityA}:${entityB}`;
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const { error: insertError } = await supabase
          .from('entity_potential_matches')
          .insert({
            entity_a_id: entityA,
            entity_b_id: entityB,
            match_score: candidate.match_score,
            match_reasons: candidate.match_reasons,
            status: 'pending',
          })
          .select()
          .maybeSingle();

        if (insertError) {
          if (insertError.code === '23505') {
            skipped++; // Already exists
          } else {
            console.error(`  Insert error: ${insertError.message}`);
            errors++;
          }
        } else {
          inserted++;
        }
      }
    } catch (err) {
      console.error(`  Error for ${entity.canonical_name}:`, err.message);
      errors++;
    }
  }

  // Phase 2: Name substring matching for pairs the SQL function might miss
  console.log('\nPhase 2: Name substring matching...');
  let substringMatches = 0;

  // Build a name → entity map for efficient comparison
  const nameGroups = new Map();
  for (const e of entities) {
    const parts = (e.canonical_name || '').toLowerCase().trim().split(/\s+/);
    const lastName = parts.length >= 2 ? parts[parts.length - 1] : null;
    if (lastName && lastName.length >= 3) {
      const group = nameGroups.get(lastName) || [];
      group.push(e);
      nameGroups.set(lastName, group);
    }
  }

  for (const [lastName, group] of nameGroups) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const [entityA, entityB] = a.id < b.id ? [a, b] : [b, a];
        const pairKey = `${entityA.id}:${entityB.id}`;
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        if (!nameSubstringMatch(a.canonical_name, b.canonical_name)) continue;

        // Calculate a simple score
        const sameEmail = a.canonical_email && b.canonical_email && a.canonical_email === b.canonical_email;
        const sameCompany = a.canonical_company && b.canonical_company &&
          a.canonical_company.toLowerCase() === b.canonical_company.toLowerCase();
        const score = Math.min(0.99, 0.40 + (sameEmail ? 0.40 : 0) + (sameCompany ? 0.20 : 0));

        if (score < THRESHOLD) continue;

        const { error: insertError } = await supabase
          .from('entity_potential_matches')
          .insert({
            entity_a_id: entityA.id,
            entity_b_id: entityB.id,
            match_score: score,
            match_reasons: {
              name_substring: true,
              same_last_name: lastName,
              same_email: sameEmail || false,
              same_company: sameCompany || false,
            },
            status: 'pending',
          })
          .select()
          .maybeSingle();

        if (insertError) {
          if (insertError.code !== '23505') errors++;
        } else {
          substringMatches++;
          inserted++;
        }
      }
    }
  }

  console.log(`  Name substring matches found: ${substringMatches}`);

  // Summary
  const { count: totalPending } = await supabase
    .from('entity_potential_matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  console.log('\n=== Summary ===');
  console.log(`New matches inserted: ${inserted}`);
  console.log(`Already existed (skipped): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total pending matches: ${totalPending}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
