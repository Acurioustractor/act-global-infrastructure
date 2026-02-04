#!/usr/bin/env node
/**
 * Generate Program Area Summaries
 *
 * Groups projects by area (from notion_projects data) and generates
 * program-level summary narratives. Stores in program_summaries table.
 *
 * Program areas:
 *   - Justice Reform: JH, PICC
 *   - Economic Freedom: GD, TH
 *   - Technology & Innovation: EL, TS
 *   - Place & Land: TF
 *   - Global: ACT, WT
 *   - Operations: OPS
 *
 * Usage:
 *   node scripts/generate-program-summaries.mjs
 *   node scripts/generate-program-summaries.mjs --dry-run
 *
 * Schedule: Weekly (Sunday after weekly-digest)
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

const SCRIPT_NAME = 'generate-program-summaries';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

// Program area definitions
const PROGRAM_AREAS = [
  { area: 'Justice Reform', codes: ['JH', 'PICC'] },
  { area: 'Economic Freedom', codes: ['GD', 'TH'] },
  { area: 'Technology & Innovation', codes: ['EL', 'TS'] },
  { area: 'Place & Land', codes: ['TF'] },
  { area: 'Global', codes: ['ACT', 'WT'] },
  { area: 'Operations', codes: ['OPS'] },
];

async function main() {
  console.log('=== Generate Program Summaries ===');
  if (dryRun) console.log('DRY RUN');
  console.log('');

  for (const program of PROGRAM_AREAS) {
    console.log(`--- ${program.area} (${program.codes.join(', ')}) ---`);

    // Get latest project summaries for this area's projects
    const summaries = [];
    for (const code of program.codes) {
      const { data } = await supabase
        .from('project_summaries')
        .select('project_code, summary_text, stats, generated_at')
        .eq('project_code', code)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) summaries.push(data);
    }

    if (summaries.length === 0) {
      console.log('  No project summaries available — skipping');
      continue;
    }

    // Build context
    const context = summaries
      .map(s => `${s.project_code}:\n${s.summary_text}`)
      .join('\n\n');

    // Generate program summary
    const programSummary = await trackedCompletion(
      [
        {
          role: 'system',
          content: 'You write brief program area summaries for ACT social enterprise. 1-2 paragraphs, covering cross-project themes, shared challenges, and combined momentum. Plain text, no markdown. Max 200 words.',
        },
        {
          role: 'user',
          content: `Generate a "${program.area}" program summary from these project updates:\n\n${context}`,
        },
      ],
      SCRIPT_NAME,
      { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 300, operation: `program_${program.area}` }
    );

    console.log(`  Summary: ${programSummary.length} chars`);

    if (!dryRun) {
      const today = new Date().toISOString().split('T')[0];

      // Remove old summary for this area today
      await supabase
        .from('program_summaries')
        .delete()
        .eq('area', program.area)
        .gte('generated_at', `${today}T00:00:00`)
        .lt('generated_at', `${today}T23:59:59`);

      const { error } = await supabase
        .from('program_summaries')
        .insert({
          area: program.area,
          summary_text: programSummary.trim(),
          project_codes: program.codes,
          stats: {
            projectsIncluded: summaries.length,
            projectCodes: summaries.map(s => s.project_code),
          },
          generated_at: new Date().toISOString(),
        });

      if (error) console.error(`  Failed to store: ${error.message}`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
