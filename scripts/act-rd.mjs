#!/usr/bin/env node

/**
 * ACT R&D Activity Logger - Track R&D for AusIndustry tax incentive claims
 *
 * Commands:
 *   log <activity>       - Log an R&D activity
 *   list [--project]     - List logged activities
 *   report [--fy]        - Generate FY report for AusIndustry
 *   spend [--category]   - Track R&D expenditure
 *   summary              - Quick summary of R&D activities
 *
 * Usage:
 *   act-rd log "Tested Empathy Ledger consent workflow" --project empathy-ledger
 *   act-rd list --project justicehub
 *   act-rd report --fy 2025
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load secrets from Bitwarden
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

// R&D Activity Categories (aligned with AusIndustry)
const RD_CATEGORIES = {
  'core': 'Core R&D Activities',
  'supporting': 'Supporting R&D Activities',
  'software': 'Software Development',
  'ai': 'AI/ML Development',
  'design': 'Design & Prototyping',
  'testing': 'Testing & Validation',
  'infrastructure': 'Infrastructure & DevOps',
};

// ACT Projects that qualify for R&D
const RD_PROJECTS = [
  'empathy-ledger',
  'justicehub',
  'goods-on-country',
  'act-farm',
  'farmhand',
  'personal-ai',
  'act-registry',
];

// Local JSON storage for R&D logs (could be migrated to Notion/Supabase later)
const RD_LOG_PATH = path.join(process.env.HOME, '.clawdbot', 'rd-log.json');

function loadRDLog() {
  try {
    if (fs.existsSync(RD_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(RD_LOG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Warning: Could not load R&D log:', e.message);
  }
  return { activities: [], spend: [] };
}

function saveRDLog(data) {
  const dir = path.dirname(RD_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(RD_LOG_PATH, JSON.stringify(data, null, 2));
}

// Log an R&D activity
async function logActivity(description, options = {}) {
  const log = loadRDLog();

  const activity = {
    id: Date.now().toString(36),
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    description,
    project: options.project || 'general',
    category: options.category || 'software',
    hours: parseFloat(options.hours) || 1,
    outcome: options.outcome || null,
    evidence: options.evidence || null,
    fy: getFY(new Date()),
  };

  log.activities.push(activity);
  saveRDLog(log);

  console.log(`\n✅ R&D Activity Logged\n`);
  console.log(`  Date: ${activity.date}`);
  console.log(`  Project: ${activity.project}`);
  console.log(`  Category: ${RD_CATEGORIES[activity.category] || activity.category}`);
  console.log(`  Hours: ${activity.hours}`);
  console.log(`  Description: ${activity.description}`);
  console.log(`  FY: ${activity.fy}`);
  console.log();

  return activity;
}

// Get financial year (July-June, Australian)
function getFY(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  // FY runs July to June, so July onwards is next FY
  return month >= 6 ? year + 1 : year;
}

// List activities
async function listActivities(options = {}) {
  const log = loadRDLog();
  let activities = log.activities || [];

  // Filter by project
  if (options.project) {
    activities = activities.filter(a =>
      a.project.toLowerCase().includes(options.project.toLowerCase())
    );
  }

  // Filter by FY
  if (options.fy) {
    const fy = parseInt(options.fy);
    activities = activities.filter(a => a.fy === fy);
  }

  // Filter by category
  if (options.category) {
    activities = activities.filter(a =>
      a.category.toLowerCase().includes(options.category.toLowerCase())
    );
  }

  // Sort by date descending
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Limit
  const limit = parseInt(options.limit) || 20;
  activities = activities.slice(0, limit);

  const projectFilter = options.project ? ` (${options.project})` : '';
  const fyFilter = options.fy ? ` FY${options.fy}` : '';
  console.log(`\n📋 R&D ACTIVITIES${projectFilter}${fyFilter}\n`);

  if (activities.length === 0) {
    console.log('  No activities logged.\n');
    console.log('  Run `act-rd log "Activity description" --project <name>` to add one.');
    return;
  }

  // Group by date
  const byDate = {};
  for (const activity of activities) {
    if (!byDate[activity.date]) byDate[activity.date] = [];
    byDate[activity.date].push(activity);
  }

  for (const [date, dateActivities] of Object.entries(byDate)) {
    const totalHours = dateActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
    console.log(`── ${date} (${totalHours}h) ──`);
    for (const a of dateActivities) {
      const projectBadge = a.project !== 'general' ? `[${a.project}]` : '';
      console.log(`  • ${a.description} ${projectBadge}`);
      if (a.outcome) console.log(`    Outcome: ${a.outcome}`);
    }
    console.log();
  }

  const totalActivities = activities.length;
  const totalHours = activities.reduce((sum, a) => sum + (a.hours || 0), 0);
  console.log(`Total: ${totalActivities} activities, ${totalHours} hours`);
  console.log();
}

// Log R&D spend
async function logSpend(amount, options = {}) {
  const log = loadRDLog();

  const spend = {
    id: Date.now().toString(36),
    date: options.date || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    amount: parseFloat(amount),
    category: options.category || 'infrastructure',
    description: options.description || '',
    project: options.project || 'general',
    fy: getFY(new Date(options.date || Date.now())),
  };

  log.spend = log.spend || [];
  log.spend.push(spend);
  saveRDLog(log);

  console.log(`\n✅ R&D Spend Logged\n`);
  console.log(`  Amount: $${spend.amount.toLocaleString()}`);
  console.log(`  Category: ${spend.category}`);
  console.log(`  Project: ${spend.project}`);
  console.log(`  FY: ${spend.fy}`);
  console.log();

  return spend;
}

// List spend
async function listSpend(options = {}) {
  const log = loadRDLog();
  let spend = log.spend || [];

  // Filter by category
  if (options.category) {
    spend = spend.filter(s =>
      s.category.toLowerCase().includes(options.category.toLowerCase())
    );
  }

  // Filter by FY
  if (options.fy) {
    const fy = parseInt(options.fy);
    spend = spend.filter(s => s.fy === fy);
  }

  console.log(`\n💰 R&D EXPENDITURE\n`);

  if (spend.length === 0) {
    console.log('  No spend logged.\n');
    console.log('  Run `act-rd spend 1000 --category infrastructure` to add one.');
    return;
  }

  // Group by category
  const byCategory = {};
  for (const s of spend) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }

  for (const [category, categorySpend] of Object.entries(byCategory)) {
    const total = categorySpend.reduce((sum, s) => sum + s.amount, 0);
    console.log(`── ${category.toUpperCase()} ($${total.toLocaleString()}) ──`);
    for (const s of categorySpend) {
      console.log(`  $${s.amount.toLocaleString()} - ${s.description || s.project} (${s.date})`);
    }
    console.log();
  }

  const total = spend.reduce((sum, s) => sum + s.amount, 0);
  console.log(`Total R&D Spend: $${total.toLocaleString()}`);
  console.log();
}

// Generate AusIndustry report
async function generateReport(options = {}) {
  const log = loadRDLog();
  const fy = parseInt(options.fy) || getFY(new Date());

  const activities = (log.activities || []).filter(a => a.fy === fy);
  const spend = (log.spend || []).filter(s => s.fy === fy);

  console.log(`
═══════════════════════════════════════════════════════════════
                  ACT R&D TAX INCENTIVE REPORT
                       Financial Year ${fy - 1}-${fy}
═══════════════════════════════════════════════════════════════

ORGANISATION: A Curious Tractor Pty Ltd
ABN: [Your ABN]
REPORTING PERIOD: 1 July ${fy - 1} to 30 June ${fy}

───────────────────────────────────────────────────────────────
1. R&D ACTIVITIES SUMMARY
───────────────────────────────────────────────────────────────
`);

  // Group activities by project
  const byProject = {};
  for (const a of activities) {
    if (!byProject[a.project]) byProject[a.project] = [];
    byProject[a.project].push(a);
  }

  for (const [project, projectActivities] of Object.entries(byProject)) {
    const hours = projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
    console.log(`\n📦 ${project.toUpperCase()}`);
    console.log(`   Total Hours: ${hours}`);
    console.log(`   Activities: ${projectActivities.length}`);
    console.log(`   Key Activities:`);

    // Group by category
    const byCategory = {};
    for (const a of projectActivities) {
      const cat = RD_CATEGORIES[a.category] || a.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(a);
    }

    for (const [category, catActivities] of Object.entries(byCategory)) {
      console.log(`\n   ${category}:`);
      for (const a of catActivities.slice(0, 5)) {
        console.log(`     • ${a.description}`);
        if (a.outcome) console.log(`       Outcome: ${a.outcome}`);
      }
      if (catActivities.length > 5) {
        console.log(`     ... and ${catActivities.length - 5} more activities`);
      }
    }
  }

  console.log(`

───────────────────────────────────────────────────────────────
2. R&D EXPENDITURE SUMMARY
───────────────────────────────────────────────────────────────
`);

  const spendByCategory = {};
  for (const s of spend) {
    if (!spendByCategory[s.category]) spendByCategory[s.category] = 0;
    spendByCategory[s.category] += s.amount;
  }

  let totalSpend = 0;
  for (const [category, amount] of Object.entries(spendByCategory)) {
    console.log(`   ${category.padEnd(25)} $${amount.toLocaleString().padStart(12)}`);
    totalSpend += amount;
  }
  console.log(`   ${'─'.repeat(38)}`);
  console.log(`   ${'TOTAL'.padEnd(25)} $${totalSpend.toLocaleString().padStart(12)}`);

  console.log(`

───────────────────────────────────────────────────────────────
3. ELIGIBLE R&D TAX OFFSET ESTIMATE
───────────────────────────────────────────────────────────────

   Total R&D Expenditure:          $${totalSpend.toLocaleString()}

   Estimated Refundable Offset (43.5%):
   (Turnover < $20M)               $${Math.round(totalSpend * 0.435).toLocaleString()}

   Note: This is an estimate only. Consult with your tax advisor
   for accurate R&D tax incentive calculations.

───────────────────────────────────────────────────────────────
4. EVIDENCE & DOCUMENTATION
───────────────────────────────────────────────────────────────

   Activities Logged: ${activities.length}
   Total Hours: ${activities.reduce((sum, a) => sum + (a.hours || 0), 0)}
   Projects: ${Object.keys(byProject).length}

   Evidence sources:
   • Git commit history
   • This activity log (${RD_LOG_PATH})
   • Project documentation
   • Technical specifications

═══════════════════════════════════════════════════════════════
Report generated: ${new Date().toLocaleString('en-AU')}
═══════════════════════════════════════════════════════════════
`);
}

// Quick summary
async function summary() {
  const log = loadRDLog();
  const currentFY = getFY(new Date());

  const fyActivities = (log.activities || []).filter(a => a.fy === currentFY);
  const fySpend = (log.spend || []).filter(s => s.fy === currentFY);

  const totalHours = fyActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalSpend = fySpend.reduce((sum, s) => sum + s.amount, 0);

  // Last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivities = fyActivities.filter(a => new Date(a.timestamp) >= weekAgo);
  const recentHours = recentActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

  console.log(`
📊 R&D SUMMARY - FY${currentFY}

   This Week:    ${recentActivities.length} activities (${recentHours}h)
   This FY:      ${fyActivities.length} activities (${totalHours}h)
   Total Spend:  $${totalSpend.toLocaleString()}

   Est. Offset:  $${Math.round(totalSpend * 0.435).toLocaleString()} (43.5%)

Recent Activity:
`);

  for (const a of recentActivities.slice(0, 5)) {
    console.log(`  • ${a.date}: ${a.description} [${a.project}]`);
  }

  console.log();
}

// Parse CLI arguments
function parseArgs(args) {
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      i += value === true ? 1 : 2;
    } else {
      i++;
    }
  }
  return options;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'log': {
        const description = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        if (!description) {
          console.log('Usage: act-rd log "Activity description" [--project NAME] [--category TYPE] [--hours N]');
          console.log('\nCategories:', Object.keys(RD_CATEGORIES).join(', '));
          console.log('Projects:', RD_PROJECTS.join(', '));
          process.exit(1);
        }
        await logActivity(description, options);
        break;
      }

      case 'list': {
        await listActivities(options);
        break;
      }

      case 'spend': {
        const amount = args[1];
        if (!amount || isNaN(parseFloat(amount))) {
          console.log('Usage: act-rd spend <amount> [--category TYPE] [--description "..."] [--project NAME]');
          process.exit(1);
        }
        await logSpend(amount, options);
        break;
      }

      case 'expenses': {
        await listSpend(options);
        break;
      }

      case 'report': {
        await generateReport(options);
        break;
      }

      case 'summary': {
        await summary();
        break;
      }

      default:
        console.log(`
📝 ACT R&D Activity Logger

Track R&D activities for AusIndustry tax incentive claims.

Usage:
  act-rd log "description" [opts]  Log an R&D activity
  act-rd list [--project NAME]     List logged activities
  act-rd spend <amount> [opts]     Log R&D expenditure
  act-rd expenses [--category]     List expenditure
  act-rd report [--fy YYYY]        Generate AusIndustry report
  act-rd summary                   Quick FY summary

Options for 'log':
  --project NAME       Project (${RD_PROJECTS.slice(0, 3).join(', ')}, ...)
  --category TYPE      Category (${Object.keys(RD_CATEGORIES).slice(0, 3).join(', ')}, ...)
  --hours N            Hours spent (default: 1)
  --outcome "..."      Outcome/result

Options for 'spend':
  --category TYPE      Spend category
  --description "..."  What was purchased
  --project NAME       Related project
  --date YYYY-MM-DD    Date of expense

Examples:
  act-rd log "Tested Empathy Ledger consent workflow" --project empathy-ledger --hours 2
  act-rd log "Designed AI agent architecture" --category ai --project farmhand
  act-rd spend 500 --category infrastructure --description "Supabase hosting"
  act-rd report --fy 2025

R&D Categories:
${Object.entries(RD_CATEGORIES).map(([k, v]) => `  ${k.padEnd(15)} ${v}`).join('\n')}
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
