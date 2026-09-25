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
| repos.json | config/ | Last reader was act-regenerative-studio's copy of the flagship module; it reads codebases.json since act-regenerative-studio#125. Archived the same day |

Restore one: `git mv config/_archive/2026-09-25-codebases/<file> <was>/`
