#!/usr/bin/env node

/**
 * Email to Knowledge Pipeline
 *
 * Fetches recent emails and automatically routes them to the correct project
 * based on sender matching and keyword analysis.
 *
 * Usage:
 *   node scripts/email-to-knowledge.mjs                    # Process recent emails
 *   node scripts/email-to-knowledge.mjs --email-id <id>    # Process specific email
 *   node scripts/email-to-knowledge.mjs --dry-run          # Preview without saving
 *   node scripts/email-to-knowledge.mjs --since 2d         # Process emails from last 2 days
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load project codes for matching
const projectCodes = JSON.parse(
  readFileSync(join(__dirname, '../config/project-codes.json'), 'utf8')
);

// Supabase config (client created after secrets loaded)
const supabaseUrl = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
let supabase = null;

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

// Initialize Gmail
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

// Extract header value
function getHeader(headers, name) {
  const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

// Extract email address from "Name <email>" format
function extractEmail(from) {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : from.toLowerCase();
}

// Extract name from "Name <email>" format
function extractName(from) {
  return from.replace(/<[^>]+>/, '').trim().replace(/"/g, '');
}

// Project matching rules
// Priority order matters - more specific matches should come first
const PROJECT_MATCHERS = [
  {
    code: 'ACT-JH',
    name: 'JusticeHub',
    keywords: [
      'justice', 'incarceration', 'prison', 'legal', 'court',
      'njp', 'national justice project', 'criminal justice', 'criminology',
      'diagrama', 'youth justice', 'juvenile', 'delinquency',
      'sentencing', 'remand', 'parole', 'bail',
      'worldview foundation', 'wvtech', 'employment programs',
      'guest lecture', 'criminology class', 'law school'
    ],
    contacts: [
      'george newhouse', 'newhouse', 'georgen@justice.org.au',
      'lorana bartels', 'bartels', 'lorana.bartels@anu.edu.au',
      'kurt gruber', 'kurt.gruber@wvtech.com.au'
    ],
    domains: ['justice.org.au', 'njp.org.au', 'wvtech.com.au', 'justreinvest.org.au']
  },
  {
    code: 'ACT-HV',
    name: 'The Harvest',
    keywords: ['harvest', 'witta', 'farm', 'regenerative', 'cafe', 'community hub', 'maleny', 'kenilworth'],
    contacts: ['grant'],
    domains: []
  },
  {
    code: 'ACT-GD',
    name: 'Goods',
    keywords: ['goods', 'salvage', 'jcf', 'job creation', 'woolloongabba', 'orange sky'],
    contacts: ['nicole mekler', 'mekler'],
    domains: ['goodssalvage.com']
  },
  {
    code: 'ACT-EL',
    name: 'Empathy Ledger',
    keywords: ['empathy ledger', 'storytelling', 'stories', 'vignettes', 'narrative', 'content hub'],
    contacts: [],
    domains: ['empathyledger.org']
  },
  {
    code: 'ACT-PICC',
    name: 'PICC',
    // More specific keywords to avoid matching generic "indigenous" in signatures
    keywords: ['picc', 'palm island', 'palm island community', 'cyndell'],
    contacts: ['cyndell', 'uncle allan', 'cyndell pryor'],
    domains: []
  }
];

// Find matching project for email
function matchProject(email) {
  const fromEmail = extractEmail(email.from).toLowerCase();
  const fromName = extractName(email.from).toLowerCase();
  const subject = email.subject.toLowerCase();
  const body = (email.body || '').toLowerCase();
  const combined = `${subject} ${body} ${fromName}`;

  let bestMatch = null;
  let bestScore = 0;

  for (const matcher of PROJECT_MATCHERS) {
    let score = 0;

    // Check domain match (high confidence)
    for (const domain of matcher.domains) {
      if (fromEmail.includes(domain)) {
        score += 50;
      }
    }

    // Check contact match (high confidence)
    for (const contact of matcher.contacts) {
      if (fromEmail.includes(contact) || fromName.includes(contact)) {
        score += 40;
      }
    }

    // Check keyword matches (medium confidence)
    for (const keyword of matcher.keywords) {
      if (combined.includes(keyword)) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = matcher;
    }
  }

  return bestScore >= 10 ? { ...bestMatch, score: bestScore } : null;
}

// Fetch and parse email
async function fetchEmail(gmail, messageId) {
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = data.payload?.headers || [];
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const subject = getHeader(headers, 'Subject');
  const date = getHeader(headers, 'Date');
  const messageIdHeader = getHeader(headers, 'Message-ID');

  // Extract body
  let body = '';
  function extractText(part) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body += Buffer.from(part.body.data, 'base64').toString('utf8');
    }
    if (part.parts) {
      part.parts.forEach(extractText);
    }
  }
  extractText(data.payload);

  // Clean up body
  body = body
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 2000); // Limit length

  return {
    id: messageId,
    messageId: messageIdHeader,
    from,
    to,
    subject,
    date: new Date(date),
    body,
    labels: data.labelIds || [],
  };
}

// Save email as project knowledge AND to communications_history
async function saveToKnowledge(email, project, dryRun = false) {
  const fromName = extractName(email.from);
  const fromEmail = extractEmail(email.from);

  const knowledge = {
    project_code: project.code,
    project_name: project.name,
    knowledge_type: 'communication',
    title: email.subject,
    content: `Email from ${fromName}:\n\n${email.body || '(No body content)'}`,
    source_type: 'gmail',
    source_url: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
    recorded_by: fromName,
    recorded_at: email.date.toISOString(),
    participants: [fromName],
    topics: project.keywords?.slice(0, 3) || [],
    importance: 'normal',
    action_required: email.labels.includes('UNREAD'),
    metadata: {
      gmail_id: email.id,
      message_id: email.messageId,
      from_email: fromEmail,
      match_score: project.score,
    }
  };

  // Also prepare communications_history record
  const communication = {
    channel: 'email',
    direction: 'inbound',
    contact_name: fromName,
    contact_email: fromEmail,
    subject: email.subject,
    content_preview: (email.body || '').slice(0, 500),
    source_system: 'gmail',
    source_id: email.id,
    occurred_at: email.date.toISOString(),
    project_code: project.code,
    waiting_for_response: email.labels.includes('UNREAD'),
    requires_response: email.labels.includes('UNREAD'),
  };

  if (dryRun) {
    console.log('\n📋 Would save to project_knowledge:');
    console.log(JSON.stringify(knowledge, null, 2));
    console.log('\n📋 Would save to communications_history:');
    console.log(JSON.stringify(communication, null, 2));
    return { success: true, dryRun: true };
  }

  // Save to project_knowledge
  const { data, error } = await supabase
    .from('project_knowledge')
    .insert(knowledge)
    .select()
    .single();

  if (error) {
    console.error('Failed to save to project_knowledge:', error.message);
    return { success: false, error };
  }

  // Also save to communications_history
  const { error: commError } = await supabase
    .from('communications_history')
    .insert(communication);

  if (commError) {
    console.error('Failed to save to communications_history:', commError.message);
    // Don't fail the whole operation, knowledge was saved
  } else {
    console.log('   📬 Also saved to communications_history');
  }

  return { success: true, data };
}

// Check if email already processed
async function isAlreadyProcessed(gmailId) {
  const { data } = await supabase
    .from('project_knowledge')
    .select('id')
    .eq('metadata->>gmail_id', gmailId)
    .limit(1);

  return data && data.length > 0;
}

// Initialize Supabase with secret
function initSupabase() {
  if (supabase) return supabase;

  // Use ACT main Supabase (tednluwflfhxyucgwigh) - need the matching anon key
  // The Bitwarden secrets may point to a different project, so we use env or hardcoded
  const url = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!key) {
    // Try loading from .env file
    try {
      const envPath = join(__dirname, '../.env');
      const envContent = readFileSync(envPath, 'utf8');
      const match = envContent.match(/SUPABASE_ANON_KEY=([^\n]+)/);
      if (match) {
        supabase = createClient(url, match[1].trim());
        return supabase;
      }
    } catch (e) {
      // .env not found, continue
    }
    throw new Error('SUPABASE_ANON_KEY required (set in env or .env file)');
  }

  supabase = createClient(url, key);
  return supabase;
}

// Main processing function
async function processEmails(options = {}) {
  const { emailId, since = '1d', dryRun = false, limit = 10 } = options;

  console.log('📧 Email to Knowledge Pipeline\n');

  // Initialize clients
  initSupabase();
  const gmail = await getGmail();

  let messages = [];

  if (emailId) {
    // Process specific email
    messages = [{ id: emailId }];
  } else {
    // Search for recent emails
    const query = `newer:${since} in:inbox`;
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: limit,
    });
    messages = data.messages || [];
  }

  console.log(`Found ${messages.length} emails to process\n`);

  const results = {
    processed: 0,
    matched: 0,
    saved: 0,
    skipped: 0,
    errors: [],
  };

  for (const msg of messages) {
    try {
      // Check if already processed
      if (!dryRun && await isAlreadyProcessed(msg.id)) {
        console.log(`⏭️  Skipping ${msg.id} (already processed)`);
        results.skipped++;
        continue;
      }

      // Fetch email details
      const email = await fetchEmail(gmail, msg.id);
      results.processed++;

      const fromName = extractName(email.from);
      console.log(`\n📨 ${fromName}: ${email.subject}`);

      // Try to match to project
      const project = matchProject(email);

      if (project) {
        console.log(`   ✅ Matched to ${project.code} (${project.name}) - score: ${project.score}`);
        results.matched++;

        // Save to knowledge
        const result = await saveToKnowledge(email, project, dryRun);
        if (result.success) {
          results.saved++;
          console.log(`   💾 ${dryRun ? 'Would save' : 'Saved'} to project_knowledge`);
        }
      } else {
        console.log(`   ⚠️  No project match found`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      results.errors.push({ id: msg.id, error: err.message });
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Processed: ${results.processed}`);
  console.log(`   Matched:   ${results.matched}`);
  console.log(`   Saved:     ${results.saved}`);
  console.log(`   Skipped:   ${results.skipped}`);
  if (results.errors.length > 0) {
    console.log(`   Errors:    ${results.errors.length}`);
  }

  return results;
}

// CLI
const args = process.argv.slice(2);

const options = {
  emailId: null,
  since: '1d',
  dryRun: false,
  limit: 10,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email-id' && args[i + 1]) {
    options.emailId = args[++i];
  } else if (args[i] === '--since' && args[i + 1]) {
    options.since = args[++i];
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[++i]);
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Email to Knowledge Pipeline

Usage:
  node scripts/email-to-knowledge.mjs [options]

Options:
  --email-id <id>   Process specific email by Gmail ID
  --since <period>  Process emails since (e.g., 1d, 2d, 1w) [default: 1d]
  --dry-run         Preview matches without saving
  --limit <n>       Max emails to process [default: 10]
  --help            Show this help
`);
    process.exit(0);
  }
}

processEmails(options).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
