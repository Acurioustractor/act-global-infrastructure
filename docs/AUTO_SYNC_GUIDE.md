# ACT Ecosystem Auto-Sync Guide

**Last Updated**: 2025-12-30
**Version**: 1.0.0

## Overview

This guide defines which repositories are part of the ACT ecosystem and should be automatically synchronized when deploying changes.

## ACT Core Repositories (Auto-Sync Enabled)

These repositories are **automatically synced** when you request "deploy all changes" or "sync all codebases":

### 1. **act-global-infrastructure** ⚙️
- **Path**: `/Users/benknight/act-global-infrastructure`
- **Branch**: `main`
- **Purpose**: Central infrastructure, automation, sprint tracking, intelligence systems
- **GitHub**: [Acurioustractor/act-global-infrastructure](https://github.com/Acurioustractor/act-global-infrastructure)

### 2. **empathy-ledger-v2** 📖
- **Path**: `/Users/benknight/Code/empathy-ledger-v2`
- **Branch**: `feature/partner-portal` (note: not main!)
- **Purpose**: Storyteller platform, cultural protocols, consent frameworks
- **GitHub**: [Acurioustractor/empathy-ledger-v2](https://github.com/Acurioustractor/empathy-ledger-v2)
- **Special**: Has git worktrees (develop branch exists)

### 3. **ACT Farm and Regenerative Innovation Studio** 🌾
- **Path**: `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio`
- **Branch**: `main`
- **Purpose**: Black Cockatoo Valley land practice, conservation, residencies
- **GitHub**: [Acurioustractor/act-regenerative-studio](https://github.com/Acurioustractor/act-regenerative-studio)

### 4. **The Harvest** 🥬
- **Path**: `/Users/benknight/Code/The Harvest`
- **Branch**: `main`
- **Purpose**: Community hub, CSA subscriptions, events, therapeutic programs
- **GitHub**: [Acurioustractor/the-harvest-website](https://github.com/Acurioustractor/the-harvest-website)

### 5. **JusticeHub** ⚖️
- **Path**: `/Users/benknight/Code/JusticeHub`
- **Branch**: `main`
- **Purpose**: Service directory, family support, CONTAINED campaign
- **GitHub**: [Acurioustractor/justicehub-platform](https://github.com/Acurioustractor/justicehub-platform)

### 6. **ACT Placemat** 💼
- **Path**: `/Users/benknight/Code/ACT Placemat`
- **Branch**: `main`
- **Purpose**: Business agent platform, CRM, subscription tracking, year-in-review
- **GitHub**: [Acurioustractor/act-placemat](https://github.com/Acurioustractor/act-placemat)

---

## Excluded Repositories (Manual Sync Only)

These repositories are **NOT automatically synced** and require explicit approval:

### 1. **Palm Island Repository** 🏝️
- **Path**: `/Users/benknight/Palm Island Reposistory/web-platform`
- **Branch**: `main`
- **Purpose**: Indigenous community knowledge platform (separate client project)
- **GitHub**: [Acurioustractor/palm-island-repository](https://github.com/Acurioustractor/palm-island-repository)
- **Why excluded**: Client project, not part of ACT ecosystem

### 2. **ACT Project Grid** 📊
- **Path**: `/Users/benknight/Code/ACT Project Grid`
- **Branch**: `main`
- **Purpose**: Internal dashboard for project/contact management
- **GitHub**: [Acurioustractor/act-project-grid](https://github.com/Acurioustractor/act-project-grid)
- **Why excluded**: Internal tooling, not a public-facing ACT project

---

## Auto-Sync Rules

### When Auto-Sync Triggers

Auto-sync will only commit and push changes from **ACT Core Repositories** when:

1. User explicitly requests: "deploy all changes", "sync all codebases", "push everything"
2. Only repositories with `autoSync: true` in [config/act-core-repos.json](../config/act-core-repos.json)
3. Repository has uncommitted changes (checked via `git status --short`)

### What Gets Synced

For each ACT core repository:
1. ✅ All uncommitted changes (`git add -A`)
2. ✅ Commit with descriptive message
3. ✅ Push to origin on specified branch
4. ❌ Does NOT sync excluded repositories (manual approval required)

### What Does NOT Get Synced

Files now ignored via `.gitignore` (as of 2025-12-30):
- `.cursor/` - Cursor AI editor config directory
- `.cursorrules` - Cursor AI rules file
- `*.cursor` - Any cursor-related files
- `.vscode/settings.json` - VS Code personal settings
- `.vscode/launch.json` - VS Code debug configurations

---

## How to Request Sync

### Sync All ACT Repos
```
"Deploy all ACT changes"
"Sync all ACT codebases"
"Push all uncommitted work"
```
→ Commits and pushes only ACT core repos (6 repos)

### Sync Specific Repo
```
"Push changes in Empathy Ledger"
"Deploy The Harvest"
```
→ Commits and pushes only the specified repo

### Include Excluded Repo
```
"Also push Palm Island changes"
```
→ Will ask for confirmation before syncing excluded repo

---

## Configuration Files

### Primary Config
- **File**: [config/act-core-repos.json](../config/act-core-repos.json)
- **Purpose**: Defines which repos are part of ACT ecosystem
- **Schema**:
  ```json
  {
    "actEcosystemRepos": [...],  // Auto-sync enabled
    "excludedRepos": [...],       // Manual approval required
    "syncRules": {...},
    "metadata": {...}
  }
  ```

### Per-Repo Gitignore
All ACT repos now have this block in `.gitignore`:
```gitignore
# IDE and Editor Files
.cursor/
.cursorrules
*.cursor
.vscode/settings.json
.vscode/launch.json
```

---

## Verification Commands

Check sync status across all ACT repos:
```bash
# Check for uncommitted changes
for repo in "act-global-infrastructure" "empathy-ledger-v2" "ACT Farm and Regenerative Innovation Studio" "The Harvest" "JusticeHub" "ACT Placemat"; do
  echo "=== $repo ==="
  cd "/Users/benknight/Code/$repo" 2>/dev/null || cd "/Users/benknight/$repo"
  git status --short | wc -l
done
```

Verify .cursor files are ignored:
```bash
git status --ignored | grep cursor
# Should return nothing (cursor files now ignored)
```

---

## Troubleshooting

### "Empathy Ledger showing red but git is clean"
**Cause**: VS Code Source Control panel caching stale state
**Solution**: Click refresh icon in Source Control panel, or run `⌘+Shift+P` → "Git: Refresh"

### "Changes keep appearing after I push"
**Cause**: `.cursor` files weren't in `.gitignore` before 2025-12-30
**Solution**: Now fixed - all ACT repos ignore cursor files

### "Excluded repo got pushed accidentally"
**Cause**: Claude synced based on `/Users/benknight/Code` directory, not config
**Solution**: Now uses [config/act-core-repos.json](../config/act-core-repos.json) as source of truth

---

## Maintenance

### Adding a New ACT Project
1. Add entry to `config/act-core-repos.json` under `actEcosystemRepos`
2. Add `.cursor` gitignore block to new repo
3. Update this documentation

### Excluding a Repo from Auto-Sync
1. Move entry from `actEcosystemRepos` to `excludedRepos` in config
2. Set `autoSync: false`
3. Document reason in `reason` field

---

## Related Documentation

- [Act Core Repos Config](../config/act-core-repos.json) - Source of truth for repo list
- [Skills + Subagents + MCPs Guide](../QUICKSTART_SKILLS_MCPS.md) - Claude Code automation
- [Sprint Workflow](../.claude/skills/act-sprint-workflow/SKILL.md) - Daily development workflows

---

**Questions?** Update this doc or the config file as the ACT ecosystem evolves.
