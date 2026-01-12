/**
 * Google Calendar to GHL Contact Creator - Google Apps Script
 *
 * Automatically sends meeting attendee data to GHL Inbound Webhook,
 * which triggers a workflow to find/create contacts.
 *
 * SETUP INSTRUCTIONS:
 *
 * STEP 1: Use the SAME GHL Workflow
 * ---------------------------------
 * The "Gmail Email to Contact" workflow already has an Inbound Webhook trigger.
 * This script will use the SAME webhook URL - GHL will create contacts the same way.
 *
 * STEP 2: Configure This Script
 * -----------------------------
 * 1. Go to https://script.google.com while logged into outact.place Gmail
 * 2. Create new project: "Calendar to GHL Sync"
 * 3. Paste this entire script
 * 4. The webhook URL is already configured (same as Gmail script)
 * 5. Run > Run function > testWebhook (grant Calendar permissions)
 * 6. Triggers > Add Trigger:
 *    - Function: processCalendarEvents
 *    - Event: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 15 minutes
 * 7. Save and enable
 *
 * The flow:
 * Calendar Event → Apps Script → GHL Webhook → GHL Workflow → Contact Created → Supabase Sync
 */

// ============ CONFIGURATION ============
// Same GHL Inbound Webhook URL as Gmail script (reuse the workflow)
const GHL_INBOUND_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

// Calendar ID to monitor (default is primary calendar)
const CALENDAR_ID = 'primary';

// How far back to check for events (in hours)
const LOOKBACK_HOURS = 24;

// How far ahead to check for upcoming events (in days)
const LOOKAHEAD_DAYS = 7;

// Emails to ignore (your own addresses, internal team, etc.)
const IGNORE_PATTERNS = [
  'outact.place',
  'acurioustractor',
  'noreply',
  'no-reply',
  'calendar-notification',
  'google.com',
  'resource.calendar.google.com'
];

// Tags to apply to calendar contacts
const DEFAULT_TAGS = ['Meeting Contact', 'Calendar Import'];
// ========================================

/**
 * Main function - runs on timer trigger
 */
function processCalendarEvents() {
  // Validate webhook URL
  if (!GHL_INBOUND_WEBHOOK_URL || GHL_INBOUND_WEBHOOK_URL === 'YOUR_GHL_INBOUND_WEBHOOK_URL_HERE') {
    Logger.log('ERROR: GHL_INBOUND_WEBHOOK_URL is not configured!');
    return;
  }

  const scriptProperties = PropertiesService.getScriptProperties();
  const processedAttendees = new Set(
    JSON.parse(scriptProperties.getProperty('processedAttendees') || '[]')
  );

  const now = new Date();
  const startTime = new Date(now.getTime() - (LOOKBACK_HOURS * 60 * 60 * 1000));
  const endTime = new Date(now.getTime() + (LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000));

  Logger.log(`Checking calendar events from ${startTime.toISOString()} to ${endTime.toISOString()}`);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startTime, endTime);

  Logger.log(`Found ${events.length} events to process`);

  let sentToGhlCount = 0;
  const newProcessedAttendees = [];

  for (const event of events) {
    const eventTitle = event.getTitle();
    const eventDate = event.getStartTime();
    const guests = event.getGuestList(true); // Include organizer

    for (const guest of guests) {
      const email = guest.getEmail().toLowerCase();
      const name = guest.getName();

      // Skip if already processed this email
      if (processedAttendees.has(email)) continue;

      // Skip if email should be ignored
      if (shouldIgnoreEmail(email)) {
        Logger.log(`Skipping ignored email: ${email}`);
        continue;
      }

      // Parse name into first/last
      const parsedName = parseName(name, email);

      // Send to GHL Inbound Webhook
      const payload = {
        // Contact fields - same format as Gmail script
        email: email,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        source: 'Calendar Import',
        tags: DEFAULT_TAGS,

        // Meeting context
        meetingTitle: eventTitle,
        meetingDate: eventDate.toISOString(),
        eventId: event.getId(),

        // Metadata
        importedAt: new Date().toISOString(),
        importSource: 'calendar-apps-script'
      };

      const success = sendToGhlWebhook(payload);

      if (success) {
        Logger.log(`Sent to GHL: ${email} (${parsedName.firstName} ${parsedName.lastName}) from "${eventTitle}"`);
        sentToGhlCount++;
        newProcessedAttendees.push(email);
      }
    }
  }

  // Update processed attendees list (keep last 1000 to avoid storage limits)
  const allProcessed = [...processedAttendees, ...newProcessedAttendees];
  const trimmedProcessed = allProcessed.slice(-1000);
  scriptProperties.setProperty('processedAttendees', JSON.stringify(trimmedProcessed));

  Logger.log(`Sent ${sentToGhlCount} new attendees to GHL`);
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
 * Parse name into first and last name
 */
