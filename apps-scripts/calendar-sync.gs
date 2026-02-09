/**
 * Google Calendar to Supabase Sync
 *
 * Google Apps Script that syncs calendar events to ACT Supabase via sync-events edge function.
 * Runs on a time-based trigger (every 15 minutes recommended).
 *
 * Setup:
 * 1. Create new Google Apps Script project
 * 2. Copy this code
 * 3. Set script properties:
 *    - SUPABASE_FUNCTION_URL: https://tednluwflfhxyucgwigh.supabase.co/functions/v1/sync-events
 *    - SYNC_API_KEY: your API key
 *    - USER_EMAIL: ben@act.place (or nic@act.place)
 *    - CANONICAL_NAME: ben (or nic)
 *    - CALENDAR_ID: primary (or specific calendar ID)
 * 4. Create time-based trigger for syncRecentEvents (every 15 minutes)
 *
 * @author ACT Technology
 * @version 1.0.0
 */

// Configuration
const CONFIG = {
  // How far ahead to sync (in days)
  SYNC_AHEAD_DAYS: 14,
  // How far back to look for updates (in hours)
  UPDATE_LOOKBACK_HOURS: 2,
  // Maximum events to process per run
  MAX_EVENTS: 100,
  // Event types to include
  INCLUDE_TYPES: ['default', 'outOfOffice', 'focusTime'],
};

/**
 * Main sync function - call this from a trigger
 */
function syncRecentEvents() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_FUNCTION_URL');
  const apiKey = props.getProperty('SYNC_API_KEY');
  const canonicalName = props.getProperty('CANONICAL_NAME');
  const calendarId = props.getProperty('CALENDAR_ID') || 'primary';

  if (!supabaseUrl || !apiKey) {
    console.error('Missing required script properties');
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    console.error('Calendar not found:', calendarId);
    return;
  }

  // Time range: now to 14 days ahead
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + CONFIG.SYNC_AHEAD_DAYS);

  // Get events
  const calEvents = calendar.getEvents(now, endDate);
  console.log(`Found ${calEvents.length} upcoming events`);

  const processedIds = getProcessedIds();
  const events = [];

  for (const calEvent of calEvents.slice(0, CONFIG.MAX_EVENTS)) {
    const eventId = calEvent.getId();
    const eventHash = hashEvent(calEvent);

    // Skip if unchanged since last sync
    if (processedIds.get(eventId) === eventHash) {
      continue;
    }

    // Get attendees
    const attendees = calEvent.getGuestList()
      .filter(g => g.getGuestStatus() !== CalendarApp.GuestStatus.NO)
      .map(g => g.getEmail());

    // Extract contact email (first non-team attendee)
    const contactEmail = attendees.find(e => !e.endsWith('@act.place'));

    // Build event
    const event = {
      type: 'calendar',
      direction: calEvent.isOwnedByMe() ? 'outbound' : 'inbound',
      subject: calEvent.getTitle(),
      content_preview: buildEventPreview(calEvent),
      occurred_at: calEvent.getStartTime().toISOString(),
      source_system: 'google_calendar',
      source_id: eventId,
      contact_email: contactEmail,
      from_user: calEvent.isOwnedByMe() ? canonicalName : null,
      to_users: [canonicalName],
      topics: extractTopicsFromTitle(calEvent.getTitle()),
    };

    events.push(event);
    processedIds.set(eventId, eventHash);
  }

  console.log(`Prepared ${events.length} events for sync`);

  if (events.length === 0) {
    return;
  }

  // Send to Supabase
  const response = UrlFetchApp.fetch(supabaseUrl, {
    method: 'POST',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey },
    payload: JSON.stringify({
      events: events,
      source: 'calendar-apps-script',
    }),
    muteHttpExceptions: true,
  });

  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  console.log(`Sync response: ${responseCode} - ${responseBody}`);

  if (responseCode === 200) {
    saveProcessedIds(processedIds);
  }
}

/**
 * Sync past events (completed meetings)
 * Useful for tracking which meetings actually happened
 */
