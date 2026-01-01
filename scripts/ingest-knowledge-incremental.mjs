#!/usr/bin/env node
/**
 * ACT Knowledge Ingestion - Incremental Sync
 *
 * Daily incremental sync for new/updated documentation
 * Only processes files modified since last sync
 *
 * Usage:
 *   npm run knowledge:sync
 *
 * Run by Master Automation daily at 5 AM UTC
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from act-regenerative-studio (TypeScript compiled)
const studioPath = resolve(__dirname, '../../Code/act-regenerative-studio');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CODEBASES = [
  { path: '/Users/benknight/Code/act-regenerative-studio', name: 'act-regenerative-studio' },
  { path: '/Users/benknight/Code/empathy-ledger-v2', name: 'empathy-ledger-v2' },
  { path: '/Users/benknight/Code/JusticeHub', name: 'justicehub-platform' },
  { path: '/Users/benknight/Code/The Harvest Website', name: 'theharvest' },
  { path: '/Users/benknight/Code/act-farm', name: 'act-farm' },
  { path: '/Users/benknight/Code/Goods Asset Register', name: 'goods-asset-register' },
  { path: '/Users/benknight/Code/bcv-studio', name: 'bcv-studio' },
  { path: '/Users/benknight/Code/ACT Placemat', name: 'act-placemat' },
  { path: '/Users/benknight/act-global-infrastructure', name: 'act-global-infrastructure' }
];

/**
 * Check if codebase has changes since last sync
 */
async function hasChanges(codebasePath, lastSyncTime) {
  try {
    // Simple check: look at .git directory mod time or README.md
    const gitDir = `${codebasePath}/.git`;
    const readmePath = `${codebasePath}/README.md`;

    let mostRecentChange = new Date(0);

    try {
      const gitStat = await fs.stat(gitDir);
      if (gitStat.mtime > mostRecentChange) {
        mostRecentChange = gitStat.mtime;
      }
    } catch {}

    try {
      const readmeStat = await fs.stat(readmePath);
      if (readmeStat.mtime > mostRecentChange) {
        mostRecentChange = readmeStat.mtime;
      }
    } catch {}

    return mostRecentChange > lastSyncTime;

  } catch {
    // If we can't determine, assume changes
    return true;
  }
}

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 ACT Knowledge Ingestion - Incremental Sync');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const { knowledgeIngestion } = await import(
    `file://${studioPath}/src/lib/ai-intelligence/knowledge-ingestion-service.ts`
  );

  // Get sync status for all sources
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('source_type', 'codebase');

  const lastSyncMap = new Map(
    (sources || []).map(s => [
      s.source_identifier,
      s.last_synced_at ? new Date(s.last_synced_at) : new Date(0)
    ])
  );

  let totalProcessed = 0;
  let totalCost = 0;
  let codebasesUpdated = 0;

  for (const codebase of CODEBASES) {
    const lastSync = lastSyncMap.get(codebase.name) || new Date(0);
    const changed = await hasChanges(codebase.path, lastSync);

    if (!changed) {
      console.log(`⏭️  ${codebase.name}: No changes since ${lastSync.toISOString()}`);
      continue;
    }

    console.log(`\n📥 ${codebase.name}: Changes detected, ingesting...`);

    try {
      const result = await knowledgeIngestion.ingestCodebase(
        codebase.path,
        codebase.name,
        {
          skipExisting: true, // Only add new files
          minContentLength: 100
        }
      );

      totalProcessed += result.chunksCreated;
      totalCost += result.totalCost;

      if (result.chunksCreated > 0) {
        codebasesUpdated++;
        console.log(`   ✅ ${result.chunksCreated} new chunks added ($${result.totalCost.toFixed(6)})`);
      } else {
        console.log(`   ℹ️  No new content (${result.duplicates} duplicates skipped)`);
      }

      if (result.errors.length > 0) {
        console.log(`   ⚠️  ${result.errors.length} errors`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ INCREMENTAL SYNC COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📊 Summary:`);
  console.log(`   • Codebases checked: ${CODEBASES.length}`);
  console.log(`   • Codebases updated: ${codebasesUpdated}`);
  console.log(`   • New chunks added: ${totalProcessed}`);
  console.log(`   • Total cost: $${totalCost.toFixed(6)}`);
  console.log('');

  if (totalProcessed === 0) {
    console.log(`ℹ️  No new knowledge to ingest - all codebases up to date`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
