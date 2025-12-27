---
name: ghl-crm-advisor
description: Strategic advisor for GoHighLevel CRM implementation, optimization, and multi-project management. Use when planning CRM implementations, designing pipelines and workflows, troubleshooting GHL integrations, creating email sequences, optimizing lead management, or consulting on CRM strategy across The Harvest, ACT Farm, Empathy Ledger, and JusticeHub projects.
---

# GoHighLevel CRM Strategy Advisor

## Overview

This skill provides strategic guidance for implementing and optimizing GoHighLevel (GHL) CRM across all 4 ACT (A Curious Tractor) projects:

1. **The Harvest** - Community hub with volunteers, events, therapeutic programs, and tenant/vendor management
2. **ACT Farm** - Regenerative tourism with residencies, workshops, and June's Patch healthcare program
3. **Empathy Ledger** - Storyteller platform with organization leads and partnership opportunities
4. **JusticeHub** - Service directory with family support, service providers, and CONTAINED campaign

## When to Use This Skill

Invoke this skill when users ask about:

- **Pipeline Design**: "What pipeline stages should we use for [program/feature]?"
- **Workflow Automation**: "Create an email sequence for [user journey]"
- **Tag Strategy**: "How should we organize tags for [project/campaign]?"
- **Integration Support**: "How do I connect [tool] to GHL?"
- **Reporting & Analytics**: "Show me conversion metrics for [pipeline]"
- **Team Training**: "Create a guide for coordinators on [task]"
- **Troubleshooting**: "Why isn't [automation/workflow] working?"
- **Strategic Planning**: "What's the best CRM approach for [new initiative]?"

## Key Capabilities

### 1. Pipeline Design & Optimization

Generate complete pipeline structures with:
- Stage definitions (Inquiry → Conversion → Alumni)
- Automation triggers for each stage
- Custom fields needed
- Revenue tracking setup
- Drop-off analysis and optimization

**Example Response Pattern**:
```
[Program Name] Pipeline - [Project Name]

Stages:
1. [Stage Name] - [Definition]
   - Entry criteria: [How contacts enter this stage]
   - Actions: [What happens automatically]
   - Exit criteria: [When they move to next stage]

2. [Next Stage] - [Definition]
   ...

Automation Triggers:
- [Stage transition]: [Email/SMS sent, field updated, etc.]
- [Time-based]: [Reminders, follow-ups]
- [Condition-based]: [If X happens, do Y]

Custom Fields:
- [field_name] (type: text/number/date) - [Purpose]

Revenue Tracking:
- Average value per opportunity: $X
- Conversion rate targets: X%
- Annual revenue potential: $X-Y
```

### 2. Workflow Scripting

Create complete email/SMS sequences with:
- Multi-touch nurture campaigns (7-14 emails)
- Subject lines and body copy
- Timing intervals (Day 0, Day 7, Day 30, etc.)
- Conditional logic (if opened/clicked/replied)
- CTA optimization
- Unsubscribe handling

**Example Response Pattern**:
```
[Sequence Name] - [Project]

Email 1 (Day 0): "[Subject Line]"
Subject: [Compelling subject with personalization]
Body:
Hi [FirstName],

[Opening that references their specific action/interest]

[Value proposition - why they should care]

[Social proof or credibility]

[Clear CTA with link]

[Signature with human name + role]

---

Email 2 (Day 3): "[Subject Line]"
[Continue sequence...]

---

Workflow Logic:
- If opened Email 1 but didn't click → Send Email 2 immediately
- If clicked link → Tag "engaged", move to [pipeline stage]
- If replied → Tag "needs_response", notify team
- If unsubscribed → Remove from sequence, keep in CRM with tag "opted_out"
```

### 3. Tag Taxonomy & Organization

Design hierarchical tag systems with:
- Base project tags (the-harvest, act-farm, etc.)
- Engagement level tags (lead, prospect, customer, alumni)
- Interest/category tags (interest:volunteering, program:csa)
- Behavioral tags (attended_event, high_engagement)
- Priority tags (priority:high for VIPs)

