#!/usr/bin/env node
// Local grader for the act-voice-curtis rubric (v0.1).
// Tier 1 = deterministic regex/word-list. Tier 2-3 = single Haiku call.
// Calibration mode: runs against the 6 worked examples in writing-voice.md.
// Production mode: pass `--file <path>` and `--project <slug>` and `--genre <slug>`.

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';

const RUBRIC_VERSION = '0.1';
const REPORT_PATH = 'thoughts/shared/rubrics/act-voice-curtis.calibration.md';

const FORBIDDEN_BASE = [
  'delve', 'crucial', 'pivotal', 'vital', 'significant', 'profound',
  'tapestry', 'interplay', 'intricate', 'nuanced',
  'underscore', 'showcase', 'emphasise', 'emphasize', 'illustrate',
  'testament', 'enduring', 'lasting', 'timeless', 'indelible',
  'vibrant', 'bustling', 'thriving', 'dynamic',
  'boasts', 'meticulous', 'seamless', 'effortless', 'groundbreaking', 'renowned',
  'nestled',
];
// Verb stems where all four forms (bare/-s/-ing/-ed) are AI-register hits.
const FORBIDDEN_VERB_STEMS = ['leverage', 'foster', 'cultivate', 'empower', 'unlock'];
function expandVerb(stem) {
  const ing = stem.endsWith('e') ? stem.slice(0, -1) + 'ing' : stem + 'ing';
  const ed  = stem.endsWith('e') ? stem + 'd' : stem + 'ed';
  return [stem, stem + 's', ing, ed];
}
function expandStem(word) {
  // For verb-like dictionary entries also match -s/-ed/-ing inflections.
  const verbish = ['delve', 'underscore', 'showcase', 'emphasise', 'emphasize', 'illustrate'];
  return verbish.includes(word) ? expandVerb(word) : [word];
}
const FORBIDDEN_VOCAB = [
  ...FORBIDDEN_BASE.flatMap(expandStem),
  ...FORBIDDEN_VERB_STEMS.flatMap(expandVerb),
];
const FORBIDDEN_PHRASES = [
  'in the heart of', 'at the forefront of', 'world-class',
  'stands as', 'serves as',
];
const PATTERNS = {
  em_dash:                  /—|--/,
  curly_quotes:             /[“”‘’]/,
  negative_parallelism:     /not just\b.{0,60}\bbut\b|it'?s not about\b.{0,60}\bit'?s about\b|more than\b.{0,60}\bit'?s\b/i,
  significance_claim:       /(plays?|its|a) (pivotal|key|crucial|vital) role|marks a (key|pivotal) moment|sets the stage for|paving the way|at a critical juncture/i,
  knowledge_disclaimer:     /while specific details are limited|based on available information|it is worth noting|it should be noted/i,
  vague_attribution:        /experts (argue|note|say|believe)|observers (note|say)|many have said|it is widely (believed|recognised|recognized)/i,
  copula_avoidance:         /serves as a (cornerstone|foundation|testament|reminder)|stands as a (testament|symbol|reminder)|represents a (shift|change|moment)/i,
  challenges_future:        /despite (these )?challenges|continues to (evolve|grow|thrive)|looking (forward|ahead) to the future/i,
  inline_header_puff:       /^\*\*[A-Z][a-zA-Z ]+:\*\*\s+(We|Our|This)/m,
};

