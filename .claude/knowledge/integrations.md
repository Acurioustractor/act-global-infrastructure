# ACT Project Integrations

## Project Relationships

```
                    ┌─────────────────────┐
                    │  ACT Regenerative   │
                    │      Studio         │
                    │  (Main Website)     │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌───────────┐ ┌─────────────┐
    │ Empathy Ledger  │ │ JusticeHub│ │  ACT Farm   │
    │  (Storytelling) │ │  (Legal)  │ │  (Resources)│
    └────────┬────────┘ └─────┬─────┘ └──────┬──────┘
             │                │              │
             └────────────────┼──────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌───────────┐ ┌─────────────┐
    │   The Harvest   │ │   Goods   │ │ ACT Placemat│
    │   (Seasonal)    │ │ (Assets)  │ │  (Events)   │
    └─────────────────┘ └───────────┘ └─────────────┘
```

## Shared Authentication

Projects that share user authentication:
- Empathy Ledger ↔ JusticeHub (same user base)
- Future: Single sign-on across all platforms

## Data Sharing Patterns

### Empathy Ledger → JusticeHub
- Storyteller profiles can be referenced in legal cases
- Stories as evidence (with consent)
- Privacy settings respected across systems

### ACT Farm → Goods
- Resource inventory synchronization
- Asset tracking across platforms

### ACT Regenerative Studio → All
- Project showcases pull from individual platforms
- Aggregated impact metrics (anonymized)

## External Integrations

### GHL (GoHighLevel) CRM
**Used by:** ACT Regenerative Studio
**Purpose:** Contact management, marketing automation
**Integration:** Webhook sync to Notion

### Notion
**Used by:** Multiple projects
**Purpose:** Documentation, project management
**Integration:** API for content sync

### Supabase (Shared)
**Projects:** Empathy Ledger, JusticeHub, ACT Farm
**Pattern:** Separate projects, shared patterns
**Note:** Each has its own Supabase instance

### Vercel
**All projects** deployed via Vercel
**Pattern:**
- Production: `main` branch
- Preview: PR branches
- Environment variables per project

## API Integration Patterns

### Cross-Project API Calls
```typescript
// When one project needs data from another
// Use server-side calls with service keys

const response = await fetch(`${EMPATHY_LEDGER_URL}/api/v1/storytellers`, {
  headers: {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'X-Tenant-ID': tenantId
  }
})
```

### Webhook Patterns
```typescript
// Notify other systems of changes
await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'story.published',
    data: { storyId, tenantId }
  })
})
```

## Future Integration Plans

1. **Unified Auth** - Single sign-on across all platforms
2. **Shared Component Library** - Extract common UI components
3. **Event Bus** - Real-time cross-project updates
4. **Unified Analytics** - Cross-project impact metrics
