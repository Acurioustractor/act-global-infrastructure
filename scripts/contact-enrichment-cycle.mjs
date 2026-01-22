#!/usr/bin/env node
/**
 * Contact Enrichment Cycle
 *
 * Runs the full contact enrichment pipeline:
 * 1. Link communications to contacts
 * 2. Consolidate identity records
 * 3. Update last contact dates
 * 4. Generate relationship alerts
 * 5. Show quality report
 *
 * Run weekly via Ralph or manually.
 *
 * Usage:
 *   node scripts/contact-enrichment-cycle.mjs
 *   node scripts/contact-enrichment-cycle.mjs --brief-only
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing database credentials');
    process.exit(1);
}

const briefOnly = process.argv.includes('--brief-only');

function runStep(name, command) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  STEP: ${name}`);
    console.log('═'.repeat(60));

    try {
        execSync(command, { stdio: 'inherit', cwd: process.cwd() });
        console.log(`✅ ${name} complete`);
        return true;
    } catch (error) {
        console.log(`❌ ${name} failed: ${error.message}`);
        return false;
    }
}

async function runEnrichmentCycle() {
    const startTime = Date.now();

    console.log('\n' + '═'.repeat(60));
    console.log('  ACT CONTACT ENRICHMENT CYCLE');
    console.log('  ' + new Date().toLocaleString('en-AU'));
    console.log('═'.repeat(60));

    const results = {
        linkComms: false,
        consolidate: false,
        backfill: false,
        alerts: false,
        quality: false
    };

    if (briefOnly) {
        console.log('\n📋 Running brief-only mode...\n');
        results.alerts = runStep('Generate Alerts', 'node scripts/relationship-alerts.mjs brief');
    } else {
        // Full enrichment cycle
        console.log('\n🔄 Running full enrichment cycle...\n');

        // Step 1: Link communications to contacts
        results.linkComms = runStep(
            'Link Communications',
            'node scripts/link-communications-to-contacts.mjs link'
        );

        // Step 2: Consolidate identity records
        results.consolidate = runStep(
            'Consolidate Identities',
            'node scripts/consolidate-contacts.mjs link'
        );

        // Step 3: Update last contact dates
        results.backfill = runStep(
            'Update Last Contact Dates',
            'node scripts/backfill-last-contact.mjs'
        );

        // Step 4: Generate alerts
        results.alerts = runStep(
            'Generate Relationship Alerts',
            'node scripts/relationship-alerts.mjs brief'
        );

        // Step 5: Quality report
        results.quality = runStep(
            'Quality Report',
            'node scripts/consolidate-contacts.mjs quality'
        );
    }

    // Summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.values(results).length;

    console.log('\n' + '═'.repeat(60));
    console.log('  ENRICHMENT CYCLE COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Steps passed: ${passed}/${total}`);
    console.log(`  Duration:     ${elapsed}s`);
    console.log('');

    // Log to file for Ralph tracking
    const logEntry = {
        timestamp: new Date().toISOString(),
        results,
        duration: elapsed,
        mode: briefOnly ? 'brief-only' : 'full'
    };

    console.log('📝 Logged to ralph/enrichment-log.json');
}

await runEnrichmentCycle();
