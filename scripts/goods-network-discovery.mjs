#!/usr/bin/env node
/**
 * Goods Network Discovery
 *
 * Analyzes communication graph to find potential Goods contacts:
 * 1. Email addresses in threads WITH Goods contacts but aren't contacts themselves
 * 2. Contacts in adjacent tags (community, the-harvest) who might be Goods-relevant
 * 3. Outputs recommendations
 *
 * USAGE:
 *   node scripts/goods-network-discovery.mjs [options]
 *
 * OPTIONS:
 *   --days N      Look back N days (default: 60)
 *   --verbose     Show detailed output
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Goods Network Discovery');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1]) : 60;

  console.log(`  Lookback: ${days} days`);
  console.log();

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const since = new Date();
  since.setDate(since.getDate() - days);

  // 1. Find email addresses in GOODS-tagged threads that aren't contacts
  console.log('  1. Scanning GOODS communications for unknown addresses...');

  const { data: goodsComms, error: commsError } = await supabase
    .from('communications_history')
    .select('from_address, to_address, subject, event_date')
    .contains('project_codes', ['GOODS'])
    .gte('event_date', since.toISOString())
    .order('event_date', { ascending: false });

  if (commsError) {
    console.error('  Failed to query communications:', commsError.message);
    process.exit(1);
  }

  // Extract unique email addresses from these threads
  const threadEmails = new Set();
  for (const comm of (goodsComms || [])) {
    if (comm.from_address) threadEmails.add(comm.from_address.toLowerCase());
    if (comm.to_address) threadEmails.add(comm.to_address.toLowerCase());
  }

  // Filter out our own domains and no-reply
  const ownDomains = ['act.place', 'acurioustractor.com', 'akindtractor.org'];
  const filtered = [...threadEmails].filter(email => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    if (ownDomains.includes(domain)) return false;
    if (email.startsWith('noreply') || email.startsWith('no-reply')) return false;
    return true;
  });

  // Check which are NOT already contacts
  const { data: existingContacts } = await supabase
    .from('ghl_contacts')
    .select('email')
    .not('email', 'is', null);

  const existingEmails = new Set((existingContacts || []).map(c => c.email?.toLowerCase()).filter(Boolean));

  const unknownEmails = filtered.filter(email => !existingEmails.has(email));

  console.log(`  Found ${filtered.length} unique external emails in GOODS threads`);
  console.log(`  ${unknownEmails.length} are NOT existing contacts`);
  console.log();

  if (unknownEmails.length > 0) {
    console.log('  Potential new Goods contacts (from communication threads):');
    for (const email of unknownEmails.slice(0, 20)) {
      // Find the subject they appeared in
      const comm = (goodsComms || []).find(c =>
        c.from_address?.toLowerCase() === email || c.to_address?.toLowerCase() === email
      );
      console.log(`    - ${email}${comm?.subject ? ` (thread: "${comm.subject.substring(0, 50)}")` : ''}`);
    }
    if (unknownEmails.length > 20) {
      console.log(`    ... and ${unknownEmails.length - 20} more`);
    }
    console.log();
  }

  // 2. Find contacts with adjacent tags who might be Goods-relevant
  console.log('  2. Scanning adjacent tags for potential Goods contacts...');

  const adjacentTags = ['community', 'the-harvest', 'act-farm', 'partner'];
  const { data: adjacentContacts, error: adjError } = await supabase
    .from('ghl_contacts')
    .select('id, full_name, email, tags')
    .not('tags', 'cs', '{"goods"}');  // Does NOT have goods tag

  if (adjError) {
    console.error('  Failed to query adjacent contacts:', adjError.message);
  } else {
    const adjacentMatches = (adjacentContacts || []).filter(c => {
      const tags = (c.tags || []).map(t => t.toLowerCase());
      return adjacentTags.some(at => tags.includes(at));
    });

    console.log(`  ${adjacentMatches.length} contacts in adjacent tags without 'goods' tag`);

    if (verbose && adjacentMatches.length > 0) {
      console.log();
      console.log('  Adjacent contacts that could be Goods-relevant:');
      for (const c of adjacentMatches.slice(0, 15)) {
        console.log(`    - ${c.full_name || c.email || 'Unknown'} [${(c.tags || []).join(', ')}]`);
      }
      if (adjacentMatches.length > 15) {
        console.log(`    ... and ${adjacentMatches.length - 15} more`);
      }
    }
  }

  // Summary
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Unknown emails in GOODS threads: ${unknownEmails.length}`);
  console.log(`  GOODS communications scanned: ${(goodsComms || []).length}`);
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
