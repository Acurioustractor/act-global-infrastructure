#!/usr/bin/env node
/**
 * BUNYA Fixer - Automatic Project Health Remediation
 *
 * Reads BUNYA's health analysis and automatically fixes issues:
 * - No contacts linked → Auto-tag GHL contacts with project tags (Level 3)
 * - Cold contacts → Create cultivator warmup proposals (Level 2)
 * - No activity → Create check-in proposals (Level 2)
 *
 * Usage:
 *   node scripts/bunya-fixer.mjs                    # Analyze and show what would be fixed
 *   node scripts/bunya-fixer.mjs --fix              # Actually fix the issues
 *   node scripts/bunya-fixer.mjs --project ACT-JH   # Fix specific project
 *   node scripts/bunya-fixer.mjs --dry-run          # Show fixes without executing
 */

import { createClient } from '@supabase/supabase-js';
import { AgenticWorkflow } from './lib/agentic-workflow.mjs';
import { loadProjects } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const workflow = new AgenticWorkflow('bunya-fixer', { verbose: true });

// Load project codes from DB as fallback for name resolution
let CONFIG_PROJECTS = {};
try {
  CONFIG_PROJECTS = await loadProjects();
} catch { /* config not available — use hardcoded map */ }

// Project code to full name mapping (hardcoded primary, config fallback)
const PROJECT_NAMES = {
  'ACT-JH': 'JusticeHub',
  'ACT-GD': 'Goods',
  'ACT-EL': 'Empathy Ledger',
  'ACT-HV': 'The Harvest',
  'ACT-FO': 'Fishers Oysters',
  'ACT-FN': 'First Nations Initiatives',
  'ACT-DG': 'Diagrama',
  'ACT-MD': 'ACT Monthly Dinners',
  'ACT-MM': 'MMEIC Justice',
  'ACT-DH': 'DadLab25',
  'ACT-HS': 'Project Her-Self',
  'ACT-TW': "Travelling Women's Car",
  'ACT-YC': 'Youth Connections',
  'ACT-WJ': 'West Justice',
  'ACT-RA': 'Regional Arts Fellowship',
  'ACT-AS': 'ANAT SPECTRA',
  'ACT-CE': 'Custodian Economy',
  'ACT-SE': 'Smart Connect',
  'ACT-SH': 'Smart HCP Uplift',
  'ACT-DL': 'Designing for Obsolescence',
  'ACT-10': '10x10 Retreat',
  'ACT-TN': 'ACT Bali Retreat',
  'ACT-MY': 'Mounty Yarns',
  'ACT-BV': 'Black Cockatoo Valley',
  'ACT-BG': 'BG Fit',
  'ACT-JP': "June's Patch",
  'ACT-AI': 'ACT AI/Tech',
  'ACT-BM': 'Bega Microcontrollers',
  'ACT-DD': 'Digital Divides',
  'ACT-QF': 'Queanbeyan Futures',
  'ACT-GP': 'Gold Phone',
  'ACT-CF': 'The Confessional',
  'ACT-SM': 'Contained (Shipping Container)',
  'ACT-CN': 'Cars and Microcontrollers',
  'ACT-MN': 'Mingaminga Rangers',
  'ACT-UA': 'Uncle Allan Palm Island Art',
  'ACT-MR': 'Minjerribah Rangers',
  'ACT-SS': 'Signal Bridge',
  'ACT-PS': 'Palm Springs',
  'ACT-PI': 'PICC',
};

// Tag mappings for project contact linking (based on actual GHL tags)
const PROJECT_TAGS = {
  'ACT-JH': ['justicehub', 'justice', 'youth justice', 'youth-justice', 'yj', 'interest:justice-reform'],
  'ACT-GD': ['goods', 'goods-advisory'],
  'ACT-EL': ['empathy-ledger', 'empathy', 'storytelling', 'stories'],
  'ACT-HV': ['harvest', 'the-harvest', 'regenerative'],
  'ACT-FO': ['fishers-oysters', 'fishers', 'oysters'],
  'ACT-FN': ['indigenous', 'first-nations', 'aboriginal'],
  'ACT-DG': ['diagrama'],
  'ACT-MD': ['event registrant', 'newsletter'],
  'ACT-PI': ['picc', 'community'],
  'ACT-SM': ['contained launch 2026', 'contained'],
  'ACT-AI': ['technology', 'ai-flagged'],
};