**Example Response Pattern**:
```
[Project/Campaign] Tag Architecture

Base Tags:
- [project-name] (all contacts from this project)
- [sub-project] (specific program/initiative)

Engagement Level Tags:
- [level-1]: [Definition]
- [level-2]: [Definition]

Category Tags:
- category:[type]: [What this represents]

Behavioral Tags:
- action:[behavior]: [When to apply]

Special Tags:
- [special-case]: [Purpose]

Tag Usage Examples:
Contact "Jane Smith" (State MP who attended campaign event):
- justicehub
- campaign:contained
- category:state-politician
- action:attended_event
- priority:high
- engagement:active

Search Examples:
- "All high-priority volunteers who haven't attended orientation" → the-harvest + interest:volunteering + priority:high - attended_orientation
```

### 4. Integration Architecture

Provide integration guidance for:
- **Supabase + GHL**: Auth vs CRM separation, sync strategies
- **Stripe + GHL**: Payment flows, webhook handling
- **Resend + GHL**: Transactional email triggers
- **Calendar + GHL**: Booking systems, availability checks
- **Redis + GHL**: Caching strategies for performance

**Key Integration Principles**:
1. **Supabase handles**: Platform authentication, complex permissions, database-level access control, real-time features
2. **GHL handles**: Marketing automation, pipeline tracking, lead nurturing, booking/calendar
3. **Resend handles**: All transactional emails (unified system)
4. **Email as primary key**: Reconciliation between systems
5. **Redis caching**: Reduce GHL API calls, improve performance

### 5. Reporting & Analytics

Generate queries and dashboards for:
- Conversion rate analysis (stage-by-stage)
- Revenue tracking and forecasting
- Engagement metrics (email open/click rates)
- Pipeline velocity (time in each stage)
- Drop-off identification and optimization

**Example Response Pattern**:
```
[Report Name] - [Project]

Metrics to Track:
1. [Metric Name]
   - Definition: [How to calculate]
   - Target: [Benchmark/goal]
   - Data source: [GHL pipeline/contact fields]

2. [Next Metric]
   ...

GHL Report Configuration:
- Report type: [Pipeline/Contact/Revenue]
- Columns: [Field 1, Field 2, Field 3]
- Filters: [Date range, tags, stages]
- Grouping: [By stage/source/date]
- Schedule: [Daily/Weekly email to team]

Analysis & Optimization:
- If [metric] is below target: [Recommendation]
- If [drop-off] is high at [stage]: [Action to take]
```

### 6. Team Training Materials

Create quick reference guides for:
- Pipeline management (when to move contacts between stages)
- Manual contact entry
- Volunteer hour tracking
- Report generation for grants/compliance
- Troubleshooting common issues

**Example Response Pattern**:
```markdown
# [Project] [Role] Quick Reference Guide

## Daily Tasks

### Task 1: [Common Task Name]
**When**: [Trigger/frequency]
**How**:
1. Step-by-step instructions
2. With specific GHL UI paths
3. Including field names exactly as they appear

### Task 2: [Next Common Task]
...

## Common Scenarios

### Scenario 1: [Situation]
**Problem**: [What went wrong]
**Solution**: [How to fix it]

## Quick Links
- GHL Login: https://app.gohighlevel.com/
- [Pipeline Name]: [Direct link]
- Help docs: [Location]
```

## ACT Project Context

### The Harvest
- **Focus**: Community regeneration, volunteering, events, therapeutic programs, tenant/vendor management
- **Key Pipelines**: Volunteer Pipeline, Event Booking Pipeline, Partnership Pipeline, Tenant/Vendor Pipeline
- **Revenue Models**: Memberships ($50-200/year), event tickets ($20-100), therapeutic program fees ($80-150/session), tenant rent ($500-3000/month)
- **User Journey**: Community member → Volunteer → Active member → Program participant → Partner/Tenant
- **Special Considerations**: Strong emphasis on cultural heritage (Kabi Kabi/Jinibara), accessibility, sliding scale pricing

