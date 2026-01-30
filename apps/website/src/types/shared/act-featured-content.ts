/**
 * Shared types for ACT Project Featured Content
 *
 * SOURCE OF TRUTH: This file in ACT Main Website repo
 * Used by: Empathy Ledger API, ACT Website client
 *
 * Last updated: 2024-12-24
 *
 * IMPORTANT: When modifying this file, copy to:
 * - /Users/benknight/Code/Empathy Ledger v.02/src/types/shared/act-featured-content.ts
 */

export interface ACTProject {
  id: string;
  slug: string;
  title: string;
  organization_name: string;
  focus_areas: string[];
  themes: string[];
  website_url?: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeaturedStoryteller {
  storyteller_id: string;
  display_name: string;
  profile_image_url?: string;
  featured_bio?: string;
  featured_tagline?: string;
  opted_in_at: string;
  approved_at?: string;
}

export interface FeaturedStory {
  story_id: string;
  title: string;
  excerpt?: string;
  featured_quote?: string;
  storyteller_id: string;
  storyteller_name: string;
  published_at: string;
  approved_at?: string;
}

export interface FeaturedContentResponse {
  project: ACTProject;
  featured: {
    storytellers: FeaturedStoryteller[];
    stories: FeaturedStory[];
  };
  meta: {
    storyteller_count: number;
    story_count: number;
    fetched_at: string;
  };
}

// Story-Based Impact Metrics
export interface StoryImpactMetrics {
  storytellerCount: number;
  storyCount: number;
  themeCount: number;
  insightCount: number;
  topThemes?: Array<{
    theme: string;
    count: number;
  }>;
  valueCreated?: {
    grantsWon?: number;
    policyChanges?: number;
    mediaCoverage?: number;
    collaborationsFormed?: number;
  };
}

// Community Insights
export interface CommunityInsight {
  id: string;
  type: 'pattern' | 'trend' | 'recommendation' | 'innovation' | 'wisdom';
  insight: string;
  supportingStoryCount: number;
  confidence?: number;
  createdAt: string;
  culturalContext?: string;
}

/**
 * Runtime validation helper
 * Use this in API consumers to validate responses
 */
export function isValidFeaturedContentResponse(
  data: any
): data is FeaturedContentResponse {
  return (
    data &&
    typeof data === 'object' &&
    'project' in data &&
    'featured' in data &&
    'meta' in data &&
    typeof data.project === 'object' &&
    typeof data.project.slug === 'string' &&
    typeof data.featured === 'object' &&
    Array.isArray(data.featured.storytellers) &&
    Array.isArray(data.featured.stories) &&
    typeof data.meta === 'object' &&
    typeof data.meta.storyteller_count === 'number' &&
    typeof data.meta.story_count === 'number'
  );
}
