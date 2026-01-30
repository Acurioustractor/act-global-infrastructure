/**
 * API endpoint to enrich ACT project data
 *
 * GET /api/projects/[slug]/enrich
 *
 * Combines data from:
 * - Notion (project metadata, timeline, outcomes)
 * - Empathy Ledger (storytellers, stories, themes)
 * - Blog posts (related reading)
 * - Project relationships (related projects)
 * - Media storage (photos, videos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichProject } from '@/lib/enrichment/project-enrichment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.log(`[Enrich API] Starting enrichment for project: ${slug}`);

    // Enrich project with data from all sources
    const enrichmentData = await enrichProject(slug);

    console.log(`[Enrich API] Enrichment complete for ${slug}:`, {
      hasNotion: !!enrichmentData.notion,
      storytellerCount: enrichmentData.storytellers.length,
      storyCount: enrichmentData.stories.length,
      primaryThemes: enrichmentData.thematicInsights.primaryThemes,
      emergingThemes: enrichmentData.thematicInsights.emergingThemes,
    });

    return NextResponse.json({
      success: true,
      data: enrichmentData,
    });
  } catch (error) {
    console.error('[Enrich API] Error enriching project:', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
