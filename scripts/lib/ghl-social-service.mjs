/**
 * GoHighLevel Social Media Posting Service for ACT
 *
 * Provides social media publishing capabilities via GHL Social Planner API:
 * - Create and schedule posts (LinkedIn, Facebook, Instagram, Twitter)
 * - Upload media (images, videos)
 * - Get connected social accounts
 * - Track post analytics
 *
 * API Docs: https://marketplace.gohighlevel.com/docs/ghl/social-planner/
 *
 * Requires scopes:
 * - socialplanner/account.readonly
 * - socialplanner/post.write
 * - socialplanner/post.readonly
 */

export class GHLSocialService {
  constructor(apiKey, locationId) {
    if (!apiKey) {
      throw new Error('GHL_API_KEY is required');
    }
    if (!locationId) {
      throw new Error('GHL_LOCATION_ID is required');
    }

    this.apiKey = apiKey;
    this.locationId = locationId;
    this.baseURL = 'https://services.leadconnectorhq.com';

    // Rate limiting (GHL allows 100 req/10sec = 10 req/sec)
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
  }

  /**
   * Make authenticated API request with rate limiting
   */
  async request(endpoint, options = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GHL Social API Error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GHL Social API Request Failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACCOUNTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get all connected social media accounts
   *
   * @returns {Promise<Array>} List of connected accounts
   */
  async getAccounts() {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/accounts`
    );
    return data.accounts || [];
  }

  /**
   * Get accounts by platform type
   *
   * @param {string} platform - Platform name: 'facebook', 'instagram', 'linkedin', 'twitter', 'google', 'tiktok'
   * @returns {Promise<Array>} Accounts for the specified platform
   */
  async getAccountsByPlatform(platform) {
    const accounts = await this.getAccounts();
    return accounts.filter(a =>
      a.platform?.toLowerCase() === platform.toLowerCase()
    );
  }

  /**
   * Delete/disconnect a social account
   *
   * @param {string} accountId - The account ID to disconnect
   */
  async deleteAccount(accountId) {
    await this.request(
      `/social-media-posting/${this.locationId}/accounts/${accountId}`,
      { method: 'DELETE' }
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POSTS - CREATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Create a social media post
   *
   * @param {Object} postData - Post configuration
   * @param {string[]} postData.accountIds - Array of connected account IDs to post to
   * @param {string} postData.summary - Post content/caption
   * @param {string[]} [postData.mediaUrls] - Array of media URLs (images/videos)
   * @param {Date|string} [postData.scheduledAt] - ISO8601 date for scheduled posting (optional, posts immediately if not set)
   * @param {string} [postData.type] - Post type: 'post', 'story', 'reel' (platform dependent)
   * @param {Object} [postData.tags] - Hashtags and mentions
   * @returns {Promise<Object>} Created post object
   */
  async createPost(postData) {
    const { accountIds, summary, mediaUrls, scheduledAt, type = 'post', tags, userId } = postData;

    if (!accountIds || accountIds.length === 0) {
      throw new Error('At least one accountId is required');
    }
    if (!summary) {
      throw new Error('Post summary/content is required');
    }

    // GHL API requires userId - use the one from the first account or a default
    const postUserId = userId || process.env.GHL_USER_ID || this.locationId;

    const body = {
      accountIds,
      summary,
      type,
      userId: postUserId,
      media: [] // GHL requires media as array, even if empty
    };

    // Add media if provided (transform mediaUrls to media format)
    if (mediaUrls && mediaUrls.length > 0) {
      body.media = mediaUrls.map(url => ({
        type: url.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image',
        url
      }));
    }

    if (scheduledAt) {
      // Convert to ISO8601 if Date object
      body.scheduledAt = scheduledAt instanceof Date
        ? scheduledAt.toISOString()
        : scheduledAt;
    }

    if (tags) {
      body.tags = tags;
    }

    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    return data;
  }

  /**
   * Create a post across multiple platforms with platform-specific content
   *
   * @param {Object} multiPostData - Multi-platform post configuration
   * @param {Object} multiPostData.platforms - Object with platform-specific content
   * @param {Date|string} [multiPostData.scheduledAt] - Scheduled time (applies to all)
   * @returns {Promise<Object[]>} Array of created post objects
   *
   * @example
   * await createMultiPlatformPost({
   *   platforms: {
   *     linkedin: { accountId: 'abc123', summary: 'Professional version...' },
   *     twitter: { accountId: 'def456', summary: 'Short version...' },
   *     facebook: { accountId: 'ghi789', summary: 'Casual version...' }
   *   },
   *   scheduledAt: new Date('2025-01-15T10:00:00Z')
   * });
   */
  async createMultiPlatformPost(multiPostData) {
    const { platforms, scheduledAt, mediaUrls } = multiPostData;
    const results = [];

    for (const [platform, config] of Object.entries(platforms)) {
      try {
        const post = await this.createPost({
          accountIds: [config.accountId],
          summary: config.summary,
          mediaUrls: config.mediaUrls || mediaUrls, // Use platform-specific or shared media
          scheduledAt,
          type: config.type || 'post'
        });
        results.push({ platform, success: true, post });
      } catch (error) {
        results.push({ platform, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Schedule a post for future publishing
   *
   * @param {Object} postData - Same as createPost
   * @param {Date|string} scheduleTime - When to publish
   * @returns {Promise<Object>} Scheduled post object
   */
  async schedulePost(postData, scheduleTime) {
    return this.createPost({
      ...postData,
      scheduledAt: scheduleTime
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POSTS - READ/UPDATE/DELETE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get a single post by ID
   *
   * @param {string} postId - The post ID
   * @returns {Promise<Object>} Post object
   */
  async getPost(postId) {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts/${postId}`
    );
    return data.post || data;
  }

