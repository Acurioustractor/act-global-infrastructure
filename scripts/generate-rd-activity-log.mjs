#!/usr/bin/env node
/**
 * Generate R&D Activity Log
 *
 * Produces an R&D activity log from git commit history and calendar data,
 * grouped by project code, for Australian R&D Tax Incentive documentation.
 *
 * Output: Console report + JSON suitable for R&D tax claim.
 *
 * Usage:
 *   node scripts/generate-rd-activity-log.mjs                    # Full FY26
 *   node scripts/generate-rd-activity-log.mjs --from 2025-07-01  # Custom start
 *   node scripts/generate-rd-activity-log.mjs --json             # JSON output
 */

import '../lib/load-env.mjs';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const PROJECT_CODES = await loadProjectsConfig();

// Parse args
const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const FROM_DATE = fromIdx >= 0 ? args[fromIdx + 1] : '2025-07-01';
const TO_DATE = new Date().toISOString().split('T')[0];
const JSON_OUTPUT = args.includes('--json');
const MD_OUTPUT = args.includes('--markdown') || args.includes('--md');

// R&D eligible projects and their classification
const RD_PROJECTS = {
  'ACT-CG': { name: 'CivicGraph (CivicScope)', category: 'Core R&D', description: 'Cross-government entity resolution, power scoring, graph analytics, cryptographic attestation' },
  'ACT-EL': { name: 'Empathy Ledger', category: 'Core R&D', description: 'Novel AI-powered story collection and analysis platform with OCAP data sovereignty' },
  'ACT-IN': { name: 'Infrastructure / Agent Orchestration', category: 'Core R&D', description: 'Multi-agent orchestration, finance attribution engine, autonomous data pipeline coordination' },
  'ACT-JH': { name: 'JusticeHub / ALMA', category: 'Core R&D', description: 'Justice evidence database, intervention linkage, multi-strategy entity resolution' },
  'ACT-GD': { name: 'Goods Procurement Intelligence', category: 'Supporting R&D', description: 'Community demand matching, procurement signals, multi-mode search' },
  'ACT-PS': { name: 'PICC Photo Studio', category: 'Supporting R&D', description: 'Experimental community storytelling technology' },
  'ACT-CF': { name: 'The Confessional', category: 'Supporting R&D', description: 'Novel story capture technology' },
};

// ============================================================================
// GIT ACTIVITY
// ============================================================================

function getGitActivity() {
  const repoRoot = process.cwd();

  // Get all commits in date range
  const gitLog = execSync(
    `git log --after="${FROM_DATE}" --before="${TO_DATE}T23:59:59" --format="%H|%ai|%an|%s" --no-merges`,
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  ).trim();

  if (!gitLog) return [];

  const commits = gitLog.split('\n').map(line => {
    const [hash, date, author, subject] = line.split('|');
    return { hash, date: date.split(' ')[0], author, subject };
  });

  // Classify commits by project
  const classified = commits.map(commit => {
    const project = classifyCommit(commit.subject);
    return { ...commit, project };
  });

  return classified;
}

function classifyCommit(subject) {
  const lower = subject.toLowerCase();

  // Direct project references in commit messages
  const patterns = [
    { match: /empathy.?ledger|el[-_]|storytell/i, project: 'ACT-EL' },
    { match: /justice.?hub|justicehub/i, project: 'ACT-JH' },
    { match: /goods|marketplace/i, project: 'ACT-GD' },
    { match: /photo.?kiosk|photo.?studio|picc/i, project: 'ACT-PS' },
    { match: /confessional|story.?booth/i, project: 'ACT-CF' },
    { match: /bot|telegram|agent|alma|knowledge|voice|tts/i, project: 'ACT-IN' },
    { match: /dashboard|command.?center|finance|pipeline/i, project: 'ACT-IN' },
    { match: /sync|cron|script|infra|deploy|ci|migration/i, project: 'ACT-IN' },
    { match: /api|webhook|supabase|xero|gmail|notion/i, project: 'ACT-IN' },
    { match: /harvest|witta/i, project: 'ACT-HV' },
    { match: /palm.?island/i, project: 'ACT-PI' },
  ];

  for (const { match, project } of patterns) {
    if (match.test(subject)) return project;
  }

  // Default: infrastructure (most development work is R&D-eligible tooling)
  return 'ACT-IN';
}

