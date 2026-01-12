# GHL Week 1 Build Checklist - START HERE

**Goal:** Core infrastructure operational by end of week
**Time:** ~40 hours total (8 hours/day × 5 days)

---

## 🎯 Day 1: Account Setup (8 hours)

### Morning (4 hours)
- [ ] **Create GHL Account** (if needed)
  - Go to: https://app.gohighlevel.com/
  - Plan: Agency Pro (recommended for unlimited contacts)
  - Billing: Set up payment method

- [ ] **Location Setup: "ACT Regenerative Innovation Studio"**
  - Settings → Business Profile
  - Business name: "ACT Regenerative Innovation Studio"
  - Address: [Your address]
  - Phone: [Your phone]
  - Website: https://actstudio.org.au
  - Logo: Upload ACT logo
  - Timezone: Australia/Brisbane

- [ ] **Team Member Setup**
  - Settings → My Staff
  - Add team members:
    - Admin: Full access
    - Coordinators: User access (per project)
    - Volunteers: Limited access (for The Harvest)

### Afternoon (4 hours)
- [ ] **Email Configuration**
  - Settings → Email Services
  - Connect sending domain: hello@actstudio.org.au
  - Verify domain: Add DNS records (SPF, DKIM, DMARC)
  - Test: Send test email to yourself

- [ ] **Phone Setup (Optional)**
  - Settings → Phone Numbers
  - Purchase number or connect existing
  - Configure voicemail, SMS forwarding

- [ ] **Integrations Check**
  - Settings → Integrations
  - Note available integrations: Stripe, Zapier, Webhooks
  - Don't configure yet (Day 3+)

**End of Day 1:** Account set up, team added, email ready

---

## 🏷️ Day 2: Tags & Custom Fields (8 hours)

### Morning (4 hours) - Tag Creation

**Open:** Settings → Tags

**Base Project Tags:**
- [ ] empathy-ledger
- [ ] justicehub
- [ ] the-harvest
- [ ] act-farm
- [ ] goods-on-country
- [ ] bcv-residencies
- [ ] act-studio

**Role Tags:**
- [ ] role:elder
- [ ] role:storyteller
- [ ] role:volunteer
- [ ] role:artist
- [ ] role:service-provider
- [ ] role:family
- [ ] role:researcher
- [ ] role:donor
- [ ] role:partner
- [ ] role:vendor
- [ ] role:leader

**Engagement Tags:**
- [ ] engagement:lead
- [ ] engagement:prospect
- [ ] engagement:active
- [ ] engagement:alumni
- [ ] engagement:lapsed
- [ ] engagement:opted-out

**Interest Tags:**
- [ ] interest:volunteering
- [ ] interest:storytelling
- [ ] interest:conservation
- [ ] interest:art
- [ ] interest:justice-reform
- [ ] interest:circular-economy
- [ ] interest:events
- [ ] interest:workshops
- [ ] interest:residencies
- [ ] interest:research
- [ ] interest:funding

**Action Tags:**
- [ ] action:attended-event
- [ ] action:submitted-story
- [ ] action:completed-volunteer-orientation
- [ ] action:donated
- [ ] action:applied-grant
- [ ] action:registered-workshop
- [ ] action:booked-residency
- [ ] action:referred-friend

**Priority Tags:**
- [ ] priority:high
- [ ] priority:urgent
- [ ] priority:cultural-protocol

**Cultural Tags:**
- [ ] cultural:kabi-kabi
- [ ] cultural:jinibara
- [ ] cultural:indigenous
- [ ] cultural:elder-review-required
- [ ] cultural:sacred-knowledge

**Campaign Tags:**
- [ ] campaign:contained
- [ ] campaign:ai-consent
- [ ] campaign:harvest-festival
- [ ] campaign:fundraising-2026
- [ ] campaign:newsletter-jan (create monthly as needed)

### Afternoon (4 hours) - Custom Fields

**Open:** Settings → Custom Fields

**IMPORTANT:** Create these in order, copy exact field names

**Core Contact Fields:**
1. [ ] **preferred_name** (Single Line Text)
2. [ ] **pronouns** (Dropdown: he/him, she/her, they/them, other, prefer not to say)
3. [ ] **indigenous_status** (Dropdown: Aboriginal, Torres Strait Islander, Both, Non-Indigenous, Prefer not to say)
4. [ ] **cultural_protocols** (Multi-line Text)
5. [ ] **accessibility_needs** (Multi-line Text)
6. [ ] **communication_preference** (Dropdown: Email, SMS, Phone, Mail)
7. [ ] **best_contact_time** (Dropdown: Morning, Afternoon, Evening, Anytime)
8. [ ] **emergency_contact_name** (Single Line Text)
9. [ ] **emergency_contact_phone** (Phone)
10. [ ] **how_did_you_hear** (Dropdown: Friend referral, Social media, Event, Website, Partner org, Other)

