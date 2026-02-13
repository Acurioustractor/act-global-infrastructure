#!/usr/bin/env node
/**
 * Notion Knowledge Audit
 *
 * Scans ALL Notion project pages, maps what databases/content
 * exist for each project, identifies gaps, and reports on
 * data quality across the entire workspace.
 *
 * Produces a full inventory: which projects have meetings,
 * actions, resources, tasks, and which are missing data.
 *
 * Usage:
 *   node scripts/audit-notion-knowledge.mjs              # Full audit
 *   node scripts/audit-notion-knowledge.mjs --verbose     # Detailed output
 *   node scripts/audit-notion-knowledge.mjs --project ACT-JH  # Single project
 *
 * Environment Variables:
 *   NOTION_TOKEN - Notion API token
 */

import { Client } from '@notionhq/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes('--verbose'),
    project: args.includes('--project') ? args[args.indexOf('--project') + 1] : null,
    help: args.includes('--help') || args.includes('-h')
  };
}

async function loadProjectCodes() {
  try {
    return await loadProjectsConfig();
  } catch { /* ignore */ }
  return { projects: {} };
}

function getNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN not set');
  return new Client({ auth: token });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Audit Logic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Fetch all pages from the actProjects database.
 */
async function fetchAllProjects(notion, databaseId) {
  const pages = [];
  let cursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);
  return pages;
}

/**
 * For a given project page, enumerate all child databases and their item counts.
 */
async function auditProjectPage(notion, pageId) {
  const audit = {
    childDatabases: [],
    childPages: [],
    blockCount: 0,
    hasMeetings: false,
    hasActions: false,
    hasResources: false,
    hasTasks: false,
    hasNotes: false,
    meetingCount: 0,
    actionCount: 0,
    totalChildItems: 0
  };

  try {
    let cursor;
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      for (const block of response.results) {
        audit.blockCount++;

        if (block.type === 'child_database') {
          const dbTitle = block.child_database?.title || 'Untitled DB';
          const dbTitleLower = dbTitle.toLowerCase();

          // Count items in the database
          let itemCount = 0;
          try {
            const dbQuery = await notion.dataSources.query({
              data_source_id: block.id,
              page_size: 1 // Just get count
            });
            // Get approximate count
            itemCount = dbQuery.results.length;
            if (dbQuery.has_more) {
              // Paginate to get full count
              let c2 = dbQuery.next_cursor;
              while (c2) {
                const more = await notion.dataSources.query({ data_source_id: block.id, start_cursor: c2, page_size: 100 });
                itemCount += more.results.length;
                c2 = more.has_more ? more.next_cursor : null;
              }
            }
          } catch { /* database not accessible */ }

          const dbInfo = { id: block.id, title: dbTitle, itemCount };
          audit.childDatabases.push(dbInfo);
          audit.totalChildItems += itemCount;

          // Categorize
          if (dbTitleLower.includes('meeting')) {
            audit.hasMeetings = true;
            audit.meetingCount = itemCount;
          }
          if (dbTitleLower.includes('action') || dbTitleLower.includes('task')) {
            audit.hasActions = true;
            audit.actionCount = itemCount;
          }
          if (dbTitleLower.includes('resource')) {
            audit.hasResources = true;
          }
          if (dbTitleLower.includes('task') || dbTitleLower.includes('todo') || dbTitleLower.includes('to-do')) {
            audit.hasTasks = true;
          }
          if (dbTitleLower.includes('note')) {
            audit.hasNotes = true;
          }
        }

        if (block.type === 'child_page') {
          audit.childPages.push({
            id: block.id,
            title: block.child_page?.title || 'Untitled'
          });
        }
      }

      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
  } catch (err) {
    audit.error = err.message;
  }

  return audit;
}

