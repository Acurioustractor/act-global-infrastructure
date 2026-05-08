#!/usr/bin/env node


/**
 * ACT GHL CLI - Query GoHighLevel from command line
 *
 * Usage:
 *   act-ghl contacts [--tag TAG] [--limit N]
 *   act-ghl contact <email>
 *   act-ghl pipelines
 *   act-ghl opportunities [--pipeline NAME]
 *   act-ghl search <query>
 */

import { execSync } from 'child_process';

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

const GHL_API_KEY = getSecret('GHL_API_KEY') || process.env.GHL_API_KEY;
const GHL_LOCATION_ID = getSecret('GHL_LOCATION_ID') || process.env.GHL_LOCATION_ID;
const BASE_URL = 'https://services.leadconnectorhq.com';

async function ghlRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getContacts(tag, limit = 20) {
  let endpoint = `/contacts/?locationId=${GHL_LOCATION_ID}&limit=${limit}`;
  if (tag) {
    endpoint += `&query=${encodeURIComponent(tag)}`;
  }
  const data = await ghlRequest(endpoint);
  return data.contacts || [];
}

async function getContact(email) {
  const endpoint = `/contacts/lookup?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`;
  const data = await ghlRequest(endpoint);
  return data.contacts?.[0] || null;
}

async function searchContacts(query) {
  const endpoint = `/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(query)}&limit=20`;
  const data = await ghlRequest(endpoint);
  return data.contacts || [];
}

async function getPipelines() {
  const endpoint = `/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`;
  const data = await ghlRequest(endpoint);
  return data.pipelines || [];
}

async function getOpportunities(pipelineName) {
  const pipelines = await getPipelines();
  let pipelineId = null;

  if (pipelineName) {
    const pipeline = pipelines.find(p =>
      p.name.toLowerCase().includes(pipelineName.toLowerCase())
    );
    if (pipeline) pipelineId = pipeline.id;
  }

  let endpoint = `/opportunities/search?locationId=${GHL_LOCATION_ID}&limit=20`;
  if (pipelineId) {
    endpoint += `&pipelineId=${pipelineId}`;
  }

  const data = await ghlRequest(endpoint);
  return data.opportunities || [];
}

// Parse command line
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('Error: GHL_API_KEY and GHL_LOCATION_ID required');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'contacts': {
        const tagIndex = args.indexOf('--tag');
        const limitIndex = args.indexOf('--limit');
        const tag = tagIndex > -1 ? args[tagIndex + 1] : null;
        const limit = limitIndex > -1 ? parseInt(args[limitIndex + 1]) : 20;

        const contacts = await getContacts(tag, limit);
        console.log(JSON.stringify(contacts, null, 2));
        break;
      }

      case 'contact': {
        const email = args[1];
        if (!email) {
          console.error('Usage: act-ghl contact <email>');
          process.exit(1);
        }
        const contact = await getContact(email);
        console.log(JSON.stringify(contact, null, 2));
        break;
      }

      case 'search': {
        const query = args.slice(1).join(' ');
        if (!query) {
          console.error('Usage: act-ghl search <query>');
          process.exit(1);
        }
        const contacts = await searchContacts(query);
        console.log(JSON.stringify(contacts, null, 2));
        break;
      }

      case 'pipelines': {
        const pipelines = await getPipelines();
        console.log(JSON.stringify(pipelines, null, 2));
        break;
      }

      case 'opportunities': {
        const pipelineIndex = args.indexOf('--pipeline');
        const pipelineName = pipelineIndex > -1 ? args[pipelineIndex + 1] : null;
        const opportunities = await getOpportunities(pipelineName);
        console.log(JSON.stringify(opportunities, null, 2));
        break;
      }

      default:
        console.log(`ACT GHL CLI - Query GoHighLevel

Usage:
  act-ghl contacts [--tag TAG] [--limit N]   List contacts
  act-ghl contact <email>                     Get contact by email
  act-ghl search <query>                      Search contacts
  act-ghl pipelines                           List pipelines
  act-ghl opportunities [--pipeline NAME]    List opportunities
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
