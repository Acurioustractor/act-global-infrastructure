# ACT GitHub & Vercel Development Setup

**Updated:** 2026-01-22
**GitHub Org:** [Acurioustractor](https://github.com/Acurioustractor)
**Vercel Team:** benjamin-knights-projects

---

## Core Platforms

| Project | GitHub Repo | Vercel URL | Local Path |
|---------|-------------|------------|------------|
| ACT Regenerative Studio | `Acurioustractor/act-regenerative-studio` | https://act-regenerative-studio-benjamin-knights-projects.vercel.app | `/Users/benknight/Code/act-regenerative-studio` |
| Empathy Ledger v2 | `Acurioustractor/empathy-ledger-v2` | https://empathy-ledger-v2.vercel.app | `/Users/benknight/Code/empathy-ledger-v2` |
| ACT Intelligence Platform | `Acurioustractor/act-intelligence-platform` | localhost:4000 (dev) | `/Users/benknight/Code/act-intelligence-platform` |
| ACT Global Infrastructure | `Acurioustractor/act-global-infrastructure` | N/A (scripts/agents) | `/Users/benknight/Code/act-global-infrastructure` |

---

## Justice Projects

| Project | GitHub Repo | Vercel URL |
|---------|-------------|------------|
| JusticeHub v2 | `Acurioustractor/justicehubv2` | https://justicehub-vert.vercel.app |
| Diagrama Australia | `Acurioustractor/diagrama-australia` | https://diagrama-australia-git-main-benjamin-knights-projects.vercel.app |
| Bail Program Wiki | `Acurioustractor/bail-program-wiki` | https://bail-program-cms-git-main-benjamin-knights-projects.vercel.app |
| Contained | `Acurioustractor/Contained` | https://contained-campaign-site.vercel.app |
| QLD Youth Justice Tracker | `Acurioustractor/qld-youth-justice-tracker` | https://qld-youth-justice-tracker-benjamin-knights-projects.vercel.app |

---

## Indigenous/Community Projects

| Project | GitHub Repo | Vercel URL |
|---------|-------------|------------|
| Great Palm Island PICC | `Acurioustractor/Great-Palm-Island-PICC` | https://great-palm-island-picc.vercel.app |
| Palm Island Repository | `Acurioustractor/picc-station-site-plan` | https://palm-island-repository.vercel.app |
| Wilya Janta | `Acurioustractor/wilya-janta-communications` | https://wilya-janta-communications.vercel.app |
| Mounty Yarns | `Acurioustractor/mounty-yarns` | https://mounty-yarns-map.vercel.app |
| Barkly Research | `Acurioustractor/barkly-research-platform` | https://barkly-research-platform-benjamin-knights-projects.vercel.app |

---

## Enterprise/Community Projects

| Project | GitHub Repo | Vercel URL |
|---------|-------------|------------|
| Goods Asset Tracker | `Acurioustractor/goods-asset-tracker` | (local dev) |
| Harvest Community Hub | `Acurioustractor/harvest-community-hub` | https://harvest-community-hub.vercel.app |
| The Harvest Witta | `Acurioustractor/theharvest` | https://www.theharvestwitta.com.au |
| ACT Farm | `Acurioustractor/act-farm` | https://act-farm-benjamin-knights-projects.vercel.app |
| Custodian Economy | `Acurioustractor/custodian-economy-platform` | https://custodian-economy-platform.vercel.app |

---

## Partner Projects

| Project | GitHub Repo | Vercel URL |
|---------|-------------|------------|
| AIME Knowledge Hub | `Acurioustractor/aime-artifacts` | https://aime-knowledge-hub-benjamin-knights-projects.vercel.app |
| Reciprocal Voices | `Acurioustractor/reciprocal-voices-interactive` | https://reciprocal-voices-interactive.vercel.app |
| Mount Isa Service Map | `Acurioustractor/mount-isa-service-map` | https://mount-isa-service-map.vercel.app |
| Better Philanthropy | `Acurioustractor/better-philanthropy` | https://better-philanthropy.vercel.app |

---

## Development Infrastructure

| Project | GitHub Repo | Purpose |
|---------|-------------|---------|
| ClawdBot Docker | `act-global-infrastructure/clawdbot-docker` | Discord/Telegram/Signal bots on NAS |
| ACT Project Template | `Acurioustractor/act-project-template` | Standard template for new projects |

---

## Playgrounds/Experiments (hidden from main views)

| Project | Vercel URL |
|---------|------------|
| ACT Placemat | https://act-placemat-benjamin-knights-projects.vercel.app |
| ACT Project Grid | https://act-project-grid-acurioustractor-benjamin-knights-projects.vercel.app |
| Factory Records Basquiat | https://factory-records-basquiat-placemat.vercel.app |

---

## Key Links

- **GitHub Organization:** https://github.com/Acurioustractor
- **Vercel Dashboard:** https://vercel.com/benjamin-knights-projects
- **Intelligence Platform:** http://localhost:4000 (dev) → Development tab
- **Command Center API:** http://localhost:3456

---

## Data Sources

The FrontendsTab (`/apps/frontend/src/components/dashboard/FrontendsTab.tsx`) displays projects from:

1. **actProjects.ts** - 28 verified projects with GitHub/Vercel/local paths
2. **projectEnrichment.ts** - Contact counts, opportunities, health scores
3. **allProjects.ts** - 46 full projects with LCAA phases, leads, cultural protocols

---

## Verified Mapping (2026-01-22)

All URLs have been verified against:
- GitHub API (`gh repo list Acurioustractor --limit 100`)
- Vercel CLI (`vercel list --scope benjamin-knights-projects`)
- Local codebases (`/Users/benknight/Code/`)
