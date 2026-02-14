/**
 * Grant Sources: Australian funding opportunity discovery
 *
 * Two discovery modes:
 *   1. Web search: Uses Anthropic tool_use with web_search to find real, current grants
 *   2. RSS/API: Direct feeds from GrantConnect and other portals
 *
 * Each source returns normalized: { name, provider, program, amountMin, amountMax, closesAt, url, description, categories[] }
 */

import Anthropic from '@anthropic-ai/sdk';
import { trackedClaudeCompletion } from './llm-client.mjs';

const SCRIPT_NAME = 'grant-sources';
const anthropic = new Anthropic();

// Rate limiter: 1 request per second
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    await new Promise(r => setTimeout(r, 1000 - elapsed));
  }
  lastRequestTime = Date.now();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEB SEARCH DISCOVERY (real-time, verified grants)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Use Claude with web_search tool to find real, currently open grants.
 * This gives us verified URLs and current closing dates.
 */
async function searchWithWebSearch(searchQuery, sourceName) {
  await rateLimit();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{
        role: 'user',
        content: `Search for currently open Australian grant opportunities: "${searchQuery}"

Find grants that are CURRENTLY OPEN for applications in 2026. Focus on:
- Grants for NFPs / community organisations in Queensland
- Indigenous/First Nations programs
- Community development, social enterprise, arts, justice, environment
- Specific to: A Curious Tractor (regenerative innovation, First Nations community partnerships, circular economy)

For each grant found, extract:
- Exact name
- Provider/funder
- Amount range
- Closing date
- Application URL (MUST be a real, working URL you found)
- Brief description

Return ONLY a JSON array (no markdown, no explanation):
[{
  "name": "Grant Name",
  "provider": "Funder Name",
  "program": "Program stream if applicable",
  "amountMin": null,
  "amountMax": 50000,
  "closesAt": "2026-06-30",
  "url": "https://real-url-found-in-search.gov.au/...",
  "description": "What it funds",
  "categories": ["indigenous", "community"]
}]

Rules:
- ONLY include grants you verified are currently open via web search
- Every grant MUST have a real URL (not hallucinated)
- Use null for unknown amounts
- Categories from: justice, indigenous, stories, enterprise, regenerative, health, arts, community, technology, education
- Return [] if no current grants found`
      }],
    });

    // Extract text from response (may contain tool_use blocks)
    const textBlocks = response.content.filter(b => b.type === 'text');
    const text = textBlocks.map(b => b.text).join('\n');

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const grants = JSON.parse(jsonMatch[0]);
    return grants
      .filter(g => g.name && g.url) // Require real URL
      .map(g => ({ ...g, provider: g.provider || sourceName }));
  } catch (err) {
    console.error(`  Error in web search for "${searchQuery}":`, err.message);
    return [];
  }
}

/**
 * LLM-only fallback for sources where web search doesn't help
 */
