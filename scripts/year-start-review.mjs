#!/usr/bin/env node
/**
 * Year-Start Project Review
 *
 * Systematically reviews all ACT projects at the start of each year:
 * - Batches 5 projects per day (9 business days to review all 42)
 * - Runs Project Intelligence Agent on each
 * - Creates proposals for recommendations
 * - Posts daily summary to Discord
 * - Tracks compendium gaps (missing/stale pages)
 *
 * Usage:
 *   node scripts/year-start-review.mjs               # Run daily batch
 *   node scripts/year-start-review.mjs status        # Show progress
 *   node scripts/year-start-review.mjs all           # Review all projects (full run)
 *   node scripts/year-start-review.mjs project ACT-JH # Review single project
 *   node scripts/year-start-review.mjs gaps          # Show compendium gaps
 *   node scripts/year-start-review.mjs reset         # Reset review progress
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { sendDiscordMessage, sendEmbed } from './discord-notify.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const BATCH_SIZE = 5;
const REVIEW_STATE_FILE = '.claude/cache/year-start-review-state.json';

// ============================================================================
// PROJECT DATA
// ============================================================================

function loadProjectCodes() {
  try {
    const data = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
    return data.projects || {};
  } catch (e) {
    console.error('Could not load project codes:', e.message);
    return {};
  }
}

function getReviewState() {
  try {
    if (existsSync(REVIEW_STATE_FILE)) {
      return JSON.parse(readFileSync(REVIEW_STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Start fresh
  }

  return {
    year: new Date().getFullYear(),
    started_at: new Date().toISOString(),
    reviewed: [],
    pending: Object.keys(loadProjectCodes()),
    findings: [],
    proposals_created: 0,
    last_batch_at: null
  };
}

function saveReviewState(state) {
  try {
    // Ensure directory exists
    const dir = REVIEW_STATE_FILE.split('/').slice(0, -1).join('/');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(REVIEW_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Could not save review state:', e.message);
  }
}

// ============================================================================
// PROJECT ANALYSIS
// ============================================================================

/**
 * Analyze a single project
 */
async function analyzeProject(projectCode, project) {
  const findings = {
    code: projectCode,
    name: project.name,
    category: project.category,
    priority: project.priority,
    analyzed_at: new Date().toISOString(),
    gaps: [],
    recommendations: [],
    health_score: 100
  };

  console.log(`  Analyzing ${projectCode}: ${project.name}...`);

  // 1. Check contacts
  if (supabase && project.ghl_tags?.length > 0) {
    let totalContacts = 0;
    let staleContacts = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const tag of project.ghl_tags) {
      const { data: contacts, count } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, last_contact_date', { count: 'exact' })
        .contains('tags', [tag]);

      totalContacts += count || 0;

      const stale = (contacts || []).filter(c =>
        !c.last_contact_date || c.last_contact_date < thirtyDaysAgo
      );
      staleContacts += stale.length;
    }

    if (totalContacts === 0) {
      findings.gaps.push({
        type: 'no_contacts',
        severity: 'high',
        message: 'No GHL contacts tagged for this project'
      });
      findings.health_score -= 20;
      findings.recommendations.push(`Add team contacts with tag "${project.ghl_tags[0]}"`);
    } else if (staleContacts > totalContacts * 0.5) {
      findings.gaps.push({
        type: 'stale_relationships',
        severity: 'medium',
        message: `${staleContacts}/${totalContacts} contacts haven't been contacted in 30+ days`
      });
      findings.health_score -= 10;
      findings.recommendations.push('Schedule check-ins with project stakeholders');
    }

    findings.contact_stats = { total: totalContacts, stale: staleContacts };
  }

  // 2. Check Notion pages (if token available)
  if (NOTION_TOKEN && project.notion_pages?.length > 0) {
    const notionGaps = await checkNotionPages(project);
    findings.gaps.push(...notionGaps);
    findings.health_score -= notionGaps.length * 5;
  }

  // 3. Check for recent communications
  if (supabase && project.ghl_tags?.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let recentComms = 0;

    for (const tag of project.ghl_tags) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id')
        .contains('tags', [tag]);

      if (contacts?.length > 0) {
        const contactIds = contacts.map(c => c.ghl_id);
        const { count } = await supabase
          .from('communications_history')
          .select('*', { count: 'exact', head: true })
          .in('ghl_contact_id', contactIds)
          .gte('occurred_at', sevenDaysAgo);

        recentComms += count || 0;
      }
    }

    if (recentComms === 0 && project.priority === 'high') {
      findings.gaps.push({
        type: 'no_recent_activity',
        severity: 'medium',
        message: 'No communications in the last 7 days for high-priority project'
      });
      findings.health_score -= 10;
      findings.recommendations.push('Check in with project leads');
    }

    findings.recent_comms = recentComms;
  }

  // 4. Check cultural protocols
  if (project.cultural_protocols) {
    findings.cultural_protocols = true;
    findings.recommendations.push('Ensure cultural protocols are followed in all communications');
  }

  // Ensure health score doesn't go below 0
  findings.health_score = Math.max(0, findings.health_score);

  return findings;
}

