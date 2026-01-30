/**
 * Webflow CMS Client
 *
 * Fetches blog posts from Webflow CMS collections
 */

export interface WebflowBlogPost {
  _id: string;
  name: string; // Title
  slug: string;
  'post-body': string; // HTML content
  'post-summary': string; // Excerpt
  'main-image'?: {
    url: string;
    alt?: string;
  };
  'published-on'?: string;
  _archived: boolean;
  _draft: boolean;
  tags?: string[];
  categories?: string[];
  author?: {
    name: string;
  };
}

export interface WebflowCollection {
  _id: string;
  lastPublished: string;
  createdOn: string;
  name: string;
  slug: string;
}

/**
 * Fetch blog posts from a Webflow CMS collection
 */
export async function fetchWebflowBlogPosts(options: {
  apiToken: string;
  collectionId: string;
  limit?: number;
  offset?: number;
}): Promise<WebflowBlogPost[]> {
  const { apiToken, collectionId, limit = 100, offset = 0 } = options;

  try {
    const response = await fetch(
      `https://api.webflow.com/collections/${collectionId}/items?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'accept-version': '1.0.0',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Webflow API error: ${error.msg || response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('[Webflow Client] Error fetching blog posts:', error);
    throw error;
  }
}

/**
 * Fetch a single blog post by slug
 */
export async function fetchWebflowPost(options: {
  apiToken: string;
  collectionId: string;
  slug: string;
}): Promise<WebflowBlogPost | null> {
  const { apiToken, collectionId, slug } = options;

  try {
    const posts = await fetchWebflowBlogPosts({ apiToken, collectionId, limit: 100 });
    return posts.find((post) => post.slug === slug) || null;
  } catch (error) {
    console.error('[Webflow Client] Error fetching post:', error);
    return null;
  }
}

/**
 * List all collections in a Webflow site
 */
export async function fetchWebflowCollections(options: {
  apiToken: string;
  siteId: string;
}): Promise<WebflowCollection[]> {
  const { apiToken, siteId } = options;

  try {
    const response = await fetch(`https://api.webflow.com/sites/${siteId}/collections`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'accept-version': '1.0.0',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Webflow API error: ${error.msg || response.statusText}`);
    }

    const collections = await response.json();
    return collections || [];
  } catch (error) {
    console.error('[Webflow Client] Error fetching collections:', error);
    throw error;
  }
}

/**
 * Convert Webflow post to standard blog post format
 */
export function normalizeWebflowPost(post: WebflowBlogPost) {
  return {
    id: post._id,
    title: post.name,
    slug: post.slug,
    content: post['post-body'] || '',
    excerpt: post['post-summary'] || '',
    featuredImage: post['main-image']?.url,
    featuredImageAlt: post['main-image']?.alt,
    publishedAt: post['published-on'] || post._id, // Fallback to creation date
    tags: post.tags || [],
    categories: post.categories || [],
    author: post.author?.name || 'Unknown',
    isDraft: post._draft,
    isArchived: post._archived,
  };
}
