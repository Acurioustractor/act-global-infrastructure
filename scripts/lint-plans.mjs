#!/usr/bin/env node
/**
 * Lint thoughts/shared/plans/*.md against canonical conventions.
 *
 * Required frontmatter: title, status, date.
 * Recommended: last_verified (warns if absent or older than 60 days).
 *
 * Status enum: active | blocked | done | archive | monitoring | review-needed | superseded
 *
 * Cross-checks:
 *   - status: superseded MUST have superseded_by pointing to an existing plan
 *   - status: done OR archive should be considered for thoughts/shared/plans/_archive/
 *
 * Exit codes:
 *   0 - clean
 *   1 - errors
 *   2 - warnings only
 *
 * Use:
 *   node scripts/lint-plans.mjs
 *   node scripts/lint-plans.mjs --quiet    # show only errors + summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLANS_DIR = path.join(REPO_ROOT, "thoughts", "shared", "plans");

const VALID_STATUS = [
  "active",
  "blocked",
  "done",
  "archive",
  "monitoring",
  "review-needed",
  "superseded",
];

const STALE_DAYS = 60;
const QUIET = process.argv.includes("--quiet");

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text, hadFrontmatter: false };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { frontmatter: {}, body: text, hadFrontmatter: false };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const frontmatter = {};
  let lastKey = null;
  for (const line of fmRaw.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("  - ")) {
      if (lastKey && Array.isArray(frontmatter[lastKey])) {
        frontmatter[lastKey].push(line.slice(4).trim());
      }
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === "") {
      frontmatter[key] = [];
      lastKey = key;
    } else {
      frontmatter[key] = val.replace(/^["']|["']$/g, "");
      lastKey = null;
    }
  }
  return { frontmatter, body, hadFrontmatter: true };
}

const errors = [];
const warnings = [];
const today = new Date();

const files = fs
  .readdirSync(PLANS_DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .sort();

const slugs = new Set(files.map((f) => f.replace(/\.md$/, "")));

const statusCounts = Object.create(null);

for (const filename of files) {
  const filepath = path.join(PLANS_DIR, filename);
  const slug = filename.replace(/\.md$/, "");
  const text = fs.readFileSync(filepath, "utf8");
  const { frontmatter, hadFrontmatter } = parseFrontmatter(text);

  if (!hadFrontmatter) {
    errors.push(`[${filename}] no frontmatter — run scripts/normalise-plan-frontmatter.mjs --apply`);
    continue;
  }

  if (!frontmatter.title) errors.push(`[${filename}] missing required: title`);
  if (!frontmatter.status) errors.push(`[${filename}] missing required: status`);
  if (!frontmatter.date) warnings.push(`[${filename}] missing recommended: date`);

  if (frontmatter.status && !VALID_STATUS.includes(frontmatter.status)) {
    errors.push(`[${filename}] invalid status "${frontmatter.status}" — must be one of: ${VALID_STATUS.join(", ")}`);
  } else if (frontmatter.status) {
    statusCounts[frontmatter.status] = (statusCounts[frontmatter.status] || 0) + 1;
  }

  if (frontmatter.status === "superseded" && !frontmatter.superseded_by) {
    errors.push(`[${filename}] status: superseded requires superseded_by`);
  } else if (frontmatter.superseded_by && !slugs.has(frontmatter.superseded_by)) {
    warnings.push(`[${filename}] superseded_by "${frontmatter.superseded_by}" — no matching plan found`);
  }

  if (frontmatter.last_verified) {
    const lv = new Date(frontmatter.last_verified);
    if (!isNaN(lv.getTime())) {
      const ageDays = Math.floor((today - lv) / 86_400_000);
      if (ageDays > STALE_DAYS) {
        warnings.push(`[${filename}] last_verified ${ageDays}d ago (status: ${frontmatter.status}) — re-verify or update`);
      }
    }
  } else if (frontmatter.status === "active" || frontmatter.status === "monitoring") {
    warnings.push(`[${filename}] status: ${frontmatter.status} but no last_verified date`);
  }

  if (frontmatter.status === "done" || frontmatter.status === "archive") {
    warnings.push(`[${filename}] status: ${frontmatter.status} — consider moving to thoughts/shared/plans/_archive/`);
  }
}

if (!QUIET || errors.length || warnings.length) {
  console.log("=== Plans lint ===");
  console.log(`Total: ${files.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log("");
  if (Object.keys(statusCounts).length) {
    console.log("Status distribution:");
    for (const [s, n] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${s.padEnd(15)} ${n}`);
    }
    console.log("");
  }
}

if (errors.length) {
  console.log("ERRORS:");
  for (const e of errors.slice(0, 20)) console.log("  ✗", e);
  if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  console.log("");
}

if (warnings.length && !QUIET) {
  console.log("WARNINGS:");
  for (const w of warnings.slice(0, 30)) console.log("  ⚠", w);
  if (warnings.length > 30) console.log(`  ... and ${warnings.length - 30} more`);
  console.log("");
}

if (errors.length) process.exit(1);
if (warnings.length) process.exit(2);
console.log("✓ clean");
process.exit(0);
