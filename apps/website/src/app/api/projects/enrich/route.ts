import { NextRequest, NextResponse } from 'next/server';
import { projects } from '@/data/projects';
import { enrichProject, batchEnrichProjects } from '@/lib/project-enrichment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/enrich?slug=project-slug
 * Enrich a single project with data from all sources
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const includeNotion = searchParams.get('notion') !== 'false';
    const includeStorytellers =
      searchParams.get('storytellers') !== 'false';
    const includeStories = searchParams.get('stories') !== 'false';
    const generateLCAA = searchParams.get('generate_lcaa') === 'true';

    if (!slug) {
      // Enrich all projects
      const enrichedProjects = await batchEnrichProjects(projects, {
        includeNotion,
        includeStorytellers,
        includeStories,
        generateLCAA,
        maxStorytellers: 3,
        maxStories: 2,
      });

      return NextResponse.json({
        projects: enrichedProjects,
        totalCount: enrichedProjects.length,
        timestamp: new Date().toISOString(),
      });
    }

    const project = projects.find((p) => p.slug === slug);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const enrichedProject = await enrichProject(project, {
      includeNotion,
      includeStorytellers,
      includeStories,
      generateLCAA,
      maxStorytellers: 5,
      maxStories: 3,
    });

    return NextResponse.json({
      project: enrichedProject,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/enrich
 * Enrich specific projects by slugs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slugs, options } = body;

    if (!Array.isArray(slugs)) {
      return NextResponse.json(
        { error: 'slugs must be an array' },
        { status: 400 }
      );
    }

    const projectsToEnrich = projects.filter((p) => slugs.includes(p.slug));

    if (projectsToEnrich.length === 0) {
      return NextResponse.json(
        { error: 'No matching projects found' },
        { status: 404 }
      );
    }

    const enrichedProjects = await batchEnrichProjects(
      projectsToEnrich,
      options || {}
    );

    return NextResponse.json({
      projects: enrichedProjects,
      totalCount: enrichedProjects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Batch enrichment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich projects',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
