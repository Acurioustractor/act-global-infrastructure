#!/usr/bin/env node

/**
 * ACT Calendar CLI - Google Calendar access via service account
 *
 * Usage:
 *   act-calendar today
 *   act-calendar week
 *   act-calendar upcoming [--days N]
 *   act-calendar free [--duration MINUTES] [--days N]
 *   act-calendar search <query>
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';

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

// Initialize Google Calendar with service account
async function getCalendar() {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  const delegatedUser = getSecret('GOOGLE_DELEGATED_USER');

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
    subject: delegatedUser,
  });

  await auth.authorize();
  return google.calendar({ version: 'v3', auth });
}

function formatEvent(event) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  const startDate = new Date(start);
  const endDate = new Date(end);

  const timeStr = event.start?.dateTime
    ? `${startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
    : 'All day';

  return {
    id: event.id,
    summary: event.summary || '(No title)',
    time: timeStr,
    date: startDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' }),
    location: event.location || null,
    attendees: event.attendees?.length || 0,
  };
}

async function getToday() {
  const calendar = await getCalendar();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = (data.items || []).map(formatEvent);

  console.log(`\n📅 Today (${now.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })})\n`);

  if (events.length === 0) {
    console.log('  No events scheduled');
  } else {
    for (const e of events) {
      console.log(`  ${e.time}  ${e.summary}`);
      if (e.location) console.log(`           📍 ${e.location}`);
    }
  }
  console.log();
}

async function getWeek() {
  const calendar = await getCalendar();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = (data.items || []).map(formatEvent);

  console.log(`\n📅 This Week\n`);

  // Group by day
  const byDay = {};
  for (const e of events) {
    if (!byDay[e.date]) byDay[e.date] = [];
    byDay[e.date].push(e);
  }

  for (const [day, dayEvents] of Object.entries(byDay)) {
    console.log(`  ${day}`);
    for (const e of dayEvents) {
      console.log(`    ${e.time}  ${e.summary}`);
    }
  }

  if (events.length === 0) {
    console.log('  No events this week');
  }
  console.log();
}

async function getUpcoming(days = 7) {
  const calendar = await getCalendar();
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  const events = (data.items || []).map(formatEvent);

  console.log(`\n📅 Upcoming (next ${days} days)\n`);

  for (const e of events) {
    console.log(`  ${e.date} ${e.time}  ${e.summary}`);
  }

  if (events.length === 0) {
    console.log('  No upcoming events');
  }
  console.log();
}

async function findFreeTime(durationMinutes = 60, days = 3) {
  const calendar = await getCalendar();
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const busy = data.calendars?.primary?.busy || [];

  console.log(`\n🕐 Free Time Slots (${durationMinutes}+ min, next ${days} days)\n`);

  // Work hours: 9am - 6pm
  const workStart = 9;
  const workEnd = 18;

  let currentDay = new Date(now);
  currentDay.setHours(workStart, 0, 0, 0);

  if (currentDay < now) {
    currentDay = new Date(now);
    currentDay.setMinutes(Math.ceil(currentDay.getMinutes() / 30) * 30, 0, 0);
  }

  const freeSlots = [];
  const endDate = new Date(end);

  while (currentDay < endDate && freeSlots.length < 10) {
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(workEnd, 0, 0, 0);

    // Skip weekends
    if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
      currentDay.setDate(currentDay.getDate() + 1);
      currentDay.setHours(workStart, 0, 0, 0);
      continue;
    }

    // Find free slots in this day
    let slotStart = new Date(currentDay);

    for (const busyPeriod of busy) {
      const busyStart = new Date(busyPeriod.start);
      const busyEnd = new Date(busyPeriod.end);

      if (busyStart > dayEnd) break;
      if (busyEnd < slotStart) continue;

      // Gap before this busy period
      if (slotStart < busyStart) {
        const gapMinutes = (busyStart - slotStart) / 60000;
        if (gapMinutes >= durationMinutes) {
          freeSlots.push({
            start: new Date(slotStart),
            end: new Date(busyStart),
            duration: gapMinutes,
          });
        }
      }
      slotStart = new Date(Math.max(slotStart.getTime(), busyEnd.getTime()));
    }

    // Gap after last busy period
    if (slotStart < dayEnd) {
      const gapMinutes = (dayEnd - slotStart) / 60000;
      if (gapMinutes >= durationMinutes) {
        freeSlots.push({
          start: new Date(slotStart),
          end: dayEnd,
          duration: gapMinutes,
        });
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
    currentDay.setHours(workStart, 0, 0, 0);
  }

  for (const slot of freeSlots.slice(0, 10)) {
    const dateStr = slot.start.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
    const startStr = slot.start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    const endStr = slot.end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    console.log(`  ${dateStr}  ${startStr} - ${endStr}  (${Math.round(slot.duration)} min)`);
  }

  if (freeSlots.length === 0) {
    console.log('  No free slots found');
  }
  console.log();
}

async function searchEvents(query) {
  const calendar = await getCalendar();
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: past.toISOString(),
    timeMax: future.toISOString(),
    q: query,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  const events = (data.items || []).map(formatEvent);

  console.log(`\n🔍 Search: "${query}"\n`);

  for (const e of events) {
    console.log(`  ${e.date} ${e.time}  ${e.summary}`);
  }

  if (events.length === 0) {
    console.log('  No matching events');
  }
  console.log();
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

try {
  switch (command) {
    case 'today':
      await getToday();
      break;
    case 'week':
      await getWeek();
      break;
    case 'upcoming':
      await getUpcoming(parseInt(getArg('days', '7')));
      break;
    case 'free':
      await findFreeTime(
        parseInt(getArg('duration', '60')),
        parseInt(getArg('days', '3'))
      );
      break;
    case 'search':
      const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
      await searchEvents(query);
      break;
    default:
      console.log(`
ACT Calendar CLI

Usage:
  act-calendar today              Show today's events
  act-calendar week               Show this week's events
  act-calendar upcoming [--days N] Show upcoming events
  act-calendar free [--duration M] [--days N]  Find free time
  act-calendar search <query>     Search events
`);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
