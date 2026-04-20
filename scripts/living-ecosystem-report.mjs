import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CANON_PATH = path.resolve(ROOT, 'config/living-ecosystem-canon.json');
const OUTPUT_JSON_PATH = path.resolve(ROOT, 'wiki/output/living-ecosystem-canon-latest.json');
const OUTPUT_MD_PATH = path.resolve(ROOT, 'wiki/output/living-ecosystem-canon-latest.md');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function buildRows(canon) {
  return [
    ...Object.entries(canon.systems || {}).map(([id, asset]) => ({ id, lane: 'system', ...asset })),
    ...Object.entries(canon.surfaces || {}).map(([id, asset]) => ({ id, lane: 'surface', ...asset })),
  ].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

function renderTable(rows) {
  if (!rows.length) return '_None._\n';

  const lines = [
    '| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |',
    '|---|---|---|---|---|---|---|---|',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.display_name} | \`${row.id}\` | ${row.lane} | ${row.classification} | ${row.surface_role} | ${row.verification_status} | ${row.human_decision_required ? 'yes' : 'no'} | ${row.notes || ''} |`
    );
  }

  return `${lines.join('\n')}\n`;
}

function renderOwnershipRules(ownershipRules) {
  const lines = [];

  for (const [ruleId, rule] of Object.entries(ownershipRules || {})) {
    lines.push(`- \`${ruleId}\` -> ${rule.rule}`);
    if (rule.owner_id) {
      lines.push(`  Owner: \`${rule.owner_id}\``);
    }
    if (rule.default_owner_id) {
      lines.push(`  Default owner: \`${rule.default_owner_id}\``);
    }
    if (rule.mirror_targets?.length) {
      lines.push(`  Mirrors: ${rule.mirror_targets.map((target) => `\`${target}\``).join(', ')}`);
    }
  }

  return lines.length ? `${lines.join('\n')}\n` : '_None._\n';
}

function renderHumanDecisions(decisions) {
  if (!decisions?.length) return '_None._\n';

  return `${decisions
    .map((decision) => `- \`${decision.id}\` (${decision.status}) — ${decision.prompt}`)
    .join('\n')}\n`;
}

function renderMarkdown(summary) {
  const primaryRows = summary.rows.filter((row) => row.classification === 'primary');
  const spokeRows = summary.rows.filter((row) => row.classification === 'spoke');
  const supportingRows = summary.rows.filter((row) => row.classification === 'supporting');
  const legacyRows = summary.rows.filter((row) => row.classification === 'legacy');
  const sandboxRows = summary.rows.filter((row) => row.classification === 'sandbox');

  return `# Living Ecosystem Canon Registry

> Generated from \`config/living-ecosystem-canon.json\`. This is the machine-readable phase-1 map for hub/spoke/support/archive ownership.

## Summary

- Generated at: **${summary.generatedAt}**
- Systems: **${summary.counts.systems}**
- Surfaces: **${summary.counts.surfaces}**
- Primary assets: **${primaryRows.length}**
- Spokes: **${spokeRows.length}**
- Supporting assets: **${supportingRows.length}**
- Legacy assets: **${legacyRows.length}**
- Sandbox assets: **${sandboxRows.length}**
- Open human decisions: **${summary.counts.openHumanDecisions}**

## Primary

${renderTable(primaryRows)}
## Spokes

${renderTable(spokeRows)}
## Supporting

${renderTable(supportingRows)}
## Legacy

${renderTable(legacyRows)}
## Sandbox

${renderTable(sandboxRows)}
## Ownership Rules

${renderOwnershipRules(summary.ownershipRules)}
## Human Decisions Still Open

${renderHumanDecisions(summary.humanDecisions)}
`;
}

async function main() {
  const canon = await readJson(CANON_PATH);
  const rows = buildRows(canon);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourcePath: CANON_PATH,
    counts: {
      systems: Object.keys(canon.systems || {}).length,
      surfaces: Object.keys(canon.surfaces || {}).length,
      openHumanDecisions: (canon.human_decisions || []).filter(
        (decision) => decision.status !== 'resolved'
      ).length,
    },
    ownershipRules: canon.ownership_rules || {},
    humanDecisions: canon.human_decisions || [],
    rows,
  };

  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD_PATH, `${renderMarkdown(summary)}\n`);

  console.log(
    `wrote living ecosystem canon report: ${summary.counts.systems} systems, ${summary.counts.surfaces} surfaces, ${summary.counts.openHumanDecisions} open human decisions`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
