/**
 * Cultural Guard: Sacred Content Filter + No-Reply Filter
 *
 * Protects culturally sensitive content from automated processing.
 * Filters out no-reply/automated email addresses.
 *
 * Used by: contact-intelligence, enrich-communications, generate-insights
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SACRED CONTENT KEYWORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SACRED_KEYWORDS = [
  'sacred', 'ceremony', 'dreaming', 'songline', 'sorry business',
  'men\'s business', 'women\'s business', 'law business', 'cultural protocol',
  'elder', 'traditional owner', 'custodian', 'country', 'totem',
  'initiation', 'corroboree', 'welcome to country',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NO-REPLY / AUTOMATED EMAIL PATTERNS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NO_REPLY_PATTERNS = [
  /^no[-_.]?reply@/i,
  /^noreply@/i,
  /^do[-_.]?not[-_.]?reply@/i,
  /^mailer[-_.]?daemon@/i,
  /^postmaster@/i,
  /^bounce[s]?@/i,
  /^notifications?@/i,
  /^alert[s]?@/i,
  /^newsletter[s]?@/i,
  /^digest@/i,
  /^updates?@/i,
  /^system@/i,
  /^automated@/i,
  /^daemon@/i,
  /^admin@.*\.(google|microsoft|apple|amazon|github|vercel|supabase)/i,
];

// Domains that are always newsletter/automated senders
const AUTOMATED_DOMAINS = [
  'mailchimp.com', 'sendgrid.net', 'amazonses.com', 'mandrillapp.com',
  'mailgun.org', 'constantcontact.com', 'campaignmonitor.com',
  'sparkpostmail.com', 'postmarkapp.com', 'buttondown.email',
  'substack.com', 'beehiiv.com', 'convertkit.com', 'drip.com',
  'intercom-mail.com', 'freshdesk.com', 'zendesk.com',
  'hubspot.com', 'hubspotfree.net', 'hs-analytics.net',
  'calendly.com', 'zoom.us', 'loom.com',
  'github.com', 'gitlab.com', 'bitbucket.org',
  'linear.app', 'notion.so', 'slack.com',
  'stripe.com', 'paypal.com', 'xero.com',
  'google.com', 'googlemail.com',
];

// Own domains — emails from these are outbound, never need follow-up
const OWN_DOMAINS = [
  'act.place',
  'acurioustractor.com',
  'akindtractor.org',
];

// Calendar invite subject patterns
const CALENDAR_SUBJECT_PATTERNS = [
  /^Invitation:/i,
  /^Accepted:/i,
  /^Declined:/i,
  /^Tentative:/i,
  /^Canceled:/i,
  /^Updated invitation:/i,
  /^Event:/i,
  /^Reminder:/i,
];

// Calendar notification senders
const CALENDAR_SENDERS = [
  'calendar-notification@google.com',
  'calendar@google.com',
  'noreply@google.com',
  'outlook_@outlook.com',
  'noreply@calendly.com',
];

// Auto-reply / support ticket / form patterns
const AUTO_REPLY_SUBJECT_PATTERNS = [
  /\[Ticket\s*#/i,
  /\[Case\s*#/i,
  /\[Request\s*#/i,
  /^Auto[- ]?reply/i,
  /^Automatic reply/i,
  /^Out of office/i,
  /^OOO:/i,
  /^New form submission/i,
  /^Form entry/i,
  /^New submission/i,
  /^New Case:/i,
  /^Your request.*has been received/i,
  /^We received your/i,
  /^Thank you for (?:your |contacting)/i,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if content contains sacred/culturally sensitive material
 * @param {string} text - Text to check (subject + body preview)
 * @returns {{ isSacred: boolean, matchedKeywords: string[] }}
 */
export function checkSacredContent(text) {
  if (!text) return { isSacred: false, matchedKeywords: [] };
  const lower = text.toLowerCase();
  const matched = SACRED_KEYWORDS.filter(kw => lower.includes(kw));
  return { isSacred: matched.length > 0, matchedKeywords: matched };
}

/**
 * Check if an email address is from our own domain
 * @param {string} email - Email address to check
 * @returns {boolean}
 */
export function isOwnDomainEmail(email) {
  if (!email) return false;
  const domain = email.toLowerCase().trim().split('@')[1];
  return domain && OWN_DOMAINS.some(d => domain === d);
}

/**
 * Check if an email address is a no-reply/automated sender
 * @param {string} email - Email address to check
 * @returns {boolean}
 */
