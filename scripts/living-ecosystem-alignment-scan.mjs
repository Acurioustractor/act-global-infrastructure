import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CANON_PATH = path.join(ROOT, 'config', 'living-ecosystem-canon.json');
const PROJECT_CODES_PATH = path.join(ROOT, 'config', 'project-codes.json');
const OUTPUT_JSON_PATH = path.join(ROOT, 'wiki', 'output', 'living-ecosystem-alignment-latest.json');
const OUTPUT_MD_PATH = path.join(ROOT, 'wiki', 'output', 'living-ecosystem-alignment-latest.md');

const ROUTE_EXPECTATIONS = {
  'act-regenerative-studio': [
    { path: '/', kind: 'text', marker: 'A Curious Tractor' },
    { path: '/projects', kind: 'text', marker: 'What ACT does in public' },
    { path: '/ecosystem', kind: 'text', marker: 'public surfaces' },
    { path: '/wiki', kind: 'text', marker: 'Source packets' },
    { path: '/wiki/source-packets', kind: 'text', marker: 'packet contract' },
    { path: '/wiki/source-bridges', kind: 'text', marker: 'Bridge notes' },
    { path: '/people', kind: 'text', marker: 'people behind the work' },
    { path: '/media', kind: 'text', marker: 'Field documentation' },
  ],
  'empathy-ledger': [
    { path: '/', kind: 'status' },
    {
      path: '/api/v1/content-hub/source-packets?project=empathy-ledger',
      kind: 'json',
      predicate: (payload) =>
        payload?.project_slug === 'empathy-ledger' ||
        payload?.canonical_entity?.canonical_slug === 'empathy-ledger',
      description: 'packet JSON for empathy-ledger',
    },
  ],
  justicehub: [{ path: '/', kind: 'status' }],
  'goods-on-country': [{ path: '/', kind: 'status' }],
  'black-cockatoo-valley': [{ path: '/', kind: 'status' }],
  'the-harvest': [{ path: '/', kind: 'status' }],
};

const GENERATED_INPUT_FILES = {
  'act-regenerative-studio': {
    'wiki pages snapshot': 'src/data/wiki-pages.generated.json',
    'wiki projects snapshot': 'src/data/wiki-projects.generated.json',
    'flagship project packs': 'src/data/wiki-flagship-project-packs.generated.json',
    'Empathy Ledger featured media': 'src/data/empathy-ledger-featured.generated.json',
    'Empathy Ledger editorial snapshot': 'src/data/empathy-ledger-editorial.generated.json',
    'Empathy Ledger source packets': 'src/data/empathy-ledger-source-packets.generated.json',
    'living ecosystem canon snapshot': 'src/data/living-ecosystem-canon.generated.json',
  },
  'empathy-ledger': {
    'flagship project packs': 'src/data/editorial/flagship-project-packs.generated.json',
  },
};

