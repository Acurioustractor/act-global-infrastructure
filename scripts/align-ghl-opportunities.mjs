#!/usr/bin/env node
/**
 * GHL Opportunity Tagger: Auto-assign project_code to ghl_opportunities
 *
 * Matches opportunity names against project-codes.json keywords (ghl_tags + names).
 * Score: exact keyword = 1.0, partial = 0.6, pipeline hint = 0.3
 * Auto-assigns if confidence > 0.7, flags for review if 0.3-0.7
 *
 * Usage:
 *   node scripts/align-ghl-opportunities.mjs           # Dry run
 *   node scripts/align-ghl-opportunities.mjs --apply    # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const projectCodes = await loadProjectsConfig();
const applyMode = process.argv.includes('--apply');

// Explicit pipeline name → project code mapping
const PIPELINE_MAP = {
  'a curious tractor': 'ACT-CA',
  'goods': 'ACT-GD',
  'goods.': 'ACT-GD',
  'festivals': 'ACT-CE',
  'act events': 'ACT-CE',
  'empathy ledger': 'ACT-EL',
  'justicehub': 'ACT-JH',
  'photo studio': 'ACT-PS',
  'radical scoops': 'ACT-RA',
  'picc': 'ACT-PI',
  'the harvest': 'ACT-HV',
  'confit': 'ACT-CF',
  'smart stories': 'ACT-SM',
  'marriage celebrant': 'ACT-MC',
};

// Build keyword map: keyword → { projectCode, weight }
function buildKeywordMap() {
  const map = [];
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    const keywords = [];

    // GHL tags (exact match, high weight)
    for (const tag of project.ghl_tags || []) {
      keywords.push({ keyword: tag.toLowerCase(), weight: 1.0 });
    }

    // Project name (partial match, medium weight)
    keywords.push({ keyword: project.name.toLowerCase(), weight: 0.9 });

    // Xero tracking name
    if (project.xero_tracking) {
      keywords.push({ keyword: project.xero_tracking.toLowerCase(), weight: 0.8 });
    }

    map.push({ code, name: project.name, keywords });
  }
  return map;
}

function scoreOpportunity(oppName, pipelineName, keywordMap) {
  const nameLower = (oppName || '').toLowerCase();
  const pipeLower = (pipelineName || '').toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  // Check explicit pipeline map first (high confidence)
  if (PIPELINE_MAP[pipeLower]) {
    const mappedCode = PIPELINE_MAP[pipeLower];
    const project = keywordMap.find(p => p.code === mappedCode);
    return {
      code: mappedCode,
      score: 0.8,
      matchedKeyword: `pipeline_map:${pipeLower}`,
      name: project?.name || mappedCode,
    };
  }

  for (const project of keywordMap) {
    let score = 0;
    let matchedKeyword = '';

    for (const { keyword, weight } of project.keywords) {
      // Exact substring match
      if (nameLower.includes(keyword)) {
        const keywordScore = weight;
        if (keywordScore > score) {
          score = keywordScore;
          matchedKeyword = keyword;
        }
      }
      // Pipeline name hint
      if (pipeLower.includes(keyword)) {
        const pipeScore = 0.3;
        if (pipeScore > score) {
          score = pipeScore;
          matchedKeyword = `pipeline:${keyword}`;
        }
      }
    }

    // Partial word match (any word in opp name matches any keyword word)
    if (score === 0) {
      const oppWords = nameLower.split(/\s+/);
      for (const { keyword, weight } of project.keywords) {
        const kwWords = keyword.split(/[\s-]+/);
        for (const word of oppWords) {
          if (word.length > 3 && kwWords.some(kw => kw.length > 3 && (kw.includes(word) || word.includes(kw)))) {
            const partialScore = weight * 0.6;
            if (partialScore > score) {
              score = partialScore;
              matchedKeyword = `partial:${word}~${keyword}`;
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { code: project.code, name: project.name, keyword: matchedKeyword, score };
    }
  }

  return bestMatch;
}

async function main() {
  console.log(`\n🔗 GHL Opportunity Tagger ${applyMode ? '(APPLY MODE)' : '(DRY RUN)'}\n`);

  const keywordMap = buildKeywordMap();

  // Fetch all opportunities without project_code
  const { data: opportunities, error } = await supabase
    .from('ghl_opportunities')
    .select('id, name, pipeline_name, stage_name, monetary_value, status, project_code')
    .is('project_code', null)
    .order('monetary_value', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching opportunities:', error.message);
    process.exit(1);
  }

  console.log(`Found ${opportunities.length} untagged opportunities\n`);

  const autoAssign = [];
  const review = [];
  const noMatch = [];

  for (const opp of opportunities) {
    const match = scoreOpportunity(opp.name, opp.pipeline_name, keywordMap);

    if (match && match.score >= 0.7) {
      autoAssign.push({ ...opp, match });
    } else if (match && match.score >= 0.3) {
      review.push({ ...opp, match });
    } else {
      noMatch.push(opp);
    }
  }

  // Report auto-assigns
  if (autoAssign.length > 0) {
    console.log(`✅ AUTO-ASSIGN (${autoAssign.length}):`);
    for (const opp of autoAssign) {
      const val = opp.monetary_value ? `$${(opp.monetary_value / 100).toLocaleString()}` : '-';
      console.log(`  ${opp.match.code} ← "${opp.name}" (${val}) [${opp.match.keyword}, score=${opp.match.score.toFixed(2)}]`);
    }
    console.log();
  }

  // Report review items
  if (review.length > 0) {
    console.log(`⚠️  NEEDS REVIEW (${review.length}):`);
    for (const opp of review) {
      const val = opp.monetary_value ? `$${(opp.monetary_value / 100).toLocaleString()}` : '-';
      console.log(`  ${opp.match.code}? ← "${opp.name}" (${val}) [${opp.match.keyword}, score=${opp.match.score.toFixed(2)}]`);
    }
    console.log();
  }

  // Report no matches
  if (noMatch.length > 0) {
    console.log(`❌ NO MATCH (${noMatch.length}):`);
    for (const opp of noMatch.slice(0, 10)) {
      const val = opp.monetary_value ? `$${(opp.monetary_value / 100).toLocaleString()}` : '-';
      console.log(`  "${opp.name}" (${val}) [pipeline: ${opp.pipeline_name || '-'}]`);
    }
    if (noMatch.length > 10) console.log(`  ... and ${noMatch.length - 10} more`);
    console.log();
  }

  // Summary
  console.log(`\nSummary: ${autoAssign.length} auto-assign, ${review.length} review, ${noMatch.length} no match`);
  console.log(`Coverage: ${opportunities.length > 0 ? ((autoAssign.length / opportunities.length) * 100).toFixed(1) : 0}% auto-assignable\n`);

  if (applyMode && autoAssign.length > 0) {
    console.log('Applying auto-assignments...');
    let applied = 0;
    for (const opp of autoAssign) {
      const { error: updateError } = await supabase
        .from('ghl_opportunities')
        .update({ project_code: opp.match.code })
        .eq('id', opp.id);

      if (updateError) {
        console.error(`  Failed to update "${opp.name}": ${updateError.message}`);
      } else {
        applied++;
      }
    }
    console.log(`✅ Applied ${applied}/${autoAssign.length} assignments\n`);
  } else if (!applyMode && autoAssign.length > 0) {
    console.log('Run with --apply to write changes.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
