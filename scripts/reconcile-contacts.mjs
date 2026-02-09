#!/usr/bin/env node
/**
 * Contact Reconciliation Script
 *
 * Ensures every email communication is linked to a GHL contact.
 * Three passes:
 *
 * 1. BACKFILL: Link comms where metadata.from matches an existing GHL contact
 * 2. REFETCH: Re-fetch From headers from Gmail for old comms with empty metadata
 * 3. CREATE: Create new GHL contacts for real people not yet in the CRM
 *
 * USAGE:
 *   node scripts/reconcile-contacts.mjs [options]
 *
 * OPTIONS:
 *   --dry-run         Preview changes without writing
 *   --skip-refetch    Skip Gmail API re-fetch of old emails
 *   --create-contacts Actually create new contacts (default: report only)
 *   --verbose         Show detailed output
 *   --limit N         Limit refetch to N old emails (default: 500)
 *
 * ENVIRONMENT:
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY (for refetch)
 *   GHL_API_KEY / GHL_LOCATION_ID (for contact creation)
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { execSync } from 'child_process';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { isNoReplyEmail, isOwnDomainEmail, shouldProcessEmail } from './lib/cultural-guard.mjs';
import { matchOrCreateContact } from './lib/contact-intelligence.mjs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractEmailFromHeader(fromHeader) {
  if (!fromHeader) return null;
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase().trim() : fromHeader.toLowerCase().trim();
}

function extractNameFromHeader(fromHeader) {
  if (!fromHeader) return null;
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

/**
 * Extra automated/commercial sender patterns that cultural-guard doesn't catch.
 * These are businesses, SaaS, airlines, retailers — not real contact-worthy people.
 */
const EXTRA_AUTOMATED_PATTERNS = [
  // Generic prefixes (transactional/marketing senders)
  /^(support|billing|invoice|confirm|order|shipment|tracking|auto-confirm|marketplace|welcome|marketing|travel|insider|comms|messenger|messaging-service|team|reaction|rollup|hiiv-team|red-email|businessflyer|hello|help|grant|theuppload|receipts|statements|notifications|alerts|updates|news|digest|noreply|mailer|postmaster|bounce|daemon|trial|flightupdate|flightinfo|events|surveys|boxoffice|saas|startups|one|email|feedback|accounts|donotreply|no\.reply|service|security|verify|verification|store|shop|deals|offers|promo|best-message|best-wishes)@/i,
  // Plus-addressed (e.g. invoice+statements@bitwarden.com, feedback+customerio@warp.dev)
  /^[a-z]+\+[a-z]/i,
  // Commercial domains — match anywhere in domain (catches subdomains like @yourbooking.qantas.com.au)
  /@.*\b(qantas|amazon|pinterest|canva|miro|openai|samsung|stan|webuy|uber|stripe|gohighlevel|sevenrooms|dialpad|myob|loyalty|hooroo|voyages|twilio|zinus|uppbeat|moonshot|brevosend|manus|bitwarden|aliexpress|alibaba|alibabacloud|leadconnectorhq|descript|octolane|inguest|flicket|trackmysubs|officeworks|dropbox|medium|substack|skool|primevideo|warp|carriageworks|staminagroup|tella|velocityfrequentflyer|subcard|napkin|vimeo|figma|genspark|merivale|smarttraveller|tally|gracious)\b/i,
  // Marketing/transactional subdomains
  /@(e\.|email\.|mc\.|cx\.|mail\.|mg\.|mg1\.|info\.|engage\.|product\.|messaging\.|post\.|review\.|team\.|marketing\.|comms\.|noreplies\.|newarrival\.|selections\.|newsletter[-.])/i,
  // Generic info/hello/contact for businesses (not personal)
  /^(info|hello|contact|enquiries|admin|service|community)@.*\.(com\.au|org\.au|net\.au|com|io|co|org)$/i,
  // Numeric subdomains (e.g. @7728250.brevosend.com)
  /@.*\d{4,}.*\.(com|io)/i,
  // Known newsletter/SaaS sender platforms
  /@.*\.(substack\.com|beehiiv\.com|mailchimp\.com|convertkit\.com|hubspot\.com|intercom\.io|customerio\.com|sendgrid\.net|constantcontact\.com|mn\.co)$/i,
];

