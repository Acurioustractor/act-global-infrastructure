import fs from 'node:fs/promises';
import path from 'node:path';

export const FLAGSHIP_PROJECT_SLUGS = [
  'justicehub',
  'goods-on-country',
  'the-harvest',
  'empathy-ledger',
  'black-cockatoo-valley',
];

const FLAGSHIP_RELATIVE_PATHS = {
  justicehub: 'projects/justicehub/justicehub.md',
  'goods-on-country': 'projects/goods-on-country.md',
  'the-harvest': 'projects/the-harvest/the-harvest.md',
  'empathy-ledger': 'projects/empathy-ledger.md',
  'black-cockatoo-valley': 'projects/act-farm/black-cockatoo-valley.md',
};

const FLAGSHIP_IMPLEMENTATION_REPOS = {
  justicehub: {
    primary: {
      name: 'JusticeHub',
      role: 'Primary public product surface and evidence platform codebase.',
    },
    supporting: [
      {
        name: 'GrantScope',
        role: 'CivicGraph, procurement, and capital-intelligence substrate feeding JusticeHub discovery and scoring.',
      },
    ],
  },
  'goods-on-country': {
    primary: {
      name: 'Goods',
      role: 'Asset register, delivery workflow, and operational product infrastructure.',
    },
    supporting: [
      {
        name: 'GrantScope',
        role: 'Goods Workspace procurement and capital discovery layer.',
      },
      {
        name: 'Palm Island Repository',
        role: 'Community deployment, reporting, and media archive connected to Palm Island delivery proof.',
      },
    ],
  },
  'the-harvest': {
    primary: {
      name: 'The Harvest',
      role: 'Primary public community hub surface and local program website.',
    },
    supporting: [
      {
        name: 'ACT Farm',
        role: 'Sibling place and land-practice surface connected to Harvest and Black Cockatoo Valley.',
      },
    ],
  },
  'empathy-ledger': {
    primary: {
      name: 'Empathy Ledger',
      role: 'Story, media, consent, and editorial platform.',
    },
    supporting: [],
  },
  'black-cockatoo-valley': {
    primary: {
      name: 'ACT Farm',
      role: 'Primary place, land practice, and Black Cockatoo Valley public surface.',
    },
    supporting: [],
  },
};

const PACK_SECTION_HEADINGS = [
  'What It Is',
  'Overview',
  'Cluster Context',
  'System Position',
  'Key People',
  'Primary Community Implementations',
  'The Central Role',
  'Scale (April 2026)',
  'Scale to Date',
  'The Problem It Solves',
  'Products',
  'Community Partnerships',
  'Key Details',
  "What's On Site",
  'Land Practice Philosophy',
  'Activities',
  'Current Needs',
  'Content Hub',
  'Key Source Bridges',
  'LCAA Connection',
  'LCAA Phase',
];

function normalizeWhitespace(value) {
  return value.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripMarkdown(value) {
  if (!value) return null;

  return normalizeWhitespace(
    value
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^>\s*/gm, '')
  );
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeMetadataValue(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .trim();

  return normalized || null;
}

function normalizePathValue(value) {
  const normalized = normalizeMetadataValue(value);
  if (!normalized) return null;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function relativePathToWikiPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');
  const parts = normalized.split('/');
  const stem = parts[parts.length - 1];
  const parent = parts[parts.length - 2];

  if (parent && stem === parent) {
    return parts.slice(0, -1).join('/');
  }

  return normalized;
}

function normalizeRepoName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

async function loadRepoCatalog(wikiRoot) {
  const configPath = path.resolve(wikiRoot, '..', 'config', 'repos.json');

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    return [];
  }
}

function buildImplementationRepoEntry(repo, role) {
  if (!repo) return null;

  const github = normalizeMetadataValue(repo.github);
  const githubUrl =
    normalizeMetadataValue(repo.github_url) ||
    (github ? `https://github.com/${github}` : null);

  return {
    name: normalizeMetadataValue(repo.name),
    localPath: normalizeMetadataValue(repo.path),
    github,
    githubUrl,
    description: normalizeMetadataValue(repo.description),
    stack: normalizeMetadataValue(repo.stack),
    deployment: normalizeMetadataValue(repo.deployment),
    role: normalizeMetadataValue(role),
  };
}

