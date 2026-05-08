#!/usr/bin/env node
/**
 * Apply conservative auto-triage to thoughts/shared/plans/.
 *
 * Rules:
 *   1. Plans dated 2026-02-* (Feb 2026 cluster, ~3+ months stale)
 *      with status=review-needed → status=archive + git mv to
 *      thoughts/shared/plans/_archive/2026-05/. Exception: INDEX.md.
 *   2. unified-financial-overview (v1) → status=superseded + add
 *      `superseded_by: unified-financial-overview-v2` frontmatter.
 *   3. Everything else: untouched. Ben can mark up the triage
 *      proposal at his pace; this script can be re-run after he
 *      makes more calls.
 *
 * Use:
 *   node scripts/apply-plans-triage.mjs            # dry-run
 *   node scripts/apply-plans-triage.mjs --apply    # write back + git mv
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLANS_DIR = path.join(REPO_ROOT, "thoughts", "shared", "plans");
const ARCHIVE_DIR = path.join(PLANS_DIR, "_archive", "2026-05");
const APPLY = process.argv.includes("--apply");

const KEEP_REGARDLESS = new Set(["INDEX.md"]);

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: {}, rest: text, hadFrontmatter: false };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { frontmatter: {}, rest: text, hadFrontmatter: false };
  const fmRaw = text.slice(4, end);
  const rest = text.slice(end + 5);
  const frontmatter = {};
  for (const line of fmRaw.split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (m && m[2]) frontmatter[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return { frontmatter, rest, hadFrontmatter: true, fmRaw };
}

function setFrontmatterField(text, key, value) {
  const { frontmatter, rest, hadFrontmatter, fmRaw } = parseFrontmatter(text);
  if (!hadFrontmatter) return text; // shouldn't happen post-Session 4a
  const lines = fmRaw.split("\n");
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  const newLine = `${key}: ${value}`;
  if (idx >= 0) lines[idx] = newLine;
  else lines.push(newLine);
  return `---\n${lines.join("\n")}\n---\n${rest}`;
}

const archived = [];
const superseded = [];

const files = fs
  .readdirSync(PLANS_DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .sort();

if (APPLY && !fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

for (const filename of files) {
  if (KEEP_REGARDLESS.has(filename)) continue;
  const filepath = path.join(PLANS_DIR, filename);
  const text = fs.readFileSync(filepath, "utf8");
  const { frontmatter } = parseFrontmatter(text);

  // Rule 1: Feb 2026 review-needed → archive
  if (
    frontmatter.status === "review-needed" &&
    typeof frontmatter.date === "string" &&
    frontmatter.date.startsWith("2026-02")
  ) {
    archived.push(filename);
    if (APPLY) {
      const newText = setFrontmatterField(text, "status", "archive");
      fs.writeFileSync(filepath, newText, "utf8");
      // git mv preserves history
      try {
        execSync(`git mv "${filepath}" "${path.join(ARCHIVE_DIR, filename)}"`, {
          cwd: REPO_ROOT,
          stdio: "pipe",
        });
      } catch (e) {
        // fall back to fs rename + git add (in case file isn't tracked yet)
        fs.renameSync(filepath, path.join(ARCHIVE_DIR, filename));
        execSync(`git add -A`, { cwd: REPO_ROOT, stdio: "pipe" });
      }
    }
    continue;
  }
}

// Rule 2: unified-financial-overview supersession
const v1 = path.join(PLANS_DIR, "unified-financial-overview.md");
if (fs.existsSync(v1)) {
  const text = fs.readFileSync(v1, "utf8");
  const { frontmatter } = parseFrontmatter(text);
  if (frontmatter.status === "review-needed") {
    superseded.push("unified-financial-overview.md");
    if (APPLY) {
      let newText = setFrontmatterField(text, "status", "superseded");
      newText = setFrontmatterField(newText, "superseded_by", "unified-financial-overview-v2");
      fs.writeFileSync(v1, newText, "utf8");
    }
  }
}

console.log("=== Auto-triage report ===");
console.log(`Plans archived (Feb 2026 review-needed): ${archived.length}`);
for (const f of archived) console.log(`  - ${f}`);
console.log("");
console.log(`Plans marked superseded: ${superseded.length}`);
for (const f of superseded) console.log(`  - ${f}`);
console.log("");

if (!APPLY) {
  console.log("DRY RUN — re-run with --apply to write back + git mv.");
} else {
  console.log("✓ Applied. Run scripts/lint-plans.mjs to verify.");
}
