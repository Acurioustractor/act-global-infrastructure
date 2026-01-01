# ACT Ecosystem - Complete GoHighLevel Implementation Plan

**Date:** 2026-01-01
**Status:** Production-Ready Blueprint
**Purpose:** Build complete GHL system for all ACT projects - operational this week

---

## 🎯 Executive Summary

This plan covers **6 ACT projects** with:
- **15 pipelines** (grants, supporters, events, partnerships, etc.)
- **22 website forms** (contact, volunteer, applications, registrations)
- **35+ automated workflows** (welcome sequences, nurture campaigns, alerts)
- **Unified tag taxonomy** (cross-project tracking)
- **Newsletter/campaign strategy** (segmented lists)
- **Integration architecture** (Notion, Supabase, webhooks)

**Timeline:** Build core infrastructure this week, activate automations week 2.

---

## 📊 Complete GHL Account Structure

### Location Setup

**Single GHL Location:** "ACT Regenerative Innovation Studio"

**Why Single Location:**
- Unified contact database (one person across multiple projects)
- Cross-project opportunity detection
- Consolidated reporting for funders
- Single source of truth for relationship management

**Sub-Accounts (Tags, Not Separate Locations):**
- Empathy Ledger
- JusticeHub
- The Harvest
- ACT Farm / Black Cockatoo Valley (BCV)
- Goods on Country
- BCV Artist Residencies

---

## 🏷️ Universal Tag Taxonomy

### Base Project Tags

```
Project Tags:
- empathy-ledger
- justicehub
- the-harvest
- act-farm
- goods-on-country
- bcv-residencies
- act-studio (overall ecosystem)
```

### Role Tags

```
Role Tags:
- role:elder (Indigenous Elder - highest priority, cultural protocols)
- role:storyteller (Empathy Ledger contributor)
- role:volunteer (The Harvest volunteer)
- role:artist (BCV residency artist)
- role:service-provider (JusticeHub directory listing)
- role:family (JusticeHub family support recipient)
- role:researcher (ACT Farm researcher)
- role:donor (Financial supporter)
- role:partner (Organizational partner)
- role:vendor (The Harvest vendor/tenant)
- role:leader (CONTAINED campaign leader)
```

### Engagement Level Tags

```
Engagement Tags:
- engagement:lead (initial inquiry)
- engagement:prospect (qualified interest)
- engagement:active (current participant)
- engagement:alumni (past participant, good standing)
- engagement:lapsed (inactive, re-engagement needed)
- engagement:opted-out (unsubscribed, no marketing)
```

### Interest/Category Tags

```
Interest Tags:
- interest:volunteering
- interest:storytelling
- interest:conservation
- interest:art
- interest:justice-reform
- interest:circular-economy
- interest:events
- interest:workshops
- interest:residencies
- interest:research
- interest:funding
```

### Behavioral Tags

```
Action Tags:
- action:attended-event
- action:submitted-story
- action:completed-volunteer-orientation
- action:donated
- action:applied-grant
- action:registered-workshop
- action:booked-residency
- action:referred-friend
```

### Priority Tags

```
Priority Tags:
- priority:high (VIPs, Elders, major donors, politicians)
- priority:urgent (crisis support, time-sensitive)
- priority:cultural-protocol (requires Elder review)
```

### Cultural Protocol Tags

```
Cultural Tags:
- cultural:kabi-kabi (Kabi Kabi cultural protocols apply)
- cultural:jinibara (Jinibara cultural protocols apply)
- cultural:indigenous (General Indigenous protocols)
- cultural:elder-review-required (Content needs Elder approval)
- cultural:sacred-knowledge (Sensitive cultural material)
```

### Campaign Tags

```
Campaign Tags:
- campaign:contained (JusticeHub CONTAINED campaign)
- campaign:ai-consent (Empathy Ledger AI consent campaign)
- campaign:harvest-festival (The Harvest events)
- campaign:fundraising-2026
- campaign:newsletter-[month]
```

---

## 📋 Custom Fields (Universal Across All Contacts)

### Core Contact Fields

```
Custom Fields - Core:
1. preferred_name (text) - How they like to be addressed
2. pronouns (dropdown: he/him, she/her, they/them, other)
3. indigenous_status (dropdown: Aboriginal, Torres Strait Islander, Both, Non-Indigenous, Prefer not to say)
4. cultural_protocols (text) - Specific cultural considerations
5. accessibility_needs (text) - Any accessibility requirements
6. communication_preference (dropdown: Email, SMS, Phone, Mail)
7. best_contact_time (dropdown: Morning, Afternoon, Evening, Anytime)
8. emergency_contact_name (text)
9. emergency_contact_phone (phone)
10. how_did_you_hear (dropdown: Friend referral, Social media, Event, Website, Partner org, Other)
```

### Project-Specific Fields

```
Custom Fields - Empathy Ledger:
11. supabase_user_id (text) - Link to Empathy Ledger account
12. storyteller_status (dropdown: Inquiry, Profile Complete, Active, Alumni)
13. stories_count (number) - Number of stories shared
14. consent_status (dropdown: Full consent, Partial consent, No consent)
15. ai_processing_consent (dropdown: Yes, No, Pending)
16. elder_review_required (checkbox) - Story needs Elder approval

Custom Fields - JusticeHub:
17. family_support_needs (text) - Support services needed
18. service_provider_type (dropdown: Legal, Mental health, Housing, Employment, etc.)
19. contained_leader_status (dropdown: Nominated, Contacted, Booked, Attended, Advocate)
20. incarceration_connection (dropdown: Personal experience, Family member, Professional, Advocate)

Custom Fields - The Harvest:
21. volunteer_interests (multi-select: Gardening, Events, Admin, Kitchen, Maintenance, Teaching)
22. volunteer_hours_total (number) - Lifetime volunteer hours
23. volunteer_orientation_completed (checkbox)
24. membership_level (dropdown: Community, Supporter, Sustainer, Patron)
25. membership_expiry_date (date)
26. dietary_preferences (text) - For events

Custom Fields - ACT Farm:
27. residency_type (dropdown: R&D, Creative, Wellbeing, Research Partnership)
28. residency_dates (text) - e.g., "2025-03-15 to 2025-03-22"
29. research_focus (text) - For researchers
30. ndis_participant (checkbox) - June's Patch healthcare
31. ndis_number (text)

Custom Fields - Goods on Country:
32. goods_interest (dropdown: Products, Partnerships, Volunteering, Wholesale)
33. business_type (text) - If partner/wholesaler

Custom Fields - BCV Residencies:
34. artistic_medium (text) - Photography, painting, sculpture, etc.
35. portfolio_url (url)
36. residency_proposal (text) - Short description

Custom Fields - Grants/Funding:
37. grant_application_status (dropdown: Inquiry, Applied, Awarded, Declined, Reporting)
38. grant_name (text)
39. grant_amount (number)
40. grant_deadline (date)
41. grant_reporting_due (date)

Custom Fields - Donations:
42. lifetime_donation_value (number) - Total $ donated
43. first_donation_date (date)
44. last_donation_date (date)
45. donation_frequency (dropdown: One-time, Monthly, Quarterly, Annual)
46. donation_method (dropdown: Credit card, Bank transfer, Cash, In-kind)
```

---

## 🔄 Complete Pipeline Architecture (15 Pipelines)

### Pipeline 1: Universal Inquiry Pipeline

**Purpose:** Catch-all for general inquiries before routing to project-specific pipelines

**Stages:**
1. **New Inquiry** (Entry: General contact form)
   - Auto-response: Thank you email
   - Notify team: Slack/Email alert
   - Action: Review inquiry within 24 hours

2. **Needs Assessment**
   - Team reviews: Which project(s) is this inquiry for?
   - Tag appropriately: Add project tags
   - Action: Route to appropriate pipeline OR respond if out of scope

3. **Routed to Project**
   - Move to specific pipeline: Empathy Ledger, JusticeHub, The Harvest, etc.
   - Send welcome email: Project-specific intro
   - Action: Project team takes over

4. **Out of Scope**
   - Send referral email: Link to appropriate external resources
   - Tag: "engagement:opted-out" if not interested in updates
   - Action: Close opportunity

**Custom Fields:**
- inquiry_type (dropdown: General, Storytelling, Volunteering, Events, Residency, Grant, Partnership, Other)
- inquiry_message (text)
- inquiry_date (date)

---

### Pipeline 2: Empathy Ledger - Storyteller Journey

**Purpose:** Onboard storytellers from inquiry to active contributor

**Stages:**
1. **Storyteller Inquiry**
   - Entry: "Become a Storyteller" form submission
   - Auto-response: Welcome email with platform overview
   - Action: Send onboarding guide PDF

2. **Profile Creation**
   - Entry: Storyteller creates Supabase account
   - Webhook: Supabase → GHL sync (user_id, email, name)
   - Action: Send "Complete Your Profile" email with tips

3. **Profile Complete**
   - Entry: Profile 80%+ complete in Supabase
   - Action: Send "Ready to Share Your Story" email
   - Tag: "role:storyteller"

4. **First Story Submitted**
   - Entry: Story submitted in Empathy Ledger platform
   - Action: Celebration email, share on social media (with consent)
   - Tag: "action:submitted-story"

5. **Active Storyteller** (3+ stories)
   - Entry: 3 or more stories published
   - Action: Quarterly check-in email, invite to storyteller gatherings
   - Tag: "engagement:active"

6. **Storyteller Alumni** (Inactive 6+ months)
   - Entry: No activity for 6 months
   - Action: "We miss you" re-engagement email
   - Tag: "engagement:alumni"

**Custom Fields:** storyteller_status, stories_count, consent_status, ai_processing_consent

---

### Pipeline 3: Empathy Ledger - Organization Partnership

**Purpose:** Convert organization inquiries to paying enterprise customers

**Stages:**
1. **Organization Inquiry**
   - Entry: "Partner with Us" form
   - Auto-response: Partnership deck PDF
   - Action: Schedule discovery call within 3 business days

2. **Discovery Call Scheduled**
   - Action: Send calendar invite + pre-call questionnaire
   - Tag: "engagement:prospect"

3. **Demo Requested**
   - Action: Provide platform demo (Loom video or live call)
   - Send: Case studies, pricing tiers

4. **Pilot Program** (30-day free trial)
   - Action: Onboard to pilot (limited access)
   - Weekly check-ins: Usage, feedback, support needs
   - Tag: "campaign:pilot-2026"

5. **Proposal Sent**
   - Action: Custom proposal with pricing
   - Follow-up: Day 3, Day 7, Day 14

6. **Negotiation**
   - Action: Address concerns, adjust proposal if needed
   - Legal review: Contracts, MSA, SLA

7. **Contract Signed** ($$$)
   - Action: Full platform access, onboarding session
   - Invoice: Payment terms (upfront or monthly)
   - Tag: "engagement:active", "role:partner"

