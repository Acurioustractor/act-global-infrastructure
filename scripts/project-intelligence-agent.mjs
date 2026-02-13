#!/usr/bin/env node
/**
 * Project Intelligence Agent
 *
 * Analyzes a project or project cluster and proposes actionable next steps.
 * Uses the agentic workflow for proposal/approval.
 *
 * Usage:
 *   node scripts/project-intelligence-agent.mjs analyze ACT-PI
 *   node scripts/project-intelligence-agent.mjs analyze palm-island   # cluster name
 *   node scripts/project-intelligence-agent.mjs pending               # show pending proposals
 *   node scripts/project-intelligence-agent.mjs approve <id>          # approve and execute
 *
 * What it does:
 *   1. Gathers all context (projects, contacts, communications, voice notes)
 *   2. Identifies gaps (missing contacts, stale relationships, no recent activity)
 *   3. Proposes specific actions (outreach, tag fixes, meeting scheduling)
 *   4. Queues for human approval
 */

import { createClient } from '@supabase/supabase-js';
import { AgenticWorkflow, listPendingProposals, approveProposal } from './lib/agentic-workflow.mjs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const AGENT_ID = 'project-intelligence';

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = await loadProjectsConfig();
} catch (e) {
  console.warn('Could not load project codes');
}

// Project clusters - related projects grouped together
const PROJECT_CLUSTERS = {
  'palm-island': {
    name: 'Palm Island Projects',
    description: 'All Palm Island Community Company related work',
    projects: ['ACT-PI', 'ACT-PS', 'ACT-SS', 'ACT-UA'],
    keywords: ['palm', 'picc', 'uncle allan', 'storm stories', 'photo studio', 'on country', 'elders'],
    email_domains: ['picc.com.au'],  // Find contacts by email domain
    cultural_protocols: true
  },
  'justice': {
    name: 'Justice Projects',
    description: 'Youth justice reform initiatives',
    projects: ['ACT-JH', 'ACT-DG', 'ACT-MN', 'ACT-FN', 'ACT-DD', 'ACT-BM', 'ACT-YC', 'ACT-MM'],
    keywords: ['justice', 'youth', 'bimberi', 'diagrama']
  },
  'indigenous': {
    name: 'Indigenous Projects',
    description: 'First Nations focused initiatives',
    projects: ['ACT-PI', 'ACT-MR', 'ACT-UA', 'ACT-AI', 'ACT-WJ', 'ACT-TW', 'ACT-DH', 'ACT-MN', 'ACT-FN'],
    cultural_protocols: true
  },
  'storytelling': {
    name: 'Storytelling Projects',
    description: 'Story collection and amplification',
    projects: ['ACT-EL', 'ACT-QF', 'ACT-CF', 'ACT-GP', 'ACT-MY'],
    keywords: ['story', 'empathy', 'confessional', 'gold phone']
  }
};

// ============================================================================
// CONTEXT GATHERING
// ============================================================================

/**
 * Get all context for a project or cluster
 */
