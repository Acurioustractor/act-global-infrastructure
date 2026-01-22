#!/usr/bin/env node
/**
 * BUNYA - Project Pulse Agent
 *
 * Named after the Bunya pine - a gathering tree for First Nations peoples.
 * Like the Bunya festival that brings people together, this agent monitors
 * project health and brings attention to projects needing care.
 *
 * Usage:
 *   node scripts/bunya-project-pulse.mjs scan           # Scan all projects
 *   node scripts/bunya-project-pulse.mjs scan --alert   # Scan and send alerts
 *   node scripts/bunya-project-pulse.mjs status ACT-JH  # Check specific project
 *   node scripts/bunya-project-pulse.mjs stalled        # Show stalled projects
 *   node scripts/bunya-project-pulse.mjs at-risk        # Show at-risk projects
 *
 * What it monitors:
 *   - Days since last communication with project contacts
 *   - Days since last project update
 *   - Relationship health of key contacts
 *   - Activity trends (improving/declining)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes
let PROJECT_CODES = {};
try {
  const projectCodesPath = 'config/project-codes.json';
  if (existsSync(projectCodesPath)) {
    PROJECT_CODES = JSON.parse(readFileSync(projectCodesPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load project codes:', e.message);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH THRESHOLDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const THRESHOLDS = {
  // Days since last activity
  CRITICAL_DAYS: 90,     // No activity in 90+ days = critical
  WARNING_DAYS: 60,      // No activity in 60+ days = warning
  ATTENTION_DAYS: 30,    // No activity in 30+ days = needs attention

  // Relationship health
  COLD_CONTACTS_THRESHOLD: 3,  // 3+ cold contacts = at risk

  // Health score ranges
  HEALTHY: 70,           // 70+ = healthy
  NEEDS_ATTENTION: 50,   // 50-69 = needs attention
  AT_RISK: 30,           // 30-49 = at risk
  CRITICAL: 0            // 0-29 = critical
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA GATHERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get contacts for a project by GHL tags
 */
async function getProjectContacts(project) {
  const tags = project.ghl_tags || [];
  if (tags.length === 0) return [];

  // Get contacts with relationship health data
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select(`
      ghl_id,
      full_name,
      email,
      tags,
      last_contact_date,
      relationship_health (
        temperature,
        days_since_contact
      )
    `)
    .limit(500);

  if (error) {
    console.error(`Error fetching contacts: ${error.message}`);
    return [];
  }

  // Filter contacts that have any of the project's tags
  const projectContacts = (contacts || []).filter(c => {
    const contactTags = (c.tags || []).map(t => t.toLowerCase());
    return tags.some(t => contactTags.includes(t.toLowerCase()));
  }).map(c => ({
    ...c,
    temperature: c.relationship_health?.[0]?.temperature || 0,
    days_since_contact: c.relationship_health?.[0]?.days_since_contact || 999
  }));

  return projectContacts;
}

/**
 * Get recent communications for project contacts
 */
async function getProjectCommunications(contactIds, days = 90) {
  if (contactIds.length === 0) return { recent: [], stats: { total: 0, last7: 0, last30: 0 } };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: comms, error } = await supabase
    .from('communications_history')
    .select('id, ghl_contact_id, channel, direction, occurred_at')
    .in('ghl_contact_id', contactIds)
    .gte('occurred_at', cutoffDate.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error(`Error fetching communications: ${error.message}`);
    return { recent: [], stats: { total: 0, last7: 0, last30: 0 } };
  }

  const now = new Date();
  const last7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total: comms?.length || 0,
    last7: (comms || []).filter(c => new Date(c.occurred_at) > last7).length,
    last30: (comms || []).filter(c => new Date(c.occurred_at) > last30).length
  };

  return { recent: comms || [], stats };
}

/**
 * Get project updates
 */
