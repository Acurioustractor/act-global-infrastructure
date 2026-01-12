# GHL Integration Guide

> Auto-create contacts from Gmail, Calendar, and Website Forms

## Overview

All external sources use the **same GHL Inbound Webhook** to create contacts. This is the "Gmail Email to Contact" workflow you already have set up.

**GHL Inbound Webhook URL:**
```
https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554
```

**The Flow:**
```
Gmail/Calendar/Forms → Apps Script/JS → GHL Webhook → Contact Created → 6-hour Sync → Supabase
```

---

## Integration Status

| Source | Status | Script Location |
|--------|--------|-----------------|
| Gmail | **Live** | `scripts/gmail-to-ghl-apps-script.js` |
| Calendar | Ready to deploy | `scripts/calendar-to-ghl-apps-script.js` |
| Website Forms | Ready to use | `scripts/form-to-ghl-webhook.js` |

---

## 1. Gmail → GHL (Already Running)

Automatically creates contacts from inbound emails.

**Setup:** Google Apps Script runs every 5 minutes
**Location:** `scripts/gmail-to-ghl-apps-script.js`
**Status:** Live and working

### What It Does
- Monitors inbox for new unread emails
- Extracts sender name and email
- Sends to GHL webhook → creates contact
- Filters out noreply, newsletters, etc.

### Tags Applied
- "Email Lead"
- "Gmail Import"

---

## 2. Calendar → GHL

Automatically creates contacts from meeting attendees.

**Setup:** Google Apps Script runs every 15 minutes
**Location:** `scripts/calendar-to-ghl-apps-script.js`

### Setup Instructions

1. Go to https://script.google.com (logged into outact.place)
2. Create new project: "Calendar to GHL Sync"
3. Paste contents of `scripts/calendar-to-ghl-apps-script.js`
4. Run `testWebhook` function (grant Calendar permissions)
5. Add trigger:
   - Function: `processCalendarEvents`
   - Event: Time-driven
   - Type: Minutes timer
   - Interval: Every 15 minutes

### What It Does
- Scans upcoming events (next 7 days)
- Extracts attendee emails and names
- Sends to GHL webhook → creates contact
- Filters out your own addresses, Google resources

### Tags Applied
- "Meeting Contact"
- "Calendar Import"

### Configuration Options

Edit these at the top of the script:

```javascript
const CALENDAR_ID = 'primary';        // Which calendar to monitor
const LOOKBACK_HOURS = 24;            // Check events from past X hours
const LOOKAHEAD_DAYS = 7;             // Check events for next X days
const IGNORE_PATTERNS = [             // Emails to skip
  'outact.place',
  'acurioustractor',
  'noreply',
  'resource.calendar.google.com'
];
```

---

## 3. Website Forms → GHL

Create contacts directly from website forms.

**Location:**
- Plain JS: `scripts/form-to-ghl-webhook.js`
- React: `components/GHLContactForm.tsx`

### Option A: Plain HTML/JS

Add this to any HTML page:

```html
<form id="contact-form">
  <input type="text" name="firstName" placeholder="First Name" required>
  <input type="text" name="lastName" placeholder="Last Name">
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone">
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Submit</button>
</form>

<script>
const GHL_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(this).entries());

  await fetch(GHL_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      source: 'Website Form',
      tags: ['Website Lead', 'Form Submission'],
      message: data.message,
      formPage: window.location.href,
      importSource: 'website-form'
    }),
    mode: 'no-cors'
  });

  this.innerHTML = '<p>Thank you! We\'ll be in touch soon.</p>';
});
</script>
```

### Option B: React/Next.js Component

```tsx
import { GHLContactForm } from '@/components/GHLContactForm';

// Basic usage
<GHLContactForm />

// Customized
<GHLContactForm
  source="Empathy Ledger Website"
  tags={['Website Lead', 'Empathy Ledger']}
  submitText="Get Started"
  successMessage="Welcome! Check your email."
  onSuccess={() => router.push('/thank-you')}
/>
```

### Tags Applied
- "Website Lead"
- "Form Submission"

---

## How Contacts Sync to Supabase

GHL workflow webhooks don't reliably pass field data (only contact IDs). So we use a **scheduled sync**:

1. **GHL creates contact** (from Gmail/Calendar/Form webhook)
2. **Every 6 hours**, `sync-ghl-to-supabase.mjs` runs:
   - Pulls all contacts from GHL API
   - Upserts to `ghl_contacts` table
3. **Result**: Full contact data in Supabase

### Manual Sync

```bash
cd /Users/benknight/act-global-infrastructure
node scripts/sync-ghl-to-supabase.mjs
```

### Check Sync Status

```bash
cd /Users/benknight/act-personal-ai
npm run ghl:stats
```

---

## Payload Format

All sources send the same format to GHL:

```json
{
  "email": "person@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+61400000000",
  "source": "Gmail Import | Calendar Import | Website Form",
  "tags": ["Tag1", "Tag2"],

  // Source-specific context
  "emailSubject": "For Gmail",
  "meetingTitle": "For Calendar",
  "message": "For Forms",

  // Metadata
  "importedAt": "2026-01-06T10:00:00Z",
  "importSource": "gmail-apps-script | calendar-apps-script | website-form"
}
```

---

## Troubleshooting

### Contact Not Created in GHL

1. Check Apps Script execution log:
   - Go to script.google.com
   - View > Executions
   - Look for errors

2. Test webhook manually:
   - Run `testWebhook()` function in Apps Script

3. Check GHL workflow is published:
   - Automation > Workflows
   - Ensure "Gmail Email to Contact" shows green/active

### Contact Created but Not in Supabase

Run manual sync:
```bash
node scripts/sync-ghl-to-supabase.mjs
```

Or wait for next scheduled sync (every 6 hours).

### Duplicate Contacts

GHL handles deduplication by email. If the same email is sent multiple times, GHL updates the existing contact rather than creating duplicates.

---

## Future Integrations

| Source | Difficulty | Notes |
|--------|------------|-------|
| LinkedIn | Medium | Browser extension or third-party tool |
| Twitter/X | Medium | API access required |
| Stripe | Easy | Webhook on customer.created |
| Zoom | Medium | Webhook on meeting.participant_joined |
| Typeform | Easy | Native GHL integration |
| Calendly | Easy | Native GHL integration |

---

*Last updated: 2026-01-06*