function tier1(text) {
  const failures = [];
  const lines = text.split('\n');

  for (const word of FORBIDDEN_VOCAB) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    lines.forEach((ln, i) => {
      if (re.test(ln)) failures.push({ rule: 'forbidden_vocab', evidence: word, line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }
  for (const phrase of FORBIDDEN_PHRASES) {
    lines.forEach((ln, i) => {
      if (ln.toLowerCase().includes(phrase)) failures.push({ rule: 'forbidden_phrase', evidence: phrase, line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }
  for (const [rule, re] of Object.entries(PATTERNS)) {
    lines.forEach((ln, i) => {
      const m = ln.match(re);
      if (m) failures.push({ rule, evidence: m[0], line: i + 1, snippet: ln.trim().slice(0, 80) });
    });
  }

  // title-case heading check
  lines.forEach((ln, i) => {
    const h = ln.match(/^#+\s+(.+)$/);
    if (!h) return;
    const words = h[1].trim().split(/\s+/).filter(w => !/^(a|an|the|of|in|on|to|for|and|or|but)$/i.test(w));
    if (words.length > 1 && words.every(w => /^[A-Z]/.test(w))) {
      failures.push({ rule: 'title_case_heading', evidence: h[1], line: i + 1, snippet: ln.trim().slice(0, 80) });
    }
  });
  return failures;
}

const TIER23_PROMPT = `You are grading a piece of writing against the ACT voice rubric (Curtis method).

ACT voice (in one paragraph): writing must name a concrete room (court, paddock, kitchen table, gym), name a concrete body (hand, breath, voice, lift), load an institutional abstract noun (impact, outcome, capacity) against the concrete, and stop the line before any explanation. The plainness test: a fourteen-year-old in Doomadgee should be able to read it without translation, and it should not sound like a pitch deck.

You must produce STRICT JSON ONLY (no prose, no markdown fence) with this shape:
{
  "structural_check": {
    "rooms_named": boolean,
    "bodies_named": boolean,
    "abstract_loaded": boolean,
    "line_stops": boolean
  },
  "plainness": {
    "doomadgee_test": boolean,
    "pitch_deck_test": boolean
  },
  "weight_bearing_sentences": [string, string, string],
  "advice": [string]
}

A weight-bearing sentence is one that carries the meaning if all others were cut. Pick 3.

doomadgee_test = true if the text reads plainly. pitch_deck_test = true if it sounds like a pitch deck (BAD).

Project context: {{PROJECT}}. Genre: {{GENRE}}.

TEXT TO GRADE:
"""
{{TEXT}}
"""`;

async function tier23(text, project, genre, anthropic) {
  const prompt = TIER23_PROMPT
    .replace('{{PROJECT}}', project)
    .replace('{{GENRE}}', genre)
    .replace('{{TEXT}}', text);
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = resp.content[0].text.trim();
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, '');
  try { return JSON.parse(cleaned); }
  catch (e) { return { error: 'json_parse_failed', raw }; }
}

function synthesize(t1, t23) {
  if (t23.error) return { verdict: 'error', score: 0, hard_failures: t1, structural_check: null, plainness: null, advice: ['t23 parse failed: ' + t23.error] };
  const hardFailCount = t1.length;
  const structOk = t23.structural_check && Object.values(t23.structural_check).every(v => v === true);
  const plainOk = t23.plainness && t23.plainness.doomadgee_test === true && t23.plainness.pitch_deck_test === false;

  let verdict;
  if (hardFailCount > 0) verdict = 'fail';
  else if (!structOk || !plainOk) verdict = 'warn';
  else verdict = 'pass';

  const score = Math.max(0, 100 - hardFailCount * 12 - (structOk ? 0 : 20) - (plainOk ? 0 : 15));
  return { verdict, score, hard_failures: t1, structural_check: t23.structural_check, plainness: t23.plainness, weight_bearing: t23.weight_bearing_sentences, advice: t23.advice };
}

async function grade(text, project, genre, anthropic, opts = {}) {
  const t1 = tier1(text);
  if (opts.tier1Only || !anthropic) {
    // Deterministic-only: verdict is fail if any hard rules trip, else pass (no warn level — structural unknown).
    return {
      verdict: t1.length > 0 ? 'fail' : 'pass',
      score: Math.max(0, 100 - t1.length * 12),
      hard_failures: t1,
      structural_check: null,
      plainness: null,
      advice: t1.length > 0 ? [] : ['tier1 clean; tier 2-3 not run (use --full to grade structural moves)'],
    };
  }
  const t23 = await tier23(text, project, genre, anthropic);
  return synthesize(t1, t23);
}

// --- calibration fixtures (canonical worked examples from writing-voice.md) ---
const FIXTURES = [
  { id: 'good-1', label: 'GOOD: cockatoo', expect: 'pass', project: 'bcv', genre: 'caption',
    text: 'Four years in. The cockatoo came back before the fence came down.' },
  { id: 'good-2', label: 'GOOD: signal', expect: 'pass', project: 'empathy-ledger', genre: 'web',
    text: 'We work with First Nations communities. The story is theirs. The signal goes back to the speaker.' },
  { id: 'good-3', label: 'GOOD: court', expect: 'pass', project: 'justicehub', genre: 'caption',
    text: 'The court is a room that forgets. We work with people who remember.' },
  { id: 'bad-1', label: 'BAD: transformative outcomes', expect: 'fail', project: 'hub', genre: 'pitch',
    text: 'In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.' },
  { id: 'bad-2', label: 'BAD: intricate tapestry', expect: 'fail', project: 'justicehub', genre: 'pitch',
    text: 'Our dedicated team delves into the intricate tapestry of systemic injustice, highlighting the crucial role of grassroots advocacy in shaping a more equitable future.' },
  { id: 'bad-3', label: 'BAD: despite challenges', expect: 'fail', project: 'goods', genre: 'pitch',
    text: 'Despite facing numerous challenges, the project continues to thrive, demonstrating its pivotal role in the evolving landscape of regenerative economics.' },
];

function fmtFailure(f) { return `      - **${f.rule}** \`${f.evidence}\` (line ${f.line}): ${f.snippet || ''}`; }

async function runCalibration(opts = {}) {
  let anthropic = null;
  if (!opts.tier1Only) {
    if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set; falling back to --tier1-only'); opts.tier1Only = true; }
    else anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const results = [];
  for (const fx of FIXTURES) {
    process.stderr.write(`grading ${fx.id}... `);
    const r = await grade(fx.text, fx.project, fx.genre, anthropic, opts);
    const correct = (fx.expect === 'pass' && r.verdict === 'pass') || (fx.expect === 'fail' && r.verdict === 'fail');
    results.push({ ...fx, result: r, correct });
    process.stderr.write(`${r.verdict} ${correct ? 'OK' : 'MISMATCH'}\n`);
  }
  const passed = results.filter(x => x.correct).length;

  const md = [
    `# Voice rubric calibration — v${RUBRIC_VERSION}`,
    '',
    `> Run: ${new Date().toISOString()}`,
    `> Pass rate: ${passed}/${results.length}`,
    `> Rubric: \`thoughts/shared/rubrics/act-voice-curtis.md\``,
    `> Grader: \`scripts/grade-voice.mjs\` (Haiku 4.5 for tier 2-3)`,
    '',
    '## Results',
    '',
    '| Fixture | Expected | Got | Score | Correct? |',
    '|---------|----------|-----|-------|----------|',
    ...results.map(r => `| ${r.label} | ${r.expect} | ${r.result.verdict} | ${r.result.score} | ${r.correct ? 'YES' : '**NO**'} |`),
    '',
    '## Detail',
    '',
    ...results.flatMap(r => [
      `### ${r.label} (\`${r.id}\`) — ${r.correct ? 'OK' : 'MISMATCH'}`,
      '',
      `> ${r.text}`,
      '',
      `**Verdict:** ${r.result.verdict}  ·  **Score:** ${r.result.score}  ·  **Expected:** ${r.expect}`,
      '',
      r.result.hard_failures.length ? `Hard failures (${r.result.hard_failures.length}):` : 'Hard failures: none.',
      ...r.result.hard_failures.map(fmtFailure),
      '',
      r.result.structural_check ? `Structural: rooms=${r.result.structural_check.rooms_named} body=${r.result.structural_check.bodies_named} abstract=${r.result.structural_check.abstract_loaded} stops=${r.result.structural_check.line_stops}` : 'Structural: skipped',
      r.result.plainness ? `Plainness: doomadgee=${r.result.plainness.doomadgee_test} pitch_deck=${r.result.plainness.pitch_deck_test}` : 'Plainness: skipped',
      r.result.advice && r.result.advice.length ? '\nAdvice: ' + r.result.advice.map(a => `\n- ${a}`).join('') : '',
      '',
    ]),
    '## Tuning notes',
    '',
    passed === results.length
      ? '- All fixtures classified correctly. Promote rubric to v0.2 (production-eligible).'
      : '- One or more mismatches. Inspect detail above. Tune rubric or grader before promoting.',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`\nReport written: ${REPORT_PATH}`);
  console.log(`Pass rate: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

const args = process.argv.slice(2);
const tier1Only = args.includes('--tier1-only');
if (args.length === 0 || args.includes('--calibrate') || tier1Only) {
  runCalibration({ tier1Only });
} else {
  console.error('Production mode not yet wired. Use --calibrate or --tier1-only.');
  process.exit(2);
}