// ============================================================================
// CALENDAR ACTIVITY (from Supabase if available)
// ============================================================================

async function getCalendarActivity() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, description, attendees')
      .gte('start_time', FROM_DATE)
      .lte('start_time', TO_DATE + 'T23:59:59')
      .order('start_time', { ascending: true });

    if (error || !data) return [];

    return data.map(event => ({
      date: event.start_time?.split('T')[0],
      title: event.title,
      duration: calculateDuration(event.start_time, event.end_time),
      project: classifyEvent(event.title, event.description),
    }));
  } catch {
    return [];
  }
}

function calculateDuration(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end) - new Date(start);
  return Math.round(diff / (1000 * 60 * 60) * 10) / 10; // hours, 1 decimal
}

function classifyEvent(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  if (/empathy.?ledger/i.test(text)) return 'ACT-EL';
  if (/justice.?hub/i.test(text)) return 'ACT-JH';
  if (/goods/i.test(text)) return 'ACT-GD';
  if (/photo.?kiosk|photo.?studio/i.test(text)) return 'ACT-PS';
  if (/confessional/i.test(text)) return 'ACT-CF';
  if (/alma|bot|agent|tech|dev|sprint|standup|architecture/i.test(text)) return 'ACT-IN';

  return null; // Not clearly R&D
}

// ============================================================================
// TIME ESTIMATION
// ============================================================================

