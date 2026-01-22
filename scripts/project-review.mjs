#!/usr/bin/env node
/**
 * Moon-Aligned Project Review
 *
 * Comprehensive project health review aligned with lunar cycles.
 * Different review focuses for each moon phase:
 *
 * - New Moon:       Review all projects, set intentions
 * - First Quarter:  Check progress, identify blockers
 * - Full Moon:      Celebrate wins, share stories
 * - Last Quarter:   Reflect, archive dormant, clear backlog
 *
 * Usage:
 *   node scripts/project-review.mjs              # Run full review
 *   node scripts/project-review.mjs health       # Show health dashboard
 *   node scripts/project-review.mjs dormant      # List dormant projects
 *   node scripts/project-review.mjs cold         # List cold relationships
 *   node scripts/project-review.mjs actions      # Generate action items
 *
 * Review Rhythm:
 *   Monthly:  Full review at New Moon
 *   Weekly:   Quick scan via morning brief
 *   On-demand: Before partner meetings
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes');
}

// Health thresholds (days)
const HEALTH_THRESHOLDS = {
  healthy: 14,    // < 14 days since contact
  warning: 30,    // 14-30 days
  critical: 60    // 30+ days
};

// ============================================================================
// MOON PHASE CALCULATION
// ============================================================================

function getMoonPhase(date = new Date()) {
  const synodicMonth = 29.53059;
  const knownNewMoon = new Date('2026-01-15');
  const daysSinceNew = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const moonAge = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;

  let phase, emoji, reviewFocus, actionVerbs;

  if (moonAge < 3.69) {
    phase = 'new_moon';
    emoji = '🌑';
    reviewFocus = 'Set Intentions';
    actionVerbs = ['initiate', 'start', 'plan', 'envision'];
  } else if (moonAge < 11.07) {
    phase = 'first_quarter';
    emoji = '🌓';
    reviewFocus = 'Check Progress';
    actionVerbs = ['follow up', 'push', 'advance', 'decide'];
  } else if (moonAge < 14.77) {
    phase = 'full_moon';
    emoji = '🌕';
    reviewFocus = 'Celebrate & Share';
    actionVerbs = ['celebrate', 'share', 'thank', 'amplify'];
  } else if (moonAge < 22.15) {
    phase = 'last_quarter';
    emoji = '🌗';
    reviewFocus = 'Reflect & Release';
    actionVerbs = ['archive', 'release', 'clear', 'reflect'];
  } else {
    phase = 'waning';
    emoji = '🌘';
    reviewFocus = 'Rest & Prepare';
    actionVerbs = ['rest', 'integrate', 'prepare', 'close'];
  }

  return { phase, emoji, moonAge: Math.round(moonAge * 10) / 10, reviewFocus, actionVerbs };
}

// ============================================================================
// DATA GATHERING
// ============================================================================

async function gatherProjectData() {
  if (!supabase) return { projects: [], contacts: [], comms: [], voiceNotes: [] };

  // Get contacts with tags
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags, last_contact_date');

  // Get recent communications (90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: comms } = await supabase
    .from('communications_history')
    .select('ghl_contact_id, direction, occurred_at, channel')
    .gte('occurred_at', ninetyDaysAgo);

  // Get recent voice notes
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('id, project_context, topics, recorded_at, action_items')
    .gte('recorded_at', thirtyDaysAgo);

  // Get project updates
  const { data: updates } = await supabase
    .from('project_updates')
    .select('project_id, content, created_at')
    .order('created_at', { ascending: false });

  return {
    contacts: contacts || [],
    comms: comms || [],
    voiceNotes: voiceNotes || [],
    updates: updates || []
  };
}

function analyzeProjectHealth(projectCode, project, data) {
  const { contacts, comms, voiceNotes, updates } = data;

  // Find contacts for this project
  const projectTags = (project.ghl_tags || []).map(t => t.toLowerCase());
  const projectContacts = contacts.filter(c =>
    (c.tags || []).some(t => projectTags.includes(t.toLowerCase()))
  );

  // Find most recent activity
  let lastActivity = null;
  let activitySource = null;

  // Check contact dates
  projectContacts.forEach(c => {
    if (c.last_contact_date && (!lastActivity || c.last_contact_date > lastActivity)) {
      lastActivity = c.last_contact_date;
      activitySource = 'contact';
    }
  });

  // Check voice notes
  (voiceNotes || []).forEach(vn => {
    if (vn.project_context?.toLowerCase() === projectCode.toLowerCase() ||
        vn.project_context?.toLowerCase() === projectCode.toLowerCase().replace('act-', '')) {
      if (!lastActivity || vn.recorded_at > lastActivity) {
        lastActivity = vn.recorded_at;
        activitySource = 'voice_note';
      }
    }
  });

  // Check project updates
  const projectUpdates = (updates || []).filter(u =>
    u.project_id?.toLowerCase() === projectCode.toLowerCase().replace('act-', '')
  );
  if (projectUpdates.length > 0 && (!lastActivity || projectUpdates[0].created_at > lastActivity)) {
    lastActivity = projectUpdates[0].created_at;
    activitySource = 'update';
  }

  // Calculate days since activity
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine health status
  let health, healthEmoji;
  if (daysSinceActivity === null) {
    health = 'unknown';
    healthEmoji = '⚪';
  } else if (daysSinceActivity <= HEALTH_THRESHOLDS.healthy) {
    health = 'healthy';
    healthEmoji = '🟢';
  } else if (daysSinceActivity <= HEALTH_THRESHOLDS.warning) {
    health = 'warning';
    healthEmoji = '🟡';
  } else {
    health = 'critical';
    healthEmoji = '🔴';
  }

  // Count open tasks (from voice note action items)
  const openTasks = (voiceNotes || [])
    .filter(vn => vn.project_context?.toLowerCase().includes(projectCode.toLowerCase().replace('act-', '')))
    .flatMap(vn => vn.action_items || [])
    .length;

  // Recent voice note count
  const recentVoiceNotes = (voiceNotes || []).filter(vn =>
    vn.project_context?.toLowerCase().includes(projectCode.toLowerCase().replace('act-', ''))
  ).length;

  return {
    code: projectCode,
    name: project.name,
    category: project.category,
    priority: project.priority,
    health,
    healthEmoji,
    lastActivity,
    daysSinceActivity,
    activitySource,
    contactCount: projectContacts.length,
    openTasks,
    recentVoiceNotes,
    recentUpdates: projectUpdates.length,
    lcaaThemes: project.lcaa_themes || []
  };
}

// ============================================================================
// HEALTH DASHBOARD
// ============================================================================

async function showHealthDashboard() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Project Health Dashboard');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const moonPhase = getMoonPhase();
  console.log(`Moon Phase: ${moonPhase.emoji} ${moonPhase.phase.replace('_', ' ')} (Day ${moonPhase.moonAge})`);
  console.log(`Review Focus: ${moonPhase.reviewFocus}`);
  console.log('');

  const data = await gatherProjectData();

  // Analyze all projects
  const projectHealth = [];
  for (const [code, project] of Object.entries(PROJECT_CODES.projects || {})) {
    if (project.status === 'active') {
      projectHealth.push(analyzeProjectHealth(code, project, data));
    }
  }

  // Group by health status
  const healthy = projectHealth.filter(p => p.health === 'healthy');
  const warning = projectHealth.filter(p => p.health === 'warning');
  const critical = projectHealth.filter(p => p.health === 'critical');
  const unknown = projectHealth.filter(p => p.health === 'unknown');

  // Summary
  console.log('SUMMARY');
  console.log('-'.repeat(50));
  console.log(`  🟢 Healthy (< ${HEALTH_THRESHOLDS.healthy}d):   ${healthy.length}`);
  console.log(`  🟡 Warning (${HEALTH_THRESHOLDS.healthy}-${HEALTH_THRESHOLDS.warning}d):  ${warning.length}`);
  console.log(`  🔴 Critical (${HEALTH_THRESHOLDS.warning}+d): ${critical.length}`);
  console.log(`  ⚪ Unknown:            ${unknown.length}`);
  console.log('');

  // Critical projects
  if (critical.length > 0) {
    console.log('CRITICAL (Need Immediate Attention)');
    console.log('-'.repeat(70));
    console.log('Code'.padEnd(10) + 'Project'.padEnd(25) + 'Days'.padEnd(8) + 'Contacts'.padEnd(10) + 'Last Source');
    console.log('-'.repeat(70));

    critical
      .sort((a, b) => (b.daysSinceActivity || 999) - (a.daysSinceActivity || 999))
      .forEach(p => {
        console.log(
          p.code.padEnd(10) +
          p.name.slice(0, 23).padEnd(25) +
          (p.daysSinceActivity?.toString() || '?').padEnd(8) +
          p.contactCount.toString().padEnd(10) +
          (p.activitySource || 'none')
        );
      });
    console.log('');
  }

  // Warning projects
  if (warning.length > 0) {
    console.log('WARNING (Follow Up Recommended)');
    console.log('-'.repeat(70));

    warning
      .sort((a, b) => (b.daysSinceActivity || 999) - (a.daysSinceActivity || 999))
      .forEach(p => {
        console.log(
          `${p.healthEmoji} ${p.code.padEnd(8)} ${p.name.slice(0, 23).padEnd(25)} ${p.daysSinceActivity}d`
        );
      });
    console.log('');
  }

  // High priority projects status
  console.log('HIGH PRIORITY PROJECTS');
  console.log('-'.repeat(70));

  projectHealth
    .filter(p => p.priority === 'high')
    .sort((a, b) => (a.daysSinceActivity || 999) - (b.daysSinceActivity || 999))
    .forEach(p => {
      const categoryIcon = PROJECT_CODES.categories?.[p.category]?.icon || '📋';
      console.log(
        `${p.healthEmoji} ${p.code.padEnd(8)} ${categoryIcon} ${p.name.slice(0, 20).padEnd(22)} ${(p.daysSinceActivity?.toString() || '?') + 'd'.padEnd(5)} ${p.contactCount} contacts`
      );
    });

  return { healthy, warning, critical, unknown };
}

// ============================================================================
// DORMANT PROJECTS
// ============================================================================

async function showDormantProjects() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Dormant Projects (60+ days inactive)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const data = await gatherProjectData();
  const dormant = [];

  for (const [code, project] of Object.entries(PROJECT_CODES.projects || {})) {
    if (project.status !== 'active') continue;

    const health = analyzeProjectHealth(code, project, data);
    if (health.daysSinceActivity >= 60 || health.daysSinceActivity === null) {
      dormant.push(health);
    }
  }

  if (dormant.length === 0) {
    console.log('No dormant projects found. All projects have recent activity.\n');
    return;
  }

  console.log(`Found ${dormant.length} dormant projects:\n`);
  console.log('Code'.padEnd(10) + 'Project'.padEnd(25) + 'Days'.padEnd(10) + 'Contacts'.padEnd(10) + 'Action');
  console.log('-'.repeat(70));

  dormant
    .sort((a, b) => (b.daysSinceActivity || 999) - (a.daysSinceActivity || 999))
    .forEach(p => {
      const action = p.contactCount > 0 ? 'Revive or Archive' : 'Archive';
      console.log(
        p.code.padEnd(10) +
        p.name.slice(0, 23).padEnd(25) +
        (p.daysSinceActivity?.toString() || '?').padEnd(10) +
        p.contactCount.toString().padEnd(10) +
        action
      );
    });

  console.log('\nActions:');
  console.log('  To archive: Update status to "archived" in project-codes.json');
  console.log('  To revive:  Record a voice note or send a message to a contact');
  console.log('  Auto-archive: node scripts/archive-dormant.mjs');

  return dormant;
}

// ============================================================================
// COLD RELATIONSHIPS
// ============================================================================

async function showColdRelationships() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Cold Relationships (Temp < 40)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!supabase) {
    console.log('Database connection required');
    return;
  }

  // Get relationship health data
  const { data: health } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, days_since_contact, suggested_actions')
    .lt('temperature', 40)
    .order('temperature', { ascending: true })
    .limit(20);

  // Get contact names
  const contactIds = (health || []).map(h => h.ghl_contact_id);
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .in('ghl_id', contactIds);

  const contactMap = {};
  (contacts || []).forEach(c => { contactMap[c.ghl_id] = c; });

  if (!health || health.length === 0) {
    console.log('No cold relationships found. All contacts are warm!\n');
    return;
  }

  console.log('Contact'.padEnd(25) + 'Temp'.padEnd(8) + 'Days'.padEnd(8) + 'Tags'.padEnd(25) + 'Action');
  console.log('-'.repeat(80));

  (health || []).forEach(h => {
    const contact = contactMap[h.ghl_contact_id] || {};
    const tempEmoji = h.temperature < 20 ? '🥶' : h.temperature < 30 ? '❄️' : '🌡️';
    const tags = (contact.tags || []).slice(0, 2).join(', ');
    const action = h.suggested_actions?.[0] || 'Reach out';

    console.log(
      (contact.full_name || contact.email || h.ghl_contact_id).slice(0, 23).padEnd(25) +
      `${tempEmoji} ${h.temperature}`.padEnd(8) +
      (h.days_since_contact?.toString() || '?').padEnd(8) +
      tags.slice(0, 23).padEnd(25) +
      action.slice(0, 30)
    );
  });

  console.log('\nTo warm up relationships:');
  console.log('  - Send a personal check-in message');
  console.log('  - Schedule a call');
  console.log('  - Share something relevant to them');

  return health;
}

// ============================================================================
// MOON-ALIGNED ACTIONS
// ============================================================================

async function generateActions() {
  const moonPhase = getMoonPhase();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ${moonPhase.emoji} Moon-Aligned Project Actions`);
  console.log(`  Focus: ${moonPhase.reviewFocus}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const data = await gatherProjectData();
  const actions = [];

  // Analyze all projects
  const projectHealth = [];
  for (const [code, project] of Object.entries(PROJECT_CODES.projects || {})) {
    if (project.status === 'active') {
      projectHealth.push(analyzeProjectHealth(code, project, data));
    }
  }

  const critical = projectHealth.filter(p => p.health === 'critical');
  const warning = projectHealth.filter(p => p.health === 'warning');
  const highPriority = projectHealth.filter(p => p.priority === 'high');

  // Generate phase-appropriate actions
  if (moonPhase.phase === 'new_moon' || moonPhase.phase === 'waning') {
    // New Moon: Set intentions, start new things
    console.log('🌱 INTENTIONS TO SET');
    console.log('-'.repeat(50));

    highPriority.slice(0, 5).forEach(p => {
      actions.push(`[ ] Set monthly intention for ${p.code} (${p.name})`);
      console.log(`  [ ] Set intention for ${p.code}: What do we want to achieve?`);
    });

    if (critical.length > 0) {
      console.log('\n🔄 DORMANT PROJECTS TO DECIDE ON');
      console.log('-'.repeat(50));
      critical.slice(0, 5).forEach(p => {
        actions.push(`[ ] Decide: Revive or archive ${p.code}?`);
        console.log(`  [ ] ${p.code}: Revive with intention, or archive? (${p.daysSinceActivity}d inactive)`);
      });
    }

  } else if (moonPhase.phase === 'first_quarter') {
    // First Quarter: Push through, take action
    console.log('⚡ ACTIONS TO TAKE');
    console.log('-'.repeat(50));

    warning.forEach(p => {
      actions.push(`[ ] Follow up on ${p.code} (${p.daysSinceActivity} days)`);
      console.log(`  [ ] ${p.code}: Follow up - ${p.daysSinceActivity} days since contact`);
    });

    console.log('\n📞 CALLS TO MAKE');
    console.log('-'.repeat(50));
    highPriority.slice(0, 5).forEach(p => {
      if (p.contactCount > 0) {
        actions.push(`[ ] Call key contact for ${p.code}`);
        console.log(`  [ ] ${p.code}: Schedule call with key contact`);
      }
    });

  } else if (moonPhase.phase === 'full_moon') {
    // Full Moon: Celebrate, share
    console.log('✨ WINS TO CELEBRATE');
    console.log('-'.repeat(50));

    projectHealth.filter(p => p.health === 'healthy').slice(0, 5).forEach(p => {
      actions.push(`[ ] Celebrate progress on ${p.code}`);
      console.log(`  [ ] ${p.code}: Document and celebrate recent progress`);
    });

    console.log('\n📖 STORIES TO SHARE');
    console.log('-'.repeat(50));
    highPriority.filter(p => p.lcaaThemes.includes('Amplify')).forEach(p => {
      actions.push(`[ ] Share ${p.code} story`);
      console.log(`  [ ] ${p.code}: Collect or share an impact story`);
    });

    console.log('\n🙏 THANKS TO GIVE');
    console.log('-'.repeat(50));
    highPriority.forEach(p => {
      if (p.contactCount > 0) {
        actions.push(`[ ] Thank partners for ${p.code}`);
        console.log(`  [ ] ${p.code}: Send thanks to ${p.contactCount} partners`);
      }
    });

  } else {
    // Last Quarter: Reflect, release
    console.log('📊 REVIEWS TO COMPLETE');
    console.log('-'.repeat(50));

    highPriority.forEach(p => {
      actions.push(`[ ] Review ${p.code} progress`);
      console.log(`  [ ] ${p.code}: Review progress and lessons learned`);
    });

    console.log('\n🧹 THINGS TO ARCHIVE');
    console.log('-'.repeat(50));
    critical.forEach(p => {
      actions.push(`[ ] Archive ${p.code} if truly dormant`);
      console.log(`  [ ] ${p.code}: Archive or set revival plan (${p.daysSinceActivity}d inactive)`);
    });

    console.log('\n📧 BACKLOG TO CLEAR');
    console.log('-'.repeat(50));
    console.log('  [ ] Clear email backlog');
    console.log('  [ ] Process pending voice notes');
    console.log('  [ ] Update project statuses');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Generated ${actions.length} actions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  return actions;
}

// ============================================================================
// FULL REVIEW
// ============================================================================

async function runFullReview() {
  const moonPhase = getMoonPhase();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ${moonPhase.emoji} ACT Project Review`);
  console.log(`  ${moonPhase.reviewFocus} | Moon Day ${moonPhase.moonAge}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await showHealthDashboard();
  console.log('');
  await generateActions();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Additional Commands:');
  console.log('    node scripts/project-review.mjs dormant  - List dormant projects');
  console.log('    node scripts/project-review.mjs cold     - List cold relationships');
  console.log('    node scripts/act-project-manager.mjs report - Full portfolio report');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'review';

switch (command) {
  case 'review':
    runFullReview()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'health':
    showHealthDashboard()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'dormant':
    showDormantProjects()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'cold':
    showColdRelationships()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'actions':
    generateActions()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  default:
    console.log(`
Moon-Aligned Project Review

Commands:
  review              Run full review (default)
  health              Show health dashboard
  dormant             List dormant projects (60+ days)
  cold                List cold relationships (temp < 40)
  actions             Generate moon-aligned action items

Health Indicators:
  🟢 Healthy:  < 14 days since activity
  🟡 Warning:  14-30 days
  🔴 Critical: 30+ days
  ⚪ Unknown:  No recorded activity

Moon Phases:
  🌑 New Moon:       Set intentions, start new things
  🌓 First Quarter:  Push through, take action
  🌕 Full Moon:      Celebrate wins, share stories
  🌗 Last Quarter:   Reflect, release, archive
`);
}