function matchProjectCode(name, projectCodes) {
  if (!name || !projectCodes?.projects) return null;
  const nameLower = name.toLowerCase();
  for (const [code, config] of Object.entries(projectCodes.projects)) {
    if (config.notion_pages) {
      for (const p of config.notion_pages) {
        if (nameLower.includes(p.toLowerCase()) || p.toLowerCase().includes(nameLower)) return code;
      }
    }
    if (config.name && (nameLower.includes(config.name.toLowerCase()) || config.name.toLowerCase().includes(nameLower))) {
      return code;
    }
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Audit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runAudit(options) {
  const projectCodes = await loadProjectCodes();
  const notion = getNotion();

  // Load notion database IDs
  const configPath = join(__dirname, '../config/notion-database-ids.json');
  const dbIds = JSON.parse(readFileSync(configPath, 'utf8'));

  console.log('\n===================================================================');
  console.log('   Notion Knowledge Audit');
  console.log('===================================================================\n');

  // Fetch all project pages
  console.log('Fetching project pages from actProjects database...\n');
  const projectPages = await fetchAllProjects(notion, dbIds.actProjects);
  console.log(`   Found ${projectPages.length} project pages\n`);

  const auditResults = [];
  let processedCount = 0;

  for (const page of projectPages) {
    const titleProp = Object.values(page.properties).find(p => p.type === 'title');
    const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
    const projectCode = matchProjectCode(title, projectCodes);

    // Filter by specific project if requested
    if (options.project && projectCode !== options.project) continue;

    processedCount++;
    process.stdout.write(`   Auditing: ${title} (${projectCode || 'no code'})...`);

    const audit = await auditProjectPage(notion, page.id);

    // Get status
    const statusProp = page.properties.Status || page.properties.status;
    const status = statusProp?.status?.name || statusProp?.select?.name || 'Unknown';

    const result = {
      title,
      projectCode: projectCode || null,
      pageId: page.id,
      status,
      lastEdited: page.last_edited_time,
      ...audit,
      // Data quality score (0-100)
      qualityScore: calculateQualityScore(audit)
    };

    auditResults.push(result);
    console.log(` score: ${result.qualityScore}/100`);

    if (options.verbose) {
      console.log(`     Blocks: ${audit.blockCount}`);
      console.log(`     Child databases: ${audit.childDatabases.length}`);
      audit.childDatabases.forEach(db => {
        console.log(`       - ${db.title}: ${db.itemCount} items`);
      });
      console.log(`     Child pages: ${audit.childPages.length}`);
      console.log(`     Meetings: ${audit.hasMeetings ? `Yes (${audit.meetingCount})` : 'No'}`);
      console.log(`     Actions: ${audit.hasActions ? `Yes (${audit.actionCount})` : 'No'}`);
      console.log(`     Resources: ${audit.hasResources ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Be gentle on the API
    await new Promise(r => setTimeout(r, 200));
  }

  // Generate summary report
  console.log('\n===================================================================');
  console.log('   Audit Summary');
  console.log('===================================================================\n');

  const withMeetings = auditResults.filter(r => r.hasMeetings);
  const withActions = auditResults.filter(r => r.hasActions);
  const withResources = auditResults.filter(r => r.hasResources);
  const active = auditResults.filter(r => r.status && r.status.toLowerCase().includes('active'));
  const avgScore = auditResults.reduce((s, r) => s + r.qualityScore, 0) / (auditResults.length || 1);

  console.log(`   Projects audited:  ${processedCount}`);
  console.log(`   With meetings:     ${withMeetings.length} (${pct(withMeetings.length, processedCount)})`);
  console.log(`   With actions:      ${withActions.length} (${pct(withActions.length, processedCount)})`);
  console.log(`   With resources:    ${withResources.length} (${pct(withResources.length, processedCount)})`);
  console.log(`   Active projects:   ${active.length}`);
  console.log(`   Avg quality score: ${avgScore.toFixed(0)}/100`);

  // Top projects by quality
  const sorted = [...auditResults].sort((a, b) => b.qualityScore - a.qualityScore);
  console.log('\n   Top 10 by quality:');
  sorted.slice(0, 10).forEach((r, i) => {
    console.log(`     ${i + 1}. ${r.title} (${r.projectCode || '-'}) — ${r.qualityScore}/100`);
  });

  // Gaps: active projects with low quality
  const gaps = auditResults
    .filter(r => r.status?.toLowerCase().includes('active') && r.qualityScore < 30)
    .sort((a, b) => a.qualityScore - b.qualityScore);

  if (gaps.length > 0) {
    console.log(`\n   Active projects needing attention (score < 30):`);
    gaps.forEach(r => {
      const missing = [];
      if (!r.hasMeetings) missing.push('meetings');
      if (!r.hasActions) missing.push('actions');
      if (!r.hasResources) missing.push('resources');
      console.log(`     - ${r.title} (${r.projectCode || '-'}) — ${r.qualityScore}/100 — missing: ${missing.join(', ') || 'content'}`);
    });
  }

  // Save full audit to file
  const outputPath = join(__dirname, '../.claude/cache/agents/scout/notion-knowledge-audit.md');
  const mdReport = generateMarkdownReport(auditResults, { withMeetings, withActions, withResources, active, avgScore, gaps });
  writeFileSync(outputPath, mdReport);
  console.log(`\n   Full report saved to: ${outputPath}\n`);

  return auditResults;
}

function calculateQualityScore(audit) {
  let score = 0;

  // Has content at all (20 pts)
  if (audit.blockCount > 0) score += 10;
  if (audit.blockCount > 5) score += 10;

  // Has child databases (20 pts)
  if (audit.childDatabases.length > 0) score += 10;
  if (audit.childDatabases.length > 2) score += 10;

  // Has meetings (20 pts)
  if (audit.hasMeetings) score += 10;
  if (audit.meetingCount > 2) score += 10;

  // Has actions/tasks (20 pts)
  if (audit.hasActions || audit.hasTasks) score += 10;
  if (audit.actionCount > 5) score += 10;

  // Has resources (10 pts)
  if (audit.hasResources) score += 10;

  // Has notes/child pages (10 pts)
  if (audit.childPages.length > 0) score += 5;
  if (audit.hasNotes) score += 5;

  return Math.min(score, 100);
}

function pct(n, total) {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(0)}%`;
}

function generateMarkdownReport(results, summary) {
  const lines = [
    '# Notion Knowledge Audit Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Projects audited: ${results.length}`,
    `- With meetings: ${summary.withMeetings.length} (${pct(summary.withMeetings.length, results.length)})`,
    `- With actions: ${summary.withActions.length} (${pct(summary.withActions.length, results.length)})`,
    `- With resources: ${summary.withResources.length} (${pct(summary.withResources.length, results.length)})`,
    `- Active projects: ${summary.active.length}`,
    `- Average quality: ${summary.avgScore.toFixed(0)}/100`,
    '',
    '## All Projects',
    '',
    '| Project | Code | Status | Quality | Meetings | Actions | Resources | Last Edited |',
    '|---------|------|--------|---------|----------|---------|-----------|-------------|'
  ];

  for (const r of results.sort((a, b) => b.qualityScore - a.qualityScore)) {
    lines.push(`| ${r.title} | ${r.projectCode || '-'} | ${r.status} | ${r.qualityScore}/100 | ${r.hasMeetings ? `${r.meetingCount}` : '-'} | ${r.hasActions ? `${r.actionCount}` : '-'} | ${r.hasResources ? 'Yes' : '-'} | ${r.lastEdited?.split('T')[0] || '-'} |`);
  }

  if (summary.gaps.length > 0) {
    lines.push('', '## Gaps: Active Projects Needing Attention', '');
    for (const r of summary.gaps) {
      const missing = [];
      if (!r.hasMeetings) missing.push('meetings');
      if (!r.hasActions) missing.push('actions');
      if (!r.hasResources) missing.push('resources');
      lines.push(`- **${r.title}** (${r.projectCode || '-'}) — Score: ${r.qualityScore}/100 — Missing: ${missing.join(', ')}`);
    }
  }

  return lines.join('\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Notion Knowledge Audit

Scans all Notion project pages and reports on data quality,
identifying which projects have meetings, actions, resources,
and which need attention.

Usage:
  node scripts/audit-notion-knowledge.mjs [options]

Options:
  --verbose         Detailed output per project
  --project <code>  Audit a single project (e.g., ACT-JH)
  --help, -h        Show this help
`);
    process.exit(0);
  }

  try {
    await runAudit(options);
  } catch (error) {
    console.error('\nAudit failed:', error.message);
    process.exit(1);
  }
}

main();

export { runAudit, auditProjectPage };
