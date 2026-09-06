import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Every markdown file under wiki/projects and wiki/art, keyed by file slug. */
export function indexWiki(repoRoot) {
  const index = new Map();
  for (const dir of ['wiki/projects', 'wiki/art']) {
    walk(join(repoRoot, dir), (file) => {
      if (!file.endsWith('.md')) return;
      const slug = file.split('/').pop().replace(/\.md$/, '');
      if (slug === 'README' || slug.startsWith('_')) return;
      const rel = relative(repoRoot, file);
      if (!index.has(slug)) index.set(slug, []);
      index.get(slug).push(rel);
    });
  }
  return index;
}

function walk(dir, visit) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, visit);
    else visit(full);
  }
}
