#!/usr/bin/env node
// Render the FY26 R&D evidence pack as a single self-contained index.html.
// Sources: thoughts/shared/rd-pack-fy26/*.md + grades/*.json. CSS + JS inlined.
// Run: node scripts/render-rd-pack-html.mjs
// See plan: ~/.claude/plans/review-thsi-idea-to-dynamic-otter.md

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { marked } from 'marked';

const PACK_DIR = path.resolve('thoughts/shared/rd-pack-fy26');
const OUT = path.join(PACK_DIR, 'index.html');

marked.setOptions({ gfm: true, breaks: false, headerIds: true, mangle: false });

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: src };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^:]+):\s*(.*)$/);
    if (kv) fm[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fm, body: src.slice(m[0].length) };
}

function renderMd(src) {
  const { body } = parseFrontmatter(src);
  let html = marked.parse(body);
  html = html.replace(/<table>/g, '<table class="sortable">');
  return html;
}

async function readPackFile(name) {
  return readFile(path.join(PACK_DIR, name), 'utf8');
}

async function loadLatestGrade() {
  const dir = path.join(PACK_DIR, 'grades');
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  if (!files.length) return null;
  const preferred = files.find(f => f.includes('warn-final')) || files.sort().pop();
  return { file: preferred, data: JSON.parse(await readFile(path.join(dir, preferred), 'utf8')) };
}

