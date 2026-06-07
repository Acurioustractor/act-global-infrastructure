#!/usr/bin/env node
/**
 * Build a triage report for thoughts/shared/plans/*.md.
 *
 * Output: thoughts/shared/handoffs/<date>-plans-triage-proposal.md
 * with plans grouped by:
 *   - Auto-detected supersession chains (e.g. v1 → v2 → v3)
 *   - Age cluster (Feb / Mar / Apr / May 2026)
 *   - Topic cluster (finance / alignment / minderoo / notion / etc.)
 *
 * Each entry shows: filename, date, status, suggested_action.
 * Ben marks up the file with final decisions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLANS_DIR = path.join(REPO_ROOT, "thoughts", "shared", "plans");
const OUTPUT = path.join(REPO_ROOT, "thoughts", "shared", "handoffs", `${new Date().toISOString().slice(0, 10)}-plans-triage-proposal.md`);

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return {};
  const fm = {};
  for (const line of text.slice(4, end).split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (m && m[2]) fm[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return fm;
}

const files = fs
  .readdirSync(PLANS_DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .sort();

const plans = files.map((filename) => {
  const text = fs.readFileSync(path.join(PLANS_DIR, filename), "utf8");
  const fm = parseFrontmatter(text);
  return {
    slug: filename.replace(/\.md$/, ""),
    filename,
    title: fm.title || filename,
    status: fm.status || "(none)",
    date: fm.date || "unknown",
    fm,
  };
});

// Detect supersession chains: same prefix, version suffix
function findVersionChains() {
  const chains = {};
  for (const p of plans) {
    // Patterns: "-v2", "-v3", "expert-review", "comprehensive-report"
    const baseMatch = p.slug.match(/^(.+?)(?:-v\d+|-expert-review|-comprehensive-report|-full-automation|-strategy)?$/);
    const base = baseMatch ? baseMatch[1] : p.slug;
    if (!chains[base]) chains[base] = [];
    chains[base].push(p);
  }
  return Object.entries(chains).filter(([, list]) => list.length > 1);
}

const versionChains = findVersionChains();

// Topic clusters
const TOPICS = {
  finance: /^(finance|spending|fy27|bas-|act-finance|financial|unified-financial|receipt|xero|zero-friction|act-money|grant-pipeline|funding|revenue|projects-financial|project-financial|grantscope-notion|grantscope-profile|grant-ceremony)/,
  rd_tax: /(^rd-|^pty-ltd|act-entity|knight-photography)/,
  minderoo: /^minderoo/,
  alignment: /^(act-alignment|ecosystem-alignment|ecosystem-deep-alignment|projects-alignment|alma)/,
  brain_cockpit: /^(act-brain|act-ceo|act-knowledge-system|act-data-sovereignty|company-intelligence|catalysing|fy27-financial)/,
  goods: /^goods/,
  justicehub: /^justicehub/,
  empathy_ledger: /^(empathy-ledger|el-for|el-)/,
  notion: /^notion/,
  wiki: /^wiki|tractorpedia/,
  website: /^(act-living-website|website-)/,
  campaigns_grants: /^(mannifera|ila-grant|opportunity-landscape|pfi-|real-innovation|catalysing-impact|relationship-flywheel|revenue-acceleration)/,
  picc: /^picc/,
  agents_tools: /^(agent|ai-|autoresearch|batch-api|company-intelligence|notion-agent)/,
  comms: /^(communications|comms)/,
  ops: /^(act-this-week|act-fear-setting|grant-ceremony|new-entity-xero|pipeline-autopilot|realtime-integration|subscription-discovery|ux-overhaul|repo-hygiene|repo-refinement|phase1|monorepo|mono-repo|command-center|goals-health|layered-memory|learning-system|memory-)/,
};

function classifyTopic(slug) {
  for (const [topic, re] of Object.entries(TOPICS)) {
    if (re.test(slug)) return topic;
  }
  return "uncategorised";
}

// Suggested actions
function suggestAction(p, chainMembers) {
  // If part of a supersession chain and not the latest
  if (chainMembers && chainMembers.length > 1) {
    const sorted = [...chainMembers].sort((a, b) => b.date.localeCompare(a.date));
    if (p.slug !== sorted[0].slug) return `superseded by ${sorted[0].slug}`;
  }
  if (p.status === "active") return "keep active";
  if (p.status === "blocked") return "keep blocked";
  if (p.status === "done" || p.status === "archive") return "move to _archive/";
  // Date-based
  if (p.date.startsWith("2026-02")) return "archive (Feb cluster, likely stale)";
  if (p.date.startsWith("2026-03")) return "review — likely archive";
  if (p.date.startsWith("2026-04")) return "review — likely active";
  if (p.date.startsWith("2026-05")) return "review — likely active";
  return "needs Ben call";
}

// Build report
const lines = [];
lines.push(`---`);
lines.push(`title: Plans triage proposal — ${plans.length} plans → review and mark up`);
lines.push(`date: ${new Date().toISOString().slice(0, 10)}`);
lines.push(`purpose: Bulk triage of thoughts/shared/plans/ to reach ≤25 active plans. Mark each row with FINAL action.`);
lines.push(`---`);
lines.push(``);
lines.push(`# Plans triage proposal`);
lines.push(``);
lines.push(`**${plans.length} plans** in thoughts/shared/plans/.`);
lines.push(`**Status distribution:** ${Object.entries(plans.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {})).map(([k, v]) => `${k}=${v}`).join(", ")}.`);
lines.push(``);
lines.push(`## How to use this`);
lines.push(``);
lines.push(`Each row has a **suggested action**. Mark up with your final call:`);
lines.push(`- \`KEEP\` — leave as active/blocked/monitoring`);
lines.push(`- \`ARCHIVE\` — move to thoughts/shared/plans/_archive/2026-05/`);
lines.push(`- \`SUPERSEDED BY <slug>\` — supersession chain`);
lines.push(`- \`MERGE INTO <slug>\` — consolidate into another plan`);
lines.push(``);
lines.push(`Once marked up, run scripts/apply-plans-triage.mjs (TBD) to execute.`);
lines.push(``);

// Section 1: detected supersession chains
lines.push(`## Auto-detected version chains`);
lines.push(``);
if (versionChains.length === 0) {
  lines.push(`(none detected)`);
} else {
  for (const [base, list] of versionChains) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    lines.push(`### \`${base}\` chain (${list.length} plans)`);
    lines.push(``);
    lines.push(`| Plan | Date | Status | Suggested |`);
    lines.push(`|---|---|---|---|`);
    for (const p of sorted) {
      const isLatest = p.slug === sorted[0].slug;
      const action = isLatest ? "**KEEP latest**" : `superseded by \`${sorted[0].slug}\``;
      lines.push(`| \`${p.slug}\` | ${p.date} | ${p.status} | ${action} |`);
    }
    lines.push(``);
  }
}

// Section 2: by topic
const chainSlugs = new Set();
for (const [, list] of versionChains) for (const p of list) chainSlugs.add(p.slug);

const byTopic = {};
for (const p of plans) {
  if (chainSlugs.has(p.slug)) continue; // already shown in chain
  const topic = classifyTopic(p.slug);
  if (!byTopic[topic]) byTopic[topic] = [];
  byTopic[topic].push(p);
}

lines.push(`## By topic cluster`);
lines.push(``);

const topicOrder = [
  "finance", "rd_tax", "minderoo", "alignment", "brain_cockpit",
  "goods", "justicehub", "empathy_ledger", "picc",
  "notion", "wiki", "website", "campaigns_grants",
  "agents_tools", "comms", "ops", "uncategorised",
];

for (const topic of topicOrder) {
  if (!byTopic[topic] || byTopic[topic].length === 0) continue;
  lines.push(`### ${topic} (${byTopic[topic].length})`);
  lines.push(``);
  lines.push(`| Plan | Date | Status | Suggested |`);
  lines.push(`|---|---|---|---|`);
  const sorted = [...byTopic[topic]].sort((a, b) => b.date.localeCompare(a.date));
  for (const p of sorted) {
    const action = suggestAction(p);
    lines.push(`| \`${p.slug}\` | ${p.date} | ${p.status} | ${action} |`);
  }
  lines.push(``);
}

lines.push(`## Summary counts`);
lines.push(``);
lines.push(`- Plans in version chains: ${chainSlugs.size}`);
lines.push(`- Plans by topic: ${Object.entries(byTopic).map(([t, l]) => `${t}=${l.length}`).join(", ")}`);

fs.writeFileSync(OUTPUT, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${OUTPUT}`);
console.log(`${plans.length} plans grouped into ${Object.keys(byTopic).length} topics + ${versionChains.filter(([, l]) => l.length > 1).length} version chains`);
