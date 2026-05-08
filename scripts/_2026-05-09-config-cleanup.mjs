#!/usr/bin/env node
/**
 * One-shot config cleanup — 2026-05-09.
 *
 * (1) Adds 3 wiki-orphan entries to config/project-codes.json with
 *     tier=background, codes derived from slug:
 *       - deadlylabs → ACT-DL
 *       - grantscope → ACT-GS
 *       - place-based-policy-lab → ACT-PB
 * (2) Demotes 6 entries from studio/satellite → background (have
 *     no wiki page, intentionally not surfaced):
 *       - ACT-PS PICC On Country Photo Studio
 *       - ACT-UA Uncle Allan Palm Island Art
 *       - ACT-CF The Confessional
 *       - ACT-GP Gold Phone
 *       - ACT-RT Redtape
 *       - ACT-SE SEFA Partnership
 *
 * Per Ben 2026-05-09: "all of those are really just test and sit
 * in the background as archives and partners — don't need to be
 * on website but good for reflection and history."
 *
 * Use:
 *   node scripts/_2026-05-09-config-cleanup.mjs            # dry-run
 *   node scripts/_2026-05-09-config-cleanup.mjs --apply    # write back
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(REPO_ROOT, "config", "project-codes.json");
const APPLY = process.argv.includes("--apply");

const ADDITIONS = {
  "ACT-DL": {
    name: "Deadly Labs",
    code: "ACT-DL",
    canonical_slug: "deadlylabs",
    category: "background",
    status: "active",
    description: "Background record (added 2026-05-09 cleanup) — wiki page exists at wiki/projects/deadlylabs.md.",
    tier: "background",
  },
  "ACT-GS": {
    name: "GrantScope (CivicGraph)",
    code: "ACT-GS",
    canonical_slug: "grantscope",
    category: "background",
    status: "active",
    description: "GrantScope tool / CivicGraph reference. Wiki page at wiki/projects/grantscope.md. Lives in separate repo at /Users/benknight/Code/grantscope.",
    tier: "background",
  },
  "ACT-PB": {
    name: "Place-Based Policy Lab",
    code: "ACT-PB",
    canonical_slug: "place-based-policy-lab",
    category: "background",
    status: "active",
    description: "Background record (added 2026-05-09 cleanup) — wiki page exists at wiki/projects/place-based-policy-lab.md.",
    tier: "background",
  },
};

const DEMOTIONS = ["ACT-PS", "ACT-UA", "ACT-CF", "ACT-GP", "ACT-RT", "ACT-SE"];

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const log = [];

for (const [code, entry] of Object.entries(ADDITIONS)) {
  if (config.projects[code]) {
    log.push(`SKIP add ${code} — already exists`);
    continue;
  }
  config.projects[code] = entry;
  log.push(`ADD ${code} (${entry.name}) tier=${entry.tier}`);
}

for (const code of DEMOTIONS) {
  const e = config.projects[code];
  if (!e) {
    log.push(`SKIP demote ${code} — not in config`);
    continue;
  }
  if (e.tier === "background") {
    log.push(`SKIP demote ${code} — already background`);
    continue;
  }
  log.push(`DEMOTE ${code} (${e.name}) tier ${e.tier} → background`);
  e.tier = "background";
}

console.log("=== Config cleanup ===");
for (const line of log) console.log("  ", line);
console.log("");

if (APPLY) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log("✓ Wrote", CONFIG_PATH);
} else {
  console.log("DRY RUN — re-run with --apply to write back.");
}
