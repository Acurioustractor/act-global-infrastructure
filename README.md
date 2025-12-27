# ACT Global Infrastructure

Shared GitHub Actions, Claude Code skills, and scripts for all ACT ecosystem projects.

## Purpose

This repository is the single source of truth for:
- **GitHub Actions workflows** - Sprint snapshots, auto-tagging, deployment
- **Claude Code skills** - Sprint workflow, brand alignment, CRM advisor
- **Shared scripts** - Notion sync, snapshot metrics, utilities
- **Configuration templates** - Environment variables, VS Code workspace

## Projects Using This Infrastructure

1. **ACT Farm** - `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio`
2. **Empathy Ledger** - `/Users/benknight/Code/Empathy Ledger v.02`
3. **JusticeHub** - `/Users/benknight/Code/JusticeHub`
4. **The Harvest** - `/Users/benknight/Code/The Harvest Website`
5. **Goods** - `/Users/benknight/Code/Goods Asset Register`
6. **BCV/ACT Farm** - `/Users/benknight/Code/ACT Farm/act-farm`

## Structure

```
~/act-global-infrastructure/
├── .github/workflows/       # Shared GitHub Actions
│   ├── snapshot-sprint.yml  # Daily sprint snapshot (5 PM UTC)
│   └── auto-tag.yml         # Auto-tag project items
├── .claude/skills/          # Shared Claude Code skills
│   ├── act-sprint-workflow/ # Sprint management
│   ├── act-brand-alignment/ # Brand voice
│   └── ghl-crm-advisor/     # CRM strategy
├── scripts/                 # Shared automation scripts
│   ├── snapshot-sprint-metrics.mjs
│   ├── sync-github-to-notion.mjs
│   └── setup/
│       └── link-to-repo.sh  # Setup script for new repos
├── docs/                    # Shared documentation
│   └── UNIFIED_WORKFLOW.md
└── config/
    ├── repos.json           # List of all ACT repos
    └── workspace.code-workspace  # Multi-root VS Code workspace
```

## Usage

### Link to a Project

```bash
cd /path/to/project

# Link GitHub workflows
ln -s ~/act-global-infrastructure/.github .github-global
# Then copy needed workflows to .github/workflows/

# Link Claude skills
mkdir -p .claude/skills/global
ln -s ~/act-global-infrastructure/.claude/skills/* .claude/skills/global/

# Link scripts
ln -s ~/act-global-infrastructure/scripts scripts-global
```

### Update Global Resources

```bash
cd ~/act-global-infrastructure

# Make changes
vim .github/workflows/snapshot-sprint.yml

# Commit and push
git add -A
git commit -m "Update sprint snapshot workflow"
git push

# All linked projects automatically get the update via symlinks
```

## GitHub Secrets Required

All projects using these workflows need these GitHub secrets:

- `GH_PROJECT_TOKEN` - GitHub OAuth token (org-level project access)
- `PROJECT_ID` - GitHub Project ID (PVT_kwHOCOopjs4BLVik)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NOTION_TOKEN` - Notion integration token (optional)
- `NOTION_DATABASE_ID` - Notion database ID (optional)

## Multi-Root VS Code Workspace

Open all ACT projects simultaneously:

```bash
code ~/act-global-infrastructure/config/workspace.code-workspace
```

This opens all 6 projects in a single VS Code window with shared settings.

---

**Created**: 2025-12-27
**Maintained By**: Ben Knight + Claude AI
