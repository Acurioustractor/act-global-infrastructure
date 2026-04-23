#!/usr/bin/env node
/**
 * A6 — Narrative Gatekeeper
 *
 * Screens any public-facing draft artefact against the ACT writing voice
 * (Curtis method + forbidden AI tells). Returns pass/fail + specific rewrites.
 *
 * Trigger modes:
 *   1. On-demand: pipe a draft file path, get a verdict
 *      node scripts/agents/agent-narrative-gatekeeper.mjs --file <path>
 *   2. Pre-commit hook (future): block commits of wiki/output/letters/ with AI tells
 *   3. Cockpit panel (future): show the last 5 screened artefacts
 *
 * Output: pass/fail verdict + line-level rewrites, written to
 *   thoughts/shared/cockpit/narrative-gatekeeper/<basename>-<date>.md
 *
 * Cost: Sonnet tier. Typical cost per screen ≤ $0.02.
 *
 * Autonomy: L1 (suggest) — agent never rewrites the source. Human accepts rewrites.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { runAgent, todayISO } from '../lib/goods-agent-runtime.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const fileArgIdx = process.argv.indexOf('--file');
const filePath = fileArgIdx >= 0 ? process.argv[fileArgIdx + 1] : null;

if (!filePath) {
  console.error('Usage: node scripts/agents/agent-narrative-gatekeeper.mjs --file <path>');
  process.exit(1);
}

const VOICE_REFERENCE_PATH = '.claude/skills/act-brand-alignment/references/writing-voice.md';

async function main() {
  const [draft, voiceRef] = await Promise.all([
    fs.readFile(filePath, 'utf8'),
    fs.readFile(VOICE_REFERENCE_PATH, 'utf8'),
  ]);

  const basename = path.basename(filePath, path.extname(filePath));

  const userPrompt = `
WRITING VOICE REFERENCE (authoritative):
${voiceRef}

---

DRAFT TO SCREEN:
${draft}

---

SCREEN THIS DRAFT:

1. Forbidden vocabulary check (list any occurrences with line reference): delve, crucial, pivotal, vital, significant, profound, tapestry, landscape-as-abstract, interplay, intricate, nuanced, underscore, highlight-as-verb, showcase, emphasise, illustrate, testament, enduring, lasting, timeless, indelible, vibrant, rich, bustling, thriving, diverse, dynamic, boasts, features, stands as, serves as, represents, meticulous, seamless, effortless, groundbreaking, renowned, in the heart of, nestled, at the forefront of, world-class, leveraging, fostering, cultivating, empowering, unlocking.

2. Forbidden constructions check: negative parallelism ("not just X, but Y"), rule-of-three adjective padding, -ing significance tails, copula avoidance ("serves as"), elegant variation, "challenges and future prospects", significance claims, notability laundering, knowledge disclaimers.

3. Forbidden punctuation: em-dashes, curly quotes, emoji-as-formatting, title-case headings, inline-header-bold-colon lists.

4. Curtis four-move check on the 3 most weighted sentences: name the room, name the body, load the abstract noun, stop the line before the explanation.

5. Plainness test: could a 14-year-old in Doomadgee say this without translation? Does it sound like a pitch deck?

OUTPUT FORMAT:

## Verdict
<PASS | FAIL>

## Forbidden vocabulary hits
- line X: "<word>" → suggest "<replacement or cut>"

## Forbidden construction hits
- line X: <construction name> → rewrite as: "<concrete rewrite>"

## Punctuation hits
- line X: em-dash / curly quote / bold-colon / etc

## Curtis-method analysis (top 3 weighted sentences)
1. "<sentence>"
   - Room: <named or MISSING>
   - Body: <named or MISSING>
   - Abstract noun loaded: <noun or MISSING>
   - Stopped in time: <YES or NO, with rewrite if NO>
2. <same>
3. <same>

## Plainness
<PASS | FAIL> — <one-line reason>

## Required rewrites before ship
- <numbered list of concrete line-level rewrites>

## If PASS
One-line note: "ready to ship. voice clean."
`.trim();

  const result = await runAgent({
    name: 'narrative-gatekeeper',
    task: 'analyze',

    budget: {
      maxTokens: 3000,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when the verdict PASS or FAIL is rendered with all sections populated, including Curtis-method analysis of the top 3 weighted sentences',

    fallback:
      'if the draft is empty or unreadable, return VERDICT: FAIL with reason "draft unreadable", do not fabricate content',

    scopedFiles: [
      filePath,
      VOICE_REFERENCE_PATH,
    ],

    systemPrompt: `
You are the Narrative Gatekeeper agent for ACT — specifically Goods on Country.

Your single task: screen a draft against the ACT writing voice (Curtis method) and produce a PASS/FAIL verdict with specific line-level rewrites.

You are strict. You are not kind. You flag on sight. The voice is load-bearing for the brand and for every funder, community partner, and public reader who encounters ACT writing. Every AI tell that ships damages the brand.

You are not a copy-editor for preference. You are a gate for the rules listed in the voice reference. If the draft follows the rules, you pass it. If it breaks one rule, you fail it with the specific rewrite.

Refuse to soften your verdict. No "mostly passes". No "minor concerns". Pass or fail.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/cockpit/narrative-gatekeeper/${basename}-${todayISO()}.md`,

    autonomyLevel: 1,
    knowledgeType: 'pattern',
    telegramSummary: false,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== verdict ===');
    console.log(result.output);
  }

  const verdict = result.output.match(/## Verdict\s*\n(PASS|FAIL)/)?.[1] ?? 'UNKNOWN';
  console.log(`[narrative-gatekeeper] ${filePath} → ${verdict}`);

  if (verdict === 'FAIL') {
    process.exit(2);
  }
}

main().catch(err => {
  console.error(`[narrative-gatekeeper] FAILED: ${err.message}`);
  process.exit(1);
});