**Empathy Ledger Fields:**
11. [ ] **supabase_user_id** (Single Line Text)
12. [ ] **storyteller_status** (Dropdown: Inquiry, Profile Complete, Active, Alumni)
13. [ ] **stories_count** (Number)
14. [ ] **consent_status** (Dropdown: Full consent, Partial consent, No consent)
15. [ ] **ai_processing_consent** (Dropdown: Yes, No, Pending)
16. [ ] **elder_review_required** (Checkbox)

**JusticeHub Fields:**
17. [ ] **family_support_needs** (Multi-line Text)
18. [ ] **service_provider_type** (Dropdown: Legal, Mental health, Housing, Employment, Education, Health, Other)
19. [ ] **contained_leader_status** (Dropdown: Nominated, Contacted, Booked, Attended, Advocate)
20. [ ] **incarceration_connection** (Dropdown: Personal experience, Family member, Professional, Advocate)

**The Harvest Fields:**
21. [ ] **volunteer_interests** (Multi-select: Gardening, Events, Admin, Kitchen, Maintenance, Teaching)
22. [ ] **volunteer_hours_total** (Number)
23. [ ] **volunteer_orientation_completed** (Checkbox)
24. [ ] **membership_level** (Dropdown: Community $50, Supporter $100, Sustainer $150, Patron $200)
25. [ ] **membership_expiry_date** (Date)
26. [ ] **dietary_preferences** (Multi-line Text)

**ACT Farm Fields:**
27. [ ] **residency_type** (Dropdown: R&D, Creative, Wellbeing, Research Partnership)
28. [ ] **residency_dates** (Single Line Text)
29. [ ] **research_focus** (Multi-line Text)
30. [ ] **ndis_participant** (Checkbox)
31. [ ] **ndis_number** (Single Line Text)

**Goods on Country Fields:**
32. [ ] **goods_interest** (Dropdown: Products, Partnerships, Volunteering, Wholesale)
33. [ ] **business_type** (Single Line Text)

**BCV Residencies Fields:**
34. [ ] **artistic_medium** (Single Line Text)
35. [ ] **portfolio_url** (URL)
36. [ ] **residency_proposal** (Multi-line Text)

**Grants/Funding Fields:**
37. [ ] **grant_application_status** (Dropdown: Inquiry, Applied, Awarded, Declined, Reporting)
38. [ ] **grant_name** (Single Line Text)
39. [ ] **grant_amount** (Currency)
40. [ ] **grant_deadline** (Date)
41. [ ] **grant_reporting_due** (Date)

**Donation Fields:**
42. [ ] **lifetime_donation_value** (Currency)
43. [ ] **first_donation_date** (Date)
44. [ ] **last_donation_date** (Date)
45. [ ] **donation_frequency** (Dropdown: One-time, Monthly, Quarterly, Annual)
46. [ ] **donation_method** (Dropdown: Credit card, Bank transfer, Cash, In-kind)

**End of Day 2:** All tags and custom fields created, system ready for pipelines

---

## 🔄 Day 3: Priority Pipelines (8 hours)

### Morning: Universal Inquiry Pipeline (2 hours)

**Open:** Settings → Pipelines → Create Pipeline

**Pipeline Name:** Universal Inquiry Pipeline

**Stages:**
1. [ ] **New Inquiry**
   - Entry: General contact form
   - Automation: Send auto-response email

2. [ ] **Needs Assessment**
   - Action: Team reviews inquiry
   - Tag: Add project tags

3. [ ] **Routed to Project**
   - Action: Move to specific pipeline

4. [ ] **Out of Scope**
   - Action: Send referral email

**Configure automation:** (Settings → Workflows → Create Workflow)
- Trigger: Contact enters Stage 1 (New Inquiry)
- Action 1: Send email (auto-response template)
- Action 2: Send internal notification (Slack/Email to team)

### Mid-Morning: Grants & Funding Pipeline (2 hours)

**Pipeline Name:** Grants & Funding Pipeline

**Stages:**
1. [ ] **Grant Opportunity Identified**
2. [ ] **Application In Progress**
3. [ ] **Grant Submitted**
4. [ ] **Grant Awarded** (WON stage - configure as monetary)
5. [ ] **Grant Reporting Due**
6. [ ] **Grant Report Submitted**
7. [ ] **Grant Declined** (LOST stage)

