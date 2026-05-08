#!/usr/bin/env node
/**
 * Grader for the alignment-loop-synthesis rubric (v0.1).
 *
 * Layered on top of act-voice-curtis. This rubric grades synthesis articles
 * produced by the ACT Alignment Loop (cross-source reconciliation cycles).
 * Specifically: wiki/synthesis/funder-alignment-*.md, project-truth-state-*.md,
 * entity-migration-truth-state-*.md, and future synthesis questions.
 *
 * Tier 1 = deterministic regex / list / structural / file-existence checks.
 * Tier 2 + 3 = single Sonnet 4.6 call with synthesis context.
 *
 * Usage:
 *   node scripts/grade-alignment-loop-synthesis.mjs --calibrate
 *   node scripts/grade-alignment-loop-synthesis.mjs --file <path> --slug <synthesis-slug>
 *   node scripts/grade-alignment-loop-synthesis.mjs --file <path> --slug <synthesis-slug> --tier1-only
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFunders } from './lib/claim-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RUBRIC_VERSION = '0.1';
const FIXTURES_DIR = path.join(REPO_ROOT, 'thoughts', 'shared', 'rubrics', 'fixtures', 'alignment-loop-synthesis');
const REPORT_PATH = path.join(REPO_ROOT, 'thoughts', 'shared', 'rubrics', 'alignment-loop-synthesis.calibration.md');

// ─── Voice-curtis Tier 1 patterns (inherited per rubric rule 1.5) ──────────
const VOICE_FORBIDDEN_BASE = [
  'delve', 'crucial', 'pivotal', 'vital', 'significant', 'profound',
  'tapestry', 'interplay', 'intricate', 'nuanced',
  'underscore', 'showcase', 'emphasise', 'emphasize', 'illustrate',
  'testament', 'enduring', 'lasting', 'timeless', 'indelible',
  'vibrant', 'bustling', 'thriving', 'dynamic',
  'boasts', 'meticulous', 'seamless', 'effortless', 'groundbreaking', 'renowned',
  'nestled',
];
const VOICE_FORBIDDEN_VERB_STEMS = ['leverage', 'foster', 'cultivate', 'empower', 'unlock'];
function expandVerb(stem) {
  const ing = stem.endsWith('e') ? stem.slice(0, -1) + 'ing' : stem + 'ing';
  const ed = stem.endsWith('e') ? stem + 'd' : stem + 'ed';
  return [stem, stem + 's', ing, ed];
}
function expandStem(word) {
  const verbish = ['delve', 'underscore', 'showcase', 'emphasise', 'emphasize', 'illustrate'];
  return verbish.includes(word) ? expandVerb(word) : [word];
}
const VOICE_FORBIDDEN_VOCAB = [
  ...VOICE_FORBIDDEN_BASE.flatMap(expandStem),
  ...VOICE_FORBIDDEN_VERB_STEMS.flatMap(expandVerb),
];
const VOICE_FORBIDDEN_PHRASES = [
  'in the heart of', 'at the forefront of', 'world-class',
  'stands as', 'serves as',
];
const VOICE_PATTERNS = {
  em_dash: /—|(?<![-])--(?![-A-Za-z])/,
  curly_quotes: /[“”‘’]/,
  negative_parallelism: /not just\b.{0,60}\bbut\b|it'?s not about\b.{0,60}\bit'?s about\b|more than\b.{0,60}\bit'?s\b/i,
  significance_claim: /(plays?|its|a) (pivotal|key|crucial|vital) role|marks a (key|pivotal) moment|sets the stage for|paving the way|at a critical juncture/i,
  knowledge_disclaimer: /while specific details are limited|based on available information|it is worth noting|it should be noted/i,
  vague_attribution: /experts (argue|note|say|believe)|observers (note|say)|many have said|it is widely (believed|recognised|recognized)/i,
  copula_avoidance: /serves as a (cornerstone|foundation|testament|reminder)|stands as a (testament|symbol|reminder)|represents a (shift|change|moment)/i,
  challenges_future: /despite (these )?challenges|continues to (evolve|grow|thrive)|looking (forward|ahead) to the future/i,
};

function isMetaLine(ln) {
  if (/^\s*-?\s*\[[ x]\]\s*no\s+["']/i.test(ln)) return true;
  if (/^\s*(forbidden|reject|avoid|do not use|don'?t use|no\s)/i.test(ln) && /[",]\s*[a-z]+,\s*[a-z]+/.test(ln)) return true;
  const quoted = ln.match(/["']([^"']+)["']/);
  if (quoted) {
    const inside = quoted[1].toLowerCase();
    const matches = VOICE_FORBIDDEN_BASE.filter(w => inside.includes(w)).length;
    if (matches >= 3) return true;
  }
  return false;
}

function voiceTier1(text) {
  const failures = [];
  const lines = text.split('\n');
  for (const word of VOICE_FORBIDDEN_VOCAB) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    lines.forEach((ln, i) => {
      if (isMetaLine(ln)) return;
      if (re.test(ln)) failures.push({ rule: 'voice:forbidden_vocab', evidence: word, line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }
  for (const phrase of VOICE_FORBIDDEN_PHRASES) {
    lines.forEach((ln, i) => {
      if (isMetaLine(ln)) return;
      if (ln.toLowerCase().includes(phrase)) failures.push({ rule: 'voice:forbidden_phrase', evidence: phrase, line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }
  for (const [rule, re] of Object.entries(VOICE_PATTERNS)) {
    lines.forEach((ln, i) => {
      if (isMetaLine(ln) && rule !== 'em_dash' && rule !== 'curly_quotes') return;
      const m = ln.match(re);
      if (m) failures.push({ rule: `voice:${rule}`, evidence: m[0], line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }
  return failures;
}

// ─── Synthesis-specific Tier 1 ─────────────────────────────────────────────

// 1.1 Every drift claim cites both sides (paths or IDs visible)
const DRIFT_PATTERNS = [
  // explicit "wiki says X but DB shows Y"
  /(wiki|funders\.json|plan|draft)\s+(says|claims|tags|stage(?:[ds])?)\s+.{1,80}\s+(xero|db|reality|actual|ledger|invoice)\s+(shows|has|paid|received)/i,
  // tranche/months behind
  /\d+\s+(tranches?|days?|months?|years?)\s+behind\s+(reality|the\s+(db|ledger|wiki))/i,
  // missing-from claims (also caught by 1.4 — listed here for completeness)
  /\b(missing|absent|not\s+listed)\s+(from|in)\s+(funders\.json|the\s+ledger|wiki|plans|GHL)/i,
  // emoji classifications often signalling drift
  /⚠️\s*(drift|wiki|db|plan)-?(alert|absent)?/i,
];
const DRIFT_CITATION_NEAR_RE = /(INV-\d+|BILL-\d+|wiki\/[a-z0-9_./-]+\.md|funders\.json|funders\.[a-z-]+\.|ghl_contacts(?:\.[a-z_]+)?|xero_invoices(?:\.[a-z_]+)?|2026-\d{2}-\d{2}|decision-log|board paper|\$[\d,.]+(?:M|K)?)/i;

function isDriftDefinitionLine(ln) {
  // Lines like "Legend: 🟢 paid / current, ⚠️ drift-alert" are definitions, not claims.
  // Lines like "drift-alert: sources disagree, action needed" or table-header rows are also definitions.
  if (/^\s*(\*\*)?legend(:|\b)/i.test(ln)) return true;
  if (/^\s*[-*]\s*`?(aligned|drift-alert|wiki-absent|db-absent|plan-absent|historical-only)`?\s*[-—:]/i.test(ln)) return true;
  if (/^\s*\|.*\|.*\|/.test(ln) && /\b(legend|key|classification|status)\b/i.test(ln)) return true;
  return false;
}

function checkDriftCitations(text) {
  const failures = [];
  const lines = text.split('\n');
  for (const re of DRIFT_PATTERNS) {
    lines.forEach((ln, i) => {
      if (!re.test(ln)) return;
      if (isDriftDefinitionLine(ln)) return;
      // window: within ±2 lines (drift claims tend to be table cells with adjacent citations)
      const ctxStart = Math.max(0, i - 2);
      const ctxEnd = Math.min(lines.length - 1, i + 2);
      const ctx = lines.slice(ctxStart, ctxEnd + 1).join(' ');
      // Need at least TWO row references (one for each side)
      const refs = ctx.match(new RegExp(DRIFT_CITATION_NEAR_RE.source, 'gi')) || [];
      if (refs.length < 2) {
        failures.push({
          rule: '1.1:drift_claim_under_cited',
          evidence: ln.trim().slice(0, 100),
          line: i + 1,
          snippet: ln.trim().slice(0, 80),
        });
      }
    });
  }
  return failures;
}

// 1.2 Every $ traces to a row
const DOLLAR_RE = /\$[\d][\d,.]*(?:\s*(?:M|K|m|k|million|thousand|billion|bn))?\b/g;
const ROW_CITATION_RE = /(INV-\d+|BILL-\d+|wiki\/[a-z0-9_./-]+\.md|wiki\/[a-z0-9_./-]+#[a-z0-9-]+|funders\.json[^\s)]*|funders\.[a-z-]+(?:\.[a-z_]+)+|ghl_contacts\.[a-z_]+|xero_invoices\.?[a-z_]*|decision-log|board paper|signed contract|cost report|tranche \d|tranches?|signed letter|2026-\d{2}-\d{2})/i;

function checkDollarRowTrace(text) {
  const failures = [];
  const lines = text.split('\n');
  // Document-wide: detect enumeration table presence (allows aggregate sums to be cited via the table's per-row IDs)
  const hasEnumerationTable = /\|\s*(funder|project|invoice|inv|tranche|amount|total billed)\s*\|/i.test(text);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    let match;
    DOLLAR_RE.lastIndex = 0;
    while ((match = DOLLAR_RE.exec(ln)) !== null) {
      const token = match[0];
      // If the line is a table row, the table itself supplies the row context
      if (/^\|/.test(ln.trim()) && hasEnumerationTable) continue;
      // Otherwise need a row reference within ±5 lines
      const ctxStart = Math.max(0, i - 5);
      const ctxEnd = Math.min(lines.length - 1, i + 5);
      const ctx = lines.slice(ctxStart, ctxEnd + 1).join(' ');
      if (ROW_CITATION_RE.test(ctx)) continue;
      // Document-wide enumeration also rescues bare aggregates if they're explicitly summary lines
      // and an enumeration table is present somewhere in the doc.
      if (hasEnumerationTable) continue;
      failures.push({
        rule: '1.2:dollar_uncited_to_row',
        evidence: token,
        line: i + 1,
        snippet: ln.trim().slice(0, 80),
      });
    }
  }
  return failures;
}

// 1.3 Canonical names check — flag known misspellings
const CANONICAL_MISSPELLINGS = {
  'Minderoo Foundation': ['Mindaroo', 'Minderoo Found.'],
  'Dusseldorp Forum': ['Düsseldorp', 'Dusseldorp Foundation'],
  'Paul Ramsay Foundation': ['Paul Ramsey', 'P. Ramsay'],
  'Rachel': ['Rachael'],  // PICC contact reference, surfaced in alignment-loop synthesis
  'A Curious Tractor Pty Ltd': ['ACT Pty Ltd', 'ACT Foundation', 'ACT Ventures'],
};

function checkCanonicalNames(text) {
  const failures = [];
  for (const [canonical, badForms] of Object.entries(CANONICAL_MISSPELLINGS)) {
    for (const bad of badForms) {
      const re = new RegExp(`\\b${bad.replace(/\./g, '\\.').replace(/\s+/g, '\\s+')}\\b`);
      const m = text.match(re);
      if (m) {
        const before = text.slice(0, m.index);
        const lineNum = before.split('\n').length;
        failures.push({
          rule: '1.3:canonical_name_misspelled',
          evidence: `"${bad}" (canonical: "${canonical}")`,
          line: lineNum,
          snippet: text.split('\n')[lineNum - 1]?.trim().slice(0, 80) || '',
        });
      }
    }
  }
  return failures;
}

// 1.4 Every "missing from X" is grep-verifiable
const MISSING_FROM_RE = /\b(absent|missing|not\s+listed|wiki-absent)\s+(in|from)\s+(funders\.json|the\s+ledger|wiki|plans|GHL)\b/gi;

function checkMissingFromVerifiable(text) {
  const failures = [];
  // Find each "<entity> absent from funders.json" and verify
  const lines = text.split('\n');
  let funders = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    MISSING_FROM_RE.lastIndex = 0;
    let match;
    while ((match = MISSING_FROM_RE.exec(ln)) !== null) {
      // The entity name typically appears earlier in the line (table cell or sentence)
      // Heuristic: find the bolded or first-quoted entity in the same line/cell
      const entityMatch = ln.match(/\*\*([^*]{2,60})\*\*/);
      if (!entityMatch) continue;
      const entity = entityMatch[1].trim();
      if (match[3].toLowerCase() === 'funders.json') {
        if (!funders) {
          try { funders = loadFunders(); } catch { funders = { funders: {} }; }
        }
        // Check if the entity is actually present in funders.json (any name match, case-insensitive)
        const presentInFunders = Object.values(funders.funders || {}).some(f =>
          (f.name && entity.toLowerCase().includes(f.name.toLowerCase())) ||
          (f.name && f.name.toLowerCase().includes(entity.toLowerCase()))
        );
        if (presentInFunders) {
          failures.push({
            rule: '1.4:missing_from_claim_false',
            evidence: `"${entity}" claimed missing from funders.json but is actually present`,
            line: i + 1,
            snippet: ln.trim().slice(0, 80),
          });
        }
      }
    }
  }
  return failures;
}

