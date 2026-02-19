#!/usr/bin/env node

/**
 * ACT Calendar Full Sync
 *
 * Syncs Google Calendar events to Supabase with:
 * - Project auto-detection from title/description
 * - Attendee extraction and GHL contact matching
 * - Incremental updates via etag tracking
 *
 * Usage:
 *   node scripts/sync-calendar-full.mjs                   # Default: 6 months back, 3 forward
 *   node scripts/sync-calendar-full.mjs --since 3m       # 3 months back
 *   node scripts/sync-calendar-full.mjs --until 6m       # 6 months forward
 *   node scripts/sync-calendar-full.mjs --calendar-id X  # Specific calendar
 *   node scripts/sync-calendar-full.mjs --all-calendars   # Sync all accessible calendars
 *   node scripts/sync-calendar-full.mjs --dry-run        # Preview without writing
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { loadProjects } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load project codes for auto-detection
let PROJECT_CODES = {};
try {
  PROJECT_CODES = await loadProjects();
} catch (e) {
  console.warn('Warning: Could not load project codes:', e.message);
}

// Build project matchers from project codes config
const PROJECT_MATCHERS = Object.entries(PROJECT_CODES).map(([code, project]) => {
  // Build regex pattern from project name, code, and GHL tags
  const patterns = [
    project.name?.toLowerCase(),
    code.toLowerCase(),
    ...(project.ghl_tags || []),
    ...(project.notion_pages?.map(p => p.toLowerCase()) || []),
  ].filter(Boolean);

  const patternStr = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  return {
    code,
    pattern: new RegExp(`(${patternStr})`, 'i'),
    name: project.name,
  };
});

// Event type inference patterns
const EVENT_TYPE_PATTERNS = [
  { type: 'deadline', patterns: [/deadline/i, /due/i, /submit/i] },
  { type: 'milestone', patterns: [/launch/i, /release/i, /milestone/i, /go-live/i] },
  { type: 'gathering', patterns: [/dinner/i, /gathering/i, /workshop/i, /community/i, /retreat/i] },
  { type: 'focus', patterns: [/focus/i, /deep work/i, /writing/i, /creative/i] },
  { type: 'travel', patterns: [/flight/i, /travel/i, /airport/i, /drive to/i] },
  { type: 'personal', patterns: [/personal/i, /family/i, /doctor/i, /appointment/i] },
];

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

// Get list of delegated users to sync (multi-user like Gmail sync)
function getDelegatedUsers() {
  const multiUser = getSecret('GOOGLE_DELEGATED_USERS');
  if (multiUser) {
    return multiUser.split(',').map(e => e.trim()).filter(Boolean);
  }
  const singleUser = getSecret('GOOGLE_DELEGATED_USER');
  if (singleUser) {
    return [singleUser.trim()];
  }
  throw new Error('GOOGLE_DELEGATED_USERS or GOOGLE_DELEGATED_USER not configured');
}

// Initialize Google Calendar with service account for a specific user
async function getCalendarForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');

  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  const credentials = JSON.parse(keyJson);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    subject: userEmail,
  });

  await auth.authorize();
  return google.calendar({ version: 'v3', auth });
}

// Initialize Supabase (use SHARED credentials which is the main ACT database)
function getSupabase() {
  // Prefer shared Supabase which has all the ACT tables
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(url, key);
}

// Discover all accessible calendars
async function getAllCalendars(calendarApi) {
  const response = await calendarApi.calendarList.list();
  return (response.data.items || []).filter(c => c.accessRole !== 'freeBusyReader');
}

// Auto-detect project from event title and description
function detectProject(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  for (const matcher of PROJECT_MATCHERS) {
    if (matcher.pattern.test(text)) {
      return matcher.code;
    }
  }

  return null;
}

// Infer event type from title
function inferEventType(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  for (const { type, patterns } of EVENT_TYPE_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      return type;
    }
  }

  return 'meeting'; // Default
}

// Parse time duration string (e.g., "6m" = 6 months)
function parseDuration(str) {
  const match = str.match(/^(\d+)([dmwy])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const date = new Date();
  switch (unit) {
    case 'd': date.setDate(date.getDate() + value); break;
    case 'w': date.setDate(date.getDate() + value * 7); break;
    case 'm': date.setMonth(date.getMonth() + value); break;
    case 'y': date.setFullYear(date.getFullYear() + value); break;
  }
  return date;
}

// Fetch GHL contacts for attendee matching
async function loadGhlContacts(supabase) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, email, full_name')
    .not('email', 'is', null);

  if (error) {
    console.warn('Warning: Could not load GHL contacts:', error.message);
    return new Map();
  }

  const emailMap = new Map();
  for (const contact of data || []) {
    if (contact.email) {
      emailMap.set(contact.email.toLowerCase(), {
        ghl_contact_id: contact.ghl_id || contact.id,
        full_name: contact.full_name,
      });
    }
  }
  return emailMap;
}

// Match attendee emails to GHL contacts
function matchAttendees(attendees, ghlContactMap) {
  const matches = [];
  const ghlContactIds = [];

  for (const attendee of attendees || []) {
    const email = attendee.email?.toLowerCase();
    if (!email) continue;

    const match = ghlContactMap.get(email);
    if (match) {
      matches.push({
        email,
        ghl_contact_id: match.ghl_contact_id,
        match_confidence: 1.0,
      });
      ghlContactIds.push(match.ghl_contact_id);
    }
  }

  return { matches, ghlContactIds };
}

// Transform Google Calendar event to Supabase format
function transformEvent(event, ghlContactMap, calendarInfo) {
  const startTime = event.start?.dateTime || event.start?.date;
  const endTime = event.end?.dateTime || event.end?.date;
  const isAllDay = !event.start?.dateTime;

  // Extract attendees
  const attendees = (event.attendees || []).map(a => ({
    email: a.email,
    name: a.displayName || null,
    response_status: a.responseStatus,
    organizer: a.organizer || false,
    self: a.self || false,
  }));

  // Match attendees to GHL contacts
  const { matches, ghlContactIds } = matchAttendees(event.attendees, ghlContactMap);

  // Auto-detect project
  const detectedProject = detectProject(event.summary, event.description);

  // Infer event type
  const eventType = inferEventType(event.summary, event.description);

  return {
    google_event_id: event.id,
    google_calendar_id: calendarInfo?.id || 'primary',
    calendar_name: calendarInfo?.summary || 'Primary',
    calendar_color: calendarInfo?.backgroundColor || null,

    title: event.summary || '(No title)',
    description: event.description || null,
    start_time: startTime,
    end_time: endTime || startTime,
    location: event.location || null,

    attendees: JSON.stringify(attendees),
    organizer_email: event.organizer?.email || null,

    is_all_day: isAllDay,
    recurrence_rule: event.recurrence?.[0] || null,
    recurring_event_id: event.recurringEventId || null,
    status: event.status || 'confirmed',
    transparency: event.transparency || null,
    visibility: event.visibility || null,

    event_type: eventType,
    detected_project_code: detectedProject,
    project_code: detectedProject, // Will be overridden by manual if exists

    ghl_contact_ids: ghlContactIds,
    attendee_contact_matches: JSON.stringify(matches),

    metadata: JSON.stringify({
      creator: event.creator,
      created: event.created,
      updated: event.updated,
      conferenceData: event.conferenceData,
    }),
    html_link: event.htmlLink,

    etag: event.etag,
    synced_at: new Date().toISOString(),
  };
}

// Fetch all events from a single calendar within a date range
async function fetchCalendarEvents(calendarApi, calendarId, startDate, endDate, verbose) {
  let allEvents = [];
  let pageToken = null;

  do {
    const params = {
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const { data } = await calendarApi.events.list(params);
    allEvents = allEvents.concat(data.items || []);
    pageToken = data.nextPageToken;

    if (verbose) {
      console.log(`    Fetched ${allEvents.length} events so far...`);
    }
  } while (pageToken);

  return allEvents;
}

// Main sync function
async function syncCalendar(options = {}) {
  const {
    since = '6m',
    until = '3m',
    calendarId = 'primary',
    allCalendars = false,
    dryRun = false,
    verbose = false,
  } = options;

  console.log('\n📅 ACT Calendar Full Sync\n');
  console.log('Options:');
  console.log(`  Since: ${since} ago`);
  console.log(`  Until: ${until} ahead`);
  console.log(`  Calendar: ${allCalendars ? 'ALL' : calendarId}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log();

  // Calculate date range
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);

  const sinceMonths = parseInt(since.replace('m', ''));
  const untilMonths = parseInt(until.replace('m', ''));

  startDate.setMonth(startDate.getMonth() - sinceMonths);
  endDate.setMonth(endDate.getMonth() + untilMonths);

  console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

  // Initialize APIs
  const supabase = getSupabase();
  const delegatedUsers = getDelegatedUsers();

  // Load GHL contacts for matching
  console.log('Loading GHL contacts for attendee matching...');
  const ghlContactMap = await loadGhlContacts(supabase);
  console.log(`  Loaded ${ghlContactMap.size} contacts with email addresses\n`);

  console.log(`Syncing ${delegatedUsers.length} account(s): ${delegatedUsers.join(', ')}\n`);

  // Track seen event IDs to deduplicate across accounts (shared calendar events)
  const seenEventIds = new Set();

  // Fetch and transform events from all calendars across all users
  let allTransformed = [];
  const totalProjectCounts = {};
  const totalTypeCounts = {};
  let totalMatchedContacts = 0;

  for (const delegatedUser of delegatedUsers) {
    console.log(`\n━━━ Account: ${delegatedUser} ━━━\n`);

    let calendar;
    try {
      calendar = await getCalendarForUser(delegatedUser);
    } catch (err) {
      console.error(`  ❌ Failed to auth as ${delegatedUser}: ${err.message}`);
      continue;
    }

    // Determine which calendars to sync
    let calendarsToSync;
    if (allCalendars) {
      console.log('  Discovering all accessible calendars...');
      const discovered = await getAllCalendars(calendar);
      calendarsToSync = discovered.map(c => ({
        id: c.id,
        summary: c.summary || c.id,
        backgroundColor: c.backgroundColor || null,
      }));
      console.log(`  Found ${calendarsToSync.length} calendars:`);
      for (const cal of calendarsToSync) {
        console.log(`    - ${cal.summary} (${cal.id})`);
      }
      console.log();
    } else {
      // Single calendar mode
      let calInfo = { id: calendarId, summary: calendarId, backgroundColor: null };
      try {
        const { data } = await calendar.calendars.get({ calendarId });
        calInfo = { id: calendarId, summary: data.summary || calendarId, backgroundColor: null };
      } catch (e) {
        // Use defaults
      }
      calendarsToSync = [calInfo];
    }

    for (const cal of calendarsToSync) {
      console.log(`  Syncing calendar: ${cal.summary} (${cal.id})`);

      const calendarInfo = { id: cal.id, summary: cal.summary, backgroundColor: cal.backgroundColor };
      const events = await fetchCalendarEvents(calendar, cal.id, startDate, endDate, verbose);
      console.log(`    Found ${events.length} events`);

      // Transform events with source='google', deduplicate by google_event_id
      let newCount = 0;
      for (const e of events) {
        const eventId = e.id;
        if (seenEventIds.has(eventId)) continue;
        seenEventIds.add(eventId);

        const transformed = {
          ...transformEvent(e, ghlContactMap, calendarInfo),
          sync_source: 'google',
        };

        if (transformed.detected_project_code) {
          totalProjectCounts[transformed.detected_project_code] = (totalProjectCounts[transformed.detected_project_code] || 0) + 1;
        }
        totalTypeCounts[transformed.event_type] = (totalTypeCounts[transformed.event_type] || 0) + 1;
        totalMatchedContacts += transformed.ghl_contact_ids?.length || 0;

        allTransformed.push(transformed);
        newCount++;
      }

      if (newCount < events.length) {
        console.log(`    (${events.length - newCount} duplicates skipped — already seen from another account)`);
      }
    }
  }

  console.log(`\nTotal: ${allTransformed.length} events across ${delegatedUsers.length} account(s) (${seenEventIds.size} unique)\n`);

  console.log('Event types:');
  for (const [type, count] of Object.entries(totalTypeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  console.log();

  console.log('Project detections:');
  for (const [code, count] of Object.entries(totalProjectCounts).sort((a, b) => b[1] - a[1])) {
    const project = PROJECT_CODES[code];
    console.log(`  ${code} (${project?.name || 'Unknown'}): ${count}`);
  }
  console.log(`  (Unlinked): ${allTransformed.filter(e => !e.detected_project_code).length}`);
  console.log();

  console.log(`Contact matches: ${totalMatchedContacts} attendees linked to GHL contacts\n`);

  if (dryRun) {
    console.log('DRY RUN - No changes written to database\n');

    // Show sample events
    console.log('Sample events:');
    for (const event of allTransformed.slice(0, 5)) {
      console.log(`  - ${event.title} [${event.calendar_name}]`);
      console.log(`    Time: ${event.start_time}`);
      console.log(`    Type: ${event.event_type}`);
      console.log(`    Project: ${event.detected_project_code || '(none)'}`);
      console.log();
    }
    return;
  }

  // Upsert to Supabase in batches
  console.log('Syncing to Supabase...\n');
  const batchSize = 50;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < allTransformed.length; i += batchSize) {
    const batch = allTransformed.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(batch, {
        onConflict: 'google_event_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      updated += data?.length || 0;
    }

    if (verbose || (i % 200 === 0 && i > 0)) {
      console.log(`  Processed ${Math.min(i + batchSize, allTransformed.length)}/${allTransformed.length} events...`);
    }
  }

  console.log();
  console.log('✅ Sync complete!');
  console.log(`  Accounts: ${delegatedUsers.length}`);
  console.log(`  Total events: ${allTransformed.length}`);
  console.log(`  Synced: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Projects detected: ${Object.keys(totalProjectCounts).length}`);
  console.log(`  Contacts matched: ${totalMatchedContacts}`);
  console.log();
}

// Parse CLI arguments
const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

const options = {
  since: getArg('since', '6m'),
  until: getArg('until', '3m'),
  calendarId: getArg('calendar-id', 'primary'),
  allCalendars: args.includes('--all-calendars'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run sync
try {
  await syncCalendar(options);
} catch (err) {
  console.error('\n❌ Error:', err.message);
  if (options.verbose) {
    console.error(err.stack);
  }
  process.exit(1);
}
