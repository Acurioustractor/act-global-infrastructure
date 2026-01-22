# ACT Contact Management Vision

**The Goal:** Know who matters, stay connected, never lose a relationship.

---

## The Problem We're Solving

You have **~15,000 people** in your network across systems:
- 847 in GHL (active CRM)
- 13,810 LinkedIn connections
- Thousands more in email history

But **who should you actually be talking to?** And **who's slipping away?**

---

## The Contact Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACT CONTACT LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DISCOVER          QUALIFY           ENGAGE           NURTURE      │
│   ─────────         ───────           ──────           ──────       │
│                                                                      │
│   Gmail sync        AI scoring        Active work      Relationship │
│   Calendar          Manual review     Projects         health check │
│   LinkedIn          Tags/segment      Meetings         Re-engagement│
│   Referrals         Priority set      Collaborations   Check-ins    │
│                                                                      │
│        │                │                 │                │        │
│        ▼                ▼                 ▼                ▼        │
│   ┌─────────┐     ┌─────────┐       ┌─────────┐     ┌─────────┐    │
│   │ Pending │ ──▶ │   GHL   │ ──▶   │ Active  │ ──▶ │ Dormant │    │
│   │ Review  │     │ Contact │       │ Engaged │     │ (check) │    │
│   └─────────┘     └─────────┘       └─────────┘     └─────────┘    │
│                                                           │         │
│                                                           ▼         │
│                                                    Re-engage or     │
│                                                    Archive          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## High-Level Starting Point

### What We Have Now

| Layer | Status | Data |
|-------|--------|------|
| **CRM (GHL)** | ✅ Active | 847 contacts with tags, pipeline stages |
| **Identity Map** | ✅ Linked | 14,804 people, 472 linked to GHL |
| **LinkedIn** | ✅ Imported | 13,810 connections (limited email) |
| **Communications** | ✅ Tracked | 8,327 emails, 1,949 linked |
| **Relationship Health** | ✅ Ready | Auto-updates on communication |

### What's Missing

| Gap | Impact | Solution |
|-----|--------|----------|
| **No discovery pipeline** | New contacts sit unreviewed | `contact-discovery.mjs` workflow |
| **No re-engagement alerts** | Relationships go cold | Relationship health triggers |
| **LinkedIn emails sparse** | Can't contact 95% of connections | Manual enrichment or InMail |
| **Project-contact links** | Don't know who supports what | AI mapping from communications |

---

## The Daily/Weekly Rhythm

### Morning Brief (Automated)

```
═══════════════════════════════════════════════════════════════
  ACT RELATIONSHIP PULSE - Monday 20 Jan 2026
═══════════════════════════════════════════════════════════════

🔥 NEEDS RESPONSE (3)
  • Katie Norman - replied 2 days ago about JusticeHub funding
  • Georgia Falzon - waiting on your response since Friday
  • Shaun Fisher - sent proposal, no reply in 5 days

⚠️  GOING COLD (5)
  • Tina Morris (Diagrama) - 45 days since contact, was active partner
  • Lorana Bartels - 60 days, ai-flagged as important
  • Esther Gyorki - 30 days, community connector

📥 NEW CONTACTS TO REVIEW (7)
  • 3 from this week's emails (real people, not newsletters)
  • 4 approved but not yet in GHL

💡 SUGGESTED OUTREACH
  • Minjerribah Elder - hasn't heard from you in 90 days
  • Rachel Fyfe - project milestone coming up
```

### Weekly Review (15 min)

1. **Process pending contacts** - approve/ignore new discoveries
2. **Check relationship health** - who's going dormant?
3. **Update project associations** - who's involved in active work?
4. **Clean tags** - remove outdated, add new

---

## Contact Segments

### Priority Tiers

| Tier | Criteria | Count (est) | Cadence |
|------|----------|-------------|---------|
| **Inner Circle** | Partners, funders, key collaborators | ~30 | Weekly touch |
| **Active Network** | Responsive, project-involved | ~150 | Bi-weekly |
| **Warm Prospects** | Engaged but not active | ~300 | Monthly |
| **Community** | Supporters, event attendees | ~400 | Quarterly |
| **Dormant** | No contact 90+ days | Variable | Re-engage or archive |

### Tag Strategy

```
RELATIONSHIP TYPE          ENGAGEMENT LEVEL       INTEREST AREAS
─────────────────          ────────────────       ──────────────
partner                    responsive             justice
funder                     needs-attention        indigenous
collaborator               ai-flagged             technology
supporter                  dormant                arts
prospect                   new                    community
                                                  education
                                                  government

PROJECT TAGS               SOURCE TAGS
────────────               ───────────
justicehub                 linkedin-ben
diagrama                   linkedin-nic
harvest                    gmail-discovery
goods                      referral
empathy-ledger             event-[name]
```

---

## Enrichment Strategy

### Automatic (Continuous)

| Source | What We Capture | Frequency |
|--------|-----------------|-----------|
| **Gmail Sync** | New contacts, communication patterns | Real-time |
| **Calendar** | Meeting context, attendees | Real-time |
| **GHL Webhooks** | CRM updates, pipeline moves | Real-time |
| **Relationship Health** | Score updates, alerts | On communication |

### Semi-Automatic (Weekly)

