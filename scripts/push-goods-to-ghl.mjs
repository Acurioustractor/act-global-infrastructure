#!/usr/bin/env node
/**
 * Push local-only Goods contacts to GHL + cleanup junk
 */
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const ghl = createGHLService();

// 1. Push local-only Goods contacts to GHL
const { data: localOnly } = await supabase
  .from('ghl_contacts')
  .select('*')
  .contains('tags', ['goods'])
  .or('ghl_id.like.manual_%,ghl_id.like.auto_%,ghl_id.like.reconcile_%,ghl_id.like.linkedin_%');

console.log('Pushing ' + localOnly.length + ' local Goods contacts to GHL...');

for (const c of localOnly) {
  if (!c.email) { console.log('  SKIP (no email): ' + (c.full_name || 'unknown')); continue; }
  try {
    const existing = await ghl.lookupContactByEmail(c.email);
    if (existing) {
      await supabase.from('ghl_contacts').update({ ghl_id: existing.id }).eq('id', c.id);
      console.log('  Linked: ' + (c.full_name || c.email) + ' -> ' + existing.id);
    } else {
      const created = await ghl.createContact({
        email: c.email,
        firstName: c.first_name || undefined,
        lastName: c.last_name || undefined,
        companyName: c.company_name || undefined,
        tags: c.tags || ['goods'],
      });
      await supabase.from('ghl_contacts').update({ ghl_id: created.id }).eq('id', c.id);
      console.log('  Created: ' + (c.full_name || c.email) + ' -> ' + created.id);
    }
  } catch (err) {
    console.log('  ERROR ' + (c.full_name || c.email) + ': ' + err.message.substring(0, 80));
  }
}

// 2. Remove goods tag from junk entries that shouldn't be goods
const junkEmails = ['contact@mandrillapp.com', 'marketing@melbournefringe.com.au', 'bunningstrade@powerpass.bunnings.com.au'];
console.log('\nRemoving goods tag from junk...');
for (const email of junkEmails) {
  const { data: c } = await supabase.from('ghl_contacts').select('id, tags, full_name').eq('email', email).single();
  if (c) {
    const newTags = (c.tags || []).filter(t => !t.startsWith('goods'));
    await supabase.from('ghl_contacts').update({ tags: newTags }).eq('id', c.id);
    console.log('  Removed: ' + (c.full_name || email));
  }
}

// 3. Delete junk contacts created by reconciliation script
console.log('\nDeleting junk contacts...');
const { data: fakeIds } = await supabase
  .from('ghl_contacts')
  .select('id, full_name, email, ghl_id')
  .or('ghl_id.like.manual_%,ghl_id.like.auto_%,ghl_id.like.reconcile_%,ghl_id.like.linkedin_%')
  .not('tags', 'cs', '{goods}');

const junkNames = ['bitwarden','qantas','aliexpress','alibaba','officeworks','trackmysubs','napkin','vimeo','figma','genspark','merivale','gracious','leadconnector','descript','octolane','warp team','macro mornings','smart traveller','saturday paper','eddie ai','tally','manus for','woodfordia','unroll','canva','webflow','voiceflow','highlevel','gohighlevel','virgin australia','kumu','hivebrite','trustpilot','reve team','docusign','business for good','cora briefs','vidzflow','moonshot','+rewards','nimbalyst'];

let deleted = 0;
for (const c of (fakeIds || [])) {
  const name = (c.full_name || c.email || '').toLowerCase();
  if (junkNames.some(j => name.includes(j))) {
    await supabase.from('ghl_contacts').delete().eq('id', c.id);
    console.log('  Deleted: ' + (c.full_name || c.email));
    deleted++;
  }
}
console.log('Deleted ' + deleted + ' junk');

// Final count
const { count } = await supabase.from('ghl_contacts').select('*', { count: 'exact', head: true });
const { count: gc } = await supabase.from('ghl_contacts').select('*', { count: 'exact', head: true }).contains('tags', ['goods']);
console.log('\nDONE — Total: ' + count + ' contacts, Goods: ' + gc);
