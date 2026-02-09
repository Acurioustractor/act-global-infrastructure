/**
 * Gmail to Supabase Sync
 *
 * Google Apps Script that syncs emails to ACT Supabase via sync-events edge function.
 * Runs on a time-based trigger (every 5 minutes recommended).
 *
 * Setup:
 * 1. Create new Google Apps Script project
 * 2. Copy this code
 * 3. Set script properties:
 *    - SUPABASE_FUNCTION_URL: https://tednluwflfhxyucgwigh.supabase.co/functions/v1/sync-events
 *    - SYNC_API_KEY: your API key
 *    - USER_EMAIL: ben@act.place (or nic@act.place)
 *    - CANONICAL_NAME: ben (or nic)
 * 4. Create time-based trigger for syncRecentEmails (every 5 minutes)
 *
 * @author ACT Technology
 * @version 1.0.0
 */

// Configuration
const CONFIG = {
  // How far back to look for emails (in minutes)
  LOOKBACK_MINUTES: 10,
  // Maximum emails to process per run
  MAX_EMAILS: 50,
  // Labels to exclude
  EXCLUDE_LABELS: ['spam', 'trash', 'promotions', 'social', 'forums'],
  // Domains to exclude (newsletters, etc.)
  EXCLUDE_DOMAINS: [
    'noreply@',
    'no-reply@',
    'notifications@',
    'newsletter@',
    'marketing@',
    'updates@',
    'mailer@',
    'donotreply@',
  ],
};

/**
 * Main sync function - call this from a trigger
 */
function syncRecentEmails() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_FUNCTION_URL');
  const apiKey = props.getProperty('SYNC_API_KEY');
  const userEmail = props.getProperty('USER_EMAIL');
  const canonicalName = props.getProperty('CANONICAL_NAME');

  if (!supabaseUrl || !apiKey) {
    console.error('Missing required script properties');
    return;
  }

  // Calculate lookback time
  const lookbackDate = new Date();
  lookbackDate.setMinutes(lookbackDate.getMinutes() - CONFIG.LOOKBACK_MINUTES);
  const searchQuery = `after:${formatDateForSearch(lookbackDate)}`;

  console.log(`Searching for emails: ${searchQuery}`);

  // Search for recent emails
  const threads = GmailApp.search(searchQuery, 0, CONFIG.MAX_EMAILS);
  console.log(`Found ${threads.length} threads`);

  const events = [];
  const processedIds = getProcessedIds();

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const messageId = message.getId();

      // Skip if already processed
      if (processedIds.has(messageId)) {
        continue;
      }

      // Skip if in excluded labels
      const labels = thread.getLabels().map(l => l.getName().toLowerCase());
      if (labels.some(l => CONFIG.EXCLUDE_LABELS.includes(l))) {
        continue;
      }

      // Skip newsletters and automated emails
      const from = message.getFrom().toLowerCase();
      if (CONFIG.EXCLUDE_DOMAINS.some(domain => from.includes(domain))) {
        continue;
      }

      // Determine direction
      const isOutbound = from.includes(userEmail);
      const direction = isOutbound ? 'outbound' : 'inbound';

      // Extract contact email
      let contactEmail = '';
      if (isOutbound) {
        contactEmail = extractEmail(message.getTo());
      } else {
        contactEmail = extractEmail(from);
      }

      // Skip internal emails between team
      if (contactEmail.endsWith('@act.place')) {
        continue;
      }

      // Build event
      const event = {
        type: 'email',
        direction: direction,
        subject: message.getSubject(),
        content_preview: getPlainBody(message).slice(0, 500),
        occurred_at: message.getDate().toISOString(),
        source_system: 'gmail',
        source_id: messageId,
        source_thread_id: thread.getId(),
        contact_email: contactEmail,
        from_user: isOutbound ? canonicalName : null,
        to_users: isOutbound ? [] : [canonicalName],
        waiting_for_response: direction === 'inbound' && !hasReply(thread, message),
        response_needed_by: direction === 'inbound' ? 'us' : 'them',
      };

      events.push(event);
      processedIds.add(messageId);
    }
  }

  console.log(`Prepared ${events.length} events for sync`);

  if (events.length === 0) {
    return;
  }

  // Send to Supabase
  const response = UrlFetchApp.fetch(supabaseUrl, {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
    },
    payload: JSON.stringify({
      events: events,
      source: 'gmail-apps-script',
    }),
    muteHttpExceptions: true,
  });

  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  console.log(`Sync response: ${responseCode} - ${responseBody}`);

  if (responseCode === 200) {
    // Save processed IDs
    saveProcessedIds(processedIds);
  }
}

/**
 * Format date for Gmail search
 */
function formatDateForSearch(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
}

/**
 * Extract email address from string like "Name <email@domain.com>"
 */
