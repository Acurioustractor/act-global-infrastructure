/**
 * Gmail to GHL Contact Creator - Google Apps Script
 * VERSION 2: Uses GHL Inbound Webhook (recommended approach)
 *
 * Automatically sends new inbound email data to GHL Inbound Webhook,
 * which triggers a workflow to find/create contacts.
 *
 * SETUP INSTRUCTIONS:
 *
 * STEP 1: Create GHL Workflow
 * ---------------------------
 * 1. Go to GHL > Automation > Workflows
 * 2. Create new workflow: "Gmail Email to Contact"
 * 3. Add Trigger: "Inbound Webhook"
 * 4. Copy the webhook URL (looks like: https://services.leadconnectorhq.com/hooks/...)
 * 5. Add Action: "Find Contact" - search by email field
 * 6. Add Branch: If contact NOT found
 *    - Add Action: "Create Contact" with mapped fields
 * 7. Save & Publish
 *
 * STEP 2: Configure This Script
 * -----------------------------
 * 1. Go to https://script.google.com while logged into outact.place Gmail
 * 2. Create new project: "Gmail to GHL Sync"
 * 3. Paste this entire script
 * 4. Update GHL_INBOUND_WEBHOOK_URL below with your webhook URL
 * 5. Run > Run function > testWebhook (grant permissions)
 * 6. Triggers > Add Trigger:
 *    - Function: processNewEmails
 *    - Event: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 5 minutes
 * 7. Save and enable
 *
 * The flow:
 * Gmail → Apps Script → GHL Webhook → GHL Workflow (Find/Create) → Your Supabase Sync
 */

// ============ CONFIGURATION ============
// GHL Inbound Webhook URL from "Gmail Email to Contact" workflow
const GHL_INBOUND_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

// Emails to ignore (your own addresses, newsletters, etc.)
const IGNORE_PATTERNS = [
  'outact.place',
  'noreply',
  'no-reply',
  'notifications',
  'mailer-daemon',
  'postmaster',
  'newsletter',
  'unsubscribe',
  'donotreply'
];

// Tags to suggest for new contacts (GHL workflow will apply these)
const DEFAULT_TAGS = ['Email Lead', 'Gmail Import'];
// ========================================

/**
 * Main function - runs on timer trigger
 */
function processNewEmails() {
  // Validate webhook URL is configured
  if (!GHL_INBOUND_WEBHOOK_URL || GHL_INBOUND_WEBHOOK_URL === 'YOUR_GHL_INBOUND_WEBHOOK_URL_HERE') {
    Logger.log('ERROR: GHL_INBOUND_WEBHOOK_URL is not configured!');
    Logger.log('Please update the script with your GHL Inbound Webhook URL');
    return;
  }

  const scriptProperties = PropertiesService.getScriptProperties();
  const lastProcessedTime = scriptProperties.getProperty('lastProcessedTime');

  // Search for unread emails newer than last check
  let searchQuery = 'is:unread in:inbox';
  if (lastProcessedTime) {
    const date = new Date(parseInt(lastProcessedTime));
    const dateStr = Utilities.formatDate(date, 'GMT', 'yyyy/MM/dd');
    searchQuery += ` after:${dateStr}`;
  }

  const threads = GmailApp.search(searchQuery, 0, 50);
  Logger.log(`Found ${threads.length} threads to process`);

  let processedCount = 0;
  let sentToGhlCount = 0;
  const processedEmails = new Set(); // Avoid duplicates

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (!message.isUnread()) continue;

      const from = message.getFrom();
      const email = extractEmail(from);

      // Skip if already processed this email address in this run
      if (processedEmails.has(email)) continue;

      // Skip if email should be ignored
      if (shouldIgnoreEmail(email)) {
        Logger.log(`Skipping ignored email: ${email}`);
        continue;
      }

      const name = extractName(from);
      const subject = message.getSubject();
      const date = message.getDate();

      // Send to GHL Inbound Webhook
      const payload = {
        // Contact fields - GHL workflow will map these
        email: email,
        firstName: name.firstName,
        lastName: name.lastName,
        source: 'Gmail Import',
        tags: DEFAULT_TAGS,

        // Additional context for the workflow
        emailSubject: subject,
        emailDate: date.toISOString(),
        threadId: thread.getId(),

        // Metadata
        importedAt: new Date().toISOString(),
        importSource: 'gmail-apps-script'
      };

      const success = sendToGhlWebhook(payload);

      if (success) {
        Logger.log(`Sent to GHL: ${email} (${name.firstName} ${name.lastName})`);
        sentToGhlCount++;
        processedEmails.add(email);
      }

      processedCount++;
    }
  }

  // Update last processed time
  scriptProperties.setProperty('lastProcessedTime', Date.now().toString());

  Logger.log(`Processed ${processedCount} emails, sent ${sentToGhlCount} to GHL`);
}