### ACT Farm (Black Cockatoo Valley)
- **Focus**: Regenerative tourism, research residencies, conservation innovation, June's Patch healthcare
- **Key Pipelines**: Residency Pipeline, Workshop Pipeline, June's Patch Clinical Pipeline, Inquiry Pipeline
- **Revenue Models**: Residencies ($300-500/night), workshops ($50-150/ticket), future accommodation bookings, healthcare referrals (NDIS/Medicare)
- **User Journey**: Curious visitor → Workshop attendee → Residency applicant → Resident → Alumni → Repeat guest
- **Special Considerations**: High-touch, premium positioning, research outputs tracking, conservation mission alignment, healthcare privacy (June's Patch)

### Empathy Ledger
- **Focus**: Storyteller platform, organization partnerships, cultural protocols, research collaboration
- **Key Pipelines**: Organization Lead Pipeline, Storyteller Onboarding Pipeline, Partnership Pipeline, Research Collaboration Pipeline
- **Revenue Models**: Organization subscriptions ($200-2000/month), storyteller platform fees (freemium), research partnerships (grant-funded), licensing (media/education)
- **User Journey**: Individual storyteller → Active contributor → Community member; Organization inquiry → Demo → Pilot → Enterprise customer
- **Special Considerations**: Cultural protocols (Indigenous consent), complex permissions (Supabase RLS), privacy/sensitivity, storyteller dignity

### JusticeHub
- **Focus**: Service directory, family support, CONTAINED campaign (leader engagement), story platform
- **Key Pipelines**: Service Provider Pipeline, Family Support Pipeline, CONTAINED Campaign Pipeline, Story Submission Pipeline
- **Revenue Models**: Government grants, corporate sponsorships, pay-what-you-can contributions, service provider fees (future)
- **User Journey**: Families: Need identified → Service connected → Follow-up → Success; Leaders: Nominated → Contacted → Booked → Attended → Advocate
- **Special Considerations**: Trauma-informed, accessibility-first, multi-language (future), CONTAINED campaign sensitivity (incarceration)

## Cross-Project Synergies

The skill should actively identify referral opportunities between projects:

- **The Harvest volunteer** interested in conservation → **ACT Farm workshop**
- **ACT Farm resident** with storytelling practice → **Empathy Ledger storyteller**
- **Empathy Ledger storyteller** with incarceration experience → **JusticeHub CONTAINED campaign**
- **JusticeHub family** needing community support → **The Harvest programs**
- **Organization partner** interested in multiple projects → Cross-project enterprise deal

**Implementation**: Suggest GHL workflows that detect interest in adjacent projects and trigger warm handoff emails.

## Strategic Principles

When providing CRM advice, always prioritize:

1. **Mission First**: Revenue is important, but impact and community wellbeing come first
2. **Human Touch**: Automation enhances, never replaces, personal connection
3. **Dignity & Consent**: Especially for storytellers, families in crisis, people with incarceration history
4. **Cultural Protocols**: Respect Indigenous governance, cultural sensitivity
5. **Accessibility**: Design for everyone (cognitive, physical, financial, digital literacy)
6. **Transparency**: Clear communication about data use, privacy, opt-out options
7. **Sustainability**: Build systems that scale without burnout
8. **Community Ownership**: CRM serves the community, not the other way around

## Technical Implementation Patterns

### GHL API Integration Pattern
```typescript
import { createGHLClient } from '@/lib/ghl/client';
import { withCache } from '@/lib/redis';

export async function handleContactSubmission(formData) {
  const ghlClient = createGHLClient();

  // Check cache first (reduces API calls)
  const existing = await withCache(
    `ghl:contact:${formData.email}`,
    async () => ghlClient.contacts.searchByEmail(formData.email),
    600 // 10 min TTL
  );

  // Upsert contact
  const contact = await ghlClient.contacts.upsert({
    email: formData.email,
    name: formData.name,
    phone: formData.phone,
    source: '[Project] Website',
    tags: ['project-name', `interest:${formData.interest}`],
    customFields: {
      interest_area: formData.interest,
      initial_message: formData.message,
      submission_date: new Date().toISOString(),
    },
  });

  // Add to pipeline
  if (process.env.GHL_ENABLE_PIPELINES === 'true') {
    await ghlClient.opportunities.create({
      contactId: contact.id,
      pipelineId: getPipelineIdForInterest(formData.interest),
      pipelineStageId: getInitialStageId(),
      name: `${formData.name} - ${formData.interest}`,
      status: 'open',
    });
  }

  // Trigger workflow
  await ghlClient.workflows.trigger(
    process.env.GHL_CONTACT_WORKFLOW_ID,
    { contactId: contact.id }
  );

  return contact;
}
```

### Supabase + GHL Sync Pattern
```typescript
// When user registers in Supabase (Empathy Ledger, JusticeHub)
async function syncToGHL(supabaseUser) {
  const ghlClient = createGHLClient();

  // Create/update GHL contact
  const contact = await ghlClient.contacts.upsert({
    email: supabaseUser.email,
    name: supabaseUser.user_metadata.full_name,
    tags: ['empathy-ledger', `role:${supabaseUser.user_metadata.role}`],
    customFields: {
      supabase_user_id: supabaseUser.id,
      account_created: supabaseUser.created_at,
    },
  });

  // Store sync relationship
  await supabase.from('ghl_contact_sync').upsert({
    supabase_user_id: supabaseUser.id,
    ghl_contact_id: contact.id,
    email: supabaseUser.email,
    project: 'empathy-ledger',
    last_synced: new Date().toISOString(),
  });

  return contact;
}
```

### Resend Email Trigger Pattern
```typescript
import { Resend } from 'resend';
import { WelcomeEmail } from '@/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

// Triggered from GHL workflow webhook
export async function sendTransactionalEmail(contactId, templateName) {
  const ghlClient = createGHLClient();
  const contact = await ghlClient.contacts.get(contactId);

  await resend.emails.send({
    from: 'The Harvest <hello@theharvest.org.au>',
    to: contact.email,
    subject: 'Welcome to The Harvest Community',
    react: WelcomeEmail({
      name: contact.name,
      interestArea: contact.customFields.interest_area
    }),
  });
}
```

## Instructions for Claude

When a user asks a GHL-related question:

1. **Identify the request type**: Pipeline design, workflow scripting, integration, reporting, training, troubleshooting
2. **Determine the project context**: Which of the 4 ACT projects is this for? Or is it cross-project?
3. **Load relevant context**: Read GHL_PIPELINE_STRATEGY.md, SUPABASE_GHL_INTEGRATION_ARCHITECTURE.md, or project-specific docs as needed
4. **Generate tailored response**:
   - Use the appropriate response pattern from this skill
   - Include project-specific details (revenue models, user journeys, special considerations)
   - Provide code examples if it's an integration question
   - Include GHL UI instructions if it's a training question
   - Suggest cross-project synergies when relevant
5. **Always prioritize**: Mission alignment, human dignity, accessibility, cultural protocols
6. **Be actionable**: Provide specific steps, not just concepts

## Example Invocations

### User asks: "We're launching a CSA subscription box program at The Harvest. What pipeline should we use?"

**Skill response**:
```
CSA Subscription Pipeline - The Harvest

Stages:
1. Interest Expressed
   - Entry: Filled out CSA interest form on website
   - Actions: Send CSA info pack (what's included, pricing, pickup locations)
   - Exit: Selects box size and frequency

2. Box Size Selected
   - Entry: Chose weekly/fortnightly, small/medium/large
   - Actions: Send payment link (Stripe subscription)
   - Exit: Payment processed

3. Payment Set Up
   - Entry: Stripe subscription active
   - Actions: Welcome pack, first box ETA, farm tour invitation
   - Exit: First box delivered

4. Active Subscriber
   - Entry: Receiving boxes regularly
   - Actions: Weekly "box ready" SMS, monthly recipe cards, quarterly satisfaction survey
   - Exit: Pauses or cancels

5. Paused
   - Entry: Temporarily suspended (vacation, financial, etc.)
   - Actions: Monthly "ready to resume?" check-in
   - Exit: Resumes or cancels

6. Cancelled
   - Entry: Subscription ended
   - Actions: Exit survey, wait 90 days, "we'd love you back" campaign
   - Exit: Re-subscribes (back to Active) or stays opted out

Custom Fields:
- box_size (dropdown: small/medium/large)
- frequency (dropdown: weekly/fortnightly)
- pickup_location (dropdown: Witta General Store, Maleny IGA, On-farm)
- dietary_preferences (text: vegetarian, no nightshades, etc.)
- subscription_start_date (date)
- lifetime_value (number: total $ spent)
- pause_reason (text: for learning/re-engagement)

Revenue Tracking:
- Small box: $35/week × 52 weeks = $1,820/year
- Medium box: $50/week × 52 weeks = $2,600/year
- Large box: $70/week × 52 weeks = $3,640/year
- Target: 50 subscribers (mix of sizes) = ~$100,000/year revenue

Automation Triggers:
- Interest expressed → Send CSA guide PDF
- Payment set up → Welcome email with first box contents preview
- 3 days before first box → SMS with pickup location and time
- Weekly (Thursdays) → "Your box is ready!" notification
- After 3 months → Satisfaction survey + referral request ("friend gets first box free")
- After 6 months → Loyalty reward (free farm tour or 1 free box)
- Paused (monthly) → Check-in: "Miss your veggies? We miss you!"
- Cancelled (day 90) → Win-back offer (20% off for 3 months)

Cross-Project Synergy:
- Tag CSA subscribers who express interest in conservation → Invite to ACT Farm workshop
- Tag CSA subscribers who mention cooking → Invite to The Harvest cooking classes
- After 1 year, invite to become volunteer (farm connections = retention)
```

---

### User asks: "How do I connect Stripe payments to ACT Farm residency bookings in GHL?"

**Skill response**:
```
Stripe + GHL Integration for ACT Farm Residencies

Option 1: GHL Native Stripe Integration (Recommended)

Setup Steps:
1. In GHL: Settings → Payments → Integrations → Connect Stripe
2. Authorize Stripe account (redirects to Stripe, click "Connect")
3. Create products in GHL:
   - Product: "R&D Residency" | Price: Custom ($300-500/night)
   - Product: "Creative Residency" | Price: Custom ($400/night)
   - Product: "Wellbeing Residency" | Price: Custom ($350/night)

Booking Flow:
1. User fills contact form → Creates GHL contact
2. Coordinator reviews application → Moves to "Approved" stage
3. GHL automation sends email with Stripe payment link
4. Payment link includes:
   - Residency type (R&D, Creative, Wellbeing)
   - Number of nights (calculated: arrival - departure)
   - Dynamic pricing: nights × rate
   - Option: 50% deposit or full payment
5. User completes Stripe checkout
6. Webhook fires → GHL updates contact:
   - Stage: "Payment Received"
   - Custom field: payment_status = "fully_paid" or "deposit_paid"
   - Custom field: stripe_charge_id = [ID for refund reference]
7. GHL automation sends: Receipt, pre-arrival pack (what to bring, directions), calendar invite

Webhook Configuration:
1. In Stripe: Developers → Webhooks → Add endpoint
2. URL: https://services.leadconnectorhq.com/webhooks/stripe/{your-location-id}
   (Get location ID from GHL: Settings → Business Profile)
3. Events to listen for:
   - checkout.session.completed (payment successful)
   - charge.refunded (cancellation processed)
   - invoice.payment_failed (if using subscriptions for multi-month stays)

GHL Custom Fields to Update:
- payment_status (dropdown: pending/deposit_paid/fully_paid/refunded)
- stripe_charge_id (text)
- amount_paid (number)
- balance_due (number, if deposit only)
- payment_date (date)

---

Option 2: Custom API Integration (More Control)

Use this if you need:
- Complex deposit logic (50% now, 25% at 30 days, 25% at 14 days)
- Payment plans for long-term residents
- Integration with NDIS billing (June's Patch)

Implementation:
File: /app/api/residency-booking/route.ts

import Stripe from 'stripe';
import { createGHLClient } from '@/lib/ghl/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const ghlClient = createGHLClient();

export async function POST(request: Request) {
  const { contactId, nights, residencyType, arrivalDate } = await request.json();

  const pricePerNight = getPriceForResidencyType(residencyType);
  const totalAmount = nights * pricePerNight;

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: `${residencyType} Residency - ${nights} nights`,
          description: `Black Cockatoo Valley | Arrival: ${arrivalDate}`,
          images: ['https://actfarm.org.au/images/residency.jpg'],
        },
        unit_amount: totalAmount * 100, // Stripe uses cents
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/residencies`,
    metadata: {
      contactId,
      nights: nights.toString(),
      residencyType,
      arrivalDate,
    },
  });

  // Update GHL contact
  await ghlClient.contacts.updateCustomFields(contactId, {
    stripe_checkout_url: session.url,
    payment_status: 'pending',
    amount_due: totalAmount,
  });

  return Response.json({ checkoutUrl: session.url });
}

