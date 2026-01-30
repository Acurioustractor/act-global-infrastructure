/**
 * Xero Webhook Handler - Core Logic
 *
 * Separated from the Next.js route handler for testability.
 * Handles HMAC-SHA256 signature verification, Intent to Receive validation,
 * and event payload normalization.
 *
 * Xero webhook flow:
 * 1. Registration: Xero sends an "Intent to Receive" POST (firstEventSequence=0, empty events)
 *    - Must respond 200 with empty body if signature is valid
 * 2. Events: Xero sends event notifications with resource type + ID only
 *    - Events contain resourceUrl, resourceId, eventType, eventCategory
 *    - Full record must be fetched separately via Xero API
 * 3. Every request has x-xero-signature header (HMAC-SHA256 of body, base64 encoded)
 */

import crypto from 'crypto';

/**
 * Verify the HMAC-SHA256 signature from Xero's x-xero-signature header.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param {string} body - Raw request body string
 * @param {string|null} signature - The x-xero-signature header value (base64)
 * @param {string} webhookKey - The Xero webhook signing key
 * @returns {boolean} Whether the signature is valid
 */
export function verifyXeroSignature(body, signature, webhookKey) {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookKey)
    .update(body)
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks.
  // Both buffers must be the same length for timingSafeEqual.
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Process a Xero webhook payload after signature verification.
 *
 * Determines whether this is an Intent to Receive validation or
 * a normal event notification, and returns a normalized result.
 *
 * @param {object} payload - Parsed JSON payload from Xero
 * @returns {{ type: string, status: number, body: any, events: Array }}
 */
export function handleXeroWebhook(payload) {
  const firstEventSequence = payload?.firstEventSequence;
  const events = payload?.events || [];

  // Intent to Receive: firstEventSequence === 0 and no events
  if (firstEventSequence === 0 && events.length === 0) {
    return {
      type: 'intent_to_receive',
      status: 200,
      body: null,
      events: [],
    };
  }

  // Normal event processing
  const normalizedEvents = events.map((event) => ({
    resourceUrl: event.resourceUrl,
    resourceId: event.resourceId,
    eventDateUtc: event.eventDateUtc,
    eventType: event.eventType,
    eventCategory: event.eventCategory,
    tenantId: event.tenantId,
    tenantType: event.tenantType,
  }));

  return {
    type: 'events',
    status: 200,
    body: { ok: true },
    events: normalizedEvents,
  };
}
