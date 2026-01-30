/**
 * Media Gallery Client
 *
 * Provides functions for managing media items in Supabase
 */

import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: 'photo' | 'video' | 'document' | 'image' | 'video_link' | 'audio';
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  blurhash?: string;
  title?: string;
  description?: string;
  alt_text?: string;
  credit?: string;
  caption?: string;
  manual_tags: string[];
  impact_themes: string[];
  project_slugs: string[];
  is_hero_image: boolean;
  source?: string;
  source_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface MediaLink {
  id: string;
  media_id: string;
  link_type: 'project_page' | 'blog_post' | 'gallery' | 'timeline_entry' | 'hero';
  link_id: string;
  display_order: number;
  caption?: string;
  alt_text?: string;
  is_hero: boolean;
  is_featured: boolean;
  created_at: string;
}

export interface VideoEmbed {
  id: string;
  platform: 'youtube' | 'vimeo' | 'loom' | 'direct';
  video_id: string;
  embed_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  duration_seconds?: number;
  link_type?: 'project_page' | 'blog_post' | 'gallery' | 'timeline_entry' | 'standalone';
  link_id?: string;
  display_order: number;
  is_featured: boolean;
  autoplay: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all media items with optional filtering
 */
export async function getMediaItems(filters?: {
  fileType?: string;
  projectSlug?: string;
  tag?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<MediaItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  let query = supabase.from('media_items').select('*');

  if (filters?.fileType) {
    query = query.eq('file_type', filters.fileType);
  }

  if (filters?.projectSlug) {
    query = query.contains('project_slugs', [filters.projectSlug]);
  }

  if (filters?.tag) {
    query = query.or(`manual_tags.cs.{${filters.tag}},impact_themes.cs.{${filters.tag}}`);
  }

  if (filters?.searchQuery) {
    query = query.textSearch('title,description,caption', filters.searchQuery);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Media Client] Error fetching media items:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single media item by ID
 */
export async function getMediaItem(id: string): Promise<MediaItem | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Media Client] Error fetching media item:', error);
    return null;
  }

  return data;
}

/**
 * Create a new media item
 */
export async function createMediaItem(
  item: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>
): Promise<MediaItem> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase
    .from('media_items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('[Media Client] Error creating media item:', error);
    throw error;
  }

  return data;
}

/**
 * Update a media item
 */
export async function updateMediaItem(
  id: string,
  updates: Partial<Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<MediaItem> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Media Client] Error updating media item:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { error } = await supabase.from('media_items').delete().eq('id', id);

  if (error) {
    console.error('[Media Client] Error deleting media item:', error);
    throw error;
  }
}

/**
 * Get media for a specific project/entity
 */
export async function getProjectMedia(linkType: string, linkId: string): Promise<MediaItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase.rpc('get_project_media', {
    p_link_type: linkType,
    p_link_id: linkId,
  });

  if (error) {
    console.error('[Media Client] Error fetching project media:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get hero image for a specific project/entity
 */
export async function getHeroImage(linkType: string, linkId: string): Promise<MediaItem | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase.rpc('get_hero_image', {
    p_link_type: linkType,
    p_link_id: linkId,
  });

  if (error) {
    console.error('[Media Client] Error fetching hero image:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Create a media link
 */
export async function createMediaLink(
  link: Omit<MediaLink, 'id' | 'created_at'>
): Promise<MediaLink> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase
    .from('project_media_links')
    .insert(link)
    .select()
    .single();

  if (error) {
    console.error('[Media Client] Error creating media link:', error);
    throw error;
  }

  return data;
}

/**
 * Update a media link
 */
export async function updateMediaLink(
  id: string,
  updates: Partial<Omit<MediaLink, 'id' | 'created_at'>>
): Promise<MediaLink> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase
    .from('project_media_links')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Media Client] Error updating media link:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a media link
 */
export async function deleteMediaLink(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { error } = await supabase.from('project_media_links').delete().eq('id', id);

  if (error) {
    console.error('[Media Client] Error deleting media link:', error);
    throw error;
  }
}

/**
 * Search media using full-text search and filters
 */
export async function searchMedia(options: {
  searchQuery?: string;
  fileType?: string;
  projectSlug?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<MediaItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase client not configured");

  const { data, error } = await supabase.rpc('search_media', {
    p_search_query: options.searchQuery || null,
    p_file_type: options.fileType || null,
    p_project_slug: options.projectSlug || null,
    p_tag: options.tag || null,
    p_limit: options.limit || 50,
    p_offset: options.offset || 0,
  });

  if (error) {
    console.error('[Media Client] Error searching media:', error);
    throw error;
  }

  return data || [];
}
