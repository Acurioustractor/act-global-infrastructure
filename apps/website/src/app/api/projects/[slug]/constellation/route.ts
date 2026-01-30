/**
 * API endpoint to generate project constellation map
 *
 * GET /api/projects/[slug]/constellation
 *
 * Returns a complete constellation map showing:
 * - Center project
 * - All related projects with connection types
 * - Connection type distribution
 * - Total connections count
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProjectConstellation } from '@/lib/enrichment/project-relationships';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.log(`[Constellation API] Generating constellation for: ${slug}`);

    // Generate constellation map
    const constellation = await generateProjectConstellation(slug);

    console.log(`[Constellation API] Constellation generated:`, {
      centerProject: constellation.centerProject.title,
      totalConnections: constellation.totalConnections,
      connectionTypes: constellation.connectionTypes,
    });

    return NextResponse.json({
      success: true,
      constellation,
    });
  } catch (error) {
    console.error('[Constellation API] Error generating constellation:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate project constellation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
