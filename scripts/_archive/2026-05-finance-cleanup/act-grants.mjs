#!/usr/bin/env node

/**
 * ACT Grant Research & Pipeline - Scout grants, track deadlines via GHL
 *
 * Commands:
 *   search <query>     - Search for grant opportunities (web search)
 *   upcoming [--days]  - Show grants with upcoming deadlines
 *   list [--stage]     - List all grants in pipeline
 *   add <title>        - Add a grant opportunity to GHL pipeline
 *   move <id> <stage>  - Move grant to different stage
 *   notify             - Send deadline alerts
 *
 * Usage:
 *   act-grants search "Indigenous social enterprise 2026"
 *   act-grants upcoming --days 30
 *   act-grants list --stage "Application Open"
 */

import { execSync } from 'child_process';

// Load secrets from Bitwarden
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

// GHL API Client
const BASE_URL = 'https://services.leadconnectorhq.com';

// Grant pipeline name in GHL
const GRANTS_PIPELINE_NAME = 'Grants Pipeline';

// Lazy load GHL credentials
function getGHLCredentials() {
  const apiKey = getSecret('GHL_API_KEY') || process.env.GHL_API_KEY;
  const locationId = getSecret('GHL_LOCATION_ID') || process.env.GHL_LOCATION_ID;
  return { apiKey, locationId };
}

async function ghlRequest(endpoint, method = 'GET', body = null) {
  const { apiKey } = getGHLCredentials();
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL API error: ${response.status} - ${error}`);
  }
  return response.json();
}

// Get or create grants pipeline
async function getGrantsPipeline() {
  const { locationId } = getGHLCredentials();
  const { pipelines } = await ghlRequest(`/opportunities/pipelines?locationId=${locationId}`);

  let pipeline = pipelines?.find(p => p.name.toLowerCase().includes('grant'));

  if (!pipeline) {
    console.log('\n⚠️  No grants pipeline found in GHL.');
    console.log('Create a pipeline named "Grants Pipeline" with stages like:');
    console.log('  • Research');
    console.log('  • Application Open');
    console.log('  • Application Submitted');
    console.log('  • Under Review');
    console.log('  • Awarded');
    console.log('  • Rejected');
    console.log('  • Closed');
    console.log('');
    return null;
  }

  return pipeline;
}

// List grants (opportunities in grants pipeline)
async function listGrants(stageFilter = null) {
  const pipeline = await getGrantsPipeline();
  if (!pipeline) return [];

  const { locationId } = getGHLCredentials();

  // Build filter for POST search
  const body = { locationId };

  // Get stage ID if filter provided
  if (stageFilter && pipeline.stages) {
    const stage = pipeline.stages.find(s =>
      s.name.toLowerCase().includes(stageFilter.toLowerCase())
    );
    if (stage) {
      body.pipelineStageId = stage.id;
    }
  }

  const { opportunities } = await ghlRequest('/opportunities/search', 'POST', body);

  // Filter to only grants pipeline
  return (opportunities || []).filter(opp => opp.pipelineId === pipeline.id);
}

// Get grants with upcoming deadlines
async function getUpcomingGrants(days = 30) {
  const grants = await listGrants();

  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  // Filter by deadline custom field
  return grants.filter(g => {
    // Check for deadline in custom fields or date fields
    const deadline = g.customFields?.deadline || g.customFields?.due_date || g.dateAdded;
    if (!deadline) return false;

    const deadlineDate = new Date(deadline);
    return deadlineDate >= today && deadlineDate <= futureDate;
  }).sort((a, b) => {
    const aDate = new Date(a.customFields?.deadline || a.dateAdded);
    const bDate = new Date(b.customFields?.deadline || b.dateAdded);
    return aDate - bDate;
  });
}

// Add grant to pipeline
async function addGrant(name, options = {}) {
  const pipeline = await getGrantsPipeline();
  if (!pipeline) throw new Error('Grants pipeline not configured in GHL');

  // Find the initial stage (usually "Research" or first stage)
  const initialStage = pipeline.stages?.find(s =>
    s.name.toLowerCase().includes('research') ||
    s.name.toLowerCase().includes('open')
  ) || pipeline.stages?.[0];

  if (!initialStage) {
    throw new Error('No stages configured in grants pipeline');
  }

  // Create opportunity
  const { locationId } = getGHLCredentials();
  const opportunity = {
    name,
    pipelineId: pipeline.id,
    pipelineStageId: initialStage.id,
    locationId: locationId,
    status: 'open',
    monetaryValue: options.amount || 0,
  };

  // Add custom fields if provided
  if (options.deadline || options.funder || options.url) {
    opportunity.customFields = [];
    if (options.deadline) {
      opportunity.customFields.push({ key: 'deadline', value: options.deadline });
    }
    if (options.funder) {
      opportunity.customFields.push({ key: 'funder', value: options.funder });
    }
    if (options.url) {
      opportunity.customFields.push({ key: 'application_url', value: options.url });
    }
  }

  const result = await ghlRequest('/opportunities/', 'POST', opportunity);
  return result.opportunity || result;
}

// Move grant to different stage
async function moveGrant(grantId, stageName) {
  const pipeline = await getGrantsPipeline();
  if (!pipeline) throw new Error('Grants pipeline not configured');

  const stage = pipeline.stages?.find(s =>
    s.name.toLowerCase().includes(stageName.toLowerCase())
  );

  if (!stage) {
    console.log('Available stages:');
    pipeline.stages?.forEach(s => console.log(`  • ${s.name}`));
    throw new Error(`Stage "${stageName}" not found`);
  }

  const result = await ghlRequest(`/opportunities/${grantId}`, 'PUT', {
    pipelineStageId: stage.id,
  });

  return result;
}

// Search for grants (web search)
async function searchGrants(query) {
  console.log(`\n🔍 Searching for grants: "${query}"\n`);

  // Try Perplexity search if available
  try {
    const searchQuery = `Australian grants funding opportunities ${query} 2026 application deadline eligibility`;
    const result = execSync(
      `cd ~/.claude/skills/perplexity-search && uv run python scripts/perplexity_search.py --research "${searchQuery}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 60000 }
    );
    console.log(result);
    return;
  } catch (e) {
    // Fallback to manual suggestions
  }

  // Suggest manual search sources
  console.log('📋 Suggested grant databases to search:\n');
  console.log('  • GrantConnect (Australian Government)');
  console.log('    https://www.grants.gov.au/\n');
  console.log('  • Community Grants Hub');
  console.log('    https://www.communitygrants.gov.au/\n');
  console.log('  • Philanthropy Australia');
  console.log('    https://www.philanthropy.org.au/\n');
  console.log('  • Indigenous Grants Portal');
  console.log('    https://www.niaa.gov.au/indigenous-affairs/grants-and-funding\n');
  console.log(`Search terms: ${query}`);
}

