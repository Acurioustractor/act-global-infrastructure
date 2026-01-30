/**
 * ACT Project Enrichment Service
 *
 * Combines data from multiple sources to create rich project pages:
 * 1. Notion database - project metadata, timeline, outcomes
 * 2. Empathy Ledger - storytellers, stories, thematic insights
 * 3. Blog posts - related reading and context
 * 4. Project analysis - related projects discovery
 * 5. Media storage - photo and video galleries
 */

import { getNotionProject, getNotionPageContent } from '../notion';
import type { ProjectEnrichmentData, NotionProjectMetadata } from '../notion/types';
import { findRelatedBlogPosts } from './blog-linking';
import { findRelatedProjects } from './project-relationships';

/**
 * Fetch storyteller data from Empathy Ledger for a given project
 */
async function getEmpathyLedgerData(projectSlug: string) {
  const empathyLedgerUrl = process.env.EMPATHY_LEDGER_URL || process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL;

  if (!empathyLedgerUrl) {
    console.warn('Empathy Ledger URL not configured');
    return null;
  }

  try {
    const response = await fetch(`${empathyLedgerUrl}/api/v1/act-projects/${projectSlug}/featured`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch Empathy Ledger data for ${projectSlug}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Empathy Ledger data:', error);
    return null;
  }
}

/**
 * Analyze themes from Empathy Ledger stories
 */
function analyzeThemes(stories: any[]): {
  primaryThemes: string[];
  emergingThemes: string[];
  storyCountByTheme: Record<string, number>;
  commonPatterns: string[];
} {
  if (!stories || stories.length === 0) {
    return {
      primaryThemes: [],
      emergingThemes: [],
      storyCountByTheme: {},
      commonPatterns: [],
    };
  }

  // Extract themes from stories
  const themeCount: Record<string, number> = {};

  stories.forEach(story => {
    if (story.themes && Array.isArray(story.themes)) {
      story.themes.forEach((theme: string) => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    }
  });

  // Sort themes by frequency
  const sortedThemes = Object.entries(themeCount)
    .sort(([, a], [, b]) => b - a);

  // Primary themes: appearing in 30%+ of stories
  const threshold = stories.length * 0.3;
  const primaryThemes = sortedThemes
    .filter(([, count]) => count >= threshold)
    .map(([theme]) => theme);

  // Emerging themes: appearing in 10-29% of stories
  const emergingThreshold = stories.length * 0.1;
  const emergingThemes = sortedThemes
    .filter(([, count]) => count >= emergingThreshold && count < threshold)
    .map(([theme]) => theme);

  return {
    primaryThemes,
    emergingThemes,
    storyCountByTheme: themeCount,
    commonPatterns: [], // TODO: See issue #4 in act-regenerative-studio: AI analysis for patterns
  };
}

/**
 * Find related blog posts (semantic search)
 */
async function getRelatedBlogPosts(projectSlug: string, projectMetadata: NotionProjectMetadata) {
  try {
    const blogPosts = await findRelatedBlogPosts(projectMetadata, {
      minRelevanceScore: 0.3,
      maxResults: 5,
    });

    return blogPosts.map(post => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      relevanceScore: post.relevanceScore,
      publishedAt: post.publishedAt,
      reason: post.relevanceReasons.join('; '),
      matchedKeywords: post.matchedKeywords,
      image: post.image,
    }));
  } catch (error) {
    console.error('Error finding related blog posts:', error);
    return [];
  }
}

/**
 * Find related projects based on themes, partners, geography
 */
async function getRelatedProjectsData(projectSlug: string, projectMetadata: NotionProjectMetadata) {
  try {
    const relatedProjects = await findRelatedProjects(projectMetadata, {
      minRelevanceScore: 0.3,
      maxResults: 5,
      includeStorytellers: true,
    });

    return relatedProjects.map(project => ({
      slug: project.slug,
      title: project.title,
      connectionType: project.connectionType,
      relevanceScore: project.relevanceScore,
      reason: project.reason,
      sharedElements: project.sharedElements,
    }));
  } catch (error) {
    console.error('Error finding related projects:', error);
    return [];
  }
}

/**
 * Get media galleries for a project
 */
async function getProjectMedia(projectSlug: string) {
  // TODO: See issue #5 in act-regenerative-studio: Implement media gallery retrieval
  // Sources:
  // - Supabase storage
  // - Year-in-review media
  // - Empathy Ledger story media

  return {
    photos: [],
    videos: [],
  };
}

/**
 * Main enrichment function - combines all data sources
 */
export async function enrichProject(projectSlug: string): Promise<ProjectEnrichmentData> {
  console.log(`Enriching project: ${projectSlug}`);

  // 1. Fetch Notion metadata
  const notionData = await getNotionProject(projectSlug);

  if (!notionData) {
    throw new Error(`Project not found in Notion: ${projectSlug}`);
  }

  // 2. Fetch Empathy Ledger data
  const empathyLedgerData = await getEmpathyLedgerData(projectSlug);

  let storytellers: any[] = [];
  let stories: any[] = [];
  let thematicInsights: {
    primaryThemes: string[];
    emergingThemes: string[];
    storyCountByTheme: Record<string, number>;
    commonPatterns: string[];
  } = {
    primaryThemes: [],
    emergingThemes: [],
    storyCountByTheme: {},
    commonPatterns: [],
  };

  if (empathyLedgerData) {
    storytellers = empathyLedgerData.storytellers || [];
    stories = empathyLedgerData.featured_stories || [];
    thematicInsights = analyzeThemes(stories);
  }

  // 3. Fetch related blog posts
  const relatedBlogPosts = await getRelatedBlogPosts(projectSlug, notionData);

  // 4. Find related projects
  const relatedProjects = await getRelatedProjectsData(projectSlug, notionData);

  // 5. Get media galleries
  const media = await getProjectMedia(projectSlug);

  // Combine all data
  const enrichmentData: ProjectEnrichmentData = {
    notion: notionData,
    storytellers: storytellers.map((s: any) => ({
      id: s.id,
      name: s.name,
      bio: s.custom_bio || s.bio,
      profileImage: s.profile_image_url,
      storyCount: s.story_count || 0,
    })),
    stories: stories.map((s: any) => ({
      id: s.id,
      title: s.title,
      excerpt: s.excerpt || '',
      storytellerId: s.storyteller_id,
      themes: s.themes || [],
      createdAt: s.created_at,
    })),
    thematicInsights,
    relatedBlogPosts,
    relatedProjects,
    media,
    lastEnriched: new Date().toISOString(),
    enrichmentVersion: '1.0',
    verificationStatus: {
      lcaaContent: 'draft',
      communityVoices: empathyLedgerData ? 'needs_review' : 'draft',
      blogLinks: 'draft',
      mediaGalleries: 'draft',
    },
    sources: {
      notion: {
        database_id: process.env.NOTION_PROJECTS_DATABASE_ID || '',
        page_id: notionData.id,
        last_synced: new Date().toISOString(),
      },
      empathyLedger: empathyLedgerData ? {
        storytellerCount: storytellers.length,
        storyCount: stories.length,
        last_synced: new Date().toISOString(),
      } : undefined,
      blogPosts: {
        linkedCount: relatedBlogPosts.length,
        last_scanned: new Date().toISOString(),
      },
    },
  };

  return enrichmentData;
}
