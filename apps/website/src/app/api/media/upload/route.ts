/**
 * Media Upload API
 *
 * POST /api/media/upload - Upload file to Supabase Storage and create media item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createMediaItem } from '@/lib/media/client';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const alt_text = formData.get('alt_text') as string | null;
    const credit = formData.get('credit') as string | null;
    const manual_tags = formData.get('manual_tags') as string | null;
    const impact_themes = formData.get('impact_themes') as string | null;
    const project_slugs = formData.get('project_slugs') as string | null;
    const is_hero_image = formData.get('is_hero_image') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const fileCategory = Object.entries(ALLOWED_TYPES).find(([_, types]) =>
      types.includes(file.type)
    );

    if (!fileCategory) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    const [category] = fileCategory;

    // Create unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
    const storagePath = `media/${category}/${fileName}`;

    // Upload to Supabase Storage
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload API] Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(storagePath);

    // Get image dimensions if it's an image
    let width: number | undefined;
    let height: number | undefined;

    if (category === 'image') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Simple dimension extraction (you might want to use a proper library like 'sharp')
        // This is a placeholder - implement proper image processing
        width = undefined;
        height = undefined;
      } catch (err) {
        console.warn('[Upload API] Could not extract image dimensions:', err);
      }
    }

    // Parse tags
    const parsedManualTags = manual_tags ? JSON.parse(manual_tags) : [];
    const parsedImpactThemes = impact_themes ? JSON.parse(impact_themes) : [];
    const parsedProjectSlugs = project_slugs ? JSON.parse(project_slugs) : [];

    // Create media item in database
    const mediaItem = await createMediaItem({
      file_url: publicUrl,
      file_type: category === 'image' ? 'photo' : category as 'photo' | 'video' | 'document' | 'video_link' | 'audio',
      mime_type: file.type,
      file_size_bytes: file.size,
      width,
      height,
      title: title || file.name,
      description: description || undefined,
      alt_text: alt_text || undefined,
      credit: credit || undefined,
      manual_tags: parsedManualTags,
      impact_themes: parsedImpactThemes,
      project_slugs: parsedProjectSlugs,
      is_hero_image,
      source: 'upload',
    });

    return NextResponse.json({
      success: true,
      data: mediaItem,
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
