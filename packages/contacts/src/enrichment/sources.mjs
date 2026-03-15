/**
 * @act/contacts/enrichment — Data Source Adapters
 *
 * Pluggable data sources for contact enrichment.
 * Each source is a standalone async function — no shared state.
 * Consumers can use any combination of sources.
 */

/**
 * Tavily web search for company/person info.
 *
 * @param {string} query - Search query
 * @param {object} [options]
 * @param {string} [options.apiKey] - Tavily API key (default: process.env.TAVILY_API_KEY)
 * @returns {{ answer: string|null, results: Array<{ title: string, url: string, content: string }> } | null}
 */
export async function searchTavily(query, options = {}) {
  const apiKey = options.apiKey || process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_raw_content: false,
        include_answer: true,
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    return {
      answer: data.answer || null,
      results: (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        content: r.content?.substring(0, 500),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch and extract metadata from a website URL.
 *
 * @param {string} url - Website URL to fetch
 * @param {object} [options]
 * @param {number} [options.timeout] - Timeout in ms (default: 8000)
 * @returns {{ title: string|null, description: string|null, text: string, url: string } | null}
 */
export async function fetchWebsite(url, options = {}) {
  const timeout = options.timeout || 8000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ACT-Enricher/1.0 (+https://act.place)' },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!resp.ok) return null;

    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const text = (bodyMatch?.[1] || html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);

    return {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || ogDescMatch?.[1]?.trim() || null,
      text,
      url,
    };
  } catch {
    return null;
  }
}

/**
 * Look up GitHub profile by username or email.
 *
 * @param {string} identifier - GitHub username or email
 * @param {object} [options]
 * @param {string} [options.token] - GitHub token (default: process.env.GITHUB_TOKEN)
 * @returns {{ login: string, name: string, bio: string, company: string, location: string, blog: string, public_repos: number, followers: number, twitter_username: string } | null}
 */
export async function lookupGitHub(identifier, options = {}) {
  const token = options.token || process.env.GITHUB_TOKEN;
  if (!identifier) return null;

  try {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let username = identifier;

    if (identifier.includes('@')) {
      const searchResp = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(identifier)}+in:email`,
        { headers }
      );
      if (!searchResp.ok) return null;
      const searchData = await searchResp.json();
      if (!searchData.items?.length) return null;
      username = searchData.items[0].login;
    }

    const resp = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (!resp.ok) return null;

    const data = await resp.json();
    return {
      login: data.login,
      name: data.name,
      bio: data.bio,
      company: data.company,
      location: data.location,
      blog: data.blog,
      public_repos: data.public_repos,
      followers: data.followers,
      twitter_username: data.twitter_username,
    };
  } catch {
    return null;
  }
}

/**
 * Cross-reference against LinkedIn data in a Supabase table.
 * Looks for contacts tagged with 'linkedin'.
 *
 * @param {object} supabase - Supabase client
 * @param {object} criteria
 * @param {string} [criteria.email]
 * @param {string} [criteria.firstName]
 * @param {string} [criteria.lastName]
 * @param {object} [options]
 * @param {string} [options.table] - Table name (default: 'ghl_contacts')
 * @param {string} [options.tagField] - Tag field name (default: 'tags')
 * @param {string} [options.linkedInTag] - LinkedIn tag value (default: 'linkedin')
 * @returns {{ source: string, company_name: string, tags: string[] } | null}
 */
export async function crossRefLinkedIn(supabase, { email, firstName, lastName }, options = {}) {
  if (!supabase) return null;

  const table = options.table || 'ghl_contacts';
  const tagField = options.tagField || 'tags';
  const linkedInTag = options.linkedInTag || 'linkedin';

  try {
    if (email) {
      const { data } = await supabase
        .from(table)
        .select('company_name, tags, first_name, last_name, source')
        .ilike('email', email)
        .contains(tagField, [linkedInTag])
        .limit(1)
        .single();

      if (data) return { source: 'linkedin_email', ...data };
    }

    if (firstName && lastName) {
      const { data } = await supabase
        .from(table)
        .select('company_name, tags, email, source')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .contains(tagField, [linkedInTag])
        .limit(1)
        .single();

      if (data) return { source: 'linkedin_name', ...data };
    }

    return null;
  } catch {
    return null;
  }
}

/** Personal email domains to detect non-company emails */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'live.com', 'me.com', 'aol.com',
  'protonmail.com', 'proton.me', 'fastmail.com',
]);

/**
 * Check if an email is from a personal (non-company) domain.
 * @param {string} email
 * @returns {boolean}
 */
export function isPersonalEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}
