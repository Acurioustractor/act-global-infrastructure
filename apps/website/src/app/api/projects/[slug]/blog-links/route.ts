/**
 * API endpoint to find related blog posts
 *
 * GET /api/projects/[slug]/blog-links
 *
 * Discovers blog posts related to a project using:
 * - Direct project mentions
 * - Semantic similarity (themes, focus areas)
 * - Storyteller/people mentions
 * - Temporal relevance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotionProject } from '@/lib/notion';
import { findRelatedBlogPosts, generateBlogLinkingReport } from '@/lib/enrichment/blog-linking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const minScore = parseFloat(searchParams.get('minScore') || '0.2');
    const maxResults = parseInt(searchParams.get('maxResults') || '5');
    const includeReport = searchParams.get('report') === 'true';

    console.log(`[Blog Links API] Finding related blog posts for: ${slug}`);

    // Fetch project metadata
    const project = await getNotionProject(slug);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Find related blog posts
    const relatedPosts = await findRelatedBlogPosts(project, {
      minRelevanceScore: minScore,
      maxResults,
    });

    console.log(`[Blog Links API] Found ${relatedPosts.length} related posts`);

    // Optionally include detailed report
    let report = undefined;
    if (includeReport) {
      report = await generateBlogLinkingReport(project);
    }

    return NextResponse.json({
      success: true,
      project: {
        slug: project.slug,
        title: project.title,
      },
      relatedPosts,
      report,
      metadata: {
        minRelevanceScore: minScore,
        maxResults,
      },
    });
  } catch (error) {
    console.error('[Blog Links API] Error finding related posts:', error);
    return NextResponse.json(
      {
        error: 'Failed to find related blog posts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
