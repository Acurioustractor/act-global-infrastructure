#!/usr/bin/env node
/**
 * Goods Relationship History - Pull complete context for Goods project contacts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getGoodsRelationshipHistory() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🛍️  GOODS RELATIONSHIP HISTORY - Full Picture');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get all Goods-tagged contacts
  console.log('Querying Goods tagged contacts...');
  const { data: goodsTagged, error: e1 } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .contains('tags', ['goods']);
  console.log(`  → ${goodsTagged?.length || 0} contacts with 'goods' tag`);

  // Also search by keyword
  console.log('Querying Goods keyword contacts...');
  const { data: goodsKeyword, error: e2 } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .or('full_name.ilike.%goods%,company_name.ilike.%goods%,email.ilike.%goods%');
  console.log(`  → ${goodsKeyword?.length || 0} contacts with 'goods' keyword`);

  // Search for Maddi (lead)
  console.log('Querying Maddi Alderuccio (project lead)...');
  const { data: maddi } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .ilike('full_name', '%maddi%');
  console.log(`  → ${maddi?.length || 0} Maddi contacts found`);

  // Deduplicate
  const contactMap = new Map();
  [...(goodsTagged || []), ...(goodsKeyword || []), ...(maddi || [])].forEach(c => {
    if (c.ghl_id) contactMap.set(c.ghl_id, c);
  });
  const contacts = Array.from(contactMap.values()).sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || ''));

  console.log(`\nFound ${contacts.length} total Goods-related contacts\n`);

  const relationshipMap = [];

  for (const contact of contacts) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 ${contact.full_name?.toUpperCase() || '(unnamed)'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Email: ${contact.email || 'N/A'}`);
    console.log(`   Phone: ${contact.phone || 'N/A'}`);
    console.log(`   Company: ${contact.company_name || 'N/A'}`);
    console.log(`   Tags: ${(contact.tags || []).join(', ')}`);

    // Get ALL communications for this contact
    const { data: comms } = await supabase
      .from('communications_history')
      .select('*')
      .eq('ghl_contact_id', contact.ghl_id)
      .order('occurred_at', { ascending: false });

    const totalComms = comms?.length || 0;
    const inbound = comms?.filter(c => c.direction === 'inbound').length || 0;
    const outbound = comms?.filter(c => c.direction === 'outbound').length || 0;

    console.log(`\n   📊 COMMUNICATION STATS`);
    console.log(`   ─────────────────────`);
    console.log(`   Total: ${totalComms} | Inbound: ${inbound} | Outbound: ${outbound}`);

    if (comms && comms.length > 0) {
      const firstContact = comms[comms.length - 1];
      const lastContact = comms[0];
      console.log(`   First contact: ${new Date(firstContact.occurred_at).toLocaleDateString()}`);
      console.log(`   Last contact: ${new Date(lastContact.occurred_at).toLocaleDateString()}`);

      // Show communication timeline with subjects
      console.log(`\n   📧 RECENT COMMUNICATIONS`);
      console.log(`   ─────────────────────────`);

      for (const c of comms.slice(0, 10)) {
        const date = new Date(c.occurred_at).toLocaleDateString();
        const direction = c.direction === 'inbound' ? '←' : '→';
        const subject = c.subject || '(no subject)';
        console.log(`   ${date} ${direction} ${subject.slice(0, 60)}`);
      }

      if (comms.length > 10) {
        console.log(`   ... and ${comms.length - 10} more communications`);
      }

      // Extract key topics
      const allContent = comms.map(c => (c.subject || '') + ' ' + (c.content_preview || '')).join(' ').toLowerCase();
      const topics = [];
      if (allContent.includes('marketplace') || allContent.includes('platform')) topics.push('Marketplace');
      if (allContent.includes('invoice') || allContent.includes('payment')) topics.push('Finance');
      if (allContent.includes('partner') || allContent.includes('supplier')) topics.push('Partnerships');
      if (allContent.includes('launch') || allContent.includes('pilot')) topics.push('Launch');
      if (allContent.includes('social enterprise') || allContent.includes('impact')) topics.push('Social Enterprise');
      if (allContent.includes('funding') || allContent.includes('grant')) topics.push('Funding');
      if (allContent.includes('workshop') || allContent.includes('training')) topics.push('Training');
      if (allContent.includes('picc') || allContent.includes('palm island')) topics.push('PICC Connection');

      if (topics.length > 0) {
        console.log(`\n   🏷️  KEY TOPICS: ${topics.join(', ')}`);
      }
    } else {
      console.log(`   ⚠️  No communication history found`);
    }

    // Build relationship summary
    relationshipMap.push({
      name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company_name,
      totalComms,
      inbound,
      outbound,
      lastContact: comms?.[0]?.occurred_at,
      firstContact: comms?.[comms.length - 1]?.occurred_at,
      recentSubjects: comms?.slice(0, 3).map(c => c.subject) || []
    });
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 GOODS RELATIONSHIP SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalCommsAll = relationshipMap.reduce((sum, r) => sum + r.totalComms, 0);
  const activeContacts = relationshipMap.filter(r => r.totalComms > 0);
  const dormantContacts = relationshipMap.filter(r => r.totalComms === 0);

  console.log(`Total Goods contacts: ${relationshipMap.length}`);
  console.log(`Active (with history): ${activeContacts.length}`);
  console.log(`Dormant (no history): ${dormantContacts.length}`);
  console.log(`Total communications: ${totalCommsAll}`);

  console.log('\n📈 TOP RELATIONSHIPS (by communication volume):');
  const sorted = [...relationshipMap].sort((a, b) => b.totalComms - a.totalComms);
  for (const r of sorted.slice(0, 10)) {
    const days = r.lastContact
      ? Math.floor((Date.now() - new Date(r.lastContact)) / (1000 * 60 * 60 * 24))
      : 'never';
    console.log(`  • ${r.name}: ${r.totalComms} comms (last: ${days} days ago)`);
  }

  if (dormantContacts.length > 0) {
    console.log('\n⚠️  CONTACTS NEEDING ATTENTION (no history):');
    for (const r of dormantContacts.slice(0, 10)) {
      console.log(`  • ${r.name} - ${r.email || 'No email'}`);
    }
  }

  // Return data for further processing
  return { contacts, relationshipMap };
}

getGoodsRelationshipHistory().catch(console.error);
