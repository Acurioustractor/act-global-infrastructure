import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const WIKI_PROJECTS_PATH = path.resolve(
  ROOT,
  '../act-regenerative-studio/src/data/wiki-projects.generated.json'
);
const PROJECT_CODES_PATH = path.resolve(ROOT, 'config/project-codes.json');
const PROJECT_IDENTITY_RULES_PATH = path.resolve(
  ROOT,
  'config/project-identity-rules.json'
);
const OUTPUT_JSON_PATH = path.resolve(ROOT, 'wiki/output/project-registry-latest.json');
const OUTPUT_MD_PATH = path.resolve(ROOT, 'wiki/output/project-registry-latest.md');

function normalize(value) {
  if (!value) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function buildConfigLookup(configProjects) {
  const lookup = new Map();
  for (const project of Object.values(configProjects)) {
    const values = new Set([
      project.code,
      project.name,
      project.canonical_slug,
      ...(project.slug_aliases || []),
      ...(project.legacy_codes || []),
      ...(project.ghl_tags || []),
      ...(project.notion_pages || []),
      ...(project.xero_tracking_aliases || []),
    ]);
    for (const value of values) {
      const key = normalize(value);
      if (key && !lookup.has(key)) {
        lookup.set(key, project);
      }
    }
  }
  return lookup;
}

function inferEntityType(row, rule) {
  if (rule?.entity_type) return rule.entity_type;

  const tier = String(row.tier || '').toLowerCase();
  if (tier === 'ecosystem') return 'project-hub';
  if (tier === 'studio' || tier === 'satellite') return 'project';
  return 'project';
}

function inferTaggingMode(row, rule) {
  if (rule?.tagging_mode) return rule.tagging_mode;
  return row.code && row.code !== 'NO-CODE' ? 'own-code' : 'no-tag-yet';
}

function buildRegistryRows(wikiRows, configProjects, rules) {
  const configLookup = buildConfigLookup(configProjects);
  const rows = [];

  for (const row of wikiRows) {
    const rule = rules.entities[row.slug] || null;
    const configMatch =
      configLookup.get(normalize(row.slug)) ||
      configLookup.get(normalize(row.title)) ||
      (row.code && row.code !== 'NO-CODE'
        ? configLookup.get(normalize(row.code))
        : null) ||
      (rule?.canonical_slug
        ? configLookup.get(normalize(rule.canonical_slug))
        : null) ||
      (rule?.canonical_code
        ? configLookup.get(normalize(rule.canonical_code))
        : null) ||
      null;

    const entityType = inferEntityType(row, rule);
    const taggingMode = inferTaggingMode(row, rule);
    const registryCode = configMatch?.code || rule?.canonical_code || null;
    const wikiCode = row.code || 'NO-CODE';
    const tagWithCode =
      taggingMode === 'own-code'
        ? registryCode || (wikiCode !== 'NO-CODE' ? wikiCode : null)
        : rule?.canonical_code || configMatch?.code || null;
    const canonicalSlug =
      rule?.canonical_slug || configMatch?.canonical_slug || row.slug || null;
    const needsWikiCodeBackfill =
      taggingMode === 'own-code' &&
      Boolean(registryCode) &&
      normalize(wikiCode) !== normalize(registryCode);

    rows.push({
      title: row.title,
      slug: row.slug,
      wikiCode,
      registryCode,
      tagWithCode,
      tier: row.tier || 'NO-TIER',
      entityType,
      taggingMode,
      canonicalSlug,
      productionUrl: configMatch?.production_url || null,
      needsWikiCodeBackfill,
      recommendedAction:
        rule?.recommended_action ||
        (needsWikiCodeBackfill
          ? `Backfill wiki metadata with ${registryCode}.`
          : wikiCode === 'NO-CODE'
            ? 'Decision needed.'
            : 'Keep as coded project.'),
    });
  }

  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

function buildCollisionRows(rows) {
  const byCode = new Map();

  for (const row of rows) {
    const code = row.tagWithCode;
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }

  return Array.from(byCode.entries())
    .map(([code, group]) => ({ code, group }))
    .filter(({ group }) => group.filter((row) => row.taggingMode === 'own-code').length > 1)
    .map(({ code, group }) => ({
      code,
      titles: group.map((row) => row.title),
      slugs: group.map((row) => row.slug),
      modes: group.map((row) => row.taggingMode),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

function renderTable(rows) {
  if (!rows.length) return '_None._\n';

  const lines = [
    '| Title | Slug | Wiki Code | Tag With | Type | Mode | Action |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.title} | \`${row.slug}\` | \`${row.wikiCode}\` | \`${row.tagWithCode || 'NO-CODE'}\` | ${row.entityType} | ${row.taggingMode} | ${row.recommendedAction} |`
    );
  }

  return `${lines.join('\n')}\n`;
}

function renderMarkdown(summary) {
  const ownCodeRows = summary.rows.filter((row) => row.taggingMode === 'own-code');
  const parentRows = summary.rows.filter((row) =>
    ['parent-code', 'alias-of', 'related-proof'].includes(row.taggingMode)
  );
  const needsDecisionRows = summary.rows.filter((row) => row.taggingMode === 'no-tag-yet');
  const wikiBackfillRows = summary.rows.filter((row) => row.needsWikiCodeBackfill);

  return `# Project Registry\n\n> Canonical roster compiled from the wiki snapshot, the project code registry, and explicit identity/tagging rules. This is the working list for merge decisions, tagging, and re-tagging across wiki, site, Empathy Ledger, Xero, GHL, and Notion.\n\n## Summary\n\n- Wiki project pages: **${summary.counts.total}**\n- Own-code operational pages: **${ownCodeRows.length}**\n- Parent/alias/proof pages: **${parentRows.length}**\n- Pages still needing a decision: **${needsDecisionRows.length}**\n- Wiki pages with missing or stale own-code metadata: **${wikiBackfillRows.length}**\n- Real own-code collisions still needing cleanup: **${summary.collisions.length}**\n\n## What Counts As A Project\n\n- **Own-code**: a real operational project, hub, or budget-bearing sub-project.\n- **Parent-code**: a page that matters in the wiki, but should tag to a parent project across systems.\n- **Alias-of**: a second public or technical name for an already-coded project.\n- **Related-proof**: a precedent, partner program, or proof object that should not become an ACT project code by default.\n- **No-tag-yet**: a page that needs a conscious decision before it participates in cross-system tagging.\n\n## Own-Code Pages\n\n${renderTable(ownCodeRows)}\n## Parent / Alias / Proof Pages\n\n${renderTable(parentRows)}\n## Wiki Pages That Need Code Metadata Backfill\n\n${renderTable(wikiBackfillRows)}\n## Pages Still Requiring A Decision\n\n${renderTable(needsDecisionRows)}\n## Real Own-Code Collisions Still To Resolve\n\n${
    summary.collisions.length
      ? summary.collisions
          .map(
            (collision) =>
              `- \`${collision.code}\` -> ${collision.titles
                .map((title, index) => `${title} (${collision.modes[index]})`)
                .join(', ')}`
          )
          .join('\n')
      : '_None._'
  }\n`;
}

async function main() {
  const wikiSnapshot = await readJson(WIKI_PROJECTS_PATH);
  const projectCodes = await readJson(PROJECT_CODES_PATH);
  const rules = await readJson(PROJECT_IDENTITY_RULES_PATH);

  const wikiRows = (wikiSnapshot.projects || []).map((project) => ({
    title: project.title,
    slug: project.slug,
    code: project.code || 'NO-CODE',
    tier: project.tier || 'NO-TIER',
  }));

  const rows = buildRegistryRows(wikiRows, projectCodes.projects || {}, rules);
  const collisions = buildCollisionRows(rows);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourcePaths: {
      wikiProjects: WIKI_PROJECTS_PATH,
      projectCodes: PROJECT_CODES_PATH,
      identityRules: PROJECT_IDENTITY_RULES_PATH,
    },
    counts: {
      total: rows.length,
      ownCode: rows.filter((row) => row.taggingMode === 'own-code').length,
      parentOrAlias: rows.filter((row) =>
        ['parent-code', 'alias-of', 'related-proof'].includes(row.taggingMode)
      ).length,
      needsDecision: rows.filter((row) => row.taggingMode === 'no-tag-yet').length,
      wikiBackfillReady: rows.filter((row) => row.needsWikiCodeBackfill).length,
      collisions: collisions.length,
    },
    rows,
    collisions,
  };

  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD_PATH, `${renderMarkdown(summary)}\n`);

  console.log(
    `wrote project registry report: ${summary.counts.total} wiki pages, ${summary.counts.ownCode} own-code, ${summary.counts.parentOrAlias} parent/alias/proof, ${summary.counts.needsDecision} needing decision`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