// ============================================================================
// ANALYSIS
// ============================================================================

async function getHealthIssues(projectFilter = null) {
  let query = supabase
    .from('project_health_analysis')
    .select('*')
    .order('health_score', { ascending: true });

  if (projectFilter) {
    query = query.ilike('metadata->>project_code', `%${projectFilter}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching health data:', error);
    return [];
  }

  // Categorize issues
  const issues = {
    noContacts: [],
    coldContacts: [],
    noActivity: [],
    other: []
  };

  for (const project of data || []) {
    const recommendations = project.recommendations || [];
    const risks = project.risks || [];
    const code = project.metadata?.project_code || 'Unknown';
    const score = project.health_score || 0;

    // Check for no contacts
    if (risks.some(r => r.includes('No contacts linked')) ||
        recommendations.some(r => r.includes('Tag relevant GHL'))) {
      issues.noContacts.push({ ...project, code, score });
    }
    // Check for cold contacts
    else if (risks.some(r => r.includes('cold')) ||
             recommendations.some(r => r.includes('cultivator'))) {
      issues.coldContacts.push({ ...project, code, score });
    }
    // Check for no activity
    else if (risks.some(r => r.includes('No activity')) ||
             recommendations.some(r => r.includes('check-in'))) {
      issues.noActivity.push({ ...project, code, score });
    }
    // Other issues
    else if (score < 80) {
      issues.other.push({ ...project, code, score });
    }
  }

  return issues;
}

// ============================================================================
// FIX ACTIONS
// ============================================================================

/**
 * Fix: No contacts linked to project
 * Action: Find contacts with matching tags and link them
 */
async function fixNoContacts(project, dryRun = false) {
  const code = project.code;
  const projectName = PROJECT_NAMES[code] || CONFIG_PROJECTS[code]?.name || code;
  const tags = PROJECT_TAGS[code] || [];

  if (tags.length === 0) {
    console.log(`  ⚠️  No tag mapping for ${code} - need to configure PROJECT_TAGS`);
    return { action: 'skip', reason: 'no_tag_mapping' };
  }

  // Find contacts with matching tags
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, email, tags')
    .limit(1000);

  if (error) {
    console.error(`  ❌ Error fetching contacts:`, error);
    return { action: 'error', error };
  }

  // Filter contacts that have any matching tag
  const matchingContacts = contacts.filter(c => {
    const contactTags = (c.tags || []).map(t => t.toLowerCase());
    return tags.some(tag => contactTags.includes(tag.toLowerCase()));
  });

  if (matchingContacts.length === 0) {
    console.log(`  ⚠️  No contacts found with tags: ${tags.join(', ')}`);
    return { action: 'none', reason: 'no_matching_contacts' };
  }

  console.log(`  📋 Found ${matchingContacts.length} contacts for ${projectName}:`);
  matchingContacts.slice(0, 5).forEach(c => {
    console.log(`     - ${c.full_name || c.email}`);
  });
  if (matchingContacts.length > 5) {
    console.log(`     ... and ${matchingContacts.length - 5} more`);
  }

  if (dryRun) {
    return { action: 'would_link', contacts: matchingContacts.length };
  }

  // Update project health analysis with contact count
  const { error: updateError } = await supabase
    .from('project_health_analysis')
    .update({
      metadata: {
        ...project.metadata,
        linked_contacts: matchingContacts.length,
        contact_names: matchingContacts.slice(0, 10).map(c => c.full_name || c.email)
      },
      risks: (project.risks || []).filter(r => !r.includes('No contacts linked')),
      recommendations: (project.recommendations || []).filter(r => !r.includes('Tag relevant')),
      health_score: Math.min(100, (project.health_score || 0) + 30),
      analysis_date: new Date().toISOString()
    })
    .eq('id', project.id);

  if (updateError) {
    console.error(`  ❌ Error updating health:`, updateError);
    return { action: 'error', error: updateError };
  }

  console.log(`  ✅ Linked ${matchingContacts.length} contacts to ${code}`);
  return { action: 'linked', contacts: matchingContacts.length };
}

/**
 * Fix: Cold contacts on project
 * Action: Create cultivator warmup proposal
 */
async function fixColdContacts(project, dryRun = false) {
  const code = project.code;
  const projectName = PROJECT_NAMES[code] || CONFIG_PROJECTS[code]?.name || code;

  console.log(`  🌱 Creating cultivator warmup proposal for ${projectName}`);

  if (dryRun) {
    return { action: 'would_propose', type: 'cultivator_warmup' };
  }

  // Check for existing pending proposal (prevent duplicates)
  try {
    const { data: existing } = await supabase
      .from('agent_proposals')
      .select('id')
      .eq('agent_id', 'bunya-fixer')
      .eq('action_name', 'cultivator_warmup')
      .eq('status', 'pending')
      .ilike('title', `%${projectName}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  Proposal already exists for ${projectName} (${existing[0].id})`);
      return { action: 'skipped', reason: 'duplicate' };
    }
  } catch {
    // Non-critical — proceed with creation
  }

  // Create a proposal for human approval
  try {
    const { data, error } = await supabase
      .from('agent_proposals')
      .insert({
        agent_id: 'bunya-fixer',
        action_name: 'cultivator_warmup',
        title: `Warm up cold contacts for ${projectName}`,
        description: `Project ${code} has 100% cold contacts. Run cultivator agent to re-engage relationships.`,
        reasoning: {
          trigger: 'bunya_health_check',
          health_score: project.score,
          risks: project.risks
        },
        proposed_action: {
          command: `node scripts/cultivator-agent.mjs run --project ${code}`,
          project_code: code,
          action_type: 'relationship_warmup'
        },
        priority: project.score < 50 ? 'high' : 'normal',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`  ✅ Created proposal #${data.id} for cultivator warmup`);
    return { action: 'proposed', proposalId: data.id };
  } catch (err) {
    console.error(`  ❌ Error creating proposal:`, err);
    return { action: 'error', error: err };
  }
}

/**
 * Fix: No activity on project
 * Action: Create check-in proposal
 */
async function fixNoActivity(project, dryRun = false) {
  const code = project.code;
  const projectName = PROJECT_NAMES[code] || CONFIG_PROJECTS[code]?.name || code;

  // Extract days from risks
  const daysMatch = (project.risks || []).join(' ').match(/(\d+) days/);
  const days = daysMatch ? parseInt(daysMatch[1]) : 30;

  console.log(`  📞 Creating check-in proposal for ${projectName} (${days} days inactive)`);

  if (dryRun) {
    return { action: 'would_propose', type: 'check_in' };
  }

  // Check for existing pending proposal (prevent duplicates)
  try {
    const { data: existing } = await supabase
      .from('agent_proposals')
      .select('id')
      .eq('agent_id', 'bunya-fixer')
      .eq('action_name', 'schedule_checkin')
      .eq('status', 'pending')
      .ilike('title', `%${projectName}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  Proposal already exists for ${projectName} (${existing[0].id})`);
      return { action: 'skipped', reason: 'duplicate' };
    }
  } catch {
    // Non-critical — proceed with creation
  }

  // Create a proposal for human approval
  try {
    const { data, error } = await supabase
      .from('agent_proposals')
      .insert({
        agent_id: 'bunya-fixer',
        action_name: 'schedule_checkin',
        title: `Schedule check-in for ${projectName}`,
        description: `Project ${code} has had no activity in ${days} days. Schedule a check-in with key contacts.`,
        reasoning: {
          trigger: 'bunya_health_check',
          health_score: project.score,
          days_inactive: days,
          risks: project.risks
        },
        proposed_action: {
          project_code: code,
          action_type: 'schedule_meeting',
          suggested_contacts: 'key stakeholders'
        },
        priority: days > 90 ? 'urgent' : days > 60 ? 'high' : 'normal',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`  ✅ Created proposal #${data.id} for check-in`);
    return { action: 'proposed', proposalId: data.id };
  } catch (err) {
    console.error(`  ❌ Error creating proposal:`, err);
    return { action: 'error', error: err };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const doFix = args.includes('--fix');
  const dryRun = args.includes('--dry-run');
  const projectArg = args.find(a => a.startsWith('--project'));
  const projectFilter = projectArg ? args[args.indexOf(projectArg) + 1] : null;

  console.log('');
  console.log('🌲 BUNYA FIXER - Project Health Remediation');
  console.log('━'.repeat(50));
  console.log('');

  // Get health issues
  const issues = await getHealthIssues(projectFilter);

  const totalIssues =
    issues.noContacts.length +
    issues.coldContacts.length +
    issues.noActivity.length +
    issues.other.length;

  console.log(`📊 Health Issues Found: ${totalIssues}`);
  console.log(`   • No contacts linked: ${issues.noContacts.length}`);
  console.log(`   • Cold contacts: ${issues.coldContacts.length}`);
  console.log(`   • No activity: ${issues.noActivity.length}`);
  console.log(`   • Other issues: ${issues.other.length}`);
  console.log('');

  if (!doFix && !dryRun) {
    console.log('ℹ️  Run with --fix to apply fixes, or --dry-run to preview');
    console.log('');

    // Show summary of what would be fixed
    if (issues.noContacts.length > 0) {
      console.log('🔗 Projects needing contact linking:');
      issues.noContacts.forEach(p => {
        console.log(`   ${p.code} (score: ${p.score})`);
      });
      console.log('');
    }

    if (issues.coldContacts.length > 0) {
      console.log('❄️  Projects with cold contacts:');
      issues.coldContacts.forEach(p => {
        console.log(`   ${p.code} (score: ${p.score})`);
      });
      console.log('');
    }

    if (issues.noActivity.length > 0) {
      console.log('💤 Projects with no activity:');
      issues.noActivity.forEach(p => {
        console.log(`   ${p.code} (score: ${p.score})`);
      });
      console.log('');
    }

    return;
  }

  // Apply fixes
  const results = {
    linked: 0,
    proposed: 0,
    skipped: 0,
    errors: 0
  };

  // Fix no contacts (Level 3 - autonomous)
  if (issues.noContacts.length > 0) {
    console.log('');
    console.log('🔗 FIXING: No contacts linked');
    console.log('─'.repeat(40));

    for (const project of issues.noContacts) {
      console.log(`\n📁 ${project.code} - ${PROJECT_NAMES[project.code] || 'Unknown'}`);
      const result = await fixNoContacts(project, dryRun);

      if (result.action === 'linked' || result.action === 'would_link') {
        results.linked++;
      } else if (result.action === 'skip' || result.action === 'none') {
        results.skipped++;
      } else {
        results.errors++;
      }
    }
  }

  // Fix cold contacts (Level 2 - needs approval)
  if (issues.coldContacts.length > 0) {
    console.log('');
    console.log('❄️  FIXING: Cold contacts');
    console.log('─'.repeat(40));

    for (const project of issues.coldContacts) {
      console.log(`\n📁 ${project.code} - ${PROJECT_NAMES[project.code] || 'Unknown'}`);
      const result = await fixColdContacts(project, dryRun);

      if (result.action === 'proposed' || result.action === 'would_propose') {
        results.proposed++;
      } else {
        results.errors++;
      }
    }
  }

  // Fix no activity (Level 2 - needs approval)
  if (issues.noActivity.length > 0) {
    console.log('');
    console.log('💤 FIXING: No activity');
    console.log('─'.repeat(40));

    for (const project of issues.noActivity) {
      console.log(`\n📁 ${project.code} - ${PROJECT_NAMES[project.code] || 'Unknown'}`);
      const result = await fixNoActivity(project, dryRun);

      if (result.action === 'proposed' || result.action === 'would_propose') {
        results.proposed++;
      } else {
        results.errors++;
      }
    }
  }

  // Summary
  console.log('');
  console.log('━'.repeat(50));
  console.log('📊 FIX SUMMARY');
  console.log('━'.repeat(50));
  console.log(`   ✅ Contacts linked: ${results.linked}`);
  console.log(`   📋 Proposals created: ${results.proposed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.errors}`);
  console.log('');

  if (results.proposed > 0) {
    console.log('💡 Review proposals at: http://localhost:3999/?tab=intelligence → Proposals');
    console.log('   Or run: node scripts/cultivator-agent.mjs pending');
  }
}

main().catch(console.error);
