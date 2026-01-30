/**
 * API endpoint to fetch ACT project metadata from Notion
 *
 * GET /api/projects/[slug]/notion
 *
 * Returns enriched project data from Notion database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotionProject, getNotionPageContent } from '@/lib/notion';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch project metadata from Notion
    const project = await getNotionProject(slug);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found in Notion database' },
        { status: 404 }
      );
    }

    // Optionally fetch page content (notes, details)
    let pageContent = '';
    if (project.id) {
      try {
        pageContent = await getNotionPageContent(project.id);
      } catch (error) {
        console.warn('Could not fetch page content:', error);
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        pageContent,
      },
    });
  } catch (error) {
    console.error('Error fetching Notion project:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch project from Notion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