8. **Active Customer**
   - Quarterly business reviews: Usage stats, impact metrics
   - Annual renewal check-in: 60 days before expiry
   - Revenue: $200-$2000/month per org

9. **Renewal Upcoming**
   - Action: Renewal proposal, upsell opportunities
   - Tag: "priority:high"

10. **Churned**
    - Exit survey: Why did they leave?
    - Win-back campaign: 90 days later
    - Tag: "engagement:lapsed"

**Revenue Tracking:** $200-$2000/month per organization × 12 months = $2,400-$24,000 annual value

---

### Pipeline 4: JusticeHub - Service Provider Directory

**Purpose:** Onboard service providers to directory listing

**Stages:**
1. **Provider Inquiry**
   - Entry: "List Your Service" form
   - Auto-response: Directory guidelines, benefits
   - Action: Verify eligibility (service type, location, credentials)

2. **Application Submitted**
   - Action: Review application, check references
   - Background: Ensure trauma-informed approach

3. **Approved**
   - Action: Create directory listing, send login details
   - Tag: "role:service-provider"

4. **Active Listing** (Free tier)
   - Monthly: Usage stats (views, inquiries)
   - Annual: Renewal check-in

5. **Premium Listing** (Future revenue)
   - Upsell: Featured placement, analytics, referrals
   - Revenue: $50-$200/month per provider

**Custom Fields:** service_provider_type, listing_tier, listing_start_date

---

### Pipeline 5: JusticeHub - Family Support

**Purpose:** Connect families in need with appropriate services

**Stages:**
1. **Support Request**
   - Entry: "Get Support" form (trauma-informed, simple language)
   - Auto-response: "We received your request, someone will call within 24 hours"
   - Action: Priority intake call (urgent needs escalated immediately)
   - Tag: "priority:urgent" if crisis

2. **Needs Assessment**
   - Intake call completed: Document needs (housing, legal, mental health, etc.)
   - Action: Identify appropriate service providers
   - Tag: "family_support_needs" custom field

3. **Service Matched**
   - Action: Warm handoff to 1-3 service providers
   - Follow-up: Day 3 check-in (did they connect?)

4. **Services Engaged**
   - Action: Monthly check-in (how is it going?)
   - Track: Outcomes, satisfaction, additional needs

5. **Support Complete**
   - Action: Success celebration, testimonial request (with consent)
   - Long-term: Quarterly check-in (6-12 months)
   - Tag: "engagement:alumni"

**Special Considerations:**
- Trauma-informed: Gentle, respectful communication
- Privacy: HIPAA-level security, encrypted notes
- Accessibility: Multi-language support (future), phone-first for digital literacy gaps
- Crisis protocol: Immediate escalation for safety concerns

**Custom Fields:** family_support_needs, crisis_level, services_engaged, outcome_status

---

### Pipeline 6: JusticeHub - CONTAINED Campaign (Leader Engagement)

**Purpose:** Recruit and activate leaders with incarceration experience for policy change

**Stages:**
1. **Leader Nominated**
   - Entry: Nomination form (self-nomination or peer nomination)
   - Auto-response: "Thank you, we'll be in touch within 1 week"
   - Action: Review nomination, background research

2. **Initial Outreach**
   - Action: Personalized email/call introduction to campaign
   - Share: Campaign vision, what we're asking (2-hour workshop)
   - Tag: "campaign:contained"

3. **Workshop Booked**
   - Action: Send calendar invite, pre-workshop materials
   - Prep: Briefing on policy reform goals, storytelling tips
   - Tag: "action:registered-workshop"

4. **Workshop Attended**
   - Action: Follow-up email, thank you gift
   - Collect: Story release consent, policy recommendations
   - Tag: "action:attended-event"

5. **Active Advocate**
   - Action: Ongoing campaign updates, invitations to policy events
   - Recognition: Feature story on website (with consent)
   - Tag: "engagement:active"

6. **Policy Win**
   - Action: Celebration event, media coverage
   - Thank: Acknowledge leader contributions publicly (with consent)

**Special Considerations:**
- Dignity-first: Respectful language, no deficit framing
- Consent: Explicit permission for every use of their story
- Safety: Trauma-informed, no re-traumatization
- Compensation: Honorarium for workshop participation ($200)

**Custom Fields:** contained_leader_status, incarceration_connection, story_release_consent

**Revenue:** Grant-funded ($50k-$200k campaigns), corporate sponsorships

---

### Pipeline 7: The Harvest - Volunteer Journey

**Purpose:** Recruit, onboard, and retain community volunteers

**Stages:**
1. **Volunteer Inquiry**
   - Entry: "Volunteer with Us" form
   - Auto-response: Volunteer handbook PDF, upcoming orientation dates
   - Action: Invite to next orientation session

2. **Orientation Scheduled**
   - Action: Send calendar invite, what to bring, parking info
   - Reminder: 2 days before, 1 day before
   - Tag: "action:registered-workshop"

3. **Orientation Attended**
   - Action: Welcome email with volunteer portal access
   - Collect: Preferences survey (interests, availability)
   - Tag: "action:completed-volunteer-orientation"

4. **First Shift Scheduled**
   - Action: Send shift details, coordinator contact
   - Tag: "role:volunteer"

5. **Active Volunteer** (1+ shift per month)
   - Action: Monthly volunteer newsletter, appreciation emails
   - Track: Hours logged, impact metrics
   - Recognition: Milestones (10 hrs, 50 hrs, 100 hrs)
   - Tag: "engagement:active"

6. **Super Volunteer** (50+ hours)
   - Action: Thank you gift, volunteer appreciation event invite
   - Opportunity: Leadership roles, shift coordination
   - Tag: "priority:high"

7. **Lapsed Volunteer** (No shifts 3+ months)
   - Action: "We miss you" email, re-engagement survey
   - Tag: "engagement:lapsed"

**Custom Fields:** volunteer_interests, volunteer_hours_total, volunteer_orientation_completed

**Cross-Project Synergy:**
- Tag volunteers interested in conservation → Invite to ACT Farm workshop
- Tag volunteers interested in storytelling → Invite to Empathy Ledger info session

---

### Pipeline 8: The Harvest - Event Registrations

**Purpose:** Manage event bookings (workshops, festivals, community gatherings)

**Stages:**
1. **Event Interest**
   - Entry: Event registration form
   - Auto-response: Event details, payment link (if paid event)
   - Action: Add to event list

2. **Ticket Purchased** (Paid events)
   - Entry: Stripe payment confirmed
   - Action: Send ticket confirmation, calendar invite
   - Tag: "action:attended-event" (pre-event)

3. **Registered** (Free events)
   - Action: Send confirmation, what to bring
   - Reminder: 1 week before, 1 day before

4. **Attended**
   - Action: Post-event survey, photos (with consent)
   - Tag: "action:attended-event"

5. **Repeat Attendee** (3+ events)
   - Action: VIP list for early bird tickets, exclusive events
   - Tag: "priority:high"

**Custom Fields:** event_name, event_date, ticket_type, dietary_preferences

**Revenue:** Ticket sales $20-$100 per event × 50-200 attendees = $1,000-$20,000 per event

---

### Pipeline 9: The Harvest - Membership Program

**Purpose:** Convert community members to paying members (recurring revenue)

**Stages:**
1. **Membership Inquiry**
   - Entry: "Become a Member" form
   - Auto-response: Membership benefits guide, pricing tiers
   - Action: Send payment link (Stripe subscription)

2. **Membership Active**
   - Entry: Stripe subscription confirmed
   - Action: Welcome pack (membership card, exclusive swag)
   - Benefits: Discounts on events, priority booking, quarterly gatherings
   - Tag: "membership_level" (Community $50, Supporter $100, Sustainer $150, Patron $200)

3. **Renewal Upcoming**
   - Action: Renewal reminder (30 days before expiry)
   - Upsell: Upgrade to higher tier?

4. **Membership Renewed**
   - Action: Thank you email, updated membership card
   - Loyalty: Year 2, 3, 5+ recognition

5. **Membership Lapsed**
   - Action: Win-back campaign (30 days after expiry)
   - Offer: Discount to rejoin

**Revenue:** 100 members × average $125/year = $12,500 annual revenue

---

### Pipeline 10: ACT Farm - Residency Applications

**Purpose:** Manage residency applications, bookings, and alumni relationships

**Stages:**
1. **Residency Inquiry**
   - Entry: "Apply for Residency" form
   - Auto-response: Residency guide, pricing, availability calendar
   - Action: Review application (research quality, mission fit)

2. **Application Under Review**
   - Action: Request additional materials (portfolio, proposal)
   - Interview: Video call to assess fit

3. **Application Approved**
   - Action: Send congratulations email, booking link
   - Tag: "priority:high"

4. **Booking Confirmed**
   - Entry: Dates selected, deposit paid (Stripe)
   - Action: Send pre-arrival pack (directions, packing list, house rules)
   - Tag: "action:booked-residency"

5. **Residency In Progress**
   - Action: Check-in emails (start, midpoint, end)
   - Support: On-site coordinator contact

6. **Residency Complete**
   - Action: Post-residency survey, request research outputs
   - Alumni: Invitation to alumni network, future events
   - Tag: "engagement:alumni", "role:artist" or "role:researcher"

7. **Research Output Published**
   - Action: Feature on website, social media, impact report
   - Recognition: Co-author on publications, media interviews

8. **Repeat Resident**
   - Action: Priority booking for alumni
   - Tag: "priority:high"

**Custom Fields:** residency_type, residency_dates, research_focus, portfolio_url

**Revenue:**
- R&D Residency: $300/night × 7 nights = $2,100 per booking
- Creative Residency: $400/night × 7 nights = $2,800 per booking
- Target: 50 residencies/year = $100,000-$150,000 annual revenue

---

### Pipeline 11: ACT Farm - Workshop Attendees

**Purpose:** Fill workshop seats, track attendance, convert to residency applicants

**Stages:**
1. **Workshop Interest**
   - Entry: Workshop registration form
   - Auto-response: Workshop details, payment link
   - Action: Add to workshop list

2. **Ticket Purchased**
   - Entry: Stripe payment confirmed
   - Action: Send confirmation, calendar invite, pre-workshop materials
   - Tag: "action:registered-workshop"

3. **Workshop Attended**
   - Action: Post-workshop survey, certificate of completion
   - Tag: "action:attended-event"

4. **Residency Interest**
   - Entry: Post-workshop survey indicates residency interest
   - Action: Send residency application link, schedule follow-up call
   - Move: To Residency Applications Pipeline

**Revenue:** Workshop $50-$150 per ticket × 20 attendees = $1,000-$3,000 per workshop

---

### Pipeline 12: Grants & Funding

**Purpose:** Track grant applications, awards, and reporting deadlines

**Stages:**
1. **Grant Opportunity Identified**
   - Entry: Manual (team identifies grant opportunity)
   - Action: Assign to team member, set internal deadline
   - Tag: "grant_name" custom field

