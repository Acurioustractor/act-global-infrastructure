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

---

## Advanced Integration Architecture

### GoHighLevel API Deep Dive

#### Official API Resources
- **Main Documentation**: https://marketplace.gohighlevel.com/docs/
- **Developer Portal**: https://developers.gohighlevel.com/
- **OAuth Helper**: https://www.ghlapiv2.com/
- **Webhook Integration**: https://marketplace.gohighlevel.com/docs/webhook/

#### Authentication Methods

**1. Private Integration Tokens (Recommended for ACT)**
```javascript
// Best for internal ACT tools - no token refresh needed
const GHL_API_KEY = process.env.GHL_PRIVATE_TOKEN;

const headers = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};
```

**2. OAuth 2.0 (For Public Apps)**
- Access tokens expire after ~24 hours
- Refresh tokens valid for 1 year
- Use for external partner integrations

#### Rate Limits & Best Practices

**Limits**:
- **Burst**: 100 requests per 10 seconds per location
- **Daily**: 200,000 requests per day per location

**Response Headers to Monitor**:
```javascript
const rateLimitInfo = {
  dailyLimit: response.headers['x-ratelimit-limit-daily'],
  dailyRemaining: response.headers['x-ratelimit-daily-remaining'],
  burstLimit: response.headers['x-ratelimit-max'],
  burstRemaining: response.headers['x-ratelimit-remaining'],
  intervalMs: response.headers['x-ratelimit-interval-milliseconds']
};
```

**Implementation Pattern with Retry Logic**:
```javascript
import pRetry from 'p-retry';

async function callGHLAPI(endpoint, options) {
  return await pRetry(
    async () => {
      const response = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      });

      // Check rate limits
      const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '100');
      if (remaining < 10) {
        console.warn('⚠️ Approaching rate limit:', remaining, 'requests remaining');
      }

      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      if (response.status >= 500) {
        throw new Error(`GHL API error: ${response.status}`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${error.message}`);
      }

      return await response.json();
    },
    {
      retries: 3,
      factor: 2,
      minTimeout: 500,
      maxTimeout: 2000,
      onFailedAttempt: error => {
        console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      }
    }
  );
}
```

### Available MCP Servers for GoHighLevel

Model Context Protocol (MCP) servers enable AI assistants like Claude to interact with GHL via natural language.

#### 1. Official GoHighLevel MCP Server ⭐ Recommended

**Documentation**: https://marketplace.gohighlevel.com/docs/other/mcp/

**Features**:
- Full CRUD operations on contacts, opportunities, calendars
- Natural language queries ("Find all contacts from The Harvest")
- Built-in rate limiting and error handling
- Official support from GHL team

**Installation**:
```json
{
  "mcpServers": {
    "gohighlevel": {
      "command": "npx",
      "args": ["-y", "@gohighlevel/mcp-server"],
      "env": {
        "GHL_API_KEY": "your-private-token",
        "GHL_LOCATION_ID": "your-location-id"
      }
    }
  }
}
```

**Use Cases**:
- AI-powered CRM queries: "Show me all ACT Farm residents who need follow-up"
- Automated contact enrichment
- Natural language pipeline management
- AI-assisted email campaign creation

#### 2. Community MCP Servers

**mastanley13/GoHighLevel-MCP**
- GitHub: https://github.com/mastanley13/GoHighLevel-MCP
- Focus: Contact management and search
- Status: Active development

**drausal/gohighlevel-mcp**
- GitHub: https://github.com/drausal/gohighlevel-mcp
- Focus: Lightweight integration
- Status: Community maintained

**basicmachines-co/open-ghl-mcp**
- GitHub: https://github.com/basicmachines-co/open-ghl-mcp
- Focus: Open source alternative
- Status: Experimental

**Recommendation**: Use official GHL MCP server for production. Community servers for experimentation.

### Notion Integration Strategy (Avoiding Duplication)

#### The Problem
How do we provide team visibility into GHL activities without duplicating CRM data in Notion?

#### The Solution: Activity Log Pattern

**Principle**: GHL is the single source of truth. Notion shows activity summaries with links back to GHL.

**Architecture**:
```
GHL (Source of Truth)
  |
  |--- Scheduled Sync (6 hours) --> Notion Partners/Grants
  |                                 (reconciliation, summaries only)
  |
  |--- Webhooks (real-time) -------> Notion Activity Log
                                     (events, not data)