/**
 * Send data to GHL Inbound Webhook
 */
function sendToGhlWebhook(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(GHL_INBOUND_WEBHOOK_URL, options);
    const statusCode = response.getResponseCode();

    if (statusCode >= 200 && statusCode < 300) {
      return true;
    } else {
      Logger.log(`GHL webhook error: ${statusCode} - ${response.getContentText()}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Error sending to GHL: ${e.message}`);
    return false;
  }
}

/**
 * Extract email address from "Name <email>" format
 */
function extractEmail(from) {
  const match = from.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  return from.toLowerCase().trim();
}

/**
 * Extract name from "Name <email>" format
 */
function extractName(from) {
  let fullName = from.replace(/<[^>]+>/, '').trim();
  fullName = fullName.replace(/^["']|["']$/g, '');

  if (!fullName || fullName.includes('@')) {
    // No name - extract from email
    const email = extractEmail(from);
    const localPart = email.split('@')[0];
    const parts = localPart.split(/[._-]/);
    return {
      firstName: capitalize(parts[0] || ''),
      lastName: capitalize(parts.slice(1).join(' ') || '')
    };
  }

  const parts = fullName.split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Check if email should be ignored
 */
function shouldIgnoreEmail(email) {
  const lowerEmail = email.toLowerCase();
  return IGNORE_PATTERNS.some(pattern => lowerEmail.includes(pattern.toLowerCase()));
}

/**
 * Test function - sends a test payload to verify webhook connection
 */
function testWebhook() {
  Logger.log('=== Testing GHL Inbound Webhook Connection ===');

  if (!GHL_INBOUND_WEBHOOK_URL || GHL_INBOUND_WEBHOOK_URL === 'YOUR_GHL_INBOUND_WEBHOOK_URL_HERE') {
    Logger.log('ERROR: GHL_INBOUND_WEBHOOK_URL is not configured!');
    Logger.log('Please update the script with your GHL Inbound Webhook URL');
    return;
  }

  const testPayload = {
    email: 'test-' + Date.now() + '@example.com',
    firstName: 'Test',
    lastName: 'Contact',
    source: 'Gmail Import - Test',
    tags: ['Test', 'Gmail Import'],
    emailSubject: 'Test email from Apps Script',
    emailDate: new Date().toISOString(),
    importedAt: new Date().toISOString(),
    importSource: 'gmail-apps-script-test'
  };

  Logger.log('Sending test payload: ' + JSON.stringify(testPayload));

  const success = sendToGhlWebhook(testPayload);

  if (success) {
    Logger.log('SUCCESS! Webhook received the test data.');
    Logger.log('Check GHL to verify the workflow triggered and contact was created.');
  } else {
    Logger.log('FAILED! Check the webhook URL and try again.');
  }
}

/**
 * Reset last processed time (to reprocess all recent emails)
 */
function resetLastProcessedTime() {
  PropertiesService.getScriptProperties().deleteProperty('lastProcessedTime');
  Logger.log('Last processed time reset. Next run will process recent emails.');
}

/**
 * View current configuration
 */
function viewConfig() {
  Logger.log('=== Current Configuration ===');
  Logger.log('Webhook URL: ' + (GHL_INBOUND_WEBHOOK_URL === 'YOUR_GHL_INBOUND_WEBHOOK_URL_HERE' ? 'NOT CONFIGURED' : 'Configured'));
  Logger.log('Ignore patterns: ' + IGNORE_PATTERNS.join(', '));
  Logger.log('Default tags: ' + DEFAULT_TAGS.join(', '));

  const lastProcessed = PropertiesService.getScriptProperties().getProperty('lastProcessedTime');
  if (lastProcessed) {
    Logger.log('Last processed: ' + new Date(parseInt(lastProcessed)).toISOString());
  } else {
    Logger.log('Last processed: Never');
  }
}
