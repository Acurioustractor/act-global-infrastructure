#!/usr/bin/env node

/**
 * ACT Subscription Email Scanner
 *
 * Scans Gmail for subscription/receipt emails and reports which email
 * address each subscription is linked to.
 *
 * Usage:
 *   node scripts/scan-subscription-emails.mjs              # Scan all vendors
 *   node scripts/scan-subscription-emails.mjs --update     # Update subscriptions table
 *   node scripts/scan-subscription-emails.mjs --vendor webflow  # Scan specific vendor
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Vendor email patterns for receipt detection
const VENDOR_PATTERNS = {
  'Webflow': {
    fromPatterns: ['billing@webflow.com', 'receipt@webflow.com', '@webflow.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'billing'],
  },
  'Notion Labs': {
    fromPatterns: ['team-billing@makenotion.com', '@notion.so', '@makenotion.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'billing', 'subscription'],
  },
  'OpenAI': {
    fromPatterns: ['receipts@openai.com', 'billing@openai.com', '@openai.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Anthropic': {
    fromPatterns: ['billing@anthropic.com', '@anthropic.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Adobe': {
    fromPatterns: ['adobeid@adobe.com', 'adobe@email.adobe.com', '@adobe.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'subscription', 'creative cloud'],
  },
  'Descript': {
    fromPatterns: ['billing@descript.com', '@descript.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Xero': {
    fromPatterns: ['billing@xero.com', 'noreply@xero.com', '@xero.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'subscription'],
  },
  'Vercel': {
    fromPatterns: ['billing@vercel.com', '@vercel.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Supabase': {
    fromPatterns: ['billing@supabase.io', '@supabase.io', '@supabase.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'GitHub': {
    fromPatterns: ['noreply@github.com', 'billing@github.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'billing'],
  },
  'HighLevel': {
    fromPatterns: ['billing@gohighlevel.com', 'noreply@gohighlevel.com', '@gohighlevel.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Google': {
    fromPatterns: ['google-cloud-billing@google.com', 'payments-noreply@google.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment', 'billing statement'],
  },
  'Amazon Prime': {
    fromPatterns: ['digital-no-reply@amazon.com', '@amazon.com.au'],
    subjectPatterns: ['receipt', 'order', 'prime', 'payment'],
  },
  'Apple': {
    fromPatterns: ['no_reply@email.apple.com', '@apple.com'],
    subjectPatterns: ['receipt', 'invoice', 'subscription'],
  },
  'Audible': {
    fromPatterns: ['@audible.com', '@audible.com.au'],
    subjectPatterns: ['receipt', 'invoice', 'membership', 'credit'],
  },
  'Bitwarden': {
    fromPatterns: ['billing@bitwarden.com', '@bitwarden.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
  'Stripe': {
    fromPatterns: ['receipts@stripe.com', 'billing@stripe.com'],
    subjectPatterns: ['receipt', 'invoice', 'payment'],
  },
};

// Load secrets from Bitwarden
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

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

// Initialize Gmail API
async function getGmail() {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  const delegatedUser = getSecret('GOOGLE_DELEGATED_USER');

  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  if (!delegatedUser) throw new Error('GOOGLE_DELEGATED_USER not configured');

  const credentials = JSON.parse(keyJson);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: delegatedUser,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

// Initialize Supabase
function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// Extract email from "Name <email>" format
function extractEmail(value) {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : value.toLowerCase().trim();
}

// Get header value
function getHeader(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || null;
}

// Search Gmail for vendor emails
async function searchVendorEmails(gmail, vendor, patterns) {
  const results = [];

  // Build search query
  const fromQueries = patterns.fromPatterns.map(p => `from:${p}`).join(' OR ');
  const query = `(${fromQueries})`;

  try {
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    });

    if (!data.messages) return results;

    for (const msg of data.messages.slice(0, 10)) {
      const { data: fullMessage } = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = fullMessage.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const to = getHeader(headers, 'To');
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');

      results.push({
        from: extractEmail(from),
        to: extractEmail(to),
        subject,
        date,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`Error searching for ${vendor}:`, error.message);
  }

  return results;
}

// Main scan function
async function scanSubscriptionEmails(options = {}) {
  const { update = false, vendor: targetVendor = null } = options;

  console.log('\n[Subscription Email Scanner]\n');
  console.log('Scanning Gmail for subscription/receipt emails...\n');

  const gmail = await getGmail();
  const supabase = getSupabase();

  const vendorsToScan = targetVendor
    ? { [targetVendor]: VENDOR_PATTERNS[targetVendor] }
    : VENDOR_PATTERNS;

  const findings = [];

  for (const [vendor, patterns] of Object.entries(vendorsToScan)) {
    if (!patterns) {
      console.log(`Unknown vendor: ${vendor}`);
      continue;
    }

    process.stdout.write(`Scanning ${vendor}... `);
    const emails = await searchVendorEmails(gmail, vendor, patterns);

    if (emails.length === 0) {
      console.log('no emails found');
      continue;
    }

    // Find the most common recipient
    const recipients = {};
    for (const email of emails) {
      if (email.to) {
        recipients[email.to] = (recipients[email.to] || 0) + 1;
      }
    }

    const sortedRecipients = Object.entries(recipients)
      .sort((a, b) => b[1] - a[1]);

    if (sortedRecipients.length > 0) {
      const [primaryEmail, count] = sortedRecipients[0];
      console.log(`${primaryEmail} (${count} emails)`);

      findings.push({
        vendor,
        email: primaryEmail,
        count,
        allRecipients: sortedRecipients,
      });
    } else {
      console.log('no recipient detected');
    }
  }

  console.log('\n--- Summary ---\n');

  const TARGET_EMAIL = 'accounts@act.place';

  for (const finding of findings) {
    const status = finding.email === TARGET_EMAIL
      ? '✓ migrated'
      : '→ needs migration';
    console.log(`${finding.vendor.padEnd(15)} ${finding.email.padEnd(30)} ${status}`);
  }

  if (update && findings.length > 0) {
    console.log('\nUpdating subscriptions table...');

    for (const finding of findings) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          current_login_email: finding.email,
          account_status: finding.email === TARGET_EMAIL ? 'active' : 'pending_migration',
        })
        .eq('vendor_name', finding.vendor);

      if (error) {
        console.error(`  Error updating ${finding.vendor}:`, error.message);
      } else {
        console.log(`  Updated ${finding.vendor}`);
      }
    }
  }

  console.log('\n');
  return findings;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  update: args.includes('--update'),
  vendor: args.find(a => a.startsWith('--vendor='))?.split('=')[1]
    || (args.includes('--vendor') ? args[args.indexOf('--vendor') + 1] : null),
};

// Run
try {
  await scanSubscriptionEmails(options);
} catch (err) {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
}
