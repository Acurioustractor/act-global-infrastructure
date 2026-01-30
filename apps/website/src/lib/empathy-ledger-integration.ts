/**
 * Empathy Ledger Integration
 * Queries storytellers and stories from Empathy Ledger Supabase database
 */

const EMPATHY_LEDGER_URL =
  process.env.EMPATHY_LEDGER_URL || 'http://localhost:3001';

export interface Storyteller {
  id: string;
  full_name: string;
  bio?: string;
  profile_image_url?: string;
  cultural_background?: string;
  organization_id?: string;
  is_featured?: boolean;
  story_count?: number;
}

export interface Story {
  id: string;
  title: string;
  excerpt?: string;
  themes?: string[];
  storyteller_id: string;
  storyteller?: {
    full_name: string;
    profile_image_url?: string;
  };
  created_at: string;
}

export interface StorytellerSearchResult {
  storytellers: Storyteller[];
  totalCount: number;
}

export interface StorySearchResult {
  stories: Story[];
  totalCount: number;
}

/**
 * Search storytellers by organization
 */
export async function searchStorytellersByOrganization(
  organizationName: string,
  options: {
    limit?: number;
    hasStories?: boolean;
  } = {}
): Promise<StorytellerSearchResult> {
  try {
    const params = new URLSearchParams();
    if (organizationName) params.append('organization', organizationName);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.hasStories !== undefined)
      params.append('has_stories', options.hasStories.toString());

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/search/storytellers?${params}`,
      {
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch storytellers:', response.statusText);
      return { storytellers: [], totalCount: 0 };
    }

    const data = await response.json();
    return {
      storytellers: data.storytellers || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error('Error searching storytellers:', error);
    return { storytellers: [], totalCount: 0 };
  }
}

/**
 * Search storytellers by themes
 */
export async function searchStorytellersByThemes(
  themes: string[],
  options: {
    limit?: number;
  } = {}
): Promise<StorytellerSearchResult> {
  try {
    const params = new URLSearchParams();
    params.append('themes', themes.join(','));
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/search/storytellers?${params}`,
      {
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      return { storytellers: [], totalCount: 0 };
    }

    const data = await response.json();
    return {
      storytellers: data.storytellers || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error('Error searching storytellers by themes:', error);
    return { storytellers: [], totalCount: 0 };
  }
}

/**
 * Get storyteller's stories
 */
export async function getStorytellerStories(
  storytellerId: string,
  options: {
    limit?: number;
    privacyLevel?: 'public' | 'community';
  } = {}
): Promise<StorySearchResult> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.privacyLevel)
      params.append('privacy_level', options.privacyLevel);

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/v1/profiles/${storytellerId}/stories?${params}`,
      {
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      return { stories: [], totalCount: 0 };
    }

    const data = await response.json();
    return {
      stories: data.stories || [],
      totalCount: data.total_count || 0,
    };
  } catch (error) {
    console.error('Error fetching storyteller stories:', error);
    return { stories: [], totalCount: 0 };
  }
}

/**
 * Search stories by themes
 */
export async function searchStoriesByThemes(
  themes: string[],
  options: {
    limit?: number;
    project?: string;
  } = {}
): Promise<StorySearchResult> {
  try {
    const params = new URLSearchParams();
    params.append('themes', themes.join(','));
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.project) params.append('project', options.project);

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/stories/search?${params}`,
      {
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      return { stories: [], totalCount: 0 };
    }

    const data = await response.json();
    return {
      stories: data.stories || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error('Error searching stories:', error);
    return { stories: [], totalCount: 0 };
  }
}

/**
 * Get thematic analysis across storytellers
 */
export async function getThematicAnalysis(
  storytellerIds: string[],
  options: {
    organization?: string;
    culturalContext?: string;
  } = {}
): Promise<any> {
  try {
    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/analytics/thematic-analysis`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storytellerIds,
          organization: options.organization,
          analysisType: 'comprehensive',
          culturalContext: options.culturalContext,
          includeMediaKit: true,
          includeRelatedContent: true,
        }),
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching thematic analysis:', error);
    return null;
  }
}