async function gatherProjectContext(projectCodeOrCluster) {
  const context = {
    projects: [],
    contacts: [],
    communications: [],
    voiceNotes: [],
    gaps: [],
    recommendations: []
  };

  // Determine if it's a cluster or single project
  let projectCodes = [];
  let cluster = null;

  if (PROJECT_CLUSTERS[projectCodeOrCluster.toLowerCase()]) {
    cluster = PROJECT_CLUSTERS[projectCodeOrCluster.toLowerCase()];
    projectCodes = cluster.projects;
    context.cluster = cluster;
  } else if (PROJECT_CODES.projects[projectCodeOrCluster.toUpperCase()]) {
    projectCodes = [projectCodeOrCluster.toUpperCase()];
  } else {
    // Try to find by name
    const match = Object.entries(PROJECT_CODES.projects).find(([k, v]) =>
      v.name.toLowerCase().includes(projectCodeOrCluster.toLowerCase())
    );
    if (match) {
      projectCodes = [match[0]];
    }
  }

  if (projectCodes.length === 0) {
    throw new Error(`Unknown project or cluster: ${projectCodeOrCluster}`);
  }

  // Gather project details
  for (const code of projectCodes) {
    const project = PROJECT_CODES.projects[code];
    if (project) {
      context.projects.push({
        code,
        ...project
      });
    }
  }

  // Gather all related GHL tags
  const allTags = context.projects.flatMap(p => p.ghl_tags || []);
  const allKeywords = cluster?.keywords || [];

  // Get contacts by tags
  if (supabase && allTags.length > 0) {
    for (const tag of allTags) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
        .contains('tags', [tag])
        .limit(100);

      if (contacts) {
        for (const c of contacts) {
          if (!context.contacts.find(x => x.ghl_id === c.ghl_id)) {
            context.contacts.push(c);
          }
        }
      }
    }

    // Also search by keywords in name/company
    for (const kw of allKeywords) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
        .or(`full_name.ilike.%${kw}%,company_name.ilike.%${kw}%`)
        .limit(50);

      if (contacts) {
        for (const c of contacts) {
          if (!context.contacts.find(x => x.ghl_id === c.ghl_id)) {
            context.contacts.push(c);
          }
        }
      }
    }

    // Search by email domain (e.g., @picc.com.au)
    const emailDomains = cluster?.email_domains || [];
    for (const domain of emailDomains) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, phone, tags, company_name, last_contact_date')
        .ilike('email', `%@${domain}`)
        .limit(50);

      if (contacts) {
        for (const c of contacts) {
          if (!context.contacts.find(x => x.ghl_id === c.ghl_id)) {
            c._found_by = `email domain @${domain}`;
            context.contacts.push(c);
          }
        }
      }
    }

    // Get communications for these contacts
    const contactIds = context.contacts.map(c => c.ghl_id);
    if (contactIds.length > 0) {
      const { data: comms } = await supabase
        .from('communications_history')
        .select('*')
        .in('ghl_contact_id', contactIds)
        .order('occurred_at', { ascending: false })
        .limit(50);

      context.communications = comms || [];
    }

    // Get voice notes mentioning project keywords
    const searchTerms = [...allKeywords, ...context.projects.map(p => p.name)];
    for (const term of searchTerms.slice(0, 5)) {
      const { data: notes } = await supabase
        .from('voice_notes')
        .select('id, summary, recorded_at, action_items, project_context')
        .ilike('transcript', `%${term}%`)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (notes) {
        for (const n of notes) {
          if (!context.voiceNotes.find(x => x.id === n.id)) {
            context.voiceNotes.push(n);
          }
        }
      }
    }
  }

  return context;
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

/**
 * Analyze context and identify gaps
 */
