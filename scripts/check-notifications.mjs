#!/usr/bin/env node
/**
 * ACT Notification Engine
 *
 * Checks for upcoming deadlines and events:
 * - Grant deadlines within 14 days
 * - Partner check-ins this week
 * - Report due dates (future extension)
 *
 * Runs daily at 9am via GitHub Actions
 *
 * Usage:
 *   node scripts/check-notifications.mjs
 *   npm run notifications:check
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

// Load database IDs
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
// DATE UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getDaysUntil(dateString) {
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getThisWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Start of week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // End of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
}

function getTwoWeeksFromNow() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANT DEADLINE CHECKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkGrantDeadlines() {
  const twoWeeks = getTwoWeeksFromNow();

  try {
    const response = await notion.databases.query({
      database_id: databaseIds.grantOpportunities,
      filter: {
        and: [
          {
            property: 'Deadline',
            date: {
              on_or_before: twoWeeks
            }
          },
          {
            or: [
              {
                property: 'Status',
                select: { equals: 'Prospective' }
              },
              {
                property: 'Status',
                select: { equals: 'Applied' }
              }
            ]
          }
        ]
      },
      sorts: [
        {
          property: 'Deadline',
          direction: 'ascending'
        }
      ]
    });

    const grants = response.results.map(page => ({
      name: page.properties['Grant Name']?.title[0]?.plain_text || 'Unnamed Grant',
      funder: page.properties['Funder']?.rich_text[0]?.plain_text || 'Unknown',
      deadline: page.properties['Deadline']?.date?.start,
      amount: page.properties['Amount']?.number,
      status: page.properties['Status']?.select?.name,
      url: page.url
    }));

    return grants;

  } catch (error) {
    console.error('Error querying grant deadlines:', error.message);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARTNER CHECK-IN CHECKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkPartnerCheckIns() {
  const thisWeek = getThisWeekDates();

  try {
    const response = await notion.databases.query({
      database_id: databaseIds.partners,
      filter: {
        and: [
          {
            property: 'Next Check-in',
            date: {
              on_or_after: thisWeek.start
            }
          },
          {
            property: 'Next Check-in',
            date: {
              on_or_before: thisWeek.end
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Next Check-in',
          direction: 'ascending'
        }
      ]
    });

    const partners = response.results.map(page => ({
      name: page.properties['Name']?.title[0]?.plain_text || 'Unnamed Partner',
      organization: page.properties['Organization']?.rich_text[0]?.plain_text || '',
      checkInDate: page.properties['Next Check-in']?.date?.start,
      lastContact: page.properties['Last Contact']?.date?.start,
      email: page.properties['Contact Email']?.email,
      phone: page.properties['Phone']?.phone_number,
      url: page.url
    }));

    return partners;

  } catch (error) {
    console.error('Error querying partner check-ins:', error.message);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERDUE CHECKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkOverdueItems() {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check for overdue grants
    const overdueGrants = await notion.databases.query({
      database_id: databaseIds.grantOpportunities,
      filter: {
        and: [
          {
            property: 'Deadline',
            date: {
              before: today
            }
          },
          {
            property: 'Status',
            select: { equals: 'Prospective' }
          }
        ]
      }
    });

    // Check for overdue partner check-ins
    const overduePartners = await notion.databases.query({
      database_id: databaseIds.partners,
      filter: {
        property: 'Next Check-in',
        date: {
          before: today
        }
      }
    });

    return {
      grants: overdueGrants.results.map(page => ({
        name: page.properties['Grant Name']?.title[0]?.plain_text || 'Unnamed Grant',
        deadline: page.properties['Deadline']?.date?.start,
        url: page.url
      })),
      partners: overduePartners.results.map(page => ({
        name: page.properties['Name']?.title[0]?.plain_text || 'Unnamed Partner',
        checkInDate: page.properties['Next Check-in']?.date?.start,
        url: page.url
      }))
    };

  } catch (error) {
    console.error('Error checking overdue items:', error.message);
    return { grants: [], partners: [] };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMATTING & OUTPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatGrantNotification(grant) {
  const daysUntil = getDaysUntil(grant.deadline);
  const urgency = daysUntil <= 3 ? '🚨' : daysUntil <= 7 ? '⚠️' : '📅';
  const amount = grant.amount ? ` ($${grant.amount.toLocaleString()})` : '';

  return `   ${urgency} ${grant.name}${amount}\n` +
         `      Funder: ${grant.funder}\n` +
         `      Deadline: ${formatDate(grant.deadline)} (${daysUntil} days)\n` +
         `      Status: ${grant.status}\n` +
         `      Link: ${grant.url}`;
}

function formatPartnerNotification(partner) {
  const daysUntil = getDaysUntil(partner.checkInDate);
  const org = partner.organization ? ` (${partner.organization})` : '';
  const contact = [];
  if (partner.email) contact.push(partner.email);
  if (partner.phone) contact.push(partner.phone);
  const contactInfo = contact.length > 0 ? `\n      Contact: ${contact.join(' | ')}` : '';

  return `   📞 ${partner.name}${org}\n` +
         `      Check-in: ${formatDate(partner.checkInDate)} (${daysUntil} days)${contactInfo}\n` +
         `      Link: ${partner.url}`;
}

function formatOverdueNotification(item, type) {
  const daysOverdue = Math.abs(getDaysUntil(item.deadline || item.checkInDate));
  const emoji = type === 'grant' ? '🔴' : '🔴';
  const dateField = type === 'grant' ? 'deadline' : 'check-in';

  return `   ${emoji} ${item.name}\n` +
         `      ${daysOverdue} days overdue\n` +
         `      Link: ${item.url}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   ACT Notifications Check');
  console.log('═══════════════════════════════════════════════════════\n');

  const now = new Date();
  console.log(`📅 ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`);

  try {
    // Run all checks in parallel
    const [grants, partners, overdue] = await Promise.all([
      checkGrantDeadlines(),
      checkPartnerCheckIns(),
      checkOverdueItems()
    ]);

    let hasNotifications = false;

    // Overdue items (most urgent)
    if (overdue.grants.length > 0 || overdue.partners.length > 0) {
      hasNotifications = true;
      console.log('🔴 OVERDUE ITEMS\n');

      if (overdue.grants.length > 0) {
        console.log('   Grant Applications:\n');
        overdue.grants.forEach(grant => {
          console.log(formatOverdueNotification(grant, 'grant'));
        });
        console.log('');
      }

      if (overdue.partners.length > 0) {
        console.log('   Partner Check-ins:\n');
        overdue.partners.forEach(partner => {
          console.log(formatOverdueNotification(partner, 'partner'));
        });
        console.log('');
      }
    }

    // Upcoming grant deadlines
    if (grants.length > 0) {
      hasNotifications = true;
      console.log('🔔 GRANT DEADLINES (Next 14 Days)\n');
      grants.forEach(grant => {
        console.log(formatGrantNotification(grant));
        console.log('');
      });
    }

    // Upcoming partner check-ins
    if (partners.length > 0) {
      hasNotifications = true;
      console.log('🤝 PARTNER CHECK-INS (This Week)\n');
      partners.forEach(partner => {
        console.log(formatPartnerNotification(partner));
        console.log('');
      });
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Summary');
    console.log('═══════════════════════════════════════════════════════\n');

    if (!hasNotifications) {
      console.log('✅ No urgent notifications at this time\n');
    } else {
      console.log(`   Overdue Grants: ${overdue.grants.length}`);
      console.log(`   Overdue Partner Check-ins: ${overdue.partners.length}`);
      console.log(`   Upcoming Grants (14 days): ${grants.length}`);
      console.log(`   Partner Check-ins (this week): ${partners.length}\n`);
    }

    // Exit with error code if overdue items exist
    if (overdue.grants.length > 0 || overdue.partners.length > 0) {
      console.log('⚠️  Action required on overdue items\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Notification check failed:', error.message);
    console.error('\nCheck:');
    console.error('  - NOTION_TOKEN environment variable');
    console.error('  - Database IDs in config/notion-database-ids.json');
    console.error('  - Partners and Grant Opportunities databases exist\n');
    process.exit(1);
  }
}

main();
