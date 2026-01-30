/**
 * Media Gallery API - Single Item Operations
 *
 * GET /api/media/[id] - Get media item by ID
 * PATCH /api/media/[id] - Update media item
 * DELETE /api/media/[id] - Delete media item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediaItem, updateMediaItem, deleteMediaItem } from '@/lib/media/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mediaItem = await getMediaItem(id);

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: mediaItem,
    });
  } catch (error) {
    console.error('[Media API] Error fetching media item:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch media item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate file_type if provided
    if (body.file_type) {
      const validFileTypes = ['photo', 'video', 'document', 'image', 'video_link', 'audio'];
      if (!validFileTypes.includes(body.file_type)) {
        return NextResponse.json(
          { error: `Invalid file_type. Must be one of: ${validFileTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updatedItem = await updateMediaItem(id, body);

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error('[Media API] Error updating media item:', error);
    return NextResponse.json(
      {
        error: 'Failed to update media item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deleteMediaItem(id);

    return NextResponse.json({
      success: true,
      message: 'Media item deleted successfully',
    });
  } catch (error) {
    console.error('[Media API] Error deleting media item:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete media item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
