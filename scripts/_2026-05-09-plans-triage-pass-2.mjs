#!/usr/bin/env node
/**
 * Plans triage pass 2 — explicit archive + supersede lists per Ben 2026-05-09.
 *
 * Archives all Mar 2026 cluster review-needed plans + all
 * campaigns_grants + agents_tools + notion clusters regardless
 * of date (superseded by current systems).
 *
 * Supersedes 2 spending-intelligence plans → v4-full-automation.
 *
 * Use:
 *   node scripts/_2026-05-09-plans-triage-pass-2.mjs            # dry-run
 *   node scripts/_2026-05-09-plans-triage-pass-2.mjs --apply    # write back + git mv
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLANS_DIR = path.join(REPO_ROOT, "thoughts", "shared", "plans");
const ARCHIVE_DIR = path.join(PLANS_DIR, "_archive", "2026-05");
const APPLY = process.argv.includes("--apply");

// 57 plans to archive
const ARCHIVE = [
  // finance Mar 2026 (16)
  "financial-cockpit-plan",
  "fy27-financial-strategy",
  "project-financial-workspaces",
  "revenue-acceleration-model",
  "grant-ceremony-and-process",
  "financial-operations-system-design",
  "funding-pipeline-strategy",
  "grantscope-profile-strategy",
  "project-financial-clarity-review",
  "xero-agentic-system-and-bas-closeout",
  "xero-bill-matching-fix",
  "zero-friction-finance-build",
  "act-finance-engine-review",
  "grantscope-notion-bidirectional-sync",
  "finance-flow-dashboard-plan",
  "finance-intelligence-system",
  // uncategorised Mar 2026 (14)
  "act-revenue-compendium",
  "ceo-codebase-review-2026-03-14",
  "grantscope-strategic-review",
  "harvest-farm-founder-vision",
  "ila-letter-act-inkind-support",
  "ila-letter-allan-palm-island",
  "ila-letter-elders-group",
  "ila-letter-picc-financial-support",
  "ila-quote-benjamin-knight-act",
  "ila-quote-james-davidson",
  "innovation-studio-research-2026",
  "mounty-yarns-cost-breakdown",
  "nonprofit-discount-tracker",
  "act-ecosystem-runway-strategy",
  // brain_cockpit Mar 2026 (4)
  "catalysing-impact-roadmap",
  "act-data-sovereignty-charter",
  "catalysing-impact-strategy",
  "company-intelligence-layer",
  // rd_tax Mar 2026 (3) — superseded by R&D pack FY26
  "rd-tax-incentive-fy26-package",
  "pty-ltd-transition-and-rd-strategy",
  "rd-activity-register-fy2025",
  // goods Mar 2026 (2)
  "goods-civicgraph-review",
  "goods-opportunity-pipeline",
  // ops Mar 2026 (3)
  "pipeline-autopilot",
  "command-center-review-2026-03-20",
  "phase1-sprint-plan",
  // ALL campaigns_grants (5) — submitted or dead
  "opportunity-landscape-deep-research-2026",
  "relationship-flywheel-engine",
  "mannifera-2026-grant-draft",
  "mannifera-2026-theory-of-change",
  "pfi-goods-on-country-eoi",
  // ALL agents_tools (4) — early experiments superseded by current infra
  "agent-tools-audit-and-consolidation",
  "ai-innovation-landscape-2026",
  "autoresearch-round1-synthesis",
  "batch-api-candidates",
  // ALL notion (4) — superseded by codex Notion canonical hub
  "notion-agent-design",
  "notion-agent-readiness-audit",
  "notion-database-audit-and-agent-plan",
  "notion-custom-agent-instructions",
  // empathy_ledger Mar (1)
  "el-for-organisations-pitch",
  // justicehub Mar (1)
  "justicehub-revenue-strategy",
];

// 2 plans → mark superseded by spending-intelligence-v4-full-automation
const SUPERSEDED = {
  "spending-intelligence-system": "spending-intelligence-v4-full-automation",
  "spending-intelligence-expert-review": "spending-intelligence-v4-full-automation",
};

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { fmRaw: "", rest: text };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { fmRaw: "", rest: text };
  return { fmRaw: text.slice(4, end), rest: text.slice(end + 5) };
}

function setField(text, key, value) {
  const { fmRaw, rest } = parseFrontmatter(text);
  if (!fmRaw) return text;
  const lines = fmRaw.split("\n");
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  const newLine = `${key}: ${value}`;
  if (idx >= 0) lines[idx] = newLine;
  else lines.push(newLine);
  return `---\n${lines.join("\n")}\n---\n${rest}`;
}

const archived = [];
const skipped = [];
const superseded = [];

if (APPLY && !fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

// Process archives
for (const slug of ARCHIVE) {
  const filename = `${slug}.md`;
  const src = path.join(PLANS_DIR, filename);
  if (!fs.existsSync(src)) {
    skipped.push(`${slug} (not found)`);
    continue;
  }
  archived.push(slug);
  if (APPLY) {
    const text = fs.readFileSync(src, "utf8");
    const newText = setField(text, "status", "archive");
    fs.writeFileSync(src, newText, "utf8");
    try {
      execSync(`git mv "${src}" "${path.join(ARCHIVE_DIR, filename)}"`, { cwd: REPO_ROOT, stdio: "pipe" });
    } catch {
      fs.renameSync(src, path.join(ARCHIVE_DIR, filename));
    }
  }
}

// Process supersessions
for (const [slug, supersededBy] of Object.entries(SUPERSEDED)) {
  const src = path.join(PLANS_DIR, `${slug}.md`);
  if (!fs.existsSync(src)) {
    skipped.push(`${slug} (supersede target not found)`);
    continue;
  }
  superseded.push(`${slug} → ${supersededBy}`);
  if (APPLY) {
    let text = fs.readFileSync(src, "utf8");
    text = setField(text, "status", "superseded");
    text = setField(text, "superseded_by", supersededBy);
    fs.writeFileSync(src, text, "utf8");
  }
}

console.log("=== Triage pass 2 ===");
console.log(`Archive: ${archived.length}`);
console.log(`Supersede: ${superseded.length}`);
console.log(`Skipped (not found): ${skipped.length}`);
if (skipped.length) for (const s of skipped) console.log("  ⚠", s);
console.log("");

if (!APPLY) console.log("DRY RUN — re-run with --apply");
else console.log("✓ Applied");
