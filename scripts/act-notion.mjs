#!/usr/bin/env node


/**
 * ACT Notion CLI - Query Notion databases
 *
 * Usage:
 *   act-notion projects [--status STATUS]
 *   act-notion project <name>
 *   act-notion sprint [--status STATUS]
 *   act-notion search <query>
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Get secrets from Bitwarden via keychain
// Cache secrets to avoid repeated calls
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const bwsToken = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${bwsToken}" ~/bin/bws secret list --output json 2>/dev/null`,
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

// Get Notion token
function getNotionToken() {
  // Try config file first
  const configPath = join(homedir(), '.config', 'notion', 'api_key');
  if (existsSync(configPath)) {
    return readFileSync(configPath, 'utf8').trim();
  }

  // Try Bitwarden
  return getSecret('NOTION_TOKEN') || process.env.NOTION_TOKEN;
}

const NOTION_TOKEN = getNotionToken();
const NOTION_VERSION = '2022-06-28';

// Load database IDs from config
let DB_IDS = {};
const dbConfigPath = join(homedir(), 'act-global-infrastructure', 'config', 'notion-database-ids.json');
if (existsSync(dbConfigPath)) {
  DB_IDS = JSON.parse(readFileSync(dbConfigPath, 'utf8'));
}

async function notionRequest(endpoint, options = {}) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function queryDatabase(databaseId, filter = null, sorts = null) {
  const body = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const data = await notionRequest(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return data.results || [];
}

async function search(query) {
  const data = await notionRequest('/search', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  return data.results || [];
}

function extractTitle(page) {
  const titleProp = Object.values(page.properties).find(p => p.type === 'title');
  return titleProp?.title?.[0]?.plain_text || 'Untitled';
}

function extractStatus(page) {
  const statusProp = page.properties.Status || page.properties.status;
  return statusProp?.status?.name || statusProp?.select?.name || 'Unknown';
}

async function getProjects(status) {
  const dbId = DB_IDS.actProjects || DB_IDS.projects || DB_IDS['projects-db'];
  if (!dbId) {
    throw new Error('Projects database ID not configured');
  }

  let filter = null;
  if (status) {
    filter = {
      property: 'Status',
      status: { equals: status }
    };
  }

  const pages = await queryDatabase(dbId, filter, [
    { property: 'Status', direction: 'ascending' }
  ]);

  return pages.map(page => ({
    id: page.id,
    title: extractTitle(page),
    status: extractStatus(page),
    url: page.url
  }));
}

async function getSprintItems(status) {
  const dbId = DB_IDS.sprint || DB_IDS['sprint-db'];
  if (!dbId) {
    throw new Error('Sprint database ID not configured');
  }

  let filter = null;
  if (status) {
    filter = {
      property: 'Status',
      status: { equals: status }
    };
  }

  const pages = await queryDatabase(dbId, filter);

  return pages.map(page => ({
    id: page.id,
    title: extractTitle(page),
    status: extractStatus(page),
    url: page.url
  }));
}

// Parse command line
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!NOTION_TOKEN) {
    console.error('Error: NOTION_TOKEN required. Set up at ~/.config/notion/api_key');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'projects': {
        const statusIndex = args.indexOf('--status');
        const status = statusIndex > -1 ? args[statusIndex + 1] : null;
        const projects = await getProjects(status);
        console.log(JSON.stringify(projects, null, 2));
        break;
      }

      case 'sprint': {
        const statusIndex = args.indexOf('--status');
        const status = statusIndex > -1 ? args[statusIndex + 1] : null;
        const items = await getSprintItems(status);
        console.log(JSON.stringify(items, null, 2));
        break;
      }

      case 'search': {
        const query = args.slice(1).join(' ');
        if (!query) {
          console.error('Usage: act-notion search <query>');
          process.exit(1);
        }
        const results = await search(query);
        const simplified = results.map(r => ({
          id: r.id,
          type: r.object,
          title: r.object === 'page' ? extractTitle(r) : r.title?.[0]?.plain_text,
          url: r.url
        }));
        console.log(JSON.stringify(simplified, null, 2));
        break;
      }

      default:
        console.log(`ACT Notion CLI - Query Notion databases

Usage:
  act-notion projects [--status STATUS]    List projects
  act-notion sprint [--status STATUS]      List sprint items
  act-notion search <query>                Search pages
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