function syncPastEvents() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_FUNCTION_URL');
  const apiKey = props.getProperty('SYNC_API_KEY');
  const canonicalName = props.getProperty('CANONICAL_NAME');
  const calendarId = props.getProperty('CALENDAR_ID') || 'primary';

  if (!supabaseUrl || !apiKey) {
    console.error('Missing required script properties');
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    console.error('Calendar not found:', calendarId);
    return;
  }

  // Look back 24 hours
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 24);

  const calEvents = calendar.getEvents(startDate, now);
  console.log(`Found ${calEvents.length} past events`);

  const events = [];

  for (const calEvent of calEvents) {
    // Skip cancelled events
    if (calEvent.getGuestList().some(g =>
        g.getGuestStatus() === CalendarApp.GuestStatus.NO)) {
      continue;
    }

    const attendees = calEvent.getGuestList()
      .filter(g => g.getGuestStatus() !== CalendarApp.GuestStatus.NO)
      .map(g => g.getEmail());

    const contactEmail = attendees.find(e => !e.endsWith('@act.place'));

    events.push({
      type: 'calendar',
      direction: calEvent.isOwnedByMe() ? 'outbound' : 'inbound',
      subject: calEvent.getTitle() + ' (completed)',
      content_preview: buildEventPreview(calEvent),
      occurred_at: calEvent.getStartTime().toISOString(),
      source_system: 'google_calendar',
      source_id: calEvent.getId() + '-completed',
      contact_email: contactEmail,
      from_user: canonicalName,
      to_users: [canonicalName],
      topics: extractTopicsFromTitle(calEvent.getTitle()),
    });
  }

  if (events.length > 0) {
    const response = UrlFetchApp.fetch(supabaseUrl, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'x-api-key': apiKey },
      payload: JSON.stringify({
        events: events,
        source: 'calendar-past-events',
      }),
      muteHttpExceptions: true,
    });

    console.log(`Past events sync: ${response.getResponseCode()}`);
  }
}

/**
 * Build preview text for calendar event
 */
function buildEventPreview(calEvent) {
  const parts = [];

  const startTime = Utilities.formatDate(
    calEvent.getStartTime(),
    Session.getScriptTimeZone(),
    'EEE MMM d, h:mm a'
  );
  parts.push(`When: ${startTime}`);

  const duration = (calEvent.getEndTime().getTime() - calEvent.getStartTime().getTime()) / 60000;
  parts.push(`Duration: ${duration} minutes`);

  const location = calEvent.getLocation();
  if (location) {
    parts.push(`Where: ${location}`);
  }

  const attendees = calEvent.getGuestList()
    .filter(g => g.getGuestStatus() !== CalendarApp.GuestStatus.NO)
    .map(g => g.getEmail())
    .slice(0, 5);
  if (attendees.length > 0) {
    parts.push(`With: ${attendees.join(', ')}`);
  }

  const description = calEvent.getDescription();
  if (description) {
    parts.push(`Notes: ${description.slice(0, 200)}`);
  }

  return parts.join('\n');
}

/**
 * Extract topics from event title
 */
function extractTopicsFromTitle(title) {
  const topics = [];
  const titleLower = title.toLowerCase();

  // Project keywords
  const projectKeywords = {
    'harvest': 'project:harvest',
    'empathy ledger': 'project:empathy-ledger',
    'justicehub': 'project:justicehub',
    'el ': 'project:empathy-ledger',
    'studio': 'project:studio',
    'farm': 'project:farm',
  };

  for (const [keyword, topic] of Object.entries(projectKeywords)) {
    if (titleLower.includes(keyword)) {
      topics.push(topic);
    }
  }

  // Event type keywords
  if (titleLower.includes('standup') || titleLower.includes('sync')) {
    topics.push('meeting:standup');
  }
  if (titleLower.includes('planning') || titleLower.includes('sprint')) {
    topics.push('meeting:planning');
  }
  if (titleLower.includes('review') || titleLower.includes('demo')) {
    topics.push('meeting:review');
  }
  if (titleLower.includes('interview') || titleLower.includes('chat')) {
    topics.push('meeting:interview');
  }

  return topics;
}

/**
 * Create hash of event for change detection
 */