function analyzeGaps(context) {
  const gaps = [];
  const now = new Date();

  // Check each project
  for (const project of context.projects) {
    const projectContacts = context.contacts.filter(c =>
      c.tags?.some(t => project.ghl_tags?.includes(t))
    );

    // Gap: No contacts
    if (projectContacts.length === 0) {
      gaps.push({
        type: 'no_contacts',
        severity: 'high',
        project: project.code,
        message: `${project.name} has no tagged contacts`,
        recommendation: `Add team members and stakeholders for ${project.name} to GHL with tag "${project.ghl_tags?.[0]}"`
      });
    }

    // Gap: Contacts without email/phone
    const contactsNoInfo = projectContacts.filter(c => !c.email && !c.phone);
    if (contactsNoInfo.length > 0) {
      gaps.push({
        type: 'incomplete_contacts',
        severity: 'medium',
        project: project.code,
        message: `${contactsNoInfo.length} contacts missing email/phone`,
        contacts: contactsNoInfo.map(c => c.full_name),
        recommendation: `Update contact info for: ${contactsNoInfo.map(c => c.full_name).join(', ')}`
      });
    }

    // Gap: Stale relationships (no contact in 30+ days)
    const staleContacts = projectContacts.filter(c => {
      if (!c.last_contact_date) return true;
      const days = (now - new Date(c.last_contact_date)) / (1000 * 60 * 60 * 24);
      return days > 30;
    });
    if (staleContacts.length > 0 && projectContacts.length > 0) {
      gaps.push({
        type: 'stale_relationships',
        severity: 'medium',
        project: project.code,
        message: `${staleContacts.length}/${projectContacts.length} contacts haven't been contacted in 30+ days`,
        contacts: staleContacts.map(c => c.full_name),
        recommendation: `Schedule check-ins with: ${staleContacts.slice(0, 3).map(c => c.full_name).join(', ')}`
      });
    }

    // Gap: No recent voice notes
    const projectVoiceNotes = context.voiceNotes.filter(v =>
      v.project_context?.includes(project.code) ||
      v.summary?.toLowerCase().includes(project.name.toLowerCase())
    );
    if (projectVoiceNotes.length === 0 && projectContacts.length > 0) {
      gaps.push({
        type: 'no_recent_notes',
        severity: 'low',
        project: project.code,
        message: `No voice notes mentioning ${project.name}`,
        recommendation: `Record thoughts about ${project.name} progress and next steps`
      });
    }

    // Gap: Contacts incorrectly tagged
    const contactsNeedTagUpdate = context.contacts.filter(c =>
      !c.tags?.some(t => project.ghl_tags?.includes(t)) &&
      (c.full_name?.toLowerCase().includes(project.name.toLowerCase().split(' ')[0]) ||
       c.company_name?.toLowerCase().includes(project.name.toLowerCase().split(' ')[0]))
    );
    if (contactsNeedTagUpdate.length > 0) {
      gaps.push({
        type: 'missing_tags',
        severity: 'medium',
        project: project.code,
        message: `${contactsNeedTagUpdate.length} contacts may need "${project.ghl_tags?.[0]}" tag`,
        contacts: contactsNeedTagUpdate.map(c => c.full_name),
        recommendation: `Review and tag: ${contactsNeedTagUpdate.map(c => c.full_name).join(', ')}`
      });
    }
  }

  // Cultural protocols check
  if (context.cluster?.cultural_protocols || context.projects.some(p => p.cultural_protocols)) {
    gaps.push({
      type: 'cultural_reminder',
      severity: 'info',
      message: 'This project requires cultural protocols',
      recommendation: 'Ensure all communications follow appropriate cultural protocols for First Nations engagement'
    });
  }

  return gaps;
}

// ============================================================================
// ACTION PROPOSALS
// ============================================================================

/**
 * Generate action proposals based on gaps
 */
