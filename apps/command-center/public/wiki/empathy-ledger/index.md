# Empathy Ledger

> Community storytelling that centers data sovereignty

## Philosophy

Empathy Ledger puts storytelling power back in community hands. We believe **stories are data**, and communities should control how their stories are shared and used.

Traditional impact measurement extracts stories from communities for external purposes. Empathy Ledger inverts this by:

- Giving storytellers ownership of their content
- Allowing communities to decide who can access their stories
- Measuring impact through community-defined metrics
- Building trust through transparency and consent

## Data Sovereignty

Every storyteller owns their content. They decide:
- Who can access their stories
- How they can be used
- When to revoke access

This is **true data sovereignty** - not just privacy, but genuine ownership and control.

### OCAP Principles

The platform is built on Indigenous data sovereignty principles:
- **Ownership** - Communities own their collective data
- **Control** - Communities control access and use
- **Access** - Communities can access their own data anytime
- **Possession** - Data stays under community custody

## Platform Status

| Metric | Value |
|--------|-------|
| Status | Production Ready (January 2026) |
| Code | ~36,650 lines |
| Components | 131 custom components |
| API Endpoints | 60+ routes |
| Security Score | 98/100 |
| Sprints Completed | 8/8 (100%) |
| Cultural Safety | 100% OCAP compliant |

## ALMA Framework

ALMA (Active Listening, Measuring, Amplifying) is our methodology for capturing impact through stories:

### Active Listening
Creating safe spaces for community members to share their stories. Training facilitators in trauma-informed practices. Building trust before asking for stories.

### Measuring
Connecting lived experience to measurable outcomes. Using AI analysis to identify themes and patterns while keeping human judgment central.

### Amplifying
Sharing stories (with consent) to influence policy, practice, and public understanding. Ensuring communities benefit from how their stories are used.

## LCAA Framework

### Listen
Creating safe spaces for community members to share their stories.

### Curiosity
Understanding how stories can measure and communicate impact in ways that quantitative data cannot.

### Action
Building technology that gives communities control over their narratives while generating meaningful insights.

### Art
Amplifying voices through multimedia storytelling - audio, video, written, visual.

## Technology

### Tech Stack
```
Frontend: Next.js 15, React 19, TypeScript
Styling: Tailwind CSS (Editorial Warmth palette)
Backend: Supabase (PostgreSQL, Auth, Storage, Realtime)
AI: Claude 3 Sonnet / GPT-4 (opt-in only)
Maps: Mapbox (optional)
Email: SendGrid (optional)
Deployment: Vercel
Testing: Vitest, Playwright
Local Port: 3001
```

### Key Features

**Cultural Safety Features**
- Elder Review System - Required approval workflow for sacred content
- Sacred Content Protection - Multi-layer access controls
- Ongoing Consent - Renewable consent with expiry (6-12 months)
- Cultural Protocols - Customizable per organization
- Trigger Warnings - Sensitive content support
- AI Opt-In - No AI analysis without explicit consent

**Core Capabilities**
- Multi-tenant architecture (all tables have tenant_id)
- Row-Level Security on every table
- SROI Calculator with cultural value proxies
- Network visualization for thematic connections
- Knowledge Base RAG (231 docs → 22,506 chunks)
- Ralph Audit System for brand/UI consistency

### Design System - Editorial Warmth
```
Colors:
- Terracotta (#D76E56) - Primary action
- Forest Green (#4A7C59) - Success
- Ochre (#E8A45E) - Accent
- Cream (#F5F1E8) - Background
- Charcoal (#2C3E50) - Text
```

## User Roles

1. **Storyteller** - Create/publish stories, manage consent
2. **Organization Admin** - Manage storytellers, analytics, reports
3. **Elder** - Review cultural content, set protocols
4. **Super Admin** - Platform-wide management

## Integration Points

- **JusticeHub** - Youth justice platform integration
- **ACT Farm** - Agricultural data connections
- **Goods on Country** - Community impact stories (240 storytellers)

## Related Projects

- [JusticeHub](/compendium/justicehub) - Justice-involved young people's stories
- [Goods](/compendium/goods) - Enterprise storytelling and provenance
- [The Harvest](/compendium/the-harvest) - Producer and community stories

## Resources

- [Empathy Ledger Platform](https://empathy-ledger-v2.vercel.app)
- [GitHub Repository](https://github.com/Acurioustractor/empathy-ledger-v2)
- [ACT Place](https://act.place/projects/empathy-ledger)
