import path from 'node:path';

import {
  resolveCanonicalWikiRoot,
  writeFlagshipProjectPackOutputs,
} from './lib/wiki-flagship-project-packs.mjs';

async function main() {
  const wikiRoot = await resolveCanonicalWikiRoot(process.cwd());

  if (!wikiRoot) {
    throw new Error('Could not resolve canonical wiki root for flagship project packs.');
  }

  const jsonOutputPath = path.join(wikiRoot, 'output', 'flagship-project-packs.json');
  const markdownOutputPath = path.join(wikiRoot, 'output', 'flagship-project-packs.md');

  const snapshot = await writeFlagshipProjectPackOutputs({
    wikiRoot,
    jsonOutputPath,
    markdownOutputPath,
  });

  console.log(
    `wrote ${snapshot.packCount} flagship project packs to ${jsonOutputPath}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
