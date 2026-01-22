#!/usr/bin/env node
/**
 * PICC Relationship History - Pull complete context for Palm Island contacts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getPiccRelationshipHistory() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🏝️  PICC RELATIONSHIP HISTORY - Full Picture');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get all PICC-related contacts via email domain + keywords
  // Using multiple queries to capture all related contacts
  console.log('Querying PICC email domain...');
  const { data: piccEmail, error: e1 } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .ilike('email', '%@picc.com.au');
  console.log(`  → ${piccEmail?.length || 0} contacts (error: ${e1?.message || 'none'})`);

  console.log('Querying Uncle Allan...');
  const { data: uncleAllan, error: e2 } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .ilike('full_name', '%uncle allan%');
  console.log(`  → ${uncleAllan?.length || 0} contacts (error: ${e2?.message || 'none'})`);

  console.log('Querying Palm Island keywords...');
  const { data: palmIsland, error: e3 } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
    .or('full_name.ilike.%palm island%,company_name.ilike.%palm island%,company_name.ilike.%picc%');
  console.log(`  → ${palmIsland?.length || 0} contacts (error: ${e3?.message || 'none'})`);

  // Deduplicate by ghl_id
  const contactMap = new Map();
  [...(piccEmail || []), ...(uncleAllan || []), ...(palmIsland || [])].forEach(c => {
    if (c.ghl_id) contactMap.set(c.ghl_id, c);
  });
  const contacts = Array.from(contactMap.values()).sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || ''));

  console.log(`Found ${contacts?.length || 0} PICC-related contacts\n`);

  const relationshipMap = [];

  for (const contact of contacts || []) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 ${contact.full_name?.toUpperCase() || '(unnamed)'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Email: ${contact.email || 'N/A'}`);
    console.log(`   Phone: ${contact.phone || 'N/A'}`);
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

      // Show communication timeline
      console.log(`\n   📧 COMMUNICATION TIMELINE (most recent first)`);
      console.log(`   ─────────────────────────────────────────────`);

      for (const c of comms.slice(0, 10)) {
        const date = new Date(c.occurred_at).toLocaleDateString();
        const direction = c.direction === 'inbound' ? '←' : '→';
        const channel = c.channel || 'email';
        const preview = c.content_preview?.slice(0, 80) || '(no preview)';
        console.log(`   ${date} ${direction} [${channel}] ${preview}...`);
      }

      if (comms.length > 10) {
        console.log(`   ... and ${comms.length - 10} more communications`);
      }

      // Extract key topics from communications
      const allContent = comms.map(c => c.content_preview || '').join(' ').toLowerCase();
      const topics = [];
      if (allContent.includes('storm') || allContent.includes('stories')) topics.push('Storm Stories');
      if (allContent.includes('annual report')) topics.push('Annual Report');
      if (allContent.includes('centre') || allContent.includes('precinct')) topics.push('Centre Precinct');
      if (allContent.includes('hull river')) topics.push('Hull River');
      if (allContent.includes('elders')) topics.push('Elders Program');
      if (allContent.includes('art') || allContent.includes('uncle allan')) topics.push('Art Projects');
      if (allContent.includes('invoice') || allContent.includes('payment')) topics.push('Finance');
      if (allContent.includes('photobook')) topics.push('Photobook');
      if (allContent.includes('spring fair') || allContent.includes('festival')) topics.push('Events');

      if (topics.length > 0) {
        console.log(`\n   🏷️  KEY TOPICS: ${topics.join(', ')}`);
      }
    } else {
      console.log(`   ⚠️  No communication history found`);
    }

    // Get voice note mentions
    const { data: voiceNotes } = await supabase
      .from('voice_notes')
      .select('summary, recorded_at, action_items')
      .or(`mentioned_people.cs.{${contact.full_name}},transcript.ilike.%${contact.full_name?.split(' ')[0]}%`)
      .order('recorded_at', { ascending: false })
      .limit(5);

    if (voiceNotes && voiceNotes.length > 0) {
      console.log(`\n   🎤 VOICE NOTE MENTIONS`);
      console.log(`   ─────────────────────`);
      for (const v of voiceNotes) {
        const date = new Date(v.recorded_at).toLocaleDateString();
        console.log(`   ${date}: ${v.summary?.slice(0, 80) || 'No summary'}...`);
      }
    }

    // Build relationship summary
    relationshipMap.push({
      name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      totalComms,
      inbound,
      outbound,
      lastContact: comms?.[0]?.occurred_at,
      firstContact: comms?.[comms.length - 1]?.occurred_at,
      recentTopics: comms?.slice(0, 3).map(c => c.content_preview?.slice(0, 50)) || []
    });
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 PICC RELATIONSHIP SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalCommsAll = relationshipMap.reduce((sum, r) => sum + r.totalComms, 0);
  const activeContacts = relationshipMap.filter(r => r.totalComms > 0);
  const dormantContacts = relationshipMap.filter(r => r.totalComms === 0);

  console.log(`Total PICC contacts: ${relationshipMap.length}`);
  console.log(`Active (with history): ${activeContacts.length}`);
  console.log(`Dormant (no history): ${dormantContacts.length}`);
  console.log(`Total communications: ${totalCommsAll}`);

  console.log('\n📈 TOP RELATIONSHIPS (by communication volume):');
  const sorted = [...relationshipMap].sort((a, b) => b.totalComms - a.totalComms);
  for (const r of sorted.slice(0, 5)) {
    const days = r.lastContact
      ? Math.floor((Date.now() - new Date(r.lastContact)) / (1000 * 60 * 60 * 24))
      : 'never';
    console.log(`  • ${r.name}: ${r.totalComms} comms (last: ${days} days ago)`);
  }

  console.log('\n⚠️  CONTACTS NEEDING ATTENTION:');
  for (const r of dormantContacts) {
    console.log(`  • ${r.name} - No communication history`);
  }

  // Return data for further processing
  return { contacts, relationshipMap };
}

getPiccRelationshipHistory().catch(console.error);
