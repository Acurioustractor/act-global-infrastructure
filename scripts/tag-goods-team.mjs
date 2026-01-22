#!/usr/bin/env node
/**
 * Tag Goods Advisory Board and Partners with role-based tags
 *
 * Tags created:
 * - goods-advisory: Advisory board members
 * - goods-partner: Implementation partners
 * - goods-funder: Funding partners
 * - goods-supplier: Product suppliers
 * - goods-design: Design partners
 * - goods-indigenous: Indigenous community partners
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ACTUAL Goods Advisory Group (verified by Ben 2026-01-21)
// Note: nicholas@act.place is Ben's own account, not tagged
const GOODS_ADVISORY_BOARD = [
  { name: 'april long', email: 'along@srau.org.au', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'cory tutt', email: 'ceo@deadlyscience.org.au', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'sally grimsley-ballard', email: 's.grimsley-ballard@snowfoundation.org.au', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'nina fitzgerald', email: 'hello@nina-fitzgerald.com', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'shaun fisher', email: 'fishers.oysters@gmail.com', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'daniel pittman', email: 'daniel.pittman@zinus.com', role: 'advisory', tags: ['goods-advisory'] },
  // Added 2026-01-21 via contact-manager
  { name: 'walking on country', email: 'walkingoncountry@gmail.com', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'judith', email: 'judith@orangesky.org.au', role: 'advisory', tags: ['goods-advisory'] },
  { name: 'adeem', email: 'adeemal@cyp.org.au', role: 'advisory', tags: ['goods-advisory'] },
];

// Goods Implementation Partners (from relationship history - high communication volume)
const GOODS_PARTNERS = [
  // Top communicators from goods:history
  { name: 'shaun christie-david', role: 'kitchen', tags: ['goods-partner', 'goods-kitchen', 'picc-connection'] },
  { name: 'victoria palmer', role: 'design', tags: ['goods-partner', 'goods-design', 'goods-grants'] },
  { name: 'anika baset', role: 'research', tags: ['goods-partner', 'goods-research'] },
  // Note: Shaun Fisher is in advisory, so not duplicated here
];

async function tagContact(searchName, newTags, role) {
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .ilike('full_name', `%${searchName}%`);

  if (!contacts || contacts.length === 0) {
    console.log(`  ? ${searchName} - NOT FOUND`);
    return null;
  }

  const contact = contacts[0];
  const existingTags = contact.tags || [];
  const tagsToAdd = newTags.filter(t => !existingTags.includes(t));

  if (tagsToAdd.length === 0) {
    console.log(`  = ${contact.full_name} (${role}) - already tagged`);
    return contact;
  }

  const updatedTags = [...new Set([...existingTags, ...newTags])];
  const { error } = await supabase
    .from('ghl_contacts')
    .update({ tags: updatedTags, updated_at: new Date().toISOString() })
    .eq('ghl_id', contact.ghl_id);

  if (error) {
    console.log(`  x ${contact.full_name} - ERROR: ${error.message}`);
    return null;
  }

  console.log(`  + ${contact.full_name} (${role}) - added: ${tagsToAdd.join(', ')}`);
  return contact;
}

async function tagGoodsTeam() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🛍️  TAGGING GOODS ADVISORY BOARD & PARTNERS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Tag Advisory Board
  console.log('ADVISORY BOARD:');
  console.log('─'.repeat(50));
  for (const member of GOODS_ADVISORY_BOARD) {
    await tagContact(member.name, member.tags, member.role);
  }

  // Tag Partners
  console.log('\nIMPLEMENTATION PARTNERS:');
  console.log('─'.repeat(50));
  for (const partner of GOODS_PARTNERS) {
    await tagContact(partner.name, partner.tags, partner.role);
  }

  // Show summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 GOODS TEAM SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Query advisory board
  const { data: advisory } = await supabase
    .from('ghl_contacts')
    .select('full_name, email, tags')
    .contains('tags', ['goods-advisory'])
    .order('full_name');

  console.log('ADVISORY BOARD:');
  for (const a of advisory || []) {
    const roles = (a.tags || []).filter(t => t.startsWith('goods-') && t !== 'goods-advisory' && t !== 'goods').join(', ');
    console.log(`  • ${a.full_name} - ${a.email || 'no email'}`);
    console.log(`    Roles: ${roles}`);
  }

  // Query partners
  const { data: partners } = await supabase
    .from('ghl_contacts')
    .select('full_name, email, tags')
    .contains('tags', ['goods-partner'])
    .order('full_name');

  console.log('\nPARTNERS:');
  for (const p of partners || []) {
    const roles = (p.tags || []).filter(t => t.startsWith('goods-') && t !== 'goods-partner' && t !== 'goods').join(', ');
    console.log(`  • ${p.full_name} - ${p.email || 'no email'}`);
    console.log(`    Roles: ${roles}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🏷️  TAG REFERENCE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('  goods-advisory  - Advisory board members');
  console.log('  goods-partner   - Implementation partners');
  console.log('  goods-lead      - Project lead');
  console.log('  goods-funder    - Funding partners');
  console.log('  goods-supplier  - Product suppliers');
  console.log('  goods-design    - Design partners');
  console.log('  goods-research  - Research partners');
  console.log('  goods-kitchen   - Kitchen/food partners');
  console.log('  goods-indigenous - Indigenous community partners');
  console.log('  goods-grants    - Grant-related partners');
  console.log('  picc-connection - Also connected to PICC\n');

  return { advisory: advisory?.length || 0, partners: partners?.length || 0 };
}

tagGoodsTeam().catch(console.error);
