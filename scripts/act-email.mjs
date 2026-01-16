#!/usr/bin/env node

/**
 * ACT Email CLI - Gmail access via service account
 *
 * Usage:
 *   act-email inbox [--unread] [--limit N]
 *   act-email search <query>
 *   act-email read <id>
 *   act-email summary [--limit N]
 *   act-email labels
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

// Initialize Gmail with service account
async function getGmail() {
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
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    subject: delegatedUser,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getHeader(headers, name) {
  const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (days === 0) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString('en-AU', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  }
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

async function getInbox(unreadOnly = false, limit = 10) {
  const gmail = await getGmail();

  const query = unreadOnly ? 'is:unread in:inbox' : 'in:inbox';
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: limit,
  });

  const messages = data.messages || [];

  console.log(`\n📬 Inbox${unreadOnly ? ' (unread)' : ''}\n`);

  if (messages.length === 0) {
    console.log('  No messages');
    console.log();
    return;
  }

  for (const msg of messages) {
    const { data: detail } = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const from = getHeader(detail.payload?.headers, 'From');
    const subject = getHeader(detail.payload?.headers, 'Subject');
    const date = getHeader(detail.payload?.headers, 'Date');
    const isUnread = detail.labelIds?.includes('UNREAD');

    const fromName = from.replace(/<[^>]+>/, '').trim();
    const marker = isUnread ? '●' : ' ';

    console.log(`  ${marker} ${formatDate(date)}  ${truncate(fromName, 20).padEnd(20)}  ${truncate(subject, 45)}`);
  }
  console.log();
}

async function searchEmails(query, limit = 10) {
  const gmail = await getGmail();

  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: limit,
  });

  const messages = data.messages || [];

  console.log(`\n🔍 Search: "${query}"\n`);

  if (messages.length === 0) {
    console.log('  No messages found');
    console.log();
    return;
  }

  for (const msg of messages) {
    const { data: detail } = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const from = getHeader(detail.payload?.headers, 'From');
    const subject = getHeader(detail.payload?.headers, 'Subject');
    const date = getHeader(detail.payload?.headers, 'Date');

    const fromName = from.replace(/<[^>]+>/, '').trim();

    console.log(`  ${formatDate(date)}  ${truncate(fromName, 20).padEnd(20)}  ${truncate(subject, 45)}`);
    console.log(`       ID: ${msg.id}`);
  }
  console.log();
}

async function readEmail(messageId) {
  const gmail = await getGmail();

  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const from = getHeader(data.payload?.headers, 'From');
  const to = getHeader(data.payload?.headers, 'To');
  const subject = getHeader(data.payload?.headers, 'Subject');
  const date = getHeader(data.payload?.headers, 'Date');

  console.log(`\n📧 Email\n`);
  console.log(`  From:    ${from}`);
  console.log(`  To:      ${to}`);
  console.log(`  Date:    ${date}`);
  console.log(`  Subject: ${subject}`);
  console.log(`\n${'─'.repeat(60)}\n`);

  // Extract body
  function getBody(payload) {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf8');
        }
      }
      // Try HTML as fallback
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf8');
          // Strip HTML tags for basic display
          return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }
    return '(No body content)';
  }

  const body = getBody(data.payload);
  console.log(body.slice(0, 2000));
  if (body.length > 2000) {
    console.log('\n... (truncated)');
  }
  console.log();
}

async function getSummary(limit = 5) {
  const gmail = await getGmail();

  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread in:inbox',
    maxResults: limit,
  });

  const messages = data.messages || [];

  console.log(`\n📋 Unread Summary (${messages.length} messages)\n`);

  if (messages.length === 0) {
    console.log('  Inbox zero! No unread messages.');
    console.log();
    return;
  }

  for (const msg of messages) {
    const { data: detail } = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const from = getHeader(detail.payload?.headers, 'From');
    const subject = getHeader(detail.payload?.headers, 'Subject');
    const fromName = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim();

    console.log(`  • ${fromName}: ${subject}`);
  }
  console.log();
}

async function listLabels() {
  const gmail = await getGmail();

  const { data } = await gmail.users.labels.list({ userId: 'me' });
  const labels = data.labels || [];

  console.log(`\n🏷️  Labels\n`);

  const systemLabels = labels.filter(l => l.type === 'system');
  const userLabels = labels.filter(l => l.type === 'user');

  console.log('  System:');
  for (const label of systemLabels) {
    console.log(`    ${label.name}`);
  }

  if (userLabels.length > 0) {
    console.log('\n  User:');
    for (const label of userLabels) {
      console.log(`    ${label.name}`);
    }
  }
  console.log();
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

function hasArg(name) {
  return args.includes(`--${name}`);
}

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

try {
  switch (command) {
    case 'inbox':
      await getInbox(hasArg('unread'), parseInt(getArg('limit', '10')));
      break;
    case 'search':
      const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
      await searchEmails(query, parseInt(getArg('limit', '10')));
      break;
    case 'read':
      const id = args[1];
      if (!id) {
        console.error('Error: Message ID required');
        process.exit(1);
      }
      await readEmail(id);
      break;
    case 'summary':
      await getSummary(parseInt(getArg('limit', '5')));
      break;
    case 'labels':
      await listLabels();
      break;
    default:
      console.log(`
ACT Email CLI

Usage:
  act-email inbox [--unread] [--limit N]  Show inbox messages
  act-email search <query>                Search emails (Gmail query syntax)
  act-email read <id>                     Read a specific email
  act-email summary [--limit N]           Summarize unread emails
  act-email labels                        List email labels

Search examples:
  act-email search "from:john"
  act-email search "subject:invoice is:unread"
  act-email search "after:2024/01/01 has:attachment"
`);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