/**
 * Check Notion pages for project
 */
async function checkNotionPages(project) {
  const gaps = [];

  if (!NOTION_TOKEN) return gaps;

  try {
    for (const pageName of project.notion_pages || []) {
      // Search for the page
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          query: pageName,
          filter: { value: 'page', property: 'object' },
          page_size: 5
        })
      });

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        gaps.push({
          type: 'missing_notion_page',
          severity: 'medium',
          message: `Notion page "${pageName}" not found`
        });
      } else {
        // Check if page is stale (not updated in 60+ days)
        const page = data.results[0];
        const lastEdited = new Date(page.last_edited_time);
        const daysSinceEdit = (Date.now() - lastEdited.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceEdit > 60) {
          gaps.push({
            type: 'stale_notion_page',
            severity: 'low',
            message: `Notion page "${pageName}" hasn't been updated in ${Math.floor(daysSinceEdit)} days`
          });
        }
      }
    }
  } catch (e) {
    console.log(`    Note: Could not check Notion pages: ${e.message}`);
  }

  return gaps;
}

// ============================================================================
// PROPOSAL CREATION
// ============================================================================

async function createProposalsFromFindings(findings) {
  if (!supabase) return 0;

  let proposalsCreated = 0;

  for (const finding of findings) {
    if (finding.gaps.length === 0) continue;

    // Only create proposals for significant gaps
    const significantGaps = finding.gaps.filter(g => g.severity !== 'low');
    if (significantGaps.length === 0) continue;

    try {
      const { error } = await supabase
        .from('agent_proposals')
        .insert({
          agent_id: 'year-start-review',
          action_name: 'project_review',
          title: `Review ${finding.code}: ${finding.name}`,
          description: `Year-start review identified ${finding.gaps.length} gap(s)`,
          status: 'pending',
          priority: finding.priority === 'high' ? 'high' : 'normal',
          reasoning: {
            project_code: finding.code,
            health_score: finding.health_score,
            gaps: finding.gaps,
            recommendations: finding.recommendations
          },
          proposed_action: {
            type: 'project_review',
            project_code: finding.code,
            gaps: finding.gaps,
            recommendations: finding.recommendations
          },
          created_at: new Date().toISOString()
        });

      if (!error) {
        proposalsCreated++;
      }
    } catch (e) {
      console.log(`    Could not create proposal for ${finding.code}: ${e.message}`);
    }
  }

  return proposalsCreated;
}

// ============================================================================
// DISCORD NOTIFICATIONS
// ============================================================================

