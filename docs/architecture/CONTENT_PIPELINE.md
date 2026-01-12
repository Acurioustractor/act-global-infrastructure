# ACT Ecosystem Content Pipeline Architecture

## Overview

Autonomous content creation, review, and publishing system that leverages the full ACT ecosystem for high-quality, brand-aligned communications.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ACT ECOSYSTEM (7 Projects)                      │
│  JusticeHub • Empathy Ledger • ACT Farm • The Harvest • Goods • Hub    │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE AGGREGATION                              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Git Logs    │  │ Ralph       │  │ Sprint      │  │ Deployment  │   │
│  │ (commits,   │  │ Progress    │  │ Tracking    │  │ Events      │   │
│  │ releases)   │  │ (completions)│ │ (Notion)    │  │ (DORA)      │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         └────────────────┴────────────────┴─────────────────┘          │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      CONTENT GENERATION                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Ralph Agent (Long-Running)                    │   │
│  │                                                                  │   │
│  │  1. Reads PRD with content tasks                                 │   │
│  │  2. Gathers ecosystem context                                    │   │
│  │  3. Applies brand-alignment skill                                │   │
│  │  4. Generates platform-specific content                          │   │
│  │  5. Creates pages in Notion Content Hub                          │   │
│  │  6. Marks PRD task complete, continues                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Skills Invoked:                                                        │
│  • act-brand-alignment (voice, tone, values)                           │
│  • ghl-crm-advisor (contact context, campaigns)                        │
│  • content-publisher (templates, formatting)                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      NOTION CONTENT HUB                                 │
│  Database: e400e93e-fd9d-4a21-810c-58d67ed9fe97                        │
│                                                                         │
│  Status Flow:                                                           │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ Story in         │ ──▶│ Ready to         │ ──▶│ Conversation     │  │
│  │ Development      │    │ Connect          │    │ Scheduled        │  │
│  └──────────────────┘    └──────────────────┘    └────────┬─────────┘  │
│         ▲                        │                         │            │
│         │                        │ (human review)          │            │
│   (AI creates)              (approve)                      │            │
│                                                            ▼            │
│                                                   ┌──────────────────┐  │
│                                                   │ Connected &      │  │
│                                                   │ Delighted        │  │
│                                                   └──────────────────┘  │
│                                                                         │
│  Key Properties:                                                        │
│  • Content/Communication Name (title)                                   │
│  • Key Message/Story (content)                                          │
│  • Target Accounts (multi-select)                                       │
│  • Communication Type (LinkedIn Post, Newsletter, etc)                  │
│  • Sent date (schedule)                                                 │
│  • Image / Video link (media)                                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ sync-content-to-ghl.mjs
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      GHL PUBLISHING ENGINE                              │
│  API: services.leadconnectorhq.com                                      │
│                                                                         │
│  Connected Accounts:                                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ LinkedIn    │ │ LinkedIn    │ │ YouTube     │ │ Google      │       │
│  │ (Company)   │ │ (Personal)  │ │             │ │ Business    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Bluesky     │ │ Facebook    │ │ Instagram   │ │ Twitter     │       │
│  │             │ │ (pending)   │ │ (pending)   │ │ (pending)   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  Features:                                                              │
│  • Multi-account posting (one content → many platforms)                 │
│  • Scheduled publishing                                                 │
│  • Media upload                                                         │
│  • Engagement analytics (via dashboard)                                 │
└────────────────────────────────────────────────────────────────────────┘
```

## Skills Architecture

### content-publisher
Primary skill for content operations:
- `generate <topic>` - Create draft from ecosystem knowledge
- `sync` - Push approved content to GHL
- `status` - Check pipeline status
- `schedule <date>` - Schedule content

### act-brand-alignment
Voice and tone enforcement:
- Farm metaphors (seeds, harvest, cultivating)
- Community ownership language
- LCAA methodology check
- Anti-patterns (no savior framing, no overclaiming)

### ralph (with content mode)
Long-running autonomous content generation:
- Processes content PRDs
- Gathers cross-ecosystem context
- Generates multiple posts per run
- Creates in Notion for human review

### ghl-crm-advisor
CRM context for personalization:
- Contact history
- Campaign performance
- Pipeline stage awareness

## Data Flow

### 1. Knowledge Sources → Aggregation

```javascript
// Git activity across all repos
const gitInsights = await scanRepositories([
  '/Users/benknight/Code/JusticeHub',
  '/Users/benknight/Code/empathy-ledger-v2',
  '/Users/benknight/Code/ACT Farm/act-farm',
  // ... all 7 repos
]);