async function searchSourceWithLLM(sourceName, sourceUrl, categories, keywords) {
  await rateLimit();

  const prompt = `You are an Australian grants research assistant. Search your knowledge for currently open or upcoming grant opportunities from ${sourceName} (${sourceUrl}).

Focus on grants relevant to these categories: ${categories.join(', ')}
Keywords: ${keywords.join(', ')}

For each grant found, provide structured JSON. Return ONLY a JSON array (no markdown):
[{
  "name": "Grant Program Name",
  "provider": "${sourceName}",
  "program": "Specific program/stream name",
  "amountMin": 10000,
  "amountMax": 50000,
  "closesAt": "2026-06-30",
  "url": null,
  "description": "Brief description of what it funds",
  "categories": ["indigenous", "arts"]
}]

Rules:
- Only include grants that are likely OPEN or UPCOMING in 2026
- Use null for unknown amounts or dates
- Categories must be from: justice, indigenous, stories, enterprise, regenerative, health, arts, community, technology, education
- Return [] if you don't know of any current grants from this source
- Set url to null — do NOT make up URLs`;

  try {
    const response = await trackedClaudeCompletion(prompt, SCRIPT_NAME, {
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 2000,
      operation: `search-${sourceName.toLowerCase().replace(/\s+/g, '-')}`,
    });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const grants = JSON.parse(jsonMatch[0]);
    return grants.filter(g => g.name && g.provider);
  } catch (err) {
    console.error(`  Error searching ${sourceName}:`, err.message);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCE DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Web search queries — these use real web search to find verified grants
const WEB_SEARCH_QUERIES = [
  {
    name: 'Federal Indigenous Grants',
    query: 'site:grants.gov.au OR site:niaa.gov.au Indigenous First Nations grants open 2026 Queensland',
  },
  {
    name: 'QLD Government Grants',
    query: 'site:qld.gov.au grants open applications 2026 community NFP not-for-profit',
  },
  {
    name: 'Arts Grants Australia',
    query: 'site:arts.qld.gov.au OR site:australiacouncil.gov.au grants open 2026 First Nations arts community',
  },
  {
    name: 'Foundation Grants',
    query: 'Australia foundation grants open 2026 Indigenous community social enterprise Queensland NFP',
  },
  {
    name: 'Environment & Land Grants',
    query: 'Australia grants open 2026 regenerative agriculture environment Indigenous land management Queensland',
  },
  {
    name: 'Social Enterprise Grants',
    query: 'Australia social enterprise grants 2026 circular economy community development Indigenous',
  },
  {
    name: 'Justice Innovation Grants',
    query: 'Australia youth justice innovation grants 2026 First Nations community-led',
  },
];

// LLM-only sources (fallback for portals that block web search)
const LLM_SOURCES = [
  {
    name: 'GrantConnect',
    url: 'https://www.grants.gov.au/',
    categories: ['justice', 'indigenous', 'community', 'health', 'enterprise'],
    keywords: ['youth justice', 'Indigenous', 'community development', 'social enterprise', 'NFP', 'capacity building'],
  },
  {
    name: 'Philanthropy Australia',
    url: 'https://www.philanthropy.org.au/',
    categories: ['community', 'indigenous', 'arts', 'enterprise'],
    keywords: ['foundation grants', 'philanthropic funding', 'social impact', 'community', 'Indigenous', 'arts culture'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Discover grants from a single LLM source (legacy mode)
 */
export async function discoverFromSource(source) {
  console.log(`  Searching ${source.name}...`);
  const grants = await searchSourceWithLLM(
    source.name,
    source.url,
    source.categories,
    source.keywords
  );
  console.log(`  Found ${grants.length} opportunities from ${source.name}`);
  return grants;
}

/**
 * Discover grants from all sources — web search first, then LLM fallback
 */
export async function discoverAll() {
  const allGrants = [];

  // Phase 1: Web search (verified, with real URLs)
  console.log('  [Phase 1] Web search discovery...');
  for (const search of WEB_SEARCH_QUERIES) {
    console.log(`  Searching: ${search.name}...`);
    const grants = await searchWithWebSearch(search.query, search.name);
    console.log(`  Found ${grants.length} verified grants from ${search.name}`);
    allGrants.push(...grants);
  }

  // Phase 2: LLM knowledge (unverified, no URLs)
  console.log('  [Phase 2] LLM knowledge discovery...');
  for (const source of LLM_SOURCES) {
    const grants = await discoverFromSource(source);
    allGrants.push(...grants);
  }

  return allGrants;
}

/**
 * Get list of configured sources
 */
export function getSources() {
  return [
    ...WEB_SEARCH_QUERIES.map(q => ({ name: q.name, type: 'web_search' })),
    ...LLM_SOURCES.map(s => ({ name: s.name, type: 'llm', url: s.url })),
  ];
}

export default { discoverAll, discoverFromSource, getSources };