```

#### Notion Database Structure: Activity Log

**Purpose**: Track GHL activities for team visibility without storing full contact data.

**Schema**:
```javascript
{
  "Event Type": { "select": ["Contact Created", "Deal Won", "Pipeline Updated", "Campaign Sent"] },
  "Entity Name": { "title": "Jane Smith - The Harvest Volunteer" },
  "Project": { "select": ["The Harvest", "ACT Farm", "Empathy Ledger", "JusticeHub"] },
  "GHL Record ID": { "rich_text": "contact_abc123" },
  "Action": { "rich_text": "Moved to Active Volunteer stage" },
  "Amount": { "number": null }, // For deals only
  "Timestamp": { "date": "2026-01-01T10:30:00Z" },
  "GHL Link": { "url": "https://app.gohighlevel.com/location/xyz/contacts/contact_abc123" },
  "Triggered By": { "select": ["Automation", "Manual", "Integration"] }
}
```

**Benefits**:
- No data duplication (just events)
- Team sees recent activities at a glance
- One-click to full GHL record
- Immutable event log (audit trail)
- No sync drift issues

#### Implementation: Activity Logger Service

```javascript
// lib/activity-logger.js
import { Client } from '@notionhq/client';

export class ActivityLogger {
  constructor() {
    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.activityDbId = process.env.NOTION_ACTIVITY_LOG_DB_ID;
  }

  async logEvent(event) {
    const { type, entityName, project, ghlId, action, amount, triggeredBy } = event;

    await this.notion.pages.create({
      parent: { database_id: this.activityDbId },
      properties: {
        'Event Type': { select: { name: type } },
        'Entity Name': { title: [{ text: { content: entityName } }] },
        'Project': { select: { name: project } },
        'GHL Record ID': { rich_text: [{ text: { content: ghlId } }] },
        'Action': { rich_text: [{ text: { content: action } }] },
        'Amount': amount ? { number: amount } : undefined,
        'Timestamp': { date: { start: new Date().toISOString() } },
        'GHL Link': { url: this.buildGHLLink(type, ghlId) },
        'Triggered By': { select: { name: triggeredBy || 'Integration' } }
      }
    });
  }

  buildGHLLink(entityType, ghlId) {
    const locationId = process.env.GHL_LOCATION_ID;
    const baseUrl = `https://app.gohighlevel.com/location/${locationId}`;

    const paths = {
      'Contact Created': `/contacts/${ghlId}`,
      'Deal Won': `/opportunities/${ghlId}`,
      'Pipeline Updated': `/opportunities/${ghlId}`,
      'Campaign Sent': `/marketing/emails`
    };

    return `${baseUrl}${paths[entityType] || '/contacts'}`;
  }
}

// Usage in sync script
const logger = new ActivityLogger();

await logger.logEvent({
  type: 'Contact Created',
  entityName: 'Jane Smith - The Harvest Volunteer',
  project: 'The Harvest',
  ghlId: 'contact_abc123',
  action: 'New volunteer signup from website form',
  triggeredBy: 'Integration'
});
```

#### Webhook Integration for Real-Time Logging

**GHL Webhook Configuration**:
1. GHL Settings → Integrations → Webhooks
2. Create webhook: `https://your-domain.vercel.app/api/webhooks/ghl`
3. Select events: Contact Created, Opportunity Won, Pipeline Stage Changed
4. Add webhook signature verification

**Webhook Handler** (Vercel Serverless):
```javascript
// app/api/webhooks/ghl/route.js
import { ActivityLogger } from '@/lib/activity-logger';
import crypto from 'crypto';

export async function POST(req) {
  // Verify webhook signature
  const signature = req.headers.get('x-ghl-signature');
  const body = await req.text();

  const expectedSignature = crypto
    .createHmac('sha256', process.env.GHL_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const logger = new ActivityLogger();

  // Route to appropriate handler
  switch (event.type) {
    case 'ContactCreate':
      await logger.logEvent({
        type: 'Contact Created',
        entityName: `${event.contact.firstName} ${event.contact.lastName}`,
        project: detectProject(event.contact.tags),
        ghlId: event.contact.id,
        action: `New contact from ${event.contact.source}`,
        triggeredBy: 'Automation'
      });
      break;

    case 'OpportunityStatusUpdate':
      if (event.opportunity.status === 'won') {
        await logger.logEvent({
          type: 'Deal Won',
          entityName: event.opportunity.name,
          project: detectProject(event.opportunity.tags),
          ghlId: event.opportunity.id,
          action: `Deal closed: ${event.opportunity.pipelineStageName}`,
          amount: event.opportunity.monetaryValue,
          triggeredBy: 'Automation'
        });
      }
      break;

    case 'OpportunityStageUpdate':
      await logger.logEvent({
        type: 'Pipeline Updated',
        entityName: event.opportunity.name,
        project: detectProject(event.opportunity.tags),
        ghlId: event.opportunity.id,
        action: `Moved to ${event.opportunity.pipelineStageName}`,
        triggeredBy: event.triggeredBy || 'Manual'
      });
      break;
  }

  return Response.json({ success: true });
}

function detectProject(tags = []) {
  if (tags.includes('the-harvest')) return 'The Harvest';
  if (tags.includes('act-farm')) return 'ACT Farm';
  if (tags.includes('empathy-ledger')) return 'Empathy Ledger';
  if (tags.includes('justicehub')) return 'JusticeHub';
  return 'Unknown';
}
```

