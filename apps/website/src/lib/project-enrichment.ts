/**
 * Unified Project Enrichment Service
 * Orchestrates data from Notion, Empathy Ledger, and AI matching
 * to create comprehensive, living project pages
 */

import type { Project } from '@/data/projects';
import {
  enrichProjectFromNotion,
  findNotionProjectByName,
} from './notion-integration';
import {
  searchStorytellersByOrganization,
  searchStorytellersByThemes,
  getStorytellerStories,
  searchStoriesByThemes,
} from './empathy-ledger-integration';
import {
  batchMatchStorytellersToProject,
  findBestStoriesForProject,
  generateLCAAContentFromStories,
  type ProjectMatchResult,
  type StoryMatchResult,
} from './ai-project-matcher';

export interface EnrichedProject extends Project {
  // From Notion
  notionData?: {
    aiSummary?: string;
    themes?: string[];
    relatedPlaces?: Array<{ displayName: string }>;
    relatedOrganisations?: string[];
    relatedPeople?: string[];
    autonomyScore?: number;
    supporters?: number;
    partnerCount?: number;
    notionUrl?: string;
    projectLead?: any;
    funding?: string;
  };

  // From Empathy Ledger + AI matching
  featuredStorytellers?: ProjectMatchResult[];
  relatedStories?: StoryMatchResult[];

  // AI-generated LCAA content (if not already present)
  aiGeneratedLCAA?: {
    listen?: string;
    curiosity?: string;
    action?: string;
    art?: string;
  };

  // Metadata
  enrichmentMetadata: {
    lastEnriched: string;
    sources: string[];
    confidence: number;
  };
}

/**
 * Map project names to organization names for Empathy Ledger queries
 */
const PROJECT_TO_ORGANIZATION_MAP: Record<string, string> = {
  'JusticeHub': 'JusticeHub',
  'Empathy Ledger': 'Empathy Ledger',
  'Goods on Country': 'Goods.',
  'Goods Tennant Creek Journey': 'Goods.',
  'Pakkinjalki kari (Washing Machine)': 'Goods.',
  'Weave Bed Design': 'Goods.',
  'Fishers Oysters': 'Fishers Oysters',
  'BG Fit Mount Isa': 'BG Fit',
  'NAIDOC Week Mount Isa': 'BG Fit',
  'Quandamooka Justice and Healing Strategy': 'MMEIC',
  'PICC Centre Precinct': 'PICC',
  'PICC Photo Kiosk': 'PICC',
  'PICC Elders Hull River Trip': 'PICC',
  'PICC Annual Report': 'PICC',
  'TOMNET': 'TOMNET',
  'Mounty Yarns': 'Mounty Yarns',
};

/**
 * Main enrichment function - orchestrates all data sources
 */
