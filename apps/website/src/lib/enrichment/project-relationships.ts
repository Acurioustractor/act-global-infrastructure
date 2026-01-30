/**
 * Related Projects Discovery Service
 *
 * Discovers connections between ACT projects based on:
 * 1. Shared themes and focus areas
 * 2. Shared storytellers (via Empathy Ledger)
 * 3. Geographic overlap
 * 4. Partner organization overlap
 * 5. Temporal relationships (concurrent or sequential projects)
 */

import { getAllNotionProjects } from '../notion';
import type { NotionProjectMetadata } from '../notion/types';

export type ConnectionType = 'direct' | 'thematic' | 'community' | 'geographic' | 'temporal';

export interface RelatedProject {
  slug: string;
  title: string;
  connectionType: ConnectionType;
  relevanceScore: number;
  reason: string;
  sharedElements: string[];
  organizationName: string;
  status: string;
}

/**
 * Fetch storytellers for a project from Empathy Ledger
 */
async function getProjectStorytellers(projectSlug: string): Promise<string[]> {
  const empathyLedgerUrl = process.env.EMPATHY_LEDGER_URL || process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL;

  if (!empathyLedgerUrl) {
    return [];
  }

  try {
    const response = await fetch(
      `${empathyLedgerUrl}/api/v1/act-projects/${projectSlug}/featured`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.storytellers || []).map((s: any) => s.id);
  } catch (error) {
    console.error('Error fetching storytellers:', error);
    return [];
  }
}

/**
 * Calculate thematic similarity between two projects
 */
function calculateThematicSimilarity(
  projectA: NotionProjectMetadata,
  projectB: NotionProjectMetadata
): {
  score: number;
  sharedElements: string[];
} {
  let score = 0;
  const sharedElements: string[] = [];

  // 1. Shared focus areas (high weight)
  const sharedFocusAreas = projectA.focusAreas.filter(area =>
    projectB.focusAreas.includes(area)
  );
  if (sharedFocusAreas.length > 0) {
    score += sharedFocusAreas.length * 0.25;
    sharedElements.push(...sharedFocusAreas.map(a => `Focus: ${a}`));
  }

  // 2. Shared themes (medium-high weight)
  const sharedThemes = projectA.themes.filter(theme =>
    projectB.themes.includes(theme)
  );
  if (sharedThemes.length > 0) {
    score += sharedThemes.length * 0.15;
    sharedElements.push(...sharedThemes.map(t => `Theme: ${t}`));
  }

  // 3. Shared partners (medium weight)
  const sharedPartners = projectA.partners.filter(partner =>
    projectB.partners.includes(partner)
  );
  if (sharedPartners.length > 0) {
    score += sharedPartners.length * 0.2;
    sharedElements.push(...sharedPartners.map(p => `Partner: ${p}`));
  }

  // 4. Same organization (direct connection)
  if (projectA.organizationName === projectB.organizationName && projectA.organizationName) {
    score += 0.3;
    sharedElements.push(`Organization: ${projectA.organizationName}`);
  }

  return { score: Math.min(1.0, score), sharedElements };
}

/**
 * Calculate geographic overlap
 */
function calculateGeographicOverlap(
  projectA: NotionProjectMetadata,
  projectB: NotionProjectMetadata
): {
  score: number;
  reason: string;
} {
  // TODO: See issue #3 in act-regenerative-studio: Extract location data from project metadata
  // For now, check if projects mention same locations in description/notes

  const locationsA = extractLocations(projectA.description + ' ' + projectA.notes);
  const locationsB = extractLocations(projectB.description + ' ' + projectB.notes);

  const sharedLocations = locationsA.filter(loc => locationsB.includes(loc));

  if (sharedLocations.length > 0) {
    return {
      score: Math.min(0.3, sharedLocations.length * 0.15),
      reason: `Shared locations: ${sharedLocations.join(', ')}`,
    };
  }

  return { score: 0, reason: '' };
}

/**
 * Extract location mentions from text
 */
function extractLocations(text: string): string[] {
  const locations: string[] = [];
  const commonLocations = [
    'Mount Isa',
    'Witta',
    'Brisbane',
    'Queensland',
    'Sydney',
    'Melbourne',
    'Palm Island',
    'Tennant Creek',
    'Sunshine Coast',
  ];

  for (const location of commonLocations) {
    if (text.toLowerCase().includes(location.toLowerCase())) {
      locations.push(location);
    }
  }

  return locations;
}

/**
 * Calculate temporal relationship
 */