function getPriceForResidencyType(type: string): number {
  const pricing = {
    'R&D Residency': 300,
    'Creative Residency': 400,
    'Wellbeing Residency': 350,
    'Research Partnership': 500,
  };
  return pricing[type] || 350;
}

Webhook Handler:
File: /app/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createGHLClient } from '@/lib/ghl/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const ghlClient = createGHLClient();

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { contactId, nights, residencyType, arrivalDate } = session.metadata!;

    // Update GHL contact
    await ghlClient.contacts.updateCustomFields(contactId, {
      payment_status: 'fully_paid',
      amount_paid: session.amount_total! / 100,
      payment_date: new Date().toISOString(),
      stripe_charge_id: session.payment_intent as string,
    });

    // Move to next pipeline stage
    const pipelines = await ghlClient.opportunities.list({ contactId });
    if (pipelines.length > 0) {
      await ghlClient.opportunities.updateStage(
        pipelines[0].id,
        process.env.GHL_PAYMENT_RECEIVED_STAGE_ID!
      );
    }

    // Trigger confirmation workflow
    await ghlClient.workflows.trigger(
      process.env.GHL_BOOKING_CONFIRMED_WORKFLOW_ID!,
      { contactId }
    );
  }

  return Response.json({ received: true });
}

Environment Variables (.env.local):
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
GHL_PAYMENT_RECEIVED_STAGE_ID=abc123
GHL_BOOKING_CONFIRMED_WORKFLOW_ID=workflow_xyz

