# GHL Sprint 2: Implementation Checklist

**Sprint:** Jan 5, 2026 (Completed in 1 day!)
**Objective:** Core GHL CRM infrastructure operational for ACT ecosystem
**Status:** ✅ COMPLETE

---

## Pre-Flight Checklist

Before starting, ensure you have:

- [ ] GHL account access (https://app.gohighlevel.com/)
- [ ] Domain for email (actstudio.org.au or similar)
- [ ] Domain DNS access for email verification
- [ ] Team member emails to invite
- [ ] ACT logo file (PNG, 500x500px minimum)
- [ ] This checklist open alongside GHL

---

## Day 1: Account Setup

### Morning (2-3 hours)

#### Account & Location Setup
- [ ] Log into GHL: https://app.gohighlevel.com/
- [ ] Navigate: Settings → Business Profile
- [ ] Configure:
  ```
  Business Name: ACT Regenerative Innovation Studio
  Address: [Physical address]
  State: Queensland
  Country: Australia
  Phone: [Main phone]
  Website: https://actstudio.org.au
  Timezone: Australia/Brisbane
  Currency: AUD
  ```
- [ ] Upload ACT logo
- [ ] Save settings

#### Team Member Setup
- [ ] Navigate: Settings → My Staff → Add User
- [ ] Add admin users with full access
- [ ] Add project coordinators with limited access
- [ ] Send all invitations
- [ ] Verify pending invitations visible

### Afternoon (2-3 hours)

#### Email Configuration
- [x] Email address created: `ghl@act.place` (Google Workspace)
- [x] DNS records added for `ghl.act.place` subdomain
- [x] Domain verified: `ghl.act.place` ✅
- [x] SSL Issued ✅
- [x] Domain warmup started (Stage 1)
- [x] Set `ghl.act.place` as default for all email types ✅
- [ ] Add From Name: `ACT Team`
- [ ] Add From Email: `ghl@act.place`

**Email Strategy:**
- `ghl.act.place` - Dedicated sending domain (verified)
- `ghl@act.place` - From address for CRM emails
- `hi@act.place` - Reply-to for human responses (optional)

#### End of Day 1
- [x] Business profile complete ✅
- [ ] Team members invited (optional - can do later)
- [x] Email domain verified ✅
- [ ] Fill in Authorized Representative section
- [ ] Screenshot progress for documentation

---

## Day 2: Tags & Custom Fields

### Morning: Tags (2-3 hours)

#### Base Project Tags (7)
Copy-paste these tag names:
```
empathy-ledger
justicehub
the-harvest
act-farm
goods-on-country
bcv-residencies
act-studio
```

#### Role Tags (13)
```
role:elder
role:storyteller
role:volunteer
role:artist
role:service-provider
role:family
role:researcher
role:donor
role:partner
role:vendor
role:leader
role:tenant
role:resident
```

#### Engagement Tags (6)
```
engagement:lead
engagement:prospect
engagement:active
engagement:alumni
engagement:lapsed
engagement:opted-out
```

#### Interest Tags (12)
```
interest:volunteering
interest:storytelling
interest:conservation
interest:art
interest:justice-reform
interest:circular-economy
interest:events
interest:workshops
interest:residencies
interest:research
interest:funding
interest:donating
```

#### Action Tags (12)
```
action:attended-event
action:submitted-story
action:completed-volunteer-orientation
action:donated
action:applied-grant
action:registered-workshop
action:booked-residency
action:referred-friend
action:opened-email
action:clicked-link
action:replied-to-email
action:attended-webinar
```

#### Priority Tags (3)
```
priority:high
priority:urgent
priority:cultural-protocol
```

#### Cultural Tags (5)
```
cultural:kabi-kabi
cultural:jinibara
cultural:indigenous
cultural:elder-review-required
cultural:sacred-knowledge
```

#### Campaign Tags (5+)
```
campaign:contained
campaign:ai-consent
campaign:harvest-festival
campaign:fundraising-2026
campaign:newsletter-jan-2026
```

**Checkpoint:** 63+ tags created

### Afternoon: Custom Fields (3-4 hours)

#### Core Contact Fields (10)
| Field Name | Type | Options |
|------------|------|---------|
| preferred_name | Single Line Text | - |
| pronouns | Dropdown | he/him, she/her, they/them, other, prefer not to say |
| indigenous_status | Dropdown | Aboriginal, Torres Strait Islander, Both, Non-Indigenous, Prefer not to say |
| cultural_protocols | Multi-line Text | - |
| accessibility_needs | Multi-line Text | - |
| communication_preference | Dropdown | Email, SMS, Phone call, Mail |
| best_contact_time | Dropdown | Morning, Afternoon, Evening, Anytime |
| emergency_contact_name | Single Line Text | - |
| emergency_contact_phone | Phone | - |
| how_did_you_hear | Dropdown | Friend referral, Social media, Event, Website, Partner org, News/media, Other |

#### Empathy Ledger Fields (6)
| Field Name | Type | Options |
|------------|------|---------|
| supabase_user_id | Single Line Text | - |
| storyteller_status | Dropdown | Inquiry, Profile Complete, Active (3+ stories), Alumni |
| stories_count | Number | - |
| consent_status | Dropdown | Full consent, Partial consent, No consent |
| ai_processing_consent | Dropdown | Yes, No, Pending |
| elder_review_required | Checkbox | - |

#### JusticeHub Fields (4)
| Field Name | Type |
|------------|------|
| family_support_needs | Multi-line Text |
| service_provider_type | Dropdown |
| contained_leader_status | Dropdown |
| incarceration_connection | Dropdown |

#### The Harvest Fields (6)
| Field Name | Type |
|------------|------|
| volunteer_interests | Multi-select |
| volunteer_hours_total | Number |
| volunteer_orientation_completed | Checkbox |
| membership_level | Dropdown |
| membership_expiry_date | Date |
| dietary_preferences | Multi-line Text |

#### ACT Farm Fields (5)
| Field Name | Type |
|------------|------|
| residency_type | Dropdown |
| residency_dates | Single Line Text |
| research_focus | Multi-line Text |
| ndis_participant | Checkbox |
| ndis_number | Single Line Text |

#### Goods on Country Fields (2)
| Field Name | Type |
|------------|------|
| goods_interest | Dropdown |
| business_type | Single Line Text |

#### BCV Residencies Fields (3)
| Field Name | Type |
|------------|------|
| artistic_medium | Single Line Text |
| portfolio_url | URL |
| residency_proposal | Multi-line Text |

#### Grants/Funding Fields (5)
| Field Name | Type |
|------------|------|
| grant_application_status | Dropdown |
| grant_name | Single Line Text |
| grant_amount | Currency |
| grant_deadline | Date |
| grant_reporting_due | Date |

#### Donation Fields (5)
| Field Name | Type |
|------------|------|
| lifetime_donation_value | Currency |
| first_donation_date | Date |
| last_donation_date | Date |
| donation_frequency | Dropdown |
| donation_method | Dropdown |

**Checkpoint:** 46 custom fields created

---

## Day 3: Priority Pipelines

### Morning: Universal Inquiry + Grants (3-4 hours)

#### Pipeline 1: Universal Inquiry Pipeline

**Stages:**
1. New Inquiry (Gray) - Auto: Send welcome email
2. Needs Assessment (Yellow)
3. Routed to Project (Green) - Auto: Add to project pipeline
4. Out of Scope (Red) - Auto: Send referral email

**Workflow: Universal Inquiry Auto Response**
- Trigger: Stage 1 (New Inquiry)
- Action 1: Send thank you email
- Action 2: Internal notification to team

#### Pipeline 2: Grants & Funding Pipeline

**Stages:**
1. Grant Opportunity Identified (Gray)
2. Application In Progress (Yellow) - Auto: Set deadline reminder
3. Grant Submitted (Blue)
4. Grant Awarded (Green) ✓ WON - Auto: Celebration email
5. Grant Reporting Due (Orange)
6. Grant Report Submitted (Green)
7. Grant Declined (Red) ✓ LOST

**Workflows:**
- Grant Deadline - 7 Day Reminder
- Grant Awarded - Celebration & Reporting Setup

### Afternoon: Donors Pipeline (3-4 hours)

#### Pipeline 3: Supporters & Donors Pipeline

**Stages:**
1. First Donation (Gold) ✓ WON - Auto: Thank you sequence
2. Second Donation (Gold) ✓ WON - Auto: Deeper thank you
3. Regular Donor 3+ (Gold) ✓ WON - Auto: VIP treatment
4. Major Donor $1000+ (Dark Gold) ✓ WON - Auto: Personal call
5. Legacy Donor $5000+ (Purple) ✓ WON - Auto: Executive meeting
6. Lapsed Donor 12+ months (Orange) - Auto: Win-back campaign

**Workflows:**
- First Donation Thank You Sequence
- Lapsed Donor Win-Back Campaign

**Checkpoint:** 3 pipelines, 8+ workflows created

---

## Day 4: Essential Forms

### Forms to Create

#### Form 1: General Contact Form
- Name (required)
- Email (required)
- Phone (optional)
- Project interest (dropdown)
- Message (required)
- How did you hear about us (dropdown)
→ Route to: Universal Inquiry Pipeline, Stage 1

#### Form 2: Donation Form
- Name (required)
- Email (required)
- Amount (dropdown or custom)
- Project designation (dropdown)
- Recurring? (checkbox)
- Payment method (Stripe integration)
→ Route to: Supporters & Donors Pipeline, Stage 1

#### Form 3: Newsletter Signup Form
- Name
- Email (required)
- Interests (multi-select)
→ Add tags: engagement:lead, interest:[selected]

#### Form 4: Volunteer Application Form
- Name (required)
- Email (required)
- Phone (required)
- Volunteer interests (multi-select)
- Availability (checkboxes)
- Emergency contact
- Accessibility needs
→ Route to: Future Volunteer Pipeline

**Checkpoint:** 4 forms created

---

## Day 5: Testing & Team Training

### Testing Checklist

- [ ] Create test contact manually
- [ ] Verify tags can be added
- [ ] Move contact through pipeline stages
- [ ] Verify automations trigger (emails sent)
- [ ] Submit each form with test data
- [ ] Verify contacts created with correct tags
- [ ] Check workflow history for scheduled actions

### Team Training

- [ ] Schedule 30-min team walkthrough
- [ ] Demo: How to view contacts
- [ ] Demo: How to move pipeline stages
- [ ] Demo: How to send manual emails
- [ ] Q&A session
- [ ] Document any questions/issues

### Documentation

- [ ] Screenshot all pipelines
- [ ] Screenshot tag list
- [ ] Screenshot custom fields
- [ ] Update Notion with progress
- [ ] Note any deviations from plan

---

## Success Metrics

**Technical:**
- [ ] Can create contact manually
- [ ] Can add tags and custom fields
- [ ] Can move contact through pipeline
- [ ] Automation triggers on stage change
- [ ] Form submission creates tagged contact

**Team:**
- [ ] 2-3 team members have logged in
- [ ] 1+ team member can navigate basic features
- [ ] Team understands GHL vs Notion distinction

**Strategic:**
- [ ] Understand Single Source of Truth architecture
- [ ] Ready for Week 2 (SaaS sales pipeline)

---

## Troubleshooting

**Email not sending:**
- Check email domain verification
- Check template syntax ({{contact.first_name}})
- Send test email from settings

**Workflow not triggering:**
- Verify workflow is Published (not Draft)
- Check trigger conditions match exactly
- Create test contact and move manually

**Custom field not showing:**
- Check "Show on" settings
- Verify field name exact (case-sensitive)
- Refresh page

**Support:**
- GHL Support: https://support.gohighlevel.com/
- GHL Community: https://community.gohighlevel.com/
- Claude Code: `/ghl-crm-advisor [question]`

---

## Week 2 Preview

After completing Week 1, Week 2 focuses on:

1. **Empathy Ledger SaaS Sales Pipeline** (HIGHEST PRIORITY)
   - Target: 30 customers Year 1
   - Revenue: $800k Year 1 → $2.5M Year 3

2. **JusticeHub Consulting Pipeline**
   - Revenue: $300k-$700k

3. **Project-Specific Pipelines**
   - Storyteller Journey
   - Family Support
   - Residency Applications

---

---

## What Was Built

### Day 1: Account Setup ✅
- Business profile configured
- Email domain `ghl.act.place` verified with SSL
- Domain warmup initiated

### Day 2: Tags & Custom Fields ✅
- 63+ tags created across 8 categories (project, role, engagement, interest, action, priority, cultural, campaign)
- 20 core custom fields (remaining deferred for later)

### Day 3: Pipelines ✅
- Universal Inquiry (4 stages)
- Grants & Funding (7 stages)
- Supporters & Donors (6 stages)

### Day 4: Forms ✅
- General Contact Form
- Newsletter Signup
- Volunteer Application
- Donation Form

### Day 5: Workflows ✅
- Contact Form → Pipeline + Tag + Notification
- Newsletter Signup → Tags + Welcome Email
- Volunteer Application → Tags + Notification + Email
- Donation Form → Tags + Pipeline + Thank You
- Grant Deadline Reminder → 7-day notification

---

## Next Steps (Future Sprints)
- [ ] Create "wow" HTML email templates with ACT branding
- [ ] Add remaining 26 custom fields as needed
- [ ] Build project-specific pipelines (Empathy Ledger SaaS, JusticeHub)
- [ ] Connect Stripe for donation processing
- [ ] Embed forms on ACT websites
- [ ] Run Supabase sync schema and test GHL ↔ Supabase sync

---

*Completed: 2026-01-05*
*Reference: GHL_WEEK1_IMPLEMENTATION_COMPANION.md*