function tier1(text) {
  return [
    ...voiceTier1(text),
    ...checkDriftCitations(text),
    ...checkDollarRowTrace(text),
    ...checkCanonicalNames(text),
    ...checkMissingFromVerifiable(text),
  ];
}

// ─── Frontmatter parsing ────────────────────────────────────────────────────
export function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { fm: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return { fm: {}, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  let lastKey = null;
  for (const line of fmRaw.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('  - ') || line.startsWith('- ')) {
      const v = line.replace(/^\s*- /, '').trim();
      if (lastKey && Array.isArray(fm[lastKey])) fm[lastKey].push(v);
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === '' || val === '[]') { fm[key] = []; lastKey = key; }
    else if (val.startsWith('[') && val.endsWith(']')) {
      // simple inline array
      fm[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      lastKey = null;
    } else {
      fm[key] = val.replace(/^["']|["']$/g, '');
      lastKey = null;
    }
  }
  return { fm, body };
}

// ─── Tier 2 + 3 (LLM grader) ────────────────────────────────────────────────
function buildTier23Prompt(text, slug, fm) {
  return `You are grading an ACT Alignment Loop synthesis article against the alignment-loop-synthesis rubric.

The rubric layers on top of act-voice-curtis (already deterministically checked). Your job is the structural and judgment moves an LLM can see but a regex cannot.

SYNTHESIS CONTEXT:
- Slug: ${slug}
- Frontmatter date: ${fm.date || '(missing)'}
- Frontmatter status: ${fm.status || '(missing)'}
- Frontmatter sources_queried: ${Array.isArray(fm.sources_queried) ? fm.sources_queried.length + ' entries' : '(missing)'}

GRADE THE TEXT against these structural and judgment rules:

TIER 2 — STRUCTURAL (4 moves, all must be true for pass):
2.1 frontmatter_complete: does the frontmatter include title, summary, tags, status, date, sources_queried? sources_queried must be a non-empty array.
2.2 sources_block_present: right after the title/summary, is there a paragraph or section naming the four datastores by name? (e.g. "xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/{drafts,plans}")
2.3 every_finding_cites_row: in the headline-findings list at the top, does every numbered finding back its claim with a specific row reference, count, or invoice ID? Generic findings ("most funders are aligned") fail; specific ones ("Snow $132K AUTH, Centrecorp $84.7K DRAFT, Rotary $82.5K AUTH-380d") pass.
2.4 drift_table_classifies_each_row: does the main reconciliation matrix table have an explicit drift classification per row? Acceptable: aligned, drift-alert, wiki-absent, db-absent, plan-absent, historical-only. (Emoji classifiers like 🟢🟡⚠️ count if they map onto these.)

TIER 3 — JUDGMENT (4 moves, all must be true for pass):
3.1 no_decision_log_contradiction: does the synthesis avoid asserting a state that contradicts a more recent decision in wiki/decisions/? (You can only flag this if the synthesis has dates that are clearly older than referenced decisions.)
3.2 reconciliation_targets_are_actionable: every "what to do" / "next step" / "open action" line must name a specific file path AND row/key/section to update, OR a specific person + deadline, OR a specific script invocation. Vague targets ("update funders.json", "review with Ben") fail.
3.3 stage_classifications_match_canonical: for each entity classified in the synthesis (funder stage, project status), does the classification match what the canonical source (funders.json) says? Or, if it diverges, does the synthesis explicitly call out the divergence?
3.4 no_silent_inversion: does the synthesis avoid silently inverting a source classification? (e.g. funders.json says "stage: warm" but synthesis classifies as "active-partner" without explicit reconciliation language.)

OUTPUT STRICT JSON ONLY (no prose, no fences) with this shape:
{
  "structural_check": {
    "frontmatter_complete": boolean,
    "sources_block_present": boolean,
    "every_finding_cites_row": boolean,
    "drift_table_classifies_each_row": boolean
  },
  "judgment_check": {
    "no_decision_log_contradiction": boolean,
    "reconciliation_targets_are_actionable": boolean,
    "stage_classifications_match_canonical": boolean,
    "no_silent_inversion": boolean
  },
  "advice": [string]
}

For each false flag, include one short advice string explaining what to fix and where.

TEXT TO GRADE (slug=${slug}):
"""
${text}
"""`;
}

async function tier23(text, slug, fm, anthropic) {
  const prompt = buildTier23Prompt(text, slug, fm);
  const resp = await anthropic.messages.create({
    model: process.env.GRADE_SYNTHESIS_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = resp.content[0].text.trim();
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, '');
  try { return JSON.parse(cleaned); }
  catch (e) { return { error: 'json_parse_failed', raw }; }
}

function synthesize(t1, t23) {
  if (t23.error) {
    return { verdict: 'error', score: 0, hard_failures: t1, structural_check: null, judgment_check: null, advice: ['t23 parse failed: ' + t23.error] };
  }
  const hardFailCount = t1.length;
  const structOk = t23.structural_check && Object.values(t23.structural_check).every(v => v === true);
  const judgmentOk = t23.judgment_check && Object.values(t23.judgment_check).every(v => v === true);
  // Same verdict semantics as funder-cadence (calibrated 2026-05-07):
  // judgment misses are fail-level, structural misses are warn-level.
  let verdict;
  if (hardFailCount > 0 || !judgmentOk) verdict = 'fail';
  else if (!structOk) verdict = 'warn';
  else verdict = 'pass';
  const score = Math.max(0, 100 - hardFailCount * 12 - (structOk ? 0 : 18) - (judgmentOk ? 0 : 24));
  return {
    verdict, score, hard_failures: t1,
    structural_check: t23.structural_check,
    judgment_check: t23.judgment_check,
    advice: t23.advice || [],
  };
}

export async function grade(text, slug, anthropic, opts = {}) {
  const { fm, body } = parseFrontmatter(text);
  const t1 = tier1(text);
  if (opts.tier1Only || !anthropic) {
    return {
      verdict: t1.length > 0 ? 'fail' : 'pass',
      score: Math.max(0, 100 - t1.length * 12),
      synthesis_slug: slug,
      cycle_date: fm.date || null,
      hard_failures: t1,
      structural_check: null,
      judgment_check: null,
      advice: t1.length > 0 ? [] : ['tier1 clean; tier 2-3 not run'],
    };
  }
  const t23 = await tier23(text, slug, fm, anthropic);
  const result = synthesize(t1, t23);
  return { ...result, synthesis_slug: slug, cycle_date: fm.date || null };
}

// ─── Calibration ────────────────────────────────────────────────────────────
async function runCalibration(opts = {}) {
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`Fixtures dir not found: ${FIXTURES_DIR}`);
    process.exit(2);
  }
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.md')).sort();
  if (files.length === 0) {
    console.error('No fixtures found.');
    process.exit(2);
  }
  let anthropic = null;
  if (!opts.tier1Only) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set; falling back to --tier1-only');
      opts.tier1Only = true;
    } else {
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }
  const results = [];
  for (const f of files) {
    const filePath = path.join(FIXTURES_DIR, f);
    const text = fs.readFileSync(filePath, 'utf8');
    const { fm } = parseFrontmatter(text);
    const slug = fm.synthesis_slug || fm.slug || 'unspecified';
    process.stderr.write(`grading ${f}... `);
    const r = await grade(text, slug, anthropic, opts);
    const expected = fm.expected_verdict || 'pass';
    const correct = r.verdict === expected;
    results.push({ file: f, fm, result: r, expected, correct });
    process.stderr.write(`${r.verdict} ${correct ? 'OK' : 'MISMATCH'}\n`);
  }
  const passed = results.filter(x => x.correct).length;
  fs.writeFileSync(REPORT_PATH, renderReport(results, passed));
  console.log(`\nReport written: ${REPORT_PATH}`);
  console.log(`Pass rate: ${passed}/${results.length}`);
  return passed === results.length ? 0 : 1;
}

function renderReport(results, passed) {
  const lines = [
    `# Calibration: Alignment-loop-synthesis rubric v${RUBRIC_VERSION}`,
    '',
    `> Run: ${new Date().toISOString()}`,
    `> Pass rate: ${passed}/${results.length}`,
    `> Rubric: \`thoughts/shared/rubrics/alignment-loop-synthesis.md\``,
    `> Grader: \`scripts/grade-alignment-loop-synthesis.mjs\` (Sonnet 4.6 for tier 2-3)`,
    '',
    '## Results',
    '',
    '| Fixture | Slug | Expected | Got | Score | Correct? |',
    '|---------|------|----------|-----|-------|----------|',
    ...results.map(r => `| ${r.file} | ${r.fm.synthesis_slug || '?'} | ${r.expected} | ${r.result.verdict} | ${r.result.score} | ${r.correct ? 'YES' : '**NO**'} |`),
    '',
    '## Detail',
    '',
    ...results.flatMap(r => [
      `### ${r.file} — ${r.correct ? 'OK' : 'MISMATCH'}`,
      '',
      `**Verdict:** ${r.result.verdict}  ·  **Score:** ${r.result.score}  ·  **Expected:** ${r.expected}`,
      '',
      r.result.hard_failures && r.result.hard_failures.length
        ? `Hard failures (${r.result.hard_failures.length}):\n${r.result.hard_failures.slice(0, 10).map(f => `  - **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet}`).join('\n')}`
        : 'Hard failures: none.',
      '',
      r.result.structural_check
        ? `Structural: fm=${r.result.structural_check.frontmatter_complete} sources_block=${r.result.structural_check.sources_block_present} findings=${r.result.structural_check.every_finding_cites_row} drift_table=${r.result.structural_check.drift_table_classifies_each_row}`
        : 'Structural: skipped',
      r.result.judgment_check
        ? `Judgment: no_dlog_contra=${r.result.judgment_check.no_decision_log_contradiction} actionable=${r.result.judgment_check.reconciliation_targets_are_actionable} stages_match=${r.result.judgment_check.stage_classifications_match_canonical} no_silent_inv=${r.result.judgment_check.no_silent_inversion}`
        : 'Judgment: skipped',
      '',
      r.result.advice && r.result.advice.length ? 'Advice:\n' + r.result.advice.map(a => `  - ${a}`).join('\n') : '',
      '',
    ]),
    '## Tuning notes',
    '',
    passed === results.length
      ? '- All fixtures classified correctly. Rubric is calibration-passing; promote to production-eligible.'
      : '- One or more mismatches. Inspect detail above. Either revise the fixture (real fixture problem) or the rubric (real rubric problem). Document any rubric change in Calibration history.',
    '',
  ];
  return lines.join('\n');
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx > -1 ? process.argv[idx + 1] : null;
}

