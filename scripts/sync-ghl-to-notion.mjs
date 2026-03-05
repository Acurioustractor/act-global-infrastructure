#!/usr/bin/env node
/**
 * GHL → Notion Sync Script
 *
 * Syncs GoHighLevel data to Notion databases:
 * - Partners: Contacts tagged "Partner"
 * - Grant Opportunities: Opportunities in "Grants" pipeline
 *
 * Runs every 6 hours via GitHub Actions
 *
 * Usage:
 *   node scripts/sync-ghl-to-notion.mjs
 *   npm run sync:ghl
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Load database IDs
const configPath = join(__dirname, '../config/notion-database-ids.json');
let databaseIds;
try {
  databaseIds = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ Error loading database IDs from config/notion-database-ids.json');
  console.error('   Make sure Partners and Grant Opportunities databases are created');
  process.exit(1);
}

// Initialize services
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const ghl = createGHLService();

// Stats tracking
const stats = {
  partners: { created: 0, updated: 0, skipped: 0, errors: 0 },
  grants: { created: 0, updated: 0, skipped: 0, errors: 0 },
  startTime: Date.now()
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARTNERS SYNC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncPartners() {
  console.log('\n🤝 Syncing Partners...\n');

  try {
    // Fetch all contacts tagged "Partner" from GHL
    const ghlPartners = await ghl.getAllContactsByTag('Partner');
    console.log(`   Found ${ghlPartners.length} partners in GHL`);

    // Get existing partners from Notion (to check for updates)
    const existingPartners = await getAllNotionPartners();
    console.log(`   Found ${existingPartners.length} existing partners in Notion`);

    // Create a map of GHL ID → Notion page ID
    const notionPartnersMap = new Map(
      existingPartners.map(p => [
        p.properties['GHL Contact ID']?.rich_text[0]?.plain_text,
        p.id
      ])
    );

    // Sync each partner
    for (const ghlPartner of ghlPartners) {
      const ghlId = ghlPartner.id;
      const existingPageId = notionPartnersMap.get(ghlId);

      try {
        if (existingPageId) {
          // Update existing partner
          await updateNotionPartner(existingPageId, ghlPartner);
          stats.partners.updated++;
          process.stdout.write('.');
        } else {
          // Create new partner
          await createNotionPartner(ghlPartner);
          stats.partners.created++;
          process.stdout.write('+');
        }
      } catch (error) {
        console.error(`\n   Error syncing partner ${ghlPartner.name}: ${error.message}`);
        stats.partners.errors++;
        process.stdout.write('!');
      }
    }

    console.log('\n   ✅ Partners sync complete');

  } catch (error) {
    console.error(`\n   ❌ Partners sync failed: ${error.message}`);
    throw error;
  }
}

async function getAllNotionPartners() {
  const partners = [];
  let cursor;

  do {
    const response = await queryDatabase(notion, databaseIds.partners, {

      start_cursor: cursor
    });

    partners.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return partners;
}

async function createNotionPartner(ghlContact) {
  const contactData = ghl.extractContactData(ghlContact);

  await notion.pages.create({
    parent: { database_id: databaseIds.partners },
    properties: {
      'Name': {
        title: [{ text: { content: contactData.name || 'Unnamed Partner' } }]
      },
      'Organization': {
        rich_text: [{ text: { content: ghlContact.company || '' } }]
      },
      'Contact Email': {
        email: contactData.email || null
      },
      'Phone': {
        phone_number: contactData.phone || null
      },
      'Tags': {
        multi_select: contactData.tags.map(tag => ({ name: tag }))
      },
      'GHL Contact ID': {
        rich_text: [{ text: { content: contactData.ghlId } }]
      },
      'Last Contact': {
        date: contactData.dateAdded ? { start: contactData.dateAdded.toISOString().split('T')[0] } : null
      },
      'Last Synced': {
        date: { start: new Date().toISOString() }
      }
    }
  });
}

async function updateNotionPartner(pageId, ghlContact) {
  const contactData = ghl.extractContactData(ghlContact);

  await notion.pages.update({
    page_id: pageId,
    properties: {
      'Name': {
        title: [{ text: { content: contactData.name || 'Unnamed Partner' } }]
      },
      'Organization': {
        rich_text: [{ text: { content: ghlContact.company || '' } }]
      },
      'Contact Email': {
        email: contactData.email || null
      },
      'Phone': {
        phone_number: contactData.phone || null
      },
      'Tags': {
        multi_select: contactData.tags.map(tag => ({ name: tag }))
      },
      'Last Synced': {
        date: { start: new Date().toISOString() }
      }
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANTS SYNC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncGrants() {
  console.log('\n💰 Syncing Grant Opportunities...\n');

  try {
    // Find the Grants pipeline
    const grantsPipeline = await ghl.getPipelineByName('Grant');
    if (!grantsPipeline) {
      console.log('   ⚠️  No Grants pipeline found in GHL, skipping grants sync');
      return;
    }

    console.log(`   Found pipeline: "${grantsPipeline.name}"`);

    // Fetch all opportunities from Grants pipeline
    const ghlGrants = await ghl.getOpportunities(grantsPipeline.id);
    console.log(`   Found ${ghlGrants.length} grant opportunities in GHL`);

    // Get existing grants from Notion
    const existingGrants = await getAllNotionGrants();
    console.log(`   Found ${existingGrants.length} existing grants in Notion`);

    // Create a map of GHL ID → Notion page ID
    const notionGrantsMap = new Map(
      existingGrants.map(g => [
        g.properties['GHL Opportunity ID']?.rich_text[0]?.plain_text,
        g.id
      ])
    );

    // Sync each grant
    for (const ghlGrant of ghlGrants) {
      const ghlId = ghlGrant.id;
      const existingPageId = notionGrantsMap.get(ghlId);

      try {
        if (existingPageId) {
          // Update existing grant
          await updateNotionGrant(existingPageId, ghlGrant);
          stats.grants.updated++;
          process.stdout.write('.');
        } else {
          // Create new grant
          await createNotionGrant(ghlGrant);
          stats.grants.created++;
          process.stdout.write('+');
        }
      } catch (error) {
        console.error(`\n   Error syncing grant ${ghlGrant.name}: ${error.message}`);
        stats.grants.errors++;
        process.stdout.write('!');
      }
    }

    console.log('\n   ✅ Grants sync complete');

  } catch (error) {
    console.error(`\n   ❌ Grants sync failed: ${error.message}`);
    throw error;
  }
}

async function getAllNotionGrants() {
  const grants = [];
  let cursor;

  do {
    const response = await queryDatabase(notion, databaseIds.grantOpportunities, {

      start_cursor: cursor
    });

    grants.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return grants;
}

async function createNotionGrant(ghlOpportunity) {
  const oppData = ghl.extractOpportunityData(ghlOpportunity);

  // Extract deadline from custom fields if available
  const deadline = ghlOpportunity.customFields?.deadline ||
    ghlOpportunity.customFields?.['Grant Deadline'];

  await notion.pages.create({
    parent: { database_id: databaseIds.grantOpportunities },
    properties: {
      'Grant Name': {
        title: [{ text: { content: oppData.name || 'Unnamed Grant' } }]
      },
      'Funder': {
        rich_text: [{ text: { content: ghlOpportunity.customFields?.funder || '' } }]
      },
      'Amount': {
        number: oppData.monetaryValue || 0
      },
      'Deadline': {
        date: deadline ? { start: deadline } : null
      },
      'Status': {
        select: { name: mapGrantStatus(oppData.status) }
      },
      'GHL Opportunity ID': {
        rich_text: [{ text: { content: oppData.ghlId } }]
      },
      'Last Synced': {
        date: { start: new Date().toISOString() }
      }
    }
  });
}

async function updateNotionGrant(pageId, ghlOpportunity) {
  const oppData = ghl.extractOpportunityData(ghlOpportunity);

  const deadline = ghlOpportunity.customFields?.deadline ||
    ghlOpportunity.customFields?.['Grant Deadline'];

  await notion.pages.update({
    page_id: pageId,
    properties: {
      'Grant Name': {
        title: [{ text: { content: oppData.name || 'Unnamed Grant' } }]
      },
      'Funder': {
        rich_text: [{ text: { content: ghlOpportunity.customFields?.funder || '' } }]
      },
      'Amount': {
        number: oppData.monetaryValue || 0
      },
      'Deadline': {
        date: deadline ? { start: deadline } : null
      },
      'Status': {
        select: { name: mapGrantStatus(oppData.status) }
      },
      'Last Synced': {
        date: { start: new Date().toISOString() }
      }
    }
  });
}

/**
 * Map GHL opportunity status to Notion grant status
 */