function calculateTemporalRelationship(
  projectA: NotionProjectMetadata,
  projectB: NotionProjectMetadata
): {
  score: number;
  reason: string;
} {
  if (!projectA.startDate || !projectB.startDate) {
    return { score: 0, reason: '' };
  }

  const startA = new Date(projectA.startDate);
  const startB = new Date(projectB.startDate);

  const endA = projectA.endDate ? new Date(projectA.endDate) : new Date();
  const endB = projectB.endDate ? new Date(projectB.endDate) : new Date();

  // Check for overlap
  const hasOverlap = (startA <= endB) && (startB <= endA);

  if (hasOverlap) {
    return {
      score: 0.15,
      reason: 'Concurrent projects',
    };
  }

  // Check for sequential (one started within 6 months of other ending)
  const gapMonths = Math.abs(
    (startB.getTime() - endA.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (gapMonths <= 6) {
    return {
      score: 0.1,
      reason: 'Sequential projects',
    };
  }

  return { score: 0, reason: '' };
}

/**
 * Find all related projects for a given project
 */
export async function findRelatedProjects(
  project: NotionProjectMetadata,
  options: {
    minRelevanceScore?: number;
    maxResults?: number;
    includeStorytellers?: boolean;
  } = {}
): Promise<RelatedProject[]> {
  const {
    minRelevanceScore = 0.3, // Minimum 30% relevance
    maxResults = 5,
    includeStorytellers = true,
  } = options;

  // Get all projects from Notion
  const allProjects = await getAllNotionProjects();

  // Get storytellers for current project (if needed)
  let currentProjectStorytellers: string[] = [];
  if (includeStorytellers) {
    currentProjectStorytellers = await getProjectStorytellers(project.slug);
  }

  // Score each project
  const scoredProjects = await Promise.all(
    allProjects
      .filter(p => p.slug !== project.slug) // Exclude self
      .map(async otherProject => {
        let totalScore = 0;
        let primaryConnectionType: ConnectionType = 'thematic';
        const reasons: string[] = [];
        const sharedElements: string[] = [];

        // 1. Thematic similarity
        const thematic = calculateThematicSimilarity(project, otherProject);
        totalScore += thematic.score;
        sharedElements.push(...thematic.sharedElements);

        if (thematic.score > 0.3) {
          primaryConnectionType = 'thematic';
          reasons.push('Strong thematic alignment');
        }

        // 2. Geographic overlap
        const geographic = calculateGeographicOverlap(project, otherProject);
        totalScore += geographic.score;
        if (geographic.reason) {
          reasons.push(geographic.reason);
          if (geographic.score > 0.2) {
            primaryConnectionType = 'geographic';
          }
        }

        // 3. Temporal relationship
        const temporal = calculateTemporalRelationship(project, otherProject);
        totalScore += temporal.score;
        if (temporal.reason) {
          reasons.push(temporal.reason);
        }

        // 4. Community (shared storytellers)
        if (includeStorytellers && currentProjectStorytellers.length > 0) {
          const otherProjectStorytellers = await getProjectStorytellers(otherProject.slug);
          const sharedStorytellers = currentProjectStorytellers.filter(id =>
            otherProjectStorytellers.includes(id)
          );

          if (sharedStorytellers.length > 0) {
            const communityScore = Math.min(0.4, sharedStorytellers.length * 0.2);
            totalScore += communityScore;
            primaryConnectionType = 'community';
            reasons.push(`${sharedStorytellers.length} shared storyteller(s)`);
            sharedElements.push(`${sharedStorytellers.length} shared storytellers`);
          }
        }

        // 5. Direct connection (same organization or explicit Notion relation)
        if (project.organizationName === otherProject.organizationName && project.organizationName) {
          totalScore += 0.3;
          primaryConnectionType = 'direct';
          reasons.push('Same organization');
        }

        if (project.connections.includes(otherProject.id)) {
          totalScore += 0.5;
          primaryConnectionType = 'direct';
          reasons.push('Explicitly linked in Notion');
        }

        return {
          slug: otherProject.slug,
          title: otherProject.title,
          connectionType: primaryConnectionType,
          relevanceScore: Math.min(1.0, totalScore),
          reason: reasons.join('; '),
          sharedElements,
          organizationName: otherProject.organizationName,
          status: otherProject.status,
        };
      })
  );

  // Filter by minimum score and sort by relevance
  const relevantProjects = scoredProjects
    .filter(p => p.relevanceScore >= minRelevanceScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  return relevantProjects;
}

/**
 * Generate project constellation map
 */
export async function generateProjectConstellation(
  projectSlug: string
): Promise<{
  centerProject: NotionProjectMetadata;
  relatedProjects: RelatedProject[];
  connectionTypes: Record<ConnectionType, number>;
  totalConnections: number;
}> {
  const allProjects = await getAllNotionProjects();
  const centerProject = allProjects.find(p => p.slug === projectSlug);

  if (!centerProject) {
    throw new Error(`Project not found: ${projectSlug}`);
  }

  const relatedProjects = await findRelatedProjects(centerProject, {
    minRelevanceScore: 0.2, // Lower threshold for constellation view
    maxResults: 10, // More projects for visual map
    includeStorytellers: true,
  });

  // Count connection types
  const connectionTypes: Record<ConnectionType, number> = {
    direct: 0,
    thematic: 0,
    community: 0,
    geographic: 0,
    temporal: 0,
  };

  relatedProjects.forEach(project => {
    connectionTypes[project.connectionType]++;
  });

  return {
    centerProject,
    relatedProjects,
    connectionTypes,
    totalConnections: relatedProjects.length,
  };
}
