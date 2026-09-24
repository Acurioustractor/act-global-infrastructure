# Archived 2026-09-25: the old codebase lists

Replaced by `config/codebases.json`, loaded and guarded by `@act/projects` (`loadAllCodebases`).
Check with `pnpm codebases:check` (CI) and `pnpm codebases:live` (compares with GitHub and the
local checkouts; also Vercel when VERCEL_TOKEN is set).

| File | Was | Why |
|---|---|---|
| act-core-repos.json | config/ | Stale since 2026-01 (wrong path for this repo, wrong Harvest repo). No code read it |
| CODEBASES.md | config/ | Stale since 2026-01 ("7 codebases", Goods on Netlify). Docs only |
| verify-repo-connections.mjs | scripts/ | Superseded by `codebases:live`, which checks the same things against the new list |
| repo-connections-latest.json | config/ | Output of the script above, last written 2026-04-20 |
| repo-connections-latest.md | wiki/output/ | Same output, markdown |

Still live: `config/repos.json`. act-regenerative-studio's own copy of
`scripts/lib/wiki-flagship-project-packs.mjs` reads it from this repo during wiki sync, so it stays
until that copy reads `config/codebases.json`. Then archive it here too.

Restore one: `git mv config/_archive/2026-09-25-codebases/<file> <was>/`
