/**
 * Media Gallery API - List and Create
 *
 * GET /api/media - List/search media items
 * POST /api/media - Create new media item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediaItems, createMediaItem, searchMedia } from '@/lib/media/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const fileType = searchParams.get('fileType');
    const projectSlug = searchParams.get('projectSlug');
    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use search function if search query provided
    if (search) {
      const results = await searchMedia({
        searchQuery: search,
        fileType: fileType || undefined,
        projectSlug: projectSlug || undefined,
        tag: tag || undefined,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        data: results,
        metadata: {
          count: results.length,
          limit,
          offset,
        },
      });
    }

    // Otherwise use filter-based query
    const results = await getMediaItems({
      fileType: fileType || undefined,
      projectSlug: projectSlug || undefined,
      tag: tag || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        count: results.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[Media API] Error fetching media:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch media items',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.file_url || !body.file_type) {
      return NextResponse.json(
        { error: 'Missing required fields: file_url, file_type' },
        { status: 400 }
      );
    }

    // Validate file_type
    const validFileTypes = ['photo', 'video', 'document', 'image', 'video_link', 'audio'];
    if (!validFileTypes.includes(body.file_type)) {
      return NextResponse.json(
        { error: `Invalid file_type. Must be one of: ${validFileTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create media item
    const mediaItem = await createMediaItem({
      file_url: body.file_url,
      thumbnail_url: body.thumbnail_url,
      file_type: body.file_type,
      mime_type: body.mime_type,
      file_size_bytes: body.file_size_bytes,
      width: body.width,
      height: body.height,
      duration_seconds: body.duration_seconds,
      blurhash: body.blurhash,
      title: body.title,
      description: body.description,
      alt_text: body.alt_text,
      credit: body.credit,
      caption: body.caption,
      manual_tags: body.manual_tags || [],
      impact_themes: body.impact_themes || [],
      project_slugs: body.project_slugs || [],
      is_hero_image: body.is_hero_image || false,
      source: body.source,
      source_id: body.source_id,
      created_by: body.created_by,
    });

    return NextResponse.json({
      success: true,
      data: mediaItem,
    });
  } catch (error) {
    console.error('[Media API] Error creating media item:', error);
    return NextResponse.json(
      {
        error: 'Failed to create media item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
