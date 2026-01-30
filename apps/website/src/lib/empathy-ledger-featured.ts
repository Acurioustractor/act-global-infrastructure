/**
 * Empathy Ledger Featured Content Integration
 * Uses tag-based system where storytellers opt-in and ACT admins approve
 * Replaces AI matching with explicit tagging in Empathy Ledger database
 */

const EMPATHY_LEDGER_URL =
  process.env.EMPATHY_LEDGER_URL || 'http://localhost:3001';

export interface FeaturedStoryteller {
  storyteller_id: string;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  current_organization: string | null;
  current_role: string | null;
  featured_bio: string | null; // Custom bio for this project
  custom_tagline: string | null;
  featured_priority: number;
  featured_story_count: number;
  opted_in_at: string;
  approved_at: string;
}

export interface FeaturedStory {
  story_id: string;
  story_title: string;
  excerpt: string | null;
  themes: string[] | null;
  featured_image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  submitted_at: string;
  storyteller_id: string;
  storyteller_name: string | null;
  storyteller_display_name: string | null;
  storyteller_image: string | null;
  featured_priority: number;
  featured_as_hero: boolean;
  relevance_score: number | null;
  ai_reasoning: string | null;
}

export interface FeaturedContentResponse {
  project: {
    slug: string;
    title: string;
    organization: string | null;
    focus_areas: string[] | null;
    themes: string[] | null;
  };
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

/**
 * Fetch featured storytellers and stories for an ACT project
 * This queries Empathy Ledger's tag-based system where:
 * - Storytellers opt-in via their dashboard
 * - ACT admins approve via admin panel
 * - Only opted-in AND approved content is returned
 */
export async function getFeaturedContentForProject(
  projectSlug: string,
  options: {
    type?: 'storytellers' | 'stories' | 'all';
    limit?: number;
  } = {}
): Promise<FeaturedContentResponse | null> {
  const { type = 'all', limit = 10 } = options;

  try {
    const params = new URLSearchParams({
      type,
      limit: limit.toString(),
    });

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/v1/act-projects/${projectSlug}/featured?${params}`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          `No featured content found for project: ${projectSlug}. This is normal if storytellers haven't opted in yet.`
        );
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Error fetching featured content for project ${projectSlug}:`,
      error
    );
    return null;
  }
}

/**
 * Fetch only featured storytellers for a project
 */
export async function getFeaturedStorytellersForProject(
  projectSlug: string,
  limit: number = 5
): Promise<FeaturedStoryteller[]> {
  const response = await getFeaturedContentForProject(projectSlug, {
    type: 'storytellers',
    limit,
  });

  return response?.featured.storytellers || [];
}

/**
 * Fetch only featured stories for a project
 */
export async function getFeaturedStoriesForProject(
  projectSlug: string,
  limit: number = 3
): Promise<FeaturedStory[]> {
  const response = await getFeaturedContentForProject(projectSlug, {
    type: 'stories',
    limit,
  });

  return response?.featured.stories || [];
}

/**
 * Get the hero story (highest priority featured story)
 */
export async function getHeroStoryForProject(
  projectSlug: string
): Promise<FeaturedStory | null> {
  const stories = await getFeaturedStoriesForProject(projectSlug, 1);
  return stories.length > 0 && stories[0].featured_as_hero
    ? stories[0]
    : null;
}

/**
 * Check if a project has any featured content
 */
export async function projectHasFeaturedContent(
  projectSlug: string
): Promise<boolean> {
  const response = await getFeaturedContentForProject(projectSlug, { limit: 1 });
  if (!response) return false;

  return (
    response.meta.storyteller_count > 0 || response.meta.story_count > 0
  );
}

/**
 * Get all featured content for all ACT projects (for admin dashboard)
 */
export async function getAllFeaturedContent(): Promise<
  Record<string, FeaturedContentResponse>
> {
  // This would need to query all projects
  // For now, return empty - implement when needed
  return {};
}