2. **Grant Application In Progress**
   - Action: Draft application, gather supporting documents
   - Review: Internal review 1 week before deadline

3. **Grant Submitted**
   - Action: Log submission date, upload final application to Notion
   - Tag: "grant_application_status:Applied"

4. **Grant Awarded** ($$$)
   - Entry: Notification of award
   - Action: Celebration email to team, media release
   - Revenue tracking: Add grant amount to custom field
   - Tag: "grant_application_status:Awarded"

5. **Grant Reporting Due**
   - Action: Set reminders (60 days, 30 days, 7 days before deadline)
   - Compile: Impact metrics, financials, storytelling

6. **Grant Report Submitted**
   - Action: Upload report to Notion, send thank you to funder
   - Tag: "grant_reporting_due" updated

7. **Grant Declined**
   - Action: Debrief (why declined?), log learnings
   - Follow-up: Request feedback from funder
   - Tag: "grant_application_status:Declined"

**Custom Fields:** grant_name, grant_amount, grant_deadline, grant_reporting_due, grant_application_status

**Revenue:** Major grants $50k-$500k, total target $500k-$2M annually

---

### Pipeline 13: Supporters & Donors

**Purpose:** Cultivate individual donors from first gift to major donors

**Stages:**
1. **First Donation** ($)
   - Entry: Stripe donation processed
   - Auto-response: Thank you email, tax receipt
   - Tag: "role:donor", "donation_frequency:One-time"

2. **Second Donation** ($$)
   - Entry: Second donation within 12 months
   - Action: Personalized thank you call/email from team member
   - Tag: "engagement:active"

3. **Regular Donor** (3+ donations or monthly recurring) ($$$)
   - Action: Quarterly impact updates, invitation to donor appreciation events
   - Recognition: Listed on website (with permission)
   - Tag: "donation_frequency:Monthly" or "Quarterly"

4. **Major Donor** ($1000+ annual) ($$$$)
   - Action: Executive director thank you call, private tour of projects
   - Engagement: Quarterly coffee chats, strategic input opportunities
   - Tag: "priority:high"

5. **Legacy Donor** ($5000+ annual or bequest) ($$$$$)
   - Action: Dedicated relationship manager, annual impact report
   - Recognition: Naming opportunities, advisory board invitation
   - Tag: "priority:high"

6. **Lapsed Donor** (No donation 12+ months)
   - Action: Win-back campaign, "We miss you" email
   - Tag: "engagement:lapsed"

**Custom Fields:** lifetime_donation_value, first_donation_date, last_donation_date, donation_frequency

**Revenue:**
- 500 one-time donors × $50 average = $25,000
- 100 monthly donors × $25/month × 12 = $30,000
- 20 major donors × $2,000 average = $40,000
- **Total:** $95,000 annual revenue from individual donors

---

### Pipeline 14: Organizational Partnerships

**Purpose:** Build strategic partnerships with NGOs, corporations, government

**Stages:**
1. **Partnership Inquiry**
   - Entry: "Partner with Us" form or outreach
   - Action: Discovery call to assess mutual fit

2. **Proposal Development**
   - Action: Co-create partnership proposal (scope, resources, outcomes)
   - Review: Legal, budget, capacity

3. **MOU/Contract Negotiation**
   - Action: Draft agreement, legal review
   - Finalize: Terms, deliverables, timelines

4. **Partnership Active**
   - Action: Quarterly check-ins, collaborative projects
   - Track: Shared outcomes, impact metrics
   - Tag: "role:partner"

5. **Partnership Renewal**
   - Action: Renewal conversation 60 days before expiry
   - Tag: "priority:high"

6. **Partnership Completed**
   - Action: Final report, celebration event
   - Alumni: Maintain relationship for future opportunities
   - Tag: "engagement:alumni"

**Revenue:** Varies widely (in-kind, grants, revenue share) - track custom field

---

### Pipeline 15: Festival & Large Event Management

**Purpose:** Manage complex multi-day events (The Harvest Festival, etc.)

**Stages:**
1. **Early Bird Registration** (3+ months out)
   - Entry: Festival registration form, early bird discount
   - Action: Send confirmation, payment plan options
   - Tag: "event_name:harvest-festival-2026"

2. **Regular Registration** (1-3 months out)
   - Entry: Standard ticket price
   - Action: Send confirmation, what to bring, volunteer opportunities

3. **Volunteer Applications**
   - Entry: Festival volunteer form
   - Action: Assign shifts, send volunteer handbook

4. **Vendor Applications**
   - Entry: Vendor application form
   - Action: Review application, assign booth space
   - Revenue: Vendor fees $100-$500

5. **Pre-Event Communications**
   - Action: Weekly countdown emails (lineup announcements, parking info, FAQs)
   - SMS: Day-before reminder with key info

6. **Festival In Progress**
   - Action: Real-time updates (SMS for schedule changes)

7. **Post-Event Follow-Up**
   - Action: Thank you email, survey, photo gallery
   - Tag: "action:attended-event"

8. **Festival Alumni**
   - Action: Early bird access for next year's festival
   - Tag: "priority:high"

**Revenue:** 500 tickets × $75 average + 30 vendors × $250 = $37,500 + $7,500 = $45,000 per festival

---

## 📝 Complete Form Library (22 Forms)

### Universal Forms

#### Form 1: General Contact Form
**Embedded on:** All project websites (footer)

**Fields:**
- Name (required)
- Email (required)
- Phone (optional)
- Project Interest (dropdown: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV Residencies, General Inquiry)
- Message (textarea, required)
- How did you hear about us? (dropdown)
- Newsletter opt-in (checkbox: "Yes, I'd like to receive updates")

**Submission Actions:**
- Add to GHL contact list
- Tag: Based on project interest
- Add to Universal Inquiry Pipeline (Stage 1: New Inquiry)
- Trigger workflow: Auto-response email, team notification
- Log activity: Notion Activity Log

---

### Empathy Ledger Forms

#### Form 2: Become a Storyteller
**Embedded on:** empathyledger.org/become-storyteller

**Fields:**
- Name (required)
- Email (required)
- Phone (optional)
- Pronouns (dropdown)
- Indigenous status (dropdown: Aboriginal, Torres Strait Islander, Both, Non-Indigenous, Prefer not to say)
- Your story themes (multi-select: Family, Community, Culture, Justice, Healing, Land, Art, Other)
- Why do you want to share your story? (textarea)
- Cultural protocols (textarea: "Are there any cultural protocols we should be aware of?")
- Consent (checkbox: "I consent to creating a storyteller profile")

**Submission Actions:**
- Add to Empathy Ledger - Storyteller Journey Pipeline (Stage 1)
- Tag: "empathy-ledger", "role:storyteller", "engagement:lead"
- Custom fields: storyteller_status = "Inquiry"
- Trigger workflow: Welcome email with onboarding guide PDF
- Alert: Notion, team Slack channel

---

#### Form 3: Organization Partnership Inquiry
**Embedded on:** empathyledger.org/partners

**Fields:**
- Organization name (required)
- Contact person (required)
- Email (required)
- Phone (required)
- Organization type (dropdown: NGO, Government, Corporate, University, Media, Other)
- Organization size (dropdown: 1-10, 11-50, 51-200, 201-1000, 1000+)
- How would you use Empathy Ledger? (textarea)
- Estimated storytellers (number)
- Budget range (dropdown: <$5k, $5k-$25k, $25k-$100k, $100k+)
- Timeline (dropdown: Immediate, 1-3 months, 3-6 months, 6-12 months, Exploring)

**Submission Actions:**
- Add to Empathy Ledger - Organization Partnership Pipeline (Stage 1)
- Tag: "empathy-ledger", "role:partner", "engagement:prospect"
- Trigger workflow: Send partnership deck PDF, schedule discovery call
- Notify: Sales team (high priority if budget >$25k)

---

### JusticeHub Forms

#### Form 4: Get Support (Family Support)
**Embedded on:** justicehub.org.au/get-support

**Design:** Trauma-informed, simple language, mobile-friendly

**Fields:**
- Your name (required, first name only is fine)
- Phone number (required, "We'll call you")
- Email (optional)
- Location (required, suburb/town)
- What do you need help with? (checkboxes: Housing, Legal, Mental health, Employment, Family support, Education, Health, Food/essentials, Other)
- Tell us more (textarea, optional, "Share what you're comfortable sharing")
- How soon do you need support? (radio: Urgent (today), Soon (this week), Not urgent (exploring options))
- Preferred contact time (dropdown)
- Do you have a safe place to stay tonight? (radio: Yes, No, Not sure) [If "No" → immediate crisis escalation]

**Submission Actions:**
- Add to JusticeHub - Family Support Pipeline (Stage 1)
- Tag: "justicehub", "role:family", "priority:urgent" if urgent
- Custom field: family_support_needs, crisis_level
- Trigger workflow: Auto-response ("We received your request, someone will call within 24 hours")
- Alert: Team SMS/call for urgent requests (within 1 hour)
- Log: Notion (encrypted, privacy-protected)

**Special Handling:**
- Crisis protocol: If "safe place to stay = No" → immediate notification to on-call staff
- Privacy: Extra encryption, minimal data logging
- Follow-up: Phone call within 24 hours (4 hours if urgent)

---

#### Form 5: Service Provider Application
**Embedded on:** justicehub.org.au/service-providers