  /**
   * Get posts with filters
   *
   * @param {Object} filters - Filter options
   * @param {string[]} [filters.accountIds] - Filter by account IDs
   * @param {string} [filters.status] - Filter by status: 'draft', 'scheduled', 'published', 'failed'
   * @param {Date|string} [filters.fromDate] - Posts from this date
   * @param {Date|string} [filters.toDate] - Posts until this date
   * @param {number} [filters.limit] - Max results
   * @param {number} [filters.skip] - Pagination offset
   * @returns {Promise<{posts: Array, total: number}>}
   */
  async getPosts(filters = {}) {
    const body = {};

    if (filters.accountIds) body.accountIds = filters.accountIds;
    if (filters.status) body.status = filters.status;
    if (filters.fromDate) body.fromDate = filters.fromDate;
    if (filters.toDate) body.toDate = filters.toDate;
    if (filters.limit) body.limit = filters.limit;
    if (filters.skip) body.skip = filters.skip;

    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts/list`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    return {
      posts: data.posts || [],
      total: data.total || 0
    };
  }

  /**
   * Get scheduled posts
   *
   * @returns {Promise<Array>} List of scheduled posts
   */
  async getScheduledPosts() {
    const { posts } = await this.getPosts({ status: 'scheduled' });
    return posts;
  }

  /**
   * Get published posts
   *
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Array>} List of published posts
   */
  async getPublishedPosts(days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { posts } = await this.getPosts({
      status: 'published',
      fromDate: fromDate.toISOString()
    });
    return posts;
  }

  /**
   * Update an existing post
   *
   * @param {string} postId - The post ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated post object
   */
  async updatePost(postId, updates) {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts/${postId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
    return data;
  }

  /**
   * Delete a post
   *
   * @param {string} postId - The post ID
   */
  async deletePost(postId) {
    await this.request(
      `/social-media-posting/${this.locationId}/posts/${postId}`,
      { method: 'DELETE' }
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATISTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get social media statistics/analytics
   *
   * @param {Object} params - Query parameters
   * @param {string[]} [params.accountIds] - Filter by account IDs
   * @param {string[]} [params.platforms] - Filter by platforms
   * @returns {Promise<Object>} Statistics object with metrics
   */
  async getStatistics(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.accountIds) {
      params.accountIds.forEach(id => queryParams.append('accountIds', id));
    }
    if (params.platforms) {
      params.platforms.forEach(p => queryParams.append('platforms', p));
    }

    const query = queryParams.toString();
    const endpoint = `/social-media-posting/${this.locationId}/stats${query ? `?${query}` : ''}`;

    const data = await this.request(endpoint);
    return data;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CATEGORIES & TAGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get post categories
   *
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/categories`
    );
    return data.categories || [];
  }

  /**
   * Get tags used in posts
   *
   * @returns {Promise<Array>} List of tags
   */
  async getTags() {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/tags`
    );
    return data.tags || [];
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILITY METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Format post content for specific platform
   *
   * @param {string} content - Original content
   * @param {string} platform - Target platform
   * @param {Object} options - Formatting options
   * @returns {string} Formatted content
   */
  formatForPlatform(content, platform, options = {}) {
    const limits = {
      twitter: 280,
      linkedin: 3000,
      instagram: 2200,
      facebook: 63206,
      tiktok: 2200
    };

    const limit = limits[platform.toLowerCase()] || 5000;
    let formatted = content;

    // Add hashtags if provided
    if (options.hashtags && options.hashtags.length > 0) {
      const hashtagString = options.hashtags.map(h => `#${h.replace('#', '')}`).join(' ');
      formatted = `${formatted}\n\n${hashtagString}`;
    }

    // Truncate if needed (preserve last word)
    if (formatted.length > limit) {
      formatted = formatted.substring(0, limit - 3);
      const lastSpace = formatted.lastIndexOf(' ');
      if (lastSpace > limit - 50) {
        formatted = formatted.substring(0, lastSpace);
      }
      formatted += '...';
    }

    return formatted;
  }

  /**
   * Validate media URLs for posting
   *
   * @param {string[]} urls - Media URLs to validate
   * @returns {Object} Validation result with valid/invalid URLs
   */
  validateMediaUrls(urls) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webp'];
    const valid = [];
    const invalid = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const ext = urlObj.pathname.toLowerCase().slice(urlObj.pathname.lastIndexOf('.'));
        if (validExtensions.some(e => ext.includes(e)) || url.includes('cloudinary') || url.includes('unsplash')) {
          valid.push(url);
        } else {
          invalid.push({ url, reason: 'Unsupported file extension' });
        }
      } catch (e) {
        invalid.push({ url, reason: 'Invalid URL format' });
      }
    }

    return { valid, invalid };
  }

  /**
   * Health check for social media service
   *
   * @returns {Promise<Object>} Health status with account info
   */
  async healthCheck() {
    try {
      const accounts = await this.getAccounts();
      return {
        healthy: true,
        connectedAccounts: accounts.length,
        platforms: [...new Set(accounts.map(a => a.platform))]
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACTORY FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create GHL Social service instance from environment variables
 *
 * @returns {GHLSocialService}
 */
export function createGHLSocialService() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    throw new Error(
      'Missing GHL credentials. Set GHL_API_KEY and GHL_LOCATION_ID environment variables.'
    );
  }

  return new GHLSocialService(apiKey, locationId);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT TRANSFORMERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Transform Notion content item to GHL post format
 *
 * @param {Object} notionItem - Notion database item
 * @param {Object} accountMap - Map of platform names to account IDs
 * @returns {Object} GHL post data
 */
export function notionToGHLPost(notionItem, accountMap) {
  const properties = notionItem.properties || {};

  // Extract content from Notion properties
  const title = properties.Name?.title?.[0]?.plain_text || '';
  const content = properties.Content?.rich_text?.[0]?.plain_text || '';
  const platforms = properties.Platforms?.multi_select?.map(p => p.name) || [];
  const scheduledDate = properties['Scheduled Date']?.date?.start;
  const mediaUrls = properties['Media URLs']?.url ? [properties['Media URLs'].url] : [];
  const hashtags = properties.Hashtags?.multi_select?.map(h => h.name) || [];

  // Map platforms to account IDs
  const accountIds = platforms
    .map(p => accountMap[p.toLowerCase()])
    .filter(Boolean);

  // Build summary with hashtags
  let summary = content || title;
  if (hashtags.length > 0) {
    const hashtagString = hashtags.map(h => `#${h.replace('#', '')}`).join(' ');
    summary = `${summary}\n\n${hashtagString}`;
  }

  return {
    accountIds,
    summary,
    mediaUrls,
    scheduledAt: scheduledDate || null,
    notionId: notionItem.id,
    title
  };
}

/**
 * Transform Ralph social campaign post to GHL format
 *
 * @param {Object} ralphPost - Post from Ralph social campaign JSON
 * @param {Object} accountMap - Map of platform names to account IDs
 * @returns {Object} GHL post data
 */
export function ralphToGHLPost(ralphPost, accountMap) {
  const platform = ralphPost.platform?.toLowerCase() || 'linkedin';
  const accountId = accountMap[platform];

  if (!accountId) {
    throw new Error(`No account configured for platform: ${platform}`);
  }

  return {
    accountIds: [accountId],
    summary: ralphPost.content,
    mediaUrls: ralphPost.media_urls || [],
    scheduledAt: ralphPost.scheduled_time || null,
    type: ralphPost.type || 'post',
    ralphPostId: ralphPost.id
  };
}
