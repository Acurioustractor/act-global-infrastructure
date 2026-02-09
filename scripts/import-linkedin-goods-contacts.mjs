#!/usr/bin/env node
/**
 * Import LinkedIn Goods Contacts
 *
 * Imports LinkedIn connections CSV into GHL contacts with goods tags.
 * LinkedIn CSV export: Settings → Data Privacy → Get a copy of your data → Connections
 *
 * CSV format (LinkedIn default):
 *   First Name, Last Name, Email Address, Company, Position, Connected On
 *
 * USAGE:
 *   node scripts/import-linkedin-goods-contacts.mjs --file ./connections.csv [options]
 *
 * OPTIONS:
 *   --file <path>   Path to LinkedIn connections CSV (required)
 *   --dry-run       Preview without creating contacts
 *   --tag <tag>     Additional tag to apply (can be repeated)
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

/**
 * Simple CSV parser for LinkedIn export format.
 * LinkedIn uses comma-separated with quoted fields.
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // Map LinkedIn headers to our fields
  const headerMap = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase();
    if (lower.includes('first name')) headerMap.firstName = i;
    else if (lower.includes('last name')) headerMap.lastName = i;
    else if (lower.includes('email')) headerMap.email = i;
    else if (lower.includes('company')) headerMap.company = i;
    else if (lower.includes('position')) headerMap.position = i;
    else if (lower.includes('connected')) headerMap.connectedOn = i;
  });

  // Parse rows
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    return {
      firstName: fields[headerMap.firstName] || '',
      lastName: fields[headerMap.lastName] || '',
      email: fields[headerMap.email] || '',
      company: fields[headerMap.company] || '',
      position: fields[headerMap.position] || '',
      connectedOn: fields[headerMap.connectedOn] || '',
    };
  }).filter(row => row.firstName || row.email); // Skip empty rows
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LinkedIn Goods Contact Importer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;

  // Collect extra tags
  const extraTags = [];
  args.forEach((arg, i) => {
    if (arg === '--tag' && args[i + 1]) extraTags.push(args[i + 1]);
  });

  if (!filePath) {
    console.error('  ERROR: --file <path> is required');
    console.log('  Usage: node scripts/import-linkedin-goods-contacts.mjs --file ./connections.csv');
    process.exit(1);
  }

  if (dryRun) console.log('  Mode: DRY RUN');
  console.log(`  File: ${filePath}`);
  if (extraTags.length > 0) console.log(`  Extra tags: ${extraTags.join(', ')}`);
  console.log();

  // Read and parse CSV
  let csvText;
  try {
    csvText = await readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`  Failed to read file: ${err.message}`);
    process.exit(1);
  }

  const contacts = parseCSV(csvText);
  console.log(`  Parsed ${contacts.length} contacts from CSV`);

  const withEmail = contacts.filter(c => c.email);
  console.log(`  ${withEmail.length} have email addresses`);
  console.log();

  if (withEmail.length === 0) {
    console.log('  No contacts with email to import.');
    return;
  }

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let ghlService;
  try {
    ghlService = createGHLService();
  } catch (err) {
    console.error('  GHL not configured — will only create in Supabase');
    ghlService = null;
  }

  // Check which emails already exist
  const { data: existing } = await supabase
    .from('ghl_contacts')
    .select('email')
    .not('email', 'is', null);

  const existingEmails = new Set((existing || []).map(c => c.email?.toLowerCase()).filter(Boolean));

  const newContacts = withEmail.filter(c => !existingEmails.has(c.email.toLowerCase()));
  console.log(`  ${newContacts.length} are new (not in Supabase)`);
  console.log(`  ${withEmail.length - newContacts.length} already exist (will skip)`);
  console.log();

  let created = 0;
  let errors = 0;

  const baseTags = ['goods', 'linkedin', 'goods-supporter', ...extraTags];

  for (const contact of newContacts) {
    const name = `${contact.firstName} ${contact.lastName}`.trim();

    if (dryRun) {
      console.log(`  [DRY RUN] Would create: ${name} <${contact.email}> (${contact.company || 'no company'})`);
      created++;
      continue;
    }

    try {
      // Create in Supabase
      const contactId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('ghl_contacts')
        .insert({
          id: contactId,
          ghl_id: `linkedin_${contactId.slice(0, 8)}`,
          ghl_location_id: process.env.GHL_LOCATION_ID || 'linkedin_import',
          email: contact.email.toLowerCase(),
          first_name: contact.firstName,
          last_name: contact.lastName,
          company_name: contact.company || null,
          source: 'linkedin',
          tags: baseTags,
          projects: ['goods'],
          auto_created: true,
          auto_created_from: 'linkedin_import',
          enrichment_status: 'pending',
          last_synced_at: new Date().toISOString(),
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate — skip silently
          continue;
        }
        console.error(`  ERROR creating ${name}: ${insertError.message}`);
        errors++;
        continue;
      }

      // Create in GHL if available
      if (ghlService) {
        try {
          await ghlService.createContact({
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            companyName: contact.company,
            tags: baseTags,
          });
        } catch (ghlErr) {
          console.error(`  GHL create failed for ${name}: ${ghlErr.message}`);
        }
      }

      created++;
      console.log(`  Created: ${name} <${contact.email}>`);
    } catch (err) {
      console.error(`  ERROR: ${name}: ${err.message}`);
      errors++;
    }
  }

  // Summary
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  CSV contacts: ${contacts.length}`);
  console.log(`  With email: ${withEmail.length}`);
  console.log(`  Already existed: ${withEmail.length - newContacts.length}`);
  console.log(`  Created: ${created}`);
  console.log(`  Errors: ${errors}`);
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
