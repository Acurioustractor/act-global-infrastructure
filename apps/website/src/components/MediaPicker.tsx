/**
 * MediaPicker Component
 *
 * Reusable component for selecting media from the gallery
 * Supports filtering, search, and preview
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: string;
  title?: string;
  description?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  manual_tags: string[];
  impact_themes: string[];
  project_slugs: string[];
  is_hero_image: boolean;
}

interface MediaPickerProps {
  onSelect: (media: MediaItem) => void;
  selectedId?: string;
  fileType?: 'photo' | 'video' | 'document' | 'image' | 'video_link' | 'audio';
  projectSlug?: string;
  multiSelect?: boolean;
  onMultiSelect?: (media: MediaItem[]) => void;
}

export default function MediaPicker({
  onSelect,
  selectedId,
  fileType,
  projectSlug,
  multiSelect = false,
  onMultiSelect,
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());

  // Fetch media items
  useEffect(() => {
    async function fetchMedia() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (fileType) params.set('fileType', fileType);
        if (projectSlug) params.set('projectSlug', projectSlug);
        if (searchQuery) params.set('search', searchQuery);
        if (selectedTag) params.set('tag', selectedTag);
        params.set('limit', '50');

        const response = await fetch(`/api/media?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch media');
        }

        const data = await response.json();
        setMedia(data.data || []);
      } catch (err) {
        console.error('Error fetching media:', err);
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    }

    fetchMedia();
  }, [fileType, projectSlug, searchQuery, selectedTag]);

  // Get all unique tags
  const allTags = Array.from(
    new Set(media.flatMap(m => [...m.manual_tags, ...m.impact_themes]))
  ).sort();

  const handleSelect = (item: MediaItem) => {
    if (multiSelect) {
      const newSelected = new Set(selectedMedia);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedMedia(newSelected);
      if (onMultiSelect) {
        const selectedItems = media.filter(m => newSelected.has(m.id));
        onMultiSelect(selectedItems);
      }
    } else {
      onSelect(item);
    }
  };

  return (
    <div className="media-picker">
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                !selectedTag
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTag === tag
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading media...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Media Grid */}
      {!loading && !error && (
        <>
          {media.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No media found. Try adjusting your filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => {
                const isSelected = multiSelect
                  ? selectedMedia.has(item.id)
                  : selectedId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="aspect-video bg-gray-100 relative">
                      {item.file_type === 'photo' || item.file_type === 'image' ? (
                        <Image
                          src={item.thumbnail_url || item.file_url}
                          alt={item.alt_text || item.title || 'Media item'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : item.file_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Hero Badge */}
                      {item.is_hero_image && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded font-semibold">
                          HERO
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="bg-blue-500 rounded-full p-2">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Media Info */}
                    <div className="p-3 text-left">
                      <p className="font-medium text-sm truncate">
                        {item.title || 'Untitled'}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {item.description}
                        </p>
                      )}
                      {item.manual_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.manual_tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.manual_tags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{item.manual_tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selection Summary */}
          {multiSelect && selectedMedia.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                {selectedMedia.size} item{selectedMedia.size !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
