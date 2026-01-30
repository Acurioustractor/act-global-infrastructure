/**
 * Project Media API
 *
 * GET /api/projects/[slug]/media - Get all media for a project
 * POST /api/projects/[slug]/media - Link media to a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectMedia, createMediaLink } from '@/lib/media/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const linkType = searchParams.get('linkType') || 'project_page';

    const media = await getProjectMedia(linkType, slug);

    return NextResponse.json({
      success: true,
      data: media,
      metadata: {
        project: slug,
        linkType,
        count: media.length,
      },
    });
  } catch (error) {
    console.error('[Project Media API] Error fetching project media:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch project media',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    if (!body.media_id) {
      return NextResponse.json({ error: 'Missing required field: media_id' }, { status: 400 });
    }

    const link = await createMediaLink({
      media_id: body.media_id,
      link_type: body.link_type || 'project_page',
      link_id: slug,
      display_order: body.display_order || 0,
      caption: body.caption,
      alt_text: body.alt_text,
      is_hero: body.is_hero || false,
      is_featured: body.is_featured || false,
    });

    return NextResponse.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error('[Project Media API] Error linking media:', error);
    return NextResponse.json(
      {
        error: 'Failed to link media to project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