### ACT Ecosystem Integration Strategy

Based on comprehensive analysis across all ACT projects, here's the recommended integration architecture:

#### Single Source of Truth by Entity

| Entity Type | Source of Truth | Synced To | Sync Frequency |
|-------------|----------------|-----------|----------------|
| Storyteller Profiles | Empathy Ledger (Supabase) | GHL (read-only summary) | Daily |
| Volunteer Profiles | GHL | Notion (activity log) | Real-time webhooks |
| Donor Profiles | GHL | Notion (grants database) | 6 hours |
| Partner Organizations | Notion | GHL (for campaigns) | Weekly |
| Campaigns & Pipelines | GHL | Notion (activity log) | Real-time webhooks |
| Team Documentation | Notion | N/A | Manual |
| Elder Consent | Empathy Ledger (Supabase) | GHL (read-only flag) | Never (sovereignty) |

#### Cross-Project Relationship Tracking

**Challenge**: A person involved in multiple ACT projects (e.g., Empathy Ledger storyteller + ACT Farm resident + The Harvest volunteer)

**Solution**: Single GHL profile with multi-project tags

```javascript
// Example: Elder involved in 3 projects
{
  id: 'contact_xyz789',
  email: 'elder@example.com',
  firstName: 'Mary',
  lastName: 'Smith',
  tags: [
    'empathy-ledger',           // Base project tag
    'act-farm',                 // Base project tag
    'the-harvest',              // Base project tag
    'role:elder',               // Cross-project role
    'engagement:active',        // Status
    'priority:high'             // VIP treatment
  ],
  customFields: {
    empathy_ledger_user_id: 'uuid-from-supabase',
    empathy_ledger_consent_status: 'full_consent',
    act_farm_residency_dates: '2025-03-15 to 2025-03-22',
    harvest_volunteer_hours: 24,
    cultural_protocols: 'Kabi Kabi Elder - requires cultural review'
  }
}
```

**Communication Strategy**:
- Consolidated monthly updates (not 3 separate emails)
- Cross-project opportunities: "Your story might inspire our residents"
- Respect cultural protocols across all touchpoints

#### Integration Flow Examples

**1. Empathy Ledger Storyteller → GHL**
```javascript
// Triggered when storyteller completes profile in Supabase
async function syncStorytellerToGHL(storyteller) {
  const ghlClient = createGHLClient();

  // Create/update GHL contact (summary only)
  await ghlClient.contacts.upsert({
    email: storyteller.email,
    firstName: storyteller.first_name,
    lastName: storyteller.last_name,
    tags: ['empathy-ledger', 'role:storyteller'],
    customFields: {
      supabase_user_id: storyteller.id,
      storyteller_status: storyteller.profile_status,
      stories_count: storyteller.stories_count,
      // NOTE: Story content stays in Supabase (data sovereignty)
      consent_status: storyteller.consent_status
    }
  });

  // Log activity in Notion
  await activityLogger.logEvent({
    type: 'Contact Created',
    entityName: `${storyteller.first_name} ${storyteller.last_name}`,
    project: 'Empathy Ledger',
    ghlId: contact.id,
    action: 'New storyteller profile completed',
    triggeredBy: 'Integration'
  });
}
```

**2. GHL Volunteer Signup → Notion Activity Log**
```javascript
// Webhook from GHL when volunteer form submitted
async function handleVolunteerSignup(webhookData) {
  const contact = webhookData.contact;

  // Log in Notion for team visibility
  await activityLogger.logEvent({
    type: 'Contact Created',
    entityName: `${contact.firstName} ${contact.lastName}`,
    project: 'The Harvest',
    ghlId: contact.id,
    action: `New volunteer - interests: ${contact.customFields.volunteer_interests}`,
    triggeredBy: 'Automation'
  });

  // Trigger welcome workflow in GHL (handled by GHL automation)
  // Team sees activity in Notion, full details in GHL
}
```

