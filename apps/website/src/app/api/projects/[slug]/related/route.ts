/**
 * API endpoint to find related projects
 *
 * GET /api/projects/[slug]/related
 *
 * Discovers project relationships based on:
 * - Shared themes and focus areas
 * - Shared storytellers
 * - Geographic overlap
 * - Partner organizations
 * - Temporal relationships
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotionProject } from '@/lib/notion';
import { findRelatedProjects } from '@/lib/enrichment/project-relationships';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const minScore = parseFloat(searchParams.get('minScore') || '0.3');
    const maxResults = parseInt(searchParams.get('maxResults') || '5');
    const includeStorytellers = searchParams.get('includeStorytellers') !== 'false';

    console.log(`[Related API] Finding related projects for: ${slug}`);

    // Fetch project metadata
    const project = await getNotionProject(slug);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Find related projects
    const relatedProjects = await findRelatedProjects(project, {
      minRelevanceScore: minScore,
      maxResults,
      includeStorytellers,
    });

    console.log(`[Related API] Found ${relatedProjects.length} related projects`);

    return NextResponse.json({
      success: true,
      project: {
        slug: project.slug,
        title: project.title,
      },
      relatedProjects,
      metadata: {
        minRelevanceScore: minScore,
        maxResults,
        includeStorytellers,
      },
    });
  } catch (error) {
    console.error('[Related API] Error finding related projects:', error);
    return NextResponse.json(
      {
        error: 'Failed to find related projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
