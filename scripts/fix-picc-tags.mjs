#!/usr/bin/env node
/**
 * Fix PICC Tags - Add picc/palm-island tags to @picc.com.au contacts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixPiccTags() {
  console.log('\n=== FIXING PICC TAGS ===\n');

  // Find contacts with @picc.com.au email
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .ilike('email', '%@picc.com.au');

  console.log(`Found ${contacts?.length || 0} contacts with @picc.com.au email\n`);

  let fixed = 0;
  for (const c of contacts || []) {
    const tags = c.tags || [];
    const hasPicc = tags.includes('picc') || tags.includes('palm-island');

    if (!hasPicc) {
      const newTags = [...new Set([...tags, 'picc', 'palm-island'])];
      const { error } = await supabase
        .from('ghl_contacts')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('ghl_id', c.ghl_id);

      if (!error) {
        console.log(`  ✓ Added picc tag to: ${c.full_name} (${c.email})`);
        fixed++;
      } else {
        console.log(`  ✗ Failed: ${c.full_name} - ${error.message}`);
      }
    } else {
      console.log(`  • Already tagged: ${c.full_name}`);
    }
  }

  // Also fix "uncle allan palm island" contact
  const { data: uncleContacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags')
    .ilike('full_name', '%uncle allan%');

  for (const u of uncleContacts || []) {
    const tags = u.tags || [];
    const hasUncleAllan = tags.includes('uncle-allan') || tags.includes('palm-island-art');

    if (!hasUncleAllan) {
      const newTags = [...new Set([...tags, 'uncle-allan', 'palm-island-art', 'palm-island'])];
      const { error } = await supabase
        .from('ghl_contacts')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('ghl_id', u.ghl_id);

      if (!error) {
        console.log(`  ✓ Added uncle-allan tag to: ${u.full_name}`);
        fixed++;
      }
    }
  }

  // Also fix "creative australia" to have full PICC tags
  const { data: creative } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags')
    .ilike('full_name', '%creative australia%');

  for (const ca of creative || []) {
    const tags = ca.tags || [];
    if (!tags.includes('palm-island')) {
      const newTags = [...new Set([...tags, 'palm-island'])];
      await supabase
        .from('ghl_contacts')
        .update({ tags: newTags })
        .eq('ghl_id', ca.ghl_id);
      console.log(`  ✓ Added palm-island tag to: ${ca.full_name}`);
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} contacts\n`);
  return fixed;
}

fixPiccTags().catch(console.error);