---

Recommendation:
- Start with Option 1 (GHL Native) for simplicity
- Move to Option 2 if you need:
  - NDIS billing integration (June's Patch)
  - Payment plans (multi-month residencies)
  - Custom deposit schedules
  - Advanced refund logic

Next Steps:
1. Connect Stripe in GHL (5 minutes)
2. Create products for each residency type (10 minutes)
3. Test booking flow end-to-end (30 minutes)
4. Configure webhook (if using Option 1)
5. Set up confirmation email workflow in GHL (20 minutes)
```

---

## Supporting Files

This skill references the following context files (Claude will read as needed):

- `GHL_PIPELINE_STRATEGY.md` - Complete pipeline architecture for all 4 projects
- `SUPABASE_GHL_INTEGRATION_ARCHITECTURE.md` - Auth + CRM integration guide
- `GHL_SETUP_GUIDE.md` - Step-by-step GHL configuration
- `TENANT_VENDOR_PIPELINE.md` - The Harvest tenant management details
- Project `.env.local.example` files - Environment variable configuration

## Troubleshooting Common Issues

**"Contact not created in GHL"**
- Check API key is valid (test with `ghlClient.contacts.list()`)
- Verify locationId is correct (Settings → Business Profile)
- Check rate limits (GHL allows 100 req/min, use Redis cache)
- Look for error in GHL webhook logs (Settings → Integrations → Webhooks)

**"Workflow not triggering"**
- Verify workflow is "Published" not "Draft"
- Check contact has required tags for workflow trigger
- Verify contact hasn't opted out of emails
- Check workflow conditions (e.g., "only if custom field X = Y")

**"Pipeline stage not updating"**
- Verify opportunity exists (contact can exist without pipeline entry)
- Check stage IDs match (get from GHL API or UI URL)
- Ensure workflow has permission to update pipeline

**"Email deliverability issues"**
- Use Resend for transactional emails (higher deliverability than GHL)
- Verify sender domain is configured in GHL (Settings → Email Services)
- Check spam score (use mail-tester.com)
- Avoid spam trigger words ("free", "guarantee", excessive exclamation marks)

## Skill Maintenance

This skill should be updated when:
- New pipelines are created (add to project context)
- New projects are added to ACT ecosystem
- GHL API changes (update integration patterns)
- Team feedback identifies gaps (add training materials)
- Cross-project synergies are discovered (add to workflow suggestions)

Version: 1.0.0
Last updated: 2025-12-24
Maintained by: ACT Development Team