**3. Cross-Project Opportunity Detection**
```javascript
// Daily job that identifies cross-project opportunities
async function detectCrossProjectOpportunities() {
  const ghlClient = createGHLClient();

  // Find ACT Farm residents interested in storytelling
  const residents = await ghlClient.contacts.search({
    tags: ['act-farm'],
    customFieldFilters: {
      residency_focus: { $contains: 'creative' }
    }
  });

  for (const resident of residents) {
    // Check if already tagged for Empathy Ledger
    if (!resident.tags.includes('empathy-ledger-opportunity')) {

      // Add tag
      await ghlClient.contacts.addTag(resident.id, 'empathy-ledger-opportunity');

      // Trigger workflow: Send personalized email about Empathy Ledger
      await ghlClient.workflows.trigger(
        process.env.GHL_CROSS_PROJECT_WORKFLOW_ID,
        { contactId: resident.id }
      );

      // Log activity
      await activityLogger.logEvent({
        type: 'Pipeline Updated',
        entityName: `${resident.firstName} ${resident.lastName}`,
        project: 'ACT Farm',
        ghlId: resident.id,
        action: 'Identified for Empathy Ledger cross-project opportunity',
        triggeredBy: 'Automation'
      });
    }
  }
}
```

### Recommended Implementation Phases

#### Phase 1: Foundation (Week 1-2)
**Goal**: Establish core infrastructure and governance

**Deliverables**:
1. ✅ Enhanced GHL API service with retry logic
2. ✅ Rate limit monitoring and alerts
3. ✅ Activity Log database in Notion
4. ✅ Basic activity logging service
5. ✅ Documentation of data ownership

**Success Metrics**:
- 100% API calls have retry logic
- Rate limit warnings logged before hitting limits
- Team can view GHL activities in Notion

#### Phase 2: Real-Time Integration (Week 3-4)
**Goal**: Enable real-time visibility without duplication

**Deliverables**:
1. ✅ GHL webhook endpoint deployed (Vercel serverless)
2. ✅ Webhook signature verification
3. ✅ Real-time activity logging for critical events
4. ✅ Cross-project tag strategy implemented
5. ✅ Team training on Activity Log usage

**Success Metrics**:
- 90% of critical events logged within 30 seconds
- Zero webhook signature failures
- Team adoption of Activity Log (80%+ checking weekly)

#### Phase 3: Automation (Week 5-6)
**Goal**: Automated workflows and cross-project opportunities

**Deliverables**:
1. ✅ Cross-project opportunity detection
2. ✅ Automated welcome sequences per project
3. ✅ Consent management for Empathy Ledger
4. ✅ Elder/cultural protocol automation
5. ✅ Monthly sync health reports

**Success Metrics**:
- 60% of workflows automated
- 5+ cross-project opportunities identified per month
- 100% cultural protocol compliance

#### Phase 4: Optimization (Ongoing)
**Goal**: Continuous improvement and community governance

**Deliverables**:
1. ✅ Monthly team retrospectives
2. ✅ Quarterly data accuracy audits
3. ✅ Community feedback integration
4. ✅ MCP server integration (if AI features needed)
5. ✅ Regenerative practice reviews

**Success Metrics**:
- 95% data accuracy in dashboards
- 80% community satisfaction
- Team members able to build 20% of new workflows

### Environmental Configuration

**Required Environment Variables**:
```bash
# GHL Authentication
GHL_PRIVATE_TOKEN=your-private-integration-token
GHL_LOCATION_ID=your-location-id
GHL_WEBHOOK_SECRET=your-webhook-secret

# Notion Integration
NOTION_API_KEY=secret_xyz123
NOTION_ACTIVITY_LOG_DB_ID=database-id-for-activity-log
NOTION_PARTNERS_DB_ID=database-id-for-partners
NOTION_GRANTS_DB_ID=database-id-for-grants

# Supabase (for Empathy Ledger sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=service-role-key

# Feature Flags
GHL_ENABLE_WEBHOOKS=true
GHL_ENABLE_CROSS_PROJECT_DETECTION=true
GHL_ENABLE_ACTIVITY_LOGGING=true
```

### Monitoring & Observability

**Key Metrics to Track**:
1. GHL API rate limit usage (daily dashboard)
2. Webhook delivery success rate (target: >99%)
3. Activity log completeness (compare GHL events to Notion logs)
4. Cross-project conversion rate (opportunities → engagement)
5. Data sync accuracy (weekly audit)

**Alerting Rules**:
- Alert when daily API usage >80% of limit
- Alert on webhook signature failures
- Alert when sync job fails 3 times consecutively
- Alert when cultural protocol violation detected

### Security & Compliance

**Cultural Data Sovereignty**:
- Elder consent data NEVER leaves Supabase
- Cultural protocols enforced at API level
- OCAP principles applied to all Indigenous data
- Read-only GHL access for sensitive content

**Data Privacy**:
- All API calls logged for audit trail
- PII minimization in Notion (just summaries)
- Webhook payloads encrypted in transit
- Regular security audits

**Consent Management**:
- Explicit opt-in required for all communications
- Granular consent per communication type
- Easy opt-out mechanism
- Consent status synced across systems

---

Version: 2.0.0
Last updated: 2026-01-01
Maintained by: ACT Development Team
Enhanced with ACT Voice v1.0 ecosystem analysis