export async function enrichProject(
  project: Project,
  options: {
    includeNotion?: boolean;
    includeStorytellers?: boolean;
    includeStories?: boolean;
    generateLCAA?: boolean;
    maxStorytellers?: number;
    maxStories?: number;
  } = {}
): Promise<EnrichedProject> {
  const {
    includeNotion = true,
    includeStorytellers = true,
    includeStories = true,
    generateLCAA = false,
    maxStorytellers = 5,
    maxStories = 3,
  } = options;

  const sources: string[] = [];
  let enrichedProject: EnrichedProject = {
    ...project,
    enrichmentMetadata: {
      lastEnriched: new Date().toISOString(),
      sources: [],
      confidence: 0,
    },
  };

  // 1. Enrich from Notion
  if (includeNotion) {
    try {
      const notionData = await enrichProjectFromNotion(project.title);
      if (Object.keys(notionData).length > 0) {
        enrichedProject.notionData = notionData;
        sources.push('notion');
      }
    } catch (error) {
      console.error('Error enriching from Notion:', error);
    }
  }

  // 2. Find related storytellers from Empathy Ledger
  if (includeStorytellers) {
    try {
      const organizationName = PROJECT_TO_ORGANIZATION_MAP[project.title];

      if (organizationName) {
        // Search by organization first
        const { storytellers } = await searchStorytellersByOrganization(
          organizationName,
          {
            limit: 20,
            hasStories: true,
          }
        );

        if (storytellers.length > 0) {
          // Use AI to match storytellers to project
          const matches = await batchMatchStorytellersToProject(
            storytellers,
            project,
            {
              minRelevanceScore: 60,
              maxMatches: maxStorytellers,
            }
          );

          if (matches.length > 0) {
            enrichedProject.featuredStorytellers = matches;
            sources.push('empathy-ledger-storytellers');
          }
        }
      } else {
        // Fallback: search by themes/focus areas
        const { storytellers } = await searchStorytellersByThemes(
          project.focus,
          {
            limit: 10,
          }
        );

        if (storytellers.length > 0) {
          const matches = await batchMatchStorytellersToProject(
            storytellers,
            project,
            {
              minRelevanceScore: 70, // Higher threshold for theme-based matching
              maxMatches: maxStorytellers,
            }
          );

          if (matches.length > 0) {
            enrichedProject.featuredStorytellers = matches;
            sources.push('empathy-ledger-storytellers-thematic');
          }
        }
      }
    } catch (error) {
      console.error('Error finding storytellers:', error);
    }
  }

  // 3. Find related stories
  if (includeStories) {
    try {
      // Search by focus areas/themes
      const { stories } = await searchStoriesByThemes(project.focus, {
        limit: 15,
      });

      if (stories.length > 0) {
        // Use AI to select best stories
        const bestStories = await findBestStoriesForProject(stories, project, {
          maxStories,
        });

        if (bestStories.length > 0) {
          enrichedProject.relatedStories = bestStories;
          sources.push('empathy-ledger-stories');
        }
      }
    } catch (error) {
      console.error('Error finding stories:', error);
    }
  }

  // 4. Generate LCAA content from stories (if requested and not already present)
  if (
    generateLCAA &&
    enrichedProject.relatedStories &&
    enrichedProject.relatedStories.length > 0 &&
    (!project.listen || !project.curiosity || !project.action || !project.art)
  ) {
    try {
      const stories = enrichedProject.relatedStories.map((s) => s.story);
      const generatedLCAA = await generateLCAAContentFromStories(
        project,
        stories
      );

      enrichedProject.aiGeneratedLCAA = generatedLCAA;
      sources.push('ai-generated-lcaa');
    } catch (error) {
      console.error('Error generating LCAA content:', error);
    }
  }

  // Calculate confidence score based on data sources
  const confidence = calculateConfidenceScore(enrichedProject);

  enrichedProject.enrichmentMetadata = {
    lastEnriched: new Date().toISOString(),
    sources,
    confidence,
  };

  return enrichedProject;
}

/**
 * Calculate confidence score for enrichment quality
 */
function calculateConfidenceScore(enrichedProject: EnrichedProject): number {
  let score = 0;

  // Base score from original project data
  if (enrichedProject.description) score += 20;
  if (enrichedProject.heroImage) score += 10;
  if (enrichedProject.videoUrl) score += 10;

  // LCAA content
  if (enrichedProject.listen) score += 5;
  if (enrichedProject.curiosity) score += 5;
  if (enrichedProject.action) score += 5;
  if (enrichedProject.art) score += 5;

  // Notion data
  if (enrichedProject.notionData?.aiSummary) score += 10;
  if (enrichedProject.notionData?.themes) score += 5;
  if (enrichedProject.notionData?.relatedOrganisations) score += 5;

  // Storytellers
  if (enrichedProject.featuredStorytellers) {
    score += Math.min(enrichedProject.featuredStorytellers.length * 5, 15);
  }

  // Stories
  if (enrichedProject.relatedStories) {
    score += Math.min(enrichedProject.relatedStories.length * 3, 10);
  }

  return Math.min(score, 100);
}

/**
 * Batch enrich multiple projects
 */
export async function batchEnrichProjects(
  projects: Project[],
  options: Parameters<typeof enrichProject>[1] = {}
): Promise<EnrichedProject[]> {
  const enrichedProjects: EnrichedProject[] = [];

  for (const project of projects) {
    try {
      const enriched = await enrichProject(project, options);
      enrichedProjects.push(enriched);

      // Rate limiting - wait 1 second between projects
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error enriching project ${project.title}:`, error);
      // Include the project anyway with minimal enrichment
      enrichedProjects.push({
        ...project,
        enrichmentMetadata: {
          lastEnriched: new Date().toISOString(),
          sources: [],
          confidence: 20,
        },
      });
    }
  }

  return enrichedProjects;
}
