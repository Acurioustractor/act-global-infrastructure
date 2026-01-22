# ACT Contact Enrichment & Consolidation Plan

**Date:** 2026-01-20
**Updated:** 2026-01-20
**Status:** Phase 1 Complete - Contacts Linked

---

## Consolidation Progress (2026-01-20)

### What We Accomplished

| Action | Result |
|--------|--------|
| **person_identity_map → GHL** | 472 contacts linked by email match |
| **Communications → Contacts** | 1,949 of 8,327 linked (rest are newsletters/automated) |
| **Scripts Created** | `consolidate-contacts.mjs`, `link-communications-to-contacts.mjs` |

### Current Numbers

| Source | Count | Linked to GHL |
|--------|-------|---------------|
| **GHL Contacts** | 847 | - (primary CRM) |
| **Person Identity Map** | 14,804 | 472 (35% of those with email) |
| **LinkedIn Contacts** | 13,810 | 343 (all with email already in GHL) |
| **Communications** | 8,327 | 1,949 linked to contacts |

### Top Contacts by Communication Volume

| Name | Emails | Tags |
|------|--------|------|
| Shaun Fisher | 36 | fishers-oysters, partner |
| Katie Norman | 33 | justicehub, justice |
| Georgia Falzon | 32 | community, partner |
| Tanya Turner | 29 | justicehub, justice |
| Nicholas Marchesi | 28 | - |

### Commands Available

```bash
# Check consolidation status
node scripts/consolidate-contacts.mjs status

# Link more contacts
node scripts/consolidate-contacts.mjs link

# See source breakdown and GHL tags
node scripts/consolidate-contacts.mjs report

# Find contacts needing attention
node scripts/consolidate-contacts.mjs quality

# Link communications to contacts
node scripts/link-communications-to-contacts.mjs link

# See top communicators
node scripts/link-communications-to-contacts.mjs report
```

---

## Current Contact Landscape

### Where Your Numbers Come From

| Source | Count | Status | Notes |
|--------|-------|--------|-------|
| **GHL CRM (Active)** | 847 | ✅ Synced to DB | 828 with email |
| **Contact Review Queue** | 1,155 | ✅ In DB | Emails discovered from Gmail |
| **Storytellers** | 226 | ✅ In DB | Empathy Ledger participants |
| **Organizations** | 471 | ✅ In DB | Companies/orgs |
| **Entities (Resolved)** | 63 | ✅ In DB | Cross-system identity |
| **Communications** | 8,327 | ✅ In DB | Email records |
| **Unique Email Addresses** | ~300 | ✅ In DB | From communications |

### Your 40K / 15K / 800 Numbers (Likely Sources)

| Number | Likely Source | Current Status |
|--------|---------------|----------------|
| **~800** | GHL CRM Contacts | ✅ **847 synced** - This is your active CRM |
| **~15,000** | LinkedIn Connections (combined) | ❌ Not imported - Ben + Nic combined |
| **~40,000** | Total email contacts / LinkedIn + all sources | ❌ Not consolidated |

---

## GHL Contact Analysis

### Tags Breakdown (847 contacts)
```
linkedin                    333 (39%)
justice                     256 (30%)
justicehub                  231 (27%)
youth justice               229 (27%)
technology                  228 (27%)
interest:justice-reform     228 (27%)
linkedin-nic               207 (24%)
ai-flagged                 152 (18%)  ← AI identified for attention
needs-attention            144 (17%)
responsive                 142 (17%)
community                  127 (15%)
goods                      124 (15%)
dormant                     97 (11%)
linkedin-ben                65 (8%)
government                  58 (7%)
education                   56 (7%)
indigenous                  39 (5%)
partner                     33 (4%)
funder                      31 (4%)
```

### Key Insights
- **39% from LinkedIn** - Your network is your biggest source
- **30% justice-related** - Strong focus area
- **18% AI-flagged** - 152 contacts identified for attention
- **17% responsive** - 142 contacts actively engage
- **11% dormant** - 97 contacts need reactivation

---

## Contact Review Queue (1,155 emails)

These are emails discovered from your Gmail communications that haven't been added to GHL yet:

| Decision | Count | Action |
|----------|-------|--------|
| **Approved** | 647 | Ready to create in GHL |
| **Ignored** | 353 | Spam/noise/not relevant |
| **Pending** | 155+ | Need review |

### Opportunity
**647 approved contacts waiting to be created in GHL** - these are people you've emailed who aren't in your CRM yet.

---

## Enrichment Opportunities

### 1. Link Communications to Contacts
**Current state:** 8,327 email records, only ~37 linked to GHL contacts
**Opportunity:** Link existing communications to GHL contacts by email matching

```
What this enables:
- See full communication history for each contact
- Auto-update relationship health scores
- Better context for follow-ups
```

### 2. Create Approved Contacts in GHL
**Current state:** 647 approved contacts not in GHL
**Opportunity:** Batch create contacts with relationship context

```
Enrichment available:
- Topics discussed (from email analysis)
- Communication frequency
- Suggested tags based on content
- First/last contact dates
```