function parseName(name, email) {
  if (!name || name === email || name.includes('@')) {
    // No name available - extract from email
    const localPart = email.split('@')[0];
    const parts = localPart.split(/[._-]/);
    return {
      firstName: capitalize(parts[0] || ''),
      lastName: capitalize(parts.slice(1).join(' ') || '')
    };
  }

  const parts = name.split(' ');
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
 * Test function - verify webhook connection and calendar access
 */
function testWebhook() {
  Logger.log('=== Testing Calendar to GHL Connection ===');

  // Test calendar access
  const calendar = CalendarApp.getDefaultCalendar();
  Logger.log('Calendar name: ' + calendar.getName());

  // Get upcoming events
  const now = new Date();
  const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, nextWeek);
  Logger.log('Upcoming events (next 7 days): ' + events.length);

  if (events.length > 0) {
    const firstEvent = events[0];
    Logger.log('First event: ' + firstEvent.getTitle());
    Logger.log('Guests: ' + firstEvent.getGuestList().length);
  }

  // Test webhook
  if (!GHL_INBOUND_WEBHOOK_URL || GHL_INBOUND_WEBHOOK_URL === 'YOUR_GHL_INBOUND_WEBHOOK_URL_HERE') {
    Logger.log('ERROR: GHL_INBOUND_WEBHOOK_URL is not configured!');
    return;
  }

  const testPayload = {
    email: 'calendar-test-' + Date.now() + '@example.com',
    firstName: 'Calendar',
    lastName: 'Test',
    source: 'Calendar Import - Test',
    tags: ['Test', 'Calendar Import'],
    meetingTitle: 'Test Meeting from Apps Script',
    meetingDate: new Date().toISOString(),
    importedAt: new Date().toISOString(),
    importSource: 'calendar-apps-script-test'
  };

  Logger.log('Sending test payload: ' + JSON.stringify(testPayload));

  const success = sendToGhlWebhook(testPayload);

  if (success) {
    Logger.log('SUCCESS! Webhook received the test data.');
    Logger.log('Check GHL to verify the contact was created.');
  } else {
    Logger.log('FAILED! Check the webhook URL and try again.');
  }
}

/**
 * Process a single event manually (for testing)
 */
function processNextEvent() {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, nextWeek);

  if (events.length === 0) {
    Logger.log('No upcoming events found');
    return;
  }

  const event = events[0];
  Logger.log('Processing event: ' + event.getTitle());

  const guests = event.getGuestList(true);
  Logger.log('Guests: ' + guests.length);

  for (const guest of guests) {
    const email = guest.getEmail();
    const name = guest.getName();
    Logger.log(`  - ${name} <${email}>`);

    if (!shouldIgnoreEmail(email)) {
      const parsedName = parseName(name, email);
      Logger.log(`    Would send: ${parsedName.firstName} ${parsedName.lastName}`);
    } else {
      Logger.log('    (ignored)');
    }
  }
}

/**
 * Reset processed attendees list (to reprocess all)
 */
function resetProcessedAttendees() {
  PropertiesService.getScriptProperties().deleteProperty('processedAttendees');
  Logger.log('Processed attendees list reset. Next run will process all recent attendees.');
}

/**
 * View current configuration
 */
function viewConfig() {
  Logger.log('=== Current Configuration ===');
  Logger.log('Calendar ID: ' + CALENDAR_ID);
  Logger.log('Lookback hours: ' + LOOKBACK_HOURS);
  Logger.log('Lookahead days: ' + LOOKAHEAD_DAYS);
  Logger.log('Webhook URL: ' + (GHL_INBOUND_WEBHOOK_URL ? 'Configured' : 'NOT CONFIGURED'));
  Logger.log('Ignore patterns: ' + IGNORE_PATTERNS.join(', '));
  Logger.log('Default tags: ' + DEFAULT_TAGS.join(', '));

  const processed = JSON.parse(
    PropertiesService.getScriptProperties().getProperty('processedAttendees') || '[]'
  );
  Logger.log('Processed attendees count: ' + processed.length);
}