function normalizeGithubSlug(value) {
  if (!value) return null;

  return String(value)
    .trim()
    .replace(/^git@github\.com:/i, '')
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function normalizeHost(value) {
  if (!value) return null;

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readFrontmatterCanonicalSlug(notePath) {
  if (!(await pathExists(notePath))) {
    return { exists: false, canonicalSlug: null };
  }

  const raw = await fs.readFile(notePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { exists: true, canonicalSlug: null };
  }

  const slugMatch = match[1].match(/^canonical_slug:\s*(.+)$/m);
  return {
    exists: true,
    canonicalSlug: slugMatch ? slugMatch[1].trim().replace(/^['"]|['"]$/g, '') : null,
  };
}

function safeGitOriginSlug(repoPath) {
  if (!repoPath) return null;

  try {
    const remote = execFileSync('git', ['-C', repoPath, 'remote', 'get-url', 'origin'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return normalizeGithubSlug(remote);
  } catch {
    return null;
  }
}

function findProjectCodeMatches(surfaceId, noteSlug, originSlug, siteUrl, projectCodes) {
  const candidates = [];
  const siteHost = normalizeHost(siteUrl);

  for (const [code, project] of Object.entries(projectCodes.projects || {})) {
    const reasons = [];
    const projectSlug = project.canonical_slug || null;
    const aliases = Array.isArray(project.slug_aliases) ? project.slug_aliases : [];
    const githubSlug = normalizeGithubSlug(project.github_repo);
    const projectHost = normalizeHost(project.production_url);

    if (projectSlug && [surfaceId, noteSlug].filter(Boolean).includes(projectSlug)) {
      reasons.push('canonical_slug');
    }
    if (aliases.some((alias) => [surfaceId, noteSlug].filter(Boolean).includes(alias))) {
      reasons.push('slug_alias');
    }
    if (githubSlug && originSlug && githubSlug === originSlug) {
      reasons.push('github_repo');
    }
    if (projectHost && siteHost && projectHost === siteHost) {
      reasons.push('production_url');
    }

    if (reasons.length > 0) {
      candidates.push({
        code,
        name: project.name || null,
        canonicalSlug: projectSlug,
        githubRepo: project.github_repo || null,
        productionUrl: project.production_url || null,
        reasons,
      });
    }
  }

  return uniqueBy(candidates, (candidate) => candidate.code);
}

async function fetchRoute(url, kind) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: kind === 'json' ? { accept: 'application/json' } : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const body =
    kind === 'json' || contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
    contentType,
    body,
  };
}

function buildRouteExpectations(surfaceId) {
  return ROUTE_EXPECTATIONS[surfaceId] || [];
}

function buildGeneratedInputs(surfaceId, repoPath) {
  const mapping = GENERATED_INPUT_FILES[surfaceId];
  if (!mapping || !repoPath) return [];

  return Object.entries(mapping).map(([label, relativePath]) => ({
    label,
    relativePath,
    absolutePath: path.join(repoPath, relativePath),
  }));
}

function pushFinding(findings, status, subject, message, data = null) {
  findings.push({ status, subject, message, data });
}

function summarizeFindings(findings) {
  return {
    pass: findings.filter((item) => item.status === 'pass').length,
    warn: findings.filter((item) => item.status === 'warn').length,
    fail: findings.filter((item) => item.status === 'fail').length,
  };
}

function renderMarkdown(report) {
  const rows = report.surfaces.map((surface) => {
    const projectCodes = surface.projectCodeMatches.length
      ? surface.projectCodeMatches
          .map((match) => `\`${match.code}\`${match.canonicalSlug ? ` (${match.canonicalSlug})` : ''}`)
          .join(', ')
      : '—';

    return `| ${surface.displayName} | \`${surface.id}\` | ${surface.noteInfo.canonicalSlug || '—'} | ${
      surface.repoInfo.originSlug ? `\`${surface.repoInfo.originSlug}\`` : '—'
    } | ${surface.site.url || '—'} | ${surface.summary.pass}/${surface.summary.warn}/${surface.summary.fail} | ${projectCodes} |`;
  });

  const failureLines = report.findings
    .filter((item) => item.status === 'fail')
    .map((item) => `- **${item.subject}** — ${item.message}`);
  const warningLines = report.findings
    .filter((item) => item.status === 'warn')
    .map((item) => `- **${item.subject}** — ${item.message}`);

  return `# Living Ecosystem Alignment Scan

> Generated by \`scripts/living-ecosystem-alignment-scan.mjs\`. Cross-checks canon, codebase links, generated inputs, public URLs, and key live routes so the system can show drift before content and design diverge.

## Summary

- Generated at: **${report.generatedAt}**
- Surfaces scanned: **${report.summary.surfaceCount}**
- Routes scanned: **${report.summary.routeCount}**
- Passes: **${report.summary.pass}**
- Warnings: **${report.summary.warn}**
- Fails: **${report.summary.fail}**

## Surface Matrix

| Surface | ID | Canon slug | Repo origin | Site URL | Pass/Warn/Fail | Project-code matches |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Fails

${failureLines.length ? failureLines.join('\n') : '_None._'}

## Warnings

${warningLines.length ? warningLines.join('\n') : '_None._'}

## Route Checks

${report.surfaces
  .map((surface) => {
    if (!surface.routeChecks.length) {
      return `### ${surface.displayName}\n\n- No route checks configured.\n`;
    }

    return `### ${surface.displayName}\n\n${surface.routeChecks
      .map(
        (route) =>
          `- \`${route.path}\` — ${route.status.toUpperCase()} (${route.httpStatus || 'n/a'})${route.message ? ` — ${route.message}` : ''}`
      )
      .join('\n')}\n`;
  })
  .join('\n')}
`;
}

async function scanSurface(surfaceId, surface, projectCodes) {
  const findings = [];
  const repoPath = surface.repo_path || null;
  const notePath = surface.canonical_note_path
    ? path.resolve(ROOT, surface.canonical_note_path)
    : null;

  const noteInfo = await readFrontmatterCanonicalSlug(notePath);
  if (!notePath) {
    pushFinding(findings, 'fail', surfaceId, 'missing canonical_note_path in canon');
  } else if (!noteInfo.exists) {
    pushFinding(findings, 'fail', surfaceId, `canonical note missing at ${surface.canonical_note_path}`);
  } else if (!noteInfo.canonicalSlug) {
    pushFinding(findings, 'warn', surfaceId, 'canonical note exists but has no canonical_slug frontmatter');
  } else {
    pushFinding(findings, 'pass', surfaceId, `canonical note slug is ${noteInfo.canonicalSlug}`);
  }

  const repoExists = repoPath ? await pathExists(repoPath) : false;
  const originSlug = repoExists ? safeGitOriginSlug(repoPath) : null;
  if (!repoPath) {
    pushFinding(findings, 'warn', surfaceId, 'no repo_path configured in canon');
  } else if (!repoExists) {
    pushFinding(findings, 'fail', surfaceId, `repo path missing at ${repoPath}`);
  } else if (!originSlug) {
    pushFinding(findings, 'warn', surfaceId, 'repo exists but git origin could not be resolved');
  } else {
    pushFinding(findings, 'pass', surfaceId, `repo origin is ${originSlug}`);
  }

  const projectCodeMatches = findProjectCodeMatches(
    surfaceId,
    noteInfo.canonicalSlug,
    originSlug,
    surface.site_url || null,
    projectCodes
  );

  if (projectCodeMatches.length === 0) {
    pushFinding(findings, 'warn', surfaceId, 'no project-code match found from canon slug, repo origin, or site URL');
  } else if (projectCodeMatches.length > 1) {
    pushFinding(
      findings,
      'warn',
      surfaceId,
      `multiple project-code matches: ${projectCodeMatches.map((match) => match.code).join(', ')}`
    );
  } else {
    pushFinding(findings, 'pass', surfaceId, `project code aligned to ${projectCodeMatches[0].code}`);
  }

  const primaryProjectCode = projectCodeMatches[0] || null;
  if (!surface.site_url && primaryProjectCode?.productionUrl) {
    pushFinding(
      findings,
      'warn',
      surfaceId,
      `canon is missing site_url; project codes suggest ${primaryProjectCode.productionUrl}`
    );
  }

  if (
    surface.site_url &&
    primaryProjectCode?.productionUrl &&
    normalizeHost(surface.site_url) !== normalizeHost(primaryProjectCode.productionUrl)
  ) {
    pushFinding(
      findings,
      'warn',
      surfaceId,
      `site_url host ${normalizeHost(surface.site_url)} differs from project-code production_url host ${normalizeHost(primaryProjectCode.productionUrl)}`
    );
  }

  const generatedInputs = [];
  for (const input of buildGeneratedInputs(surfaceId, repoPath)) {
    const exists = await pathExists(input.absolutePath);
    generatedInputs.push({ ...input, exists });
    pushFinding(
      findings,
      exists ? 'pass' : 'warn',
      `${surfaceId}:${input.label}`,
      exists ? `generated input present at ${input.relativePath}` : `generated input missing at ${input.relativePath}`
    );
  }

  const resolvedSiteUrl = surface.site_url || primaryProjectCode?.productionUrl || null;
  const routeChecks = [];

  if (!resolvedSiteUrl) {
    pushFinding(findings, 'warn', surfaceId, 'no live site URL available for scan');
  } else {
    try {
      const root = await fetchRoute(resolvedSiteUrl, 'text');
      routeChecks.push({
        path: '/',
        status: root.ok ? 'pass' : 'fail',
        httpStatus: root.status,
        message: root.ok ? 'site answered' : 'site did not return 2xx',
      });
      pushFinding(
        findings,
        root.ok ? 'pass' : 'fail',
        `${surfaceId}:/`,
        root.ok ? `site answered at ${resolvedSiteUrl}` : `site returned ${root.status} at ${resolvedSiteUrl}`
      );
    } catch (error) {
      routeChecks.push({
        path: '/',
        status: 'fail',
        httpStatus: null,
        message: String(error.message || error),
      });
      pushFinding(findings, 'fail', `${surfaceId}:/`, `site fetch failed: ${String(error.message || error)}`);
    }

    for (const expectation of buildRouteExpectations(surfaceId)) {
      try {
        const targetUrl = new URL(expectation.path, resolvedSiteUrl).toString();
        const result = await fetchRoute(targetUrl, expectation.kind);

        let status = result.ok ? 'pass' : 'fail';
        let message = result.ok ? 'route answered' : `route returned ${result.status}`;

        if (result.ok && expectation.kind === 'text') {
          const body = typeof result.body === 'string' ? result.body.toLowerCase() : '';
          const marker = expectation.marker.toLowerCase();
          if (!body.includes(marker)) {
            status = 'warn';
            message = `route answered but marker "${expectation.marker}" was not found`;
          } else {
            message = `marker "${expectation.marker}" found`;
          }
        }

        if (result.ok && expectation.kind === 'json') {
          const passed = expectation.predicate ? expectation.predicate(result.body) : Boolean(result.body);
          if (!passed) {
            status = 'warn';
            message = expectation.description
              ? `route answered but ${expectation.description} check failed`
              : 'route answered but JSON predicate failed';
          } else {
            message = expectation.description
              ? `${expectation.description} verified`
              : 'JSON payload verified';
          }
        }

        routeChecks.push({
          path: expectation.path,
          status,
          httpStatus: result.status,
          message,
        });
        pushFinding(findings, status, `${surfaceId}:${expectation.path}`, message);
      } catch (error) {
        routeChecks.push({
          path: expectation.path,
          status: 'fail',
          httpStatus: null,
          message: String(error.message || error),
        });
        pushFinding(
          findings,
          'fail',
          `${surfaceId}:${expectation.path}`,
          `route fetch failed: ${String(error.message || error)}`
        );
      }
    }
  }

  return {
    id: surfaceId,
    displayName: surface.display_name,
    noteInfo,
    repoInfo: {
      repoPath,
      repoExists,
      originSlug,
    },
    projectCodeMatches,
    generatedInputs,
    site: {
      url: resolvedSiteUrl,
      source: surface.site_url ? 'canon.site_url' : primaryProjectCode?.productionUrl ? 'project-codes.production_url' : null,
    },
    routeChecks,
    findings,
    summary: summarizeFindings(findings),
  };
}

async function main() {
  const [canon, projectCodes] = await Promise.all([
    readJson(CANON_PATH),
    readJson(PROJECT_CODES_PATH),
  ]);

  const surfaces = [];
  for (const [surfaceId, surface] of Object.entries(canon.surfaces || {})) {
    surfaces.push(await scanSurface(surfaceId, surface, projectCodes));
  }

  const findings = surfaces.flatMap((surface) => surface.findings);
  const summary = {
    generatedAt: new Date().toISOString(),
    surfaceCount: surfaces.length,
    routeCount: surfaces.reduce((sum, surface) => sum + surface.routeChecks.length, 0),
    ...summarizeFindings(findings),
  };

  const report = {
    generatedAt: summary.generatedAt,
    sourcePath: CANON_PATH,
    surfaces,
    findings,
    summary,
  };

  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD_PATH, `${renderMarkdown(report)}\n`);

  console.log(
    `wrote living ecosystem alignment scan: ${summary.surfaceCount} surfaces, ${summary.routeCount} routes, ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
