#!/usr/bin/env node

/**
 * ACT Daily Briefing - Morning summary for Ben
 *
 * Aggregates:
 * - Today's calendar
 * - Unread emails (summary)
 * - Recent Empathy Ledger stories
 * - Notion tasks in progress
 * - CRM activity (if available)
 *
 * Usage:
 *   act-briefing [--format json|text]
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

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

// Google Auth
async function getGoogleAuth() {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  const delegatedUser = getSecret('GOOGLE_DELEGATED_USER');

  if (!keyJson) return null;

  const credentials = JSON.parse(keyJson);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    subject: delegatedUser,
  });

  await auth.authorize();
  return auth;
}

// Calendar Events
async function getCalendarEvents() {
  try {
    const auth = await getGoogleAuth();
    if (!auth) return { error: 'Not configured' };

    const calendar = google.calendar({ version: 'v3', auth });
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

    return (data.items || []).map(event => {
      const start = event.start?.dateTime || event.start?.date;
      const startDate = new Date(start);
      const isAllDay = !event.start?.dateTime;

      return {
        summary: event.summary || '(No title)',
        time: isAllDay ? 'All day' : startDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        location: event.location || null,
      };
    });
  } catch (err) {
    return { error: err.message };
  }
}

// Unread Emails
async function getUnreadEmails() {
  try {
    const auth = await getGoogleAuth();
    if (!auth) return { error: 'Not configured' };

    const gmail = google.gmail({ version: 'v1', auth });

    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 10,
    });

    const messages = data.messages || [];
    const count = messages.length;

    // Get details of first 5
    const summaries = [];
    for (const msg of messages.slice(0, 5)) {
      const { data: detail } = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });

      const from = detail.payload?.headers?.find(h => h.name === 'From')?.value || '';
      const subject = detail.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const fromName = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim();

      summaries.push({ from: fromName, subject });
    }

    return { count, summaries };
  } catch (err) {
    return { error: err.message };
  }
}

// Recent Stories from Empathy Ledger
async function getRecentStories() {
  try {
    const supabaseUrl = getSecret('EL_SUPABASE_URL') || getSecret('SUPABASE_URL');
    const supabaseKey = getSecret('EL_SUPABASE_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return { error: 'Not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
      .from('stories')
      .select(`
        id,
        title,
        created_at,
        storyteller:storytellers(name)
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) return { error: error.message };

    return (data || []).map(s => ({
      title: s.title,
      storyteller: s.storyteller?.name || 'Anonymous',
      created: new Date(s.created_at).toLocaleDateString('en-AU'),
    }));
  } catch (err) {
    return { error: err.message };
  }
}

// Notion Tasks
async function getNotionTasks() {
  try {
    const notionToken = getSecret('NOTION_TOKEN');
    if (!notionToken) return { error: 'Not configured' };

    // Try to run act-notion CLI
    const result = execSync('act-notion tasks --status "In Progress" --limit 5 2>/dev/null', {
      encoding: 'utf8',
      timeout: 10000,
    });

    // Parse output - basic text extraction
    const lines = result.split('\n').filter(l => l.trim() && !l.includes('Tasks'));
    return lines.slice(0, 5).map(l => l.trim());
  } catch (err) {
    return { error: 'Could not fetch' };
  }
}

// Weather (optional - uses wttr.in)
async function getWeather() {
  try {
    const result = execSync('curl -s "wttr.in/Witta?format=%c+%t+%h" 2>/dev/null', {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return null;
  }
}

// Main briefing
async function generateBriefing(format = 'text') {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const [calendar, email, stories, weather] = await Promise.all([
    getCalendarEvents(),
    getUnreadEmails(),
    getRecentStories(),
    getWeather(),
  ]);

  if (format === 'json') {
    console.log(JSON.stringify({
      date: dayName,
      weather,
      calendar,
      email,
      stories,
    }, null, 2));
    return;
  }

  // Text format
  console.log(`
${'═'.repeat(60)}
🌾 FARMHAND DAILY BRIEFING
${dayName}
${'═'.repeat(60)}
`);

  // Weather
  if (weather) {
    console.log(`☀️  Weather: ${weather}\n`);
  }

  // Calendar
  console.log(`📅 TODAY'S CALENDAR`);
  if (calendar.error) {
    console.log(`   ⚠️  ${calendar.error}`);
  } else if (calendar.length === 0) {
    console.log(`   Clear day - no meetings scheduled`);
  } else {
    for (const event of calendar) {
      console.log(`   ${event.time.padEnd(10)} ${event.summary}`);
      if (event.location) console.log(`              📍 ${event.location}`);
    }
  }
  console.log();

  // Email
  console.log(`📬 INBOX`);
  if (email.error) {
    console.log(`   ⚠️  ${email.error}`);
  } else if (email.count === 0) {
    console.log(`   Inbox zero! ✨`);
  } else {
    console.log(`   ${email.count} unread message${email.count === 1 ? '' : 's'}`);
    for (const msg of email.summaries || []) {
      const from = msg.from.length > 20 ? msg.from.slice(0, 19) + '…' : msg.from;
      const subject = msg.subject.length > 35 ? msg.subject.slice(0, 34) + '…' : msg.subject;
      console.log(`   • ${from}: ${subject}`);
    }
  }
  console.log();

  // Stories
  console.log(`📖 EMPATHY LEDGER`);
  if (stories.error) {
    console.log(`   ⚠️  ${stories.error}`);
  } else if (stories.length === 0) {
    console.log(`   No new stories in the last 24 hours`);
  } else {
    console.log(`   ${stories.length} new stor${stories.length === 1 ? 'y' : 'ies'}`);
    for (const story of stories) {
      console.log(`   • "${story.title}" - ${story.storyteller}`);
    }
  }
  console.log();

  console.log(`${'─'.repeat(60)}`);
  console.log(`Generated at ${now.toLocaleTimeString('en-AU')}`);
  console.log();
}

// CLI
const args = process.argv.slice(2);
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'text';

generateBriefing(format).catch(err => {
  console.error('Error generating briefing:', err.message);
  process.exit(1);
});
