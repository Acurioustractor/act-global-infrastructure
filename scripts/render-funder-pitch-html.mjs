#!/usr/bin/env node
// Render a funder pitch / draft markdown file as a single self-contained HTML "send version".
// Markdown stays canonical (voice grader runs on it); HTML is the present/share/print form.
//
// Usage:
//   node scripts/render-funder-pitch-html.mjs <path/to/draft.md>
//   node scripts/render-funder-pitch-html.mjs <path/to/draft.md> --out custom.html
//
// Output defaults to <source>.html next to the markdown source.
// Plan: ~/.claude/plans/review-thsi-idea-to-dynamic-otter.md (round-two pilot #1)

import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false, headerIds: true, mangle: false });

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: src };
  const fm = {};
  let currentKey = null;
  for (const line of m[1].split('\n')) {
    const top = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (top) {
      currentKey = top[1];
      const val = top[2].trim().replace(/^["']|["']$/g, '');
      // skip empty top-level keys that begin a YAML list/map (ignore nested)
      fm[currentKey] = val;
    } else if (/^\s*-\s+/.test(line) && currentKey) {
      // ignore list items - too complex for this pilot
    }
  }
  return { fm, body: src.slice(m[0].length) };
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gitInfo(filePath) {
  try {
    const dir = path.dirname(filePath);
    const sha = execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir }).toString().trim();
    return { sha, branch };
  } catch { return { sha: 'unknown', branch: 'unknown' }; }
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildHeader(fm) {
  const parts = [];
  if (fm.title) parts.push(`<h1 class="doc-title">${escAttr(fm.title)}</h1>`);
  const meta = [];
  if (fm.to) meta.push(`<span><strong>To</strong> ${escAttr(fm.to)}</span>`);
  if (fm.from) meta.push(`<span><strong>From</strong> ${escAttr(fm.from)}</span>`);
  if (fm.date) meta.push(`<span><strong>Date</strong> ${escAttr(fmtDate(fm.date))}</span>`);
  if (fm.ask_aud) {
    const ask = Number(fm.ask_aud).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    meta.push(`<span><strong>Ask</strong> ${escAttr(ask)}</span>`);
  }
  if (meta.length) parts.push(`<div class="doc-meta">${meta.join('<span class="sep">·</span>')}</div>`);
  if (fm.status && fm.status !== 'send-ready') {
    parts.push(`<div class="status-strip"><strong>Status:</strong> ${escAttr(fm.status)} — this is a draft form, not a send-ready document.</div>`);
  }
  return parts.length ? `<header class="doc-header">${parts.join('')}</header>` : '';
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('Usage: node scripts/render-funder-pitch-html.mjs <path/to/draft.md> [--out custom.html]');
    process.exit(args.includes('--help') ? 0 : 1);
  }
  const srcPath = path.resolve(args[0]);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx > -1 && args[outIdx + 1]
    ? path.resolve(args[outIdx + 1])
    : srcPath.replace(/\.md$/, '.html');

  const src = await readFile(srcPath, 'utf8');
  const { fm, body } = parseFrontmatter(src);
  const git = gitInfo(srcPath);
  const renderedAt = new Date().toISOString();

  const bodyHtml = marked.parse(body).replace(/<table>/g, '<table class="data">');
  const titleTag = fm.title || path.basename(srcPath, '.md');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escAttr(titleTag)}</title>
<style>
:root {
  --bg: #fafaf6;
  --surface: #ffffff;
  --ink: #1a1a17;
  --muted: #6a6a62;
  --border: #e5e3dc;
  --accent: #0a4f3a;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
body {
  font: 16px/1.65 ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  max-width: 680px;
  margin: 0 auto;
  padding: 56px 28px 64px;
}
h1, h2, h3, h4 { font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; line-height: 1.2; font-weight: 600; }
h1 { font-size: 30px; margin: 36px 0 12px; }
h2 { font-size: 22px; margin: 36px 0 10px; }
h3 { font-size: 18px; margin: 28px 0 8px; }
h4 { font-size: 16px; margin: 22px 0 6px; }
p { margin: 14px 0; }
em { font-style: italic; color: var(--muted); }
strong { font-weight: 600; }
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(10, 79, 58, 0.3); }
a:hover { border-bottom-color: var(--accent); }
ul, ol { padding-left: 22px; }
li { margin: 6px 0; }
hr { border: 0; border-top: 1px solid var(--border); margin: 32px 0; }
blockquote {
  margin: 18px 0;
  padding: 4px 18px;
  border-left: 2px solid var(--border);
  color: var(--muted);
  font-style: italic;
}
code {
  background: #efece4;
  padding: 1px 5px;
  border-radius: 3px;
  font: 14px/1.4 ui-monospace, "SF Mono", Consolas, monospace;
}
pre {
  background: #1a1a17;
  color: #f3f1ea;
  padding: 14px 16px;
  border-radius: 4px;
  overflow-x: auto;
  font: 13px/1.5 ui-monospace, "SF Mono", Consolas, monospace;
}
pre code { background: transparent; color: inherit; padding: 0; }
table.data {
  border-collapse: collapse;
  margin: 18px 0;
  width: 100%;
  font: 14px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
table.data th, table.data td {
  padding: 7px 11px;
  border: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
table.data th { background: #efece4; font-weight: 600; }
table.data tbody tr:nth-child(even) { background: #fbfaf6; }

.doc-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 18px;
  margin-bottom: 12px;
}
.doc-title {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.005em;
}
.doc-meta {
  margin-top: 14px;
  font: 13px/1.6 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--muted);
}
.doc-meta strong {
  color: var(--ink);
  font-weight: 600;
  margin-right: 4px;
}
.doc-meta .sep { margin: 0 8px; opacity: 0.5; }
.status-strip {
  margin-top: 14px;
  padding: 8px 12px;
  background: #fff8e8;
  border-left: 3px solid #a36400;
  font: 13px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #6a4a00;
}

footer.render-info {
  margin-top: 60px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font: 11px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--muted);
}
footer.render-info code {
  background: transparent;
  padding: 0;
  font-size: 11px;
  color: var(--muted);
}

@media print {
  body {
    background: white;
    max-width: none;
    padding: 18mm 22mm;
    font-size: 11pt;
  }
  .doc-title { font-size: 22pt; }
  h2 { font-size: 14pt; }
  h3 { font-size: 12pt; }
  .status-strip { display: none; }
  footer.render-info { font-size: 8pt; color: #999; }
  a { color: inherit; border-bottom: none; }
  h1, h2, h3 { page-break-after: avoid; }
  table, blockquote, pre { page-break-inside: avoid; }
}
</style>
</head>
<body>

${buildHeader(fm)}

<main class="doc-body">
${bodyHtml}
</main>

<footer class="render-info">
  Rendered ${escAttr(renderedAt)} from <code>${escAttr(path.relative(process.cwd(), srcPath))}</code>
  · commit <code>${escAttr(git.sha)}</code> on <code>${escAttr(git.branch)}</code>
  · regenerate via <code>node scripts/render-funder-pitch-html.mjs ${escAttr(path.relative(process.cwd(), srcPath))}</code>
</footer>

</body>
</html>
`;

  await writeFile(outPath, html, 'utf8');
  const sizeKb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`✓ Wrote ${path.relative(process.cwd(), outPath)} (${sizeKb} KB)`);
  if (fm.title) console.log(`  Title: ${fm.title}`);
  if (fm.to) console.log(`  To: ${fm.to}`);
  if (fm.status) console.log(`  Status: ${fm.status}`);
  console.log(`  Open: open ${path.relative(process.cwd(), outPath)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
