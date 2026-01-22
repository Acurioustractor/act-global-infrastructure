#!/usr/bin/env node
/**
 * ACT Contact Manager - Add, update, and track contacts across GHL and Supabase
 *
 * Usage:
 *   node scripts/contact-manager.mjs add <email> [--name "First Last"] [--company "Org"] [--tags tag1,tag2]
 *   node scripts/contact-manager.mjs lookup <email>
 *   node scripts/contact-manager.mjs tag <email> <tags>
 *   node scripts/contact-manager.mjs add-advisory   # Add missing Goods advisory members
 *   node scripts/contact-manager.mjs sync <email>   # Sync GHL contact to Supabase
 *
 * All changes are logged to agent_audit_log for knowledge tracking.
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Missing Goods advisory members (not in GHL)
const MISSING_ADVISORY = [
  {
    email: 'walkingoncountry@gmail.com',
    firstName: 'Walking on Country',
    lastName: '',
    companyName: 'Walking on Country',
    tags: ['goods', 'goods-advisory']
  },
  {
    email: 'judith@orangesky.org.au',
    firstName: 'Judith',
    lastName: '',
    companyName: 'Orange Sky',
    tags: ['goods', 'goods-advisory']
  },
  {
    email: 'adeemal@cyp.org.au',
    firstName: 'Adeem',
    lastName: '',
    companyName: 'CYP',
    tags: ['goods', 'goods-advisory']
  }
  // Note: nicholas@act.place is Ben's own account, not adding
];

/**
 * Log agent action to audit table
 */