async function getProjectUpdates(projectCode, projectName, days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Try to find by project_name (which stores the display name)
  const { data: updates, error } = await supabase
    .from('project_updates')
    .select('id, content, update_type, created_at')
    .eq('project_name', projectName)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error && error.code !== 'PGRST116') {  // Ignore "no rows" error
    console.error(`Error fetching updates: ${error.message}`);
  }

  return updates || [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate health score for a project
 */
async function calculateProjectHealth(projectCode, project) {
  const health = {
    projectCode,
    projectName: project.name,
    score: 0,
    status: 'unknown',
    daysSinceActivity: null,
    contactCount: 0,
    coldContacts: 0,
    recentComms: 0,
    risks: [],
    recommendations: [],
    analyzedAt: new Date().toISOString()
  };

  // 1. Get project contacts
  const contacts = await getProjectContacts(project);
  health.contactCount = contacts.length;

  if (contacts.length === 0) {
    health.risks.push('No contacts linked to project');
    health.recommendations.push('Tag relevant GHL contacts with project tags');
    health.score = 20;
    health.status = 'critical';
    return health;
  }

  // 2. Analyze contact health
  const contactIds = contacts.map(c => c.ghl_id);
  const coldContacts = contacts.filter(c => {
    const temp = c.temperature || 0;
    return temp < 30;  // Cold if temperature < 30
  });
  health.coldContacts = coldContacts.length;

  // 3. Get communications
  const { stats: commStats } = await getProjectCommunications(contactIds);
  health.recentComms = commStats.last30;

  // 4. Get project updates
  const updates = await getProjectUpdates(projectCode, project.name);
  health.recentUpdates = updates.length;

  // 5. Calculate days since last activity
  let lastActivityDate = null;

  // Check last communication
  const { recent: recentComms } = await getProjectCommunications(contactIds, 365);
  if (recentComms.length > 0) {
    lastActivityDate = new Date(recentComms[0].occurred_at);
  }

  // Check last update
  if (updates.length > 0) {
    const updateDate = new Date(updates[0].created_at);
    if (!lastActivityDate || updateDate > lastActivityDate) {
      lastActivityDate = updateDate;
    }
  }

  if (lastActivityDate) {
    health.daysSinceActivity = Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24));
  } else {
    health.daysSinceActivity = 999;  // No activity found
  }

  // 6. Calculate score components
  let score = 100;

  // Activity recency (40% weight)
  if (health.daysSinceActivity > THRESHOLDS.CRITICAL_DAYS) {
    score -= 40;
    health.risks.push(`No activity in ${health.daysSinceActivity} days (critical)`);
    health.recommendations.push('Schedule a check-in call with key contacts');
  } else if (health.daysSinceActivity > THRESHOLDS.WARNING_DAYS) {
    score -= 25;
    health.risks.push(`No activity in ${health.daysSinceActivity} days (warning)`);
    health.recommendations.push('Send a project update or reach out to contacts');
  } else if (health.daysSinceActivity > THRESHOLDS.ATTENTION_DAYS) {
    score -= 10;
    health.risks.push(`No activity in ${health.daysSinceActivity} days`);
  }

  // Contact health (30% weight)
  const coldRatio = health.coldContacts / health.contactCount;
  if (coldRatio > 0.5) {
    score -= 30;
    health.risks.push(`${Math.round(coldRatio * 100)}% of contacts are cold`);
    health.recommendations.push('Run cultivator agent for this project');
  } else if (coldRatio > 0.3) {
    score -= 15;
    health.risks.push(`${Math.round(coldRatio * 100)}% of contacts are cooling`);
  }

  // Communication volume (20% weight)
  if (health.recentComms === 0) {
    score -= 20;
    health.risks.push('No communications in last 30 days');
    health.recommendations.push('Initiate outreach to key contacts');
  } else if (health.recentComms < 3) {
    score -= 10;
    health.risks.push('Low communication volume (< 3 in 30 days)');
  }

  // Project priority boost (10% weight)
  if (project.priority === 'high') {
    // High priority projects get scrutinized more
    if (health.daysSinceActivity > 14) {
      score -= 10;
      health.risks.push('High-priority project with low recent activity');
    }
  }

  // Set final score and status
  health.score = Math.max(0, Math.min(100, score));

  if (health.score >= THRESHOLDS.HEALTHY) {
    health.status = 'healthy';
  } else if (health.score >= THRESHOLDS.NEEDS_ATTENTION) {
    health.status = 'needs_attention';
  } else if (health.score >= THRESHOLDS.AT_RISK) {
    health.status = 'at_risk';
  } else {
    health.status = 'critical';
  }

  return health;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Store health analysis in database
 */
