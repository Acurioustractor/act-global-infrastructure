# ACT Infrastructure — 2026 Roadmap

## Current Status

| Element | Status |
|---------|--------|
| Command Center | Live (23 pages, 96 API endpoints) |
| Scripts | 110+ operational scripts |
| Database | ~60 tables, 40 migrations |
| Wiki | ACT philosophy + 28 vignettes + project compendiums |
| Agent Chat | Implemented (Haiku, tool-use loop) |
| Knowledge Pipeline | Created, pending scheduling |
| Data Freshness | Created, pending scheduling |

## 2026 Focus Areas

### 1. Schedule New Scripts
- Knowledge pipeline to PM2/GitHub Actions (daily 8am AEST)
- Data freshness monitor (every 6 hours)
- Apply legacy table cleanup migration

### 2. Wire Monitoring to Dashboard
- Data freshness API into System page
- Pipeline health visibility
- Embedding completeness tracking

### 3. Entity Migration
- When Pty Ltd is created, migrate operational config
- Update Xero integration for new entity
- Update subscription tracking

### 4. Agent Chat Enhancement
- Test on deployed Vercel instance
- Add more tools (calendar, project health, wiki search)
- Upgrade to Sonnet if usage justifies cost

### 5. Platform Stability
- Resolve health score issues across projects
- Improve deployment reliability
- Database performance optimisation

## Links

- [GitHub](https://github.com/Acurioustractor/act-global-infrastructure)
- [Master Compendium](https://github.com/Acurioustractor/act-regenerative-studio)
