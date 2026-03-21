#!/bin/bash
# Deploy notion-workers to Notion's remote runtime.
#
# Problem: ntn runs `npm install` + `npm run build` remotely, but:
#   1. npm can't resolve `workspace:*` deps
#   2. tsc/esbuild can't find @act/intel (not published to npm)
#   3. ntn expects `dist/` to exist after build (moves package.json into it)
#
# Solution: build locally (esbuild inlines @act/intel), copy the bundle
# to the root as _bundle.js, and make the remote build script move it
# into dist/. Restore package.json after deploy.

set -euo pipefail
cd "$(dirname "$0")"

echo "→ Building locally..."
pnpm run build

echo "→ Copying bundle for remote deploy..."
cp dist/index.js _bundle.js

echo "→ Patching package.json for remote deploy..."
cp package.json package.json.bak
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
  // Remove workspace deps
  for (const section of ['dependencies','devDependencies']) {
    if (pkg[section]) {
      for (const [k,v] of Object.entries(pkg[section])) {
        if (typeof v === 'string' && v.startsWith('workspace:')) {
          delete pkg[section][k];
        }
      }
    }
  }
  // Remote build: just move pre-built bundle into dist/
  pkg.scripts.build = 'mkdir -p dist && mv _bundle.js dist/index.js';
  require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "→ Deploying to Notion..."
ntn workers deploy || {
  echo "→ Deploy failed, restoring package.json"
  mv package.json.bak package.json
  rm -f _bundle.js
  exit 1
}

echo "→ Restoring package.json..."
mv package.json.bak package.json
rm -f _bundle.js

echo "✓ Deployed successfully!"