**Configure monetary value:** Settings → Pipeline Settings → Enable opportunity value tracking

### Afternoon: Supporters & Donors Pipeline (4 hours)

**Pipeline Name:** Supporters & Donors Pipeline

**Stages:**
1. [ ] **First Donation** (WON - configure monetary)
2. [ ] **Second Donation** (WON - configure monetary)
3. [ ] **Regular Donor (3+)**
4. [ ] **Major Donor ($1000+)**
5. [ ] **Legacy Donor ($5000+)**
6. [ ] **Lapsed Donor (12+ months)**

**Configure automation: Donor Thank You Sequence**
- Trigger: Contact enters Stage 1 (First Donation)
- Action 1: Send thank you email + tax receipt (immediate)
- Action 2: Wait 3 days → Send personalized thank you (if >$100)
- Action 3: Wait 30 days → Send impact update email
- Action 4: Wait 90 days → Send second gift ask email

**Email Templates to Create:**
- [ ] Thank you + tax receipt
- [ ] Personalized thank you (>$100)
- [ ] Impact update (30 days)
- [ ] Second gift ask (90 days)

**End of Day 3:** 3 core pipelines operational with basic automations

---

## 📝 Day 4: Essential Forms (8 hours)

### Morning: General Contact Form (2 hours)

**Open:** Sites → Funnels/Websites → Create Form

**Form Name:** General Contact Form

**Fields:**
1. [ ] Name (required, text)
2. [ ] Email (required, email)
3. [ ] Phone (optional, phone)
4. [ ] Project Interest (required, dropdown)
   - Options: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV Residencies, General Inquiry
5. [ ] Message (required, textarea)
6. [ ] How did you hear about us? (dropdown)
   - Options: Friend referral, Social media, Event, Website, Partner org, Other
7. [ ] Newsletter opt-in (checkbox)
   - Label: "Yes, I'd like to receive monthly updates"

**Form Submission Settings:**
- [ ] Add to GHL contact list: Yes
- [ ] Tags to apply: Based on "Project Interest" field (conditional logic)
  - If "Empathy Ledger" → Tag "empathy-ledger"
  - If "JusticeHub" → Tag "justicehub"
  - If "The Harvest" → Tag "the-harvest"
  - Etc.
- [ ] Add to pipeline: Universal Inquiry Pipeline, Stage 1 (New Inquiry)
- [ ] Trigger workflow: New Contact Welcome Sequence

**Embed Code:**
- [ ] Copy embed code: Settings → Embed
- [ ] Save for website team: Paste in Notion doc "GHL Form Embed Codes"

### Mid-Morning: Donation Form (2 hours)

**Form Name:** One-Time Donation Form

**Fields:**
1. [ ] Name (required)
2. [ ] Email (required)
3. [ ] Donation Amount (required, radio buttons)
   - Options: $25, $50, $100, $250, $500, Other (text input)
4. [ ] Designation (dropdown)
   - Options: Where needed most, Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV
5. [ ] Message (optional, textarea)
6. [ ] Anonymous? (checkbox)
7. [ ] Newsletter opt-in (checkbox, default checked)

**Form Submission Settings:**
- [ ] Add to GHL: Yes
- [ ] Tags: "role:donor", "donation_frequency:One-time", project tag based on designation
- [ ] Add to pipeline: Supporters & Donors Pipeline, Stage 1 (First Donation)
- [ ] **IMPORTANT:** Redirect to Stripe payment page (configure in Day 5 - Week 3)

### Afternoon: Newsletter Signup Form (2 hours)

**Form Name:** Newsletter Signup Form

**Fields:**
1. [ ] Email (required)
2. [ ] Name (optional, "First name helps us personalize emails")
3. [ ] Interests (checkboxes)
   - Options: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, BCV Residencies, General updates

**Form Submission Settings:**
- [ ] Add to GHL: Yes
- [ ] Tags: Based on interests selected (multi-select conditional logic)
- [ ] Tag: "engagement:lead"
- [ ] Trigger workflow: Newsletter Welcome Sequence (create in next step)

### Late Afternoon: Volunteer Application Form (2 hours)

**Form Name:** Volunteer Application - The Harvest

