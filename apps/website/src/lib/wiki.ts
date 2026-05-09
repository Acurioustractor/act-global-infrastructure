/**
 * Wiki project data layer.
 *
 * Reads canonical project frontmatter from the ACT wiki at
 * <repo-root>/wiki/projects/*.md and surfaces it as typed records
 * for server-rendered Next.js pages.
 *
 * Source-of-truth precedence:
 *   1. wiki/projects/<slug>.md frontmatter (canonical schema, see
 *      scripts/normalise-wiki-project-frontmatter.mjs)
 *   2. config/project-codes.json (production_url, description,
 *      leads, github_repo, etc.)
 *   3. Body blockquote (`> ...`) for tagline extraction
 *
 * The wiki normaliser guarantees frontmatter shape; this layer
 * trusts that and adds config + body augmentation.
 */
import fs from "node:fs";
import path from "node:path";

// On Vercel only apps/website is uploaded, so we can't read ../../wiki/.
// scripts/snapshot-wiki.mjs (run as prebuild) copies wiki+config
// into _wiki-snapshot/. Locally, both sources work — snapshot takes
// precedence so dev mirrors prod.
const APP_ROOT = path.resolve(process.cwd());
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const SNAPSHOT_DIR = path.join(APP_ROOT, "_wiki-snapshot");

const PROJECTS_DIR = fs.existsSync(path.join(SNAPSHOT_DIR, "projects"))
  ? path.join(SNAPSHOT_DIR, "projects")
  : path.join(REPO_ROOT, "wiki", "projects");

const CONFIG_PATH = fs.existsSync(path.join(SNAPSHOT_DIR, "project-codes.json"))
  ? path.join(SNAPSHOT_DIR, "project-codes.json")
  : path.join(REPO_ROOT, "config", "project-codes.json");

export type WikiProjectTier =
  | "ecosystem"
  | "studio"
  | "satellite"
  | "background"
  | "unspecified";

export type WikiProject = {
  /** Filename slug (e.g. "empathy-ledger") — primary key */
  slug: string;
  /** ACT project code (e.g. "ACT-EL") or "TBD" */
  code: string;
  /** Display name */
  title: string;
  /** Short description (from config) */
  description: string;
  /** Elevator pitch (from wiki body blockquote, if present) */
  tagline: string | null;
  /** ecosystem | studio | satellite | background | unspecified */
  tier: WikiProjectTier;
  /** Active | Stub | Archived | Sunsetting | … */
  status: string;
  /** project | partner | stub */
  publicSurface: string;
  /** Public-facing URL (production_url from config, OR internal /projects/<slug>) */
  href: string;
  /** Whether href is external (different origin) */
  external: boolean;
  /** Cluster grouping (defaults to slug) */
  cluster: string;
  /** Lead names from config */
  leads: string[];
  /** GitHub repo from config (org/repo), if any */
  githubRepo: string | null;
  /** Raw frontmatter for any caller that needs more */
  raw: Record<string, unknown>;
};

type ConfigEntry = {
  name?: string;
  code?: string;
  canonical_slug?: string;
  description?: string;
  tier?: string;
  status?: string;
  leads?: string[];
  production_url?: string;
  github_repo?: string;
  [key: string]: unknown;
};

type Config = {
  projects: Record<string, ConfigEntry>;
  _meta?: Record<string, unknown>;
};

function parseFrontmatter(text: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { frontmatter: {}, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const frontmatter: Record<string, unknown> = {};
  let lastKey: string | null = null;
  for (const line of fmRaw.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("  - ")) {
      if (lastKey && Array.isArray(frontmatter[lastKey])) {
        (frontmatter[lastKey] as string[]).push(line.slice(4).trim());
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
  return { frontmatter, body };
}

function extractTagline(body: string): string | null {
  const m = body.match(/^>\s+(.+?)(?:\n[^>]|\n*$)/m);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ");
}

let _cachedConfig: Config | null = null;
function loadConfig(): Config {
  if (_cachedConfig) return _cachedConfig;
  _cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Config;
  return _cachedConfig;
}

let _cachedProjects: WikiProject[] | null = null;

export function getAllWikiProjects(): WikiProject[] {
  if (_cachedProjects) return _cachedProjects;

  const config = loadConfig();
  const slugToConfig: Record<string, ConfigEntry & { code: string }> = {};
  for (const [code, entry] of Object.entries(config.projects ?? {})) {
    const slug = entry.canonical_slug;
    if (slug) slugToConfig[slug] = { ...entry, code };
  }

  const out: WikiProject[] = [];
  if (!fs.existsSync(PROJECTS_DIR)) {
    _cachedProjects = out;
    return out;
  }

  // Collect both top-level pages (`<slug>.md`) and subdir entry pages (`<slug>/<slug>.md`)
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projectFiles: Array<{ slug: string; filepath: string }> = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.isFile() && e.name.endsWith(".md")) {
      projectFiles.push({
        slug: e.name.replace(/\.md$/, ""),
        filepath: path.join(PROJECTS_DIR, e.name),
      });
    } else if (e.isDirectory()) {
      const entryFile = path.join(PROJECTS_DIR, e.name, `${e.name}.md`);
      if (fs.existsSync(entryFile)) {
        projectFiles.push({ slug: e.name, filepath: entryFile });
      }
    }
  }

  for (const { slug, filepath } of projectFiles) {
    const text = fs.readFileSync(filepath, "utf8");
    const { frontmatter, body } = parseFrontmatter(text);

    const cfg = slugToConfig[slug] ?? null;
    const code = (frontmatter.canonical_code as string) ?? cfg?.code ?? "TBD";
    const title = (frontmatter.title as string) ?? cfg?.name ?? slug;
    const description = cfg?.description ?? "";
    const tagline = extractTagline(body);
    const tier =
      (frontmatter.tier as WikiProjectTier) ??
      (cfg?.tier as WikiProjectTier) ??
      "unspecified";
    const status = (frontmatter.status as string) ?? cfg?.status ?? "Active";
    const publicSurface =
      (frontmatter.public_surface as string) ?? "project";
    const cluster = (frontmatter.cluster as string) ?? slug;
    const leads = cfg?.leads ?? [];
    const githubRepo = cfg?.github_repo ?? null;

    const productionUrl = cfg?.production_url ?? null;
    const websitePath =
      (frontmatter.website_path as string) ?? `/projects/${slug}`;
    const href = productionUrl ?? websitePath;
    const external = Boolean(productionUrl);

    out.push({
      slug,
      code,
      title,
      description,
      tagline,
      tier,
      status,
      publicSurface,
      href,
      external,
      cluster,
      leads,
      githubRepo,
      raw: frontmatter,
    });
  }

  out.sort((a, b) => a.title.localeCompare(b.title));
  _cachedProjects = out;
  return out;
}

/**
 * Ecosystem-tier projects in canonical homepage order.
 * Ordered to match the existing hardcoded homepage layout where
 * possible; new projects fall to the end.
 */
const ECOSYSTEM_ORDER = [
  "act-farm",
  "the-harvest",
  "empathy-ledger",
  "justicehub",
  "goods",
  "act-studio",
  "act-infrastructure",
];

export function getEcosystemProjects(): WikiProject[] {
  const all = getAllWikiProjects();
  const ecosystem = all.filter((p) => p.tier === "ecosystem");
  const orderIndex = (slug: string) => {
    const i = ECOSYSTEM_ORDER.indexOf(slug);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return ecosystem.sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug));
}

export function getWikiProject(slug: string): WikiProject | null {
  return getAllWikiProjects().find((p) => p.slug === slug) ?? null;
}