function buildImplementationData(slug, repoCatalog) {
  const repoMap = FLAGSHIP_IMPLEMENTATION_REPOS[slug];
  if (!repoMap) {
    return {
      primaryRepo: null,
      supportingRepos: [],
    };
  }

  const repoByName = new Map(
    repoCatalog.map((repo) => [normalizeRepoName(repo.name), repo])
  );

  const primaryRepo = buildImplementationRepoEntry(
    repoByName.get(normalizeRepoName(repoMap.primary?.name)),
    repoMap.primary?.role || null
  );

  const supportingRepos = (repoMap.supporting || [])
    .map((entry) =>
      buildImplementationRepoEntry(
        repoByName.get(normalizeRepoName(entry.name)),
        entry.role || null
      )
    )
    .filter(Boolean);

  return {
    primaryRepo,
    supportingRepos,
  };
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const metadataMatch = line.match(/^([A-Za-z0-9_]+):\s*(.+?)\s*$/);
    if (!metadataMatch) continue;

    const [, key, rawValue] = metadataMatch;
    frontmatter[key] = normalizeMetadataValue(rawValue);
  }

  return {
    frontmatter,
    content: raw.slice(match[0].length),
  };
}

function parseTitle(content, fallback) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() || fallback;
}

function parseSummary(content) {
  const summaryMatch = content.match(/^>\s+(.+)$/m);
  return summaryMatch?.[1]?.trim() || null;
}

function extractSection(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^##\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`,
    'm'
  );
  const match = content.match(pattern);
  return match?.[1]?.trim() || null;
}

function extractOverview(content) {
  for (const heading of ['What It Is', 'Overview', 'Purpose', 'Identity']) {
    const section = extractSection(content, heading);
    if (section) {
      return stripMarkdown(section);
    }
  }

  return null;
}

function parseWikiLinkTarget(target) {
  if (!target) return { wikiPath: null, stem: null };

  const normalized = target.replace(/^\.\.\//g, '').replace(/\.md$/i, '');
  const stem = normalized.split('/').pop() || normalized;
  return {
    wikiPath: normalized,
    stem,
  };
}

function parseKeyPeople(section) {
  if (!section) return [];

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const wikiMatch = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      const [, target = '', label = ''] = wikiMatch || [];
      const role = stripMarkdown(line.replace(/^-+\s*/, '').replace(/\[\[[^\]]+\]\]/, '').replace(/^—\s*/, '').replace(/^-\s*/, ''));
      const parsedTarget = parseWikiLinkTarget(target);

      return {
        title: label || parsedTarget.stem || stripMarkdown(line.replace(/^-+\s*/, '')) || 'Unknown',
        role: role || null,
        stem: parsedTarget.stem,
        wikiPath: parsedTarget.wikiPath,
      };
    });
}

function resolveMarkdownHref(relativePath, href) {
  if (!href) return null;
  if (/^(https?:)?\/\//i.test(href)) return null;

  const baseDir = path.posix.dirname(relativePath.replace(/\\/g, '/'));
  return path.posix.normalize(path.posix.join(baseDir, href)).replace(/^\.\//, '');
}

function parseSourceBridges(relativePath, section) {
  if (!section) return [];

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const markdownLink = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (!markdownLink) return null;

      const [, title, href] = markdownLink;
      const resolvedPath = resolveMarkdownHref(relativePath, href);
      if (!resolvedPath) return null;

      const wikiPath = relativePathToWikiPath(resolvedPath);
      const stem = wikiPath.split('/').pop() || wikiPath;

      return {
        title: stripMarkdown(title) || title.trim(),
        href,
        relativePath: resolvedPath,
        wikiPath,
        stem,
      };
    })
    .filter(Boolean);
}

function buildPackSections(content) {
  return PACK_SECTION_HEADINGS.map((heading) => {
    const body = extractSection(content, heading);
    if (!body) return null;

    return {
      id: slugify(heading),
      title: heading,
      body: stripMarkdown(body),
    };
  }).filter(Boolean);
}

