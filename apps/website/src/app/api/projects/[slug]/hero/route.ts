/**
 * Project Hero Image API
 *
 * GET /api/projects/[slug]/hero - Get hero image for a project
 * PUT /api/projects/[slug]/hero - Set hero image for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHeroImage, createMediaLink, updateMediaLink } from '@/lib/media/client';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const linkType = searchParams.get('linkType') || 'project_page';

    const heroImage = await getHeroImage(linkType, slug);

    if (!heroImage) {
      return NextResponse.json({ error: 'No hero image found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: heroImage,
    });
  } catch (error) {
    console.error('[Hero Image API] Error fetching hero image:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch hero image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    if (!body.media_id) {
      return NextResponse.json({ error: 'Missing required field: media_id' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }
    const linkType = body.link_type || 'project_page';

    // First, unset any existing hero images for this project
    const { error: updateError } = await supabase
      .from('project_media_links')
      .update({ is_hero: false })
      .eq('link_type', linkType)
      .eq('link_id', slug)
      .eq('is_hero', true);

    if (updateError) {
      console.error('[Hero Image API] Error unsetting existing hero:', updateError);
    }

    // Check if this media is already linked to the project
    const { data: existingLinks } = await supabase
      .from('project_media_links')
      .select('*')
      .eq('media_id', body.media_id)
      .eq('link_type', linkType)
      .eq('link_id', slug);

    let link;

    if (existingLinks && existingLinks.length > 0) {
      // Update existing link
      link = await updateMediaLink(existingLinks[0].id, {
        is_hero: true,
        is_featured: true,
      });
    } else {
      // Create new link
      link = await createMediaLink({
        media_id: body.media_id,
        link_type: linkType,
        link_id: slug,
        display_order: 0,
        is_hero: true,
        is_featured: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: link,
      message: 'Hero image updated successfully',
    });
  } catch (error) {
    console.error('[Hero Image API] Error setting hero image:', error);
    return NextResponse.json(
      {
        error: 'Failed to set hero image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
