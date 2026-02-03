# The Studio (Regenerative Innovation Studio)

> Creative technology and regenerative design

## Philosophy

The Studio is where **technology serves community**, not the other way around. We believe technology should amplify human connection, make itself unnecessary, and leave communities more capable than before.

Most tech extracts data, attention, and value from communities. The Studio inverts this by:

- Building technology that communities own and control
- Designing for community benefit, not engagement metrics
- Open-sourcing everything we can
- Training communities to maintain and evolve their own systems

### Beautiful Obsolescence

Our ultimate success metric: Communities saying:
> "ACT? We don't need them anymore. We run this ourselves now."

We're not building dependency. We're building community power through:
- Superior tools designed for community ownership
- Authentic partnerships that transfer capability
- Systems designed for independence, not lock-in
- Platform forking capabilities
- Complete data export tools

## Platform Status

| Metric | Value |
|--------|-------|
| Status | Production Ready |
| Sites Managed | 6 applications |
| Process Manager | PM2 (production-grade) |
| Local Orchestration | Bash + AppleScript |

## Design Principles

### Regenerative by Default
Every system we build should leave things better than we found them - more connected, more capable, more sovereign.

### Community Ownership
Technology belongs to the communities it serves. We build for handover, not dependency.

### Appropriate Technology
The right tool for the context. Sometimes that's high-tech, sometimes it's no-tech.

### Privacy & Sovereignty
Data stays with communities. Systems work offline. No surveillance capitalism.

## LCAA Framework

### Listen
Understanding what communities actually need from technology. Not what we think they need, what they tell us they need.

### Curiosity
Exploring emerging technologies through a regenerative lens. What serves community? What extracts from it?

### Action
Building tools for the ACT ecosystem:
- Empathy Ledger platform
- JusticeHub systems
- Goods marketplace
- Command Center (this platform)
- The Harvest & Farm websites
- Intelligence Platform

### Art
Designing beautiful, intuitive interfaces that respect users. Technology as craft.

## Technology

### Unified Ecosystem Orchestration
The Studio manages all 6 ACT sites through PM2 with one-command startup:

```bash
act-start      # Start all sites + Chrome with all tabs
act-stop       # Stop all sites
act-restart    # Restart all sites
act-status     # Show running sites
act-logs       # View live logs
act-monitor    # PM2 dashboard
```

### Local Ecosystem Ports
```
Port 3001 - Empathy Ledger
Port 3002 - ACT Regenerative Studio (main hub)
Port 3003 - JusticeHub
Port 3004 - The Harvest
Port 3005 - ACT Farm
Port 3999 - ACT Placemat (Intelligence Platform)
```

### Core Tech Stack
```
Frontend: React, Next.js (14-16), TypeScript
Backend: Node.js, Supabase, Vercel
AI: Claude AI, OpenAI, local models where appropriate
Design: Figma, Tailwind CSS
Process Management: PM2
Testing: Vitest, Playwright
```

### Consistent Patterns Across Projects

**Frontend:**
- Next.js with App Router
- React 18-19
- TypeScript strict mode
- Tailwind CSS 3-4

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Row-Level Security (RLS) on all tables
- Server/client pattern for Supabase access

**Deployment:**
- Vercel for frontend hosting
- Environment variables via `.env.local`
- Production-ready configurations

## Key Innovations

### Ralph Audit System
Automated brand and UI/UX auditing with Claude:
- Brand consistency verification
- PRD compliance checking
- Visual regression testing
- Reusable across all projects

### Knowledge Base RAG System
231 docs → 22,506 chunks with semantic search:
- 506 Q&A extractions
- Vector embeddings
- Applicable across documentation

### QR Asset Tracking
778 unique QR codes for physical goods:
- Organized by community and product
- Public support forms via scan
- Scalable model for other assets

### ALMA (AI Living Memory Architecture)
Intelligence layer connecting projects:
- Seed scripts for initiatives, contexts, evidence
- Cross-project memory and learning
- Continuous improvement system

## Integration Ecosystem

**Shared APIs:**
- Supabase (multiple projects)
- GoHighLevel (CRM/marketing automation)
- Stripe (payments)
- Anthropic Claude AI
- OpenAI
- Notion
- Google APIs (Gmail, Calendar)
- Xero (financial)
- LinkedIn (network intelligence)

**Common Services:**
- Redis caching (NAS: 192.168.0.34:6379)
- ChromaDB (NAS: 192.168.0.34:8000)
- PM2 process management
- Vercel deployment

## Documentation Standards

### PMPP Framework
- **Principles** - Why we do things
- **Methods** - Frameworks and approaches
- **Practices** - Technical design
- **Procedures** - Step-by-step guides

### Common Docs
- README.md - Project overview
- CLAUDE.md - AI assistant context
- QUICKSTART.md - Fast reference
- Package.json - Scripts and dependencies
- .env.example - Environment template

## Open Source

All ACT technology is open source where possible:
- [GitHub: Acurioustractor](https://github.com/Acurioustractor)

## Related Projects

- [Empathy Ledger](/compendium/empathy-ledger) - Storytelling platform
- [JusticeHub](/compendium/justicehub) - Justice transformation platform
- [Goods](/compendium/goods) - Community marketplace
- [The Harvest](/compendium/the-harvest) - Community food systems
- [The Farm](/compendium/the-farm) - Land-based healing

## Resources

- [Regenerative Studio](https://act-regenerative-studio.vercel.app)
- [GitHub Repository](https://github.com/Acurioustractor/act-regenerative-studio)
