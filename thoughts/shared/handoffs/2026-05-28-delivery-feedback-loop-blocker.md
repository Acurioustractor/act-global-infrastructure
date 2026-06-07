# Delivery feedback loop (backlog item 5) — feasibility + blocker (2026-05-28)

Ben chose to **reopen locked-plan Q12** and build real engagement automation that
feeds back into targeting/cadence (Q12 had deliberately scoped this as a *human*
practice — "no auto-learning algorithms"). Researched, **not built — blocked on
prerequisites that don't exist yet.**

## Why real automation is premature now

1. **GHL email engagement is not wired.** No open/click/bounce/deliver handling in
   `scripts/ghl-webhook-handler.mjs`, `scripts/lib/ghl-api-service.mjs`, or
   `apps/command-center/src/app/api/webhooks/ghl/route.ts`. The available GHL API /
   MCP surface does not expose email-campaign stats. → Capturing brand-send
   engagement needs a new, verified GHL email-events integration first (confirm the
   GHL plan even emits these events/webhooks).
2. **No sends exist.** No `newsletter_drafts` rows are `status='sent'`; brand/partner
   candidates aren't even promoted to `include`. Nothing to measure.
3. **Send path is still manual.** prepare-newsletter-for-send.mjs is paste-into-Gmail
   (funder/partner) / paste-into-GHL (brand) MVP — `ghl_campaign_id` is never
   populated, so there's no campaign to pull stats for.

## The one available signal (real, buildable)

`communications_history` (populated by Gmail sync) already tracks reply engagement:
`direction`, `is_reply`, `has_reply`, `response_received_at`, `outreach_campaign`,
`contact_email`, `channel`, `occurred_at`, `subject`, `source_thread_id`. → A
**reply-based** feedback signal for funder/partner (Gmail) editions is feasible:
"did the recipient reply within N days of the edition sent_at". Open/click is not.

## Proposed sequencing (once unblocked)

1. **First, get sends happening** — promote candidates to `include`, send the first
   editions (funder/partner via Gmail; brand via GHL with a real `ghl_campaign_id`).
2. **Confirm GHL email-events availability** (webhook event types / stats API on the
   current GHL plan). Wire ingestion → a `newsletter_engagement` table.
3. **Then build the loop**:
   - `newsletter_engagement` (edition_slug, recipient_slug, ghl_contact_id, signal
     [delivered|opened|clicked|replied|bounced|unsubscribed], occurred_at, source).
   - Reply signal: join `communications_history` (response_received_at vs edition
     sent_at, matched by contact_email/recipient).
   - GHL signal: from email webhook events (pending #2).
   - Targeting/cadence feedback: define the rule explicitly (e.g. unengaged for
     N editions → drop cadence / pause; replied → flag for human follow-up).
     **Needs a concrete definition from Ben + real data to tune.**

## Decision needed from Ben

- Build the **reply-capture spine now** (real, uses communications_history, but
  empty + unverifiable until sends exist), OR
- **Sequence it** after first sends + GHL email-events wiring (recommended — avoids
  unverifiable machinery), OR
- Define the **targeting/cadence rule** concretely so the algorithm can be designed.

## Context — shipped + pushed this session

- `wip/newsletter-drafters-2026-05-28` (pushed, no PR): partner+brand drafters
  `d295c15`, unified content calendar `a567cb1`.
- PM2: `comms-content-calendar` cron live (40 7); `storyteller-sync` deleted.
- Item 4 (storyteller own-story-back) blocker:
  `thoughts/shared/handoffs/2026-05-28-storyteller-own-story-back-blocker.md`.