async function storeHealthAnalysis(health) {
  // First, try to find existing project in agentic_projects
  let { data: project } = await supabase
    .from('agentic_projects')
    .select('id')
    .eq('name', health.projectName)
    .single();

  // If not found, create it
  if (!project) {
    const { data: newProject, error: createError } = await supabase
      .from('agentic_projects')
      .insert({
        name: health.projectName,
        goal: `Project: ${health.projectCode}`,
        status: 'active',
        context: { project_code: health.projectCode }
      })
      .select()
      .single();

    if (createError) {
      console.error(`Error creating project: ${createError.message}`);
      return;
    }
    project = newProject;
  }

  // Check for existing analysis
  const { data: existing } = await supabase
    .from('project_health_analysis')
    .select('id')
    .eq('project_id', project.id)
    .single();

  const analysisData = {
    project_id: project.id,
    health_score: health.score,
    risks: health.risks,
    opportunities: [],
    recommendations: health.recommendations,
    analysis_date: health.analyzedAt,
    metadata: {
      project_code: health.projectCode,
      contact_count: health.contactCount,
      cold_contacts: health.coldContacts,
      recent_comms: health.recentComms,
      days_since_activity: health.daysSinceActivity,
      status: health.status
    }
  };

  let error;
  if (existing) {
    // Update existing
    ({ error } = await supabase
      .from('project_health_analysis')
      .update(analysisData)
      .eq('id', existing.id));
  } else {
    // Insert new
    ({ error } = await supabase
      .from('project_health_analysis')
      .insert(analysisData));
  }

  if (error) {
    console.error(`Error storing health analysis: ${error.message}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send Discord alert for at-risk projects
 */
async function sendDiscordAlert(atRiskProjects) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ALERTS;
  if (!webhookUrl) {
    console.log('No DISCORD_WEBHOOK_ALERTS configured, skipping alert');
    return;
  }

  const criticalCount = atRiskProjects.filter(p => p.status === 'critical').length;
  const atRiskCount = atRiskProjects.filter(p => p.status === 'at_risk').length;

  let content = `## BUNYA Project Pulse Alert\n\n`;

  if (criticalCount > 0) {
    content += `**${criticalCount} CRITICAL** projects need immediate attention:\n`;
    atRiskProjects
      .filter(p => p.status === 'critical')
      .slice(0, 5)
      .forEach(p => {
        content += `- **${p.projectName}** (${p.projectCode}): ${p.daysSinceActivity} days inactive, score ${p.score}\n`;
      });
    content += '\n';
  }

  if (atRiskCount > 0) {
    content += `**${atRiskCount} AT-RISK** projects:\n`;
    atRiskProjects
      .filter(p => p.status === 'at_risk')
      .slice(0, 5)
      .forEach(p => {
        content += `- **${p.projectName}**: ${p.risks[0] || 'Low activity'}\n`;
      });
  }

  content += `\nRun \`node scripts/bunya-project-pulse.mjs stalled\` for details.`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    console.log('Discord alert sent');
  } catch (e) {
    console.error('Failed to send Discord alert:', e.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Scan all projects
 */
async function scanAllProjects(sendAlert = false) {
  console.log('\nBUNYA Project Pulse - Scanning all projects...\n');

  const projects = PROJECT_CODES.projects || {};
  const projectCodes = Object.keys(projects);

  if (projectCodes.length === 0) {
    console.log('No projects found in config/project-codes.json');
    return;
  }

  console.log(`Found ${projectCodes.length} projects to analyze\n`);

  const results = [];
  const atRiskProjects = [];

  for (const code of projectCodes) {
    const project = projects[code];
    if (project.status === 'archived') continue;

    process.stdout.write(`Analyzing ${code}...`);
    const health = await calculateProjectHealth(code, project);
    results.push(health);

    // Store in database
    await storeHealthAnalysis(health);

    // Track at-risk projects
    if (health.status === 'critical' || health.status === 'at_risk') {
      atRiskProjects.push(health);
    }

    // Status indicator
    const statusIcon = {
      'healthy': '🟢',
      'needs_attention': '🟡',
      'at_risk': '🟠',
      'critical': '🔴'
    }[health.status] || '⚪';

    console.log(` ${statusIcon} ${health.score}/100 (${health.status})`);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const statusCounts = {
    healthy: results.filter(r => r.status === 'healthy').length,
    needs_attention: results.filter(r => r.status === 'needs_attention').length,
    at_risk: results.filter(r => r.status === 'at_risk').length,
    critical: results.filter(r => r.status === 'critical').length
  };

  console.log(`🟢 Healthy:          ${statusCounts.healthy}`);
  console.log(`🟡 Needs Attention:  ${statusCounts.needs_attention}`);
  console.log(`🟠 At Risk:          ${statusCounts.at_risk}`);
  console.log(`🔴 Critical:         ${statusCounts.critical}`);
  console.log(`   Total:            ${results.length}\n`);

  // Send alert if requested
  if (sendAlert && atRiskProjects.length > 0) {
    await sendDiscordAlert(atRiskProjects);
  }

  return results;
}

/**
 * Show stalled projects
 */
async function showStalledProjects() {
  console.log('\nBUNYA - Stalled Projects Report\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const projects = PROJECT_CODES.projects || {};
  const stalled = [];

  for (const [code, project] of Object.entries(projects)) {
    if (project.status === 'archived') continue;

    const health = await calculateProjectHealth(code, project);
    if (health.daysSinceActivity > THRESHOLDS.ATTENTION_DAYS) {
      stalled.push(health);
    }
  }

  // Sort by days since activity (most stalled first)
  stalled.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  if (stalled.length === 0) {
    console.log('No stalled projects found! All projects have recent activity.\n');
    return;
  }

  console.log(`Found ${stalled.length} stalled projects:\n`);

  for (const p of stalled) {
    const statusIcon = p.status === 'critical' ? '🔴' : p.status === 'at_risk' ? '🟠' : '🟡';

    console.log(`${statusIcon} ${p.projectName} (${p.projectCode})`);
    console.log(`   Days inactive: ${p.daysSinceActivity}`);
    console.log(`   Health score:  ${p.score}/100`);
    console.log(`   Contacts:      ${p.contactCount} (${p.coldContacts} cold)`);
    console.log(`   Risks:         ${p.risks.join(', ') || 'None'}`);
    console.log(`   Action:        ${p.recommendations[0] || 'Review project status'}`);
    console.log('');
  }
}

/**
 * Show at-risk projects
 */
async function showAtRiskProjects() {
  console.log('\nBUNYA - At-Risk Projects Report\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const projects = PROJECT_CODES.projects || {};
  const atRisk = [];

  for (const [code, project] of Object.entries(projects)) {
    if (project.status === 'archived') continue;

    const health = await calculateProjectHealth(code, project);
    if (health.status === 'critical' || health.status === 'at_risk') {
      atRisk.push(health);
    }
  }

  // Sort by score (lowest first)
  atRisk.sort((a, b) => a.score - b.score);

  if (atRisk.length === 0) {
    console.log('No at-risk projects! All projects are healthy or just need attention.\n');
    return;
  }

  console.log(`Found ${atRisk.length} at-risk projects:\n`);

  for (const p of atRisk) {
    const statusIcon = p.status === 'critical' ? '🔴 CRITICAL' : '🟠 AT RISK';

    console.log(`${statusIcon}: ${p.projectName}`);
    console.log(`   Code:          ${p.projectCode}`);
    console.log(`   Health Score:  ${p.score}/100`);
    console.log(`   Days Inactive: ${p.daysSinceActivity}`);
    console.log(`   Contacts:      ${p.contactCount} total, ${p.coldContacts} cold`);
    console.log(`   Recent Comms:  ${p.recentComms} in last 30 days`);
    console.log(`   Risks:`);
    p.risks.forEach(r => console.log(`     - ${r}`));
    console.log(`   Recommendations:`);
    p.recommendations.forEach(r => console.log(`     - ${r}`));
    console.log('');
  }
}

/**
 * Check status of specific project
 */
async function checkProjectStatus(projectCode) {
  const project = PROJECT_CODES.projects?.[projectCode.toUpperCase()];

  if (!project) {
    console.log(`Project ${projectCode} not found in config/project-codes.json`);
    return;
  }

  console.log(`\nBUNYA - Project Status: ${project.name}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const health = await calculateProjectHealth(projectCode.toUpperCase(), project);

  const statusIcon = {
    'healthy': '🟢 HEALTHY',
    'needs_attention': '🟡 NEEDS ATTENTION',
    'at_risk': '🟠 AT RISK',
    'critical': '🔴 CRITICAL'
  }[health.status];

  console.log(`Status:           ${statusIcon}`);
  console.log(`Health Score:     ${health.score}/100`);
  console.log(`Days Inactive:    ${health.daysSinceActivity}`);
  console.log(`Category:         ${project.category}`);
  console.log(`Priority:         ${project.priority || 'normal'}`);
  console.log(`Leads:            ${(project.leads || []).join(', ') || 'Not specified'}`);
  console.log('');
  console.log(`Contacts:         ${health.contactCount} linked`);
  console.log(`Cold Contacts:    ${health.coldContacts}`);
  console.log(`Recent Comms:     ${health.recentComms} (last 30 days)`);
  console.log('');

  if (health.risks.length > 0) {
    console.log('Risks:');
    health.risks.forEach(r => console.log(`  - ${r}`));
    console.log('');
  }

  if (health.recommendations.length > 0) {
    console.log('Recommendations:');
    health.recommendations.forEach(r => console.log(`  - ${r}`));
    console.log('');
  }

  // Store the analysis
  await storeHealthAnalysis(health);
  console.log('Analysis stored in database.\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const command = process.argv[2];
const arg = process.argv[3];

function showHelp() {
  console.log(`
BUNYA - Project Pulse Agent

Named after the Bunya pine gathering tree.
Monitors project health and brings attention to projects needing care.

Commands:
  scan              Scan all projects and calculate health scores
  scan --alert      Scan and send Discord alert for at-risk projects
  status <code>     Check health of specific project (e.g., ACT-JH)
  stalled           Show all stalled projects (no activity in 30+ days)
  at-risk           Show critical and at-risk projects

Health Levels:
  🟢 Healthy (70-100):       Project is active and relationships are warm
  🟡 Needs Attention (50-69): Some activity decline or cooling contacts
  🟠 At Risk (30-49):        Significant inactivity or cold contacts
  🔴 Critical (0-29):        Urgent attention needed

Examples:
  node scripts/bunya-project-pulse.mjs scan
  node scripts/bunya-project-pulse.mjs status ACT-JH
  node scripts/bunya-project-pulse.mjs stalled
  node scripts/bunya-project-pulse.mjs at-risk
`);
}

switch (command) {
  case 'scan':
    scanAllProjects(arg === '--alert').then(() => process.exit(0));
    break;
  case 'status':
    if (!arg) {
      console.log('Usage: bunya-project-pulse.mjs status <project-code>');
      process.exit(1);
    }
    checkProjectStatus(arg).then(() => process.exit(0));
    break;
  case 'stalled':
    showStalledProjects().then(() => process.exit(0));
    break;
  case 'at-risk':
    showAtRiskProjects().then(() => process.exit(0));
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    showHelp();
}
