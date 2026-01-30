/**
 * Notion Project Integration
 * Fetches project data from the ACT Placemat backend Notion integration
 */

const BACKEND_URL = process.env.NOTION_BACKEND_URL || 'http://localhost:4000';

export interface NotionProject {
  id: string;
  name: string;
  description?: string;
  aiSummary?: string;
  status?: string;
  themes?: string[];
  relatedPlaces?: Array<{ displayName: string; [key: string]: any }>;
  relatedOrganisations?: string[];
  relatedPeople?: string[];
  autonomyScore?: number;
  coverImage?: string | null;
  storytellerCount?: number;
  startDate?: string | null;
  endDate?: string | null;
  nextMilestoneDate?: string | null;
  supporters?: number;
  partnerCount?: number;
  relatedResources?: string[];
  relatedArtifacts?: string[];
  notionUrl?: string;
  projectLead?: string | null | { id: string; name: string; avatarUrl?: string };
  funding?: string;
  featured?: boolean;
  projectType?: string;
}

export interface NotionProjectsResponse {
  projects: NotionProject[];
  lastUpdated: string;
  totalCount: number;
}

/**
 * Fetch all projects from Notion backend
 */
export async function fetchNotionProjects(): Promise<NotionProjectsResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/real/projects`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid data format received from Notion backend');
    }

    return {
      projects: data.projects,
      lastUpdated: new Date().toISOString(),
      totalCount: data.projects.length,
    };
  } catch (error) {
    console.error('Error fetching Notion projects:', error);
    return {
      projects: [],
      lastUpdated: new Date().toISOString(),
      totalCount: 0,
    };
  }
}

/**
 * Find Notion project by name (fuzzy matching)
 */
export async function findNotionProjectByName(
  projectName: string
): Promise<NotionProject | null> {
  const { projects } = await fetchNotionProjects();

  // Exact match first
  const exactMatch = projects.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Fuzzy match - contains or is contained
  const fuzzyMatch = projects.find((p) => {
    const name = p.name.toLowerCase();
    const search = projectName.toLowerCase();
    return name.includes(search) || search.includes(name);
  });

  return fuzzyMatch || null;
}

/**
 * Get enrichment data for a project from Notion
 */
export async function enrichProjectFromNotion(
  projectName: string
): Promise<Partial<NotionProject>> {
  const notionProject = await findNotionProjectByName(projectName);

  if (!notionProject) {
    return {};
  }

  // Extract relevant enrichment data
  return {
    aiSummary: notionProject.aiSummary,
    themes: notionProject.themes,
    relatedPlaces: notionProject.relatedPlaces,
    relatedOrganisations: notionProject.relatedOrganisations,
    relatedPeople: notionProject.relatedPeople,
    autonomyScore: notionProject.autonomyScore,
    coverImage: notionProject.coverImage,
    storytellerCount: notionProject.storytellerCount,
    supporters: notionProject.supporters,
    partnerCount: notionProject.partnerCount,
    notionUrl: notionProject.notionUrl,
    projectLead: notionProject.projectLead,
    funding: notionProject.funding,
  };
}