function isAutomatedSender(email) {
  if (!email) return true;
  return EXTRA_AUTOMATED_PATTERNS.some(p => p.test(email));
}

// Load secrets from Bitwarden (same pattern as sync-gmail-to-supabase.mjs)
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(key) {
  const secrets = loadSecrets();
  return secrets[key] || process.env[key] || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASS 1: BACKFILL — Link comms to existing contacts by email
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function backfillExistingMatches(supabase, contactMap, options) {
  console.log('━━ Pass 1: Backfill existing contact matches ━━');

  // Fetch unlinked comms that have metadata.from
  const { data: unlinked, error } = await supabase
    .from('communications_history')
    .select('id, source_id, metadata, direction')
    .eq('channel', 'email')
    .is('ghl_contact_id', null)
    .neq('metadata', '{}')
    .not('metadata', 'is', null);

  if (error) {
    console.error('  Failed to query unlinked comms:', error.message);
    return { linked: 0, checked: 0 };
  }

  let linked = 0;
  let checked = 0;

  for (const comm of (unlinked || [])) {
    const fromHeader = comm.metadata?.from;
    const toHeader = comm.metadata?.to;
    const ccHeader = comm.metadata?.cc;

    // For inbound: match sender. For outbound: match recipient.
    let emailsToMatch = [];
    if (comm.direction === 'outbound') {
      if (toHeader) emailsToMatch.push(...toHeader.split(',').map(e => extractEmailFromHeader(e.trim())));
      if (ccHeader) emailsToMatch.push(...ccHeader.split(',').map(e => extractEmailFromHeader(e.trim())));
    } else {
      if (fromHeader) emailsToMatch.push(extractEmailFromHeader(fromHeader));
    }

    // Filter own domain
    emailsToMatch = emailsToMatch.filter(e => e && !isOwnDomainEmail(e));

    for (const email of emailsToMatch) {
      const contact = contactMap.get(email);
      if (contact) {
        if (!options.dryRun) {
          await supabase
            .from('communications_history')
            .update({ ghl_contact_id: contact.ghl_contact_id })
            .eq('id', comm.id);
        }
        linked++;
        break;
      }
    }
    checked++;
  }

  console.log(`  Checked: ${checked}`);
  console.log(`  Linked: ${linked}${options.dryRun ? ' (dry run)' : ''}`);
  console.log();

  return { linked, checked };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASS 2: REFETCH — Re-fetch From headers for old emails with empty metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function refetchOldEmails(supabase, contactMap, options) {
  console.log('━━ Pass 2: Re-fetch From headers for old emails ━━');

  // Fetch old emails with empty metadata (paginate to avoid 1000-row Supabase limit)
  const oldEmails = [];
  const pageSize = 1000;
  let offset = 0;
  while (oldEmails.length < options.refetchLimit) {
    const batchLimit = Math.min(pageSize, options.refetchLimit - oldEmails.length);
    const { data: batch, error } = await supabase
      .from('communications_history')
      .select('id, source_id, subject, direction')
      .eq('channel', 'email')
      .eq('source_system', 'gmail')
      .is('ghl_contact_id', null)
      .eq('metadata', '{}')
      .order('occurred_at', { ascending: false })
      .range(offset, offset + batchLimit - 1);

    if (error) {
      console.error('  Failed to query old emails:', error.message);
      return { refetched: 0, linked: 0 };
    }
    if (!batch || batch.length === 0) break;
    oldEmails.push(...batch);
    offset += batch.length;
    if (batch.length < batchLimit) break; // No more rows
  }

  console.log(`  Found ${oldEmails.length} old emails with empty metadata`);

  if (!oldEmails || oldEmails.length === 0) return { refetched: 0, linked: 0 };

  // Set up Gmail API (same pattern as sync-gmail-to-supabase.mjs)
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  const delegatedUsers = (getSecret('GOOGLE_DELEGATED_USERS') || 'benjamin@act.place').split(',').map(u => u.trim());

  if (!keyJson) {
    console.log('  Gmail API not configured (no GOOGLE_SERVICE_ACCOUNT_KEY) — skipping refetch');
    return { refetched: 0, linked: 0 };
  }

  let credentials;
  try {
    credentials = JSON.parse(keyJson);
  } catch (e) {
    console.log('  Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON — skipping refetch');
    return { refetched: 0, linked: 0 };
  }

  let refetched = 0;
  let linked = 0;

  // Use first delegated user for API access
  const delegatedUser = delegatedUsers[0];
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: delegatedUser,
  });

  await auth.authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  for (const email of oldEmails) {
    try {
      const { data: fullMessage } = await gmail.users.messages.get({
        userId: 'me',
        id: email.source_id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Cc'],
      });

      const headers = fullMessage.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === 'From')?.value;
      const toHeader = headers.find(h => h.name === 'To')?.value;
      const ccHeader = headers.find(h => h.name === 'Cc')?.value;

      if (!fromHeader) continue;

      // Update metadata
      const metadata = { from: fromHeader, to: toHeader, cc: ccHeader };

      // Try to match contact
      let emailsToMatch = [];
      if (email.direction === 'outbound') {
        if (toHeader) emailsToMatch.push(...toHeader.split(',').map(e => extractEmailFromHeader(e.trim())));
        if (ccHeader) emailsToMatch.push(...ccHeader.split(',').map(e => extractEmailFromHeader(e.trim())));
      } else {
        emailsToMatch.push(extractEmailFromHeader(fromHeader));
      }
      emailsToMatch = emailsToMatch.filter(e => e && !isOwnDomainEmail(e));

      let matchedContactId = null;
      for (const addr of emailsToMatch) {
        const contact = contactMap.get(addr);
        if (contact) {
          matchedContactId = contact.ghl_contact_id;
          break;
        }
      }

      if (!options.dryRun) {
        await supabase
          .from('communications_history')
          .update({
            metadata,
            ...(matchedContactId && { ghl_contact_id: matchedContactId }),
          })
          .eq('id', email.id);
      }

      refetched++;
      if (matchedContactId) linked++;

      if (options.verbose) {
        const addr = extractEmailFromHeader(fromHeader);
        console.log(`  ${email.subject?.substring(0, 50)} — ${addr} ${matchedContactId ? '✓ matched' : ''}`);
      }

      // Rate limit Gmail API
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (err) {
      if (err.code === 404) {
        // Message no longer exists in Gmail
        continue;
      }
      console.error(`  Error refetching ${email.source_id}: ${err.message}`);
    }
  }

  console.log(`  Refetched: ${refetched}`);
  console.log(`  Linked to contacts: ${linked}`);
  console.log();

  return { refetched, linked };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASS 3: IDENTIFY — Find real people who should be GHL contacts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function identifyNewContacts(supabase, contactMap, options) {
  console.log('━━ Pass 3: Identify new contacts ━━');

  // Get all unlinked email comms that have metadata.from
  const { data: unlinked, error } = await supabase
    .from('communications_history')
    .select('id, source_id, subject, metadata, direction, occurred_at')
    .eq('channel', 'email')
    .is('ghl_contact_id', null)
    .neq('metadata', '{}')
    .not('metadata', 'is', null)
    .eq('direction', 'inbound')
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('  Failed to query unlinked comms:', error.message);
    return { realPeople: [], newsletters: 0, created: 0 };
  }

  // Collect unique external sender emails
  const senderMap = new Map(); // email -> { name, subject, count, latestDate }

  for (const comm of (unlinked || [])) {
    const fromHeader = comm.metadata?.from;
    if (!fromHeader) continue;

    const email = extractEmailFromHeader(fromHeader);
    if (!email || isOwnDomainEmail(email)) continue;
    if (contactMap.has(email)) continue; // Already a contact

    if (!senderMap.has(email)) {
      senderMap.set(email, {
        email,
        name: extractNameFromHeader(fromHeader),
        fromHeader,
        subject: comm.subject,
        count: 0,
        latestDate: comm.occurred_at,
      });
    }
    senderMap.get(email).count++;
  }

  // Categorize: real person vs newsletter/automated
  const realPeople = [];
  let newsletters = 0;

  for (const [email, info] of senderMap) {
    if (isNoReplyEmail(email)) {
      newsletters++;
      continue;
    }

    // Extra automated sender check (airlines, retailers, SaaS etc.)
    if (isAutomatedSender(email)) {
      newsletters++;
      continue;
    }

    // Use cultural guard for deeper check
    const check = shouldProcessEmail({
      subject: info.subject,
      from: info.fromHeader,
    });
    if (!check.shouldProcess) {
      newsletters++;
      continue;
    }

    realPeople.push(info);
  }

  console.log(`  Unique unmatched senders: ${senderMap.size}`);
  console.log(`  Newsletters/automated: ${newsletters}`);
  console.log(`  Real people: ${realPeople.length}`);

  // Sort by email count (most active first)
  realPeople.sort((a, b) => b.count - a.count);

  // Report
  if (realPeople.length > 0) {
    console.log();
    console.log('  People to add to GHL:');
    for (const person of realPeople.slice(0, 30)) {
      console.log(`    ${person.name || person.email} <${person.email}> (${person.count} emails)`);
    }
    if (realPeople.length > 30) {
      console.log(`    ... and ${realPeople.length - 30} more`);
    }
  }

  // Create contacts if flag is set
  let created = 0;
  if (options.createContacts && !options.dryRun) {
    console.log();
    console.log('  Creating contacts...');

    for (const person of realPeople) {
      const result = await matchOrCreateContact(supabase, person.email, {
        subject: person.subject,
        from: person.fromHeader,
        direction: 'inbound',
      });

      if (result.wasCreated) {
        created++;
        if (options.verbose) {
          console.log(`    Created: ${person.name || person.email}`);
        }
      }

      // After creating, backfill ghl_contact_id on their comms
      if (result.contactId) {
        await supabase
          .from('communications_history')
          .update({ ghl_contact_id: result.contactId })
          .eq('channel', 'email')
          .is('ghl_contact_id', null)
          .contains('metadata', { from: person.fromHeader });
      }
    }

    console.log(`  Created: ${created} new contacts`);
  }

  console.log();
  return { realPeople, newsletters, created };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Contact Reconciliation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    skipRefetch: args.includes('--skip-refetch'),
    createContacts: args.includes('--create-contacts'),
    verbose: args.includes('--verbose'),
    refetchLimit: (() => {
      const idx = args.indexOf('--limit');
      return idx >= 0 ? parseInt(args[idx + 1]) : 500;
    })(),
  };

  if (options.dryRun) console.log('  Mode: DRY RUN');
  if (options.skipRefetch) console.log('  Skipping Gmail refetch');
  if (options.createContacts) console.log('  Will create new contacts');
  console.log(`  Refetch limit: ${options.refetchLimit}`);
  console.log();

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Load contact map
  console.log('Loading GHL contacts...');
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, email, full_name')
    .not('email', 'is', null);

  const contactMap = new Map();
  for (const c of (contacts || [])) {
    if (c.email) {
      contactMap.set(c.email.toLowerCase(), {
        ghl_contact_id: c.ghl_id,
        full_name: c.full_name,
      });
    }
  }
  console.log(`  ${contactMap.size} contacts loaded`);
  console.log();

  // Pass 1: Backfill
  const pass1 = await backfillExistingMatches(supabase, contactMap, options);

  // Pass 2: Refetch old emails
  let pass2 = { refetched: 0, linked: 0 };
  if (!options.skipRefetch) {
    pass2 = await refetchOldEmails(supabase, contactMap, options);
  }

  // Pass 3: Identify new contacts
  const pass3 = await identifyNewContacts(supabase, contactMap, options);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Pass 1 (backfill): ${pass1.linked} comms linked to existing contacts`);
  console.log(`  Pass 2 (refetch):  ${pass2.refetched} emails re-fetched, ${pass2.linked} linked`);
  console.log(`  Pass 3 (identify): ${pass3.realPeople.length} real people found, ${pass3.created} created`);
  console.log(`  Newsletters filtered: ${pass3.newsletters}`);
  console.log();

  if (!options.createContacts && pass3.realPeople.length > 0) {
    console.log('  Tip: Run with --create-contacts to add these people to GHL');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
