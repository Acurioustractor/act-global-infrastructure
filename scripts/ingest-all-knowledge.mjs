#!/usr/bin/env node
/**
 * ACT Knowledge Ingestion - Initial Bulk Load
 *
 * Ingests all documentation from ACT codebases into unified knowledge base
 * Run once for initial setup, then use incremental sync for daily updates
 *
 * Usage:
 *   npm run knowledge:ingest
 *
 * Environment variables required:
 *   - OPENAI_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from act-regenerative-studio (TypeScript compiled)
const studioPath = resolve(__dirname, '../../Code/act-regenerative-studio');

// ACT Codebases to ingest
const CODEBASES = [
  {
    path: '/Users/benknight/Code/act-regenerative-studio',
    name: 'act-regenerative-studio',
    description: 'ACT Studio main site + unified services'
  },
  {
    path: '/Users/benknight/Code/empathy-ledger-v2',
    name: 'empathy-ledger-v2',
    description: 'Empathy Ledger ethical storytelling platform'
  },
  {
    path: '/Users/benknight/Code/JusticeHub',
    name: 'justicehub-platform',
    description: 'JusticeHub community-led justice services'
  },
  {
    path: '/Users/benknight/Code/The Harvest Website',
    name: 'theharvest',
    description: 'The Harvest regenerative farm + CSA'
  },
  {
    path: '/Users/benknight/Code/act-farm',
    name: 'act-farm',
    description: 'ACT Farm R&D residency + innovation hub'
  },
  {
    path: '/Users/benknight/Code/Goods Asset Register',
    name: 'goods-asset-register',
    description: 'Goods on Country asset register'
  },
  {
    path: '/Users/benknight/Code/bcv-studio',
    name: 'bcv-studio',
    description: 'Black Cockatoo Valley ecological regeneration'
  },
  {
    path: '/Users/benknight/Code/ACT Placemat',
    name: 'act-placemat',
    description: 'ACT Placemat business intelligence platform'
  },
  {
    path: '/Users/benknight/act-global-infrastructure',
    name: 'act-global-infrastructure',
    description: 'ACT ecosystem automation + infrastructure'
  }
];

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ACT Knowledge Ingestion - Initial Bulk Load');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📦 Processing ${CODEBASES.length} codebases...`);
  console.log('');

  const { knowledgeIngestion } = await import(
    `file://${studioPath}/src/lib/ai-intelligence/knowledge-ingestion-service.ts`
  );

  let totalChunks = 0;
  let totalCost = 0;
  const results = [];

  for (const codebase of CODEBASES) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📁 ${codebase.name}`);
    console.log(`   ${codebase.description}`);
    console.log(`   Path: ${codebase.path}`);

    try {
      const result = await knowledgeIngestion.ingestCodebase(
        codebase.path,
        codebase.name,
        {
          skipExisting: true,
          minContentLength: 100
        }
      );

      totalChunks += result.chunksCreated;
      totalCost += result.totalCost;

      results.push({
        name: codebase.name,
        ...result
      });

      if (result.success) {
        console.log(`   ✅ Success: ${result.chunksCreated} chunks created`);
      } else {
        console.log(`   ❌ Failed with ${result.errors.length} errors`);
      }

      if (result.duplicates > 0) {
        console.log(`   ⏭️  Skipped ${result.duplicates} duplicates`);
      }

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors:`);
        result.errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
        if (result.errors.length > 5) {
          console.log(`      ... and ${result.errors.length - 5} more`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Fatal error: ${error.message}`);
      results.push({
        name: codebase.name,
        success: false,
        chunksProcessed: 0,
        chunksCreated: 0,
        chunksSkipped: 0,
        totalCost: 0,
        errors: [error.message],
        duplicates: 0
      });
    }
  }

  // Summary
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ INGESTION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📊 Summary:`);
  console.log(`   • Codebases processed: ${CODEBASES.length}`);
  console.log(`   • Total chunks created: ${totalChunks}`);
  console.log(`   • Total cost: $${totalCost.toFixed(6)}`);
  console.log(`   • Successful: ${results.filter(r => r.success).length}/${results.length}`);
  console.log('');

  // Per-project breakdown
  console.log(`📦 Per-Project Breakdown:`);
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`   ${status} ${r.name}: ${r.chunksCreated} chunks ($${r.totalCost.toFixed(6)})`);
  });

  // Get overall stats
  console.log('');
  console.log(`📈 Getting database statistics...`);

  const stats = await knowledgeIngestion.getStats();

  console.log('');
  console.log(`📊 Knowledge Base Statistics:`);
  console.log(`   • Total knowledge items: ${stats.totalKnowledge}`);
  console.log(`   • Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   • Estimated total cost: $${stats.totalCost.toFixed(6)}`);
  console.log('');

  console.log(`📋 By Source Type:`);
  Object.entries(stats.bySource).forEach(([type, count]) => {
    console.log(`   • ${type}: ${count}`);
  });

  console.log('');
  console.log(`🏢 By Project:`);
  Object.entries(stats.byProject)
    .sort((a, b) => b[1] - a[1])
    .forEach(([project, count]) => {
      console.log(`   • ${project}: ${count}`);
    });

  console.log('');
  console.log(`📚 By Content Type:`);
  Object.entries(stats.byContentType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   • ${type}: ${count}`);
    });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Next Steps:');
  console.log('   1. Review knowledge in Supabase database');
  console.log('   2. Test semantic search: npm run knowledge:search "LCAA methodology"');
  console.log('   3. Test RAG queries: npm run knowledge:ask "What are ACT principles?"');
  console.log('   4. Set up daily automation: npm run knowledge:sync (incremental)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
