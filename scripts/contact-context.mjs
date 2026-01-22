#!/usr/bin/env node
/**
 * Contact Context Pull
 *
 * Pull full context for a contact before meetings or decisions.
 * Aggregates data from multiple sources:
 *
 * - GHL contact profile (tags, temperature, last contact)
 * - Recent voice notes mentioning them
 * - Communications history (emails, calls, messages)
 * - Project involvement
 * - Relationship health score
 * - Open opportunities/invoices
 *
 * Usage:
 *   node scripts/contact-context.mjs "Kristy Bloomfield"
 *   node scripts/contact-context.mjs --email kristy@example.com
 *   node scripts/contact-context.mjs --id <ghl_contact_id>
 *   node scripts/contact-context.mjs --project ACT-DG    # All contacts for project
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes');
}

// ============================================================================
// CONTACT LOOKUP
// ============================================================================

async function findContact(searchTerm) {
  if (!supabase) {
    console.error('Database connection required');
    return null;
  }

  // Try by ID first (if it looks like a GHL ID)
  if (searchTerm.includes('-') || searchTerm.length > 20) {
    const { data: byId } = await supabase
      .from('ghl_contacts')
      .select('*')
      .eq('ghl_id', searchTerm)
      .single();

    if (byId) return byId;
  }

  // Try by email
  if (searchTerm.includes('@')) {
    const { data: byEmail } = await supabase
      .from('ghl_contacts')
      .select('*')
      .ilike('email', searchTerm)
      .limit(1);

    if (byEmail && byEmail.length > 0) return byEmail[0];
  }

  // Try by name (fuzzy match)
  const { data: byName } = await supabase
    .from('ghl_contacts')
    .select('*')
    .or(`full_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
    .limit(10);

  if (byName && byName.length === 1) {
    return byName[0];
  } else if (byName && byName.length > 1) {
    // Multiple matches - ask user to be more specific
    console.log(`\nFound ${byName.length} contacts matching "${searchTerm}":\n`);
    byName.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.full_name || c.email} - ${(c.tags || []).slice(0, 3).join(', ')}`);
    });
    console.log('\nBe more specific or use --email or --id to select one.\n');
    return null;
  }

  return null;
}

async function findContactsByProject(projectCode) {
  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  const normalizedCode = projectCode.toUpperCase().startsWith('ACT-')
    ? projectCode.toUpperCase()
    : `ACT-${projectCode.toUpperCase()}`;

  const project = PROJECT_CODES.projects?.[normalizedCode];
  const tags = project?.ghl_tags || [projectCode.toLowerCase()];

  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('*')
    .overlaps('tags', tags)
    .order('last_contact_date', { ascending: false })
    .limit(50);

  return contacts || [];
}

// ============================================================================
// CONTEXT GATHERING
// ============================================================================

async function gatherContactContext(contact) {
  const context = {
    contact,
    voiceNotes: [],
    communications: [],
    projects: [],
    relationshipHealth: null,
    opportunities: [],
    summary: {}
  };

  if (!supabase || !contact) return context;

  const ghlId = contact.ghl_id;
  const name = contact.full_name || '';

  // 1. Get voice notes mentioning this person
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('*')
    .or(`mentioned_people.cs.{${name}},transcript.ilike.%${name}%,related_contact_id.eq.${ghlId}`)
    .order('recorded_at', { ascending: false })
    .limit(10);

  context.voiceNotes = voiceNotes || [];

  // 2. Get communications history
  const { data: comms } = await supabase
    .from('communications_history')
    .select('*')
    .eq('ghl_contact_id', ghlId)
    .order('occurred_at', { ascending: false })
    .limit(20);

  context.communications = comms || [];

  // 3. Get relationship health
  const { data: health } = await supabase
    .from('relationship_health')
    .select('*')
    .eq('ghl_contact_id', ghlId)
    .single();

  context.relationshipHealth = health;

  // 4. Determine project involvement from tags
  const contactTags = (contact.tags || []).map(t => t.toLowerCase());
  context.projects = Object.entries(PROJECT_CODES.projects || {})
    .filter(([_, proj]) =>
      (proj.ghl_tags || []).some(t => contactTags.includes(t.toLowerCase()))
    )
    .map(([code, proj]) => ({ code, name: proj.name, category: proj.category }));

  // 5. Get opportunities (if table exists)
  try {
    const { data: opps } = await supabase
      .from('opportunities')
      .select('*')
      .eq('contact_id', ghlId)
      .order('created_at', { ascending: false })
      .limit(5);

    context.opportunities = opps || [];
  } catch (e) {
    // Table may not exist
  }

  // 6. Generate summary stats
  const daysSinceContact = contact.last_contact_date
    ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const inboundComms = context.communications.filter(c => c.direction === 'inbound').length;
  const outboundComms = context.communications.filter(c => c.direction === 'outbound').length;

  context.summary = {
    daysSinceContact,
    totalCommunications: context.communications.length,
    inboundComms,
    outboundComms,
    voiceNoteMentions: context.voiceNotes.length,
    projectCount: context.projects.length,
    temperature: context.relationshipHealth?.temperature || null,
    lastChannel: context.communications[0]?.channel || null
  };

  return context;
}

// ============================================================================
// DISPLAY
// ============================================================================

function displayContactContext(context) {
  const { contact, summary } = context;

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  CONTACT CONTEXT');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Contact Profile
  console.log('📇 CONTACT PROFILE');
  console.log('-'.repeat(75));
  console.log(`  Name:         ${contact.full_name || 'Unknown'}`);
  console.log(`  Email:        ${contact.email || 'N/A'}`);
  console.log(`  Phone:        ${contact.phone || 'N/A'}`);
  console.log(`  Company:      ${contact.company_name || 'N/A'}`);
  console.log(`  Tags:         ${(contact.tags || []).join(', ') || 'None'}`);
  console.log('');

  // Relationship Status
  console.log('💗 RELATIONSHIP STATUS');
  console.log('-'.repeat(75));

  const tempEmoji = summary.temperature >= 70 ? '🔥' :
                    summary.temperature >= 40 ? '🌡️' :
                    summary.temperature < 40 ? '❄️' : '⚪';

  console.log(`  Temperature:  ${tempEmoji} ${summary.temperature || 'Unknown'}`);
  console.log(`  Last Contact: ${summary.daysSinceContact !== null ? `${summary.daysSinceContact} days ago` : 'Unknown'}`);
  console.log(`  Last Channel: ${summary.lastChannel || 'Unknown'}`);

  if (context.relationshipHealth) {
    console.log(`  Stage:        ${context.relationshipHealth.lcaa_stage || 'Unknown'}`);
    console.log(`  Trend:        ${context.relationshipHealth.temperature_trend || 'Stable'}`);

    if (context.relationshipHealth.risk_flags?.length > 0) {
      console.log(`  ⚠️ Flags:     ${context.relationshipHealth.risk_flags.join(', ')}`);
    }

    if (context.relationshipHealth.suggested_actions?.length > 0) {
      console.log(`  💡 Suggest:   ${context.relationshipHealth.suggested_actions[0]}`);
    }
  }
  console.log('');

  // Voice Notes
  if (context.voiceNotes.length > 0) {
    console.log('🎙️ RECENT VOICE NOTES');
    console.log('-'.repeat(75));

    context.voiceNotes.slice(0, 5).forEach(vn => {
      const date = new Date(vn.recorded_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short'
      });
      const excerpt = (vn.summary || vn.transcript || '').slice(0, 80);
      const project = vn.project_context ? `[${vn.project_context}]` : '';
      console.log(`  ${date} ${project}: "${excerpt}..."`);
    });
    console.log('');
  }

  // Communications
  if (context.communications.length > 0) {
    console.log('📧 RECENT COMMUNICATIONS');
    console.log('-'.repeat(75));

    context.communications.slice(0, 7).forEach(c => {
      const date = new Date(c.occurred_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short'
      });
      const direction = c.direction === 'inbound' ? '←' : '→';
      const channelEmoji = {
        email: '📧',
        sms: '💬',
        call: '📞',
        calendar: '📅',
        whatsapp: '💬'
      }[c.channel] || '📝';

      const subject = c.subject || c.content_preview?.slice(0, 50) || c.channel;
      console.log(`  ${date} ${channelEmoji} ${direction} ${subject}`);
    });
    console.log('');
  }

  // Projects
  if (context.projects.length > 0) {
    console.log('📋 PROJECT INVOLVEMENT');
    console.log('-'.repeat(75));

    context.projects.forEach(p => {
      const icon = PROJECT_CODES.categories?.[p.category]?.icon || '📋';
      console.log(`  ${icon} ${p.code}: ${p.name}`);
    });
    console.log('');
  }

  // Opportunities
  if (context.opportunities.length > 0) {
    console.log('💰 OPPORTUNITIES');
    console.log('-'.repeat(75));

    context.opportunities.forEach(o => {
      const value = o.monetary_value ? `$${o.monetary_value.toLocaleString()}` : 'N/A';
      console.log(`  ${o.name || 'Opportunity'}: ${value} (${o.status || 'unknown'})`);
    });
    console.log('');
  }

  // Quick Stats
  console.log('📊 SUMMARY');
  console.log('-'.repeat(75));
  console.log(`  Total Communications:  ${summary.totalCommunications} (${summary.inboundComms} in, ${summary.outboundComms} out)`);
  console.log(`  Voice Note Mentions:   ${summary.voiceNoteMentions}`);
  console.log(`  Projects:              ${summary.projectCount}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
}

function displayProjectContacts(contacts, projectCode) {
  const project = PROJECT_CODES.projects?.[projectCode.toUpperCase()];

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log(`  Contacts for ${projectCode}${project ? ` - ${project.name}` : ''}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  if (contacts.length === 0) {
    console.log('No contacts found for this project.\n');
    return;
  }

  console.log('Name'.padEnd(30) + 'Email'.padEnd(30) + 'Last Contact');
  console.log('-'.repeat(75));

  contacts.forEach(c => {
    const lastContact = c.last_contact_date
      ? new Date(c.last_contact_date).toLocaleDateString('en-AU')
      : 'Never';

    console.log(
      (c.full_name || 'Unknown').slice(0, 28).padEnd(30) +
      (c.email || '').slice(0, 28).padEnd(30) +
      lastContact
    );
  });

  console.log('');
  console.log(`Total: ${contacts.length} contacts`);
  console.log('');
  console.log('To get full context for a contact:');
  console.log(`  node scripts/contact-context.mjs "${contacts[0]?.full_name || 'Name'}"`);
  console.log('');
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    search: null,
    email: null,
    id: null,
    project: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--email' || arg === '-e') {
      options.email = args[++i];
    } else if (arg === '--id') {
      options.id = args[++i];
    } else if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      options.search = arg;
    }
  }

  return options;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Contact Context Pull

Pull full context for a contact before meetings or decisions.

Usage:
  node scripts/contact-context.mjs "Name"              Search by name
  node scripts/contact-context.mjs --email <email>     Search by email
  node scripts/contact-context.mjs --id <ghl_id>       Search by GHL ID
  node scripts/contact-context.mjs --project <code>    List project contacts

Options:
  --email, -e   Search by email address
  --id          Search by GHL contact ID
  --project, -p List all contacts for a project
  --help, -h    Show this help

Examples:
  node scripts/contact-context.mjs "Kristy Bloomfield"
  node scripts/contact-context.mjs --email kristy@example.com
  node scripts/contact-context.mjs --project ACT-DG

Context Includes:
  - Contact profile and tags
  - Relationship temperature and health
  - Recent voice notes mentioning them
  - Communication history
  - Project involvement
  - Open opportunities
`);
    return;
  }

  if (!supabase) {
    console.error('Error: Database connection required. Check SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  // Handle project contact list
  if (options.project) {
    const contacts = await findContactsByProject(options.project);
    displayProjectContacts(contacts, options.project);
    return;
  }

  // Find the contact
  const searchTerm = options.id || options.email || options.search;

  if (!searchTerm) {
    console.log('Please provide a contact name, email, or ID.');
    console.log('Run with --help for usage information.');
    process.exit(1);
  }

  const contact = await findContact(searchTerm);

  if (!contact) {
    console.log(`\nNo contact found for "${searchTerm}"`);
    console.log('Try:');
    console.log('  - Checking the spelling');
    console.log('  - Using their email address: --email person@example.com');
    console.log('  - Listing project contacts: --project ACT-XX\n');
    process.exit(1);
  }

  // Gather and display context
  const context = await gatherContactContext(contact);
  displayContactContext(context);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