function estimateTimeFromCommits(commits) {
  // Heuristic: each commit represents ~1-3 hours of work
  // Cluster commits on same day = single work session
  const dayMap = {};

  for (const c of commits) {
    const key = `${c.date}::${c.author}`;
    if (!dayMap[key]) dayMap[key] = { commits: 0, project: c.project, date: c.date, author: c.author };
    dayMap[key].commits++;
    // Take the most specific project
    if (c.project !== 'ACT-IN' && dayMap[key].project === 'ACT-IN') {
      dayMap[key].project = c.project;
    }
  }

  return Object.values(dayMap).map(day => {
    // 1 commit = 2hrs, 2-3 = 4hrs, 4+ = 6hrs
    let hours;
    if (day.commits <= 1) hours = 2;
    else if (day.commits <= 3) hours = 4;
    else hours = 6;

    return {
      date: day.date,
      author: day.author,
      project: day.project,
      commits: day.commits,
      estimatedHours: hours,
    };
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('R&D ACTIVITY LOG GENERATOR');
  console.log(`Period: ${FROM_DATE} → ${TO_DATE}`);
  console.log('='.repeat(70));
  console.log();

  // 1. Git activity
  console.log('Analyzing git history...');
  const gitCommits = getGitActivity();
  console.log(`  Found ${gitCommits.length} commits`);

  // 2. Calendar activity
  console.log('Checking calendar events...');
  const calendarEvents = await getCalendarActivity();
  console.log(`  Found ${calendarEvents.length} events`);

  // 3. Estimate time
  const workSessions = estimateTimeFromCommits(gitCommits);

  // 4. Build R&D activity log
  const rdLog = {};
  for (const [code, meta] of Object.entries(RD_PROJECTS)) {
    const projectCommits = gitCommits.filter(c => c.project === code);
    const projectSessions = workSessions.filter(s => s.project === code);
    const projectEvents = calendarEvents.filter(e => e.project === code);

    const totalHours = projectSessions.reduce((sum, s) => sum + s.estimatedHours, 0);
    const calendarHours = projectEvents.reduce((sum, e) => sum + (e.duration || 0), 0);

    rdLog[code] = {
      ...meta,
      commits: projectCommits.length,
      workDays: projectSessions.length,
      estimatedDevHours: totalHours,
      calendarMeetingHours: calendarHours,
      totalEstimatedHours: totalHours + calendarHours,
      // Sample activities (recent commits as evidence)
      sampleActivities: projectCommits.slice(0, 10).map(c => ({
        date: c.date,
        author: c.author,
        description: c.subject,
      })),
      monthlySummary: buildMonthlySummary(projectSessions),
    };
  }

  // 5. Fetch financial data for evidence pack
  let financialData = null;
  if (MD_OUTPUT && supabase) {
    console.log('Fetching R&D financial data...');
    financialData = await fetchRdFinancials();
  }

  // 6. Print report
  if (MD_OUTPUT) {
    generateMarkdownPack(rdLog, financialData);
  } else if (JSON_OUTPUT) {
    const output = {
      period: { from: FROM_DATE, to: TO_DATE },
      generatedAt: new Date().toISOString(),
      projects: rdLog,
      totals: calculateTotals(rdLog),
    };
    const outPath = path.join(process.cwd(), 'scripts/output/rd-activity-log.json');
    try {
      execSync(`mkdir -p ${path.dirname(outPath)}`);
      writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log(`\nJSON written to: ${outPath}`);
    } catch (e) {
      // Fallback to stdout
      console.log(JSON.stringify(output, null, 2));
    }
  } else {
    printReport(rdLog);
  }
}

function buildMonthlySummary(sessions) {
  const months = {};
  for (const s of sessions) {
    const month = s.date.substring(0, 7);
    if (!months[month]) months[month] = { days: 0, hours: 0, commits: 0 };
    months[month].days++;
    months[month].hours += s.estimatedHours;
    months[month].commits += s.commits;
  }
  return months;
}

function calculateTotals(rdLog) {
  let totalCommits = 0;
  let totalDevHours = 0;
  let totalMeetingHours = 0;
  let totalDays = 0;

  for (const project of Object.values(rdLog)) {
    totalCommits += project.commits;
    totalDevHours += project.estimatedDevHours;
    totalMeetingHours += project.calendarMeetingHours;
    totalDays += project.workDays;
  }

  return {
    commits: totalCommits,
    devHours: totalDevHours,
    meetingHours: totalMeetingHours,
    totalHours: totalDevHours + totalMeetingHours,
    workDays: totalDays,
    // Rough salary allocation: if 2080 hrs/yr (40hrs × 52wks)
    rdPercentage: Math.round(((totalDevHours + totalMeetingHours) / 2080) * 100),
  };
}

function printReport(rdLog) {
  console.log('\n' + '='.repeat(70));
  console.log('R&D ACTIVITY SUMMARY');
  console.log('='.repeat(70));

  let grandTotalHours = 0;
  let grandTotalCommits = 0;

  for (const [code, data] of Object.entries(rdLog).sort((a, b) => b[1].totalEstimatedHours - a[1].totalEstimatedHours)) {
    if (data.commits === 0 && data.calendarMeetingHours === 0) continue;

    console.log(`\n  ${code} — ${data.name} [${data.category}]`);
    console.log(`  ${data.description}`);
    console.log(`  Commits: ${data.commits} | Work days: ${data.workDays} | Dev hours: ${data.estimatedDevHours} | Meeting hours: ${data.calendarMeetingHours}`);
    console.log(`  Total estimated hours: ${data.totalEstimatedHours}`);

    // Monthly breakdown
    if (Object.keys(data.monthlySummary).length > 0) {
      console.log('  Monthly:');
      for (const [month, m] of Object.entries(data.monthlySummary).sort()) {
        console.log(`    ${month}: ${m.days} days, ${m.hours} hrs, ${m.commits} commits`);
      }
    }

    // Sample activities
    if (data.sampleActivities.length > 0) {
      console.log('  Recent activities:');
      for (const a of data.sampleActivities.slice(0, 5)) {
        console.log(`    ${a.date} [${a.author}] ${a.description}`);
      }
    }

    grandTotalHours += data.totalEstimatedHours;
    grandTotalCommits += data.commits;
  }

  const totals = calculateTotals(rdLog);

  console.log('\n' + '='.repeat(70));
  console.log('TOTALS');
  console.log('='.repeat(70));
  console.log(`  Total R&D commits:     ${grandTotalCommits}`);
  console.log(`  Total R&D hours:       ${grandTotalHours}`);
  console.log(`  Estimated R&D %:       ${totals.rdPercentage}% of full-time`);
  console.log();
  console.log('  SALARY R&D CALCULATION (per person):');
  console.log(`    Assumed salary:      $120,000`);
  console.log(`    R&D allocation:      ${totals.rdPercentage}%`);
  console.log(`    R&D eligible wages:  $${Math.round(120000 * totals.rdPercentage / 100).toLocaleString()}`);
  console.log(`    43.5% refund:        $${Math.round(120000 * totals.rdPercentage / 100 * 0.435).toLocaleString()}`);
  console.log(`    x2 founders:         $${Math.round(120000 * totals.rdPercentage / 100 * 0.435 * 2).toLocaleString()}`);
  console.log();
  console.log('  Note: These are estimates. Actual R&D claims require:');
  console.log('    1. Registration with AusIndustry (before or during the FY)');
  console.log('    2. Contemporaneous documentation of R&D activities');
  console.log('    3. Clear distinction between core and supporting R&D');
  console.log('    4. Payroll setup (wages must be actual employee wages, not distributions)');
}

// ============================================================================
// FINANCIAL DATA (for evidence pack)
// ============================================================================

async function fetchRdFinancials() {
  if (!supabase) return null;

  try {
    // Get R&D-eligible spend from vendor_project_rules
    const { data: vendorRules } = await supabase
      .from('vendor_project_rules')
      .select('vendor_name, category, project_code, rd_eligible')
      .eq('rd_eligible', true);

    const rdVendors = new Set((vendorRules || []).map(v => v.vendor_name));

    // Get transactions matching R&D vendors in period
    const { data: txns } = await supabase
      .from('xero_transactions')
      .select('contact_name, total, date, project_code, has_attachments')
      .lt('total', 0)
      .gte('date', FROM_DATE)
      .lte('date', TO_DATE);

    const rdTxns = (txns || []).filter(t => rdVendors.has(t.contact_name));

    // Aggregate by project and category
    const byProject = {};
    const byMonth = {};
    let totalSpend = 0;
    let withReceipts = 0;

    for (const tx of rdTxns) {
      const amt = Math.abs(tx.total);
      const code = tx.project_code || 'Untagged';
      const month = tx.date?.substring(0, 7);

      byProject[code] = (byProject[code] || 0) + amt;
      byMonth[month] = (byMonth[month] || 0) + amt;
      totalSpend += amt;
      if (tx.has_attachments) withReceipts++;
    }

    // Get vendor breakdown
    const vendorSpend = {};
    for (const tx of rdTxns) {
      const vendor = tx.contact_name;
      vendorSpend[vendor] = (vendorSpend[vendor] || 0) + Math.abs(tx.total);
    }
    const topVendors = Object.entries(vendorSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // Map vendor to category
    const vendorCategoryMap = {};
    for (const v of vendorRules || []) {
      vendorCategoryMap[v.vendor_name] = v.category;
    }

    return {
      totalSpend,
      transactionCount: rdTxns.length,
      receiptCoverage: rdTxns.length > 0 ? Math.round((withReceipts / rdTxns.length) * 100) : 0,
      offset435: Math.round(totalSpend * 0.435),
      byProject,
      byMonth,
      topVendors: topVendors.map(([vendor, spend]) => ({
        vendor,
        spend,
        category: vendorCategoryMap[vendor] || 'Unknown',
      })),
    };
  } catch (err) {
    console.error('Warning: could not fetch financial data:', err.message);
    return null;
  }
}

// ============================================================================
// MARKDOWN EVIDENCE PACK
// ============================================================================

function generateMarkdownPack(rdLog, financialData) {
  const totals = calculateTotals(rdLog);
  const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

  let md = `# R&D Tax Incentive — Evidence Pack

**Entity:** ACT Foundation (ABN 21 591 780 066)
**Period:** ${FROM_DATE} to ${TO_DATE}
**Generated:** ${new Date().toISOString().split('T')[0]}
**Prepared for:** AusIndustry R&D Tax Incentive registration

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total R&D hours (estimated) | ${totals.totalHours} hrs |
| Development hours | ${totals.devHours} hrs |
| Meeting hours | ${totals.meetingHours} hrs |
| R&D work days | ${totals.workDays} |
| Total commits | ${totals.commits} |
| R&D % of full-time | ${totals.rdPercentage}% |
`;

  if (financialData) {
    md += `| R&D-eligible spend | ${fmt(financialData.totalSpend)} |
| 43.5% refundable offset | ${fmt(financialData.offset435)} |
| Receipt coverage | ${financialData.receiptCoverage}% |
| R&D transactions | ${financialData.transactionCount} |
`;
  }

  md += `
---

## R&D Activities by Project

`;

  for (const [code, data] of Object.entries(rdLog).sort((a, b) => b[1].totalEstimatedHours - a[1].totalEstimatedHours)) {
    if (data.commits === 0 && data.calendarMeetingHours === 0) continue;

    md += `### ${code} — ${data.name}

**Classification:** ${data.category}
**Description:** ${data.description}

| Metric | Value |
|--------|-------|
| Commits | ${data.commits} |
| Work days | ${data.workDays} |
| Development hours | ${data.estimatedDevHours} |
| Meeting hours | ${data.calendarMeetingHours} |
| **Total hours** | **${data.totalEstimatedHours}** |
`;

    if (financialData?.byProject[code]) {
      md += `| R&D spend | ${fmt(financialData.byProject[code])} |
`;
    }

    // Monthly breakdown
    const months = Object.entries(data.monthlySummary).sort();
    if (months.length > 0) {
      md += `
#### Monthly Breakdown

| Month | Days | Hours | Commits |
|-------|------|-------|---------|
`;
      for (const [month, m] of months) {
        md += `| ${month} | ${m.days} | ${m.hours} | ${m.commits} |
`;
      }
    }

    // Sample activities as evidence
    if (data.sampleActivities.length > 0) {
      md += `
#### Sample Activities (Contemporaneous Evidence)

| Date | Author | Activity |
|------|--------|----------|
`;
      for (const a of data.sampleActivities) {
        md += `| ${a.date} | ${a.author} | ${a.description.replace(/\|/g, '/')} |
`;
      }
    }

    md += '\n';
  }

  // Financial breakdown
  if (financialData) {
    md += `---

## Financial Breakdown

### R&D Spend by Month

| Month | Spend |
|-------|-------|
`;
    for (const [month, spend] of Object.entries(financialData.byMonth).sort()) {
      md += `| ${month} | ${fmt(spend)} |
`;
    }

    md += `
### Top R&D Vendors

| Vendor | Category | Spend |
|--------|----------|-------|
`;
    for (const v of financialData.topVendors) {
      md += `| ${v.vendor} | ${v.category} | ${fmt(v.spend)} |
`;
    }

    md += `
### R&D Spend by Project

| Project | Spend |
|---------|-------|
`;
    for (const [code, spend] of Object.entries(financialData.byProject).sort((a, b) => b[1] - a[1])) {
      md += `| ${code} | ${fmt(spend)} |
`;
    }
  }

  // Salary calculation
  md += `
---

## Salary R&D Allocation

| Item | Per Person | x2 Founders |
|------|-----------|-------------|
| Assumed salary | $120,000 | $240,000 |
| R&D allocation | ${totals.rdPercentage}% | ${totals.rdPercentage}% |
| R&D eligible wages | ${fmt(120000 * totals.rdPercentage / 100)} | ${fmt(240000 * totals.rdPercentage / 100)} |
| 43.5% offset | ${fmt(120000 * totals.rdPercentage / 100 * 0.435)} | ${fmt(240000 * totals.rdPercentage / 100 * 0.435)} |

---

## Notes & Disclaimers

1. Hour estimates are derived from git commit patterns (1 commit = 2hrs, 2-3 = 4hrs, 4+ = 6hrs per day)
2. Calendar meeting hours are from actual calendar event durations
3. All financial data from Xero via Supabase sync
4. This evidence pack supports but does not replace formal R&D registration with AusIndustry
5. Activities must be registered before or during the financial year
6. Actual claims require payroll setup (wages must be employee wages, not distributions)
7. Records retained for 5 years as required by ATO

---

*Generated by ACT Finance Engine — R&D Evidence Pack Generator*
`;

  // Write to file
  const outPath = path.join(process.cwd(), `scripts/output/rd-evidence-pack-${FROM_DATE.substring(0, 4)}.md`);
  try {
    execSync(`mkdir -p ${path.dirname(outPath)}`);
    writeFileSync(outPath, md);
    console.log(`\nR&D Evidence Pack written to: ${outPath}`);
    console.log(`  Period: ${FROM_DATE} → ${TO_DATE}`);
    console.log(`  Projects: ${Object.keys(rdLog).filter(k => rdLog[k].commits > 0).length}`);
    console.log(`  Total hours: ${totals.totalHours}`);
    if (financialData) {
      console.log(`  R&D spend: ${fmt(financialData.totalSpend)}`);
      console.log(`  43.5% offset: ${fmt(financialData.offset435)}`);
    }
  } catch (e) {
    // Fallback: print to stdout
    console.log(md);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
