# ⚠️ DEPRECATED - Moved to act-ecosystem

**This repository has been merged into [act-ecosystem](https://github.com/Acurioustractor/act-ecosystem)**

## What Happened

As part of the V2 architecture consolidation (2026-01-26), this repository was merged with `act-intelligence-platform` into a unified mono-repo called `act-ecosystem`.

## New Location

All code from this repository now lives in:

```
https://github.com/Acurioustractor/act-ecosystem
```

### Directory Mapping

| Old Location | New Location |
|--------------|--------------|
| `packages/act-dashboard/` | `apps/command-center/` |
| `scripts/` | `scripts/` |
| `lib/` | `packages/shared/` |
| `supabase/` | `packages/supabase/` |
| `config/` | `config/` |
| `.github/workflows/` | `.github/workflows/` |

## Why?

1. **Simplified development** - One repo for all internal operations
2. **Shared code** - Easier to share types and utilities
3. **Unified CI/CD** - Single pipeline for backend + dashboard
4. **Better safeguards** - Consolidated Claude Code protections

## Do Not Use This Repo

- No new commits should be made here
- Use `act-ecosystem` for all future work
- This repo is kept for historical reference only

## Quick Start with New Repo

```bash
git clone https://github.com/Acurioustractor/act-ecosystem.git
cd act-ecosystem
npm install
npm run dev:api        # Command Center at http://localhost:3456
npm run dev:dashboard  # Intelligence at http://localhost:3999
```

---

*Archived: 2026-01-26*
*V1 Tag: v1.0.0*
