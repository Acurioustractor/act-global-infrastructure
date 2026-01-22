#!/usr/bin/env node
/**
 * ACT Project Setup Wizard
 *
 * Interactive wizard to create new projects with proper structure
 * across all ACT systems (Notion, Supabase, GHL, Xero, Dext).
 *
 * Implements the "When to Spin Up a New Project" criteria:
 * - Repeat mentions (3+ voice notes about same topic)
 * - Multiple contacts (5+ contacts with same interest)
 * - Funding attached
 * - Partner request
 * - Strategic alignment
 *
 * Usage:
 *   node scripts/project-setup.mjs              # Start interactive wizard
 *   node scripts/project-setup.mjs suggest      # Suggest new projects from patterns
 *   node scripts/project-setup.mjs create <name> # Quick create with prompts
 *   node scripts/project-setup.mjs checklist    # Show setup checklist
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 *   NOTION_TOKEN              - Notion access
 *   GHL_API_KEY               - GoHighLevel access
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
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

// ============================================================================
// READLINE HELPERS
// ============================================================================

function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function ask(rl, question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function askChoice(rl, question, options) {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });
  const answer = await ask(rl, 'Choose (number)');
  const idx = parseInt(answer) - 1;
  return options[idx] || options[0];
}

async function askMultiple(rl, question, options) {
  console.log(`\n${question} (comma-separated numbers)`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });
  const answer = await ask(rl, 'Choose');
  const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
  return indices.filter(i => i >= 0 && i < options.length).map(i => options[i]);
}

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateProjectCode(name, category) {
  // Extract initials from name
  const words = name.split(/\s+/).filter(w => w.length > 0);
  let code;

  if (words.length >= 2) {
    // Use first letter of first two significant words
    code = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  } else {
    // Use first two letters of single word
    code = name.slice(0, 2).toUpperCase();
  }

  // Check if code already exists
  let suffix = '';
  let counter = 1;
  while (PROJECT_CODES.projects?.[`ACT-${code}${suffix}`]) {
    suffix = counter.toString();
    counter++;
  }

  return `ACT-${code}${suffix}`;
}

function generateGHLTag(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
}

// ============================================================================
// SUGGEST NEW PROJECTS
// ============================================================================

async function suggestNewProjects() {
  console.log('\n=========================================');
  console.log('  Suggest New Projects');
  console.log('  Based on voice notes, contacts, and activity patterns');
  console.log('=========================================\n');

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  const suggestions = [];

  // 1. Check voice notes for repeated topics (Three Voice Note Rule)
  console.log('Checking voice notes for repeated topics...');
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('topics, transcript, project_context, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(100);

  // Count topic mentions
  const topicCounts = {};
  (voiceNotes || []).forEach(vn => {
    if (!vn.project_context) {
      // Only count unlinked notes
      (vn.topics || []).forEach(topic => {
        const t = topic.toLowerCase();
        if (!topicCounts[t]) topicCounts[t] = { count: 0, notes: [] };
        topicCounts[t].count++;
        topicCounts[t].notes.push(vn.transcript?.slice(0, 100));
      });
    }
  });

  // Find topics with 3+ mentions
  Object.entries(topicCounts)
    .filter(([_, data]) => data.count >= 3)
    .forEach(([topic, data]) => {
      suggestions.push({
        reason: 'three_voice_notes',
        name: topic,
        evidence: `Mentioned in ${data.count} voice notes`,
        samples: data.notes.slice(0, 3),
        confidence: data.count >= 5 ? 'high' : 'medium'
      });
    });

  // 2. Check for untagged contact clusters
  console.log('Checking for contact clusters...');
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('tags, full_name')
    .limit(500);

  // Find tags that aren't project tags
  const existingProjectTags = new Set(
    Object.values(PROJECT_CODES.projects || {})
      .flatMap(p => p.ghl_tags || [])
      .map(t => t.toLowerCase())
  );

  const orphanTagCounts = {};
  (contacts || []).forEach(c => {
    (c.tags || []).forEach(tag => {
      const t = tag.toLowerCase();
      if (!existingProjectTags.has(t) && t.length > 2) {
        if (!orphanTagCounts[t]) orphanTagCounts[t] = 0;
        orphanTagCounts[t]++;
      }
    });
  });

  // Find tags with 5+ contacts
  Object.entries(orphanTagCounts)
    .filter(([_, count]) => count >= 5)
    .forEach(([tag, count]) => {
      suggestions.push({
        reason: 'contact_cluster',
        name: tag,
        evidence: `${count} contacts with this tag`,
        confidence: count >= 10 ? 'high' : 'medium'
      });
    });

  // 3. Display suggestions
  if (suggestions.length === 0) {
    console.log('\nNo strong signals for new projects detected.');
    console.log('All topics are either linked to projects or haven\'t reached threshold.\n');
    return [];
  }

  console.log(`\nFound ${suggestions.length} potential projects:\n`);
  console.log('-'.repeat(70));

  suggestions.forEach((s, i) => {
    const emoji = s.reason === 'three_voice_notes' ? '🎙️' :
                  s.reason === 'contact_cluster' ? '👥' : '📋';
    const confidenceEmoji = s.confidence === 'high' ? '🔥' : '🌱';

    console.log(`${i + 1}. ${emoji} ${s.name} ${confidenceEmoji}`);
    console.log(`   Reason: ${s.evidence}`);
    if (s.samples) {
      console.log(`   Samples: "${s.samples[0]?.slice(0, 50)}..."`);
    }
    console.log('');
  });

  return suggestions;
}

// ============================================================================
// INTERACTIVE WIZARD
// ============================================================================

async function runWizard(initialName = null) {
  console.log('\n=========================================');
  console.log('  ACT Project Setup Wizard');
  console.log('  Create a new project with proper structure');
  console.log('=========================================\n');

  const rl = createPrompt();

  try {
    // Step 1: Basic info
    console.log('STEP 1: Basic Information\n');

    const name = initialName || await ask(rl, 'Project name');
    if (!name) {
      console.log('Project name is required.');
      return;
    }

    const description = await ask(rl, 'Brief description');

    // Step 2: Category
    console.log('\nSTEP 2: Categorization\n');

    const categories = Object.keys(PROJECT_CODES.categories || {});
    const category = await askChoice(rl, 'Category:', categories);

    const priority = await askChoice(rl, 'Priority:', ['high', 'medium', 'low']);

    // Step 3: Generate code
    const suggestedCode = generateProjectCode(name, category);
    const code = await ask(rl, `Project code`, suggestedCode);

    // Check if code exists
    if (PROJECT_CODES.projects?.[code]) {
      console.log(`\nWarning: Code ${code} already exists for "${PROJECT_CODES.projects[code].name}"`);
      const proceed = await ask(rl, 'Enter different code or press Enter to cancel');
      if (!proceed) {
        rl.close();
        return;
      }
    }

    // Step 4: LCAA themes
    console.log('\nSTEP 3: LCAA Framework\n');
    console.log('Which LCAA phases does this project focus on?');

    const lcaaThemes = await askMultiple(rl, 'LCAA Themes:', ['Listen', 'Connect', 'Act', 'Amplify']);

    // Step 5: Tags
    console.log('\nSTEP 4: System Integration\n');

    const suggestedTag = generateGHLTag(name);
    const ghlTag = await ask(rl, 'GHL tag', suggestedTag);

    const xeroTracking = await ask(rl, 'Xero tracking name (leave blank if none)', name);

    // Step 6: People
    console.log('\nSTEP 5: People\n');

    const leadsInput = await ask(rl, 'Project leads (comma-separated names)', 'Ben Knight');
    const leads = leadsInput.split(',').map(l => l.trim()).filter(l => l);

    // Step 7: Cultural protocols
    const hasCulturalProtocols = category === 'indigenous' ||
      await ask(rl, 'Requires cultural protocols? (y/n)', 'n') === 'y';

    // Step 8: ALMA program
    const almaPrograms = PROJECT_CODES.alma_programs || [];
    console.log('\nALMA Programs (optional):');
    almaPrograms.slice(0, 10).forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    const almaChoice = await ask(rl, 'Enter number or custom program name', '');
    const almaProgram = almaChoice
      ? (parseInt(almaChoice) ? almaPrograms[parseInt(almaChoice) - 1] : almaChoice)
      : null;

    rl.close();

    // Step 9: Build project object
    const project = {
      name,
      code,
      category,
      priority,
      status: 'active',
      description,
      leads,
      notion_pages: [name],
      ghl_tags: [ghlTag],
      xero_tracking: xeroTracking || null,
      dext_category: PROJECT_CODES.categories?.[category]?.dext,
      alma_program: almaProgram,
      cultural_protocols: hasCulturalProtocols,
      lcaa_themes: lcaaThemes.length > 0 ? lcaaThemes : ['Listen']
    };

    // Step 10: Preview and confirm
    console.log('\n=========================================');
    console.log('  Review New Project');
    console.log('=========================================\n');

    console.log(`Code:        ${code}`);
    console.log(`Name:        ${name}`);
    console.log(`Category:    ${PROJECT_CODES.categories?.[category]?.icon || ''} ${category}`);
    console.log(`Priority:    ${priority}`);
    console.log(`Description: ${description || '(none)'}`);
    console.log(`Leads:       ${leads.join(', ')}`);
    console.log(`LCAA:        ${lcaaThemes.join(' → ')}`);
    console.log(`GHL Tag:     ${ghlTag}`);
    console.log(`Xero:        ${xeroTracking || '(none)'}`);
    console.log(`ALMA:        ${almaProgram || '(none)'}`);
    console.log(`Cultural:    ${hasCulturalProtocols ? 'Yes' : 'No'}`);

    const rl2 = createPrompt();
    const confirm = await ask(rl2, '\nCreate project? (y/n)', 'y');
    rl2.close();

    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      return;
    }

    // Step 11: Save to project-codes.json
    PROJECT_CODES.projects = PROJECT_CODES.projects || {};
    PROJECT_CODES.projects[code] = project;

    writeFileSync('config/project-codes.json', JSON.stringify(PROJECT_CODES, null, 2));
    console.log('\n✓ Saved to config/project-codes.json');

    // Step 12: Sync to Supabase
    if (supabase) {
      const { error } = await supabase.from('project_codes').upsert({
        code,
        name: project.name,
        category: project.category,
        priority: project.priority,
        status: project.status,
        description: project.description,
        ghl_tags: project.ghl_tags,
        xero_tracking: project.xero_tracking,
        dext_category: project.dext_category,
        alma_program: project.alma_program,
        cultural_protocols: project.cultural_protocols,
        lcaa_themes: project.lcaa_themes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });

      if (error && error.code !== '42P01') {
        console.error('Warning: Could not sync to Supabase:', error.message);
      } else if (!error) {
        console.log('✓ Synced to Supabase project_codes');
      }
    }

    // Step 13: Show next steps
    console.log('\n=========================================');
    console.log('  Next Steps');
    console.log('=========================================\n');
    console.log('1. Create Notion page using the project template');
    console.log(`   - Title: "${name}"`);
    console.log(`   - Add THE WHY section (human-written)`);
    console.log('');
    console.log('2. Tag contacts in GHL');
    console.log(`   - Use tag: "${ghlTag}"`);
    console.log('');
    console.log('3. Create Xero tracking category (if billing)');
    console.log(`   - Name: "${xeroTracking}"`);
    console.log('');
    console.log('4. Sync codes to all systems:');
    console.log('   node scripts/act-project-manager.mjs sync');
    console.log('');
    console.log('5. Start linking voice notes with:');
    console.log(`   "Project ${name}" at the start of voice notes`);

    return project;

  } catch (error) {
    rl.close();
    throw error;
  }
}

// ============================================================================
// CHECKLIST
// ============================================================================

function showChecklist() {
  console.log('\n=========================================');
  console.log('  New Project Setup Checklist');
  console.log('=========================================\n');

  console.log('WHEN TO CREATE A NEW PROJECT:');
  console.log('-'.repeat(50));
  console.log('✓ Repeat Mentions:     3+ voice notes about same topic');
  console.log('✓ Multiple Contacts:   5+ contacts with same interest');
  console.log('✓ Funding Attached:    Grant received, invoice sent');
  console.log('✓ Partner Request:     "Can you help us with X?"');
  console.log('✓ Strategic Alignment: Fits LCAA, fits ACT mission');
  console.log('');

  console.log('WHEN TO KEEP FLUID (no project needed):');
  console.log('-'.repeat(50));
  console.log('○ One-off conversation, no follow-up');
  console.log('○ Exploration phase ("just seeing if interested")');
  console.log('○ No clear next step');
  console.log('○ No person attached');
  console.log('');

  console.log('SETUP STEPS:');
  console.log('-'.repeat(50));
  console.log('1. [ ] Add to config/project-codes.json');
  console.log('       - name, code, category, priority');
  console.log('       - ghl_tags, xero_tracking, lcaa_themes');
  console.log('');
  console.log('2. [ ] Create Notion page with template');
  console.log('       - THE WHY (human-written)');
  console.log('       - KEY PEOPLE');
  console.log('       - CURRENT SPRINT');
  console.log('       - RECENT CONTEXT (auto-populated)');
  console.log('       - STORIES & IMPACT');
  console.log('       - PARTNER UPDATES (log)');
  console.log('');
  console.log('3. [ ] Tag contacts in GHL');
  console.log('');
  console.log('4. [ ] Sync: node scripts/act-project-manager.mjs sync');
  console.log('');

  console.log('NOTION PAGE TEMPLATE:');
  console.log('-'.repeat(50));
  console.log(`
  ┌─────────────────────────────────────────┐
  │  [Project Name] - [Code]                │
  │  Status: 🟢 Active | LCAA: Connect      │
  ├─────────────────────────────────────────┤
  │  ## THE WHY                             │
  │  (Human writes this, never auto-gen)    │
  │                                         │
  │  ## KEY PEOPLE                          │
  │  - Lead: [Name]                         │
  │  - Partners: [Tagged contacts]          │
  │                                         │
  │  ## CURRENT SPRINT                      │
  │  - [ ] Active tasks                     │
  │                                         │
  │  ## RECENT CONTEXT (Auto-populated)     │
  │  - Voice notes                          │
  │  - Communications                       │
  │                                         │
  │  ## STORIES & IMPACT                    │
  │  - Empathy Ledger stories linked        │
  │                                         │
  │  ## PARTNER UPDATES (Log)               │
  │  - Date: What we sent                   │
  └─────────────────────────────────────────┘
  `);
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'wizard';
const arg = process.argv.slice(3).join(' ');

switch (command) {
  case 'wizard':
  case 'create':
    runWizard(arg || null)
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'suggest':
    suggestNewProjects()
      .catch(e => { console.error('Error:', e.message); process.exit(1); });
    break;

  case 'checklist':
    showChecklist();
    break;

  default:
    console.log(`
ACT Project Setup Wizard

Commands:
  wizard              Interactive project creation wizard (default)
  create <name>       Quick create with initial name
  suggest             Suggest new projects from patterns
  checklist           Show setup checklist

Examples:
  node scripts/project-setup.mjs
  node scripts/project-setup.mjs create "Community Garden"
  node scripts/project-setup.mjs suggest
`);
}
