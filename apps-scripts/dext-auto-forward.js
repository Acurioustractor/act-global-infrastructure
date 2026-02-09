/**
 * Dext Auto-Forward Script for accounts@act.place
 *
 * This script runs every 15 minutes and forwards subscription receipts to Dext.
 * No Gmail verification required - uses GmailApp directly.
 *
 * SETUP:
 * 1. Go to https://script.google.com (logged in as accounts@act.place)
 * 2. Create new project: "Dext Auto-Forward"
 * 3. Paste this entire script
 * 4. Click Run → forwardReceiptsToDext (authorize when prompted)
 * 5. Click Triggers (clock icon) → Add Trigger:
 *    - Function: forwardReceiptsToDext
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 15 minutes
 * 6. Save
 */

// Your Dext email-in address
const DEXT_EMAIL = 'nicmarchesi@dext.cc';

// Label to mark processed emails (will be created automatically)
const PROCESSED_LABEL = 'Dext/Forwarded';

// Vendor billing emails (these ONLY send receipts/invoices)
const BILLING_ONLY_VENDORS = [
  'from:billing@webflow.com',
  'from:receipt@webflow.com',
  'from:team-billing@makenotion.com',
  'from:receipts@openai.com',
  'from:billing@anthropic.com',
  'from:billing@gohighlevel.com',
  'from:billing@xero.com',
  'from:billing@descript.com',
  'from:billing@vercel.com',
  'from:billing@supabase.io',
  'from:billing@bitwarden.com',
  'from:receipts@stripe.com',
  'from:billing@zapier.com',
  'from:billing@cursor.sh',
  'from:billing@railway.app',
  'from:google-cloud-billing@google.com',
];

// Vendors that send mixed emails - require receipt/invoice in subject
const MIXED_VENDORS = [
  'from:adobeid@adobe.com',
  'from:adobe@email.adobe.com',
  'from:message@adobe.com',
  'from:noreply@gohighlevel.com',
  'from:noreply@xero.com',
  'from:noreply@github.com',
  'from:noreply@dialpad.com',
  'from:no_reply@email.apple.com',
  'from:digital-no-reply@amazon.com',
  'from:auto-confirm@amazon.com',
  'from:audible@amazon.com',
  'from:payments-noreply@google.com',
  'from:@sideguide.co',
  'from:@firecrawl.dev',
];

// Build the search query
function buildSearchQuery() {
  // Billing-only vendors: forward everything
  const billingQuery = '(' + BILLING_ONLY_VENDORS.join(' OR ') + ')';

  // Mixed vendors: only forward if subject contains receipt/invoice/payment keywords
  const mixedQuery = '(' + MIXED_VENDORS.join(' OR ') + ') AND (subject:receipt OR subject:invoice OR subject:payment OR subject:order OR subject:subscription)';

  return '(' + billingQuery + ' OR ' + mixedQuery + ')';
}

// For backwards compatibility
const VENDOR_PATTERNS = [...BILLING_ONLY_VENDORS, ...MIXED_VENDORS];

/**
 * Main function - forwards matching emails to Dext
 */
function forwardReceiptsToDext() {
  // Get or create the processed label
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) {
    label = GmailApp.createLabel(PROCESSED_LABEL);
  }

  // Build search query: match vendors AND not already processed
  const vendorQuery = buildSearchQuery();
  const searchQuery = vendorQuery + ' -label:' + PROCESSED_LABEL.replace('/', '-');

  // Find matching threads (limit to 50 to avoid timeout)
  const threads = GmailApp.search(searchQuery, 0, 50);

  let forwardedCount = 0;

  threads.forEach(thread => {
    const messages = thread.getMessages();

    messages.forEach(message => {
      // Skip if already read and old (likely already processed before label existed)
      const messageDate = message.getDate();
      const dayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (!message.isUnread() && messageDate < dayOld) {
        return;
      }

      try {
        // Forward the message to Dext
        message.forward(DEXT_EMAIL);
        forwardedCount++;

        // Log for debugging
        Logger.log('Forwarded: ' + message.getSubject());
      } catch (e) {
        Logger.log('Error forwarding: ' + message.getSubject() + ' - ' + e.message);
      }
    });

    // Apply label to mark as processed
    thread.addLabel(label);

    // Archive the thread (optional - remove if you want to keep in inbox)
    thread.moveToArchive();
  });

  Logger.log('Total forwarded: ' + forwardedCount);
  return forwardedCount;
}

/**
 * Test function - shows what would be forwarded without actually forwarding
 */
function testSearch() {
  const vendorQuery = buildSearchQuery();
  const searchQuery = vendorQuery + ' -label:' + PROCESSED_LABEL.replace('/', '-');

  Logger.log('Search query: ' + searchQuery);

  const threads = GmailApp.search(searchQuery, 0, 20);

  Logger.log('Found ' + threads.length + ' threads');

  threads.forEach(thread => {
    const firstMessage = thread.getMessages()[0];
    Logger.log('- ' + firstMessage.getSubject() + ' (' + firstMessage.getDate() + ')');
  });
}

/**
 * Manual trigger - run once to process existing emails
 */
function processExistingEmails() {
  const count = forwardReceiptsToDext();
  Logger.log('Processed ' + count + ' emails');
}