**Fields:**
1. [ ] Name (required)
2. [ ] Email (required)
3. [ ] Phone (required)
4. [ ] Age (dropdown: Under 18, 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
5. [ ] [If Under 18] Parent/guardian name (conditional, required)
6. [ ] [If Under 18] Parent/guardian contact (conditional, required)
7. [ ] Volunteer interests (multi-select)
   - Options: Gardening, Events, Kitchen/food prep, Admin/office, Maintenance, Teaching/workshops, Childcare, Other
8. [ ] Availability (checkboxes)
   - Options: Weekday mornings, Weekday afternoons, Weekday evenings, Weekend mornings, Weekend afternoons
9. [ ] Skills/experience (textarea, optional)
10. [ ] Physical limitations or accessibility needs (textarea, optional)
11. [ ] Emergency contact name (required)
12. [ ] Emergency contact phone (required)
13. [ ] How did you hear about us? (dropdown)
14. [ ] Orientation dates (dropdown - manually update monthly)

**Form Submission Settings:**
- [ ] Add to GHL: Yes
- [ ] Tags: "the-harvest", "role:volunteer", "engagement:lead"
- [ ] Custom fields: volunteer_interests (map from form)
- [ ] Add to pipeline: Volunteer Journey Pipeline (create in Week 2)
- [ ] Trigger workflow: Volunteer Welcome Sequence (create in Week 2)

**End of Day 4:** 4 essential forms built, ready to embed on websites

---

## ⚙️ Day 5: Core Workflows (8 hours)

### Morning: New Contact Welcome Sequence (3 hours)

**Open:** Automations → Workflows → Create Workflow

**Workflow Name:** New Contact Welcome Sequence

**Trigger:** Contact added to GHL (form submission)

**Actions:**

**Day 0 - Welcome Email:**
- [ ] Action: Send Email
- [ ] Template Name: "Welcome to ACT"
- [ ] Subject: "Welcome to the ACT community, {{contact.first_name}}!"
- [ ] Body (copy this):
  ```
  Hi {{contact.first_name}},

  Thank you for connecting with ACT (A Curious Tractor) Regenerative Innovation Studio.

  We're a network of regenerative projects dismantling extractive systems through:
  - 🎭 Empathy Ledger: Storytelling platform with Indigenous leadership
  - ⚖️ JusticeHub: Youth justice reform and family support
  - 🌱 The Harvest: Community hub, volunteering, events
  - 🦜 ACT Farm: Residencies, workshops, conservation at Black Cockatoo Valley
  - 🌀 Goods on Country: Circular economy initiatives

  Explore our projects: https://actstudio.org.au
  Follow us: Instagram, Facebook, LinkedIn

  We're glad you're here.

  The ACT Team
  ```

**Day 3 - Value Email:**
- [ ] Action: Wait 3 days
- [ ] Action: If/Else (based on tags)
  - If tagged "empathy-ledger" → Send "Empathy Ledger Stories" email
  - If tagged "justicehub" → Send "JusticeHub Impact" email
  - If tagged "the-harvest" → Send "The Harvest Community" email
  - If tagged "act-farm" → Send "ACT Farm Residencies" email
  - Else → Send "ACT Ecosystem Overview" email

**Day 7 - Engagement Prompt:**
- [ ] Action: Wait 7 days
- [ ] Action: Send Email
- [ ] Subject: "How can we support you, {{contact.first_name}}?"
- [ ] Body: Quick survey (use GHL survey feature or link to external form)
  - Question 1: What interests you most?
  - Question 2: How would you like to get involved?

**Day 14 - Newsletter Invitation:**
- [ ] Action: Wait 14 days
- [ ] Action: Send Email (only if not already subscribed to newsletter)
- [ ] Subject: "Stay connected - join our monthly newsletter"
- [ ] CTA: Subscribe button

**Exit Conditions:**
- [ ] If contact replies to any email → Tag "engagement:active", stop workflow
- [ ] If contact unsubscribes → Tag "engagement:opted-out", stop workflow
- [ ] If contact doesn't open any emails after Day 7 → Tag "engagement:cold", pause workflow

### Afternoon: Donor Thank You Sequence (3 hours)

**Workflow Name:** Donor Thank You & Cultivation Sequence

**Trigger:** Contact enters Supporters & Donors Pipeline, Stage 1 (First Donation)

**Actions:**

**Day 0 - Immediate Thank You:**
- [ ] Action: Send Email (immediate)
- [ ] Template: "Donation Thank You + Tax Receipt"
- [ ] Subject: "Thank you for your donation, {{contact.first_name}}!"
- [ ] Body:
  ```
  Dear {{contact.first_name}},

  Thank you for your generous donation of ${{opportunity.monetary_value}} to ACT.

  Your support helps us [impact story based on project designation].

  Tax Receipt: Attached (PDF - configure in Stripe integration)
  Donation Date: {{opportunity.created_at}}
  Amount: ${{opportunity.monetary_value}}
  ABN: [Your ABN]

  With gratitude,
  [Team Member Name]
  ACT Regenerative Innovation Studio
  ```
- [ ] Attachment: Tax receipt PDF (auto-generated from Stripe)

**Day 3 - Personalized Thank You (>$100):**
- [ ] Action: Wait 3 days
- [ ] Action: If/Else (if opportunity.monetary_value > 100)
  - [ ] Send personalized email from team member (manual or pre-written)
  - [ ] Subject: "A personal thank you from [Team Member]"

**Day 30 - Impact Update:**
- [ ] Action: Wait 30 days
- [ ] Action: Send Email
- [ ] Subject: "Your donation is making a difference"
- [ ] Body: Impact story, photos, metrics
- [ ] CTA: "See our latest impact report" → link

**Day 90 - Second Gift Ask:**
- [ ] Action: Wait 90 days
- [ ] Action: Send Email
- [ ] Subject: "Would you consider supporting us again?"
- [ ] Body: Soft ask, no pressure
- [ ] CTA: "Donate again" → link to donation page

### Late Afternoon: Monthly Newsletter Setup (2 hours)

**Workflow Name:** Monthly Newsletter - ACT Ecosystem Updates

**Trigger:** Manual (1st of every month)

**Create Email Template:**
- [ ] Template Name: "Newsletter - [Month Year]"
- [ ] Subject: "[Month] Updates from ACT"
- [ ] Body structure:
  ```
  Hi {{contact.first_name}},

  Here's what's happening across the ACT ecosystem this month:

  🎯 BIG NEWS
  [Major story/achievement - 1 paragraph]

  📅 UPCOMING EVENTS
  - Event 1: Date, link
  - Event 2: Date, link
  - Event 3: Date, link

  💡 SPOTLIGHT
  [Featured storyteller/volunteer/resident - 2-3 paragraphs]

  📊 IMPACT NUMBERS
  - X stories shared on Empathy Ledger
  - Y families supported by JusticeHub
  - Z volunteer hours at The Harvest
  - N residencies at ACT Farm

  🌱 GET INVOLVED
  [Specific CTA based on project]

  With gratitude,
  The ACT Team

  ---
  Update your preferences: [Link]
  Unsubscribe: [Link]
  ```

**Segmentation Setup:**
- [ ] Create saved segments:
  - Segment 1: "Empathy Ledger Subscribers" (tag: empathy-ledger)
  - Segment 2: "JusticeHub Subscribers" (tag: justicehub)
  - Segment 3: "The Harvest Subscribers" (tag: the-harvest)
  - Segment 4: "ACT Farm Subscribers" (tag: act-farm)
  - Segment 5: "All ACT Subscribers" (all newsletter opt-ins)

**End of Day 5:** Core workflows active, ready for first contacts

---

## ✅ Weekend Review Checklist

### System Test
- [ ] Create test contact manually
- [ ] Add tags, custom fields
- [ ] Move through pipeline stages
- [ ] Verify automation triggers
- [ ] Check email delivery

### Forms Test
- [ ] Submit each form from external page (not GHL admin)
- [ ] Verify contact created with correct tags
- [ ] Verify workflow triggered
- [ ] Check auto-response email received

### Team Review
- [ ] Walk through GHL interface with team
- [ ] Demonstrate contact management
- [ ] Show pipeline navigation
- [ ] Review workflow email templates
- [ ] Gather feedback, questions

### Documentation
- [ ] Update Notion with Week 1 progress
- [ ] Document any issues or blockers
- [ ] List Week 2 priorities
- [ ] Share embed codes with website team

### Prepare Week 2
- [ ] Review Week 2 checklist (project-specific pipelines)
- [ ] Assign team members to project builds
- [ ] Schedule daily standups (15 min progress check)

---

## 🎉 Week 1 Complete!

**Achievements:**
- ✅ GHL account fully configured
- ✅ 60+ tags created
- ✅ 46 custom fields created
- ✅ 3 core pipelines operational
- ✅ 4 essential forms built
- ✅ 3 core workflows active
- ✅ Team trained on basics

**Ready for Week 2:** Project-specific pipelines, forms, and workflows

**Estimated Contacts by End of Week 1:** 50-200 (from initial form submissions)

**Next Steps:** Continue with Week 2 checklist (see GHL_COMPLETE_IMPLEMENTATION_PLAN.md)

---

**Questions or Issues?** Use the GHL CRM Advisor skill for troubleshooting and detailed guidance.

**LET'S BUILD!** 🚀🌱
