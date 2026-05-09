#!/usr/bin/env node
/**
 * Snapshot wiki/projects + config/project-codes.json into a folder
 * inside apps/website so the build can read them when Vercel only
 * uploads apps/website.
 *
 * Run before deploy:
 *   npm run snapshot-wiki
 *
 * Idempotent. Run as prebuild hook in package.json so it always
 * runs before `next build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "../..");

const SRC_PROJECTS = path.join(REPO_ROOT, "wiki", "projects");
const SRC_CONFIG = path.join(REPO_ROOT, "config", "project-codes.json");

const SNAPSHOT_DIR = path.join(APP_ROOT, "_wiki-snapshot");
const DEST_PROJECTS = path.join(SNAPSHOT_DIR, "projects");
const DEST_CONFIG = path.join(SNAPSHOT_DIR, "project-codes.json");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile() && entry.name.endsWith(".md")) fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(SRC_PROJECTS)) {
  // Snapshot already in place from a previous build — leave it.
  if (fs.existsSync(SNAPSHOT_DIR)) {
    console.log("[snapshot-wiki] source not present, snapshot already exists — skipping");
    process.exit(0);
  }
  console.error("[snapshot-wiki] no source wiki/projects/ AND no existing snapshot — nothing to do");
  process.exit(0);
}

// Reset and copy
fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
copyDir(SRC_PROJECTS, DEST_PROJECTS);
fs.copyFileSync(SRC_CONFIG, DEST_CONFIG);

const counts = {
  topLevel: fs.readdirSync(DEST_PROJECTS).filter((f) => f.endsWith(".md")).length,
  subdirs: fs.readdirSync(DEST_PROJECTS, { withFileTypes: true }).filter((e) => e.isDirectory()).length,
};
console.log(`[snapshot-wiki] copied ${counts.topLevel} top-level + ${counts.subdirs} subdir entries to ${SNAPSHOT_DIR}`);
