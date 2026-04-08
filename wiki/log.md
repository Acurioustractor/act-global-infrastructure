---
title: Wiki Activity Log
status: Append-only
cluster: log
---

# Wiki Activity Log

> Append-only timeline of every operation Tractorpedia has performed. Most-recent at the top.

This file is the second-brain equivalent of a git log for the *content* layer: every ingest, lint, query, viewer regen, and URL audit appends a one-line entry here. Use it to answer "what changed in the wiki and when?" without having to read git diffs.

Format: `- YYYY-MM-DD HH:MM | <op> | <summary> | <files-touched>`

Helper: `node scripts/wiki-log.mjs <op> "<summary>" [files...]`

---

## 2026

- 2026-04-07 05:11 | manual | Session checkpoint: STAYING program designed (3-year, 7 communities, Spain Year 2, ~$6M Minderoo ask). Brave Ones project filed. Verify-fix discipline wired. Handoff saved. | thoughts/shared/handoffs/staying/SESSION-HANDOFF.md, wiki/projects/the-brave-ones.md, wiki/synthesis/the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led.md
- 2026-04-07 18:27 | ingest | The Brave Ones — new Studio cluster project filed (portrait series, counter-mugshot, B&W photographic register, companion to CONTAINED) | wiki/projects/the-brave-ones.md
- 2026-04-07 18:19 | synthesis | "The Edge Is Where the Healing Is — JusticeHub as the world model for community-led justice" → 4 citations | wiki/synthesis/the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led.md
- 2026-04-07 17:40 | synthesis | "How does the Tractorpedia second-brain pattern compound knowledge over time?" → 2 citations | wiki/synthesis/how-does-the-tractorpedia-second-brain-pattern-compound-knowledge-over-time.md
- 2026-04-07 17:40 | viewer-build | 131 articles · 43 photo maps · 821KB | tools/act-wikipedia.html
- 2026-04-07 17:39 | url-audit | 0 live · 0 dead · 3 known-issue · 30 no-URL · 27 no-repo | wiki/decisions/url-audit-2026-04-07.md, wiki/decisions/url-audit-latest.json
- 2026-04-07 | bootstrap | Wiki activity log created. Folders synthesis/, sources/, output/ added per Karpathy second-brain pattern. | wiki/log.md, wiki/synthesis/, wiki/sources/, wiki/output/
