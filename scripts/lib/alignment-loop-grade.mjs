/**
 * Alignment-loop self-grade helper.
 *
 * Used by `scripts/synthesize-*.mjs` (Phase-2 integration per
 * `thoughts/shared/plans/act-alignment-loop.md`): after the synthesis script
 * writes a draft to `wiki/synthesis/<slug>-YYYY-MM-DD.md`, call this helper.
 * It grades the draft against `thoughts/shared/rubrics/alignment-loop-synthesis.md`
 * (calibrated 6/6, v0.1).
 *
 * On `pass`: returns `{ verdict, score }` and the synthesis is considered
 * commit-eligible.
 *
 * On `warn` or `fail`: also writes a triage report to
 * `wiki/output/lint-loop-YYYY-MM-DD.md` so Ben can see exactly which moves
 * need fixing before the next cycle. Returns `{ verdict, score, lintPath }`.
 *
 * Usage:
 *   import { gradeAndLint } from './lib/alignment-loop-grade.mjs';
 *   const result = await gradeAndLint('wiki/synthesis/foo-2026-05-08.md', 'foo');
 *   if (result.verdict !== 'pass') { console.error(`lint at ${result.lintPath}`); }
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade as gradeSynthesis } from '../grade-alignment-loop-synthesis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

/**
 * Grade a synthesis file and write a lint report on warn/fail.
 *
 * @param {string} filePath - absolute or repo-relative path to the synthesis md
 * @param {string} slug     - synthesis slug (e.g. 'funder-alignment')
 * @param {object} [opts]   - { tier1Only?: boolean, lintDir?: string }
 * @returns {Promise<{ verdict, score, hard_failures?, structural_check?, judgment_check?, lintPath? }>}
 */
export async function gradeAndLint(filePath, slug, opts = {}) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Synthesis file not found: ${absPath}`);
  }
  const text = fs.readFileSync(absPath, 'utf8');

  let anthropic = null;
  if (!opts.tier1Only) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[alignment-loop-grade] ANTHROPIC_API_KEY not set; running --tier1-only');
      opts = { ...opts, tier1Only: true };
    } else {
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  const result = await gradeSynthesis(text, slug, anthropic, opts);

  if (result.verdict === 'pass') {
    return result;
  }

  // warn or fail: write a lint-loop report so Ben can triage in one place
  const date = new Date().toISOString().slice(0, 10);
  const lintDir = opts.lintDir || path.join(REPO_ROOT, 'wiki', 'output');
  fs.mkdirSync(lintDir, { recursive: true });
  const lintPath = path.join(lintDir, `lint-loop-${date}.md`);

  const md = renderLint(filePath, slug, result, date);
  // Append-or-create: if a lint file already exists for today, append; else create.
  if (fs.existsSync(lintPath)) {
    fs.appendFileSync(lintPath, '\n\n---\n\n' + md);
  } else {
    fs.writeFileSync(lintPath, md);
  }

  return { ...result, lintPath };
}

function renderLint(filePath, slug, result, date) {
  const lines = [
    `# Alignment-loop lint — ${date}`,
    '',
    `> File: \`${filePath}\``,
    `> Slug: ${slug}`,
    `> Rubric: \`thoughts/shared/rubrics/alignment-loop-synthesis.md\` (v0.1)`,
    `> Grader: \`scripts/grade-alignment-loop-synthesis.mjs\` (Sonnet 4.6, calibrated 6/6)`,
    '',
    `## Verdict: **${result.verdict.toUpperCase()}** · Score: ${result.score}/100`,
    '',
  ];

  if (result.hard_failures && result.hard_failures.length) {
    lines.push(`## Hard failures (${result.hard_failures.length})`);
    lines.push('');
    for (const f of result.hard_failures.slice(0, 20)) {
      lines.push(`- **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet || ''}`);
    }
    if (result.hard_failures.length > 20) {
      lines.push(`- ...and ${result.hard_failures.length - 20} more`);
    }
    lines.push('');
  }

  if (result.structural_check) {
    lines.push('## Structural check');
    lines.push('');
    for (const [k, v] of Object.entries(result.structural_check)) {
      lines.push(`- ${v ? '✅' : '❌'} ${k}`);
    }
    lines.push('');
  }

  if (result.judgment_check) {
    lines.push('## Judgment check');
    lines.push('');
    for (const [k, v] of Object.entries(result.judgment_check)) {
      lines.push(`- ${v ? '✅' : '❌'} ${k}`);
    }
    lines.push('');
  }

  if (result.advice && result.advice.length) {
    lines.push('## Advice');
    lines.push('');
    for (const a of result.advice) lines.push(`- ${a}`);
    lines.push('');
  }

  lines.push('## Next');
  lines.push('');
  if (result.verdict === 'fail') {
    lines.push('- Synthesis is NOT commit-eligible. Address hard failures and judgment misses, then re-run the synthesize script. The grader will produce a fresh lint at re-run.');
  } else {
    lines.push('- Synthesis is commit-eligible (verdict: warn). Structural moves above need attention before the next cycle, but no hard failures or judgment misses block this commit.');
  }
  lines.push('');

  return lines.join('\n');
}
