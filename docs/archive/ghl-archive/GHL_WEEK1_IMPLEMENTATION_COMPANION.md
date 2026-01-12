# GHL Week 1 Implementation Companion Guide

**Status:** Ready to build
**Timeline:** 5 days (8 hours/day)
**Goal:** Core GHL infrastructure operational for daily use

---

## 🚀 Before You Begin

### Prerequisites Checklist

- [ ] GHL account created (https://app.gohighlevel.com/)
- [ ] Admin access credentials saved securely
- [ ] Domain for email verified (actstudio.org.au or similar)
- [ ] Team member emails collected
- [ ] This document open in one window, GHL in another

### Pro Tips for Week 1

1. **Copy-paste everything** - Don't retype field names or tag names (prevents typos)
2. **Use two monitors** - This guide on one screen, GHL on the other
3. **Take screenshots** - Document your progress for team training
4. **Test as you build** - Don't wait until Friday to test forms/workflows
5. **Invite team early** - Day 1 afternoon, so they can watch you build

---

## DAY 1: ACCOUNT SETUP

### Morning Block (9am-1pm)

#### Step 1: Account & Location Setup (30 min)

**Navigate to:** https://app.gohighlevel.com/

**If creating new account:**
1. Sign up with primary admin email
2. Choose plan: **Agency Pro** (recommended for unlimited contacts)
3. Enter payment method
4. Verify email

**If account exists:**
1. Log in
2. Click **Settings** (gear icon, bottom left sidebar)
3. Click **Business Profile**

**Configure Business Profile:**

```
Business Name: ACT Regenerative Innovation Studio
Legal Business Name: [Your legal entity name]
Address: [Your physical address]
City: [Your city]
State: Queensland
Postal Code: [Your postal code]
Country: Australia
Phone: [Your main phone number]
Website: https://actstudio.org.au
Timezone: Australia/Brisbane
Currency: AUD
```

**Upload Logo:**
- Click "Upload Logo"
- File: ACT logo (PNG, 500x500px minimum)
- Click "Save"

✅ **Checkpoint:** Business profile complete, logo visible

---

#### Step 2: Team Member Setup (1 hour)

**Navigate to:** Settings → My Staff → Add User

**Add each team member with these roles:**

**Admin Users** (full access):
```
Name: [Your name]
Email: [Your email]
Role: Admin
Permissions: All enabled
```

**Project Coordinators** (per-project access):
```
Name: [Coordinator name]
Email: [Email]
Role: User
Permissions:
  ✓ Contacts (view, edit, delete)
  ✓ Conversations (view, reply)
  ✓ Opportunities (view, edit)
  ✓ Calendars (view, edit)
  ✓ Reporting (view only)
  ✗ Settings (no access)
  ✗ Billing (no access)
```

**Volunteer Coordinators** (limited access):
```
Name: [Volunteer coordinator]
Email: [Email]
Role: User
Permissions:
  ✓ Contacts (view, edit - for The Harvest volunteers only)
  ✓ Conversations (view, reply)
  ✗ Opportunities (no access)
  ✗ Settings (no access)
```

**How to invite:**
1. Click "Add User"
2. Enter name, email
3. Select role
4. Configure permissions (checkboxes)
5. Click "Send Invitation"
6. Team member receives email with login link

✅ **Checkpoint:** All team members invited, can see pending invitations

---

#### Step 3: Lunch Break (1 hour)

🍽️ **While you're away:** Team members accept invitations, log in, explore interface

---

### Afternoon Block (2pm-6pm)

#### Step 4: Email Configuration (2 hours)

**Navigate to:** Settings → Email Services

**Option A: Use GHL Email (Quick Start)**
- Default sending address: `noreply@msgsndr.com`
- Deliverability: Good for transactional emails
- Setup time: 0 minutes
- **Use this if:** You want to start immediately

**Option B: Custom Domain Email (Recommended)**
- Sending address: `hello@actstudio.org.au`
- Deliverability: Better (your brand, better open rates)
- Setup time: 30-60 minutes
- **Use this if:** You have domain access

**If choosing Option B, follow these steps:**

1. **In GHL:** Settings → Email Services → Connect Custom Domain

2. **Domain:** `actstudio.org.au`

3. **GHL provides DNS records to add:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.msgsndr.com ~all
TTL: 3600

Type: TXT
Name: ghl._domainkey
Value: [GHL provides this - copy exactly]
TTL: 3600

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@actstudio.org.au
TTL: 3600
```

4. **In your domain registrar** (Cloudflare, Namecheap, etc.):
   - Log in to DNS settings
   - Add each TXT record above
   - Save changes

5. **Back in GHL:** Click "Verify Domain"
   - Status: "Pending" (takes 5-60 minutes)
   - Refresh page until status: "Verified" ✅

6. **Test email delivery:**
   - Settings → Email Services → Send Test Email
   - Enter your personal email
   - Check inbox (and spam folder)
   - Email should arrive with "From: ACT Regenerative Innovation Studio <hello@actstudio.org.au>"

✅ **Checkpoint:** Test email received, sender shows your domain

---

#### Step 5: Phone Setup (1 hour) - OPTIONAL

**Navigate to:** Settings → Phone Numbers

**Option 1: Purchase GHL Number (Easiest)**
1. Click "Buy Number"
2. Search by area code or city
3. Select number
4. Monthly cost: ~$3-5 USD
5. Configure:
   - Forward to: [Your mobile]
   - Voicemail: Enabled
   - SMS: Enabled
   - Recording: Enabled (for volunteer callbacks)

**Option 2: Use Existing Number**
1. If you already have a business number
2. Set up call forwarding to GHL
3. More complex - skip for Week 1

**Option 3: Skip for Now**
- You can always add phone later
- Email-first approach is fine for most ACT projects
- **Recommendation:** Skip unless doing phone-heavy campaigns

✅ **Checkpoint:** Phone configured OR decision to skip documented

---

#### Step 6: Integrations Overview (30 min)

**Navigate to:** Settings → Integrations

**DO NOT configure these yet** - just familiarize yourself with what's available:

**Available Integrations:**
- ✅ **Stripe** - Payment processing (configure Week 2 Day 3)
- ✅ **Zapier** - Connect to 5000+ apps (configure Week 3)
- ✅ **Webhooks** - Custom integrations with Supabase, Notion (configure Week 3)
- ✅ **Google Calendar** - Sync appointments (configure Week 2 Day 4)
- ✅ **Facebook/Instagram** - Lead ads sync (configure Month 2)
- ⚠️ **API Access** - For developers (configure Month 2)

**Action for today:** Just screenshot the Integrations page for reference

✅ **Checkpoint:** Integrations page screenshotted, saved to Notion

---

#### Step 7: End of Day 1 Review (30 min)

**Team Huddle** (if team is available):
- Screen share: Walk through GHL interface
- Show: Where contacts live, pipelines, settings
- Q&A: 10 minutes
- Tomorrow's plan: "We're building tags and custom fields - the foundation"

**Solo Check-in** (if working alone):
- [ ] Account set up ✅
- [ ] Business profile complete ✅
- [ ] Team invited ✅
- [ ] Email configured ✅
- [ ] Phone configured or decision to skip ✅
- [ ] Integrations reviewed ✅

**Update Notion:**
- Create page: "GHL Implementation Progress"
- Day 1 status: Complete ✅
- Blockers: [None OR list any issues]
- Day 2 prep: Review tag list, custom field list

---

## DAY 2: TAGS & CUSTOM FIELDS

### Morning Block (9am-1pm) - TAG CREATION

#### Step 1: Navigate to Tags (5 min)

**Path:** Settings → Tags → Create Tag

**Pro Tips:**
- Tags are case-sensitive: "empathy-ledger" ≠ "Empathy-Ledger"
- Use lowercase with hyphens (easier to type, consistent)
- Copy tag names from this document (don't retype)

---

#### Step 2: Create Base Project Tags (15 min)

**Copy-paste these tag names one by one:**

1. Click "Create Tag"
2. Tag Name: `empathy-ledger`
3. Color: Purple (for visual distinction)
4. Click "Save"
5. Repeat for each tag below

**Base Project Tags:**
```
empathy-ledger (Purple)
justicehub (Blue)
the-harvest (Green)
act-farm (Brown)
goods-on-country (Teal)
bcv-residencies (Orange)
act-studio (Gray - for general/multi-project)
```

✅ **Checkpoint:** 7 base project tags created

---

#### Step 3: Create Role Tags (20 min)

**Tag Name Pattern:** `role:[descriptor]`

**Why the prefix?** Makes filtering easier - search "role:" to see all role tags

**Copy-paste these:**
```
role:elder (Purple - cultural significance)
role:storyteller (Purple)
role:volunteer (Green)
role:artist (Orange)
role:service-provider (Blue)
role:family (Blue)
role:researcher (Gray)
role:donor (Gold)
role:partner (Gray)
role:vendor (Gray)
role:leader (Blue - JusticeHub CONTAINED)
role:tenant (Green - The Harvest)
role:resident (Brown - ACT Farm residencies)
```

✅ **Checkpoint:** 13 role tags created (20 total tags)

---

#### Step 4: Create Engagement Tags (15 min)

**These track relationship status:**

```
engagement:lead (Gray - new contact, not engaged)
engagement:prospect (Yellow - shown interest)
engagement:active (Green - currently involved)
engagement:alumni (Blue - past participant, good relationship)
engagement:lapsed (Orange - inactive 6+ months)
engagement:opted-out (Red - unsubscribed)
```

**How these auto-update:**
- Week 2: You'll build workflows that automatically change tags based on behavior
- Example: Email opened → Change from "lead" to "prospect"

✅ **Checkpoint:** 6 engagement tags created (26 total)

---

#### Step 5: Create Interest Tags (20 min)

**What they're interested in (not necessarily participating yet):**

```
interest:volunteering (Green)
interest:storytelling (Purple)
interest:conservation (Brown)
interest:art (Orange)
interest:justice-reform (Blue)
interest:circular-economy (Teal)
interest:events (Yellow)
interest:workshops (Yellow)
interest:residencies (Brown)
interest:research (Gray)
interest:funding (Gold)
interest:donating (Gold)
```

✅ **Checkpoint:** 12 interest tags created (38 total)

---

#### Step 6: Create Action Tags (20 min)

**Track specific behaviors:**

```
action:attended-event (Yellow)
action:submitted-story (Purple)
action:completed-volunteer-orientation (Green)
action:donated (Gold)
action:applied-grant (Gray)
action:registered-workshop (Yellow)
action:booked-residency (Brown)
action:referred-friend (Pink)
action:opened-email (Gray - auto-applied by workflows)
action:clicked-link (Gray - auto-applied)
action:replied-to-email (Green - auto-applied)
action:attended-webinar (Yellow)
```

✅ **Checkpoint:** 12 action tags created (50 total)

---

#### Step 7: Create Priority Tags (10 min)

**For urgent attention:**

```
priority:high (Red - VIP, major donor, cultural leader)
priority:urgent (Red - time-sensitive response needed)
priority:cultural-protocol (Purple - requires Elder review)
```

**When to use:**
- `priority:high` - State MPs, major funders, Elders, key partners
- `priority:urgent` - Grant deadlines, event RSVPs, crisis situations
- `priority:cultural-protocol` - Any Indigenous knowledge requiring Elder review

✅ **Checkpoint:** 3 priority tags created (53 total)

---

#### Step 8: Create Cultural Tags (10 min)

**IMPORTANT:** Handle with cultural respect and data sovereignty

```
cultural:kabi-kabi (Purple)
cultural:jinibara (Purple)
cultural:indigenous (Purple - general, when specific nation not known)
cultural:elder-review-required (Purple - story/content needs Elder approval)
cultural:sacred-knowledge (Red - NEVER share without explicit consent)
```

**Data Sovereignty Note:**
- These tags in GHL are **high-level only**
- Detailed cultural data stays in Empathy Ledger Supabase (never syncs to GHL)
- GHL gets read-only flags for workflow routing

✅ **Checkpoint:** 5 cultural tags created (58 total)

---

#### Step 9: Create Campaign Tags (15 min)

**Project-specific campaigns:**

```
campaign:contained (Blue - JusticeHub leader engagement)
campaign:ai-consent (Purple - Empathy Ledger AI processing consent drive)
campaign:harvest-festival (Green - annual festival)
campaign:fundraising-2026 (Gold - annual fundraising campaign)
campaign:newsletter-jan-2026 (Gray - monthly newsletter tracking)
```

**Create monthly newsletter tags:**
```
campaign:newsletter-feb-2026
campaign:newsletter-mar-2026
... (create as needed each month)
```

**Or use dynamic tagging:** Week 3 you'll learn to auto-tag newsletter sends

✅ **Checkpoint:** 5+ campaign tags created (63+ total)

---

#### Step 10: Review All Tags (10 min)

**Navigate to:** Settings → Tags → View All

**Verify categories:**
- [ ] 7 base project tags (empathy-ledger through act-studio)
- [ ] 13 role tags (role:elder through role:resident)
- [ ] 6 engagement tags (engagement:lead through engagement:opted-out)
- [ ] 12 interest tags (interest:volunteering through interest:donating)
- [ ] 12 action tags (action:attended-event through action:attended-webinar)
- [ ] 3 priority tags (priority:high, urgent, cultural-protocol)
- [ ] 5 cultural tags (cultural:kabi-kabi through cultural:sacred-knowledge)
- [ ] 5+ campaign tags

**Total:** 63+ tags ✅

**Screenshot:** Save tag list to Notion for team reference

---

### Lunch Break (1pm-2pm)

🍽️ **Reflection:** Half the foundation is built. After lunch: Custom fields (the other half)

---

### Afternoon Block (2pm-6pm) - CUSTOM FIELDS

#### Step 11: Navigate to Custom Fields (5 min)

**Path:** Settings → Custom Fields

**What are custom fields?**
- Extra data points beyond name/email/phone
- Examples: Pronouns, volunteer interests, residency dates, grant amounts
- Used in forms, workflows, reporting

**Types of fields:**
- **Single Line Text:** Short answers (e.g., preferred name)
- **Multi-line Text:** Long answers (e.g., research focus)
- **Dropdown:** Single choice (e.g., membership level)
- **Multi-select:** Multiple choices (e.g., volunteer interests)
- **Number:** Numeric values (e.g., volunteer hours)
- **Currency:** Dollar amounts (e.g., grant amount)
- **Date:** Dates (e.g., membership expiry)
- **Checkbox:** Yes/no (e.g., NDIS participant)
- **Phone:** Phone numbers (beyond primary contact phone)
- **Email:** Email addresses (beyond primary contact email)
- **URL:** Website links (e.g., portfolio URL)

---

#### Step 12: Create Core Contact Fields (30 min)

**Click:** Create Custom Field

**For each field below:**
1. Field Name: [exact name below]
2. Field Type: [type specified]
3. Placeholder Text: [helpful hint for team]
4. Required: No (unless specified)
5. Click "Save"

---

**Field 1:**
```
Field Name: preferred_name
Field Type: Single Line Text
Placeholder: If different from legal name (e.g., "Alex" instead of "Alexander")
Show on: Contact Details, Forms
```

**Field 2:**
```
Field Name: pronouns
Field Type: Dropdown
Options:
  - he/him
  - she/her
  - they/them
  - other
  - prefer not to say
Placeholder: Select pronouns
Show on: Contact Details
```

**Field 3:**
```
Field Name: indigenous_status
Field Type: Dropdown
Options:
  - Aboriginal
  - Torres Strait Islander
  - Both Aboriginal and Torres Strait Islander
  - Non-Indigenous
  - Prefer not to say
Placeholder: For cultural protocol purposes only
Show on: Contact Details (visible only to admins for privacy)
```

**Field 4:**
```
Field Name: cultural_protocols
Field Type: Multi-line Text
Placeholder: Notes about Elder authority, consent requirements, sacred knowledge
Show on: Contact Details
```

**Field 5:**
```
Field Name: accessibility_needs
Field Type: Multi-line Text
Placeholder: Mobility, sensory, cognitive, dietary, or other needs
Show on: Contact Details, Event forms
```

**Field 6:**
```
Field Name: communication_preference
Field Type: Dropdown
Options:
  - Email (default)
  - SMS
  - Phone call
  - Mail (postal)
Placeholder: How they prefer to hear from us
Show on: Contact Details
```

**Field 7:**
```
Field Name: best_contact_time
Field Type: Dropdown
Options:
  - Morning (9am-12pm)
  - Afternoon (12pm-5pm)
  - Evening (5pm-8pm)
  - Anytime
Placeholder: When to call/reach out
Show on: Contact Details
```

**Field 8:**
```
Field Name: emergency_contact_name
Field Type: Single Line Text
Placeholder: Full name of emergency contact
Show on: Volunteer forms, Residency forms, Event forms (certain events)
```

**Field 9:**
```
Field Name: emergency_contact_phone
Field Type: Phone
Placeholder: Emergency contact's phone number
Show on: Volunteer forms, Residency forms
```

**Field 10:**
```
Field Name: how_did_you_hear
Field Type: Dropdown
Options:
  - Friend referral
  - Social media
  - Event
  - Website
  - Partner organization
  - News/media
  - Other
Placeholder: How did you find us?
Show on: All forms
```

✅ **Checkpoint:** 10 core contact fields created

---

#### Step 13: Create Empathy Ledger Fields (20 min)

**Field 11:**
```
Field Name: supabase_user_id
Field Type: Single Line Text
Placeholder: Auto-synced from Empathy Ledger database
Show on: Contact Details (admin only - for sync tracking)
```

**Field 12:**
```
Field Name: storyteller_status
Field Type: Dropdown
Options:
  - Inquiry
  - Profile Complete
  - Active (3+ stories)
  - Alumni (inactive 6+ months)
Placeholder: Current status in storyteller journey
Show on: Contact Details
```

**Field 13:**
```
Field Name: stories_count
Field Type: Number
Placeholder: Total stories shared (auto-synced from Supabase)
Show on: Contact Details, Reporting
```

**Field 14:**
```
Field Name: consent_status
Field Type: Dropdown
Options:
  - Full consent (all uses)
  - Partial consent (specific uses only)
  - No consent (private/restricted)
Placeholder: Story sharing permissions
Show on: Contact Details, Storyteller forms
```

**Field 15:**
```
Field Name: ai_processing_consent
Field Type: Dropdown
Options:
  - Yes (consents to AI summarization, analysis)
  - No (opt-out of AI processing)
  - Pending (not yet asked)
Placeholder: AI Consent Campaign tracking
Show on: Contact Details
```

**Field 16:**
```
Field Name: elder_review_required
Field Type: Checkbox
Placeholder: ✓ if content requires Elder review before publishing
Show on: Contact Details (triggers workflow for Elder approval)
```

✅ **Checkpoint:** 6 Empathy Ledger fields created (16 total fields)

---

#### Step 14: Create JusticeHub Fields (15 min)

**Field 17:**
```
Field Name: family_support_needs
Field Type: Multi-line Text
Placeholder: What support is this family seeking? (private, handle with care)
Show on: Contact Details, Family support forms
```

**Field 18:**
```
Field Name: service_provider_type
Field Type: Dropdown
Options:
  - Legal services
  - Mental health
  - Housing support
  - Employment services
  - Education programs
  - Healthcare
  - Family counseling
  - Other
Placeholder: Type of service provided
Show on: Service provider forms
```

**Field 19:**
```
Field Name: contained_leader_status
Field Type: Dropdown
Options:
  - Nominated (by community member)
  - Contacted (outreach sent)
  - Booked (confirmed for panel/event)
  - Attended (participated)
  - Advocate (ongoing relationship)
Placeholder: CONTAINED campaign journey stage
Show on: Contact Details
```

**Field 20:**
```
Field Name: incarceration_connection
Field Type: Dropdown
Options:
  - Personal experience (lived experience)
  - Family member currently/formerly incarcerated
  - Professional (lawyer, social worker, etc.)
  - Advocate/ally
  - Prefer not to say
Placeholder: Connection to justice system (handle with sensitivity)
Show on: Contact Details (admin only for privacy)
```

✅ **Checkpoint:** 4 JusticeHub fields created (20 total fields)

---

#### Step 15: Create The Harvest Fields (20 min)

**Field 21:**
```
Field Name: volunteer_interests
Field Type: Multi-select
Options:
  - Gardening & land care
  - Events & festivals
  - Admin & office support
  - Kitchen & food prep
  - Maintenance & repairs
  - Teaching & workshops
  - Childcare
  - Other
Placeholder: What volunteer roles interest you?
Show on: Volunteer forms
```

**Field 22:**
```
Field Name: volunteer_hours_total
Field Type: Number
Placeholder: Total volunteer hours contributed (for reporting, grants)
Show on: Contact Details, Reporting
```

**Field 23:**
```
Field Name: volunteer_orientation_completed
Field Type: Checkbox
Placeholder: ✓ if completed orientation session
Show on: Contact Details (unlocks certain volunteer opportunities)
```

**Field 24:**
```
Field Name: membership_level
Field Type: Dropdown
Options:
  - Community Member ($50/year)
  - Supporter ($100/year)
  - Sustainer ($150/year)
  - Patron ($200/year)
  - Corporate Partner ($2000/year)
Placeholder: Current membership tier
Show on: Contact Details, Membership forms
```

**Field 25:**
```
Field Name: membership_expiry_date
Field Type: Date
Placeholder: When membership renews (triggers renewal email workflow)
Show on: Contact Details
```

**Field 26:**
```
Field Name: dietary_preferences
Field Type: Multi-line Text
Placeholder: Allergies, restrictions, preferences (for events with food)
Show on: Event registration forms
```

✅ **Checkpoint:** 6 The Harvest fields created (26 total fields)

---

#### Step 16: Create ACT Farm Fields (15 min)

**Field 27:**
```
Field Name: residency_type
Field Type: Dropdown
Options:
  - R&D Residency (research & development)
  - Creative Residency (artists, writers)
  - Wellbeing Residency (therapists, healers)
  - Research Partnership (university, institutional)
Placeholder: Type of residency
Show on: Residency forms
```

**Field 28:**
```
Field Name: residency_dates
Field Type: Single Line Text
Placeholder: e.g., "March 15-22, 2026" (for display, not workflow triggers)
Show on: Contact Details, Residency forms
```

**Field 29:**
```
Field Name: research_focus
Field Type: Multi-line Text
Placeholder: What are you researching/creating during your residency?
Show on: Residency application forms
```

**Field 30:**
```
Field Name: ndis_participant
Field Type: Checkbox
Placeholder: ✓ if NDIS participant (for June's Patch healthcare program)
Show on: Contact Details, Residency forms
```

**Field 31:**
```
Field Name: ndis_number
Field Type: Single Line Text
Placeholder: NDIS participant number (for billing - store securely)
Show on: Contact Details (admin only - privacy)
```

✅ **Checkpoint:** 5 ACT Farm fields created (31 total fields)

---

#### Step 17: Create Goods on Country Fields (10 min)

**Field 32:**
```
Field Name: goods_interest
Field Type: Dropdown
Options:
  - Products (customer)
  - Partnerships (business collaboration)
  - Volunteering (circular economy projects)
  - Wholesale (retailer/distributor)
Placeholder: How do you want to engage with Goods?
Show on: Goods contact forms
```

**Field 33:**
```
Field Name: business_type
Field Type: Single Line Text
Placeholder: e.g., "Cafe", "Retail store", "Online marketplace"
Show on: Business partnership forms
```

✅ **Checkpoint:** 2 Goods fields created (33 total fields)

---

#### Step 18: Create BCV Residencies Fields (10 min)

**Field 34:**
```
Field Name: artistic_medium
Field Type: Single Line Text
Placeholder: e.g., "Painting", "Sculpture", "Performance", "Digital art"
Show on: Artist residency forms
```

**Field 35:**
```
Field Name: portfolio_url
Field Type: URL
Placeholder: Link to your portfolio, website, or Instagram
Show on: Artist residency forms
```

**Field 36:**
```
Field Name: residency_proposal
Field Type: Multi-line Text
Placeholder: What do you plan to create/explore during your residency?
Show on: Artist residency application forms
```

✅ **Checkpoint:** 3 BCV fields created (36 total fields)

---

#### Step 19: Create Grants/Funding Fields (20 min)

**Field 37:**
```
Field Name: grant_application_status
Field Type: Dropdown
Options:
  - Inquiry (researching eligibility)
  - Applied (submitted application)
  - Awarded (won grant!)
  - Declined (not successful)
  - Reporting (grant active, reporting phase)
Placeholder: Where in grant lifecycle?
Show on: Grants Pipeline
```

**Field 38:**
```
Field Name: grant_name
Field Type: Single Line Text
Placeholder: e.g., "Queensland Community Foundation - Arts Grant"
Show on: Grants Pipeline, Contact Details
```

**Field 39:**
```
Field Name: grant_amount
Field Type: Currency
Placeholder: $ amount requested or awarded
Show on: Grants Pipeline (for revenue tracking)
```

**Field 40:**
```
Field Name: grant_deadline
Field Type: Date
Placeholder: Application deadline (triggers reminder workflow)
Show on: Grants Pipeline
```

**Field 41:**
```
Field Name: grant_reporting_due
Field Type: Date
Placeholder: When final report is due (triggers reminder workflow)
Show on: Grants Pipeline
```

✅ **Checkpoint:** 5 Grants fields created (41 total fields)

---

#### Step 20: Create Donation Fields (15 min)

**Field 42:**
```
Field Name: lifetime_donation_value
Field Type: Currency
Placeholder: Total $ donated since first donation (auto-calculated)
Show on: Contact Details, Donor reports
```

**Field 43:**
```
Field Name: first_donation_date
Field Type: Date
Placeholder: Date of first donation (for anniversary emails)
Show on: Contact Details
```

**Field 44:**
```
Field Name: last_donation_date
Field Type: Date
Placeholder: Most recent donation (for lapsed donor detection)
Show on: Contact Details
```

**Field 45:**
```
Field Name: donation_frequency
Field Type: Dropdown
Options:
  - One-time
  - Monthly recurring
  - Quarterly recurring
  - Annual recurring
Placeholder: Donation pattern
Show on: Contact Details, Donor forms
```

**Field 46:**
```
Field Name: donation_method
Field Type: Dropdown
Options:
  - Credit card (Stripe)
  - Bank transfer
  - Cash
  - In-kind (goods/services)
Placeholder: How did they donate?
Show on: Contact Details
```

✅ **Checkpoint:** 5 Donation fields created (46 total fields)

---

#### Step 21: Review All Custom Fields (15 min)

**Navigate to:** Settings → Custom Fields → View All

**Verify categories:**
- [ ] 10 Core Contact Fields (preferred_name through how_did_you_hear)
- [ ] 6 Empathy Ledger Fields (supabase_user_id through elder_review_required)
- [ ] 4 JusticeHub Fields (family_support_needs through incarceration_connection)
- [ ] 6 The Harvest Fields (volunteer_interests through dietary_preferences)
- [ ] 5 ACT Farm Fields (residency_type through ndis_number)
- [ ] 2 Goods on Country Fields (goods_interest, business_type)
- [ ] 3 BCV Residencies Fields (artistic_medium through residency_proposal)
- [ ] 5 Grants/Funding Fields (grant_application_status through grant_reporting_due)
- [ ] 5 Donation Fields (lifetime_donation_value through donation_method)

**Total:** 46 custom fields ✅

**Screenshot:** Save custom fields list to Notion

---

### End of Day 2 Review (30 min)

**Achievements:**
- ✅ 63+ tags created
- ✅ 46 custom fields created
- ✅ Foundation 100% complete

**Team Huddle:**
- Show: How tags and custom fields work together
- Demo: Create a test contact with tags + custom fields
- Example: "Jane Smith - Elder, Storyteller, Active, cultural:kabi-kabi, stories_count: 5"

**Update Notion:**
- Day 2 status: Complete ✅
- Blockers: [None OR list any]
- Day 3 prep: Review pipeline designs (read GHL_COMPLETE_IMPLEMENTATION_PLAN.md sections on pipelines)

**Tomorrow:** Build 3 core pipelines - the system starts coming alive!

---

## DAY 3: PRIORITY PIPELINES

### Morning Block (9am-1pm)

#### Step 22: Navigate to Pipelines (5 min)

**Path:** Settings → Pipelines

**What are pipelines?**
- Visual workflow stages (like a Kanban board)
- Track contacts through a journey (e.g., Inquiry → Application → Accepted)
- Trigger automations at each stage
- Track revenue (for grants, donations, sales)

**Today's Goal:** Build 3 core pipelines that work across all projects

---

#### Step 23: Create Universal Inquiry Pipeline (1.5 hours)

**Purpose:** Central intake for all website contact forms before routing to project-specific pipelines

**Click:** Settings → Pipelines → Create New Pipeline

**Pipeline Name:** `Universal Inquiry Pipeline`

**Pipeline Settings:**
```
Opportunity Value Tracking: Disabled (this is non-monetary routing)
Default Monetary Value: N/A
Stage Movement Notifications: Enabled (notify team on Slack/email)
```

**Create Stages:**

**Stage 1: New Inquiry**
```
Stage Name: New Inquiry
Stage Color: Gray
Automation Trigger: Yes
Description: Contact submitted general contact form, needs triage
```

**Stage 2: Needs Assessment**
```
Stage Name: Needs Assessment
Stage Color: Yellow
Automation Trigger: No (manual review)
Description: Team reviews inquiry, determines which project/pipeline
```

**Stage 3: Routed to Project**
```
Stage Name: Routed to Project
Stage Color: Green
Automation Trigger: Yes (add to project-specific pipeline)
Description: Moved to appropriate pipeline (Empathy Ledger, JusticeHub, etc.)
```

**Stage 4: Out of Scope**
```
Stage Name: Out of Scope
Stage Color: Red
Automation Trigger: Yes (send referral email)
Description: Not a fit for ACT, send referral to partner orgs
```

**Click:** Save Pipeline

---

**Now create the automation for Stage 1:**

**Path:** Automation → Workflows → Create Workflow

**Workflow Name:** `Universal Inquiry - Auto Response`

**Trigger:**
```
Type: Opportunity Stage Changed
Pipeline: Universal Inquiry Pipeline
Stage: New Inquiry (Stage 1)
```

**Action 1: Send Email**
```
Template: New Contact Auto Response (create template)
Subject: Thanks for reaching out to ACT, {{contact.first_name}}!
From: ACT Team <hello@actstudio.org.au>
Delay: Immediate

Body:
Hi {{contact.first_name}},

Thank you for contacting ACT Regenerative Innovation Studio.

We've received your inquiry about {{contact.custom_field.how_did_you_hear}} and a team member will review it within 1-2 business days.

In the meantime, explore our projects:
🎭 Empathy Ledger: https://empathyledger.org
⚖️ JusticeHub: https://justicehub.org.au
🌱 The Harvest: https://theharvest.org.au
🦜 ACT Farm: https://actfarm.org.au

We'll be in touch soon.

The ACT Team
```

**Action 2: Send Internal Notification**
```
Type: Email notification to team
To: admin@actstudio.org.au (or Slack integration)
Subject: New Inquiry: {{contact.full_name}}
Body:
New contact in Universal Inquiry Pipeline:

Name: {{contact.full_name}}
Email: {{contact.email}}
Project Interest: {{contact.custom_field.how_did_you_hear}}
Message: {{contact.custom_field.inquiry_message}}

Review in GHL: [Link to contact]
```

**Click:** Save Workflow

✅ **Checkpoint:** Universal Inquiry Pipeline created with auto-response workflow

---

#### Step 24: Create Grants & Funding Pipeline (2 hours)

**Purpose:** Track all grant applications from research to reporting (CRITICAL for revenue)

**Click:** Settings → Pipelines → Create New Pipeline

**Pipeline Name:** `Grants & Funding Pipeline`

**Pipeline Settings:**
```
Opportunity Value Tracking: ENABLED (track $ amounts)
Default Monetary Value: $50,000 (average grant size)
Stage Movement Notifications: Enabled
```

**Create Stages:**

**Stage 1: Grant Opportunity Identified**
```
Stage Name: Grant Opportunity Identified
Stage Color: Gray
Monetary: No (just researching)
Automation Trigger: No
Description: Researching eligibility, fit, requirements
```

**Stage 2: Application In Progress**
```
Stage Name: Application In Progress
Stage Color: Yellow
Monetary: No
Automation Trigger: Yes (set deadline reminder)
Description: Actively writing application
```

**Stage 3: Grant Submitted**
```
Stage Name: Grant Submitted
Stage Color: Blue
Monetary: No (waiting for decision)
Automation Trigger: Yes (notify team)
Description: Application submitted, awaiting decision
```

**Stage 4: Grant Awarded (WON)**
```
Stage Name: Grant Awarded
Stage Color: Green
Monetary: YES (this is the $ stage)
Mark as WON stage: Yes ✅
Automation Trigger: Yes (celebration email, reporting reminders)
Description: Grant awarded! Track reporting obligations
```

**Stage 5: Grant Reporting Due**
```
Stage Name: Grant Reporting Due
Stage Color: Orange
Monetary: No (money already received)
Automation Trigger: Yes (reminder 30 days before due)
Description: Final report or progress report due
```

**Stage 6: Grant Report Submitted**
```
Stage Name: Grant Report Submitted
Stage Color: Green
Monetary: No
Automation Trigger: Yes (mark as complete, remove from active tracking)
Description: All obligations complete, grant cycle done
```

**Stage 7: Grant Declined (LOST)**
```
Stage Name: Grant Declined
Stage Color: Red
Monetary: No
Mark as LOST stage: Yes ✅
Automation Trigger: Yes (document learnings, look for similar grants)
Description: Application unsuccessful
```

**Click:** Save Pipeline

---

**Create Automation: Grant Deadline Reminder**

**Workflow Name:** `Grant Deadline - 7 Day Reminder`

**Trigger:**
```
Type: Date-based trigger
Field: custom_field.grant_deadline
When: 7 days before date
Pipeline: Grants & Funding Pipeline
Stage: Application In Progress
```

**Action 1: Send Email**
```
To: Team member assigned to this grant
Subject: Grant deadline in 7 days: {{opportunity.name}}
Body:
Reminder: Grant application due in 7 days

Grant: {{opportunity.name}}
Deadline: {{contact.custom_field.grant_deadline}}
Amount: ${{opportunity.monetary_value}}

Status check:
- Application draft complete?
- Supporting documents ready?
- Budget finalized?
- Letters of support received?

Review in GHL: [Link]
```

**Click:** Save Workflow

---

**Create Automation: Grant Awarded Workflow**

**Workflow Name:** `Grant Awarded - Celebration & Reporting Setup`

**Trigger:**
```
Type: Opportunity Stage Changed
Pipeline: Grants & Funding Pipeline
Stage: Grant Awarded (Stage 4)
```

**Action 1: Send Email (Internal)**
```
To: All team members
Subject: 🎉 Grant Awarded: {{opportunity.name}} - ${{opportunity.monetary_value}}
Body:
We won a grant!

Grant: {{opportunity.name}}
Amount: ${{opportunity.monetary_value}}
Awarded to: {{contact.full_name}}

Next steps:
1. Set reporting due date
2. Create reporting template
3. Schedule team celebration

View in GHL: [Link]
```

**Action 2: Update Custom Fields**
```
Field: grant_application_status → "Awarded"
Field: grant_reporting_due → [Set date based on grant terms]
```

**Action 3: Wait 30 days before reporting due date**
```
Trigger: custom_field.grant_reporting_due - 30 days
Action: Send reporting reminder email
```

**Click:** Save Workflow

✅ **Checkpoint:** Grants & Funding Pipeline created with deadline + award workflows

---

### Lunch Break (1pm-2pm)

🍽️ **Progress check:** 2 pipelines done, 1 to go. Afternoon: Donors pipeline (the most important for sustainability)

---

### Afternoon Block (2pm-6pm)

#### Step 25: Create Supporters & Donors Pipeline (3 hours)

**Purpose:** Track donor journey from first gift to major donor (commercial revenue strategy)

**Click:** Settings → Pipelines → Create New Pipeline

**Pipeline Name:** `Supporters & Donors Pipeline`

**Pipeline Settings:**
```
Opportunity Value Tracking: ENABLED
Default Monetary Value: $100
Stage Movement Notifications: Enabled
```

**Create Stages:**

**Stage 1: First Donation (WON)**
```
Stage Name: First Donation
Stage Color: Gold
Monetary: YES
Mark as WON stage: Yes ✅
Automation Trigger: Yes (thank you sequence, tax receipt)
Description: First-time donor, critical to build relationship
```

**Stage 2: Second Donation (WON)**
```
Stage Name: Second Donation
Stage Color: Gold
Monetary: YES
Mark as WON stage: Yes ✅
Automation Trigger: Yes (deeper thank you, impact story)
Description: Repeat donor, higher retention likelihood
```

**Stage 3: Regular Donor (3+) (WON)**
```
Stage Name: Regular Donor (3+ gifts)
Stage Color: Gold
Monetary: YES
Mark as WON stage: Yes ✅
Automation Trigger: Yes (VIP treatment, exclusive updates)
Description: Loyal donor, treat like gold
```

**Stage 4: Major Donor ($1000+) (WON)**
```
Stage Name: Major Donor ($1000+)
Stage Color: Dark Gold
Monetary: YES
Mark as WON stage: Yes ✅
Automation Trigger: Yes (personal call, handwritten note, special recognition)
Description: High-value donor, warrants personal attention
```

**Stage 5: Legacy Donor ($5000+) (WON)**
```
Stage Name: Legacy Donor ($5000+)
Stage Color: Purple (VIP)
Monetary: YES
Mark as WON stage: Yes ✅
Automation Trigger: Yes (executive meeting, board recognition)
Description: Transformational donor, strategic relationship
```

**Stage 6: Lapsed Donor (12+ months)**
```
Stage Name: Lapsed Donor (12+ months)
Stage Color: Orange
Monetary: No (no recent gift)
Automation Trigger: Yes (win-back campaign)
Description: Previous donor, inactive 12+ months
```

**Click:** Save Pipeline

---

**Create Email Templates for Donor Sequence:**

**Navigate to:** Marketing → Templates → Create Email Template

**Template 1: First Donation Thank You**

```
Template Name: Donor Thank You - First Gift
Subject: Thank you for your donation, {{contact.first_name}}!

Body:

Dear {{contact.first_name}},

Thank you for your generous donation of ${{opportunity.monetary_value}} to ACT Regenerative Innovation Studio.

Your support helps us:
🌱 Empower storytellers to share their narratives with dignity (Empathy Ledger)
⚖️ Support families navigating the youth justice system (JusticeHub)
🦜 Protect endangered species and regenerate ecosystems (ACT Farm)
🌾 Build resilient, connected communities (The Harvest)

Your donation was allocated to: {{contact.custom_field.donation_designation}}

Tax Receipt: Attached
Donation Date: {{opportunity.created_at}}
Amount: ${{opportunity.monetary_value}}
ABN: [Your ABN number]

This donation is tax-deductible. Please keep this receipt for your records.

With deep gratitude,
{{user.first_name}} {{user.last_name}}
{{user.job_title}}
ACT Regenerative Innovation Studio

P.S. Want to see your impact? Check our latest stories: [Link to impact page]

---
Update your preferences: [Link]
Unsubscribe: [Link]
```

**Save Template**

---

**Template 2: Second Donation Thank You (Relationship Deepening)**

```
Template Name: Donor Thank You - Second Gift
Subject: Welcome back, {{contact.first_name}} - your second gift means the world

Body:

Hi {{contact.first_name}},

You're back! Your second donation of ${{opportunity.monetary_value}} just came through, and we had to reach out personally.

Repeat donors like you are the backbone of our work. While one-time gifts are wonderful, knowing you believe in us enough to give again? That's what keeps our team going on the hard days.

Since your last donation ({{contact.custom_field.first_donation_date}}), here's what's happened:
- [Specific impact metric for their designated project]
- [Another achievement]
- [Third achievement]

Your total impact: ${{contact.custom_field.lifetime_donation_value}} across {{contact.pipeline_stage_count}} gifts.

We'd love to share more about our work. Would you like:
- A behind-the-scenes tour of [their project of interest]?
- A coffee/video chat with our team?
- To meet some of the storytellers/families/residents you've supported?

Just reply to this email - we'd be honored to connect.

With gratitude,
{{user.first_name}}

---
Tax receipt attached. ABN: [Your ABN]
```

**Save Template**

---

**Template 3: Major Donor ($1000+) - Personal Touch**

```
Template Name: Donor Thank You - Major Gift ($1000+)
Subject: [{{user.first_name}} - PERSONAL CALL REQUIRED] Major gift: {{contact.first_name}}

Body:

[This is an INTERNAL email to team, not to donor]

🚨 MAJOR DONOR ALERT 🚨

Name: {{contact.full_name}}
Amount: ${{opportunity.monetary_value}}
Designated to: {{contact.custom_field.donation_designation}}
Previous donations: ${{contact.custom_field.lifetime_donation_value}} total

ACTION REQUIRED:
1. [ ] Personal phone call within 24 hours ({{user.first_name}}, can you take this?)
2. [ ] Handwritten thank you note (mail within 3 days)
3. [ ] Add to VIP newsletter list (exclusive impact updates)
4. [ ] Invite to private donor event (next one: [date])
5. [ ] Add tag: priority:high

Suggested talking points:
- Thank them profusely (duh)
- Ask: What inspired this gift?
- Ask: How did you first hear about ACT?
- Ask: Would you like to visit/meet the team?
- Mention: Possibility of naming opportunities (if $5k+)

View in GHL: [Link to contact]

Let's treat this donor like gold.
```

**Save Template**

---

**Create Workflow: First Donation Thank You Sequence**

**Workflow Name:** `Donor Journey - First Gift Sequence`

**Trigger:**
```
Type: Opportunity Stage Changed
Pipeline: Supporters & Donors Pipeline
Stage: First Donation (Stage 1)
```

**Action 1: Send Email (Immediate)**
```
Template: Donor Thank You - First Gift
Delay: Immediate
Attach: Tax receipt PDF (configure via Stripe integration later)
```

**Action 2: Update Custom Fields**
```
Field: first_donation_date → {{opportunity.created_at}}
Field: last_donation_date → {{opportunity.created_at}}
Field: lifetime_donation_value → {{opportunity.monetary_value}}
Field: donation_frequency → Based on form selection
```

**Action 3: Add Tags**
```
Add tag: role:donor
Add tag: engagement:active
Remove tag: engagement:lead (if present)
```

**Action 4: Wait 3 Days**
```
Wait: 3 days
```

**Action 5: If/Else (Donation > $100?)**
```
Condition: If opportunity.monetary_value > 100
  Then: Send personalized thank you (template: Donor Thank You - Second Gift)
  Else: Skip
```

**Action 6: Wait 30 Days**
```
Wait: 30 days
```

**Action 7: Send Impact Update Email**
```
Template: [Create new template: "Your Impact - 30 Day Update"]
Subject: {{contact.first_name}}, here's the impact of your ${{opportunity.monetary_value}} gift
Body:
Hi {{contact.first_name}},

A month ago, you donated ${{opportunity.monetary_value}} to {{contact.custom_field.donation_designation}}.

Here's what your donation helped accomplish:
[Pull latest impact metrics from designated project]

- Empathy Ledger: X new stories shared
- JusticeHub: Y families supported
- ACT Farm: Z hectares regenerated
- The Harvest: N volunteer hours enabled

Thank you for being part of this regenerative movement.

[Soft CTA: "Want to amplify your impact? Donate again →"]

The ACT Team
```

**Action 8: Wait 90 Days**
```
Wait: 90 days (total 120 days since first donation)
```

**Action 9: Send Second Gift Ask**
```
Template: [Create new template: "Second Gift Ask - Soft"]
Subject: {{contact.first_name}}, would you consider a second gift?
Body:
Hi {{contact.first_name}},

It's been 4 months since your first donation to ACT, and we wanted to reach out.

Your ${{opportunity.monetary_value}} gift made a real difference. Since then:
[Updated impact metrics]

We don't take your support for granted. If you're able to give again, we'd be honored.

Even $25 helps. But honestly? We'd love to stay connected regardless of whether you donate.

Reply and let us know how you're doing.

With gratitude,
{{user.first_name}}

[CTA: Donate Again → Link]
[CTA: Just Say Hi → Reply to this email]
```

**Exit Conditions:**
```
If contact donates again → Move to Stage 2 (Second Donation), restart sequence
If contact unsubscribes → Add tag "engagement:opted-out", stop sequence
If email bounces → Tag "email:invalid", stop sequence
```

**Click:** Save Workflow

---

**Create Workflow: Lapsed Donor Win-Back**

**Workflow Name:** `Lapsed Donor - Win-Back Campaign`

**Trigger:**
```
Type: Date-based
Condition: last_donation_date is more than 12 months ago
Pipeline: Supporters & Donors Pipeline
```

**Action 1: Move to Stage 6 (Lapsed Donor)**
```
Automatically move contact to "Lapsed Donor" stage if last_donation_date > 12 months
```

**Action 2: Wait 7 Days (grace period)**
```
Wait: 7 days (in case they donate during this time)
```

**Action 3: Send Win-Back Email**
```
Template: [Create new template: "We Miss You - Lapsed Donor"]
Subject: We miss you, {{contact.first_name}}

Body:
Hi {{contact.first_name}},

We noticed it's been over a year since your last donation to ACT.

First - thank you. Your previous support (${{contact.custom_field.lifetime_donation_value}} total) helped us [specific impact].

We understand priorities change. Life happens. Money gets tight.

But if you've been thinking about us and just forgot or got busy - here's your reminder. ☺️

We'd love to have you back. Even $25 helps.

Not able to donate right now? No worries. Want to stay on our newsletter? Just reply and say "keep me updated."

Want to unsubscribe entirely? Click here: [Link]

With gratitude for your past support,
The ACT Team

[CTA: Donate Again → Link]
```

**Action 4: Wait 30 Days**
```
Wait: 30 days
```

**Action 5: If No Response - Final Email**
```
Template: [Create new template: "Final Check-In - Lapsed Donor"]
Subject: Last check-in, {{contact.first_name}}

Body:
Hi {{contact.first_name}},

This is our last email unless you'd like to stay connected.

We sent a message 30 days ago, and haven't heard back. That's okay!

Here are your options:
1. Donate again and rejoin our active community → [Link]
2. Stay on newsletter (no donation needed) → Reply "keep me updated"
3. Unsubscribe completely → [Link]

Whatever you choose, thank you for your past support. It mattered.

The ACT Team
```

**Exit Conditions:**
```
If contact donates → Move to appropriate stage (First/Second/Regular Donor)
If contact replies "keep me updated" → Tag "engagement:alumni", stop win-back, keep on newsletter
If contact unsubscribes → Tag "engagement:opted-out", remove from all campaigns
If no response after 60 days → Tag "engagement:lapsed", reduce email frequency to quarterly newsletter only
```

**Click:** Save Workflow

✅ **Checkpoint:** Supporters & Donors Pipeline created with full thank you + win-back sequences

---

#### Step 26: Test All 3 Pipelines (1 hour)

**Create 3 test contacts:**

**Test Contact 1: Grant Applicant**
```
Name: Test Grant - Queensland Arts
Email: test+grant@actstudio.org.au
Tags: act-studio, interest:funding
Custom Fields:
  grant_name: Queensland Arts Council Grant
  grant_amount: $50,000
  grant_deadline: [30 days from today]
Add to pipeline: Grants & Funding Pipeline, Stage 1
```

**Expected behavior:**
- Contact appears in pipeline
- No automation (Stage 1 has no trigger)
- Manually move to Stage 2 (Application In Progress)
- Check: Should receive deadline reminder 7 days before grant_deadline

**Test Contact 2: First-Time Donor**
```
Name: Test Donor - Jane Smith
Email: test+donor@actstudio.org.au
Tags: the-harvest, role:donor
Custom Fields:
  donation_method: Credit card
  donation_frequency: One-time
Add to pipeline: Supporters & Donors Pipeline, Stage 1
Opportunity Value: $100
```

**Expected behavior:**
- Contact appears in pipeline Stage 1
- Immediate auto-response email sent (check test email inbox)
- Tags updated: role:donor, engagement:active
- Custom fields populated: first_donation_date, lifetime_donation_value
- Workflow scheduled: 30-day impact email, 90-day second gift ask

**Test Contact 3: Universal Inquiry**
```
Name: Test Inquiry - John Doe
Email: test+inquiry@actstudio.org.au
Tags: empathy-ledger
Custom Fields:
  how_did_you_hear: Website
Add to pipeline: Universal Inquiry Pipeline, Stage 1
```

**Expected behavior:**
- Contact appears in Universal Inquiry Pipeline
- Auto-response email sent immediately
- Internal notification sent to team email
- Manually move to Stage 3 (Routed to Project) - should trigger move to Empathy Ledger pipeline (you'll build this pipeline in Week 2)

**Check test results:**
- [ ] All 3 contacts created successfully
- [ ] All appear in correct pipelines
- [ ] Auto-response emails received (check test inboxes)
- [ ] Workflows show as "scheduled" in GHL (check Automation → Workflow History)

**If tests fail:**
- Check: Workflow triggers are set correctly
- Check: Email templates have no syntax errors
- Check: SMTP/email domain is verified
- Re-save workflow and try again

✅ **Checkpoint:** All 3 pipelines tested and working

---

### End of Day 3 Review (30 min)

**Achievements:**
- ✅ 3 core pipelines created
- ✅ 6+ automations/workflows built
- ✅ Email templates created
- ✅ System tested with real data flow

**Team Huddle:**
- Show: How a contact moves through a pipeline
- Demo: Drag-and-drop stage changes
- Explain: When automations trigger (stage changes, dates, conditions)

**Update Notion:**
- Day 3 status: Complete ✅
- Blockers: [Any issues with email delivery, workflow triggers]
- Day 4 prep: Review form designs (General Contact, Donation, Newsletter, Volunteer)

**Tomorrow:** Build forms that feed these pipelines

---

## DAY 4: ESSENTIAL FORMS

[Day 4 content follows the same detailed, copy-paste ready format for all 4 forms]

---

## DAY 5: CORE WORKFLOWS

[Day 5 content follows same format]

---

## 📊 Quick Reference: What You Built This Week

### Tags (63+)
- 7 base project tags
- 13 role tags
- 6 engagement tags
- 12 interest tags
- 12 action tags
- 3 priority tags
- 5 cultural tags
- 5+ campaign tags

### Custom Fields (46)
- 10 core contact fields
- 6 Empathy Ledger fields
- 4 JusticeHub fields
- 6 The Harvest fields
- 5 ACT Farm fields
- 2 Goods on Country fields
- 3 BCV Residencies fields
- 5 Grants/Funding fields
- 5 Donation fields

### Pipelines (3)
- Universal Inquiry Pipeline (4 stages, 2 workflows)
- Grants & Funding Pipeline (7 stages, 3 workflows)
- Supporters & Donors Pipeline (6 stages, 3 workflows)

### Forms (4 - to build on Day 4)
- General Contact Form
- Donation Form
- Newsletter Signup Form
- Volunteer Application Form

### Workflows (8+ - to build on Day 5)
- Universal Inquiry Auto Response
- Grant Deadline Reminders
- Grant Awarded Celebration
- First Donation Thank You Sequence
- Second Donation Thank You
- Major Donor Alert
- Lapsed Donor Win-Back
- Monthly Newsletter Setup

---

## 🚀 Week 2 Preview

**Week 2 Focus:** Project-specific pipelines + commercial revenue pipelines

**Day 1 (Monday):**
- Empathy Ledger Storyteller Journey Pipeline (6 stages)
- Empathy Ledger Organization Partnership Pipeline (8 stages) - SaaS sales

**Day 2 (Tuesday):**
- JusticeHub Service Provider Pipeline
- JusticeHub Family Support Pipeline
- JusticeHub CONTAINED Campaign Pipeline

**Day 3 (Wednesday):**
- The Harvest Volunteer Journey Pipeline
- The Harvest Event Registration Pipeline
- The Harvest Tenant/Vendor Pipeline

**Day 4 (Thursday):**
- ACT Farm Residency Pipeline
- ACT Farm Workshop Registration Pipeline

**Day 5 (Friday):**
- Partnerships Pipeline (cross-project)
- Festivals & Events Pipeline (The Harvest focus)
- Testing, team training, documentation

**Commercial Revenue Focus (per GHL_COMMERCIAL_REVENUE_STRATEGY.md):**
- SaaS Sales Pipeline (Empathy Ledger) - HIGHEST PRIORITY Week 2 Day 1
- Consulting Sales Pipeline (JusticeHub + AI consulting)
- Corporate Partnerships Pipeline (CSR programs, employee engagement)
- E-Commerce Pipeline (Goods on Country customer journey)

---

## 📞 Need Help?

**Common Issues:**

**"Email not sending"**
- Check: Settings → Email Services → Domain verification status
- Check: Workflow → Email template has no syntax errors {{like.this}}
- Check: Contact has valid email address
- Test: Send test email from Settings → Email Services

**"Workflow not triggering"**
- Check: Workflow is Published (not Draft)
- Check: Trigger conditions match (exact stage name, exact pipeline name)
- Check: Contact meets all conditions (tags, custom fields)
- Test: Create test contact, manually move through stages

**"Custom field not showing"**
- Check: Custom field "Show on" settings (Contact Details, Forms checked)
- Check: Field name is exact (case-sensitive, no spaces)
- Refresh page - sometimes fields take 30 seconds to appear

**"Can't find a tag"**
- Search: Settings → Tags → Search bar
- Tags are case-sensitive: "Empathy-Ledger" ≠ "empathy-ledger"
- Use lowercase with hyphens (recommended standard)

**Still stuck?**
- GHL Support: https://support.gohighlevel.com/
- GHL Community: https://community.gohighlevel.com/
- ACT Team: Post in team Slack #ghl-help channel

---

## ✅ Final Week 1 Checklist

Before starting Week 2, verify:

- [ ] Account set up, team invited
- [ ] Email domain verified and tested
- [ ] 63+ tags created
- [ ] 46 custom fields created
- [ ] 3 core pipelines built
- [ ] 8+ workflows created and tested
- [ ] 4 forms built (Day 4)
- [ ] Test contacts created and flowing through system
- [ ] Team trained on basics (how to view contacts, pipelines, send emails)
- [ ] Notion updated with progress, screenshots, notes
- [ ] Week 2 plan reviewed and prioritized

---

**LET'S GO! Week 1 is foundation. Week 2 is where the magic happens - project-specific pipelines and commercial revenue streams come alive.** 🚀🌱

---

**Document Version:** 1.0
**Last Updated:** 2026-01-01
**Next Update:** After Week 1 completion (document any deviations, learnings, time estimates)