// Send deadline notification
async function sendNotification() {
  const grants = await getUpcomingGrants(14); // Next 2 weeks

  if (grants.length === 0) {
    console.log('No grants due in next 2 weeks.');
    return '';
  }

  let message = '🎯 GRANT DEADLINE ALERT\n\n';
  const today = new Date();

  for (const grant of grants) {
    const deadline = grant.customFields?.deadline || grant.dateAdded;
    const deadlineDate = new Date(deadline);
    const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 7 ? '🔴' : '🟡';

    message += `${urgency} ${grant.name}\n`;
    message += `   Due: ${deadlineDate.toLocaleDateString('en-AU')} (${daysLeft} days)\n`;
    if (grant.monetaryValue) {
      message += `   Amount: $${grant.monetaryValue.toLocaleString()}\n`;
    }
    message += '\n';
  }

  console.log(message);
  return message;
}

// Format grant for display
function formatGrant(grant, pipeline) {
  const stage = pipeline?.stages?.find(s => s.id === grant.pipelineStageId);
  const deadline = grant.customFields?.deadline;
  const today = new Date();

  let daysLeft = null;
  let urgency = '⚪';
  if (deadline) {
    daysLeft = Math.ceil((new Date(deadline) - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) urgency = '🔴';
    else if (daysLeft <= 14) urgency = '🟡';
    else urgency = '🟢';
  }

  return {
    id: grant.id,
    name: grant.name,
    stage: stage?.name || 'Unknown',
    amount: grant.monetaryValue,
    deadline: deadline,
    daysLeft,
    urgency,
    funder: grant.customFields?.funder,
    url: grant.customFields?.application_url,
  };
}

// Parse CLI arguments
function parseArgs(args) {
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      i += value === true ? 1 : 2;
    } else {
      i++;
    }
  }
  return options;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  const { apiKey, locationId } = getGHLCredentials();
  if (!apiKey || !locationId) {
    console.error('Error: GHL_API_KEY and GHL_LOCATION_ID required');
    console.error('Add these to Bitwarden Secrets Manager or environment');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'search': {
        const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        await searchGrants(query || 'Indigenous social enterprise technology');
        break;
      }

      case 'upcoming': {
        const days = parseInt(options.days) || 30;
        const grants = await getUpcomingGrants(days);
        const pipeline = await getGrantsPipeline();

        console.log(`\n📅 GRANTS DUE IN NEXT ${days} DAYS\n`);

        if (grants.length === 0) {
          console.log('  No grants with upcoming deadlines.\n');
          console.log('  Run `act-grants search "<topic>"` to find new opportunities.');
          break;
        }

        for (const grant of grants) {
          const formatted = formatGrant(grant, pipeline);
          console.log(`${formatted.urgency} ${formatted.name}`);
          if (formatted.deadline) {
            console.log(`   Deadline: ${formatted.deadline} (${formatted.daysLeft} days)`);
          }
          if (formatted.amount) console.log(`   Amount: $${formatted.amount.toLocaleString()}`);
          console.log(`   Stage: ${formatted.stage}`);
          console.log();
        }
        break;
      }

      case 'list': {
        const pipeline = await getGrantsPipeline();
        if (!pipeline) break;

        const grants = await listGrants(options.stage);

        const stageFilter = options.stage ? ` (${options.stage})` : '';
        console.log(`\n📋 GRANTS PIPELINE${stageFilter}\n`);

        if (grants.length === 0) {
          console.log('  No grants in pipeline.\n');
          console.log('  Run `act-grants add "Grant Name"` to add one.');
          break;
        }

        // Group by stage
        const byStage = {};
        for (const grant of grants) {
          const formatted = formatGrant(grant, pipeline);
          if (!byStage[formatted.stage]) byStage[formatted.stage] = [];
          byStage[formatted.stage].push(formatted);
        }

        for (const [stage, stageGrants] of Object.entries(byStage)) {
          console.log(`── ${stage.toUpperCase()} (${stageGrants.length}) ──`);
          for (const grant of stageGrants) {
            console.log(`  ${grant.urgency} ${grant.name}`);
            if (grant.deadline) console.log(`    Deadline: ${grant.deadline}`);
            if (grant.amount) console.log(`    Amount: $${grant.amount.toLocaleString()}`);
          }
          console.log();
        }
        break;
      }

      case 'add': {
        const name = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        if (!name) {
          console.log('Usage: act-grants add "Grant Name" [--deadline YYYY-MM-DD] [--amount N] [--funder "Name"]');
          process.exit(1);
        }

        const grant = await addGrant(name, {
          deadline: options.deadline,
          amount: options.amount ? parseInt(options.amount) : null,
          funder: options.funder,
          url: options.url,
        });

        console.log(`\n✅ Added grant to GHL pipeline:\n`);
        console.log(`  Name: ${grant.name}`);
        console.log(`  ID: ${grant.id}`);
        if (options.deadline) console.log(`  Deadline: ${options.deadline}`);
        if (options.amount) console.log(`  Amount: $${parseInt(options.amount).toLocaleString()}`);
        console.log();
        break;
      }

      case 'move': {
        const grantId = args[1];
        const stageName = args.slice(2).filter(a => !a.startsWith('--')).join(' ');

        if (!grantId || !stageName) {
          console.log('Usage: act-grants move <grant-id> <stage-name>');
          console.log('Example: act-grants move abc123 "Application Submitted"');
          process.exit(1);
        }

        await moveGrant(grantId, stageName);
        console.log(`\n✅ Moved grant to "${stageName}"\n`);
        break;
      }

      case 'notify': {
        await sendNotification();
        break;
      }

      case 'pipelines': {
        // Debug: show available pipelines
        const { locationId: locId } = getGHLCredentials();
        const { pipelines } = await ghlRequest(`/opportunities/pipelines?locationId=${locId}`);
        console.log('\n📊 GHL PIPELINES\n');
        for (const p of pipelines || []) {
          console.log(`${p.name} (${p.id})`);
          for (const s of p.stages || []) {
            console.log(`  • ${s.name}`);
          }
          console.log();
        }
        break;
      }

      default:
        console.log(`
🎯 ACT Grant Research & Pipeline (GHL)

Usage:
  act-grants search <query>        Search for grant opportunities
  act-grants upcoming [--days N]   Show grants due soon (default: 30 days)
  act-grants list [--stage X]      List all grants (filter by stage)
  act-grants add "Name" [opts]     Add grant to GHL pipeline
  act-grants move <id> <stage>     Move grant to different stage
  act-grants notify                Generate deadline alert
  act-grants pipelines             Show GHL pipelines (debug)

Options for 'add':
  --deadline YYYY-MM-DD    Application deadline
  --amount N               Grant amount in AUD
  --funder "Name"          Funding organization
  --url "https://..."      Application URL

Examples:
  act-grants search "Indigenous social enterprise 2026"
  act-grants upcoming --days 14
  act-grants add "SEDI Grant" --deadline 2026-03-15 --amount 50000
  act-grants list --stage "Application Open"
  act-grants move abc123 "Application Submitted"
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
