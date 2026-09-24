import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REPOS_CONFIG_PATH = path.join(ROOT, 'config', 'repos.json');
const PROJECT_CODES_PATH = path.join(ROOT, 'config', 'project-codes.json');
const JSON_OUTPUT_PATH = path.join(ROOT, 'config', 'repo-connections-latest.json');
const MARKDOWN_OUTPUT_PATH = path.join(ROOT, 'wiki', 'output', 'repo-connections-latest.md');

function normalizeRemoteSlug(value) {
  if (!value) return null;

  return String(value)
    .trim()
    .replace(/^git@github\.com:/i, '')
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function githubUrlFromSlug(slug) {
  return slug ? `https://github.com/${slug}` : null;
}

function safeGitRemote(repoPath, remoteName) {
  try {
    return execFileSync('git', ['-C', repoPath, 'remote', 'get-url', remoteName], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function safeGitRemotes(repoPath) {
  try {
    const raw = execFileSync('git', ['-C', repoPath, 'remote'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return raw
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const url = safeGitRemote(repoPath, name);
        return {
          name,
          url,
          slug: normalizeRemoteSlug(url),
        };
      })
      .filter((remote) => remote.url);
  } catch {
    return [];
  }
}

function configuredGithubSlugs(repo) {
  const slugs = new Set();

  const directSlug = normalizeRemoteSlug(repo.github || repo.github_url);
  if (directSlug) slugs.add(directSlug);

  for (const remote of Array.isArray(repo.github_remotes) ? repo.github_remotes : []) {
    const slug = normalizeRemoteSlug(remote.github || remote.github_url);
    if (slug) slugs.add(slug);
  }

  return Array.from(slugs);
}

function findProjectCodesByRepo(projectsByCode, githubSlug) {
  return Object.entries(projectsByCode)
    .filter(([, project]) => normalizeRemoteSlug(project.github_repo) === githubSlug)
    .map(([code, project]) => ({
      code,
      name: project.name || null,
      canonicalSlug: project.canonical_slug || null,
      productionUrl: project.production_url || null,
    }));
}

function dedupeLinkedProjects(projects) {
  const seen = new Set();
  return projects.filter((project) => {
    const key = `${project.code}::${project.canonicalSlug || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderMarkdownReport(snapshot) {
  return [
    '# ACT Repo Connections',
    '',
    '> Local repo, GitHub remote, and canonical project-code alignment for the key ACT codebases.',
    '',
    `- Generated: **${snapshot.generatedAt}**`,
    snapshot.githubProject?.org ? `- GitHub org: **${snapshot.githubProject.org}**` : null,
    snapshot.githubProject?.url
      ? `- GitHub project board: [${snapshot.githubProject.name || snapshot.githubProject.url}](${snapshot.githubProject.url})`
      : null,
    `- Repo count: **${snapshot.repoCount}**`,
    `- Path exists: **${snapshot.summary.pathExists}/${snapshot.repoCount}**`,
    `- Git repos: **${snapshot.summary.gitRepoExists}/${snapshot.repoCount}**`,
    `- Origin matches configured GitHub remote: **${snapshot.summary.originMatches}/${snapshot.repoCount}**`,
    `- Any configured GitHub remote found locally: **${snapshot.summary.anyRemoteMatches}/${snapshot.repoCount}**`,
    '',
    '| Repo | Local Path | Configured GitHub | Git Remotes | Origin Match | Any Match | Linked Project Codes |',
    '|------|------------|-------------------|-------------|--------------|-----------|----------------------|',
    ...snapshot.repos.map((repo) => {
      const linkedCodes = repo.linkedProjects.length
        ? repo.linkedProjects
            .map((project) => `\`${project.code}\`${project.canonicalSlug ? ` (${project.canonicalSlug})` : ''}`)
            .join(', ')
        : '—';

      const configuredGitHub = repo.configuredGitHubSlugs.length
        ? repo.configuredGitHubSlugs
            .map((slug) => `[${slug}](${githubUrlFromSlug(slug)})`)
            .join(', ')
        : '—';

      const gitRemotes = repo.gitRemotes.length
        ? repo.gitRemotes
            .map((remote) => `\`${remote.name}\`: ${remote.slug ? `[${remote.slug}](${githubUrlFromSlug(remote.slug)})` : '—'}`)
            .join('<br>')
        : '—';

      return [
        repo.name,
        `\`${repo.localPath}\``,
        configuredGitHub,
        gitRemotes,
        repo.originMatches ? 'yes' : 'no',
        repo.anyRemoteMatches ? 'yes' : 'no',
        linkedCodes,
      ].join(' | ');
    }),
    '',
  ].filter(Boolean).join('\n');
}

async function main() {
  const [reposRaw, projectCodesRaw] = await Promise.all([
    fs.readFile(REPOS_CONFIG_PATH, 'utf8'),
    fs.readFile(PROJECT_CODES_PATH, 'utf8'),
  ]);

  const reposConfig = JSON.parse(reposRaw);
  const projectCodes = JSON.parse(projectCodesRaw);
  const repos = Array.isArray(reposConfig.projects) ? reposConfig.projects : [];
  const projectsByCode = projectCodes.projects || {};

  const rows = repos.map((repo) => {
    const localPath = repo.path || null;
    const configuredGitHubSlugs = configuredGithubSlugs(repo);
    const gitRemotes = localPath ? safeGitRemotes(localPath) : [];
    const originRemote = gitRemotes.find((remote) => remote.name === 'origin') || null;
    const originSlug = originRemote?.slug || null;
    const pathExists = Boolean(localPath && existsSync(localPath));
    const gitRepoExists = Boolean(localPath && existsSync(path.join(localPath, '.git')));
    const originMatches = Boolean(originSlug && configuredGitHubSlugs.includes(originSlug));
    const anyRemoteMatches = gitRemotes.some((remote) =>
      remote.slug ? configuredGitHubSlugs.includes(remote.slug) : false
    );
    const linkedProjectSlugs = Array.from(
      new Set(
        configuredGitHubSlugs.concat(
          gitRemotes.map((remote) => remote.slug).filter(Boolean)
        )
      )
    );

    return {
      name: repo.name || null,
      localPath,
      pathExists,
      gitRepoExists,
      configuredGitHubSlugs,
      gitRemotes,
      originRemote: originRemote?.url || null,
      originSlug,
      originMatches,
      anyRemoteMatches,
      deployment: repo.deployment || null,
      linkedProjects: dedupeLinkedProjects(
        linkedProjectSlugs.flatMap((slug) =>
          findProjectCodesByRepo(projectsByCode, slug)
        )
      ),
    };
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    githubProject: reposConfig.github_project || null,
    repoCount: rows.length,
    summary: {
      pathExists: rows.filter((row) => row.pathExists).length,
      gitRepoExists: rows.filter((row) => row.gitRepoExists).length,
      originMatches: rows.filter((row) => row.originMatches).length,
      anyRemoteMatches: rows.filter((row) => row.anyRemoteMatches).length,
    },
    repos: rows,
  };

  await fs.mkdir(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  await fs.mkdir(path.dirname(MARKDOWN_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  await fs.writeFile(MARKDOWN_OUTPUT_PATH, `${renderMarkdownReport(snapshot)}\n`);

  console.log(`wrote repo connection report to ${JSON_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
