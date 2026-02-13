#!/usr/bin/env node
/**
 * Tag emails in communications_history with project_codes
 *
 * Logic:
 *   1. If email's ghl_contact has projects array → inherit those project codes
 *   2. Match subject/body text against project keywords from project-codes.json
 *
 * Usage:
 *   node scripts/tag-emails-by-project.mjs           # Dry run
 *   node scripts/tag-emails-by-project.mjs --apply    # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const projectCodes = await loadProjectsConfig();
const applyMode = process.argv.includes('--apply');

// Build slug → ACT code map from projects config
function buildSlugToCodeMap() {
  const map = {};
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    // Map various slug formats to project code
    const slugs = [
      project.name.toLowerCase().replace(/\s+/g, '-'),
      project.name.toLowerCase().replace(/\s+/g, ''),
      ...(project.ghl_tags || []).map(t => t.toLowerCase()),
    ];
    for (const slug of slugs) {
      // Don't overwrite — first project to claim a slug wins
      if (!map[slug]) map[slug] = code;
    }
    // Also map the code itself
    map[code.toLowerCase()] = code;
  }
  return map;
}
const slugToCode = buildSlugToCodeMap();

// Build keyword → project code map
function buildKeywordMap() {
  const map = [];
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    // ghl_tags
    for (const tag of project.ghl_tags || []) {
      if (tag.length >= 3) {
        map.push({ keyword: tag.toLowerCase(), code });
      }
    }
    // Project name (if 4+ chars to avoid false positives)
    if (project.name.length >= 4) {
      map.push({ keyword: project.name.toLowerCase(), code });
    }
  }
  // Sort by keyword length descending
  map.sort((a, b) => b.keyword.length - a.keyword.length);
  return map;
}

// Operational tool senders → ACT-DO (digital operations)
const OPS_TOOL_SENDERS = [
  'xero', 'stripe', 'github', 'vercel', 'notion', 'canva',
  'figma', 'slack', 'linear', 'netlify', 'cloudflare', 'supabase',
  'digitalocean', 'aws', 'google cloud', 'openai', 'anthropic',
  'dext.com', 'gohighlevel', 'dropbox',
  'zapier', 'make.com', 'twilio', 'sendgrid',
];

async function tagEmails() {
  const keywordMap = buildKeywordMap();

  console.log(`\n📧 Email → Project Tagger ${applyMode ? '(APPLY)' : '(DRY RUN)'}`);
  console.log('═'.repeat(50));
  console.log(`Keywords: ${keywordMap.length}`);

  // Build contact → projects map from GHL contacts
  // Key on ghl_id (not uuid) since communications_history stores GHL IDs
  // Paginate to avoid Supabase 1000-row default limit
  let allContacts = [];
  let contactOffset = 0;
  const contactPageSize = 1000;
  while (true) {
    const { data: page } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, projects')
      .not('projects', 'is', null)
      .not('ghl_id', 'is', null)
      .range(contactOffset, contactOffset + contactPageSize - 1);
    if (!page || page.length === 0) break;
    allContacts.push(...page);
    if (page.length < contactPageSize) break;
    contactOffset += contactPageSize;
  }
  const contacts = allContacts;

  const contactProjects = {};
  for (const c of contacts || []) {
    if (Array.isArray(c.projects) && c.projects.length > 0) {
      const codes = c.projects
        .map(p => {
          const raw = typeof p === 'string' ? p : p.code;
          if (!raw) return null;
          // Map slug to ACT code if needed
          if (raw.startsWith('ACT-')) return raw;
          return slugToCode[raw.toLowerCase()] || null;
        })
        .filter(Boolean);
      if (codes.length > 0) {
        contactProjects[c.ghl_id] = codes;
      }
    }
  }
  console.log(`Contacts with projects: ${Object.keys(contactProjects).length}`);

  // Fetch untagged emails
  let allEmails = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('communications_history')
      .select('id, subject, content_preview, ghl_contact_id, project_codes, metadata')
      .eq('source_system', 'gmail')
      .or('project_codes.is.null,project_codes.eq.{}')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching emails:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    allEmails.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Untagged emails: ${allEmails.length}`);

  const stats = { contactMatch: 0, keywordMatch: 0, senderMatch: 0, unmatched: 0 };
  const updates = [];

  for (const email of allEmails) {
    const codes = new Set();

    // Method 1: Inherit from contact's projects
    if (email.ghl_contact_id && contactProjects[email.ghl_contact_id]) {
      for (const code of contactProjects[email.ghl_contact_id]) {
        codes.add(code);
      }
      if (codes.size > 0) stats.contactMatch++;
    }

    // Method 2: Keyword match on subject + content preview
    // Use word-boundary matching for short keywords to avoid false positives
    const searchText = [email.subject, email.content_preview].filter(Boolean).join(' ').toLowerCase();
    for (const { keyword, code } of keywordMap) {
      if (keyword.length >= 8) {
        // Long keywords: substring match is fine
        if (searchText.includes(keyword)) codes.add(code);
      } else {
        // Short keywords: require word boundary (not part of a larger word)
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(searchText)) codes.add(code);
      }
    }

    if (codes.size > 0 && !email.ghl_contact_id) stats.keywordMatch++;

    // Method 3: Sender-based matching for operational tools → ACT-DO
    if (codes.size === 0) {
      const senderFrom = (email.metadata?.from || '').toLowerCase();
      if (OPS_TOOL_SENDERS.some(tool => senderFrom.includes(tool))) {
        codes.add('ACT-DO');
        stats.senderMatch++;
      }
    }

    // Method 4: Internal @act.place emails default to ACT-IN
    if (codes.size === 0) {
      const senderFrom = (email.metadata?.from || '').toLowerCase();
      if (senderFrom.includes('@act.place')) {
        codes.add('ACT-IN');
        stats.internalMatch = (stats.internalMatch || 0) + 1;
      }
    }

    // Determine source based on which method matched
    let source = 'keyword_match';
    if (email.ghl_contact_id && contactProjects[email.ghl_contact_id]) {
      source = 'contact_inherit';
    } else if (codes.has('ACT-DO') && codes.size === 1) {
      source = 'sender_match';
    } else if (codes.has('ACT-IN') && codes.size === 1) {
      source = 'internal_default';
    }

    if (codes.size > 0) {
      updates.push({ id: email.id, projectCodes: [...codes], source });
    } else {
      stats.unmatched++;
    }
  }

  console.log('\n📊 Results');
  console.log('─'.repeat(40));
  console.log(`Contact match:  ${stats.contactMatch}`);
  console.log(`Keyword match:  ${stats.keywordMatch}`);
  console.log(`Sender match:   ${stats.senderMatch}`);
  console.log(`Internal match: ${stats.internalMatch || 0}`);
  console.log(`Total tagged:   ${updates.length}`);
  console.log(`Unmatched:      ${stats.unmatched}`);

  // Show sample
  if (updates.length > 0) {
    console.log('\n📋 Sample (first 15):');
    for (const u of updates.slice(0, 15)) {
      const email = allEmails.find(e => e.id === u.id);
      const subj = (email?.subject || 'N/A').substring(0, 50);
      console.log(`  ${u.projectCodes.join(',').padEnd(20)} ← ${subj}`);
    }
  }

  if (applyMode && updates.length > 0) {
    console.log(`\n⏳ Applying ${updates.length} updates...`);
    let applied = 0;

    for (const u of updates) {
      const { error } = await supabase
        .from('communications_history')
        .update({ project_codes: u.projectCodes })
        .eq('id', u.id);

      if (!error) applied++;
    }

    console.log(`✅ Applied ${applied} email tags`);
  } else if (!applyMode) {
    console.log('\n💡 Run with --apply to save changes');
  }
}

await tagEmails();