async function logAction(action, details, result) {
  try {
    await supabase.from('agent_audit_log').insert({
      agent_name: 'contact-manager',
      action_type: action,
      entity_type: 'contact',
      entity_id: details.email,
      input_data: details,
      output_data: result,
      success: result.success !== false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not log to audit:', err.message);
  }
}

/**
 * Sync GHL contact to Supabase ghl_contacts table
 */
async function syncToSupabase(ghlContact) {
  const contactData = {
    ghl_id: ghlContact.id,
    full_name: ghlContact.name || `${ghlContact.firstName || ''} ${ghlContact.lastName || ''}`.trim(),
    email: ghlContact.email,
    phone: ghlContact.phone,
    company_name: ghlContact.companyName,
    tags: ghlContact.tags || [],
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ghl_contacts')
    .upsert(contactData, { onConflict: 'ghl_id' })
    .select()
    .single();

  if (error) {
    console.error('Supabase sync error:', error.message);
    return null;
  }

  return data;
}

/**
 * Add a new contact to GHL and sync to Supabase
 */
async function addContact(email, options = {}) {
  console.log(`\nAdding contact: ${email}`);

  try {
    const ghl = createGHLService();

    // Check if already exists
    const existing = await ghl.lookupContactByEmail(email);
    if (existing) {
      console.log(`  Contact already exists in GHL: ${existing.id}`);
      await logAction('add_contact', { email, ...options }, { success: true, existed: true, ghl_id: existing.id });
      return existing;
    }

    // Parse name if provided
    let firstName = options.firstName;
    let lastName = options.lastName;
    if (options.name && !firstName) {
      const parts = options.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    // Create in GHL
    const contactData = {
      email,
      firstName,
      lastName,
      companyName: options.company || options.companyName,
      tags: options.tags
    };

    const contact = await ghl.createContact(contactData);
    console.log(`  ✓ Created in GHL: ${contact.id}`);

    // Sync to Supabase
    const synced = await syncToSupabase(contact);
    if (synced) {
      console.log(`  ✓ Synced to Supabase`);
    }

    await logAction('add_contact', { email, ...options }, { success: true, created: true, ghl_id: contact.id });
    return contact;
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    await logAction('add_contact', { email, ...options }, { success: false, error: err.message });
    return null;
  }
}

/**
 * Lookup contact by email
 */
async function lookupContact(email) {
  console.log(`\nLooking up: ${email}`);

  // Check GHL
  try {
    const ghl = createGHLService();
    const ghlContact = await ghl.lookupContactByEmail(email);
    if (ghlContact) {
      console.log('\nGHL Contact:');
      console.log(`  ID: ${ghlContact.id}`);
      console.log(`  Name: ${ghlContact.name || `${ghlContact.firstName} ${ghlContact.lastName}`}`);
      console.log(`  Email: ${ghlContact.email}`);
      console.log(`  Phone: ${ghlContact.phone || 'N/A'}`);
      console.log(`  Company: ${ghlContact.companyName || 'N/A'}`);
      console.log(`  Tags: ${(ghlContact.tags || []).join(', ') || 'none'}`);
    } else {
      console.log('\nNot found in GHL');
    }
  } catch (err) {
    console.log(`\nGHL lookup failed: ${err.message}`);
  }

  // Check Supabase
  const { data: sbContact } = await supabase
    .from('ghl_contacts')
    .select('*')
    .ilike('email', email)
    .single();

  if (sbContact) {
    console.log('\nSupabase Contact:');
    console.log(`  GHL ID: ${sbContact.ghl_id}`);
    console.log(`  Name: ${sbContact.full_name}`);
    console.log(`  Tags: ${(sbContact.tags || []).join(', ') || 'none'}`);
    console.log(`  Last Contact: ${sbContact.last_contact_date || 'never'}`);
  } else {
    console.log('\nNot found in Supabase');
  }
}

/**
 * Add tags to existing contact
 */
async function tagContact(email, tags) {
  console.log(`\nTagging ${email} with: ${tags.join(', ')}`);

  try {
    const ghl = createGHLService();
    const contact = await ghl.lookupContactByEmail(email);

    if (!contact) {
      console.log('  ✗ Contact not found in GHL');
      return;
    }

    for (const tag of tags) {
      await ghl.addTagToContact(contact.id, tag);
      console.log(`  ✓ Added tag: ${tag}`);
    }

    // Sync to Supabase
    const updated = await ghl.getContactById(contact.id);
    await syncToSupabase(updated);
    console.log('  ✓ Synced to Supabase');

    await logAction('tag_contact', { email, tags }, { success: true, ghl_id: contact.id });
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    await logAction('tag_contact', { email, tags }, { success: false, error: err.message });
  }
}

/**
 * Add all missing Goods advisory members
 */
async function addMissingAdvisory() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🛍️  ADDING MISSING GOODS ADVISORY MEMBERS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const member of MISSING_ADVISORY) {
    const contact = await addContact(member.email, {
      firstName: member.firstName,
      lastName: member.lastName,
      companyName: member.companyName,
      tags: member.tags
    });

    if (contact) {
      console.log(`  → ${member.firstName} (${member.email}) - added\n`);
    } else {
      console.log(`  → ${member.firstName} (${member.email}) - FAILED\n`);
    }
  }

  console.log('\nNote: nicholas@act.place is Ben\'s own account, not added.');
  console.log('\nRun `npm run goods:tag` to ensure all advisory members are tagged.\n');
}

/**
 * Sync a GHL contact to Supabase
 */
async function syncContact(email) {
  console.log(`\nSyncing ${email} from GHL to Supabase...`);

  try {
    const ghl = createGHLService();
    const contact = await ghl.lookupContactByEmail(email);

    if (!contact) {
      console.log('  ✗ Contact not found in GHL');
      return;
    }

    const synced = await syncToSupabase(contact);
    if (synced) {
      console.log(`  ✓ Synced: ${synced.full_name} (${synced.ghl_id})`);
      console.log(`  Tags: ${(synced.tags || []).join(', ')}`);
    }

    await logAction('sync_contact', { email }, { success: true, ghl_id: contact.id });
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    await logAction('sync_contact', { email }, { success: false, error: err.message });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      opts.name = args[++i];
    } else if (args[i] === '--company' && args[i + 1]) {
      opts.company = args[++i];
    } else if (args[i] === '--tags' && args[i + 1]) {
      opts.tags = args[++i].split(',').map(t => t.trim());
    }
  }
  return opts;
}

async function main() {
  switch (command) {
    case 'add': {
      const email = args[1];
      if (!email) {
        console.error('Usage: contact-manager add <email> [--name "Name"] [--company "Org"] [--tags t1,t2]');
        process.exit(1);
      }
      const opts = parseArgs(args.slice(2));
      await addContact(email, opts);
      break;
    }

    case 'lookup': {
      const email = args[1];
      if (!email) {
        console.error('Usage: contact-manager lookup <email>');
        process.exit(1);
      }
      await lookupContact(email);
      break;
    }

    case 'tag': {
      const email = args[1];
      const tags = args.slice(2).join(',').split(',').map(t => t.trim()).filter(Boolean);
      if (!email || tags.length === 0) {
        console.error('Usage: contact-manager tag <email> <tag1> [tag2] ...');
        process.exit(1);
      }
      await tagContact(email, tags);
      break;
    }

    case 'add-advisory':
      await addMissingAdvisory();
      break;

    case 'sync': {
      const email = args[1];
      if (!email) {
        console.error('Usage: contact-manager sync <email>');
        process.exit(1);
      }
      await syncContact(email);
      break;
    }

    default:
      console.log(`ACT Contact Manager - Manage contacts across GHL and Supabase

Usage:
  contact-manager add <email> [--name "Name"] [--company "Org"] [--tags t1,t2]
  contact-manager lookup <email>
  contact-manager tag <email> <tag1> [tag2] ...
  contact-manager add-advisory   # Add missing Goods advisory members
  contact-manager sync <email>   # Sync GHL contact to Supabase

All changes are logged to agent_audit_log for knowledge tracking.
`);
  }
}

main().catch(console.error);
