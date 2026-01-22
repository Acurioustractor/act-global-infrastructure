/**
 * Intelligence Platform API Client
 *
 * Client for accessing ACT Intelligence Platform from ClawdBot.
 * Provides search, agents, and project intelligence.
 */

const INTELLIGENCE_API_URL = process.env.INTELLIGENCE_API_URL || 'http://localhost:4000';
const INTELLIGENCE_API_KEY = process.env.INTELLIGENCE_API_KEY;

/**
 * Make authenticated request to Intelligence Platform
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${INTELLIGENCE_API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(INTELLIGENCE_API_KEY && { 'X-API-Key': INTELLIGENCE_API_KEY }),
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Unified search across all ACT data
 */
export async function search(query, options = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.sources) params.set('sources', options.sources.join(','));
  if (options.mode) params.set('mode', options.mode);
  if (options.limit) params.set('limit', options.limit.toString());

  return apiRequest(`/api/v1/search?${params}`);
}

/**
 * Get contact by ID
 */
export async function getContact(id) {
  return apiRequest(`/api/v1/contacts/${id}`);
}

/**
 * Search contacts
 */
export async function searchContacts(query, filters = {}) {
  const params = new URLSearchParams({ search: query, ...filters });
  return apiRequest(`/api/v1/contacts?${params}`);
}

/**
 * Get project list
 */
export async function getProjects(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiRequest(`/api/v1/projects?${params}`);
}

/**
 * Get morning brief
 */
export async function getMorningBrief() {
  return apiRequest('/api/v1/intelligence/brief');
}

/**
 * Get dashboard data
 */
export async function getDashboard() {
  return apiRequest('/api/dashboard/data');
}

// ============================================
// Agent API Access
// ============================================

/**
 * Call ALMA agent for signal tracking
 */
export async function almaSignals(data, signalTypes = []) {
  return apiRequest('/api/v1/agents/alma/signals', {
    method: 'POST',
    body: JSON.stringify({ data, signal_types: signalTypes }),
  });
}

/**
 * Call ALMA agent for ethics check
 */
export async function almaEthics(content, context = {}) {
  return apiRequest('/api/v1/agents/alma/ethics', {
    method: 'POST',
    body: JSON.stringify({ content, context }),
  });
}

/**
 * Find grant opportunities
 */
export async function findGrants(criteria, maxResults = 10) {
  return apiRequest('/api/v1/agents/grants/opportunities', {
    method: 'POST',
    body: JSON.stringify({ criteria, max_results: maxResults }),
  });
}

/**
 * Calculate SROI
 */
export async function calculateSROI(project, outcomes, inputs) {
  return apiRequest('/api/v1/agents/impact/sroi', {
    method: 'POST',
    body: JSON.stringify({ project, outcomes, inputs }),
  });
}

/**
 * Analyze story narrative
 */
export async function analyzeStory(story) {
  return apiRequest('/api/v1/agents/story/analyze', {
    method: 'POST',
    body: JSON.stringify({ story }),
  });
}

/**
 * Generate story summary
 */
export async function summarizeStory(story) {
  return apiRequest('/api/v1/agents/story/summary', {
    method: 'POST',
    body: JSON.stringify({ story }),
  });
}

// ============================================
// Health Check
// ============================================

/**
 * Check API connectivity
 */
export async function healthCheck() {
  try {
    const [search, agents] = await Promise.all([
      apiRequest('/api/v1/search/health').catch(() => ({ status: 'error' })),
      apiRequest('/api/v1/agents/health').catch(() => ({ status: 'error' })),
    ]);
    return {
      status: 'connected',
      url: INTELLIGENCE_API_URL,
      services: { search, agents },
    };
  } catch (error) {
    return {
      status: 'disconnected',
      url: INTELLIGENCE_API_URL,
      error: error.message,
    };
  }
}

// ============================================
// Formatting helpers for Telegram
// ============================================

/**
 * Format search results for Telegram
 */
export function formatSearchResults(results, maxItems = 5) {
  const lines = [`🔍 *Search: "${results.query}"*\n`];
  lines.push(`Mode: ${results.mode} | Time: ${results.meta.searchTime}ms\n`);

  const items = results.combined.slice(0, maxItems);
  if (items.length === 0) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  items.forEach((item, i) => {
    const source = item._sourceType || 'unknown';
    const emoji = source === 'contacts' ? '👤' : source === 'projects' ? '📋' : '📖';
    const title = item.full_name || item.name || item.title || 'Unknown';
    const subtitle = item.current_company || item.status || item.summary?.slice(0, 50) || '';
    lines.push(`${emoji} *${i + 1}. ${title}*`);
    if (subtitle) lines.push(`   ${subtitle}`);
  });

  if (results.meta.totalResults > maxItems) {
    lines.push(`\n_...and ${results.meta.totalResults - maxItems} more_`);
  }

  return lines.join('\n');
}

/**
 * Format contact for Telegram
 */
export function formatContact(contact) {
  const lines = [`👤 *${contact.full_name}*\n`];
  if (contact.current_position) lines.push(`💼 ${contact.current_position}`);
  if (contact.current_company) lines.push(`🏢 ${contact.current_company}`);
  if (contact.location) lines.push(`📍 ${contact.location}`);
  if (contact.email_address) lines.push(`📧 ${contact.email_address}`);
  if (contact.strategic_value) lines.push(`⭐ Strategic Value: ${contact.strategic_value}`);
  return lines.join('\n');
}

/**
 * Format grants for Telegram
 */
export function formatGrants(grants, maxItems = 5) {
  const lines = ['💰 *Grant Opportunities*\n'];
  const items = grants.opportunities?.slice(0, maxItems) || [];

  if (items.length === 0) {
    lines.push('No matching grants found.');
    return lines.join('\n');
  }

  items.forEach((grant, i) => {
    lines.push(`*${i + 1}. ${grant.name}*`);
    if (grant.amount) lines.push(`   💵 ${grant.amount}`);
    if (grant.deadline) lines.push(`   📅 ${grant.deadline}`);
    if (grant.eligibility) lines.push(`   ✅ ${grant.eligibility}`);
    lines.push('');
  });

  return lines.join('\n');
}

export default {
  search,
  getContact,
  searchContacts,
  getProjects,
  getMorningBrief,
  getDashboard,
  almaSignals,
  almaEthics,
  findGrants,
  calculateSROI,
  analyzeStory,
  summarizeStory,
  healthCheck,
  formatSearchResults,
  formatContact,
  formatGrants,
};