async function generateProposals(context, gaps) {
  const workflow = new AgenticWorkflow(AGENT_ID, { verbose: true });
  const proposals = [];

  for (const gap of gaps) {
    if (gap.severity === 'info') continue; // Skip info-only gaps

    let actionType, actionPayload, title, priority;

    // Use 'create_task' as the base action type - it's registered in the system
    // The payload contains the specific task details
    switch (gap.type) {
      case 'no_contacts':
        actionType = 'create_task';
        title = `Add contacts for ${gap.project}`;
        priority = 'high';
        actionPayload = {
          task_type: 'add_contacts',
          title: `Add team contacts for ${gap.project}`,
          description: gap.recommendation,
          project: gap.project
        };
        break;

      case 'incomplete_contacts':
        actionType = 'create_task';
        title = `Complete contact info for ${gap.project}`;
        priority = 'normal';
        actionPayload = {
          task_type: 'update_contacts',
          contacts: gap.contacts,
          project: gap.project,
          missing: 'email and phone'
        };
        break;

      case 'stale_relationships':
        actionType = 'schedule_followup';  // Use registered action
        title = `Re-engage ${gap.project} contacts`;
        priority = 'high';
        actionPayload = {
          task_type: 'outreach',
          contacts: gap.contacts?.slice(0, 3),
          project: gap.project,
          reason: 'stale_relationship'
        };
        break;

      case 'missing_tags':
        actionType = 'update_contact';  // Use registered action
        title = `Update tags for ${gap.project} contacts`;
        priority = 'normal';
        actionPayload = {
          task_type: 'fix_tags',
          contacts: gap.contacts,
          tag_to_add: PROJECT_CODES.projects[gap.project]?.ghl_tags?.[0],
          project: gap.project
        };
        break;

      default:
        continue;
    }

    // Create proposal using the agentic workflow
    try {
      const proposal = await workflow.propose({
        action: actionType || 'create_task',  // Must use 'action' not 'action_name'
        title,
        params: actionPayload,  // Must use 'params' not 'proposed_action'
        reasoning: {
          gap_type: gap.type,
          severity: gap.severity,
          details: gap.message,
          recommendation: gap.recommendation
        },
        priority: priority || 'normal'
      });
      proposals.push(proposal);
      console.log(`  ✓ Created proposal: ${title}`);
    } catch (e) {
      console.log(`  ⚠️ Could not create proposal for ${gap.type}: ${e.message}`);
    }
  }

  return proposals;
}

// ============================================================================
// REPORTING
// ============================================================================