**Fields:**
- Organization/Business name (required)
- Contact person (required)
- Email (required)
- Phone (required)
- Service type (multi-select: Legal, Mental health, Housing, Employment, Family support, Education, Health, Addiction, Other)
- Service description (textarea, "What services do you provide?")
- Service area (text, "Which suburbs/regions do you serve?")
- Qualifications/credentials (textarea)
- Trauma-informed approach (radio: Yes, we have trauma-informed training, No, but we're willing to learn, Not applicable)
- Cultural safety (radio: Yes, we have Indigenous cultural safety protocols, No, but we're willing to learn, Not applicable)
- References (textarea, "Provide 2 professional references")
- Website (url, optional)

**Submission Actions:**
- Add to JusticeHub - Service Provider Directory Pipeline (Stage 1)
- Tag: "justicehub", "role:service-provider", "engagement:lead"
- Custom field: service_provider_type
- Trigger workflow: Application confirmation email, review checklist to team
- Review: Within 5 business days

---

#### Form 6: CONTAINED Campaign - Leader Nomination
**Embedded on:** justicehub.org.au/contained

**Fields:**
- Your name (required)
- Email (required)
- Phone (required)
- Are you nominating yourself or someone else? (radio: Self, Someone else)
- [If "Someone else"] Nominee name (required)
- [If "Someone else"] Nominee email or phone (required, "How can we reach them?")
- Connection to incarceration (checkboxes: Personal experience, Family member, Professional, Advocate, Other)
- Why are you interested in this campaign? (textarea)
- What change do you want to see in the justice system? (textarea)
- Availability for 2-hour workshop (dropdown: Weekday morning, Weekday afternoon, Weekend morning, Weekend afternoon, Flexible)
- Consent (checkbox: "I consent to being contacted about the CONTAINED campaign")

**Submission Actions:**
- Add to JusticeHub - CONTAINED Campaign Pipeline (Stage 1)
- Tag: "justicehub", "campaign:contained", "role:leader"
- Custom field: contained_leader_status = "Nominated", incarceration_connection
- Trigger workflow: Thank you email, workshop invitation
- Notify: Campaign coordinator

---

### The Harvest Forms

#### Form 7: Volunteer Application
**Embedded on:** theharvest.org.au/volunteer

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Age (dropdown: Under 18, 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
- [If "Under 18"] Parent/guardian name and contact (required)
- Volunteer interests (multi-select: Gardening, Events, Kitchen/food prep, Admin/office, Maintenance, Teaching/workshops, Childcare, Other)
- Availability (checkboxes: Weekday mornings, Weekday afternoons, Weekday evenings, Weekend mornings, Weekend afternoons)
- Skills/experience (textarea, optional)
- Physical limitations or accessibility needs (textarea, optional)
- Emergency contact name and phone (required)
- How did you hear about us? (dropdown)
- Orientation dates (dropdown: Pre-populated with next 3 orientation sessions, or "None of these work, please contact me")

**Submission Actions:**
- Add to The Harvest - Volunteer Journey Pipeline (Stage 1)
- Tag: "the-harvest", "role:volunteer", "engagement:lead"
- Custom field: volunteer_interests
- Trigger workflow: Welcome email with volunteer handbook, orientation confirmation
- Log: Notion Activity Log

---

#### Form 8: Event Registration
**Embedded on:** theharvest.org.au/events/[event-slug]

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Number of tickets (number, default 1)
- Dietary requirements (textarea, optional)
- Accessibility needs (textarea, optional)
- How did you hear about this event? (dropdown)
- Newsletter opt-in (checkbox)

**Submission Actions:**
- Add to The Harvest - Event Registrations Pipeline (Stage 1)
- Tag: "the-harvest", "action:registered-event", "event_name:[event-name]"
- Custom field: event_name, event_date, dietary_preferences
- Trigger workflow:
  - If paid event → Send Stripe payment link
  - If free event → Send confirmation + calendar invite
- Log: Notion Activity Log

---

#### Form 9: Membership Application
**Embedded on:** theharvest.org.au/membership

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Address (text, required for membership card)
- Membership tier (radio: Community $50/year, Supporter $100/year, Sustainer $150/year, Patron $200/year)
- Payment frequency (radio: Annual (pay once), Monthly (pay monthly))
- Why do you want to become a member? (textarea, optional)
- Newsletter opt-in (checkbox, default checked)

**Submission Actions:**
- Add to The Harvest - Membership Program Pipeline (Stage 1)
- Tag: "the-harvest", "role:donor", "membership_level:[tier]"
- Custom field: membership_level, membership_expiry_date (1 year from today)
- Trigger workflow: Send Stripe subscription link
- Post-payment: Welcome email with membership card PDF, exclusive member benefits

---

### ACT Farm Forms

#### Form 10: Residency Application
**Embedded on:** actfarm.org.au/residencies/apply

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Pronouns (dropdown)
- Residency type (radio: R&D Residency ($300/night), Creative Residency ($400/night), Wellbeing Residency ($350/night), Research Partnership ($500/night))
- Proposed dates (date range picker, "Check availability calendar first")
- Number of nights (number, auto-calculated from dates)
- Your project (textarea, "Describe your research, creative practice, or wellbeing focus")
- Expected outcomes (textarea, "What do you hope to achieve during your residency?")
- Portfolio/website (url, optional but recommended for creatives)
- Dietary requirements (textarea)
- Accessibility needs (textarea)
- How did you hear about us? (dropdown)
- References (textarea, "Provide 1-2 professional references")

**Submission Actions:**
- Add to ACT Farm - Residency Applications Pipeline (Stage 1)
- Tag: "act-farm", "role:artist" or "role:researcher", "engagement:prospect"
- Custom field: residency_type, residency_dates, research_focus, portfolio_url
- Trigger workflow: Application confirmation email, send to review committee
- Review: Within 7 business days

---

#### Form 11: Workshop Registration
**Embedded on:** actfarm.org.au/workshops/[workshop-slug]

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Number of tickets (number, default 1, max 4)
- Dietary requirements (textarea, optional)
- Experience level (radio: Beginner, Intermediate, Advanced) [for skill-based workshops]
- What do you hope to learn? (textarea, optional)
- Newsletter opt-in (checkbox)

**Submission Actions:**
- Add to ACT Farm - Workshop Attendees Pipeline (Stage 1)
- Tag: "act-farm", "action:registered-workshop"
- Custom field: event_name, event_date
- Trigger workflow: Send Stripe payment link → Confirmation + calendar invite after payment
- Post-workshop: Survey with residency upsell question

---

### Goods on Country Forms

#### Form 12: Product Inquiry
**Embedded on:** goodsoncountry.org.au/contact

**Fields:**
- Name (required)
- Email (required)
- Phone (optional)
- Interest (radio: Buy products (retail), Partner (wholesale), Collaborate (producer), Other)
- Message (textarea)

**Submission Actions:**
- Add to Universal Inquiry Pipeline
- Tag: "goods-on-country", "goods_interest:[selection]"
- Trigger workflow: Auto-response with product catalog or partnership info

---

### BCV Residencies Forms

#### Form 13: Artist Residency Application
**Embedded on:** blackcockatoovalley.org.au/artist-residencies

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Artistic medium (text, "e.g., Photography, Painting, Sculpture, Performance, etc.")
- Your practice (textarea, "Tell us about your artistic practice")
- Residency proposal (textarea, "What would you create during your residency?")
- Portfolio (url, required, "Link to your portfolio or website")
- Preferred dates (date range picker)
- Number of nights (number)
- Dietary requirements (textarea)
- How did you hear about us? (dropdown)

**Submission Actions:**
- Add to ACT Farm - Residency Applications Pipeline (Stage 1)
- Tag: "bcv-residencies", "role:artist", "engagement:prospect"
- Custom field: artistic_medium, portfolio_url, residency_dates
- Trigger workflow: Application confirmation, send to review committee

---

### Grant & Funding Forms

#### Form 14: Grant Application Support Request (Internal)
**Embedded on:** Internal team portal (Notion)

**Purpose:** Team members request grant writing support

**Fields:**
- Project (dropdown: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV, General)
- Grant name (text, required)
- Grant organization (text, required)
- Grant amount (number, required)
- Deadline (date, required)
- Grant description (textarea)
- Project fit (textarea, "Why is this grant a good fit for us?")
- Lead team member (dropdown, pre-populated with team names)

**Submission Actions:**
- Add to Grants & Funding Pipeline (Stage 1)
- Tag: Project-specific tag
- Custom fields: grant_name, grant_amount, grant_deadline
- Notify: Grant writing team
- Create: Notion project page with application checklist

---

### Donor Forms

#### Form 15: One-Time Donation
**Embedded on:** All project websites (donate button)

**Fields:**
- Name (required)
- Email (required)
- Donation amount (radio: $25, $50, $100, $250, $500, Other [text input])
- Designation (dropdown: Where needed most, Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV)
- Message (textarea, optional, "Any message for the team?")
- Anonymous? (checkbox, "Don't list my name publicly")
- Newsletter opt-in (checkbox, default checked)

**Submission Actions:**
- Trigger: Stripe donation checkout
- Post-payment webhook:
  - Add to Supporters & Donors Pipeline (Stage 1)
  - Tag: "role:donor", "donation_frequency:One-time"
  - Custom fields: first_donation_date, lifetime_donation_value
  - Trigger workflow: Thank you email with tax receipt
  - Log: Notion Activity Log

---

#### Form 16: Monthly Giving
**Embedded on:** donate.actstudio.org.au/monthly

**Fields:**
- Name (required)
- Email (required)
- Monthly amount (radio: $10, $25, $50, $100, $250, Other [text input])
- Designation (dropdown: Where needed most, Empathy Ledger, JusticeHub, The Harvest, ACT Farm)
- Start date (date, default to 1st of next month)
- Anonymous? (checkbox)
- Newsletter opt-in (checkbox, default checked)

**Submission Actions:**
- Trigger: Stripe subscription checkout
- Post-payment webhook:
  - Add to Supporters & Donors Pipeline (Stage 2)
  - Tag: "role:donor", "donation_frequency:Monthly"
  - Custom fields: first_donation_date, lifetime_donation_value
  - Trigger workflow: Thank you email, monthly receipt automation
  - Recognition: Monthly donor newsletter (exclusive updates)

---

### Partnership Forms

#### Form 17: Corporate Partnership Inquiry
**Embedded on:** actstudio.org.au/corporate-partners

**Fields:**
- Company name (required)
- Contact person (required)
- Email (required)
- Phone (required)
- Company size (dropdown: 1-10, 11-50, 51-200, 201-1000, 1000+)
- Partnership interest (checkboxes: Sponsorship, Employee engagement, CSR collaboration, In-kind support, Grant, Other)
- Budget range (dropdown: <$5k, $5k-$25k, $25k-$100k, $100k+, Exploring)
- Tell us about your company's values and why you want to partner (textarea)

**Submission Actions:**
- Add to Organizational Partnerships Pipeline (Stage 1)
- Tag: "role:partner", "engagement:prospect", "priority:high" if budget >$25k
- Trigger workflow: Send partnership prospectus PDF, schedule discovery call
- Notify: Executive director

---

### Festival & Event Forms

#### Form 18: Festival Early Bird Registration
**Embedded on:** theharvest.org.au/festival

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Ticket type (radio: Adult $75, Child (under 12) $35, Family (2 adults + 2 kids) $200)
- Number of tickets (number per type)
- Camping? (radio: Yes (bring own tent), Yes (need tent rental), No)
- [If camping] Number of nights (number)
- Dietary requirements (textarea, for catering)
- Volunteer interest? (checkbox, "I'm interested in volunteering at the festival")
- Newsletter opt-in (checkbox)

**Submission Actions:**
- Add to Festival & Large Event Management Pipeline (Stage 1)
- Tag: "the-harvest", "event_name:harvest-festival-2026", "action:registered-event"
- Custom field: event_date, ticket_type
- Trigger workflow: Send Stripe payment link → Confirmation after payment
- Pre-event: Weekly countdown emails

---

#### Form 19: Festival Vendor Application
**Embedded on:** theharvest.org.au/festival/vendors

**Fields:**
- Business name (required)
- Contact person (required)
- Email (required)
- Phone (required)
- Vendor type (radio: Food, Craft, Art, Wellness, Education, Other)
- Booth size (radio: Small (3m x 3m) $100, Medium (3m x 6m) $200, Large (6m x 6m) $350)
- Describe your products/services (textarea)
- Website/social media (url, optional)
- Have you vended at festivals before? (radio: Yes, No)
- [If yes] Which festivals? (textarea)
- Insurance (checkbox, required: "I confirm I have public liability insurance")
- Agree to festival terms (checkbox, required)

**Submission Actions:**
- Add to Festival & Large Event Management Pipeline (Stage 4: Vendor Applications)
- Tag: "the-harvest", "event_name:harvest-festival-2026", "role:vendor"
- Trigger workflow: Application confirmation, send vendor handbook
- Review: Within 7 days, approve/decline with reasoning

---

#### Form 20: Festival Volunteer Application
**Embedded on:** theharvest.org.au/festival/volunteer

**Fields:**
- Name (required)
- Email (required)
- Phone (required)
- Age (dropdown: Under 18, 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
- Shift preferences (checkboxes: Setup (Fri), Day 1 (Sat AM), Day 1 (Sat PM), Day 2 (Sun AM), Day 2 (Sun PM), Packdown (Sun evening))
- Role preferences (checkboxes: Info booth, Ticket scanning, Setup/packdown, Stage management, Parking, First aid, Other)
- Experience (textarea, optional, "Any relevant experience?")
- T-shirt size (dropdown, for volunteer shirt)
- Emergency contact (text)

**Submission Actions:**
- Add to Festival & Large Event Management Pipeline (Stage 3: Volunteer Applications)
- Tag: "the-harvest", "event_name:harvest-festival-2026", "role:volunteer"
- Trigger workflow: Confirmation email, shift assignment (closer to event)

---

### Additional Forms

#### Form 21: Newsletter Signup (Standalone)
**Embedded on:** All websites (footer, popup)

**Fields:**
- Email (required)
- Name (optional, "First name helps us personalize emails")
- Interests (checkboxes: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV Residencies, General updates)

**Submission Actions:**
- Add to GHL contact list
- Tag: Based on interests selected
- Tag: "engagement:lead"
- Trigger workflow: Welcome email with double opt-in confirmation
- Add to: Monthly newsletter list (segmented by interests)

---

#### Form 22: Unsubscribe/Update Preferences
**Embedded on:** Footer of every email

**Fields:**
- Email (pre-populated from email link)
- Update preferences (checkboxes: Keep me on newsletter, Remove me from newsletter, Change email address, Update interests)
- [If change email] New email address (email)
- [If update interests] Interests (checkboxes: same as signup form)

**Submission Actions:**
- Update GHL contact
- If unsubscribe: Tag "engagement:opted-out", remove from all marketing lists
- If update: Update tags and preferences
- Trigger workflow: Confirmation email

---

## 📧 Complete Workflow & Automation Library (35+ Workflows)

### Universal Workflows

#### Workflow 1: New Contact Welcome Sequence
**Trigger:** Contact added to GHL (any form submission)

**Sequence:**
- **Day 0:** Welcome email
  - Subject: "Welcome to the ACT community, [FirstName]!"
  - Body: Thank you for connecting, here's what we're about (LCAA intro), links to all projects, invite to follow on social media
  - CTA: "Explore our projects" → link to website overview page

- **Day 3:** Value email (based on project interest tag)
  - If tagged "empathy-ledger" → Send storyteller success stories
  - If tagged "justicehub" → Send impact stats, family testimonials
  - If tagged "the-harvest" → Send volunteer stories, upcoming events
  - If tagged "act-farm" → Send residency alumni projects, conservation impact
  - Subject: "Stories from [Project Name]"

- **Day 7:** Engagement prompt
  - Subject: "How can we support you, [FirstName]?"
  - Body: Quick survey (2 questions: What interests you most? How would you like to get involved?)
  - Tag based on responses

- **Day 14:** Newsletter invitation
  - Subject: "Stay connected - join our monthly newsletter"
  - Body: Newsletter preview, frequency (monthly), what to expect
  - CTA: "Subscribe" (if not already subscribed)

**Exit Conditions:**
- If contact replies to any email → Tag "engagement:active", move to appropriate pipeline
- If contact opens 3+ emails → Tag "engagement:engaged"
- If contact doesn't open any emails → Tag "engagement:cold", pause sequence after Day 7

---

#### Workflow 2: Monthly Newsletter
**Trigger:** Manual (1st of every month)

**Audience Segmentation:**
- List 1: Empathy Ledger subscribers → Storytelling focus
- List 2: JusticeHub subscribers → Justice reform focus
- List 3: The Harvest subscribers → Community events, volunteer opportunities
- List 4: ACT Farm subscribers → Residencies, workshops, conservation
- List 5: All ACT subscribers → Ecosystem-wide updates

**Content Structure:**
- Greeting: "Hi [FirstName], here's what's happening at [Project Name]..."
- Section 1: Big News (1 major story/achievement)
- Section 2: Upcoming Events/Opportunities (3-5 items)
- Section 3: Spotlight (featured storyteller, volunteer, resident, or partner)
- Section 4: Impact Numbers (monthly stats)
- CTA: "Get involved" → specific action (volunteer, attend event, apply for residency, etc.)
- Footer: Unsubscribe, update preferences

**Workflow Actions:**
- Send email
- Tag: "campaign:newsletter-[month]"
- Track: Open rate, click rate (monitor in GHL analytics)

---

#### Workflow 3: Inactivity Re-Engagement Campaign
**Trigger:** Contact tagged "engagement:lapsed" (no activity 6+ months)

**Sequence:**
- **Day 0:** "We miss you" email
  - Subject: "We haven't heard from you in a while, [FirstName]"
  - Body: We value your connection, here's what you've missed (major updates), invite to reconnect
  - CTA: "Let us know you're still interested" → simple survey (Yes, I'm still interested | No, please remove me)

- **Day 7:** Value reminder (if no response)
  - Subject: "3 ways to stay connected"
  - Body: Option 1 (low commitment): Subscribe to newsletter, Option 2 (medium): Attend an event, Option 3 (high): Volunteer/participate
  - CTA: 3 buttons for each option

- **Day 14:** Last chance (if no response)
  - Subject: "Last email from us, [FirstName]"
  - Body: We don't want to clutter your inbox. If you'd like to stay connected, click here. Otherwise, we'll remove you from our list in 7 days.
  - CTA: "Keep me on the list" → moves to "engagement:lead", "I'm not interested" → tags "engagement:opted-out"

- **Day 21:** Auto-remove (if no response)
  - Action: Tag "engagement:opted-out", remove from all marketing lists (but keep in CRM for future reference)

**Exit Conditions:**
- If contact clicks "keep me on list" → Move to New Contact Welcome Sequence (Day 3)
- If contact opts out → Tag "engagement:opted-out", no further marketing emails

---

### Empathy Ledger Workflows

#### Workflow 4: Storyteller Onboarding Sequence
**Trigger:** Contact enters Empathy Ledger - Storyteller Journey Pipeline (Stage 1)

**Sequence:**
- **Day 0:** Welcome email
  - Subject: "Welcome to Empathy Ledger, [FirstName]!"
  - Body: Thank you for joining, what to expect, how it works (3-step process: create profile, share story, connect with others)
  - Attachment: Onboarding guide PDF (screenshots, FAQs)
  - CTA: "Create your profile" → link to Empathy Ledger signup

- **Day 3:** Profile completion reminder (if not completed)
  - Subject: "Ready to complete your profile?"
  - Body: Your story matters, we're here to support you, profile completion tips
  - CTA: "Complete your profile" → link to profile page

- **Day 7:** Cultural protocols email
  - Subject: "Your story, your terms"
  - Body: Explanation of consent, cultural protocols, Elder review (if applicable), data sovereignty
  - Video: 2-minute explainer on how Empathy Ledger protects storytellers
  - CTA: "Learn more about our protocols" → link to protocols page

- **Day 14:** First story prompt (if profile complete but no story)
  - Subject: "What story will you share first?"
  - Body: Story prompts (family, community, culture, justice), examples from other storytellers
  - CTA: "Share your first story" → link to story creation page

- **Day 21:** Community connection
  - Subject: "You're not alone - meet other storytellers"
  - Body: Invite to storyteller community calls (monthly), link to storyteller directory (public profiles)
  - CTA: "Join the next community call" → calendar invite

**Exit Conditions:**
- If storyteller shares first story → Move to Stage 4 (First Story Submitted), send celebration email
- If no activity after 30 days → Tag "engagement:lapsed", pause sequence

---

#### Workflow 5: AI Consent Campaign (Empathy Ledger)
**Trigger:** Storyteller profile created, ai_processing_consent = NULL

**Sequence:**
- **Day 0:** AI consent invitation
  - Subject: "Help us improve Empathy Ledger with AI (your choice)"
  - Body: Explanation of how AI works (theme extraction, storyteller connections), what it does NOT do (never shares stories without consent, never sends data to external companies), benefits (discover connections, find similar stories), optional (you decide)
  - Video: 90-second explainer with ACT Voice team member
  - CTA: "Yes, I consent to AI processing" → updates custom field, "No, I prefer not to" → updates custom field, "I need more information" → links to detailed FAQ

- **Day 7:** Follow-up (if no response)
  - Subject: "Questions about AI on Empathy Ledger?"
  - Body: FAQ (top 5 questions), testimonial from storyteller who consented (positive experience)
  - CTA: Same as Day 0

- **Day 14:** Final reminder (if no response)
  - Subject: "Last chance to opt in to AI processing"
  - Body: We respect your choice, here's what you'll miss (storyteller connections, theme discovery), reminder that consent can be changed anytime
  - CTA: Same as Day 0

- **No response after 21 days:** Default to "No consent" (opt-in model)

**Exit Conditions:**
- If consent granted → Tag "ai_processing_consent:Yes", move to Stage 3 (Profile Complete)
- If consent denied → Tag "ai_processing_consent:No", respect choice, no further AI prompts

**Current Status:** 90.5% opt-in rate (210/232 storytellers) - strong success!

---

#### Workflow 6: Organization Partnership Nurture Sequence
**Trigger:** Contact enters Empathy Ledger - Organization Partnership Pipeline (Stage 1)

**Sequence:**
- **Day 0:** Partnership deck
  - Subject: "Partner with Empathy Ledger - Platform Overview"
  - Body: Thank you for your interest, here's how we support organizations
  - Attachment: Partnership deck PDF (pricing tiers, case studies, technical specs)
  - CTA: "Schedule a discovery call" → Calendly link

- **Day 3:** Case study (if no call scheduled)
  - Subject: "How [Partner Org] used Empathy Ledger for [Use Case]"
  - Body: Detailed case study (storyteller engagement, impact metrics, ROI)
  - Video: Testimonial from partner org
  - CTA: "See it in action - book a demo"

- **Day 7:** Pricing comparison (if no call scheduled)
  - Subject: "Which Empathy Ledger plan is right for you?"
  - Body: Pricing tiers explained (Starter, Professional, Enterprise), feature comparison table
  - CTA: "Let's discuss pricing" → Calendly link

- **Day 14:** Social proof (if no call scheduled)
  - Subject: "Join [X] organizations using Empathy Ledger"
  - Body: Logo wall of current partners, testimonials, impact stats
  - CTA: "Start your pilot today" → link to pilot application

- **Day 21:** Last touch (if no call scheduled)
  - Subject: "Is now the right time, [FirstName]?"
  - Body: We understand timing might not be right, stay in touch, low-pressure ask to keep conversation open
  - CTA: "Not ready? Join our partner newsletter" → quarterly updates for prospects

**Exit Conditions:**
- If discovery call scheduled → Move to Stage 2, pause email sequence
- If no response after 30 days → Tag "engagement:lapsed", move to quarterly partner newsletter list

---

### JusticeHub Workflows

#### Workflow 7: Family Support Intake Process
**Trigger:** Contact enters JusticeHub - Family Support Pipeline (Stage 1)

**Immediate Actions (Within 1 hour):**
1. Auto-response email: "We received your request, someone will call within 24 hours"
2. SMS: "Hi [FirstName], this is JusticeHub. We got your support request and will call you at [Phone] within 24 hours. If urgent, call us at [Emergency Number]."
3. Team alert: Slack notification to on-call staff with contact details, support needs, urgency level

**Priority Intake Call (Within 24 hours, 4 hours if urgent):**
- Script: Trauma-informed intake questions (needs assessment, current situation, preferred services)
- Document: Support needs in custom field, crisis level
- Action: Warm handoff to 1-3 service providers

**Follow-Up Sequence:**
- **Day 3:** Check-in SMS
  - "Hi [FirstName], it's JusticeHub. Did you connect with [Service Provider]? Reply YES if you did, NO if you need more help."
  - If NO → Immediate call from coordinator

- **Day 7:** Check-in call
  - "How are things going with [Service]? Do you need additional support?"
  - Document: Outcomes, satisfaction, next steps

- **Day 30, 60, 90:** Monthly check-ins
  - SMS then call if no response
  - Document: Progress, new needs, referrals

- **6 months:** Long-term follow-up
  - "Hi [FirstName], it's been 6 months since we connected. How are you doing?"
  - Celebrate: Success stories, offer continued support if needed
  - Request: Testimonial (optional, with consent)

**Exit Conditions:**
- If family reports "all needs met" → Move to Stage 5 (Support Complete), celebrate success
- If family non-responsive (3+ attempts, no contact) → Tag "engagement:lapsed", note in file, try again in 60 days

**Special Handling:**
- Crisis protocol: If family indicates immediate danger (domestic violence, homelessness, suicide risk) → immediate escalation to on-call manager, call emergency services if needed, follow-up within 2 hours

---

#### Workflow 8: CONTAINED Campaign Onboarding
**Trigger:** Contact enters JusticeHub - CONTAINED Campaign Pipeline (Stage 1)

**Sequence:**
- **Day 0:** Thank you email
  - Subject: "Thank you for joining the CONTAINED campaign"
  - Body: Your voice matters, campaign overview, what to expect (2-hour workshop, policy advocacy opportunities)
  - Video: Campaign intro from campaign lead (2 minutes)
  - CTA: "Learn more about the campaign" → link to campaign page

- **Day 3:** Workshop invitation
  - Subject: "Join us for a CONTAINED workshop"
  - Body: Workshop details (date, time, location, format), what we'll cover (storytelling, policy recommendations, collective power)
  - Honorarium: Mention $200 stipend for participation
  - CTA: "Book your workshop" → Calendly link

- **Day 7:** Workshop reminder (if booked)
  - Subject: "CONTAINED workshop - what to bring"
  - Body: Logistics (parking, accessibility, what to bring), workshop agenda, contact for questions
  - Attachment: Pre-workshop materials (policy brief, storytelling tips)

- **Day -1 (day before workshop):** Final reminder
  - Email + SMS: "See you tomorrow at [Time] for CONTAINED workshop. Address: [Location]. Questions? Call [Number]."

**Post-Workshop Sequence:**
- **Day 0 (same day):** Thank you email
  - Subject: "Thank you for sharing your story today"
  - Body: Honorarium details (payment within 5 business days), next steps (how we'll use your input), stay involved (policy events, advocacy opportunities)
  - Attachment: Workshop photos (with consent)

- **Day 7:** Policy update
  - Subject: "Your voice is making a difference"
  - Body: Policy progress (how workshop input is being used), upcoming advocacy opportunities (meetings with policymakers, media interviews)
  - CTA: "Stay involved" → opt-in to campaign updates

- **Ongoing:** Quarterly campaign updates
  - Major policy wins, media coverage, new opportunities to engage
  - Celebrate: Leader contributions, collective impact

**Exit Conditions:**
- If leader attends workshop → Move to Stage 4 (Workshop Attended), tag "action:attended-event"
- If leader opts out → Tag "engagement:opted-out", respect choice, no further campaign emails

---

### The Harvest Workflows

#### Workflow 9: Volunteer Orientation Sequence
**Trigger:** Contact enters The Harvest - Volunteer Journey Pipeline (Stage 1)

**Sequence:**
- **Day 0:** Welcome email
  - Subject: "Welcome to The Harvest volunteer family, [FirstName]!"
  - Body: Thank you for signing up, volunteer overview (what we do, why it matters), next steps (orientation session)
  - Attachment: Volunteer handbook PDF (policies, expectations, FAQs)
  - CTA: "Book your orientation" → link to orientation dates

- **Day 3:** Orientation reminder (if booked)
  - Subject: "Your orientation is coming up!"
  - Body: Date, time, location, what to bring (closed-toe shoes, water bottle, sun protection), parking info
  - CTA: "Add to calendar" → .ics file

- **Day -1 (day before orientation):** Final reminder
  - Email + SMS: "See you tomorrow at [Time] for volunteer orientation. Dress for outdoor work. Excited to meet you!"

**Post-Orientation Sequence:**
- **Day 0 (same day):** Thank you email
  - Subject: "Great to meet you today, [FirstName]!"
  - Body: Recap of orientation, volunteer portal login details, shift signup instructions
  - CTA: "Sign up for your first shift" → link to volunteer portal

- **Day 3:** First shift prompt (if no shift booked)
  - Subject: "Ready for your first shift?"
  - Body: Available shifts (next 2 weeks), shift descriptions (what to expect), coordinator contacts
  - CTA: "Book a shift" → link to portal

- **Day 7:** Community connection
  - Subject: "Meet your fellow volunteers"
  - Body: Volunteer directory (names, interests, contact), invite to monthly volunteer social
  - CTA: "RSVP to next volunteer social" → event link

**Ongoing (Active Volunteer):**
- **Weekly:** Shift reminders (2 days before, 1 day before)
- **Monthly:** Volunteer newsletter (thank you message, volunteer spotlight, upcoming events, impact stats)
- **Quarterly:** Appreciation events (BBQ, movie night, farm tour)
- **Milestones:** Celebration emails (10 hrs, 50 hrs, 100 hrs) with certificate + thank you gift

**Exit Conditions:**
- If volunteer completes first shift → Move to Stage 5 (Active Volunteer), tag "engagement:active"
- If no shift within 30 days of orientation → Tag "engagement:lapsed", send re-engagement email

---

#### Workflow 10: Event Registration Confirmation & Reminders
**Trigger:** Contact enters The Harvest - Event Registrations Pipeline (Stage 1)

**Sequence:**
- **Day 0:** Registration confirmation
  - Email: "You're registered for [Event Name]!"
  - Body: Event details (date, time, location, parking), what to bring, contact for questions
  - Attachment: Ticket PDF (QR code), calendar invite (.ics)
  - If paid event: Receipt + tax deductibility info

- **7 days before event:** Pre-event email
  - Subject: "[Event Name] is next week - here's what to know"
  - Body: Detailed agenda, speaker bios, parking map, weather contingency plan
  - CTA: "Invite a friend" → referral link (if applicable)

- **1 day before event:** Final reminder
  - Email + SMS: "See you tomorrow at [Time] for [Event Name]! Don't forget to bring [Items]."

**Post-Event Sequence:**
- **Day 1 (day after event):** Thank you email
  - Subject: "Thanks for coming to [Event Name]!"
  - Body: Event recap, photos (with consent), survey link
  - CTA: "Share your feedback" → 2-minute survey

- **Day 7:** Engagement prompt
  - Subject: "Loved [Event Name]? Here's what's next"
  - Body: Upcoming events, volunteer opportunities, membership invitation
  - CTA: Based on survey responses (if they liked it → invite to next event, if interested in volunteering → link to volunteer form)

**Exit Conditions:**
- If attendee completes survey → Tag based on feedback (satisfied, neutral, unsatisfied)
- If attendee registers for another event → Tag "engagement:active", "action:repeat-attendee"

---

### ACT Farm Workflows

#### Workflow 11: Residency Application Review Process
**Trigger:** Contact enters ACT Farm - Residency Applications Pipeline (Stage 1)

**Immediate Actions:**
- **Day 0:** Application confirmation
  - Subject: "We received your residency application"
  - Body: Thank you, what to expect (review within 7 days), application overview
  - CTA: "Track your application status" → link to application portal (future feature)

**Review Process (Internal, 7 days):**
- Assign to review committee (3 members)
- Criteria: Mission alignment, research/creative quality, expected outcomes, feasibility
- Decision: Approve, Request more info, Decline

**Approval Path:**
- **Day 7:** Approval email
  - Subject: "Congratulations! Your residency application is approved"
  - Body: Celebration, next steps (booking dates, deposit payment), pre-arrival info
  - CTA: "Book your residency dates" → Calendly link (availability-based booking)

- **Booking confirmed:** Pre-arrival sequence
  - **30 days before:** Pre-arrival email #1 (logistics: directions, what to pack, house rules, local amenities)
  - **7 days before:** Pre-arrival email #2 (final details: check-in process, key pickup, emergency contacts, meal planning)
  - **1 day before:** SMS: "Looking forward to hosting you tomorrow! Check-in starts at 2pm. Safe travels!"

**During Residency:**
- **Day 1:** Check-in call (coordinator: "How's everything? Need anything?")
- **Midpoint:** Midpoint check-in (email or in-person: progress on project, additional support needed?)
- **Day -1 (last day):** Check-out reminder (email: check-out process, feedback survey, research output submission)

**Post-Residency:**
- **Day 1 (after departure):** Thank you email
  - Subject: "Thank you for your time at Black Cockatoo Valley"
  - Body: We hope you had a productive residency, request research outputs/creative work, alumni network invitation
  - CTA: "Share your research outputs" → upload link, "Join our alumni network" → Slack/email list

- **Day 30:** Research output reminder (if not submitted)
  - Subject: "How did your residency project go?"
  - Body: We'd love to feature your work, gentle reminder about research output submission
  - CTA: "Upload your outputs" → link

- **Day 90:** Feature opportunity
  - Subject: "We'd love to feature your residency project"
  - Body: Request blog post, photos, interview for website/social media
  - CTA: "Share your story" → interview questionnaire

**Alumni Engagement (Ongoing):**
- **Quarterly:** Alumni newsletter (residency updates, new research from other residents, upcoming events, repeat residency discounts)
- **Annual:** Alumni gathering (virtual or in-person reunion)

**Decline Path:**
- **Day 7:** Decline email
  - Subject: "Thank you for your residency application"
  - Body: Unfortunately we can't accommodate your application at this time (reason: not a good fit, capacity full, timing), encourage to reapply, alternative suggestions (workshops, shorter visits)
  - CTA: "Explore our workshops" → workshop calendar

**Exit Conditions:**
- If approved → Move to Stage 3 (Application Approved)
- If declined → Move to Stage out of pipeline, tag "engagement:alumni", add to quarterly alumni newsletter

---

### Grant & Funding Workflows

#### Workflow 12: Grant Deadline Reminders (Internal)
**Trigger:** Contact (grant opportunity) in Grants & Funding Pipeline with grant_deadline approaching

**Reminder Sequence:**
- **60 days before deadline:** First reminder
  - Email to lead team member: "Grant deadline in 60 days: [Grant Name]"
  - Action items: Schedule application writing sessions, assign sections, gather supporting docs

- **30 days before deadline:** Second reminder
  - Email: "Grant deadline in 30 days: [Grant Name]"
  - Action items: Complete first draft, schedule internal review

- **14 days before deadline:** Third reminder
  - Email: "Grant deadline in 2 weeks: [Grant Name]"
  - Action items: Finalize application, gather signatures, legal review

- **7 days before deadline:** Final reminder
  - Email + Slack: "Grant deadline in 1 WEEK: [Grant Name]"
  - Action items: Submit application, confirm submission receipt

- **1 day before deadline:** Urgent reminder
  - Email + SMS: "Grant deadline TOMORROW: [Grant Name]"

**Post-Submission:**
- **Day 1 (after submission):** Confirmation
  - Email to team: "Grant submitted: [Grant Name]"
  - Action: Upload final application to Notion, log submission date

- **Expected notification date:** Decision reminder
  - Email to team: "Grant decision expected this week: [Grant Name]"
  - Monitor: Check email/portal daily

**Award Path:**
- **Day 0 (award notification):** Celebration
  - Email to team: "🎉 GRANT AWARDED: [Grant Name] - $[Amount]!"
  - Action: Schedule team celebration, media release, update website
  - Move to Stage 4 (Grant Awarded)

- **Reporting reminders:** (60 days, 30 days, 7 days before grant_reporting_due)
  - Same sequence as deadline reminders

**Decline Path:**
- **Day 0 (decline notification):** Debrief
  - Email to team: "Grant declined: [Grant Name]"
  - Action: Request funder feedback, debrief meeting (what can we improve?), log learnings in Notion

---

### Donor Workflows

#### Workflow 13: Donor Thank You & Cultivation Sequence
**Trigger:** Contact enters Supporters & Donors Pipeline (Stage 1: First Donation)

**Immediate Actions (Same day):**
- **Auto-response email:** Tax receipt + thank you
  - Subject: "Thank you for your donation, [FirstName]!"
  - Body: Your donation of $[Amount] will support [Project/General], tax receipt attached, impact story (how donations are used)
  - Attachment: Tax receipt PDF (legal requirements)

**Cultivation Sequence:**
- **Day 3:** Personalized thank you (if donation >$100)
  - Manual email from team member: Personal message, mention specific project/impact, invitation to stay connected

- **Day 30:** Impact update
  - Subject: "Your donation is making a difference"
  - Body: Impact story (photos, testimonials, metrics), transparency (how funds were used), invitation to learn more
  - CTA: "See our latest impact report" → link to annual report

- **Day 90:** Second gift ask (soft ask)
  - Subject: "Would you consider supporting us again?"
  - Body: Reminder of previous donation, new need/opportunity, no pressure ask
  - CTA: "Donate again" → link to donation page

- **Day 180:** Major donor upgrade prompt (if lifetime_donation_value >$500)
  - Subject: "Join our major donor circle"
  - Body: Invitation to become a sustaining donor (monthly giving), major donor benefits (exclusive updates, tour invitations, advisory input)
  - CTA: "Become a monthly donor" → link to monthly giving page

**Ongoing (Active Donor):**
- **Quarterly:** Donor newsletter (impact updates, financials, behind-the-scenes stories)
- **Annual:** Year-end appeal (November/December)
- **Donor appreciation events:** Exclusive gatherings (farm tours, storyteller events, behind-the-scenes access)

**Lapsed Donor Re-Engagement:**
- **12 months after last donation:** Win-back campaign
  - Subject: "We miss you, [FirstName]"
  - Body: Thank you for past support, update on how previous donation was used, new needs/opportunities
  - CTA: "Support us again" → link to donation page

**Exit Conditions:**
- If second donation → Move to Stage 2 (Second Donation), tag "engagement:active"
- If no response to win-back → Tag "engagement:lapsed", remove from donor newsletter (but keep in general newsletter if subscribed)

---

## 📨 Newsletter & Campaign Strategy

### Monthly Newsletter Cadence

**Primary Newsletter: "ACT Ecosystem Updates"**
- **Frequency:** Monthly (1st of each month)
- **Audience:** All subscribers (20,000+ target)
- **Content:** Ecosystem-wide news, cross-project highlights, upcoming events
- **Segments:**
  - General subscribers → All ecosystem updates
  - Project-specific subscribers → Highlighted sections for their project

**Secondary Newsletters:**
- **Empathy Ledger Stories:** Quarterly (showcases 3-5 featured stories)
- **JusticeHub Impact Report:** Quarterly (policy updates, family success stories)
- **The Harvest Community News:** Monthly (volunteer spotlights, event calendar, farm updates)
- **ACT Farm Residency Alumni:** Quarterly (research highlights, alumni projects, repeat residency offers)

---

### Campaign Calendar (Annual)

**January:**
- New Year campaign: "What will you create in 2026?" (residency applications, storyteller invites)

**February:**
- Grant application push (fiscal year deadlines)

**March:**
- The Harvest Festival early bird registrations

**April:**
- Volunteer recruitment drive (Autumn season)

**May:**
- End of financial year donor campaign (tax deductibility messaging)

**June:**
- CONTAINED campaign workshop series (NAIDOC Week tie-in)

**July:**
- Mid-year impact report (celebrate first 6 months)

**August:**
- Winter workshop season (ACT Farm indoor workshops)

**September:**
- Membership drive (Spring renewal campaign)

**October:**
- Storyteller appreciation month (Empathy Ledger)

**November:**
- Year-end donor appeal (Giving Tuesday tie-in)

**December:**
- Thank you campaign (gratitude emails, impact video, year in review)

---

## 🔗 Integration Architecture

### Notion Activity Logging

**Purpose:** Team visibility into GHL activities without duplicating CRM data

**Notion Database: "GHL Activity Log"**

**Schema:**
```
- Event Type (select: Contact Created, Deal Won, Pipeline Updated, Campaign Sent)
- Entity Name (title: "Jane Smith - The Harvest Volunteer")
- Project (select: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV, General)
- GHL Record ID (text: "contact_abc123")
- Action (text: "Moved to Active Volunteer stage")
- Amount (number, for deals)
- Timestamp (date)
- GHL Link (url: "https://app.gohighlevel.com/location/xyz/contacts/contact_abc123")
- Triggered By (select: Automation, Manual, Integration)
```

**Webhook Integration:**
1. GHL sends webhook on events (Contact Created, Pipeline Stage Changed, Deal Won)
2. Vercel serverless function receives webhook
3. Function logs event to Notion Activity Log
4. Team sees real-time updates in Notion dashboard

**Implementation:** See GHL CRM Advisor skill for complete code

---

### Supabase Sync (Empathy Ledger)

**Purpose:** Sync Empathy Ledger storytellers to GHL for communication

**Data Flow:**
1. Storyteller creates account in Empathy Ledger (Supabase)
2. Supabase trigger fires on profile creation
3. Webhook sends storyteller data to GHL API
4. GHL creates/updates contact with storyteller info
5. Activity logged to Notion

**Synced Fields:**
- Email (primary key)
- Name (first + last)
- Supabase user ID (custom field: supabase_user_id)
- Storyteller status (custom field: storyteller_status)
- Stories count (custom field: stories_count)
- Consent status (custom field: consent_status)
- AI processing consent (custom field: ai_processing_consent)

**Important:** Story content NEVER syncs to GHL (data sovereignty). Only metadata for communication purposes.

---

### Cross-Project Opportunity Detection

**Purpose:** Identify contacts interested in multiple projects and create warm handoffs

**Detection Logic:**
- Daily job runs in GHL (custom webhook or Zapier)
- Searches for contacts with tags from multiple projects
- Example: Contact tagged "the-harvest" + "interest:conservation" → Tag "act-farm-opportunity"
- Triggers workflow: Send personalized email introducing ACT Farm workshops

**Opportunities:**
- The Harvest volunteer + conservation interest → ACT Farm workshop
- ACT Farm resident + storytelling → Empathy Ledger invitation
- Empathy Ledger storyteller + incarceration experience → JusticeHub CONTAINED campaign
- JusticeHub family + community support → The Harvest programs
- Any contact + funding interest → Grant partnership conversation

---

## ✅ Implementation Checklist (Week-by-Week)

### Week 1: Foundation (Build This Week)

**Day 1: GHL Account Setup**
- [ ] Create GHL account (if not already created)
- [ ] Set up location: "ACT Regenerative Innovation Studio"
- [ ] Configure business profile (address, phone, website, logo)
- [ ] Connect custom domain for emails (e.g., hello@actstudio.org.au)
- [ ] Set up team members (assign roles: Admin, User)

**Day 2: Tag Taxonomy & Custom Fields**
- [ ] Create all base project tags (empathy-ledger, justicehub, the-harvest, act-farm, goods-on-country, bcv-residencies)
- [ ] Create all role tags (role:elder, role:storyteller, role:volunteer, etc.)
- [ ] Create all engagement tags (engagement:lead, engagement:prospect, engagement:active, etc.)
- [ ] Create all 45 custom fields (see custom fields section above)
- [ ] Test: Create sample contact with all tags and fields

**Day 3: Pipeline Setup (Priority Pipelines)**
- [ ] Build Universal Inquiry Pipeline (4 stages)
- [ ] Build Grants & Funding Pipeline (7 stages)
- [ ] Build Supporters & Donors Pipeline (6 stages)
- [ ] Test: Move sample contact through each pipeline stage

**Day 4: Forms (Universal Forms)**
- [ ] Build Form 1: General Contact Form
- [ ] Build Form 15: One-Time Donation Form
- [ ] Build Form 16: Monthly Giving Form
- [ ] Build Form 21: Newsletter Signup
- [ ] Test: Submit each form, verify contact creation, tags applied

**Day 5: Essential Workflows**
- [ ] Build Workflow 1: New Contact Welcome Sequence
- [ ] Build Workflow 2: Monthly Newsletter (template)
- [ ] Build Workflow 13: Donor Thank You Sequence
- [ ] Test: Trigger each workflow with sample contact, verify emails sent

**Weekend Review:**
- [ ] Review all setups with team
- [ ] Document any issues or questions
- [ ] Prepare for Week 2 (project-specific pipelines and forms)

---

### Week 2: Project-Specific Implementation

**Day 1: Empathy Ledger**
- [ ] Build Pipeline 2: Storyteller Journey (6 stages)
- [ ] Build Pipeline 3: Organization Partnership (10 stages)
- [ ] Build Form 2: Become a Storyteller
- [ ] Build Form 3: Organization Partnership Inquiry
- [ ] Build Workflow 4: Storyteller Onboarding Sequence
- [ ] Build Workflow 5: AI Consent Campaign
- [ ] Build Workflow 6: Organization Partnership Nurture

**Day 2: JusticeHub**
- [ ] Build Pipeline 4: Service Provider Directory (5 stages)
- [ ] Build Pipeline 5: Family Support (5 stages)
- [ ] Build Pipeline 6: CONTAINED Campaign (6 stages)
- [ ] Build Form 4: Get Support (Family Support)
- [ ] Build Form 5: Service Provider Application
- [ ] Build Form 6: CONTAINED Campaign - Leader Nomination
- [ ] Build Workflow 7: Family Support Intake Process
- [ ] Build Workflow 8: CONTAINED Campaign Onboarding

**Day 3: The Harvest**
- [ ] Build Pipeline 7: Volunteer Journey (7 stages)
- [ ] Build Pipeline 8: Event Registrations (5 stages)
- [ ] Build Pipeline 9: Membership Program (5 stages)
- [ ] Build Form 7: Volunteer Application
- [ ] Build Form 8: Event Registration
- [ ] Build Form 9: Membership Application
- [ ] Build Workflow 9: Volunteer Orientation Sequence
- [ ] Build Workflow 10: Event Registration Confirmation

**Day 4: ACT Farm**
- [ ] Build Pipeline 10: Residency Applications (8 stages)
- [ ] Build Pipeline 11: Workshop Attendees (4 stages)
- [ ] Build Form 10: Residency Application
- [ ] Build Form 11: Workshop Registration
- [ ] Build Workflow 11: Residency Application Review Process

**Day 5: Additional Pipelines & Forms**
- [ ] Build Pipeline 12: Grants & Funding (7 stages) [already done in Week 1]
- [ ] Build Pipeline 13: Supporters & Donors (6 stages) [already done in Week 1]
- [ ] Build Pipeline 14: Organizational Partnerships (6 stages)
- [ ] Build Pipeline 15: Festival & Large Event Management (8 stages)
- [ ] Build Form 17: Corporate Partnership Inquiry
- [ ] Build Form 18: Festival Early Bird Registration
- [ ] Build Form 19: Festival Vendor Application
- [ ] Build Form 20: Festival Volunteer Application

**Weekend Review:**
- [ ] Full system test: Submit forms, check pipelines, verify workflows
- [ ] Team training session: Walk through GHL interface, demonstrate key features
- [ ] Prepare integration setup for Week 3

---

### Week 3: Integrations & Automations

**Day 1: Stripe Integration**
- [ ] Connect Stripe to GHL (Settings → Payments → Integrations)
- [ ] Create products: Donations ($10, $25, $50, $100, custom), Memberships ($50, $100, $150, $200), Event tickets, Workshop tickets, Residency deposits
- [ ] Configure webhooks: Stripe → GHL (payment confirmations, subscription updates)
- [ ] Test: Process test donation, verify contact updated, workflow triggered

**Day 2: Notion Activity Logging**
- [ ] Create Notion database: "GHL Activity Log" (schema above)
- [ ] Deploy webhook endpoint: Vercel serverless function (see GHL CRM Advisor skill for code)
- [ ] Configure GHL webhooks: Settings → Integrations → Webhooks → Add endpoint
- [ ] Test: Create contact, move pipeline stage, verify logged to Notion

**Day 3: Supabase Sync (Empathy Ledger)**
- [ ] Set up Supabase trigger: On profile creation → Webhook to GHL API
- [ ] Create sync service: Node.js script (see GHL CRM Advisor skill for code)
- [ ] Test: Create Empathy Ledger profile, verify GHL contact created, tags applied

**Day 4: Cross-Project Opportunity Detection**
- [ ] Build detection script: Daily cron job (see GHL CRM Advisor skill for code)
- [ ] Configure workflows: Act Farm opportunity email, Empathy Ledger opportunity email, etc.
- [ ] Test: Tag contact with multiple project interests, verify opportunity workflow triggered

**Day 5: Email Domain & Deliverability**
- [ ] Set up custom sending domain: hello@actstudio.org.au
- [ ] Configure SPF, DKIM, DMARC records (DNS settings)
- [ ] Warm up domain: Send small batches (100 emails/day) for 2 weeks before large campaigns
- [ ] Test: Send test emails, check spam score (mail-tester.com)

**Weekend Review:**
- [ ] Full integration test: End-to-end workflows (form submit → pipeline → email → Notion log)
- [ ] Review analytics: Open rates, click rates, pipeline conversion rates
- [ ] Prepare team training materials for Week 4

---

### Week 4: Launch & Optimization

**Day 1: Team Training**
- [ ] Training session 1: GHL basics (navigation, contact management, pipelines)
- [ ] Training session 2: Forms & workflows (how to edit, common troubleshooting)
- [ ] Training session 3: Reporting & analytics (how to pull reports, interpret metrics)
- [ ] Create quick reference guides (see GHL CRM Advisor skill for templates)

**Day 2: Website Form Embedding**
- [ ] Embed forms on all project websites (use GHL iframe embed code)
- [ ] Test: Submit each form from website, verify contact created
- [ ] Update website CTAs: Link to GHL forms (donate, volunteer, become storyteller, etc.)

**Day 3: Import Existing Contacts**
- [ ] Prepare contact CSV: Clean data (remove duplicates, format phone/email)
- [ ] Import to GHL: Settings → Contacts → Import
- [ ] Tag imported contacts: "source:import", project tags
- [ ] Send re-engagement email: "We've moved to a new system, confirm your subscription"

**Day 4: Launch First Campaigns**
- [ ] Campaign 1: Newsletter signup drive (social media posts, website popup)
- [ ] Campaign 2: Volunteer recruitment (The Harvest)
- [ ] Campaign 3: Storyteller invitation (Empathy Ledger)
- [ ] Monitor: Form submissions, workflow triggers, email deliverability

**Day 5: Analytics & Optimization**
- [ ] Review pipeline conversion rates: Which stages have high drop-off?
- [ ] Review email metrics: Which emails have low open/click rates?
- [ ] A/B test: Subject lines, CTAs, email timing
- [ ] Document learnings: What's working? What needs improvement?

**Weekend Review:**
- [ ] Celebrate launch! 🎉
- [ ] Team retrospective: What went well? What was challenging?
- [ ] Create optimization roadmap: Month 2 priorities based on Week 4 learnings

---

### Month 2: Scale & Refine

**Week 1: Advanced Workflows**
- [ ] Build remaining workflows (Workflow 12: Grant deadline reminders, etc.)
- [ ] Set up recurring campaigns (monthly newsletter automation)
- [ ] Create saved segments (high-value donors, active volunteers, alumni, etc.)

**Week 2: Reporting & Dashboards**
- [ ] Build custom reports: Donor lifetime value, volunteer hours, event attendance, grant pipeline
- [ ] Create dashboards: Executive summary (KPIs), project-specific dashboards
- [ ] Schedule automated reports: Weekly team updates, monthly board reports

**Week 3: Cultural Protocols & Elder Review**
- [ ] Build Elder review workflow (Empathy Ledger): Story submitted → Elder notified → Review → Approve/Request changes
- [ ] Create cultural protocol tags: "cultural:kabi-kabi", "cultural:jinibara", "cultural:elder-review-required"
- [ ] Train Elders on GHL access (limited permissions, review interface)

**Week 4: Optimization Based on Data**
- [ ] Optimize low-performing workflows (improve email copy, timing, CTAs)
- [ ] Retire unused pipelines/stages (simplify based on actual usage)
- [ ] Expand successful campaigns (scale what's working)

---

## 🎯 Success Metrics (Track Monthly)

### Contact & List Growth
- **Total contacts:** Target 5,000 by end of Month 1, 10,000 by Month 3
- **Newsletter subscribers:** Target 2,000 by Month 3
- **Project-specific lists:**
  - Empathy Ledger: 500 storytellers, 50 organizations
  - JusticeHub: 200 families, 100 service providers, 50 leaders
  - The Harvest: 300 volunteers, 200 members, 1,000 event attendees
  - ACT Farm: 100 residents, 500 workshop attendees

### Pipeline Performance
- **Conversion rates by pipeline:**
  - Universal Inquiry → Project Pipeline: 80%
  - Volunteer Inquiry → Active Volunteer: 60%
  - Residency Application → Booking: 40%
  - Grant Application → Award: 30%
  - Organization Inquiry → Contract Signed: 20%

### Email Engagement
- **Open rates:** Target 25-35% (industry average 20-25%)
- **Click rates:** Target 3-5% (industry average 2-3%)
- **Unsubscribe rate:** Target <0.5% (acceptable <2%)
- **Spam complaint rate:** Target <0.1%

### Revenue Tracking (Annual Targets)
- **Donations:** $100,000 (500 donors × $50 avg + 100 monthly × $25/month × 12 + 20 major × $2k)
- **Memberships:** $15,000 (150 members × $100 avg)
- **Events:** $50,000 (festivals, workshops, tickets)
- **Residencies:** $125,000 (50 residencies × $2,500 avg)
- **Grants:** $500,000-$2M (variable, track applications → awards)
- **Organization subscriptions:** $100,000 (10 orgs × $10k avg annual)
- **Total:** $890,000-$2.4M annual revenue through GHL

### Operational Efficiency
- **Time saved per week:** 20+ hours (automation vs. manual email/data entry)
- **Response time:** <24 hours for all inquiries (track in pipeline)
- **Data accuracy:** 95%+ (clean contact data, no duplicates)
- **Team adoption:** 100% of team using GHL daily by Month 2

---

## 🚀 Ready to Build

**This plan is complete and production-ready.** Start with Week 1 checklist and build systematically. The system will be operational for daily use by end of Week 2, with full ecosystem integration by end of Month 1.

**Need help?** Use the GHL CRM Advisor skill for:
- Detailed form field configurations
- Workflow email copy
- Integration code
- Troubleshooting common issues

**Let's open GHL and start building!** 🌱

