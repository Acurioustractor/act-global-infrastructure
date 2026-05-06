#!/usr/bin/env node
// Generic rubric grader. Loads a rubric markdown file + a pack (file or
// directory of files), prompts Sonnet 4.6 to grade the pack against the
// rubric, returns structured JSON.
//
// Companion to scripts/grade-voice.mjs (which is voice-specific). This one
// is rubric-agnostic — point it at any rubric in thoughts/shared/rubrics/
// and any pack, and you'll get a verdict back.
//
// Usage:
//   node scripts/grade-pack.mjs --rubric <path> --pack <path>
//   node scripts/grade-pack.mjs --rubric <path> --pack <dir>
//   node scripts/grade-pack.mjs --rubric <path> --pack <path> --out <path>
//
// Calibration mode:
//   node scripts/grade-pack.mjs --rubric <path> --calibrate <fixtures-dir>
//   (expects fixtures-dir to contain good-*.md and bad-*.md files; verdict
//   match is checked against the filename prefix)

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';

function loadPack(packPath) {
  const stat = fs.statSync(packPath);
  if (stat.isFile()) {
    return { name: path.basename(packPath), content: fs.readFileSync(packPath, 'utf8') };
  }
  // directory: concatenate all .md/.csv/.json files
  const files = fs.readdirSync(packPath).filter(f => /\.(md|csv|json|txt)$/i.test(f)).sort();
  const content = files
    .map(f => `\n\n========== ${f} ==========\n` + fs.readFileSync(path.join(packPath, f), 'utf8'))
    .join('\n');
  return { name: path.basename(packPath), content };
}

const PROMPT = `You are an audit-grade grader. You receive a RUBRIC and a PACK. Grade the pack against the rubric and return STRICT JSON ONLY (no prose, no markdown fence) in the shape the rubric specifies.

Read the rubric carefully. Apply EVERY hard rule. Apply structural rules with judgement, but do not relax them. Cite specific evidence (line numbers if present, otherwise quoted snippets) for any failure or warning.

If the rubric specifies an output schema in JSON, use that schema exactly. If multiple tiers exist (Tier 1 hard rules, Tier 2 structural, etc.), evaluate all of them and return the verdict per the rubric's stated logic.

A "pass" means the pack would survive an external audit. A "warn" means it's close but has gaps that would slow review. A "fail" means at least one hard rule tripped or critical evidence is missing.

RUBRIC:
"""
{{RUBRIC}}
"""

PACK ({{PACK_NAME}}):
"""
{{PACK_CONTENT}}
"""

Return JSON now:`;

async function gradePack(rubricPath, packPath, anthropic) {
  const rubric = fs.readFileSync(rubricPath, 'utf8');
  const pack = loadPack(packPath);
  const prompt = PROMPT
    .replace('{{RUBRIC}}', rubric)
    .replace('{{PACK_NAME}}', pack.name)
    .replace('{{PACK_CONTENT}}', pack.content);

  const resp = await anthropic.messages.create({
    model: process.env.GRADE_PACK_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = resp.content[0].text.trim();
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, '');
  try { return JSON.parse(cleaned); }
  catch (e) { return { error: 'json_parse_failed', raw: raw.slice(0, 1000) }; }
}

function getArg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function runCalibration(rubricPath, fixturesDir) {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(2); }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const files = fs.readdirSync(fixturesDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))  // skip _calibration.md and other generated files
    .sort();
  const results = [];
  for (const f of files) {
    const fixturePath = path.join(fixturesDir, f);
    const expected = f.startsWith('good-') ? 'pass' : f.startsWith('bad-') ? 'fail' : 'unknown';
    process.stderr.write(`grading ${f}... `);
    const r = await gradePack(rubricPath, fixturePath, anthropic);
    const verdict = r.verdict || (r.error ? 'error' : 'unknown');
    const correct = (expected === 'pass' && verdict === 'pass') ||
                    (expected === 'fail' && verdict === 'fail');
    results.push({ file: f, expected, verdict, correct, score: r.score, hard_failures: r.hard_failures, raw: r });
    process.stderr.write(`${verdict} ${correct ? 'OK' : 'MISMATCH'}\n`);
  }

  const passed = results.filter(r => r.correct).length;
  const reportPath = path.join(fixturesDir, '_calibration.md');
  const md = [
    `# Calibration — ${path.basename(rubricPath)}`,
    '',
    `> Run: ${new Date().toISOString()}`,
    `> Pass rate: ${passed}/${results.length}`,
    `> Rubric: \`${rubricPath}\``,
    `> Fixtures: \`${fixturesDir}\``,
    `> Grader: \`scripts/grade-pack.mjs\` (${process.env.GRADE_PACK_MODEL || 'claude-sonnet-4-6'})`,
    '',
    '## Results',
    '',
    '| Fixture | Expected | Got | Score | Correct? |',
    '|---------|----------|-----|-------|----------|',
    ...results.map(r => `| ${r.file} | ${r.expected} | ${r.verdict} | ${r.score ?? '—'} | ${r.correct ? 'YES' : '**NO**'} |`),
    '',
    '## Detail',
    '',
    ...results.flatMap(r => [
      `### ${r.file} — ${r.correct ? 'OK' : 'MISMATCH'}`,
      '',
      `**Verdict:** ${r.verdict}  ·  **Score:** ${r.score ?? '—'}  ·  **Expected:** ${r.expected}`,
      '',
      r.raw && r.raw.hard_failures && r.raw.hard_failures.length
        ? '**Hard failures:**\n' + r.raw.hard_failures.map(f => `- ${f.rule || ''}: ${f.evidence || JSON.stringify(f).slice(0, 120)}`).join('\n')
        : '_no hard failures_',
      '',
      r.raw && r.raw.warnings && r.raw.warnings.length
        ? '**Warnings:** ' + r.raw.warnings.map(w => w.rule || JSON.stringify(w).slice(0, 80)).join(', ')
        : '',
      '',
    ]),
  ].join('\n');
  fs.writeFileSync(reportPath, md);
  console.log(`\nReport: ${reportPath}`);
  console.log(`Pass rate: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

async function main() {
  const args = process.argv.slice(2);
  const rubric = getArg('--rubric');
  const pack = getArg('--pack');
  const calibrate = getArg('--calibrate');
  const out = getArg('--out');

  if (!rubric) {
    console.error('Usage: --rubric <path> [--pack <path> | --calibrate <fixtures-dir>] [--out <path>]');
    process.exit(2);
  }

  if (calibrate) return runCalibration(rubric, calibrate);

  if (!pack) {
    console.error('Either --pack or --calibrate required');
    process.exit(2);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(2);
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await gradePack(rubric, pack, anthropic);
  const json = JSON.stringify(result, null, 2);
  if (out) {
    fs.writeFileSync(out, json);
    console.error(`Written: ${out}`);
  } else {
    console.log(json);
  }
  process.exit(result.verdict === 'fail' ? 1 : 0);
}

main();