// Ralph completions
const ralphProgress = await readProgress('ralph/progress.txt');

// Sprint data
const sprints = await queryNotion('2d5ebcf9-81cf-8151-873d-d14f21b48333');

// Deployment metrics
const dora = await queryNotion('2d6ebcf9-81cf-81d1-a72e-c9180830a54e');
```

### 2. Content Generation

```javascript
// PRD for content tasks
{
  "project": "Content Publishing",
  "type": "content",
  "features": [
    {
      "id": "weekly-digest",
      "title": "Generate weekly ecosystem digest",
      "sources": ["git-logs", "sprint-completions", "ralph-progress"],
      "target_accounts": ["LinkedIn (Company)"],
      "passes": false
    }
  ]
}

// Ralph processes PRD, creates posts
// Each post goes to Notion with "Story in Development" status
```

### 3. Editorial Review (Human)

1. Open Notion Content Hub
2. Review AI-generated content
3. Edit for final polish
4. Change status to "Ready to Connect"
5. Optionally set "Sent date" for scheduling

### 4. Publishing

```bash
# Sync approved content to GHL
node scripts/sync-content-to-ghl.mjs

# What happens:
# 1. Query Notion for "Ready to Connect" items
# 2. Transform to GHL format
# 3. Post to selected Target Accounts
# 4. Update Notion status to "Connected & Delighted"
```

## Automation Options

### Manual (Current)
```bash
# Create content
node /tmp/create-newyear-post.mjs

# Review in Notion, approve

# Sync to GHL
node scripts/sync-content-to-ghl.mjs
```

### Semi-Automated (GitHub Actions)
```yaml
# .github/workflows/sync-content.yml
name: Content Sync
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9am
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/sync-content-to-ghl.mjs
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          GHL_API_KEY: ${{ secrets.GHL_API_KEY }}
```

### Fully Autonomous (Ralph Mode)
```bash
# Create content PRD
cat > ralph/content-prd.json << 'EOF'
{
  "project": "Weekly Content",
  "type": "content",
  "features": [
    {"id": "digest", "title": "Weekly ecosystem digest", "passes": false},
    {"id": "tip", "title": "Tech tip from codebase", "passes": false},
    {"id": "story", "title": "Community spotlight", "passes": false}
  ]
}
EOF

# Run Ralph overnight
PRD_FILE=ralph/content-prd.json ./ralph/ralph.sh
```

## File Map

| Component | File |
|-----------|------|
| Sync script | `scripts/sync-content-to-ghl.mjs` |
| GHL social service | `scripts/lib/ghl-social-service.mjs` |
| GHL API service | `scripts/lib/ghl-api-service.mjs` |
| Post template | `.claude/skills/content-publisher/references/post-template.mjs` |
| Content ideas | `.claude/skills/content-publisher/references/content-ideas.md` |
| Content publisher skill | `.claude/skills/content-publisher/SKILL.md` |
| Ralph skill | `.claude/skills/ralph-agent/SKILL.md` |
| Brand alignment | `.claude/skills/act-brand-alignment/SKILL.md` |
| Notion database IDs | `config/notion-database-ids.json` |

## Environment Variables

```bash
# Notion
NOTION_TOKEN=NOTION_TOKEN_PLACEHOLDER

# GHL Core
GHL_API_KEY=pit-xxx
GHL_LOCATION_ID=xxx

# GHL Social Accounts
GHL_LINKEDIN_ACCOUNT_ID=xxx    # Company page
GHL_LINKEDIN_PERSONAL_ID=xxx   # Personal profile
GHL_YOUTUBE_ACCOUNT_ID=xxx
GHL_GBP_ACCOUNT_ID=xxx
GHL_BLUESKY_ACCOUNT_ID=xxx
GHL_FACEBOOK_ACCOUNT_ID=xxx    # Pending connection
GHL_INSTAGRAM_ACCOUNT_ID=xxx   # Pending connection
GHL_TWITTER_ACCOUNT_ID=xxx     # Pending connection
```

## Next Steps

1. **Connect remaining social accounts** in GHL (Facebook, Instagram, Twitter)
2. **Set up GitHub Action** for daily content sync
3. **Create content PRD** for Ralph to generate weekly posts
4. **Build analytics dashboard** to track engagement back to Notion