async function sendDailySummary(findings, state) {
  const healthyCount = findings.filter(f => f.health_score >= 80).length;
  const needsAttentionCount = findings.filter(f => f.health_score < 80).length;
  const totalGaps = findings.reduce((sum, f) => sum + f.gaps.length, 0);

  const fields = [
    {
      name: '📊 Projects Reviewed',
      value: `${findings.length} today\n${state.reviewed.length} total`,
      inline: true
    },
    {
      name: '✅ Healthy',
      value: `${healthyCount}`,
      inline: true
    },
    {
      name: '⚠️ Needs Attention',
      value: `${needsAttentionCount}`,
      inline: true
    }
  ];

  // Add top findings
  const topIssues = findings
    .filter(f => f.gaps.length > 0)
    .sort((a, b) => b.gaps.length - a.gaps.length)
    .slice(0, 3);

  if (topIssues.length > 0) {
    fields.push({
      name: '🔍 Key Findings',
      value: topIssues.map(f =>
        `• **${f.code}**: ${f.gaps[0].message}`
      ).join('\n'),
      inline: false
    });
  }

  // Progress bar
  const totalProjects = state.reviewed.length + state.pending.length;
  const progress = Math.round((state.reviewed.length / totalProjects) * 100);
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

  fields.push({
    name: '📈 Progress',
    value: `${progressBar} ${progress}%\n${state.pending.length} projects remaining`,
    inline: false
  });

  const embed = {
    title: `📋 Year-Start Review: Day ${Math.ceil(state.reviewed.length / BATCH_SIZE)}`,
    color: needsAttentionCount > 2 ? 0xED4245 : 0x00AE86,
    fields,
    footer: { text: 'ACT Year-Start Review' },
    timestamp: new Date().toISOString()
  };

  await sendEmbed('alerts', embed);
}

// ============================================================================
// COMMANDS
// ============================================================================

async function runDailyBatch() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📋 Year-Start Project Review - Daily Batch');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const projects = loadProjectCodes();
  let state = getReviewState();

  // Check if we're in a new year
  if (state.year !== new Date().getFullYear()) {
    console.log('New year detected. Resetting review state...');
    state = {
      year: new Date().getFullYear(),
      started_at: new Date().toISOString(),
      reviewed: [],
      pending: Object.keys(projects),
      findings: [],
      proposals_created: 0,
      last_batch_at: null
    };
  }

  // Get next batch
  const batch = state.pending.slice(0, BATCH_SIZE);

  if (batch.length === 0) {
    console.log('✅ All projects have been reviewed for this year!');
    console.log(`   Total: ${state.reviewed.length} projects`);
    console.log(`   Proposals created: ${state.proposals_created}`);
    return;
  }

  console.log(`Batch size: ${batch.length} projects`);
  console.log(`Remaining: ${state.pending.length - batch.length} after this batch\n`);

  const findings = [];

  for (const code of batch) {
    const project = projects[code];
    if (!project) {
      console.log(`  ⚠️ Skipping ${code} - not found in project codes`);
      continue;
    }

    const finding = await analyzeProject(code, project);
    findings.push(finding);

    // Log result
    const statusIcon = finding.health_score >= 80 ? '✅' :
                       finding.health_score >= 50 ? '⚠️' : '🔴';
    console.log(`  ${statusIcon} ${code}: ${finding.health_score}/100`);

    if (finding.gaps.length > 0) {
      finding.gaps.forEach(g => {
        const severity = g.severity === 'high' ? '🔴' :
                        g.severity === 'medium' ? '🟡' : '🟢';
        console.log(`      ${severity} ${g.message}`);
      });
    }
  }

  // Create proposals
  const proposalsCreated = await createProposalsFromFindings(findings);

  // Update state
  state.reviewed.push(...batch);
  state.pending = state.pending.filter(p => !batch.includes(p));
  state.findings.push(...findings);
  state.proposals_created += proposalsCreated;
  state.last_batch_at = new Date().toISOString();

  saveReviewState(state);

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(`📊 Batch Summary:`);
  console.log(`   Projects reviewed: ${findings.length}`);
  console.log(`   Proposals created: ${proposalsCreated}`);
  console.log(`   Total progress: ${state.reviewed.length}/${state.reviewed.length + state.pending.length}`);
  console.log('');

  // Send Discord summary
  await sendDailySummary(findings, state);
}

