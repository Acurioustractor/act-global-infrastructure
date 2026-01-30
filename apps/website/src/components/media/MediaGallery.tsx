'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search, Filter, X, Image as ImageIcon, Video, FileText } from 'lucide-react';

interface MediaItem {
  id: string;
  file_url: string;
  file_type: 'photo' | 'video' | 'document' | 'image' | 'video_link' | 'audio';
  title?: string;
  caption?: string;
  alt_text?: string;
  manual_tags: string[];
  impact_themes: string[];
  project_slugs: string[];
  is_hero_image: boolean;
  width?: number;
  height?: number;
  created_at: string;
}

interface MediaGalleryProps {
  projectSlug?: string;
  impactTheme?: string;
  fileType?: 'photo' | 'video' | 'document' | 'all';
  limit?: number;
  className?: string;
  onSelect?: (item: MediaItem) => void;
  selectable?: boolean;
}

export default function MediaGallery({
  projectSlug,
  impactTheme,
  fileType = 'all',
  limit = 20,
  className = '',
  onSelect,
  selectable = false,
}: MediaGalleryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(impactTheme || null);
  const [selectedType, setSelectedType] = useState<string>(fileType);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch media items
  useEffect(() => {
    async function fetchMedia() {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (projectSlug) params.set('projectSlug', projectSlug);
        if (fileType && fileType !== 'all') params.set('fileType', fileType);
        if (impactTheme) params.set('theme', impactTheme);
        params.set('limit', limit.toString());

        const response = await fetch(`/api/media?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          setItems(data.data);
          setFilteredItems(data.data);
        }
      } catch (error) {
        console.error('[MediaGallery] Error fetching media:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMedia();
  }, [projectSlug, impactTheme, fileType, limit]);

  // Apply filters
  useEffect(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.caption?.toLowerCase().includes(query) ||
          item.alt_text?.toLowerCase().includes(query) ||
          item.manual_tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Theme filter
    if (selectedTheme) {
      filtered = filtered.filter((item) => item.impact_themes.includes(selectedTheme));
    }

    // Type filter
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter((item) => item.file_type === selectedType);
    }

    setFilteredItems(filtered);
  }, [searchQuery, selectedTheme, selectedType, items]);

  // Extract unique themes
  const allThemes = Array.from(
    new Set(items.flatMap((item) => item.impact_themes))
  ).sort();

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'photo':
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
      case 'video_link':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`media-gallery ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`media-gallery space-y-6 ${className}`}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search media by title, caption, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {(selectedTheme || selectedType !== 'all') && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-[var(--color-primary)] text-white rounded-full">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'photo', 'video', 'document'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedType === type
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Impact Theme Filter */}
          {allThemes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impact Theme
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTheme(null)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !selectedTheme
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  All Themes
                </button>
                {allThemes.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedTheme === theme
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {theme.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(selectedTheme || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSelectedTheme(null);
                setSelectedType('all');
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="flex items-center gap-1 hover:text-gray-900"
          >
            Clear search
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No media items found</p>
          <p className="text-sm mt-2">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => selectable && onSelect && onSelect(item)}
              className={`group relative aspect-square rounded-lg overflow-hidden bg-gray-100 ${
                selectable ? 'cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)]' : ''
              }`}
            >
              {(item.file_type === 'photo' || item.file_type === 'image') && (
                <Image
                  src={item.file_url}
                  alt={item.alt_text || item.title || 'Media item'}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
              )}

              {(item.file_type === 'video' || item.file_type === 'video_link') && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <Video className="w-12 h-12 text-white opacity-75" />
                </div>
              )}

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    {getMediaIcon(item.file_type)}
                    <span className="text-xs uppercase tracking-wide">{item.file_type}</span>
                  </div>
                  {item.title && (
                    <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  )}
                  {item.impact_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.impact_themes.slice(0, 2).map((theme, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-white/20 rounded backdrop-blur-sm"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Badge */}
              {item.is_hero_image && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-primary)] text-white text-xs font-medium rounded">
                  Hero
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
