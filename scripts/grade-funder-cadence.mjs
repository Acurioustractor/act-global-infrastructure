#!/usr/bin/env node
/**
 * Grader for the funder-cadence rubric (v0.1).
 *
 * Layered on top of act-voice-curtis (which catches AI-tells, em-dashes,
 * plainness drift). This rubric adds the funder-specific cadence checks:
 * right opening, right claims, right tone, every dollar cited.
 *
 * Tier 1 = deterministic regex / list / structural checks.
 * Tier 2 + 3 = single Sonnet 4.6 call with full funder context (NOT Haiku —
 * Curtis fixtures showed Haiku is too strict for nuanced structural work).
 *
 * Usage:
 *   node scripts/grade-funder-cadence.mjs --calibrate
 *     Run all fixtures in thoughts/shared/rubrics/fixtures/funder-cadence/
 *     and write report to thoughts/shared/rubrics/funder-cadence.calibration.md
 *
 *   node scripts/grade-funder-cadence.mjs --file <path> --funder <slug> [--cycle <slug>]
 *     Grade a real draft against a named funder.
 *
 *   node scripts/grade-funder-cadence.mjs --file <path> --funder <slug> --tier1-only
 *     Skip the LLM call (deterministic checks only).
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClaim, loadFunders } from './lib/claim-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RUBRIC_VERSION = '0.1';
const FIXTURES_DIR = path.join(REPO_ROOT, 'thoughts', 'shared', 'rubrics', 'fixtures', 'funder-cadence');
const REPORT_PATH = path.join(REPO_ROOT, 'thoughts', 'shared', 'rubrics', 'funder-cadence.calibration.md');

// ─── Voice-curtis Tier 1 patterns (inherited per rubric rule 1.5) ──────────
// Copied from scripts/grade-voice.mjs to keep this grader self-contained.
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

// ─── Funder-cadence Tier 1 ────────────────────────────────────────────────
// 1.1 funder name spelled correctly
function checkFunderName(text, funder) {
  const failures = [];
  const namePresent = text.includes(funder.name);
  if (!namePresent) {
    failures.push({
      rule: '1.1:funder_name_missing',
      evidence: funder.name,
      line: 0,
      snippet: `expected name "${funder.name}" not found`,
    });
  }
  // Common misspellings — extend per funder if patterns emerge
  const commonMisspellings = {
    'Minderoo Foundation': ['Mindaroo', 'Minderoo Found.'],
    'Dusseldorp Forum': ['Düsseldorp', 'Dusseldorp Foundation'],
    'Paul Ramsay Foundation': ['Paul Ramsey', 'P. Ramsay'],
  };
  const misspellings = commonMisspellings[funder.name] || [];
  for (const ms of misspellings) {
    if (text.includes(ms)) {
      failures.push({
        rule: '1.1:funder_name_misspelled',
        evidence: ms,
        line: text.split('\n').findIndex(l => l.includes(ms)) + 1,
        snippet: ms,
      });
    }
  }
  return failures;
}

// 1.2 no claims_to_avoid content (verbatim or near-verbatim of headline)
function checkClaimsToAvoid(text, funder) {
  const failures = [];
  const ids = funder.claims_to_avoid || [];
  for (const id of ids) {
    const claim = loadClaim(id);
    if (!claim.exists) continue; // can't enforce if claim doc missing
    // Extract the headline (first H1) and look for verbatim or near-verbatim
    if (!claim.headline) continue;
    const head = claim.headline.replace(/^Claim:\s*/i, '').trim();
    // Direct headline appearance
    if (text.includes(head)) {
      failures.push({
        rule: '1.2:claims_to_avoid_verbatim',
        evidence: id,
        line: text.split('\n').findIndex(l => l.includes(head)) + 1,
        snippet: head.slice(0, 80),
      });
      continue;
    }
    // Heuristic key-phrase check using a few content words from the claim slug
    // e.g. claim-evidence-is-settled-question-is-political-will → check "evidence is settled" + "political will"
    const slugWords = claim.slug.replace(/^claim-/, '').split('-');
    // build a couple of joined phrases
    const phrases = [];
    for (let i = 0; i + 2 < slugWords.length; i++) {
      const p = slugWords.slice(i, i + 3).join(' ');
      if (p.length >= 8 && !/^(is|the|a|of|to|and|or|on|in|by|for|at|with)$/.test(slugWords[i])) {
        phrases.push(p);
      }
    }
    for (const p of phrases) {
      const re = new RegExp(`\\b${p.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (re.test(text)) {
        const lineNum = text.split('\n').findIndex(l => re.test(l)) + 1;
        failures.push({
          rule: '1.2:claims_to_avoid_paraphrase',
          evidence: `${id} (key phrase "${p}")`,
          line: lineNum,
          snippet: text.split('\n')[lineNum - 1]?.trim().slice(0, 80) || '',
        });
        break;
      }
    }
  }
  return failures;
}

// 1.3 every dollar figure has a source within ±200 chars
const DOLLAR_RE = /\$[\d][\d,.]*(?:\s*(?:M|K|m|k|million|thousand|billion|bn))?\b/g;
const CITATION_NEAR_RE = /(INV-\d+|BILL-\d+|wiki\/[a-z0-9_./-]+\.md|funders\.json|decision-log|board paper|signed contract|Cost of Late Intervention|funders\.minderoo\.|2026-\d{2}-\d{2}|annual bill|published [^,.]{1,40}|Year \d|Years? \d(?:-|\s+to\s+)\d|received|paid|invoice|in the (cost report|decision log|signed)|cost report (line|doc)|cohort line|signed letter|signed off by|sign-?in records|three-circles|three circles|Three Circles)/i;

function checkDollarCitations(text, funder, opts = {}) {
  const failures = [];
  const askMatchTokens = funder.ask_amount_aud
    ? generateAskTokens(funder.ask_amount_aud)
    : [];
  const lines = text.split('\n');
  // Document-wide check: is the canonical ask cited somewhere?
  const fullText = text;
  const canonicalAskCitedInDoc = funder.ask_amount_aud
    ? askMatchTokens.some(t => fullText.replace(/[\s,]/g, '').toLowerCase().includes(t)) && CITATION_NEAR_RE.test(fullText)
    : false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    let match;
    DOLLAR_RE.lastIndex = 0;
    while ((match = DOLLAR_RE.exec(ln)) !== null) {
      const token = match[0];
      // Allow if matches the canonical ask amount
      if (askMatchTokens.some(t => token.replace(/[\s,]/g, '').toLowerCase().includes(t))) continue;
      // Allow Year-1 staged entries when canonical ask is cited in document
      // Pattern: Year 1 / Year-1 / Years 2-3 within ±60 chars of the token
      const lineCtx = ln.slice(Math.max(0, match.index - 60), match.index + token.length + 60);
      if (canonicalAskCitedInDoc && /\bYears?[\s-]\d/.test(lineCtx)) continue;
      // Allow if a citation appears within ±5 lines of this line in the document
      const ctxStart = Math.max(0, i - 5);
      const ctxEnd = Math.min(lines.length - 1, i + 5);
      const ctx = lines.slice(ctxStart, ctxEnd + 1).join(' ');
      if (CITATION_NEAR_RE.test(ctx)) continue;
      // Allow if the line is in a "## Sources" block (rough check)
      const isSourcesContext = lines.slice(Math.max(0, i - 6), i + 1).some(l => /^#+\s*sources?\b|^#+\s*citations?\b/i.test(l));
      if (isSourcesContext) continue;
      // Allow if the line is inside a clearly-labelled allocation table whose header rows reference the canonical ask
      // (look back up to 8 lines for a table header that mentions Three Circles / total / bucket / allocation)
      const tableHeaderCtx = lines.slice(Math.max(0, i - 8), i).join(' ');
      const isAllocationTable = /\|\s*(bucket|total|allocation|year)\b/i.test(tableHeaderCtx) && canonicalAskCitedInDoc;
      if (isAllocationTable) continue;
      failures.push({
        rule: '1.3:uncited_dollar',
        evidence: token,
        line: i + 1,
        snippet: ln.trim().slice(0, 80),
      });
    }
  }
  return failures;
}

function generateAskTokens(amountAud) {
  // For $2,900,000 generate ['2,900,000', '2.9m', '2.9 million', '2900000', '$2.9m']
  const tokens = [];
  const m = amountAud / 1_000_000;
  const k = amountAud / 1_000;
  if (m >= 1) {
    tokens.push(`${m}m`, `${m}million`, `${m.toFixed(1)}m`);
  }
  if (k >= 1) {
    tokens.push(`${k}k`);
  }
  tokens.push(amountAud.toString(), amountAud.toLocaleString());
  return tokens.map(t => t.replace(/[\s,$]/g, '').toLowerCase());
}

// 1.4 no fabricated relationship claims
const RELATIONSHIP_PATTERNS = [
  /\b(we|ACT|JusticeHub|Empathy Ledger)\s+(partnered|worked|collaborated)\s+with\s+([A-Z][\w&\s]+?)(?:[.,;]|\s+(?:to|on|in)\s)/g,
  /\b(funded|supported|backed)\s+by\s+([A-Z][\w&\s]+?)(?:[.,;]|\s+(?:to|on|in|for)\s)/g,
  /\b(committed|pledged|granted)\s+(?:us|ACT|the project|JusticeHub|Empathy Ledger|Goods)\s+/g,
];
const RELATIONSHIP_CITATION_RE = /\(([^)]*(?:wiki\/|INV-|BILL-|2026-|signed|public)[^)]*)\)|\[([^\]]+)\]\([^)]+\)/i;

function checkRelationshipClaims(text) {
  const failures = [];
  const lines = text.split('\n');
  for (const re of RELATIONSHIP_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const matchStart = m.index;
      // Find line number
      const before = text.slice(0, matchStart);
      const lineNum = before.split('\n').length;
      const lineText = lines[lineNum - 1];
      // Look for citation in same line or next 2 lines
      const ctx = lines.slice(lineNum - 1, Math.min(lines.length, lineNum + 1)).join(' ');
      if (RELATIONSHIP_CITATION_RE.test(ctx)) continue;
      failures.push({
        rule: '1.4:fabricated_relationship',
        evidence: m[0].slice(0, 80),
        line: lineNum,
        snippet: lineText?.trim().slice(0, 80) || '',
      });
    }
  }
  return failures;
}

function tier1(text, funder) {
  return [
    ...voiceTier1(text),
    ...checkFunderName(text, funder),
    ...checkClaimsToAvoid(text, funder),
    ...checkDollarCitations(text, funder),
    ...checkRelationshipClaims(text),
  ];
}

// ─── Tier 2 + 3 (LLM grader, single call) ─────────────────────────────────
function buildTier23Prompt(text, funder, cycle, leadingClaims, avoidClaims) {
  return `You are grading a funder-facing draft against the ACT funder-cadence rubric.

The rubric layers on top of act-voice-curtis (already deterministically checked). Your job is the structural and judgment moves that an LLM can see but a regex cannot.

FUNDER CONTEXT (canonical, from wiki/narrative/funders.json):
- Name: ${funder.name}
- Stage: ${funder.stage}
- Ask: ${funder.ask_amount_aud ? `AUD $${funder.ask_amount_aud.toLocaleString()}` : 'n/a'}
- Themes: ${(funder.themes || []).join(', ')}
- Tone: ${funder.tone}
- Framing notes: ${funder.framing_notes || '(none)'}
- Cycle (this draft): ${cycle || 'unspecified'}

CLAIMS TO LEAD WITH (any one of these is an authorised opener):
${leadingClaims.map(c => `  - ${c.id}: ${c.headline || '(headline missing)'}`).join('\n') || '  (none on file)'}

CLAIMS TO AVOID (paraphrase of any of these = fail):
${avoidClaims.map(c => `  - ${c.id}: ${c.headline || '(headline missing)'}`).join('\n') || '  (none on file)'}

GRADE THE TEXT against these structural and judgment rules:

TIER 2 — STRUCTURAL (4 moves, all must be true for pass):
2.1 opens_in_funder_language: do the first three weight-bearing sentences reference the funder's published strategy, theme vocabulary, or named report? Generic ACT openings ("ACT runs JusticeHub which...") fail this.
2.2 lead_claim_is_authorised: does the first major argument match a claim in claims_to_lead_with? If it deviates, is the deviation explicitly justified with a footnote citing framing_notes?
2.3 ask_matches_ledger: if there is an explicit ask, does it match funder.ask_amount_aud (within 5% rounding) OR is it explicitly framed as a Year-1 staged entry of the canonical ask? For cycle=report or renewal, is the *received* amount referenced rather than the open ask?
2.4 every_dollar_cited: structural reinforcement of Tier 1 — is the citation MODE consistent (footnotes vs inline vs Sources section), or do citation styles mix unevenly?

TIER 3 — JUDGMENT (4 moves, all must be true for pass):
3.1 tone_matches_funder_record: does the draft's tone match funder.tone? Examples: Minderoo wants communities-first, evidence-rich, board-defensible — fail advocacy-confrontational. QBE wants investor-grade, cost-honest — fail charity-case framing.
3.2 no_stage_contradiction: does the draft avoid contradicting funder.stage? E.g. stage=active-partner but draft writes as first-introduction → fail. stage=term-sheet-pending but draft asks for a cold meeting → fail.
3.3 closing_gives_next_step: does the closing paragraph name a concrete next action (date, meeting, signature, deliverable, return-call window)?
3.4 no_paraphrased_claims_to_avoid: does the draft avoid deploying any claims_to_avoid argument structure even in paraphrase?

OUTPUT STRICT JSON ONLY (no prose, no fences) with this shape:
{
  "structural_check": {
    "opens_in_funder_language": boolean,
    "lead_claim_is_authorised": boolean,
    "ask_matches_ledger": boolean,
    "every_dollar_cited": boolean
  },
  "judgment_check": {
    "tone_matches_funder_record": boolean,
    "no_stage_contradiction": boolean,
    "closing_gives_next_step": boolean,
    "no_claims_to_avoid": boolean
  },
  "advice": [string]
}

For each false flag, include one short advice string explaining what to fix and where.

TEXT TO GRADE (cycle=${cycle || 'unspecified'}, funder=${funder.name}):
"""
${text}
"""`;
}

async function tier23(text, funder, cycle, anthropic) {
  const leading = (funder.claims_to_lead_with || []).map(loadClaim);
  const avoid = (funder.claims_to_avoid || []).map(loadClaim);
  const prompt = buildTier23Prompt(text, funder, cycle, leading, avoid);
  const resp = await anthropic.messages.create({
    model: process.env.GRADE_FUNDER_MODEL || 'claude-sonnet-4-6',
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
  // Verdict logic (per calibration intent — substantive judgment misses are not soft warnings):
  // - fail: any Tier 1 hard rule trip OR any Tier 3 judgment-check false (tone, stage, closing, claims-to-avoid)
  // - warn: Tier 1 + judgment clean, but structural_check has any false
  // - pass: all clean
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

async function grade(text, funderSlug, cycle, anthropic, opts = {}) {
  const funders = loadFunders();
  const funder = funders.funders[funderSlug];
  if (!funder) throw new Error(`Unknown funder slug: ${funderSlug}`);
  const t1 = tier1(text, funder);
  if (opts.tier1Only || !anthropic) {
    return {
      verdict: t1.length > 0 ? 'fail' : 'pass',
      score: Math.max(0, 100 - t1.length * 12),
      funder_loaded: funderSlug,
      funder_stage: funder.stage,
      hard_failures: t1,
      structural_check: null,
      judgment_check: null,
      advice: t1.length > 0 ? [] : ['tier1 clean; tier 2-3 not run (omit --tier1-only to grade structural moves)'],
    };
  }
  const t23 = await tier23(text, funder, cycle, anthropic);
  const result = synthesize(t1, t23);
  return { ...result, funder_loaded: funderSlug, funder_stage: funder.stage };
}

// ─── Fixtures + calibration ────────────────────────────────────────────────
function parseFixtureFrontmatter(text) {
  if (!text.startsWith('---\n')) return { fm: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return { fm: {}, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  let lastKey = null;
  for (const line of fmRaw.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('  - ')) {
      if (lastKey && Array.isArray(fm[lastKey])) fm[lastKey].push(line.slice(4).trim());
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === '' || val === '[]') { fm[key] = []; lastKey = key; }
    else { fm[key] = val.replace(/^["']|["']$/g, ''); lastKey = null; }
  }
  return { fm, body };
}

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
    const { fm, body } = parseFixtureFrontmatter(text);
    process.stderr.write(`grading ${f}... `);
    const r = await grade(body, fm.funder_slug, fm.cycle, anthropic, opts);
    const expected = fm.expected_verdict || 'pass';
    const correct = r.verdict === expected;
    results.push({ file: f, fm, result: r, expected, correct });
    process.stderr.write(`${r.verdict} ${correct ? 'OK' : 'MISMATCH'}\n`);
  }
  const passed = results.filter(x => x.correct).length;
  const md = renderCalibrationReport(results, passed);
  fs.writeFileSync(REPORT_PATH, md);
  console.log(`\nReport written: ${REPORT_PATH}`);
  console.log(`Pass rate: ${passed}/${results.length}`);
  return passed === results.length ? 0 : 1;
}

function renderCalibrationReport(results, passed) {
  const lines = [
    `# Calibration: Funder cadence rubric v${RUBRIC_VERSION}`,
    '',
    `> Run: ${new Date().toISOString()}`,
    `> Pass rate: ${passed}/${results.length}`,
    `> Rubric: \`thoughts/shared/rubrics/funder-cadence.md\``,
    `> Grader: \`scripts/grade-funder-cadence.mjs\` (Sonnet 4.6 for tier 2-3)`,
    '',
    '## Results',
    '',
    '| Fixture | Funder | Cycle | Expected | Got | Score | Correct? |',
    '|---------|--------|-------|----------|-----|-------|----------|',
    ...results.map(r => `| ${r.file} | ${r.fm.funder_slug || '?'} | ${r.fm.cycle || '?'} | ${r.expected} | ${r.result.verdict} | ${r.result.score} | ${r.correct ? 'YES' : '**NO**'} |`),
    '',
    '## Detail',
    '',
    ...results.flatMap(r => [
      `### ${r.file} — ${r.correct ? 'OK' : 'MISMATCH'}`,
      '',
      `**Verdict:** ${r.result.verdict}  ·  **Score:** ${r.result.score}  ·  **Expected:** ${r.expected}`,
      '',
      r.result.hard_failures && r.result.hard_failures.length
        ? `Hard failures (${r.result.hard_failures.length}):\n${r.result.hard_failures.map(f => `  - **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet}`).join('\n')}`
        : 'Hard failures: none.',
      '',
      r.result.structural_check
        ? `Structural: opens=${r.result.structural_check.opens_in_funder_language} lead_claim=${r.result.structural_check.lead_claim_is_authorised} ask=${r.result.structural_check.ask_matches_ledger} every_$=${r.result.structural_check.every_dollar_cited}`
        : 'Structural: skipped',
      r.result.judgment_check
        ? `Judgment: tone=${r.result.judgment_check.tone_matches_funder_record} stage=${r.result.judgment_check.no_stage_contradiction} closing=${r.result.judgment_check.closing_gives_next_step} no_avoid=${r.result.judgment_check.no_claims_to_avoid}`
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

// ─── CLI ──────────────────────────────────────────────────────────────────
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
  const funderSlug = getArg('--funder');
  const cycle = getArg('--cycle');
  if (!filePath || !funderSlug) {
    console.error('Usage:');
    console.error('  --calibrate                                   run all fixtures');
    console.error('  --tier1-only                                  deterministic only (no API)');
    console.error('  --file <path> --funder <slug> [--cycle <c>]  grade a real draft');
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
  const result = await grade(text, funderSlug, cycle, anthropic, { tier1Only });
  // Print human-readable summary
  console.log(`# Funder-cadence grade — ${path.basename(filePath)}`);
  console.log(`Funder: ${result.funder_loaded} (stage: ${result.funder_stage})  ·  Cycle: ${cycle || 'unspecified'}`);
  console.log(``);
  console.log(`Verdict: **${result.verdict.toUpperCase()}**  ·  Score: ${result.score}/100`);
  console.log(``);
  if (result.hard_failures && result.hard_failures.length) {
    console.log(`## Hard failures (${result.hard_failures.length})`);
    for (const f of result.hard_failures) {
      console.log(`  - **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet || ''}`);
    }
    console.log(``);
  } else {
    console.log(`Hard failures: none.`);
    console.log(``);
  }
  if (result.structural_check) {
    console.log(`Structural: opens=${result.structural_check.opens_in_funder_language} lead_claim=${result.structural_check.lead_claim_is_authorised} ask=${result.structural_check.ask_matches_ledger} every_$=${result.structural_check.every_dollar_cited}`);
  }
  if (result.judgment_check) {
    console.log(`Judgment: tone=${result.judgment_check.tone_matches_funder_record} stage=${result.judgment_check.no_stage_contradiction} closing=${result.judgment_check.closing_gives_next_step} no_avoid=${result.judgment_check.no_claims_to_avoid}`);
  }
  if (result.advice && result.advice.length) {
    console.log(``);
    console.log(`## Advice`);
    for (const a of result.advice) console.log(`  - ${a}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
