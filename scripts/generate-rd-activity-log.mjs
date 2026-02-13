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

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

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

// R&D eligible projects and their classification
const RD_PROJECTS = {
  'ACT-EL': { name: 'Empathy Ledger', category: 'Core R&D', description: 'Novel AI-powered story collection and analysis platform' },
  'ACT-IN': { name: 'ALMA / Bot Intelligence', category: 'Core R&D', description: 'Experimental knowledge graph, episodic memory, AI agent with tool_use' },
  'ACT-JH': { name: 'JusticeHub Tech', category: 'Supporting R&D', description: 'Technology platform for justice reform network' },
  'ACT-GD': { name: 'Goods Marketplace', category: 'Supporting R&D', description: 'Social enterprise marketplace technology' },
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

  // 5. Print report
  if (JSON_OUTPUT) {
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

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