function renderMarkdownReport(snapshot) {
  return [
    '# Flagship Project Packs',
    '',
    '> Machine-readable flagship packs compiled from canonical wiki pages for direct website and Empathy Ledger use.',
    '',
    `- Generated: **${snapshot.generatedAt}**`,
    `- Source root: \`${snapshot.sourceRoot}\``,
    `- Pack count: **${snapshot.packCount}**`,
    '',
    ...snapshot.packs.flatMap((pack) => [
      `## ${pack.title}`,
      '',
      `- Slug: \`${pack.slug}\``,
      `- Code: \`${pack.canonicalCode || 'NO-CODE'}\``,
      `- Website path: \`${pack.downstream.website.primaryPath || 'none'}\``,
      `- EL key: \`${pack.downstream.empathyLedger.projectKey || 'none'}\``,
      `- Primary repo: \`${pack.implementation.primaryRepo?.name || 'none'}\``,
      `- Supporting repos: **${pack.implementation.supportingRepos.length}**`,
      `- Key people: **${pack.keyPeople.length}**`,
      `- Source bridges: **${pack.sourceBridges.length}**`,
      '',
      pack.summary ? `${pack.summary}` : '',
      '',
    ]),
  ]
    .filter(Boolean)
    .join('\n');
}

export async function resolveCanonicalWikiRoot(cwd = process.cwd()) {
  const candidates = [
    process.env.ACT_CANONICAL_WIKI_ROOT,
    path.resolve(cwd, 'wiki'),
    path.resolve(cwd, '../act-global-infrastructure/wiki'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export async function buildFlagshipProjectPackSnapshot({ wikiRoot }) {
  const repoCatalog = await loadRepoCatalog(wikiRoot);
  const packs = await Promise.all(
    FLAGSHIP_PROJECT_SLUGS.map(async (slug) => {
      const relativePath = FLAGSHIP_RELATIVE_PATHS[slug];
      const absolutePath = path.join(wikiRoot, relativePath);
      const [rawContent, stats] = await Promise.all([
        fs.readFile(absolutePath, 'utf8'),
        fs.stat(absolutePath),
      ]);

      const { frontmatter, content } = parseFrontmatter(rawContent);
      const title = parseTitle(content, slug);
      const summary = stripMarkdown(parseSummary(content));
      const overview = extractOverview(content);
      const canonicalSlug = normalizeMetadataValue(frontmatter.canonical_slug) || slug;
      const websiteSlug = normalizeMetadataValue(frontmatter.website_slug) || canonicalSlug;
      const websitePath = normalizePathValue(frontmatter.website_path) || `/projects/${websiteSlug}`;
      const projectPagePath = `/projects/${websiteSlug}`;
      const implementation = buildImplementationData(slug, repoCatalog);

      return {
        slug,
        title,
        status: normalizeMetadataValue(frontmatter.status),
        canonicalSlug,
        canonicalCode: normalizeMetadataValue(frontmatter.canonical_code),
        entityType: normalizeMetadataValue(frontmatter.entity_type),
        taggingMode: normalizeMetadataValue(frontmatter.tagging_mode),
        cluster: normalizeMetadataValue(frontmatter.cluster),
        parentProject: normalizeMetadataValue(frontmatter.parent_project),
        empathyLedgerKey:
          normalizeMetadataValue(frontmatter.empathy_ledger_key) || canonicalSlug,
        websiteSlug,
        summary,
        overview,
        whatItIs: stripMarkdown(extractSection(content, 'What It Is')),
        clusterContext: stripMarkdown(extractSection(content, 'Cluster Context')),
        systemPosition: stripMarkdown(extractSection(content, 'System Position')),
        sourcePage: {
          relativePath,
          wikiPath: relativePathToWikiPath(relativePath),
          modifiedAt: stats.mtime.toISOString(),
        },
        downstream: {
          website: {
            primaryPath: websitePath,
            projectPath: projectPagePath,
          },
          empathyLedger: {
            projectKey:
              normalizeMetadataValue(frontmatter.empathy_ledger_key) || canonicalSlug,
          },
        },
        implementation,
        keyPeople: parseKeyPeople(extractSection(content, 'Key People')),
        sourceBridges: parseSourceBridges(
          relativePath,
          extractSection(content, 'Key Source Bridges')
        ),
        packSections: buildPackSections(content),
      };
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: wikiRoot,
    packCount: packs.length,
    packs,
  };
}

export async function writeFlagshipProjectPackOutputs({
  wikiRoot,
  jsonOutputPath,
  markdownOutputPath,
}) {
  const snapshot = await buildFlagshipProjectPackSnapshot({ wikiRoot });

  await fs.writeFile(jsonOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  if (markdownOutputPath) {
    await fs.writeFile(markdownOutputPath, `${renderMarkdownReport(snapshot)}\n`);
  }

  return snapshot;
}
