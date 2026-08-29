// Lane resolution for the ACT intake spine.
//
// Design source: thoughts/shared/ghl/2026-08-29-ghl-front-door-brief.md §4
// (act-regenerative-studio), "Lane is computed server-side, default-deny".
//
// THE ONE RULE: the caller cannot set, suggest, or influence the lane. There is no
// `lane` field in the intake payload. It is derived here from (projectCode, formType)
// and nothing else, and a pair that is not explicitly allowlisted resolves to
// `duty_of_care` — which means the submission never reaches GHL at all.
//
// Why default-deny rather than a tag or a flag on the form:
//   The tag-based exclusion has already failed four times. `lane:community` resolves
//   to 86 contacts and `comms:act-newsletter` to 140; their intersection is 4. One of
//   those four holds role:storyteller, role:buyer, tier:member and
//   comms:harvest-newsletter simultaneously, with DND written by "Updated by contact
//   merge" rather than by a human. A tag can be added by a merge, a workflow, a bulk
//   action, or any of four divergent GHL clients. Default-deny is the difference
//   between a convention and a guard.
//
// Why this lives here and not in each site's GHL client:
//   The 2026-08-29 lane-gate attempt tried to gate `GHLClient` inside each repo and
//   produced 23 blocker/major findings, because the premise was wrong — GHLClient is
//   exported with a public constructor and admin routes build their own Bearer fetch
//   to services.leadconnectorhq.com, so there is no chokepoint to gate. The chokepoint
//   is this endpoint: the one place every site posts to.

export type Lane = 'commerce' | 'transactional' | 'community' | 'duty_of_care';

export const LANES: readonly Lane[] = [
  'commerce',
  'transactional',
  'community',
  'duty_of_care',
] as const;

/**
 * Project codes where EVERY submission is duty of care, whatever the form says.
 *
 * These are the communities and programs where a person reaching us is, by default,
 * someone we owe a duty of care to rather than a prospect: PICC and the Palm Island
 * work, Oonchiumpa, Mounty Yarns, BG Fit, June's Patch (clinical referrals), the
 * On Country Photo Studio, and Uncle Allan's art practice.
 *
 * Codes verified against act-global-infrastructure/config/project-codes.json.
 */
export const DUTY_OF_CARE_PROJECT_CODES: ReadonlySet<string> = new Set([
  'ACT-PI', // PICC
  'ACT-OO', // Oonchiumpa
  'ACT-MY', // Mounty Yarns
  'ACT-BG', // BG Fit
  'ACT-JP', // June's Patch — clinical referrals
  'ACT-PS', // PICC On Country Photo Studio
  'ACT-UA', // Uncle Allan Palm Island Art
]);

/**
 * Form types that are duty of care wherever they appear, on any project.
 *
 * A person telling us their story, asking for help, claiming a bed, or being referred
 * is not a lead. None of these ever produce a GHL record.
 */
export const DUTY_OF_CARE_FORM_TYPES: ReadonlySet<string> = new Set([
  'story', // share-your-story, act.place contact form and elsewhere
  'share-your-story',
  'lived-experience', // JusticeHub
  'lived_experience',
  'support', // Goods QR asset-support
  'asset-support',
  'claim', // Goods /claim
  'communities', // Goods /communities
  'referral', // June's Patch clinical referrals
  'meeting-finder', // SMART Connect
  'storyteller', // Empathy Ledger storyteller / Elder / knowledge-keeper
  'elder',
  'knowledge-keeper',
]);

/**
 * The explicit allowlist. A form type reaches GHL only if it is named here.
 *
 * commerce      — buyer, bulk order, sponsor, media pack, partnership, funder.
 *                 Full machinery: consent field when ticked, comms: tag, opportunity.
 * transactional — the person just took an action and expects a receipt.
 * community     — a person rather than a prospect. Contact upsert with identity tags
 *                 only, inbound conversation, marked unread. No consent write, no
 *                 comms: tag, no opportunity, no workflow, no acknowledgement.
 *
 * Anything absent from this map resolves to duty_of_care. That is the point: adding a
 * new form to a site cannot open a marketing path by accident. Someone has to come
 * here and name it.
 */
export const FORM_TYPE_LANE: ReadonlyMap<string, Lane> = new Map<string, Lane>([
  // A newsletter box is an express opt-in typed by a supporter.
  ['newsletter', 'commerce'],

  // Prospect-shaped enquiries.
  ['flagship-inquiry', 'commerce'],
  ['partnership', 'commerce'],
  ['sponsor', 'commerce'],
  ['media-pack', 'commerce'],
  ['bulk-order', 'commerce'],
  ['funder', 'commerce'],
  ['donation', 'commerce'],

  // Actions that expect a receipt.
  ['rsvp', 'transactional'],
  ['event', 'transactional'],
  ['csa', 'transactional'],
  ['farm-stay', 'transactional'],
  ['residency', 'transactional'],

  // People, not prospects.
  ['contact', 'community'],
  ['volunteer', 'community'],
  ['payout-wall-contest', 'community'],
]);

export interface LaneInput {
  projectCode: string;
  formType: string;
  /**
   * Goods QR support sets this when the submitter has flagged a safety risk. Present
   * on any form, it forces duty_of_care regardless of everything else.
   */
  safetyRisk?: boolean;
}

export interface LaneDecision {
  lane: Lane;
  /** Why this lane was chosen. Written to the outbox row so a decision is auditable. */
  reason: string;
}

/**
 * Resolve the lane for a submission. Total function: every input returns a lane, and
 * the fallback is always the most protective one.
 */
export function resolveLane(input: LaneInput): LaneDecision {
  const projectCode = (input.projectCode ?? '').trim().toUpperCase();
  const formType = (input.formType ?? '').trim().toLowerCase();

  if (input.safetyRisk === true) {
    return { lane: 'duty_of_care', reason: 'safetyRisk flag set on the submission' };
  }

  if (DUTY_OF_CARE_PROJECT_CODES.has(projectCode)) {
    return { lane: 'duty_of_care', reason: `project ${projectCode} is duty of care` };
  }

  if (DUTY_OF_CARE_FORM_TYPES.has(formType)) {
    return { lane: 'duty_of_care', reason: `form type ${formType} is duty of care` };
  }

  const allowed = FORM_TYPE_LANE.get(formType);
  if (allowed === undefined) {
    return {
      lane: 'duty_of_care',
      reason: `form type ${formType || '(empty)'} is not on the allowlist — default deny`,
    };
  }

  return { lane: allowed, reason: `form type ${formType} is allowlisted as ${allowed}` };
}

/** A duty_of_care submission never touches GHL. One place to ask. */
export function reachesGhl(lane: Lane): boolean {
  return lane !== 'duty_of_care';
}

/** Consent may be written only in these lanes, and only on an explicit ticked box. */
export function mayWriteConsent(lane: Lane): boolean {
  return lane === 'commerce' || lane === 'transactional';
}

/** An opportunity is created only for a genuine prospect. */
export function mayCreateOpportunity(lane: Lane): boolean {
  return lane === 'commerce';
}