function hashEvent(calEvent) {
  const data = [
    calEvent.getTitle(),
    calEvent.getStartTime().getTime(),
    calEvent.getEndTime().getTime(),
    calEvent.getLocation(),
    calEvent.getDescription(),
    calEvent.getGuestList().length,
  ].join('|');

  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data)
    .map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get map of processed event IDs to hashes
 */
function getProcessedIds() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty('PROCESSED_EVENTS') || '{}';
  return new Map(Object.entries(JSON.parse(stored)));
}

/**
 * Save processed event IDs (keep last 500)
 */
function saveProcessedIds(ids) {
  const obj = {};
  let count = 0;
  for (const [key, value] of ids) {
    if (count >= 500) break;
    obj[key] = value;
    count++;
  }
  PropertiesService.getScriptProperties().setProperty('PROCESSED_EVENTS', JSON.stringify(obj));
}

/**
 * Backfill last 30 days of calendar events
 */
function backfillLast30Days() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_FUNCTION_URL');
  const apiKey = props.getProperty('SYNC_API_KEY');
  const canonicalName = props.getProperty('CANONICAL_NAME');
  const calendarId = props.getProperty('CALENDAR_ID') || 'primary';

  if (!supabaseUrl || !apiKey) {
    console.error('Missing required script properties');
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    console.error('Calendar not found');
    return;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const calEvents = calendar.getEvents(thirtyDaysAgo, now);
  console.log(`Backfilling ${calEvents.length} events`);

  const events = [];

  for (const calEvent of calEvents) {
    const attendees = calEvent.getGuestList()
      .filter(g => g.getGuestStatus() !== CalendarApp.GuestStatus.NO)
      .map(g => g.getEmail());

    const contactEmail = attendees.find(e => !e.endsWith('@act.place'));

    events.push({
      type: 'calendar',
      direction: calEvent.isOwnedByMe() ? 'outbound' : 'inbound',
      subject: calEvent.getTitle(),
      content_preview: buildEventPreview(calEvent),
      occurred_at: calEvent.getStartTime().toISOString(),
      source_system: 'google_calendar',
      source_id: calEvent.getId(),
      contact_email: contactEmail,
      from_user: canonicalName,
      to_users: [canonicalName],
      topics: extractTopicsFromTitle(calEvent.getTitle()),
    });
  }

  // Send in batches of 50
  for (let i = 0; i < events.length; i += 50) {
    const batch = events.slice(i, i + 50);
    const response = UrlFetchApp.fetch(supabaseUrl, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'x-api-key': apiKey },
      payload: JSON.stringify({
        events: batch,
        source: 'calendar-backfill',
      }),
      muteHttpExceptions: true,
    });

    console.log(`Batch ${i}: ${response.getResponseCode()} - ${batch.length} events`);
    Utilities.sleep(1000);
  }

  console.log('Calendar backfill complete');
}

/**
 * Test configuration
 */
function testConfiguration() {
  const props = PropertiesService.getScriptProperties();

  console.log('Configuration:');
  console.log('- SUPABASE_FUNCTION_URL:', props.getProperty('SUPABASE_FUNCTION_URL') ? 'SET' : 'MISSING');
  console.log('- SYNC_API_KEY:', props.getProperty('SYNC_API_KEY') ? 'SET' : 'MISSING');
  console.log('- USER_EMAIL:', props.getProperty('USER_EMAIL'));
  console.log('- CANONICAL_NAME:', props.getProperty('CANONICAL_NAME'));
  console.log('- CALENDAR_ID:', props.getProperty('CALENDAR_ID') || 'primary');

  // Test calendar access
  const calendarId = props.getProperty('CALENDAR_ID') || 'primary';
  const calendar = CalendarApp.getCalendarById(calendarId);
  console.log('Calendar access:', calendar ? 'OK' : 'FAILED');

  // Test API connection
  const url = props.getProperty('SUPABASE_FUNCTION_URL');
  const key = props.getProperty('SYNC_API_KEY');

  if (url && key) {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'x-api-key': key },
      payload: JSON.stringify({ events: [], source: 'calendar-test' }),
      muteHttpExceptions: true,
    });

    console.log('API test:', response.getResponseCode(), response.getContentText());
  }
}
