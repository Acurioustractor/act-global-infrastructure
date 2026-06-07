// scripts/lib/managed-agent-client.mjs
// Wrapper for Anthropic Managed Agents (May 2026 launch).
// Centralises: allowed_domains lockdown, idempotency keys, rate budgets, cost tracking.
// All Managed Agents calls in this codebase MUST go through this client so we
// can swap backends, enforce safety, and not pay the lock-in tax.
//
// Status: SCAFFOLD — interface only. Actual Managed Agents API integration
// requires Console access (public beta as of May 2026). When access lands,
// implement the methods marked TODO and remove the throwIfNotImplemented guard.
//
// Reference: thoughts/shared/plans/managed-agents-adoption-2026-05-07.md

import crypto from 'node:crypto';
import 'dotenv/config';

/** Domains that specialist subagents are allowed to reach. Empty = block all egress. */
const DEFAULT_ALLOWED_DOMAINS = [
  'api.notion.com',
  'api.anthropic.com',
  // Supabase project hosts get added per-call from env; never wildcard.
];

/** Hard rate budgets per tenant. Lead agent prompt MUST cite these. */
const RATE_BUDGETS = {
  notion:  { perSecond: 3,   sustainedNote: 'Notion API integration tier' },
  xero:    { perMinute: 60,  sustainedNote: 'per Xero tenant' },
  ghl:     { perMinute: 60,  sustainedNote: 'per GHL tenant' },
};

class ManagedAgentClient {
  /**
   * @param {Object} opts
   * @param {string[]} [opts.allowedDomains] — extra domains beyond DEFAULT_ALLOWED_DOMAINS
   * @param {boolean} [opts.dryRun=true] — when true, return a mock response without calling Anthropic
   * @param {string} [opts.workspaceId] — Anthropic workspace id (US region only at launch)
   */
  constructor(opts = {}) {
    this.allowedDomains = [...DEFAULT_ALLOWED_DOMAINS, ...(opts.allowedDomains || [])];
    this.dryRun = opts.dryRun ?? true;
    this.workspaceId = opts.workspaceId || process.env.ANTHROPIC_WORKSPACE_ID || null;
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
    this.eventCache = new Map(); // event_id → timestamp, for at-least-once webhook dedupe
  }

  /**
   * Run a single agent session with optional rubric grading (Outcomes).
   * @param {Object} session
   * @param {string} session.systemPrompt
   * @param {string} session.userInput
   * @param {string} [session.rubricPath] — path to a rubric file (e.g. thoughts/shared/rubrics/act-voice-curtis.md)
   * @param {string[]} [session.allowedDomains]
   * @param {string} [session.idempotencyKey]
   * @returns {Promise<{ok: boolean, output?: string, gradeReport?: any, eventId: string}>}
   */
  async runSession(session) {
    const eventId = session.idempotencyKey || this.#newEventId();
    if (this.eventCache.has(eventId)) {
      return { ok: true, output: '<dedupe: already processed>', eventId };
    }
    this.eventCache.set(eventId, Date.now());

    if (this.dryRun) {
      return {
        ok: true,
        output: `[dry-run] would run session with rubric=${session.rubricPath || 'none'}, domains=${this.allowedDomains.join(',')}`,
        eventId,
      };
    }

    // TODO when Console access provisioned:
    //   - call platform.claude.com/v1/managed-agents/sessions
    //   - pass session.allowedDomains, system prompt, user input
    //   - if rubricPath, attach as Outcome grader spec
    //   - poll session.status_idled or subscribe to webhook
    //   - return { ok, output, gradeReport, eventId }
    this.#throwIfNotImplemented('runSession');
  }

  /**
   * Run a multiagent orchestration: lead + N specialists with shared filesystem.
   * @param {Object} orchestration
   * @param {Object} orchestration.lead — { systemPrompt, userInput }
   * @param {Array<{name: string, systemPrompt: string, allowedDomains?: string[]}>} orchestration.specialists
   * @param {string[]} [orchestration.allowedDomains]
   * @param {string} [orchestration.idempotencyKey]
   * @returns {Promise<{ok: boolean, leadOutput?: string, specialistOutputs?: Record<string, any>, eventId: string}>}
   */
  async runOrchestration(orchestration) {
    const eventId = orchestration.idempotencyKey || this.#newEventId();
    if (this.dryRun) {
      return {
        ok: true,
        leadOutput: `[dry-run] lead would dispatch to ${orchestration.specialists.length} specialists: ${orchestration.specialists.map(s => s.name).join(', ')}`,
        eventId,
      };
    }
    // TODO: implement multiagent dispatch via Anthropic Managed Agents API.
    this.#throwIfNotImplemented('runOrchestration');
  }

  /**
   * Verify a webhook payload has not already been processed (at-least-once delivery).
   * @param {string} eventId
   * @returns {boolean} true if already processed (caller should ignore)
   */
  isDuplicateEvent(eventId) {
    return this.eventCache.has(eventId);
  }

  /** @returns {{notion: object, xero: object, ghl: object}} */
  getRateBudgets() {
    return RATE_BUDGETS;
  }

  #newEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  #throwIfNotImplemented(method) {
    throw new Error(
      `ManagedAgentClient.${method}: not implemented. Console access is required ` +
      `(public beta as of May 2026). See thoughts/shared/plans/managed-agents-adoption-2026-05-07.md.`,
    );
  }
}

export { ManagedAgentClient, DEFAULT_ALLOWED_DOMAINS, RATE_BUDGETS };
