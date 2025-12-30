#!/usr/bin/env node

/**
 * Generate Moon Cycles for a Given Year
 *
 * Creates ~13 moon cycle entries in Notion based on actual lunar calendar data.
 * Each cycle is ~29.5 days (new moon to new moon).
 *
 * Usage:
 *   node scripts/generate-moon-cycles.mjs --year 2025
 */

import { Client } from '@notionhq/client';
import fs from 'fs/promises';
import path from 'path';

// Lunar cycle constants
const LUNAR_CYCLE_DAYS = 29.53;  // Average synodic month

// New moon dates for 2025 (from NASA data)
const NEW_MOONS_2025 = [
  '2025-01-29',
  '2025-02-27',
  '2025-03-29',
  '2025-04-27',
  '2025-05-27',
  '2025-06-25',
  '2025-07-24',
  '2025-08-23',
  '2025-09-21',
  '2025-10-21',
  '2025-11-20',
  '2025-12-19'
];

// New moon dates for 2026 (for planning ahead)
const NEW_MOONS_2026 = [
  '2026-01-18',
  '2026-02-17',
  '2026-03-18',
  '2026-04-17',
  '2026-05-16',
  '2026-06-15',
  '2026-07-14',
  '2026-08-13',
  '2026-09-11',
  '2026-10-11',
  '2026-11-09',
  '2026-12-09'
];

const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN required');
  console.error('Set in .env.local or pass as env var');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const yearArg = args.find(arg => arg.startsWith('--year='));
const year = yearArg ? parseInt(yearArg.split('=')[1]) : 2025;

if (year < 2025 || year > 2030) {
  console.error(`❌ Year must be between 2025 and 2030. Got: ${year}`);
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

/**
 * Load database IDs from config
 */
async function loadDatabaseIds() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'notion-database-ids.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    if (!config.moonCycles) {
      console.error('❌ Moon Cycles database ID not found in config');
      console.error('Run create-planning-databases.mjs first');
      process.exit(1);
    }

    return config;
  } catch (error) {
    console.error('❌ Failed to load config:', error.message);
    process.exit(1);
  }
}

/**
 * Get moon cycle dates for a given year
 */
function getMoonCycles(year) {
  const newMoons = year === 2025 ? NEW_MOONS_2025 :
                   year === 2026 ? NEW_MOONS_2026 :
                   [];

  if (newMoons.length === 0) {
    throw new Error(`Moon data not available for year ${year}`);
  }

  return newMoons.map((startDate, index) => {
    const nextIndex = index + 1;
    const endDate = nextIndex < newMoons.length
      ? newMoons[nextIndex]
      : addDays(startDate, Math.floor(LUNAR_CYCLE_DAYS));

    const start = new Date(startDate);
    const monthName = start.toLocaleDateString('en-US', { month: 'long' });

    return {
      title: `${monthName} ${year} Moon Cycle`,
      startDate,
      endDate,
      moonPhase: 'New Moon',
      focus: `Focus for ${monthName} ${year}`,
      cycleNumber: index + 1
    };
  });
}

/**
 * Add days to a date string
 */
function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Create moon cycle entry in Notion
 */
async function createMoonCycle(databaseId, cycle) {
  try {
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Cycle': {
          title: [{ text: { content: cycle.title } }]
        },
        'Moon Phase': {
          select: { name: cycle.moonPhase }
        },
        'Start Date': {
          date: { start: cycle.startDate }
        },
        'End Date': {
          date: { start: cycle.endDate }
        },
        'Focus': {
          rich_text: [{ text: { content: cycle.focus } }]
        }
      }
    });

    return page;
  } catch (error) {
    console.error(`  ❌ Failed to create ${cycle.title}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`🌙 Generating Moon Cycles for ${year}\n`);

  // Load config
  const config = await loadDatabaseIds();
  const databaseId = config.moonCycles;

  console.log(`📊 Moon Cycles Database: ${databaseId}\n`);

  // Get moon cycles for the year
  const cycles = getMoonCycles(year);

  console.log(`📅 Found ${cycles.length} moon cycles for ${year}:\n`);

  // Create each cycle
  let created = 0;
  let failed = 0;

  for (const cycle of cycles) {
    process.stdout.write(`  Creating: ${cycle.title}... `);

    const result = await createMoonCycle(databaseId, cycle);

    if (result) {
      console.log('✅');
      created++;
    } else {
      console.log('❌');
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Created: ${created}`);

  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }

  console.log('\n📝 Next Steps:\n');
  console.log('1. Review cycles in Notion');
  console.log('2. Link cycles to 6-Month Phases');
  console.log('3. Link sprints to moon cycles');
  console.log('4. Run: node scripts/link-sprints-to-moon-cycles.mjs\n');
}

main().catch(console.error);
