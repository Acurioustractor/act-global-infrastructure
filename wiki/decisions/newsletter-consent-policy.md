---
title: Newsletter Consent Policy
date: 2026-05-13
status: active
---

# Newsletter Consent Policy

## Truth source: `newsletter_consent = true`

The boolean `ghl_contacts.newsletter_consent` is the **only legal opt-in signal**.
118 contacts have it set (Feb-Mar 2026), all with `newsletter_consent_at` timestamps from form submissions.

## Tags are segments, not consent

The `*-newsletter` tags (`goods-newsletter`, `harvest-newsletter`, `newsletter`) are
**marketing segments** showing which newsletter a contact has been associated with.
They do NOT carry legal consent. **Do not send to a contact based on tag alone.**

| Signal | Meaning | Send? |
|---|---|---|
| `newsletter_consent = true` AND tag present | Consented to newsletter X | YES |
| Tag present, consent = false/null | Marketing segment, no opt-in | **NO** |
| Consent = true, no tag | Consented but no project — needs tag assigned | YES (after segment decision) |
| Synthetic email (`.local` / `.temp`) | EL storyteller stub, not contactable | NO |

## Canonical send query

Use `v_newsletter_audience`:

```sql
SELECT email, full_name, newsletter_segment, projects
FROM v_newsletter_audience
WHERE newsletter_segment = 'goods';
```

This view enforces all four rules:
- `newsletter_consent = true`
- `newsletter_unsubscribed_at IS NULL`
- Email is real (non-synthetic)
- Email is non-null

## Going forward

- Forms must atomically write **both** `newsletter_consent = true` **and** the project-specific tag (`goods-newsletter`, `harvest-newsletter`, etc.).
- New tag pattern: `newsletter-<project-code>` is preferred going forward (e.g. `newsletter-ACT-GD`) so the tag canonicalises via the resolver. Existing `goods-newsletter` style tags stay supported via the prefix rule.
- Unsubscribe events must write `newsletter_unsubscribed_at = NOW()`. They should **not** flip `newsletter_consent` to false (we want to remember the original opt-in date).
- Audit log: every consent change should land in `audit_logs` (or similar) with source URL + timestamp.

## What we did NOT do

- We did **not** auto-elevate the 264 tagged-but-unconsented contacts to `newsletter_consent = true`. They were tagged via marketing segmentation (LinkedIn outreach, manual sorting) without an explicit opt-in event.
- We did **not** remove any `*-newsletter` tags. The segmentation signal is useful even when consent is missing — e.g. for re-prompts at the next form interaction.

## Current numbers (2026-05-13)

| Signal | Count |
|---|---|
| `newsletter_consent = true` | 118 |
| Tagged `goods-newsletter` | 332 |
| Tagged `harvest-newsletter` | 19 |
| Tagged `newsletter` (generic) | 31 |
| **Sendable Goods audience** (`v_newsletter_audience`) | **116** |
| Sendable Harvest audience | 0 (none consented yet) |

## Re-prompt candidates

The 246 real-email contacts who carry a `*-newsletter` tag but lack consent are in `v_newsletter_reprompt_candidates`. They are NOT in the send audience. To convert them, run a one-time opt-in re-prompt campaign:

| Segment | Candidates | Active last 90d |
|---|---|---|
| `goods` (`goods-newsletter`) | 214 | 13 |
| `harvest` (`harvest-newsletter`) | 19 | 0 |
| `generic` (`newsletter`) | 12 | 0 |

Re-prompt campaign mechanics:
1. Send a "confirm your newsletter subscription" email (transactional, not marketing — informing them they're segmented and asking to confirm).
2. Confirm link writes `newsletter_consent=true` + `newsletter_consent_at=NOW()` via Supabase edge function.
3. Contacts who don't confirm in 30 days: keep the marketing tag, never auto-send.
