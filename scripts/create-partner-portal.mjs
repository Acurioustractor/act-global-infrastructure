#!/usr/bin/env node
/**
 * Partner Portal Generator
 *
 * Creates shareable Notion portal pages for partners.
 * Each partner gets a custom collaborative workspace with:
 * - Project overview
 * - Shared resources
 * - Communication log
 * - Next steps
 *
 * Usage:
 *   node scripts/create-partner-portal.mjs <partner-name>
 *   node scripts/create-partner-portal.mjs "Sarah Johnson"
 *   npm run partner:portal "Acme Corporation"
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const configPath = join(__dirname, '../config/notion-database-ids.json');
let databaseIds;
try {
  databaseIds = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ Error loading database IDs from config/notion-database-ids.json');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARTNER LOOKUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Find partner by name in Notion Partners database
 */
async function findPartner(partnerName) {
  console.log(`🔍 Searching for partner: "${partnerName}"\n`);

  const response = await notion.databases.query({
    database_id: databaseIds.partners,
    filter: {
      property: 'Name',
      title: {
        contains: partnerName
      }
    }
  });

  if (response.results.length === 0) {
    return null;
  }

  if (response.results.length > 1) {
    console.log(`⚠️  Found ${response.results.length} partners matching "${partnerName}":\n`);
    response.results.forEach((p, i) => {
      const name = p.properties['Name']?.title[0]?.plain_text || 'Unnamed';
      const org = p.properties['Organization']?.rich_text[0]?.plain_text || '';
      console.log(`   ${i + 1}. ${name}${org ? ` (${org})` : ''}`);
    });
    console.log('\nPlease be more specific.\n');
    return 'multiple';
  }

  return response.results[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PORTAL PAGE CREATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create portal page with template structure
 */
async function createPortalPage(partnerPageId, partnerData) {
  console.log('📄 Creating portal page...\n');

  const partnerName = partnerData.name;
  const organization = partnerData.organization || partnerName;

  // Create a new page as a child of the partner's database entry
  const portalPage = await notion.pages.create({
    parent: { page_id: partnerPageId },
    icon: { emoji: '🤝' },
    properties: {
      title: {
        title: [{ text: { content: `${organization} Portal` } }]
      }
    },
    children: [
      // Header
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: `Welcome, ${partnerName}!` } }],
          color: 'default'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: {
              content: `This is your dedicated portal for collaboration with A Curious Tractor (ACT). Here you'll find project updates, shared resources, and communication logs.`
            }
          }]
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },

      // Project Overview Section
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📋 Project Overview' } }],
          color: 'default'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: 'Current projects and initiatives we\'re working on together:' }
          }]
        }
      },
      {
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ text: { content: 'Add project details here' } }],
          checked: false
        }
      },

      // Shared Resources Section
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📚 Shared Resources' } }],
          color: 'default'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: 'Documents, links, and materials relevant to our collaboration:' }
          }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Add resources here' } }]
        }
      },

      // Communication Log Section
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '💬 Communication Log' } }],
          color: 'default'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: 'Record of meetings, emails, and key conversations:' }
          }]
        }
      },
      {
        object: 'block',
        type: 'table',
        table: {
          table_width: 3,
          has_column_header: true,
          has_row_header: false,
          children: [
            // Header row
            {
              type: 'table_row',
              table_row: {
                cells: [
                  [{ text: { content: 'Date' } }],
                  [{ text: { content: 'Type' } }],
                  [{ text: { content: 'Notes' } }]
                ]
              }
            },
            // Example row
            {
              type: 'table_row',
              table_row: {
                cells: [
                  [{ text: { content: new Date().toISOString().split('T')[0] } }],
                  [{ text: { content: 'Portal Created' } }],
                  [{ text: { content: 'Initial setup' } }]
                ]
              }
            }
          ]
        }
      },

      // Next Steps Section
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🎯 Next Steps' } }],
          color: 'default'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: 'Action items and upcoming milestones:' }
          }]
        }
      },
      {
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ text: { content: 'Schedule next check-in meeting' } }],
          checked: false
        }
      },

      // Footer
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{
            text: {
              content: '💡 This page is collaborative. Feel free to add notes, questions, or updates anytime. ACT will respond within 24 hours.'
            }
          }],
          icon: { emoji: '💡' },
          color: 'blue_background'
        }
      }
    ]
  });

  return portalPage;
}

/**
 * Update partner record with portal link
 */
async function linkPortalToPartner(partnerPageId, portalPageUrl) {
  console.log('🔗 Linking portal to partner record...\n');

  await notion.pages.update({
    page_id: partnerPageId,
    properties: {
      'Portal Link': {
        url: portalPageUrl
      }
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/create-partner-portal.mjs <partner-name>');
    console.log('\nExample:');
    console.log('  node scripts/create-partner-portal.mjs "Sarah Johnson"');
    console.log('  npm run partner:portal "Acme Corporation"\n');
    process.exit(1);
  }

  const partnerName = args.join(' ');

  console.log('═══════════════════════════════════════════════════════');
  console.log('   Partner Portal Generator');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Find partner
    const partner = await findPartner(partnerName);

    if (!partner) {
      console.log(`❌ No partner found matching: "${partnerName}"\n`);
      console.log('💡 Tip: Try searching by first name or organization\n');
      process.exit(1);
    }

    if (partner === 'multiple') {
      process.exit(1);
    }

    // Extract partner data
    const partnerData = {
      name: partner.properties['Name']?.title[0]?.plain_text || 'Partner',
      organization: partner.properties['Organization']?.rich_text[0]?.plain_text || '',
      email: partner.properties['Contact Email']?.email || '',
      phone: partner.properties['Phone']?.phone_number || ''
    };

    console.log(`✅ Found partner: ${partnerData.name}`);
    if (partnerData.organization) {
      console.log(`   Organization: ${partnerData.organization}`);
    }
    console.log('');

    // Check if portal already exists
    const existingPortalLink = partner.properties['Portal Link']?.url;
    if (existingPortalLink) {
      console.log('⚠️  Partner already has a portal:\n');
      console.log(`   ${existingPortalLink}\n`);
      console.log('Do you want to create a new portal anyway? (This will not delete the old one)\n');
      process.exit(0);
    }

    // Create portal page
    const portalPage = await createPortalPage(partner.id, partnerData);

    console.log('✅ Portal page created!');
    console.log(`   ${portalPage.url}\n`);

    // Link portal to partner
    await linkPortalToPartner(partner.id, portalPage.url);

    console.log('✅ Portal linked to partner record\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Success!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Partner: ${partnerData.name}`);
    if (partnerData.organization) {
      console.log(`Organization: ${partnerData.organization}`);
    }
    console.log(`\nPortal URL: ${portalPage.url}\n`);

    console.log('📧 Next steps:');
    console.log(`   1. Review and customize the portal content`);
    console.log(`   2. Share the portal link with ${partnerData.name}`);
    if (partnerData.email) {
      console.log(`   3. Send invitation email to ${partnerData.email}`);
    }
    console.log('   4. Schedule an initial check-in meeting\n');

  } catch (error) {
    console.error('\n❌ Portal creation failed:', error.message);
    console.error('\nCheck:');
    console.error('  - NOTION_TOKEN environment variable');
    console.error('  - Database IDs in config/notion-database-ids.json');
    console.error('  - Partner exists in Notion Partners database');
    console.error('  - Notion integration has page creation permissions\n');
    process.exit(1);
  }
}

main();