function extractEmail(str) {
  const match = str.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  return str.toLowerCase().trim();
}

/**
 * Get plain text body, stripping HTML
 */
function getPlainBody(message) {
  let body = message.getPlainBody();
  if (!body) {
    body = message.getBody().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }
  return body.trim();
}

/**
 * Check if thread has a reply after this message
 */
function hasReply(thread, message) {
  const messages = thread.getMessages();
  const messageDate = message.getDate().getTime();
  const userEmail = PropertiesService.getScriptProperties().getProperty('USER_EMAIL');

  for (const msg of messages) {
    if (msg.getDate().getTime() > messageDate && msg.getFrom().includes(userEmail)) {
      return true;
    }
  }
  return false;
}

/**
 * Get set of already processed message IDs
 */
function getProcessedIds() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty('PROCESSED_IDS') || '[]';
  return new Set(JSON.parse(stored));
}

/**
 * Save processed message IDs (keep last 1000)
 */
function saveProcessedIds(ids) {
  const arr = Array.from(ids).slice(-1000);
  PropertiesService.getScriptProperties().setProperty('PROCESSED_IDS', JSON.stringify(arr));
}

/**
 * Manual trigger to backfill last 30 days
 * Run this once to populate historical data
 */
function backfillLast30Days() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_FUNCTION_URL');
  const apiKey = props.getProperty('SYNC_API_KEY');
  const userEmail = props.getProperty('USER_EMAIL');
  const canonicalName = props.getProperty('CANONICAL_NAME');

  if (!supabaseUrl || !apiKey) {
    console.error('Missing required script properties');
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const searchQuery = `after:${formatDateForSearch(thirtyDaysAgo)}`;

  console.log(`Backfill searching: ${searchQuery}`);

  // Get all threads in batches
  let start = 0;
  const batchSize = 100;
  let totalProcessed = 0;

  while (true) {
    const threads = GmailApp.search(searchQuery, start, batchSize);
    if (threads.length === 0) break;

    console.log(`Processing batch starting at ${start}`);

    const events = [];

    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const message of messages) {
        const labels = thread.getLabels().map(l => l.getName().toLowerCase());
        if (labels.some(l => CONFIG.EXCLUDE_LABELS.includes(l))) continue;

        const from = message.getFrom().toLowerCase();
        if (CONFIG.EXCLUDE_DOMAINS.some(domain => from.includes(domain))) continue;

        const isOutbound = from.includes(userEmail);
        const direction = isOutbound ? 'outbound' : 'inbound';

        let contactEmail = isOutbound ? extractEmail(message.getTo()) : extractEmail(from);
        if (contactEmail.endsWith('@act.place')) continue;

        events.push({
          type: 'email',
          direction: direction,
          subject: message.getSubject(),
          content_preview: getPlainBody(message).slice(0, 500),
          occurred_at: message.getDate().toISOString(),
          source_system: 'gmail',
          source_id: message.getId(),
          source_thread_id: thread.getId(),
          contact_email: contactEmail,
          from_user: isOutbound ? canonicalName : null,
          to_users: isOutbound ? [] : [canonicalName],
        });
      }
    }

    if (events.length > 0) {
      // Send batch
      const response = UrlFetchApp.fetch(supabaseUrl, {
        method: 'POST',
        contentType: 'application/json',
        headers: { 'x-api-key': apiKey },
        payload: JSON.stringify({ events: events, source: 'gmail-backfill' }),
        muteHttpExceptions: true,
      });

      console.log(`Batch ${start}: ${response.getResponseCode()} - ${events.length} events`);
      totalProcessed += events.length;
    }

    start += batchSize;

    // Rate limiting
    Utilities.sleep(1000);
  }

  console.log(`Backfill complete: ${totalProcessed} total events`);
}

/**
 * Test function - verify configuration
 */
function testConfiguration() {
  const props = PropertiesService.getScriptProperties();

  console.log('Configuration:');
  console.log('- SUPABASE_FUNCTION_URL:', props.getProperty('SUPABASE_FUNCTION_URL') ? 'SET' : 'MISSING');
  console.log('- SYNC_API_KEY:', props.getProperty('SYNC_API_KEY') ? 'SET' : 'MISSING');
  console.log('- USER_EMAIL:', props.getProperty('USER_EMAIL'));
  console.log('- CANONICAL_NAME:', props.getProperty('CANONICAL_NAME'));

  // Test connection
  const url = props.getProperty('SUPABASE_FUNCTION_URL');
  const key = props.getProperty('SYNC_API_KEY');

  if (url && key) {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'x-api-key': key },
      payload: JSON.stringify({ events: [], source: 'gmail-test' }),
      muteHttpExceptions: true,
    });

    console.log('Test request:', response.getResponseCode(), response.getContentText());
  }
}