async function showStatus() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📋 Year-Start Review Status');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const state = getReviewState();
  const total = state.reviewed.length + state.pending.length;
  const progress = Math.round((state.reviewed.length / total) * 100);

  console.log(`Year: ${state.year}`);
  console.log(`Started: ${new Date(state.started_at).toLocaleDateString()}`);
  console.log(`Last batch: ${state.last_batch_at ? new Date(state.last_batch_at).toLocaleDateString() : 'Never'}`);
  console.log('');
  console.log(`Progress: ${state.reviewed.length}/${total} (${progress}%)`);
  console.log(`Proposals created: ${state.proposals_created}`);
  console.log('');

  // Show health distribution
  const healthScores = state.findings.map(f => f.health_score);
  if (healthScores.length > 0) {
    const healthy = healthScores.filter(s => s >= 80).length;
    const moderate = healthScores.filter(s => s >= 50 && s < 80).length;
    const poor = healthScores.filter(s => s < 50).length;

    console.log('Health Distribution:');
    console.log(`  ✅ Healthy (80+):    ${healthy}`);
    console.log(`  ⚠️ Moderate (50-79): ${moderate}`);
    console.log(`  🔴 Poor (<50):       ${poor}`);
  }

  console.log('');
  console.log('Remaining projects:');
  state.pending.slice(0, 10).forEach(p => console.log(`  • ${p}`));
  if (state.pending.length > 10) {
    console.log(`  ... and ${state.pending.length - 10} more`);
  }
}

async function showGaps() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📋 Compendium Gap Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const state = getReviewState();
  const projects = loadProjectCodes();

  // Count gaps by type
  const gapsByType = {};
  const projectsWithGaps = [];

  for (const finding of state.findings) {
    if (finding.gaps.length > 0) {
      projectsWithGaps.push(finding);
      finding.gaps.forEach(g => {
        gapsByType[g.type] = (gapsByType[g.type] || 0) + 1;
      });
    }
  }

  console.log('Gap Summary:');
  Object.entries(gapsByType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(25)} ${count}`);
    });

  console.log('\nProjects Needing Attention:');
  projectsWithGaps
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 10)
    .forEach(p => {
      const icon = p.health_score < 50 ? '🔴' : '🟡';
      console.log(`  ${icon} ${p.code}: ${p.name} (${p.health_score}/100)`);
      p.gaps.forEach(g => console.log(`      • ${g.message}`));
    });

  // Check for projects not yet in project-codes.json
  const notionPageCount = Object.values(projects)
    .flatMap(p => p.notion_pages || []).length;

  console.log(`\nProject Codes: ${Object.keys(projects).length} projects`);
  console.log(`Notion Pages Referenced: ${notionPageCount}`);
}

async function reviewSingleProject(projectCode) {
  const projects = loadProjectCodes();
  const project = projects[projectCode.toUpperCase()];

  if (!project) {
    console.log(`Project not found: ${projectCode}`);
    console.log('Available projects:', Object.keys(projects).join(', '));
    return;
  }

  console.log(`\n📋 Reviewing ${projectCode}: ${project.name}\n`);

  const finding = await analyzeProject(projectCode.toUpperCase(), project);

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(`Health Score: ${finding.health_score}/100`);
  console.log('');

  if (finding.contact_stats) {
    console.log(`Contacts: ${finding.contact_stats.total} (${finding.contact_stats.stale} stale)`);
  }
  if (finding.recent_comms !== undefined) {
    console.log(`Recent Communications: ${finding.recent_comms} (last 7 days)`);
  }
  if (finding.cultural_protocols) {
    console.log('⚠️ Cultural protocols apply');
  }

  if (finding.gaps.length > 0) {
    console.log('\nGaps:');
    finding.gaps.forEach(g => {
      const icon = g.severity === 'high' ? '🔴' :
                  g.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} [${g.severity}] ${g.message}`);
    });
  }

  if (finding.recommendations.length > 0) {
    console.log('\nRecommendations:');
    finding.recommendations.forEach(r => console.log(`  • ${r}`));
  }
}

