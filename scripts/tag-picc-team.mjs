#!/usr/bin/env node
/**
 * Tag all PICC organization contacts with 'picc-team'
 * This allows focused discussion on the PICC relationship
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function tagPiccTeam() {
  console.log('\n=== TAGGING PICC TEAM CONTACTS ===\n');

  // Find all PICC organization contacts by email domain
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .ilike('email', '%@picc.com.au');

  console.log(`Found ${contacts?.length || 0} @picc.com.au contacts\n`);

  let updated = 0;
  for (const c of contacts || []) {
    const tags = c.tags || [];
    const hasTag = tags.includes('picc-team');

    if (!hasTag) {
      const newTags = [...new Set([...tags, 'picc-team'])];
      const { error } = await supabase
        .from('ghl_contacts')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('ghl_id', c.ghl_id);

      if (!error) {
        console.log(`  + ${c.full_name} (${c.email})`);
        updated++;
      } else {
        console.log(`  x ${c.full_name} - Error: ${error.message}`);
      }
    } else {
      console.log(`  = ${c.full_name} (already tagged)`);
    }
  }

  // Also tag Uncle Allan
  const { data: uncle } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags')
    .ilike('full_name', '%uncle allan%');

  for (const u of uncle || []) {
    const tags = u.tags || [];
    const hasTag = tags.includes('picc-team');

    if (!hasTag) {
      const newTags = [...new Set([...tags, 'picc-team'])];
      const { error } = await supabase
        .from('ghl_contacts')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('ghl_id', u.ghl_id);

      if (!error) {
        console.log(`  + ${u.full_name} (Uncle Allan - art project)`);
        updated++;
      }
    }
  }

  console.log(`\n✅ Tagged ${updated} contacts with 'picc-team'\n`);

  // Show final list
  const { data: tagged } = await supabase
    .from('ghl_contacts')
    .select('full_name, email, tags')
    .contains('tags', ['picc-team'])
    .order('full_name');

  console.log('=== PICC TEAM CONTACTS ===\n');
  for (const t of tagged || []) {
    console.log(`  • ${t.full_name} - ${t.email || 'No email'}`);
  }
  console.log(`\nTotal: ${tagged?.length || 0} contacts with picc-team tag`);
}

tagPiccTeam().catch(console.error);
