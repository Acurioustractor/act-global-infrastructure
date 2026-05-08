#!/usr/bin/env node
/**
 * Add minimal frontmatter to plans in thoughts/shared/plans/*.md
 * that have none. Plans WITH existing frontmatter are left alone
 * (their schemas are heterogeneous; canonicalising them risks
 * losing intent — that's a separate triage pass).
 *
 * For plans WITHOUT frontmatter, this script adds:
 *   - title (extracted from H1)
 *   - status: review-needed (signal for triage)
 *   - date (first git commit date — when the plan was created)
 *   - last_verified: <today>
 *
 * Use:
 *   node scripts/normalise-plan-frontmatter.mjs            # dry-run
 *   node scripts/normalise-plan-frontmatter.mjs --verbose  # dry-run + samples
 *   node scripts/normalise-plan-frontmatter.mjs --apply    # write back
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLANS_DIR = path.join(REPO_ROOT, "thoughts", "shared", "plans");

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const TODAY = new Date().toISOString().slice(0, 10);

function hasFrontmatter(text) {
  return text.startsWith("---\n") && text.indexOf("\n---\n", 4) > 0;
}

function extractTitle(body, slug) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : slug;
}

function firstCommitDate(filepath) {
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format=%ci -- "${filepath}" | tail -1`,
      { cwd: REPO_ROOT, encoding: "utf8" }
    ).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function escapeYaml(s) {
  // Plan titles often contain `:`, `—`, quotes. Wrap in double quotes,
  // escape any double quotes within.
  if (/[:#&*!\|>'"%@`,\[\]\{\}]/.test(s) || s.includes("\n")) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

const files = fs
  .readdirSync(PLANS_DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .sort();

const report = { skipped: [], normalised: [] };

for (const filename of files) {
  const filepath = path.join(PLANS_DIR, filename);
  const slug = filename.replace(/\.md$/, "");
  const text = fs.readFileSync(filepath, "utf8");

  if (hasFrontmatter(text)) {
    report.skipped.push(filename);
    continue;
  }

  const title = extractTitle(text, slug);
  const created = firstCommitDate(`thoughts/shared/plans/${filename}`) || TODAY;

  const fm = [
    "---",
    `title: ${escapeYaml(title)}`,
    `status: review-needed`,
    `date: ${created}`,
    `last_verified: ${TODAY}`,
    "---",
    "",
  ].join("\n");

  const out = fm + text.replace(/^\n+/, "");

  report.normalised.push({ filename, title: title.slice(0, 60), created });

  if (APPLY) {
    fs.writeFileSync(filepath, out, "utf8");
  } else if (VERBOSE) {
    console.log(`--- ${filename} ---`);
    console.log(out.split("\n").slice(0, 10).join("\n"));
    console.log("");
  }
}

console.log("=== Plan frontmatter normalisation ===");
console.log(`Total plans: ${files.length}`);
console.log(`Already had frontmatter (skipped): ${report.skipped.length}`);
console.log(`Normalised (added minimal frontmatter): ${report.normalised.length}`);
console.log("");

if (!APPLY) {
  console.log("DRY RUN — no files written. Re-run with --apply to write back.");
}
