#!/usr/bin/env node
/**
 * Agent Template — copy this to build a new Goods agent.
 *
 * Convention: scripts/agents/agent-<kebab-name>.mjs
 *
 * Steps to build a new agent:
 *   1. cp scripts/agents/_template.mjs scripts/agents/agent-<your-name>.mjs
 *   2. Fill in the config block with your four-part contract.
 *   3. Compose your userPrompt from real data (Supabase query, file read, API call).
 *   4. Run manually:  node scripts/agents/agent-<your-name>.mjs --dry-run
 *   5. Run real:      node scripts/agents/agent-<your-name>.mjs
 *   6. Register in ecosystem.config.cjs with a cron schedule.
 *
 * Do NOT:
 *   - Skip the four-part contract (budget/stop/fallback/scoped files)
 *   - Use a higher model tier than the task requires (use selectModel routing)
 *   - Auto-publish community-voice content without OCAP chain verification
 *   - Build a parallel LLM wrapper — use runAgent() from goods-agent-runtime.mjs
 */

import { runAgent, todayISO } from '../lib/goods-agent-runtime.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1 — Gather context from the systems of record
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gatherContext() {
  // Example shapes:
  //   const { data } = await supabase.from('xero_invoices').select(...);
  //   const ghl = await ghlApi.listOpportunities({ pipeline: 'Goods' });
  //   const wiki = await fs.readFile('wiki/projects/goods.md', 'utf8');
  //   return { data, ghl, wiki };

  return { placeholder: 'context object' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2 — Compose the userPrompt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function composePrompt(context) {
  return `
CONTEXT:
${JSON.stringify(context, null, 2)}

TASK:
<describe the bounded task in one paragraph>

EXPECTED OUTPUT FORMAT:
<describe the output shape — markdown table, bullet list, JSON, etc.>
`.trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3 — Run the agent with the four-part contract
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const context = await gatherContext();
  const userPrompt = composePrompt(context);

  const result = await runAgent({
    name: 'TEMPLATE-RENAME-ME',
    task: 'generate', // classify | extract | tag | score | draft | analyze | architect

    budget: {
      maxTokens: 2000,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when <concrete predicate, e.g., "3 ranked items written" or "pass/fail verdict rendered">',

    fallback:
      'if <blocking condition>, return <specific fallback text>, do not guess or fabricate',

    scopedFiles: [
      'wiki/projects/goods.md',
      // ...list every file the agent may reference; never "the whole repo"
    ],

    systemPrompt: `
You are the <NAME> agent for Goods on Country (ACT ecosystem).

Your role: <one sentence>.

Voice: if producing public-facing text, apply Curtis method from
.claude/skills/act-brand-alignment/references/writing-voice.md — name the room,
name the body, load the abstract noun, stop the line before the explanation.
No em-dashes. No AI tells. No rule-of-three padding.

If producing internal operational text, plain direct prose is fine.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/cockpit/template-rename-${todayISO()}.md`,

    autonomyLevel: 2, // L1 suggest / L2 propose+approve / L3 autonomous within bounds
    knowledgeType: 'action_item', // pattern | action_item | decision
    telegramSummary: false,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== agent output ===');
    console.log(result.output);
  }

  return result;
}

main().catch(err => {
  console.error(`[agent template] FAILED: ${err.message}`);
  process.exit(1);
});
