---
title: Newsletter Opt-In Re-Prompt Campaign
date: 2026-05-13
status: draft — needs Ben approval before send
audience: 246 contacts (214 Goods · 19 Harvest · 12 generic · 1 misc)
---

# Newsletter Re-Prompt Campaign — Draft

## Why we're sending

246 contacts in GHL carry a `*-newsletter` tag (`goods-newsletter`, `harvest-newsletter`, `newsletter`) but have no opt-in audit trail. They got tagged through marketing segmentation — LinkedIn outreach, manual sorting, event imports — not through an explicit double opt-in form. Per `wiki/decisions/newsletter-consent-policy.md`, we cannot legally include them in send audiences.

This campaign asks them to confirm. If they click confirm, we record `newsletter_consent=true` + `newsletter_consent_at` and they enter the send audience. If they don't, they stay in marketing-segment limbo (no sends).

## Cohort breakdown

| Segment | Total | Active last 90d | Notes |
|---|---|---|---|
| `goods-newsletter` | 214 | 13 | Warm — LinkedIn + Gmail-active subset |
| `harvest-newsletter` | 19 | 0 | Cold — needs framing as "you visited Witta last year, here's where we're at" |
| Generic `newsletter` | 12 | 0 | Mixed — handle case-by-case |
| Other | 1 | 0 | Single contact |

## Voice — ACT brand alignment

Reject AI tells (delve, crucial, pivotal, tapestry, em dashes, "not just X but Y"). Curtis method: name the room, name the body, load the abstract noun, stop the line.

## Draft email — Goods variant

**Subject:** Quick yes/no on Goods updates

**From:** Ben Knight <hi@act.place>

**Body:**

```
Hey {{first_name}},

Quick housekeeping. You're on our Goods list — we added you when {{tag_reason}} — but I don't have a record you actually said yes to email from us.

I want to fix that before we send anything else.

If you want our Goods updates (one a month, mostly photos and short stories from the projects), confirm with a click:

→ Yes, send me Goods updates: {{confirm_url}}

If not, ignore this and you're off the list. No follow-up.

Ben
A Curious Tractor
```

Variables:
- `{{first_name}}` — `gc.first_name` or fallback to "there"
- `{{tag_reason}}` — derived from secondary tags:
  - `goods-linkedin-*` → "you connected with us on LinkedIn"
  - `goods-gmail-*` → "we had an email exchange about Goods"
  - `goods-tier-champion` / `goods-supporter` → "you championed an early Goods conversation"
  - else → "you showed up around the Goods rollout"
- `{{confirm_url}}` — signed link to Supabase edge function (see below)

## Draft email — Harvest variant

**Subject:** Witta — checking in

```
Hey {{first_name}},

You came to Witta around {{event_or_date}}. I have you on the Harvest list, but I never properly asked.

If you want the occasional update from the Harvest — what's planted, what's harvested, who's been through — say yes:

→ Yes, keep me on the Harvest list: {{confirm_url}}

Otherwise, ignore this and you'll come off.

Ben
A Curious Tractor
```

## Confirm endpoint

New Supabase edge function: `confirm-newsletter-consent`

```ts
// apps/command-center/supabase/functions/confirm-newsletter-consent/index.ts
// Signed token contains: contact_id + segment + nonce
// Writes: newsletter_consent=true, newsletter_consent_at=NOW()
// Redirects to thank-you page
```

Token format: HMAC-signed JWT (1-year expiry) with `{contact_id, segment, iat}`.

## What this does NOT do

- Does NOT change `newsletter_consent` for anyone who doesn't click
- Does NOT remove `*-newsletter` tags (segmentation stays)
- Does NOT send to anyone outside the 246 cohort
- Is NOT a marketing email — it's a transactional/legal compliance email (one-time send only)

## Send mechanics

| Step | Tool | Notes |
|---|---|---|
| Generate signed URLs | Node script `scripts/generate-newsletter-reprompt-links.mjs` (TODO) | Outputs CSV: ghl_id, email, segment, url |
| Send | Send via Gmail API from `hi@act.place` in batches of 50 with 30s delay | Transactional one-shot. Don't use a marketing platform — keep it as a personal email |
| Track clicks | Supabase edge function logs to `newsletter_consent_events` table | Records consent timestamp |
| Reconcile | After 30 days, query unconfirmed cohort; document; don't auto-send |

## Approval gate

This is **Tier 3 — sends mail externally**. Will NOT execute without explicit "send the re-prompt" verb from Ben.

Pre-send checklist:
- [ ] Ben reviews + approves the Goods copy
- [ ] Ben reviews + approves the Harvest copy
- [ ] Edge function `confirm-newsletter-consent` deployed and tested with internal email
- [ ] `newsletter_consent_events` table created
- [ ] `generate-newsletter-reprompt-links.mjs` written
- [ ] Test send to Ben's own email — confirm link works, lands on right page
- [ ] Send in batches of 50 with 30s delay (Gmail rate-limit safety)
- [ ] Monitor for unsubscribes / replies