| Process | What It Does | Trigger |
|---------|--------------|---------|
| **Contact Discovery** | Find new people from emails | Weekly cron |
| **Dormancy Check** | Flag contacts going cold | Weekly cron |
| **Communication Summary** | Update contact context | Weekly cron |

### Manual (As Needed)

| Action | When | Tool |
|--------|------|------|
| **LinkedIn Deep Dive** | Before important meeting | Manual lookup |
| **Exa Enrichment** | High-priority new contact | `exa-enrich.mjs` |
| **Project Mapping** | New project kickoff | Manual tagging |
| **Relationship Notes** | After significant interaction | GHL notes |

---

## Scripts & Commands

### Daily Operations

```bash
# Morning: What needs attention?
node scripts/relationship-health.mjs brief

# Review pending contacts
node scripts/contact-discovery.mjs review

# Check who's going dormant
node scripts/consolidate-contacts.mjs quality
```

### Weekly Maintenance

```bash
# Full relationship health update
node scripts/relationship-health.mjs update

# Link any new communications
node scripts/link-communications-to-contacts.mjs link

# Consolidate new identity records
node scripts/consolidate-contacts.mjs link

# Generate weekly report
node scripts/relationship-health.mjs report
```

### Ad-Hoc

```bash
# Enrich a specific contact
node scripts/exa-enrich.mjs "email@example.com"

# Find all contacts for a project
node scripts/contact-project-mapper.mjs "JusticeHub"

# Export segment for outreach
node scripts/export-segment.mjs --tags "partner,responsive"
```

---

## Ralph Enrichment Process (BUILT)

### Automated Weekly Enrichment

Ralph can run the full enrichment cycle weekly:

```bash
# Full enrichment cycle (runs all steps)
node scripts/contact-enrichment-cycle.mjs

# Brief only (just morning brief)
node scripts/contact-enrichment-cycle.mjs --brief-only
```

### What the Cycle Does

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `link-communications-to-contacts.mjs` | Connect emails to GHL contacts |
| 2 | `consolidate-contacts.mjs link` | Link identity records to GHL |
| 3 | `backfill-last-contact.mjs` | Update last_contact_date |
| 4 | `relationship-alerts.mjs brief` | Generate morning brief |
| 5 | `consolidate-contacts.mjs quality` | Show contacts needing attention |

### PRD for Ralph

See `ralph/prd-contact-enrichment.json` for the task definition.

### Scheduling

Add to cron for weekly runs:
```bash
# Every Monday at 7am
0 7 * * 1 cd /path/to/act-global-infrastructure && node scripts/contact-enrichment-cycle.mjs
```

---

## What to Build Next

### Phase 2: Discovery Pipeline (This Week)

```
┌─────────────────────────────────────────────────────────────┐
│                 CONTACT DISCOVERY FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Gmail Email ──▶ Is sender in GHL? ──▶ YES: Update comms    │
│                        │                                     │
│                        ▼ NO                                  │
│                 Is it a real person?                         │
│                 (not bounce/newsletter)                      │
│                        │                                     │
│                        ▼ YES                                 │
│                 Queue for review with:                       │
│                 - Extracted name/company                     │
│                 - Communication count                        │
│                 - Topics discussed                           │
│                 - Suggested priority                         │
│                        │                                     │
│                        ▼                                     │
│                 APPROVE ──▶ Create in GHL with tags         │
│                 IGNORE ──▶ Mark as noise                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Relationship Alerts (Next Week)

- **Going Cold Alert**: Contact hasn't been touched in X days (by segment)
- **Response Needed**: They replied, you haven't
- **Milestone Reminder**: Project deadline approaching, check in with stakeholders
- **Re-engagement Suggestion**: Dormant partner worth reviving

### Phase 4: Project-Contact Intelligence (Ongoing)

- AI-assisted mapping of contacts to projects
- "Who else should know about this?"
- Network visualization
- Warm intro suggestions

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Contacts in GHL | 847 | 1,200+ (add quality discovered) |
| Linked to communications | 472 | 800+ |
| Responsive contacts | 142 (17%) | 250+ (20%+) |
| Dormant partners re-engaged | ? | Track monthly |
| Time to review new contacts | ? | <24 hours |
| Relationships going cold (unnoticed) | Unknown | Zero |

---

## The Vision

> **Never lose a relationship because you forgot.**
>
> Every meaningful interaction captured. Every important contact tracked.
> Every relationship given the attention it deserves.
>
> The system tells you who needs you. You bring the human touch.

---

## Commands Reference

```bash
# STATUS & REPORTS
node scripts/consolidate-contacts.mjs status    # Contact landscape
node scripts/consolidate-contacts.mjs report    # Source breakdown
node scripts/consolidate-contacts.mjs quality   # Needs attention
node scripts/relationship-health.mjs brief      # Morning brief
node scripts/relationship-health.mjs health     # Full health check

# LINKING & ENRICHMENT
node scripts/consolidate-contacts.mjs link      # Link identities to GHL
node scripts/link-communications-to-contacts.mjs link  # Link comms

# DISCOVERY (to build)
node scripts/contact-discovery.mjs discover     # Find new contacts
node scripts/contact-discovery.mjs review       # Review pending
node scripts/contact-discovery.mjs create       # Add approved to GHL
```