async function main() {
  const calibrate = process.argv.includes('--calibrate');
  const tier1Only = process.argv.includes('--tier1-only');
  if (calibrate) {
    process.exit(await runCalibration({ tier1Only }));
  }
  const filePath = getArg('--file');
  const slug = getArg('--slug');
  if (!filePath || !slug) {
    console.error('Usage:');
    console.error('  --calibrate                              run all fixtures');
    console.error('  --tier1-only                             deterministic only (no API)');
    console.error('  --file <path> --slug <slug>              grade a real synthesis');
    process.exit(2);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`); process.exit(2);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  let anthropic = null;
  if (!tier1Only) {
    if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set; using --tier1-only'); }
    else anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const result = await grade(text, slug, anthropic, { tier1Only });
  console.log(`# Alignment-loop-synthesis grade — ${path.basename(filePath)}`);
  console.log(`Slug: ${result.synthesis_slug}  ·  Cycle date: ${result.cycle_date || 'unspecified'}`);
  console.log(``);
  console.log(`Verdict: **${result.verdict.toUpperCase()}**  ·  Score: ${result.score}/100`);
  console.log(``);
  if (result.hard_failures && result.hard_failures.length) {
    console.log(`## Hard failures (${result.hard_failures.length})`);
    for (const f of result.hard_failures.slice(0, 10)) {
      console.log(`  - **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet || ''}`);
    }
    console.log(``);
  } else {
    console.log(`Hard failures: none.`);
    console.log(``);
  }
  if (result.structural_check) {
    console.log(`Structural: fm=${result.structural_check.frontmatter_complete} sources_block=${result.structural_check.sources_block_present} findings=${result.structural_check.every_finding_cites_row} drift_table=${result.structural_check.drift_table_classifies_each_row}`);
  }
  if (result.judgment_check) {
    console.log(`Judgment: no_dlog_contra=${result.judgment_check.no_decision_log_contradiction} actionable=${result.judgment_check.reconciliation_targets_are_actionable} stages_match=${result.judgment_check.stage_classifications_match_canonical} no_silent_inv=${result.judgment_check.no_silent_inversion}`);
  }
  if (result.advice && result.advice.length) {
    console.log(``);
    console.log(`## Advice`);
    for (const a of result.advice) console.log(`  - ${a}`);
  }
}

// Only run main() when invoked as CLI; allow programmatic import without side effects.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { console.error(e); process.exit(1); });