function printAnalysis(context, gaps) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🔍 Project Intelligence Analysis');
  if (context.cluster) {
    console.log(`  Cluster: ${context.cluster.name}`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Projects
  console.log('📁 PROJECTS');
  console.log('─'.repeat(60));
  for (const p of context.projects) {
    console.log(`  ${p.code}: ${p.name}`);
    console.log(`    Description: ${p.description || 'N/A'}`);
    console.log(`    Notion: ${p.notion_pages?.join(', ') || 'None'}`);
    console.log(`    Tags: ${p.ghl_tags?.join(', ') || 'None'}`);
    if (p.cultural_protocols) console.log(`    ⚠️  Requires cultural protocols`);
    console.log('');
  }

  // Contacts
  console.log('\n👥 CONTACTS');
  console.log('─'.repeat(60));
  if (context.contacts.length === 0) {
    console.log('  No contacts found for these projects');
  } else {
    for (const c of context.contacts) {
      const hasInfo = c.email || c.phone ? '✓' : '✗';
      const lastContact = c.last_contact_date
        ? new Date(c.last_contact_date).toLocaleDateString()
        : 'Never';
      console.log(`  ${hasInfo} ${c.full_name || '(unnamed)'}`);
      console.log(`      Email: ${c.email || 'N/A'} | Phone: ${c.phone || 'N/A'}`);
      console.log(`      Tags: ${(c.tags || []).join(', ') || 'none'}`);
      console.log(`      Last contact: ${lastContact}`);
    }
  }

  // Recent Activity
  console.log('\n📬 RECENT ACTIVITY');
  console.log('─'.repeat(60));
  if (context.communications.length === 0) {
    console.log('  No recent communications');
  } else {
    for (const c of context.communications.slice(0, 5)) {
      const date = new Date(c.occurred_at).toLocaleDateString();
      console.log(`  ${date} | ${c.channel} | ${c.direction} | ${c.content_preview?.slice(0, 50)}...`);
    }
  }

  // Voice Notes
  if (context.voiceNotes.length > 0) {
    console.log('\n🎤 VOICE NOTES');
    console.log('─'.repeat(60));
    for (const v of context.voiceNotes.slice(0, 3)) {
      const date = new Date(v.recorded_at).toLocaleDateString();
      console.log(`  ${date}: ${v.summary?.slice(0, 80)}...`);
    }
  }

  // Gaps
  console.log('\n⚠️  GAPS IDENTIFIED');
  console.log('─'.repeat(60));
  if (gaps.length === 0) {
    console.log('  No significant gaps found');
  } else {
    const severityIcon = { high: '🔴', medium: '🟡', low: '🟢', info: 'ℹ️' };
    for (const g of gaps) {
      console.log(`  ${severityIcon[g.severity]} [${g.type}] ${g.message}`);
      console.log(`     → ${g.recommendation}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🔍 Project Intelligence Agent\n');

  switch (command) {
    case 'analyze': {
      const target = args[1];
      if (!target) {
        console.log('Usage: node project-intelligence-agent.mjs analyze <project-code|cluster>');
        console.log('\nAvailable clusters:');
        Object.entries(PROJECT_CLUSTERS).forEach(([k, v]) => {
          console.log(`  ${k.padEnd(15)} - ${v.name} (${v.projects.length} projects)`);
        });
        console.log('\nOr use a project code like: ACT-PI, ACT-JH, etc.');
        process.exit(1);
      }

      console.log(`Analyzing: ${target}\n`);

      const context = await gatherProjectContext(target);
      const gaps = analyzeGaps(context);

      printAnalysis(context, gaps);

      // Generate proposals for gaps
      if (gaps.filter(g => g.severity !== 'info').length > 0) {
        console.log('📝 GENERATING ACTION PROPOSALS...\n');
        const proposals = await generateProposals(context, gaps);
        console.log(`Created ${proposals.length} proposals.\n`);
        console.log('To review: node scripts/project-intelligence-agent.mjs pending');
        console.log('To approve: node scripts/project-intelligence-agent.mjs approve <id>');
      }
      break;
    }

    case 'pending': {
      const proposals = await listPendingProposals(AGENT_ID);
      if (proposals.length === 0) {
        console.log('No pending proposals from project-intelligence agent.');
        return;
      }

      console.log(`📋 Pending Proposals (${proposals.length})\n`);
      for (const p of proposals) {
        const payload = p.action_payload || p.proposed_action || {};
        console.log(`${p.priority === 'high' ? '🔴' : '🟡'} ${p.title}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Action: ${p.action_name}`);
        console.log(`   Reason: ${p.reasoning?.details || 'N/A'}`);
        console.log(`   Recommendation: ${p.reasoning?.recommendation || 'N/A'}`);
        console.log('');
      }

      console.log('\nTo approve: node scripts/project-intelligence-agent.mjs approve <id>');
      break;
    }

    case 'approve': {
      const proposalId = args[1];
      if (!proposalId) {
        console.log('Usage: node project-intelligence-agent.mjs approve <proposal-id>');
        process.exit(1);
      }

      console.log(`Approving proposal: ${proposalId}`);
      const result = await approveProposal(proposalId, 'ben');
      console.log('Result:', result);
      break;
    }

    case 'clusters': {
      console.log('Available project clusters:\n');
      Object.entries(PROJECT_CLUSTERS).forEach(([k, v]) => {
        console.log(`  ${k}`);
        console.log(`    Name: ${v.name}`);
        console.log(`    Projects: ${v.projects.join(', ')}`);
        console.log(`    Keywords: ${v.keywords?.join(', ') || 'none'}`);
        if (v.cultural_protocols) console.log(`    ⚠️  Cultural protocols required`);
        console.log('');
      });
      break;
    }

    default:
      console.log('Usage:');
      console.log('  node project-intelligence-agent.mjs analyze <project|cluster>  - Analyze and propose actions');
      console.log('  node project-intelligence-agent.mjs pending                    - Show pending proposals');
      console.log('  node project-intelligence-agent.mjs approve <id>               - Approve a proposal');
      console.log('  node project-intelligence-agent.mjs clusters                   - List project clusters');
      console.log('\nExamples:');
      console.log('  node project-intelligence-agent.mjs analyze palm-island');
      console.log('  node project-intelligence-agent.mjs analyze ACT-PI');
      console.log('  node project-intelligence-agent.mjs analyze justice');
  }
}

main().catch(console.error);