async function csvToTable(name) {
  const src = (await readPackFile(name)).trim();
  const rows = src.split('\n').map(line => {
    const cells = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  });
  const head = rows[0];
  const body = rows.slice(1);
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<table class="sortable"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    body.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`;
}

function gitInfo() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: PACK_DIR }).toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PACK_DIR }).toString().trim();
    return { sha, branch };
  } catch { return { sha: 'unknown', branch: 'unknown' }; }
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function fmtAud(n) {
  return Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

function buildBanner(readmeFm, grade) {
  const verdictColor = { pass: '#0a7d3a', warn: '#a36400', fail: '#a31a1a' }[grade?.data?.verdict || 'warn'] || '#555';
  const score = grade?.data?.score ?? '—';
  const verdict = grade?.data?.verdict?.toUpperCase() || '—';
  const claim = readmeFm.total_claim_aud ? fmtAud(readmeFm.total_claim_aud) : '—';
  const refundLow = readmeFm.expected_refund_aud_low ? fmtAud(readmeFm.expected_refund_aud_low) : '—';
  const refundHigh = readmeFm.expected_refund_aud_high ? fmtAud(readmeFm.expected_refund_aud_high) : '—';
  return `
<header class="banner">
  <div class="banner-row">
    <div>
      <h1>${escAttr(readmeFm.registrant || 'R&D Evidence Pack')}</h1>
      <div class="banner-sub">FY${escAttr(readmeFm.fy || '?')} R&D Tax Incentive evidence pack · ACN ${escAttr(readmeFm.registrant_acn || '—')} · last updated ${escAttr(readmeFm.last_updated || '—')}</div>
    </div>
    <div class="verdict-badge" style="--c: ${verdictColor}">
      <div class="verdict-label">${verdict}</div>
      <div class="verdict-score">${score}<span>/100</span></div>
    </div>
  </div>
  <div class="banner-stats">
    <div><div class="stat-label">Total preliminary claim</div><div class="stat-value">${claim}</div></div>
    <div><div class="stat-label">Expected refund range</div><div class="stat-value">${refundLow} – ${refundHigh}</div></div>
    <div><div class="stat-label">Lodgement target</div><div class="stat-value">${escAttr(readmeFm.target_lodgement || '—')}</div></div>
    <div><div class="stat-label">AusIndustry status</div><div class="stat-value">${escAttr(grade?.data?.audit_readiness?.ausindustry || 'unknown')}</div></div>
    <div><div class="stat-label">ATO readiness</div><div class="stat-value">${escAttr(grade?.data?.audit_readiness?.ato || 'unknown')}</div></div>
  </div>
</header>`;
}

function buildVerdictPanel(grade) {
  if (!grade) return '';
  const { hard_failures = [], warnings = [], missing_artefacts = [] } = grade.data;
  const hf = hard_failures.length
    ? `<section class="panel panel-fail"><h2>Hard failures (${hard_failures.length})</h2><ul>${
        hard_failures.map(f => `<li><strong>${escAttr(f.rule)}</strong><div class="evidence">${escAttr(f.evidence)}</div></li>`).join('')
      }</ul></section>`
    : `<section class="panel panel-pass"><h2>Hard failures</h2><div class="ok">None.</div></section>`;
  const wn = warnings.length
    ? `<section class="panel panel-warn"><h2>Open warnings (${warnings.length})</h2><ol>${
        warnings.map(w => `<li><strong>${escAttr(w.rule)}</strong><div class="evidence">${escAttr(w.evidence)}</div></li>`).join('')
      }</ol></section>`
    : '';
  const ma = missing_artefacts.length
    ? `<details class="panel"><summary><strong>Missing artefacts (${missing_artefacts.length})</strong> — click to expand</summary><ul>${
        missing_artefacts.map(a => `<li>${escAttr(a)}</li>`).join('')
      }</ul></details>`
    : '';
  return `<div class="verdict-panel">${hf}${wn}${ma}</div>`;
}

function section(title, slug, html, opts = {}) {
  const tag = opts.collapsed ? 'details' : 'section';
  const open = opts.collapsed ? '' : '';
  if (opts.collapsed) {
    return `<details id="${escAttr(slug)}" class="doc-section"><summary><h2>${escAttr(title)}</h2></summary><div class="md">${html}</div></details>`;
  }
  return `<section id="${escAttr(slug)}" class="doc-section"><h2>${escAttr(title)}</h2><div class="md">${html}</div></section>`;
}

const REGISTER_FILES = [
  { code: 'ACT-GD', name: 'Goods on Country',   md: 'act-gd-rd-activity-register.md' },
  { code: 'ACT-EL', name: 'Empathy Ledger',     md: 'act-el-rd-activity-register.md' },
  { code: 'ACT-CG', name: 'CivicGraph',         md: 'act-cg-rd-activity-register.md' },
  { code: 'ACT-JH', name: 'JusticeHub',         md: 'act-jh-rd-activity-register.md' },
];

async function main() {
  const readmeRaw = await readPackFile('README.md');
  const { fm: readmeFm, body: readmeBody } = parseFrontmatter(readmeRaw);
  const grade = await loadLatestGrade();
  const git = gitInfo();
  const renderedAt = new Date().toISOString();

  const registers = [];
  for (const r of REGISTER_FILES) {
    const reg = renderMd(await readPackFile(r.md));
    let prov = '';
    try {
      prov = renderMd(await readPackFile(r.md + '.provenance.md'));
    } catch { /* sidecar missing */ }
    const provBlock = prov
      ? `<details class="provenance"><summary><strong>Provenance — ${escAttr(r.code)}</strong> (sources, verification status, gaps)</summary><div class="md">${prov}</div></details>`
      : '';
    registers.push({ ...r, html: `<div class="md">${reg}</div>${provBlock}` });
  }

  const auditTrail   = renderMd(await readPackFile('audit-trail.md'));
  const receiptCov   = renderMd(await readPackFile('receipt-coverage-attestation.md'));
  const supporting   = renderMd(await readPackFile('supporting-activities.md'));
  const decisionLog  = renderMd(await readPackFile('money-framework-decision-log-2026-04-15.md'));
  const salaryTable  = await csvToTable('salary-allocations.csv');
  const readmeHtml   = marked.parse(readmeBody).replace(/<table>/g, '<table class="sortable">');

  // Build TOC
  const tocItems = [
    { href: '#overview',         label: 'Overview' },
    ...registers.map(r => ({ href: `#${r.code.toLowerCase()}`, label: `${r.code} ${r.name}` })),
    { href: '#salary',           label: 'Salary allocations' },
    { href: '#supporting',       label: 'Supporting activities' },
    { href: '#receipts',         label: 'Receipt coverage' },
    { href: '#audit-trail',      label: 'Audit trail' },
    { href: '#decisions',        label: 'Decision log' },
  ];
  const toc = `<nav class="toc"><strong>Jump to:</strong> ${tocItems.map(i => `<a href="${escAttr(i.href)}">${escAttr(i.label)}</a>`).join(' · ')}</nav>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>R&D Evidence Pack — ${escAttr(readmeFm.registrant || 'ACT')} FY${escAttr(readmeFm.fy || '')}</title>
<style>
:root {
  --bg: #fafaf7;
  --surface: #ffffff;
  --ink: #1a1a17;
  --muted: #5b5b54;
  --border: #e5e3dc;
  --accent: #0a4f3a;
  --warn: #a36400;
  --warn-bg: #fff8e8;
  --fail: #a31a1a;
  --fail-bg: #fdeded;
  --pass: #0a7d3a;
  --pass-bg: #e8f5ec;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 28px 80px;
}
h1, h2, h3, h4 { font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; line-height: 1.25; }
h1 { font-size: 30px; margin: 0 0 4px; }
h2 { font-size: 22px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--border); }
h3 { font-size: 17px; margin: 20px 0 8px; }
h4 { font-size: 15px; margin: 14px 0 6px; }
p { margin: 8px 0; }
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(10, 79, 58, 0.25); }
a:hover { border-bottom-color: var(--accent); }
code { background: #efece4; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
pre { background: #1a1a17; color: #f3f1ea; padding: 14px 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
pre code { background: transparent; color: inherit; padding: 0; }
blockquote { margin: 12px 0; padding: 8px 14px; border-left: 4px solid var(--border); color: var(--muted); background: #f4f2eb; border-radius: 0 4px 4px 0; }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }
hr { border: 0; border-top: 1px solid var(--border); margin: 24px 0; }
table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: 13.5px; }
th, td { padding: 7px 10px; border: 1px solid var(--border); text-align: left; vertical-align: top; }
th { background: #efece4; font-weight: 600; cursor: pointer; user-select: none; position: relative; }
th:hover { background: #e8e4d8; }
th.sort-asc::after { content: " ▲"; color: var(--muted); font-size: 11px; }
th.sort-desc::after { content: " ▼"; color: var(--muted); font-size: 11px; }
tbody tr:nth-child(even) { background: #fbfaf6; }

.banner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px 28px;
  margin-bottom: 18px;
}
.banner-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.banner-sub { color: var(--muted); margin-top: 4px; font-size: 14px; }
.verdict-badge {
  background: var(--c, #555);
  color: white;
  padding: 12px 18px;
  border-radius: 6px;
  text-align: center;
  min-width: 110px;
}
.verdict-label { font-size: 11px; letter-spacing: 1.5px; opacity: 0.85; }
.verdict-score { font-size: 30px; font-weight: 700; line-height: 1; margin-top: 2px; }
.verdict-score span { font-size: 14px; opacity: 0.7; font-weight: 400; }
.banner-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-top: 18px; }
.banner-stats .stat-label { font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); }
.banner-stats .stat-value { font-size: 16px; font-weight: 600; margin-top: 2px; }

.verdict-panel { display: grid; gap: 12px; margin: 16px 0 28px; }
.panel { background: var(--surface); border: 1px solid var(--border); border-left-width: 4px; border-radius: 6px; padding: 14px 18px; }
.panel h2 { margin: 0 0 8px; font-size: 16px; padding: 0; border: 0; font-family: inherit; font-weight: 600; }
.panel ul, .panel ol { margin: 6px 0 0; padding-left: 22px; }
.panel li { margin: 8px 0; }
.panel .evidence { color: var(--muted); font-size: 13.5px; margin-top: 4px; }
.panel-fail { border-left-color: var(--fail); background: var(--fail-bg); }
.panel-warn { border-left-color: var(--warn); background: var(--warn-bg); }
.panel-pass { border-left-color: var(--pass); background: var(--pass-bg); }
.panel-pass .ok { color: var(--pass); font-weight: 600; }

.toc {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 13.5px;
  margin: 0 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.toc a { margin: 0 2px; }

.doc-section { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 18px 24px; margin: 14px 0; }
details.doc-section { padding: 0; }
details.doc-section > summary { padding: 14px 24px; cursor: pointer; user-select: none; }
details.doc-section[open] > summary { border-bottom: 1px solid var(--border); }
details.doc-section > summary h2 { display: inline; margin: 0; padding: 0; border: 0; font-size: 18px; }
details.doc-section .md { padding: 0 24px 18px; }

details.provenance { margin: 14px 0; padding: 0; border: 1px dashed var(--border); border-radius: 4px; background: #fafaf7; }
details.provenance > summary { padding: 8px 14px; cursor: pointer; user-select: none; font-size: 13.5px; color: var(--muted); }
details.provenance[open] > summary { border-bottom: 1px dashed var(--border); }
details.provenance .md { padding: 6px 14px 12px; font-size: 13.5px; }

footer.render-info {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
}

@media print {
  body { background: white; max-width: none; padding: 0 8mm; font-size: 10.5pt; }
  .toc { position: static; }
  details, details.doc-section, details.provenance { padding: 0; }
  details:not([open]) > *:not(summary) { display: revert !important; }
  details > summary { list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
  details.doc-section > summary, details.provenance > summary { padding: 8px 0; }
  .doc-section, details.doc-section, details.provenance, .panel, .banner { break-inside: avoid; }
  table { break-inside: avoid; font-size: 9pt; }
  h2 { break-after: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  a { color: inherit; border-bottom: none; }
}
</style>
</head>
<body>

${buildBanner(readmeFm, grade)}
${buildVerdictPanel(grade)}
${toc}

${section('Overview', 'overview', readmeHtml)}

${registers.map(r => section(`${r.code} — ${r.name}`, r.code.toLowerCase(), r.html, { collapsed: true })).join('\n\n')}

${section('Salary allocations', 'salary', salaryTable)}

${section('Supporting activities', 'supporting', supporting, { collapsed: true })}

${section('Receipt coverage attestation', 'receipts', receiptCov, { collapsed: true })}

${section('Audit trail', 'audit-trail', auditTrail, { collapsed: true })}

${section('Money Framework decision log (2026-04-15)', 'decisions', decisionLog, { collapsed: true })}

<footer class="render-info">
  Rendered ${escAttr(renderedAt)} · commit <code>${escAttr(git.sha)}</code> on branch <code>${escAttr(git.branch)}</code> · grade source: <code>${escAttr(grade?.file || 'none')}</code>
  · regenerate via <code>node scripts/render-rd-pack-html.mjs</code>.
</footer>

<script>
// Sortable tables. Click a TH to sort by that column. Toggle asc/desc. Numeric-aware (currency, comma, %).
function parseCell(text) {
  const t = (text || '').trim();
  if (!t) return { num: null, str: '' };
  const cleaned = t.replace(/[\\$,\\sAUD%]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && cleaned !== '' ? { num: n, str: t } : { num: null, str: t.toLowerCase() };
}
document.querySelectorAll('table.sortable').forEach(table => {
  const ths = table.querySelectorAll('thead th');
  if (!ths.length) return;
  ths.forEach((th, idx) => {
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const dir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
      ths.forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
      rows.sort((a, b) => {
        const A = parseCell(a.children[idx]?.textContent);
        const B = parseCell(b.children[idx]?.textContent);
        if (A.num !== null && B.num !== null) return dir === 'asc' ? A.num - B.num : B.num - A.num;
        return dir === 'asc' ? A.str.localeCompare(B.str) : B.str.localeCompare(A.str);
      });
      rows.forEach(r => tbody.appendChild(r));
    });
  });
});
</script>

</body>
</html>
`;

  await writeFile(OUT, html, 'utf8');
  const sizeKb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`✓ Wrote ${OUT} (${sizeKb} KB)`);
  console.log(`  Verdict: ${grade?.data?.verdict?.toUpperCase() || '—'}/${grade?.data?.score ?? '—'}`);
  console.log(`  Hard failures: ${grade?.data?.hard_failures?.length ?? 0}`);
  console.log(`  Warnings: ${grade?.data?.warnings?.length ?? 0}`);
  console.log(`  Missing artefacts: ${grade?.data?.missing_artefacts?.length ?? 0}`);
  console.log(`  Open: open ${path.relative(process.cwd(), OUT)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