function mapGrantStatus(ghlStatus) {
  const statusMap = {
    'open': 'Prospective',
    'won': 'Awarded',
    'lost': 'Declined',
    'abandoned': 'Declined'
  };

  return statusMap[ghlStatus?.toLowerCase()] || 'Prospective';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   GHL → Notion Sync');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Health checks
    console.log('\n🔍 Running health checks...\n');

    const ghlHealth = await ghl.healthCheck();
    if (!ghlHealth.healthy) {
      throw new Error(`GHL API unhealthy: ${ghlHealth.error}`);
    }
    console.log('   ✅ GHL API connected');

    // Test Notion connection
    try {
      await notion.databases.retrieve({ database_id: databaseIds.partners });
      console.log('   ✅ Notion API connected');
    } catch (error) {
      throw new Error(`Notion API unhealthy: ${error.message}`);
    }

    // Run syncs
    await syncPartners();
    await syncGrants();

    // Summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   Sync Complete');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Partners:');
    console.log(`   Created: ${stats.partners.created}`);
    console.log(`   Updated: ${stats.partners.updated}`);
    console.log(`   Errors:  ${stats.partners.errors}\n`);

    console.log('Grants:');
    console.log(`   Created: ${stats.grants.created}`);
    console.log(`   Updated: ${stats.grants.updated}`);
    console.log(`   Errors:  ${stats.grants.errors}\n`);

    console.log(`⏱️  Duration: ${duration}s\n`);

    if (stats.partners.errors + stats.grants.errors > 0) {
      console.log('⚠️  Sync completed with errors (see above)');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('\nCheck:');
    console.error('  - GHL_API_KEY environment variable');
    console.error('  - GHL_LOCATION_ID environment variable');
    console.error('  - NOTION_TOKEN environment variable');
    console.error('  - Database IDs in config/notion-database-ids.json');
    console.error('  - GHL pipeline named "Grants" exists\n');
    process.exit(1);
  }
}

main();