async function reviewAll() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📋 Full Year-Start Review (All Projects)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const projects = loadProjectCodes();
  const projectCodes = Object.keys(projects);

  console.log(`Total projects: ${projectCodes.length}`);
  console.log('This may take a few minutes...\n');

  const findings = [];

  for (const code of projectCodes) {
    const finding = await analyzeProject(code, projects[code]);
    findings.push(finding);

    const statusIcon = finding.health_score >= 80 ? '✅' :
                       finding.health_score >= 50 ? '⚠️' : '🔴';
    console.log(`${statusIcon} ${code.padEnd(8)} ${finding.name.padEnd(30)} ${finding.health_score}/100`);
  }

  // Create proposals
  const proposalsCreated = await createProposalsFromFindings(findings);

  // Save state
  const state = {
    year: new Date().getFullYear(),
    started_at: new Date().toISOString(),
    reviewed: projectCodes,
    pending: [],
    findings,
    proposals_created: proposalsCreated,
    last_batch_at: new Date().toISOString()
  };
  saveReviewState(state);

  // Summary
  console.log('\n─────────────────────────────────────────────────────────────────');
  const healthyCount = findings.filter(f => f.health_score >= 80).length;
  const needsAttentionCount = findings.filter(f => f.health_score < 80).length;
  const totalGaps = findings.reduce((sum, f) => sum + f.gaps.length, 0);

  console.log(`\n📊 Review Complete:`);
  console.log(`   Total projects: ${findings.length}`);
  console.log(`   Healthy (80+): ${healthyCount}`);
  console.log(`   Needs attention: ${needsAttentionCount}`);
  console.log(`   Total gaps found: ${totalGaps}`);
  console.log(`   Proposals created: ${proposalsCreated}`);

  await sendDailySummary(findings, state);
}

function resetReview() {
  const state = {
    year: new Date().getFullYear(),
    started_at: new Date().toISOString(),
    reviewed: [],
    pending: Object.keys(loadProjectCodes()),
    findings: [],
    proposals_created: 0,
    last_batch_at: null
  };

  saveReviewState(state);
  console.log('Review state reset.');
  console.log(`Ready to review ${state.pending.length} projects.`);
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'batch';
const arg = process.argv[3];

switch (command) {
  case 'batch':
    await runDailyBatch();
    break;

  case 'status':
    await showStatus();
    break;

  case 'all':
    await reviewAll();
    break;

  case 'project':
    if (!arg) {
      console.log('Usage: year-start-review.mjs project <PROJECT-CODE>');
      console.log('Example: year-start-review.mjs project ACT-JH');
    } else {
      await reviewSingleProject(arg);
    }
    break;

  case 'gaps':
    await showGaps();
    break;

  case 'reset':
    resetReview();
    break;

  default:
    console.log(`
📋 Year-Start Project Review

Commands:
  batch             Run daily batch of ${BATCH_SIZE} projects (default)
  status            Show review progress
  all               Review ALL projects at once
  project <code>    Review a single project
  gaps              Show compendium gap analysis
  reset             Reset review progress

Workflow:
  1. Run "batch" daily to review 5 projects
  2. Check "status" to see progress
  3. Review "gaps" to see what needs attention
  4. Check agent_proposals table for recommendations

Example:
  node scripts/year-start-review.mjs batch
  node scripts/year-start-review.mjs status
  node scripts/year-start-review.mjs project ACT-JH
`);
}
