#!/usr/bin/env node
/**
 * Entity Resolution Service
 * Layer 3: Preparation & Transformation
 *
 * Deduplicates and unifies contacts across GHL, Notion, and other sources.
 * Uses fuzzy matching, phone/email normalization, and confidence scoring.
 *
 * Usage:
 *   node scripts/entity-resolution.mjs resolve         - Resolve all contacts
 *   node scripts/entity-resolution.mjs duplicates      - Find potential duplicates
 *   node scripts/entity-resolution.mjs merge <id1> <id2>  - Merge two entities
 *   node scripts/entity-resolution.mjs stats           - Show resolution statistics
 */

import { createClient } from '@supabase/supabase-js';
import { createAuditor } from './lib/audit.mjs';

// Initialize (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const audit = createAuditor('entity-resolution', { userContext: 'cli' });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NORMALIZATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digits
  let cleaned = phone.replace(/[^0-9]/g, '');

  // Handle Australian numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+61' + cleaned.substring(1);
  } else if (cleaned.startsWith('61') && cleaned.length === 11) {
    cleaned = '+' + cleaned;
  } else if (cleaned.length === 9 && cleaned.startsWith('4')) {
    cleaned = '+61' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

function normalizeName(name) {
  if (!name) return null;
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;

  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return 1.0;

  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 0;

  const distance = levenshtein(n1, n2);
  return Math.max(0, 1 - distance / maxLen);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE RESOLUTION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Resolve a single contact from a source system
 */
async function resolveContact(source, sourceId, contact) {
  // Use database function for atomic resolution
  const { data, error } = await supabase.rpc('resolve_entity', {
    p_source: source,
    p_source_id: sourceId,
    p_name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
    p_email: contact.email,
    p_phone: contact.phone,
    p_company: contact.company,
    p_entity_type: 'person'
  });

  if (error) throw error;
  return data;  // Returns canonical entity ID
}

/**
 * Import contacts from GHL and resolve them
 */
async function resolveGHLContacts(options = {}) {
  const dryRun = options.dryRun || false;
  const limit = options.limit || 1000;

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Resolving GHL contacts...`);

  // Get GHL contacts
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, first_name, last_name, email, phone, company_name')
    .limit(limit);

  if (error) throw error;

  let resolved = 0;
  let skipped = 0;
  const results = [];

  for (const contact of contacts) {
    // Skip if already resolved
    const { data: existing } = await supabase
      .from('entity_identifiers')
      .select('entity_id')
      .eq('source', 'ghl')
      .eq('source_record_id', contact.ghl_id)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      const contactName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      const entityId = await resolveContact('ghl', contact.ghl_id, {
        name: contactName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company_name
      });

      results.push({
        ghlId: contact.ghl_id,
        name: contactName,
        entityId
      });
    }

    resolved++;
  }

  return { resolved, skipped, total: contacts.length, results };
}

/**
 * Find potential duplicate entities
 */
async function findPotentialDuplicates(threshold = 0.7) {
  console.log(`Finding duplicates with threshold ${threshold}...`);

  const { data: entities, error } = await supabase
    .from('canonical_entities')
    .select('*')
    .eq('entity_type', 'person');

  if (error) throw error;

  const potentialDuplicates = [];

  // Compare each pair
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      const score = calculateMatchScore(a, b);

      if (score >= threshold) {
        potentialDuplicates.push({
          entityA: a,
          entityB: b,
          score,
          reasons: getMatchReasons(a, b)
        });
      }
    }
  }

  // Sort by score descending
  potentialDuplicates.sort((a, b) => b.score - a.score);

  return potentialDuplicates;
}

/**
 * Calculate match score between two entities
 */
function calculateMatchScore(a, b) {
  let score = 0;
  let weights = 0;

  // Exact email match (high weight)
  if (a.canonical_email && b.canonical_email) {
    if (a.canonical_email === b.canonical_email) {
      score += 0.9;
    } else {
      // Same domain
      const domainA = a.canonical_email.split('@')[1];
      const domainB = b.canonical_email.split('@')[1];
      if (domainA === domainB) {
        score += 0.2;
      }
    }
    weights += 1;
  }

  // Exact phone match (high weight)
  if (a.canonical_phone && b.canonical_phone) {
    if (a.canonical_phone === b.canonical_phone) {
      score += 0.9;
    }
    weights += 1;
  }

  // Name similarity (medium weight)
  if (a.canonical_name && b.canonical_name) {
    const similarity = nameSimilarity(a.canonical_name, b.canonical_name);
    score += similarity * 0.6;
    weights += 0.6;
  }

  // Same company (low weight)
  if (a.canonical_company && b.canonical_company) {
    if (normalizeName(a.canonical_company) === normalizeName(b.canonical_company)) {
      score += 0.3;
    }
    weights += 0.3;
  }

  return weights > 0 ? score / weights : 0;
}

/**
 * Get human-readable match reasons
 */
function getMatchReasons(a, b) {
  const reasons = [];

  if (a.canonical_email && a.canonical_email === b.canonical_email) {
    reasons.push('exact_email');
  } else if (a.canonical_email && b.canonical_email) {
    const domainA = a.canonical_email.split('@')[1];
    const domainB = b.canonical_email.split('@')[1];
    if (domainA === domainB) {
      reasons.push('same_email_domain');
    }
  }

  if (a.canonical_phone && a.canonical_phone === b.canonical_phone) {
    reasons.push('exact_phone');
  }

  const nameSim = nameSimilarity(a.canonical_name, b.canonical_name);
  if (nameSim > 0.8) {
    reasons.push(`name_similarity_${(nameSim * 100).toFixed(0)}%`);
  }

  if (a.canonical_company && b.canonical_company) {
    if (normalizeName(a.canonical_company) === normalizeName(b.canonical_company)) {
      reasons.push('same_company');
    }
  }

  return reasons;
}

/**
 * Merge two entities
 */
async function mergeEntities(survivingId, mergedId, options = {}) {
  const mergedBy = options.mergedBy || 'manual';

  console.log(`Merging ${mergedId} into ${survivingId}...`);

  // Get both entities
  const { data: surviving, error: e1 } = await supabase
    .from('canonical_entities')
    .select('*')
    .eq('id', survivingId)
    .single();

  const { data: merged, error: e2 } = await supabase
    .from('canonical_entities')
    .select('*')
    .eq('id', mergedId)
    .single();

  if (e1 || e2) throw e1 || e2;

  // Calculate match details for audit
  const matchScore = calculateMatchScore(surviving, merged);
  const matchReasons = getMatchReasons(surviving, merged);

  // Start transaction-like operation
  // 1. Log the merge
  const { error: logError } = await supabase
    .from('entity_merge_log')
    .insert({
      surviving_entity_id: survivingId,
      merged_entity_id: mergedId,
      merged_entity_snapshot: merged,
      merge_reason: matchReasons.join(', '),
      match_confidence: matchScore,
      match_details: { reasons: matchReasons, score: matchScore },
      merged_by: mergedBy
    });

  if (logError) throw logError;

  // 2. Move all identifiers to surviving entity
  const { error: moveError } = await supabase
    .from('entity_identifiers')
    .update({ entity_id: survivingId })
    .eq('entity_id', mergedId);

  if (moveError) throw moveError;

  // 3. Update surviving entity's merged_from array
  const mergedFrom = surviving.merged_from || [];
  mergedFrom.push(mergedId);

  const { error: updateError } = await supabase
    .from('canonical_entities')
    .update({
      merged_from: mergedFrom,
      merge_count: (surviving.merge_count || 1) + 1,
      last_merge_at: new Date().toISOString()
    })
    .eq('id', survivingId);

  if (updateError) throw updateError;

  // 4. Delete merged entity
  const { error: deleteError } = await supabase
    .from('canonical_entities')
    .delete()
    .eq('id', mergedId);

  if (deleteError) throw deleteError;

  return { survivingId, mergedId, matchScore, matchReasons };
}

/**
 * Auto-merge high-confidence duplicates
 */
async function autoMerge(threshold = 0.9, options = {}) {
  const dryRun = options.dryRun || false;
  const maxMerges = options.maxMerges || 50;

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Auto-merging with threshold ${threshold}...`);

  const duplicates = await findPotentialDuplicates(threshold);

  const merges = [];
  const processed = new Set();

  for (const dup of duplicates) {
    if (merges.length >= maxMerges) break;

    // Skip if either entity already processed
    if (processed.has(dup.entityA.id) || processed.has(dup.entityB.id)) {
      continue;
    }

    // Choose surviving entity (prefer one with more data)
    const aCompleteness = countFields(dup.entityA);
    const bCompleteness = countFields(dup.entityB);

    const survivingId = aCompleteness >= bCompleteness ? dup.entityA.id : dup.entityB.id;
    const mergedId = survivingId === dup.entityA.id ? dup.entityB.id : dup.entityA.id;

    if (!dryRun) {
      await mergeEntities(survivingId, mergedId, { mergedBy: 'auto' });
    }

    merges.push({
      surviving: survivingId === dup.entityA.id ? dup.entityA : dup.entityB,
      merged: survivingId === dup.entityA.id ? dup.entityB : dup.entityA,
      score: dup.score,
      reasons: dup.reasons
    });

    processed.add(dup.entityA.id);
    processed.add(dup.entityB.id);
  }

  return { mergeCount: merges.length, merges };
}

function countFields(entity) {
  let count = 0;
  if (entity.canonical_name) count++;
  if (entity.canonical_email) count++;
  if (entity.canonical_phone) count++;
  if (entity.canonical_company) count++;
  return count;
}

/**
 * Get resolution statistics
 */
async function getStats() {
  const { data: stats, error } = await supabase
    .from('v_entity_resolution_stats')
    .select('*');

  if (error) throw error;

  // Get source distribution
  const { data: sources, error: e2 } = await supabase
    .from('entity_identifiers')
    .select('source')
    .then(({ data }) => {
      const counts = {};
      data?.forEach(d => counts[d.source] = (counts[d.source] || 0) + 1);
      return { data: counts };
    });

  // Get recent merges
  const { data: merges, error: e3 } = await supabase
    .from('entity_merge_log')
    .select('id')
    .gte('merged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  return {
    entityStats: stats,
    sourceDistribution: sources,
    recentMerges: merges?.length || 0
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const command = process.argv[2];

if (command === 'resolve') {
  const dryRun = process.argv.includes('--dry-run');

  await audit.action('resolve', 'canonical_entities', async () => {
    const result = await resolveGHLContacts({ dryRun });

    console.log('\nResolution Results:');
    console.log('━'.repeat(40));
    console.log(`Total contacts: ${result.total}`);
    console.log(`Resolved: ${result.resolved}`);
    console.log(`Already linked: ${result.skipped}`);

    if (result.results.length > 0 && result.results.length <= 20) {
      console.log('\nResolved:');
      result.results.forEach(r => {
        console.log(`  ${r.name} -> ${r.entityId}`);
      });
    }

    return result;
  });

} else if (command === 'duplicates') {
  const threshold = parseFloat(process.argv[3]) || 0.7;

  await audit.read('canonical_entities', async () => {
    const duplicates = await findPotentialDuplicates(threshold);

    console.log(`\nPotential Duplicates (threshold: ${threshold})`);
    console.log('━'.repeat(60));

    if (duplicates.length === 0) {
      console.log('No duplicates found.');
      return duplicates;
    }

    duplicates.slice(0, 20).forEach((dup, i) => {
      console.log(`\n${i + 1}. Score: ${(dup.score * 100).toFixed(1)}%`);
      console.log(`   A: ${dup.entityA.canonical_name} <${dup.entityA.canonical_email || 'no email'}>`);
      console.log(`   B: ${dup.entityB.canonical_name} <${dup.entityB.canonical_email || 'no email'}>`);
      console.log(`   Reasons: ${dup.reasons.join(', ')}`);
    });

    if (duplicates.length > 20) {
      console.log(`\n... and ${duplicates.length - 20} more`);
    }

    return duplicates;
  });

} else if (command === 'merge') {
  const id1 = process.argv[3];
  const id2 = process.argv[4];

  if (!id1 || !id2) {
    console.error('Usage: node entity-resolution.mjs merge <entity-id-1> <entity-id-2>');
    process.exit(1);
  }

  await audit.action('merge', 'canonical_entities', async () => {
    const result = await mergeEntities(id1, id2, { mergedBy: 'manual:cli' });

    console.log('\nMerge Complete');
    console.log('━'.repeat(40));
    console.log(`Surviving: ${result.survivingId}`);
    console.log(`Merged: ${result.mergedId}`);
    console.log(`Score: ${(result.matchScore * 100).toFixed(1)}%`);
    console.log(`Reasons: ${result.matchReasons.join(', ')}`);

    return result;
  });

} else if (command === 'auto-merge') {
  const threshold = parseFloat(process.argv[3]) || 0.9;
  const dryRun = process.argv.includes('--dry-run');

  await audit.action('auto_merge', 'canonical_entities', async () => {
    const result = await autoMerge(threshold, { dryRun, maxMerges: 50 });

    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Auto-Merge Results`);
    console.log('━'.repeat(40));
    console.log(`Merges performed: ${result.mergeCount}`);

    if (result.merges.length > 0) {
      console.log('\nMerges:');
      result.merges.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.merged.canonical_name} -> ${m.surviving.canonical_name} (${(m.score * 100).toFixed(0)}%)`);
      });
    }

    return result;
  });

} else if (command === 'stats') {
  await audit.read('canonical_entities', async () => {
    const stats = await getStats();

    console.log('\nEntity Resolution Statistics');
    console.log('━'.repeat(40));

    if (stats.entityStats) {
      console.log('\nBy Entity Type:');
      stats.entityStats.forEach(s => {
        console.log(`  ${s.entity_type}: ${s.total_entities} entities`);
        console.log(`    - Merged: ${s.merged_entities} | Verified: ${s.verified_entities}`);
        console.log(`    - Avg confidence: ${(s.avg_confidence * 100).toFixed(1)}%`);
      });
    }

    console.log('\nSource Distribution:');
    Object.entries(stats.sourceDistribution || {}).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} identifiers`);
    });

    console.log(`\nRecent merges (7 days): ${stats.recentMerges}`);

    return stats;
  });

} else {
  console.log('Entity Resolution Service');
  console.log('━'.repeat(40));
  console.log('\nUsage:');
  console.log('  node scripts/entity-resolution.mjs resolve [--dry-run]    - Resolve GHL contacts');
  console.log('  node scripts/entity-resolution.mjs duplicates [threshold] - Find duplicates');
  console.log('  node scripts/entity-resolution.mjs merge <id1> <id2>      - Merge two entities');
  console.log('  node scripts/entity-resolution.mjs auto-merge [threshold] [--dry-run] - Auto-merge');
  console.log('  node scripts/entity-resolution.mjs stats                  - Show statistics');
}