export function isNoReplyEmail(email) {
  if (!email) return true;
  const lower = email.toLowerCase().trim();

  // Check patterns
  if (NO_REPLY_PATTERNS.some(pattern => pattern.test(lower))) return true;

  // Check automated domains
  const domain = lower.split('@')[1];
  if (domain && AUTOMATED_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`))) return true;

  // Check calendar notification senders
  if (CALENDAR_SENDERS.some(s => lower === s)) return true;

  return false;
}

/**
 * Check if an email is a calendar invite/response
 * @param {object} email - { subject, from, metadata }
 * @returns {boolean}
 */
export function isCalendarInvite(email) {
  if (!email) return false;
  const subject = (email.subject || '').trim();
  const from = (email.from || email.metadata?.from || '').toLowerCase();

  if (CALENDAR_SUBJECT_PATTERNS.some(p => p.test(subject))) return true;
  if (CALENDAR_SENDERS.some(s => from.includes(s))) return true;

  return false;
}

/**
 * Check if an email is an auto-reply, support ticket, or form submission
 * @param {object} email - { subject, from, metadata }
 * @returns {boolean}
 */
export function isAutoReply(email) {
  if (!email) return false;
  const subject = (email.subject || '').trim();

  if (AUTO_REPLY_SUBJECT_PATTERNS.some(p => p.test(subject))) return true;

  return false;
}

/**
 * Check if an email looks like a newsletter/bulk email
 * @param {object} email - { subject, from, metadata }
 * @returns {boolean}
 */
export function isNewsletterEmail(email) {
  if (!email) return false;

  const from = (email.from || email.metadata?.from || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const labels = email.metadata?.labels || [];

  // Check sender
  if (isNoReplyEmail(from.includes('<') ? from.match(/<([^>]+)>/)?.[1] || from : from)) return true;

  // Check Gmail category labels
  const newsletterLabels = ['Promotions', 'Social', 'Forums', 'Updates', 'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS', 'CATEGORY_UPDATES'];
  if (labels.some(l => newsletterLabels.includes(l))) return true;

  // Check subject patterns
  const newsletterSubjectPatterns = [
    /\bunsubscribe\b/i,
    /\bnewsletter\b/i,
    /\bdigest\b/i,
    /\bweekly\s+(?:update|roundup|recap)\b/i,
    /\bmonthly\s+(?:update|roundup|recap)\b/i,
  ];
  if (newsletterSubjectPatterns.some(p => p.test(subject))) return true;

  return false;
}

/**
 * Full filter: should this email be processed for enrichment?
 * @param {object} email - { subject, content_preview, from, metadata }
 * @returns {{ shouldProcess: boolean, reason?: string }}
 */
export function shouldProcessEmail(email) {
  if (!email) return { shouldProcess: false, reason: 'no email data' };

  // Check own domain — still enrich for summaries/topics but flag as internal
  const fromAddr = email.from || email.metadata?.from || '';
  const emailAddr = fromAddr.includes('<') ? (fromAddr.match(/<([^>]+)>/)?.[1] || fromAddr) : fromAddr;
  if (isOwnDomainEmail(emailAddr)) {
    return { shouldProcess: true, reason: 'own_domain_internal', isOwnDomain: true };
  }

  // Check calendar invites
  if (isCalendarInvite(email)) {
    return { shouldProcess: false, reason: 'calendar_invite' };
  }

  // Check auto-replies / support tickets / form submissions
  if (isAutoReply(email)) {
    return { shouldProcess: false, reason: 'auto_reply' };
  }

  // Check newsletter/automated
  if (isNewsletterEmail(email)) {
    return { shouldProcess: false, reason: 'newsletter_or_automated' };
  }

  // Check sacred content — flag but still process (with care)
  const text = `${email.subject || ''} ${email.content_preview || ''}`;
  const sacred = checkSacredContent(text);
  if (sacred.isSacred) {
    return {
      shouldProcess: true,
      reason: 'sacred_content_flagged',
      sacredKeywords: sacred.matchedKeywords
    };
  }

  return { shouldProcess: true };
}

/**
 * Should this email address be auto-created as a contact?
 * @param {string} email - Email address
 * @returns {boolean}
 */
export function shouldAutoCreateContact(email) {
  return !isNoReplyEmail(email);
}

export default {
  checkSacredContent,
  isOwnDomainEmail,
  isNoReplyEmail,
  isCalendarInvite,
  isAutoReply,
  isNewsletterEmail,
  shouldProcessEmail,
  shouldAutoCreateContact,
};
