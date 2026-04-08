# Handoff: Push R&D Documentation to Notion

**Status:** Blocked — Notion MCP token updated, needs session restart
**Created:** 2026-03-30

## What Was Done

1. Located all R&D documentation files:
   - `docs/rd-tax-package-fy26-final.md` — Complete R&D tax incentive package (553 lines, 12 sections)
   - `docs/rd-git-evidence-pack-fy26.md` — Git evidence pack (2 repos, 554 commits)
   - `scripts/output/rd-evidence-pack-2025.md` — Generated evidence output (activity logs, hours)

2. Read all 3 files — content is ready to push

3. Updated Notion MCP token in `.mcp.json`.
   (live token lives only in `.mcp.json`, never committed. previous tokens
   redacted from history 2026-04-08 after they triggered GitHub secret
   scanning. all tokens in this entry are dead and have been rotated.)

## What Needs To Happen

1. **Session restart** to pick up new Notion token
2. Search Notion for existing R&D or Finance area to nest pages under
3. Create 3 Notion pages (or 1 parent + 3 sub-pages):
   - **R&D Tax Package FY26** (the main document for accountant)
   - **Git Evidence Pack FY26** (commit-level evidence)
   - **R&D Evidence Pack** (activity logs with hours)
4. Notion API only supports paragraph + bulleted_list_item blocks — tables will need to be converted to bullet lists or paragraphs

## Key Context

- The main document (`rd-tax-package-fy26-final.md`) is the one the accountant needs
- It contains sensitive financial data (ABN, revenue, spend figures)
- Create as a workspace-level page if no obvious parent exists
- The user wants a shareable Notion link they can send to their accountant
