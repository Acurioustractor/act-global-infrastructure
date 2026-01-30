/**
 * Blog Post Linking Service
 *
 * Discovers and scores blog posts related to ACT projects using:
 * 1. Direct project mentions in content
 * 2. Semantic similarity (theme/focus area overlap)
 * 3. Storyteller/people mentions
 * 4. Temporal relevance (recent posts weighted higher)
 */

import type { NotionProjectMetadata } from '../notion/types';

export interface RelatedBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  publishedAt: string;
  relevanceReasons: string[];
  matchedKeywords: string[];
  image?: string;
}

/**
 * Calculate semantic similarity between project and blog post
 */
function calculateSemanticSimilarity(
  project: NotionProjectMetadata,
  blogPost: {
    title: string;
    content: string;
    tags?: string[];
    category?: string;
  }
): {
  score: number;
  reasons: string[];
  matchedKeywords: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  const blogText = `${blogPost.title} ${blogPost.content}`.toLowerCase();

  // 1. Direct project name/slug mention (high weight)
  const projectNameVariants = [
    project.title.toLowerCase(),
    project.slug.toLowerCase(),
    project.organizationName.toLowerCase(),
  ].filter(Boolean);

  for (const variant of projectNameVariants) {
    if (blogText.includes(variant)) {
      score += 0.4;
      reasons.push(`Direct mention of "${variant}"`);
      matchedKeywords.push(variant);
      break; // Only count once
    }
  }

  // 2. Focus area overlap (medium-high weight)
  const matchedFocusAreas = project.focusAreas.filter(area =>
    blogText.includes(area.toLowerCase())
  );
  if (matchedFocusAreas.length > 0) {
    const focusScore = Math.min(0.3, matchedFocusAreas.length * 0.15);
    score += focusScore;
    reasons.push(`Shared focus areas: ${matchedFocusAreas.join(', ')}`);
    matchedKeywords.push(...matchedFocusAreas);
  }

  // 3. Theme overlap (medium weight)
  const matchedThemes = project.themes.filter(theme =>
    blogText.includes(theme.toLowerCase())
  );
  if (matchedThemes.length > 0) {
    const themeScore = Math.min(0.2, matchedThemes.length * 0.1);
    score += themeScore;
    reasons.push(`Shared themes: ${matchedThemes.join(', ')}`);
    matchedKeywords.push(...matchedThemes);
  }

  // 4. Partner mention (medium weight)
  const matchedPartners = project.partners.filter(partner =>
    blogText.includes(partner.toLowerCase())
  );
  if (matchedPartners.length > 0) {
    score += 0.15;
    reasons.push(`Partner organization mentioned: ${matchedPartners.join(', ')}`);
    matchedKeywords.push(...matchedPartners);
  }

  // 5. Blog tags/category match (low weight)
  if (blogPost.tags && blogPost.tags.length > 0) {
    const allProjectKeywords = [
      ...project.focusAreas,
      ...project.themes,
      ...project.partners,
    ].map(k => k.toLowerCase());

    const matchedTags = blogPost.tags.filter(tag =>
      allProjectKeywords.includes(tag.toLowerCase())
    );

    if (matchedTags.length > 0) {
      score += 0.1;
      reasons.push(`Matching tags: ${matchedTags.join(', ')}`);
    }
  }

  return { score, reasons, matchedKeywords };
}

/**
 * Calculate recency bonus
 */
function calculateRecencyBonus(publishedAt: string): number {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysSincePublish = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: recent posts get higher bonus
  // 1-30 days: +0.1 bonus
  // 31-90 days: +0.05 bonus
  // 91-180 days: +0.02 bonus
  // >180 days: 0 bonus

  if (daysSincePublish <= 30) return 0.1;
  if (daysSincePublish <= 90) return 0.05;
  if (daysSincePublish <= 180) return 0.02;
  return 0;
}

/**
 * Fetch blog posts from Webflow CMS
 */
async function fetchBlogPosts(): Promise<Array<{
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  tags?: string[];
  category?: string;
  image?: string;
}>> {
  try {
    // Import Webflow client dynamically
    const { fetchWebflowBlogPosts, normalizeWebflowPost } = await import('../webflow/client');

    const apiToken = process.env.WEBFLOW_API_TOKEN || process.env.WEBFLOW_API_KEY;

    // Support multiple blog collections
    const collectionIds = [
      process.env.WEBFLOW_BLOG_COLLECTION_ID,
      process.env.WEBFLOW_BLOG_COLLECTION_ID_2,
    ].filter(Boolean);

    if (!apiToken || collectionIds.length === 0) {
      console.warn('[Blog Linking] Webflow credentials not configured');
      return [];
    }

    // Fetch from all collections
    const allPosts = [];
    for (const collectionId of collectionIds) {
      const posts = await fetchWebflowBlogPosts({
        apiToken: apiToken!,
        collectionId: collectionId!,
        limit: 100,
      });

      const normalized = posts
        .filter((p) => !p._draft && !p._archived) // Only published posts
        .map(normalizeWebflowPost);

      allPosts.push(...normalized);
    }

    return allPosts;
  } catch (error) {
    console.error('[Blog Linking] Error fetching Webflow posts:', error);
    return [];
  }
}

/**
 * Find related blog posts for a project
 */
export async function findRelatedBlogPosts(
  project: NotionProjectMetadata,
  options: {
    minRelevanceScore?: number;
    maxResults?: number;
  } = {}
): Promise<RelatedBlogPost[]> {
  const {
    minRelevanceScore = 0.2, // Minimum 20% relevance
    maxResults = 5,
  } = options;

  // Fetch all blog posts
  const allPosts = await fetchBlogPosts();

  // Score each post
  const scoredPosts = allPosts.map(post => {
    const { score, reasons, matchedKeywords } = calculateSemanticSimilarity(project, post);
    const recencyBonus = calculateRecencyBonus(post.publishedAt);
    const finalScore = Math.min(1.0, score + recencyBonus);

    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      relevanceScore: finalScore,
      publishedAt: post.publishedAt,
      relevanceReasons: reasons,
      matchedKeywords,
      image: post.image,
    };
  });

  // Filter by minimum score and sort by relevance
  const relevantPosts = scoredPosts
    .filter(post => post.relevanceScore >= minRelevanceScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  return relevantPosts;
}

/**
 * Generate blog post linking report
 */
export async function generateBlogLinkingReport(project: NotionProjectMetadata): Promise<{
  totalPostsScanned: number;
  relevantPostsFound: number;
  topPosts: RelatedBlogPost[];
  averageRelevanceScore: number;
}> {
  const allPosts = await fetchBlogPosts();
  const relatedPosts = await findRelatedBlogPosts(project, { minRelevanceScore: 0.1 });

  const averageScore = relatedPosts.length > 0
    ? relatedPosts.reduce((sum, post) => sum + post.relevanceScore, 0) / relatedPosts.length
    : 0;

  return {
    totalPostsScanned: allPosts.length,
    relevantPostsFound: relatedPosts.length,
    topPosts: relatedPosts.slice(0, 5),
    averageRelevanceScore: averageScore,
  };
}
