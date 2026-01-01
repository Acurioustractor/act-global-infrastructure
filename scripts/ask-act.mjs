#!/usr/bin/env node
/**
 * ACT Intelligence Hub - CLI Query Tool
 *
 * Ask questions across all ACT knowledge:
 * - 6,443 lines of ACT knowledge base
 * - GitHub issues & PRs
 * - Notion databases
 * - GHL partners & grants (once synced)
 *
 * Usage:
 *   npm run ask "What's the LCAA methodology?"
 *   npm run ask "Who are our active partners?" --fast
 *   npm run ask "Grants due this month" --sources
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from act-regenerative-studio (TypeScript compiled)
const studioPath = resolve(__dirname, '../../Code/act-regenerative-studio');
const require = createRequire(import.meta.url);

// Parse CLI arguments
const args = process.argv.slice(2);
const query = args.filter(arg => !arg.startsWith('--')).join(' ');
const tier = args.includes('--fast') ? 'quick' : 'deep';
const showSources = args.includes('--sources');
const showCost = args.includes('--cost');

// Help text
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ACT Intelligence Hub - CLI Query Tool

Usage:
  npm run ask "your question here" [options]
  ask-act "your question here" [options]  # if symlinked

Options:
  --fast         Use quick tier (faster, cheaper, less accurate)
  --sources      Show source documents used
  --cost         Show detailed cost breakdown
  -h, --help     Show this help message

Examples:
  npm run ask "What's the LCAA methodology?"
  npm run ask "Who are our active partners?" --fast
  npm run ask "Grants due this month" --sources
  npm run ask "How do I invoice NDIS?" --cost

Query Types:
  - ACT Knowledge: "What is LCAA?", "40% profit sharing policy"
  - Partners: "Active partners", "Partner check-ins this week"
  - Grants: "Grant deadlines", "Applied grants"
  - Workflows: "Invoice process", "Receipt workflow"
  - Projects: "JusticeHub features", "Empathy Ledger tech stack"

Cost:
  Quick tier: ~$0.005-0.01 per query
  Deep tier:  ~$0.01-0.03 per query
  `);
  process.exit(0);
}

if (!query) {
  console.error('❌ Error: No question provided\n');
  console.log('Usage: npm run ask "your question here" [--fast] [--sources] [--cost]');
  console.log('Try: npm run ask --help');
  process.exit(1);
}

// Main execution
async function main() {
  try {
    console.log(`\n🔍 Asking ACT: "${query}"\n`);
    console.log(`⚙️  Tier: ${tier === 'quick' ? 'Quick (fast & cheap)' : 'Deep (thorough)'}\n`);

    // Dynamic import of the unified RAG service
    // This needs to be compiled TypeScript, so we'll use a workaround
    const { unifiedRAG } = await import(`file://${studioPath}/src/lib/ai-intelligence/unified-rag-service.ts`);

    const startTime = Date.now();

    const response = await unifiedRAG.ask({
      query,
      tier,
      topK: tier === 'quick' ? 5 : 10,
      minSimilarity: tier === 'quick' ? 0.6 : 0.7,
      includeSources: showSources || showCost,
      useHybridSearch: tier === 'deep'
    });

    const totalTime = Date.now() - startTime;

    // Display answer
    console.log('📝 Answer:\n');
    console.log(response.answer);
    console.log();

    // Display sources if requested
    if (showSources && response.sources?.length > 0) {
      console.log('📚 Sources:\n');
      response.sources.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.title}`);
        console.log(`     Project: ${s.sourceProject || 'Unknown'}`);
        console.log(`     Confidence: ${(s.confidence * 100).toFixed(1)}%`);
        if (s.excerpt) {
          console.log(`     Excerpt: ${s.excerpt.substring(0, 100)}...`);
        }
        console.log();
      });
    }

    // Display cost breakdown if requested
    if (showCost) {
      console.log('💰 Cost Breakdown:\n');
      console.log(`  Embedding:   $${response.cost.embedding.toFixed(6)}`);
      console.log(`  Generation:  $${response.cost.generation.toFixed(6)}`);
      console.log(`  Total:       $${response.cost.total.toFixed(6)}`);
      console.log();

      console.log('⏱️  Performance:\n');
      console.log(`  Embedding:   ${response.latencyMs.embedding}ms`);
      console.log(`  Search:      ${response.latencyMs.search}ms`);
      console.log(`  Generation:  ${response.latencyMs.generation}ms`);
      console.log(`  Total:       ${response.latencyMs.total}ms`);
      console.log();

      console.log('🎯 Quality:\n');
      console.log(`  Confidence:  ${(response.overallConfidence * 100).toFixed(1)}%`);
      console.log(`  Similarity:  ${(response.avgSimilarity * 100).toFixed(1)}%`);
      console.log(`  Sources:     ${response.sources?.length || 0}`);
      console.log();
    }

    // Always show quick summary
    if (!showCost) {
      console.log(`💰 Cost: $${response.cost.total.toFixed(4)} | ⏱️  ${response.latencyMs.total}ms | 🎯 Confidence: ${(response.overallConfidence * 100).toFixed(0)}%`);
      console.log();
    }

    // Tip
    if (!showSources && !showCost) {
      console.log('💡 Tip: Add --sources to see source documents, --cost for detailed metrics\n');
    }

  } catch (error) {
    console.error('\n❌ Error querying ACT knowledge:\n');

    if (error instanceof Error) {
      console.error(`  ${error.message}\n`);

      // Helpful error messages
      if (error.message.includes('SUPABASE')) {
        console.error('  Check SUPABASE environment variables:');
        console.error('  - NEXT_PUBLIC_SUPABASE_URL');
        console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
      } else if (error.message.includes('OPENAI')) {
        console.error('  Check OPENAI_API_KEY environment variable\n');
      } else if (error.message.includes('Cannot find module')) {
        console.error('  The unified RAG service may need to be compiled.');
        console.error('  Try running: cd /Users/benknight/Code/act-regenerative-studio && npm run build\n');
      }
    } else {
      console.error(`  ${String(error)}\n`);
    }

    process.exit(1);
  }
}

main();
