#!/usr/bin/env node

/**
 * Interactive Project Selector
 *
 * Terminal UI to review projects and build an active list.
 *
 * Usage:
 *   node scripts/project-selector.mjs
 *   node scripts/project-selector.mjs --source notion    # Only Notion projects
 *   node scripts/project-selector.mjs --source el        # Only EL projects
 *   node scripts/project-selector.mjs --status active    # Filter by status
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';

// Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

// Get secrets from Bitwarden via keychain
// Cache secrets to avoid repeated calls
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

// Initialize Supabase client (use EL-specific secrets)
const SUPABASE_URL = getSecret('EL_SUPABASE_URL') || getSecret('SUPABASE_URL') || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = getSecret('EL_SUPABASE_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Fetch projects from both sources
async function fetchAllProjects() {
  if (!supabase) {
    console.error('Error: Supabase not configured');
    return { el: [], notion: [] };
  }

  // Get EL projects
  const { data: elProjects, error: elError } = await supabase
    .from('act_projects')
    .select('id, title, slug, is_active, themes')
    .order('title');

  if (elError) {
    console.error('Error fetching EL projects:', elError.message);
    return { el: [], notion: [] };
  }

  // Get Notion projects via CLI
  let notionProjects = [];
  try {
    const notionData = execSync('~/bin/act-notion projects 2>/dev/null', { encoding: 'utf8' });
    notionProjects = JSON.parse(notionData);
  } catch (e) {
    console.error('Error fetching Notion projects:', e.message);
  }

  return {
    el: elProjects || [],
    notion: notionProjects || []
  };
}

// Create merged project list
function mergeProjects(el, notion) {
  const merged = new Map();

  // Add EL projects
  for (const p of el) {
    const key = p.slug || p.title?.toLowerCase().replace(/\s+/g, '-');
    if (!key) continue;
    merged.set(key, {
      key,
      name: p.title,
      slug: p.slug,
      elId: p.id,
      elStatus: p.is_active ? 'active' : 'inactive',
      themes: p.themes || [],
      notionId: null,
      notionStatus: null,
      source: 'el'
    });
  }

  // Merge/add Notion projects
  for (const p of notion) {
    const key = p.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!key) continue;

    if (merged.has(key)) {
      // Merge with existing
      const existing = merged.get(key);
      existing.notionId = p.id;
      existing.notionStatus = p.status;
      existing.source = 'both';
    } else {
      // Add new
      merged.set(key, {
        key,
        name: p.title,
        slug: null,
        elId: null,
        elStatus: null,
        themes: [],
        notionId: p.id,
        notionStatus: p.status,
        source: 'notion'
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Interactive selector
async function runSelector(projects) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  const approved = [];
  const rejected = [];
  let index = 0;

  console.clear();
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}           ACT PROJECT SELECTOR - Review & Approve${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log();
  console.log(`  ${colors.dim}Total projects to review:${colors.reset} ${colors.bold}${projects.length}${colors.reset}`);
  console.log(`  ${colors.dim}Commands:${colors.reset} ${colors.green}y${colors.reset}=yes ${colors.red}n${colors.reset}=no ${colors.yellow}s${colors.reset}=skip ${colors.blue}q${colors.reset}=quit ${colors.magenta}l${colors.reset}=list approved`);
  console.log();

  while (index < projects.length) {
    const p = projects[index];

    // Source indicator
    let sourceIcon = '';
    if (p.source === 'both') sourceIcon = `${colors.green}[BOTH]${colors.reset}`;
    else if (p.source === 'el') sourceIcon = `${colors.blue}[EL]${colors.reset}`;
    else sourceIcon = `${colors.yellow}[NOTION]${colors.reset}`;

    // Status indicator
    let statusIcon = '';
    if (p.notionStatus?.includes('Active')) statusIcon = `${colors.green}🔥 Active${colors.reset}`;
    else if (p.notionStatus?.includes('Ideation')) statusIcon = `${colors.yellow}🌀 Ideation${colors.reset}`;
    else if (p.notionStatus?.includes('Archived')) statusIcon = `${colors.dim}📦 Archived${colors.reset}`;
    else if (p.elStatus === 'active') statusIcon = `${colors.green}✓ Active (EL)${colors.reset}`;
    else statusIcon = `${colors.dim}Unknown${colors.reset}`;

    console.log(`${colors.dim}───────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`  ${colors.bold}[${index + 1}/${projects.length}]${colors.reset} ${sourceIcon}`);
    console.log();
    console.log(`  ${colors.bold}${colors.cyan}${p.name}${colors.reset}`);
    console.log(`  ${colors.dim}Slug:${colors.reset} ${p.slug || '(none)'}`);
    console.log(`  ${colors.dim}Status:${colors.reset} ${statusIcon}`);
    if (p.themes?.length) {
      console.log(`  ${colors.dim}Themes:${colors.reset} ${p.themes.join(', ')}`);
    }
    console.log();

    const answer = await question(`  ${colors.bold}Include in active list? [y/n/s/q/l]:${colors.reset} `);

    switch (answer.toLowerCase().trim()) {
      case 'y':
      case 'yes':
        approved.push(p);
        console.log(`  ${colors.green}✓ Added to active list${colors.reset}\n`);
        index++;
        break;

      case 'n':
      case 'no':
        rejected.push(p);
        console.log(`  ${colors.red}✗ Skipped${colors.reset}\n`);
        index++;
        break;

      case 's':
      case 'skip':
        console.log(`  ${colors.yellow}→ Skipped for later${colors.reset}\n`);
        index++;
        break;

      case 'q':
      case 'quit':
        console.log(`\n${colors.yellow}Quitting early...${colors.reset}`);
        index = projects.length; // Exit loop
        break;

      case 'l':
      case 'list':
        console.log(`\n${colors.green}Approved so far (${approved.length}):${colors.reset}`);
        approved.forEach(a => console.log(`  - ${a.name}`));
        console.log();
        break;

      default:
        console.log(`  ${colors.dim}Unknown command, try again${colors.reset}`);
    }
  }

  rl.close();
  return { approved, rejected };
}

// Save results
async function saveResults(approved) {
  const output = {
    generated: new Date().toISOString(),
    count: approved.length,
    projects: approved.map(p => ({
      name: p.name,
      slug: p.slug || p.key,
      source: p.source,
      notionStatus: p.notionStatus,
      themes: p.themes
    }))
  };

  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.join(process.cwd(), 'config', 'active-projects.json');

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n${colors.green}✓ Saved ${approved.length} active projects to:${colors.reset}`);
  console.log(`  ${outPath}`);

  // Also output as simple list
  console.log(`\n${colors.cyan}Active Project List:${colors.reset}`);
  approved.forEach(p => console.log(`  • ${p.name}`));
}

// Main
async function main() {
  const args = process.argv.slice(2);

  console.log(`${colors.dim}Loading projects...${colors.reset}`);

  const { el, notion } = await fetchAllProjects();
  let projects = mergeProjects(el, notion);

  // Apply filters
  const sourceFilter = args.find(a => a.startsWith('--source='))?.split('=')[1];
  if (sourceFilter === 'notion') {
    projects = projects.filter(p => p.source === 'notion' || p.source === 'both');
  } else if (sourceFilter === 'el') {
    projects = projects.filter(p => p.source === 'el' || p.source === 'both');
  }

  const statusFilter = args.find(a => a.startsWith('--status='))?.split('=')[1];
  if (statusFilter === 'active') {
    projects = projects.filter(p =>
      p.notionStatus?.includes('Active') || p.elStatus === 'active'
    );
  }

  console.log(`${colors.dim}Found ${projects.length} projects${colors.reset}\n`);

  // Check for non-interactive mode
  if (args.includes('--list')) {
    console.log(JSON.stringify(projects, null, 2));
    return;
  }

  const { approved, rejected } = await runSelector(projects);

  if (approved.length > 0) {
    await saveResults(approved);
  }

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Approved:${colors.reset} ${approved.length}`);
  console.log(`  ${colors.red}Rejected:${colors.reset} ${rejected.length}`);
  console.log(`  ${colors.dim}Skipped:${colors.reset} ${projects.length - approved.length - rejected.length}`);
}

main().catch(console.error);
