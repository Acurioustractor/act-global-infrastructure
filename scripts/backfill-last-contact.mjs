#!/usr/bin/env node
/**
 * Backfill Last Contact Date
 *
 * Updates ghl_contacts.last_contact_date from communications_history.
 * Run this once to populate missing data, then rely on triggers.
 *
 * Usage:
 *   node scripts/backfill-last-contact.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

async function backfillLastContact() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Backfilling Last Contact Dates');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all GHL contacts
    const { data: contacts, error: contactError } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, last_contact_date');

    if (contactError) {
        console.error('Error fetching contacts:', contactError.message);
        process.exit(1);
    }

    console.log(`Found ${contacts.length} GHL contacts`);

    // Count those without last_contact_date
    const needsUpdate = contacts.filter(c => !c.last_contact_date);
    console.log(`${needsUpdate.length} contacts missing last_contact_date`);
    console.log('');

    let updated = 0;
    let skipped = 0;
    let noComms = 0;

    for (const contact of contacts) {
        // Get most recent communication for this contact
        const { data: lastComm } = await supabase
            .from('communications_history')
            .select('occurred_at')
            .eq('ghl_contact_id', contact.ghl_id)
            .order('occurred_at', { ascending: false })
            .limit(1);

        if (lastComm && lastComm.length > 0) {
            const lastDate = lastComm[0].occurred_at;

            // Update if different or missing
            if (!contact.last_contact_date || new Date(lastDate) > new Date(contact.last_contact_date)) {
                const { error } = await supabase
                    .from('ghl_contacts')
                    .update({ last_contact_date: lastDate })
                    .eq('ghl_id', contact.ghl_id);

                if (!error) {
                    updated++;
                    if (updated % 50 === 0) {
                        process.stdout.write(`\r  Updated: ${updated}`);
                    }
                }
            } else {
                skipped++;
            }
        } else {
            noComms++;
        }
    }

    console.log(`\r  Updated: ${updated}                    `);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Results');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Updated:          ${updated}`);
    console.log(`  Already current:  ${skipped}`);
    console.log(`  No communications: ${noComms}`);
    console.log('');
    console.log('Done! Run relationship-alerts.mjs brief to see updated alerts.');
}

await backfillLastContact();