### 3. Import LinkedIn Connections
**Potential:** 15,000+ connections from Ben + Nic
**Status:** Not imported

```
Export from LinkedIn:
1. Settings → Data privacy → Get a copy of your data
2. Select "Connections"
3. Import CSV to pending_contacts for review
```

### 4. Link Contacts to Projects
**Current state:** 78 Notion projects, 847 contacts - few links
**Opportunity:** AI-assisted project-contact mapping

```
Signals for linking:
- Email mentions project name
- Calendar invites for project meetings
- Shared in communications about project
- Tagged with project-related keywords
```

### 5. Storyteller-Contact Matching
**Current state:** 226 storytellers, 10 with email
**Opportunity:** Match storytellers to GHL contacts

```
Benefits:
- See which contacts have shared stories
- Track storyteller engagement
- Identify community ambassadors
```

---

## Recommended Actions

### Phase 1: Link & Enrich (This Week)
```bash
# 1. Link communications to contacts by email
node scripts/link-communications-to-contacts.mjs

# 2. Create approved contacts in GHL
node scripts/contact-discovery.mjs create

# 3. Update relationship health scores
node scripts/relationship-health.mjs update
```

### Phase 2: Import & Expand (Next Week)
```bash
# 1. Export LinkedIn connections (manual step)
# 2. Import to pending_contacts
node scripts/import-linkedin.mjs path/to/Connections.csv

# 3. Review and approve high-priority connections
node scripts/contact-discovery.mjs review
```

### Phase 3: Connect & Map (Ongoing)
```bash
# 1. Map contacts to projects
node scripts/contact-project-mapper.mjs

# 2. Match storytellers to contacts
node scripts/match-storytellers.mjs

# 3. Weekly relationship health report
node scripts/relationship-health.mjs report
```

---

## Contact Segments for Outreach

### Priority Segments

| Segment | Criteria | Count | Action |
|---------|----------|-------|--------|
| **Hot Leads** | `responsive` + recent activity | ~50 | Personal follow-up |
| **Warm Prospects** | `needs-attention` + has email | ~100 | Newsletter + check-in |
| **Project Supporters** | Linked to active projects | TBD | Project updates |
| **Dormant VIPs** | `dormant` + `partner` or `funder` | ~30 | Re-engagement campaign |
| **Community** | `community` tag | 127 | Event invites |

### Query Examples
```sql
-- Hot leads (responsive, recent)
SELECT * FROM ghl_contacts
WHERE 'responsive' = ANY(tags)
AND last_contact_date > NOW() - INTERVAL '30 days';

-- Dormant partners to re-engage
SELECT * FROM ghl_contacts
WHERE 'dormant' = ANY(tags)
AND ('partner' = ANY(tags) OR 'funder' = ANY(tags));

-- New contacts from email discovery
SELECT * FROM contact_review_decisions
WHERE decision = 'approve'
AND ghl_contact_id IS NULL;
```

---

## Scripts to Build

### 1. `link-communications-to-contacts.mjs`
Match communications_history records to ghl_contacts by email.

### 2. `import-linkedin.mjs`
Import LinkedIn CSV export to pending_contacts for review.

### 3. `contact-project-mapper.mjs`
AI-assisted mapping of contacts to projects based on communications.

### 4. `match-storytellers.mjs`
Match storytellers to GHL contacts by email/name.

### 5. `contact-enrichment-report.mjs`
Weekly report showing:
- New contacts discovered
- Relationship health changes
- Engagement trends
- Project associations

---

## The Vision: ACT Community Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACT COMMUNITY GRAPH                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONTACTS (847+)                                                │
│    ├── Linked to PROJECTS (78)                                  │
│    ├── Linked to STORIES (226)                                  │
│    ├── Linked to COMMUNICATIONS (8,327)                         │
│    └── Linked to ORGANIZATIONS (471)                            │
│                                                                  │
│  DISCOVERY PIPELINE                                              │
│    ├── Email Discovery (1,155) → Review → GHL                   │
│    ├── LinkedIn Import (15K+) → Review → GHL                    │
│    └── Event Attendees → Review → GHL                           │
│                                                                  │
│  ENRICHMENT SIGNALS                                              │
│    ├── Communication frequency                                   │
│    ├── Response patterns                                         │
│    ├── Topic interests (AI-extracted)                           │
│    ├── Project involvement                                       │
│    └── Story participation                                       │
│                                                                  │
│  OUTPUT: Who to reach out to, when, and why                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Immediate:** Run `contact-discovery.mjs create` to add 647 approved contacts to GHL
2. **This week:** Build `link-communications-to-contacts.mjs` to connect email history
3. **Next week:** Export LinkedIn and import for review
4. **Ongoing:** Weekly enrichment reports

---

## Commands Available Now

```bash
# View contact discovery status
node scripts/contact-discovery.mjs status

# Review pending contacts
node scripts/contact-discovery.mjs review

# Generate brief for morning report
node scripts/contact-discovery.mjs brief

# Check relationship health
node scripts/relationship-health.mjs health
```
