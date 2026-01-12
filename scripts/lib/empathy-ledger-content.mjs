/**
 * Empathy Ledger Content Hub Service
 *
 * Fetches content from Empathy Ledger's Content Hub API for syndication
 * to GHL and other platforms.
 *
 * Content Types:
 * - Articles: Blog posts and long-form content
 * - Stories: Storyteller narratives
 * - Media: Photos and videos with AI-generated tags
 *
 * Usage:
 *   import { createEmpathyLedgerService } from './lib/empathy-ledger-content.mjs';
 *   const el = createEmpathyLedgerService();
 *   const articles = await el.getArticles({ type: 'story_feature', limit: 10 });
 */

// Configuration
const CONFIG = {
  baseUrl: process.env.EMPATHY_LEDGER_URL || 'http://localhost:3030',
  apiKey: process.env.CONTENT_HUB_API_KEY || 'ch_act_2026_empathyledger_syndication_key',
  defaultProject: 'empathy-ledger'
};

/**
 * Make a request to the Empathy Ledger Content Hub API
 */
async function contentHubRequest(endpoint, options = {}) {
  const url = `${CONFIG.baseUrl}/api/v1/content-hub${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': CONFIG.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Content Hub API Error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Get published articles from Empathy Ledger
 *
 * @param {Object} options
 * @param {string} options.type - Article type filter (story_feature, program_spotlight, etc.)
 * @param {string} options.project - Filter by ACT project
 * @param {string} options.tag - Filter by tag
 * @param {number} options.limit - Max results
 * @param {number} options.page - Page number
 */
async function getArticles(options = {}) {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.project) params.set('project', options.project);
  if (options.tag) params.set('tag', options.tag);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.page) params.set('page', options.page.toString());

  const queryString = params.toString();
  const endpoint = `/articles${queryString ? `?${queryString}` : ''}`;

  return contentHubRequest(endpoint);
}

/**
 * Get a single article by slug
 */
async function getArticle(slug) {
  return contentHubRequest(`/articles/${slug}`);
}

/**
 * Get published stories from Empathy Ledger
 */
async function getStories(options = {}) {
  const params = new URLSearchParams();
  if (options.visibility) params.set('visibility', options.visibility);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.page) params.set('page', options.page.toString());
  if (options.theme) params.set('theme', options.theme);

  const queryString = params.toString();
  const endpoint = `/stories${queryString ? `?${queryString}` : ''}`;

  return contentHubRequest(endpoint);
}

/**
 * Get a single story by ID
 */
async function getStory(id) {
  return contentHubRequest(`/stories/${id}`);
}

/**
 * Get media from the library
 */
async function getMedia(options = {}) {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.tag) params.set('tag', options.tag);
  if (options.limit) params.set('limit', options.limit.toString());

  const queryString = params.toString();
  const endpoint = `/media${queryString ? `?${queryString}` : ''}`;

  return contentHubRequest(endpoint);
}

/**
 * Get content by narrative themes
 */
async function getThemes(options = {}) {
  return contentHubRequest('/themes');
}

/**
 * Search content across all types
 */
async function searchContent(query, options = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.type) params.set('type', options.type);
  if (options.limit) params.set('limit', options.limit.toString());

  return contentHubRequest(`/search?${params}`);
}

/**
 * Register a syndication (track where content is published)
 */
async function registerSyndication(data) {
  return contentHubRequest('/syndicate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Transform Empathy Ledger article to GHL post format
 *
 * @param {Object} article - Article from Content Hub API
 * @param {Object} options - Additional options
 * @param {string[]} options.accountIds - GHL account IDs to post to
 * @param {string} options.scheduledAt - Optional scheduled time
 */
function articleToGHLPost(article, options = {}) {
  // Build post content
  let content = article.title;

  if (article.excerpt) {
    content = `${article.title}\n\n${article.excerpt}`;
  }

  // Add link to full article
  const articleUrl = `${CONFIG.baseUrl}/articles/${article.slug}`;
  content += `\n\nRead more: ${articleUrl}`;

  // Add hashtags from tags
  if (article.tags && article.tags.length > 0) {
    const hashtags = article.tags
      .slice(0, 5)
      .map(t => `#${t.replace(/\s+/g, '')}`)
      .join(' ');
    content += `\n\n${hashtags}`;
  }

  // Add ACT hashtag
  content += ' #ACTEcosystem';

  return {
    accountIds: options.accountIds || [],
    summary: content,
    mediaUrls: article.featuredImageUrl ? [article.featuredImageUrl] : [],
    scheduledAt: options.scheduledAt || null,
    source: 'empathy-ledger',
    sourceId: article.id,
    sourceType: 'article'
  };
}

/**
 * Transform Empathy Ledger story to GHL post format
 */
function storyToGHLPost(story, options = {}) {
  // Build post content - stories are more personal
  let content = `"${story.title}"`;

  if (story.excerpt) {
    content += `\n\n${story.excerpt}`;
  }

  if (story.storytellerName) {
    content += `\n\n- ${story.storytellerName}`;
  }

  // Add link
  const storyUrl = `${CONFIG.baseUrl}/stories/${story.id}`;
  content += `\n\n#Storytelling #EmpathyLedger ${storyUrl}`;

  return {
    accountIds: options.accountIds || [],
    summary: content,
    mediaUrls: story.heroImageUrl ? [story.heroImageUrl] : [],
    scheduledAt: options.scheduledAt || null,
    source: 'empathy-ledger',
    sourceId: story.id,
    sourceType: 'story'
  };
}

/**
 * Get content ready for syndication to GHL
 *
 * Returns articles and stories that:
 * - Are published
 * - Have syndication enabled
 * - Haven't been synced yet (no syndication record)
 */
async function getContentForGHLSync(options = {}) {
  const result = {
    articles: [],
    stories: [],
    total: 0
  };

  try {
    // Get syndication-enabled articles
    const articlesResponse = await getArticles({
      limit: options.limit || 20,
      ...options
    });

    result.articles = articlesResponse.articles?.filter(a =>
      a.syndicationEnabled !== false
    ) || [];

    // Get syndication-enabled stories
    const storiesResponse = await getStories({
      visibility: 'public',
      limit: options.limit || 20
    });

    result.stories = storiesResponse.stories?.filter(s =>
      s.syndicationEnabled !== false
    ) || [];

    result.total = result.articles.length + result.stories.length;
  } catch (error) {
    console.error('Error fetching content for GHL sync:', error.message);
  }

  return result;
}

/**
 * Check Content Hub API health
 */
async function healthCheck() {
  try {
    // Try to fetch a small amount of content
    const response = await contentHubRequest('/articles?limit=1');
    return {
      healthy: true,
      baseUrl: CONFIG.baseUrl,
      articlesAvailable: response.pagination?.total || 0
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      baseUrl: CONFIG.baseUrl
    };
  }
}

/**
 * Create the Empathy Ledger Content Hub service
 */
export function createEmpathyLedgerService(options = {}) {
  // Override config if provided
  if (options.baseUrl) CONFIG.baseUrl = options.baseUrl;
  if (options.apiKey) CONFIG.apiKey = options.apiKey;

  return {
    // Content fetching
    getArticles,
    getArticle,
    getStories,
    getStory,
    getMedia,
    getThemes,
    searchContent,

    // Syndication
    registerSyndication,
    getContentForGHLSync,

    // Transformers
    articleToGHLPost,
    storyToGHLPost,

    // Health
    healthCheck,

    // Config
    config: CONFIG
  };
}

export default createEmpathyLedgerService;
