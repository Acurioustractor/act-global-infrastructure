'use client';

import { useState, useEffect } from 'react';
import MediaGallery from '@/components/media/MediaGallery';
import Image from 'next/image';
import { X, Check, Upload } from 'lucide-react';

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  title?: string;
  alt_text?: string;
  is_hero_image: boolean;
  project_slugs: string[];
}

interface HeroImagePickerProps {
  projectSlug: string;
  currentHeroUrl?: string;
  onSelect: (mediaItem: MediaItem) => void;
  onCancel: () => void;
}

export default function HeroImagePicker({
  projectSlug,
  currentHeroUrl,
  onSelect,
  onCancel,
}: HeroImagePickerProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = (item: MediaItem) => {
    setSelectedItem(item);
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;

    setSaving(true);
    try {
      // Update hero image via API
      const response = await fetch(`/api/projects/${projectSlug}/hero`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaItemId: selectedItem.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update hero image');
      }

      onSelect(selectedItem);
    } catch (error) {
      console.error('[HeroImagePicker] Error:', error);
      alert('Failed to update hero image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Hero Image</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a featured image for {projectSlug}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Current Hero Preview */}
        {currentHeroUrl && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Current Hero Image:</p>
            <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden">
              <Image
                src={currentHeroUrl}
                alt="Current hero image"
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Selected Preview */}
        {selectedItem && (
          <div className="p-6 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start gap-4">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={selectedItem.file_url}
                  alt={selectedItem.alt_text || selectedItem.title || 'Selected image'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">Selected Image:</p>
                <p className="text-base font-semibold text-blue-900">
                  {selectedItem.title || 'Untitled'}
                </p>
                {selectedItem.alt_text && (
                  <p className="text-sm text-blue-700 mt-1">{selectedItem.alt_text}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>
        )}

        {/* Media Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          <MediaGallery
            projectSlug={projectSlug}
            fileType="photo"
            limit={50}
            selectable={true}
            onSelect={handleSelect}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // TODO: See issue #6 in act-regenerative-studio: Open media upload modal
                alert('Media upload functionality coming soon!');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New</span>
            </button>

            <button
              onClick={handleConfirm}
              disabled={!selectedItem || saving}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Set as Hero Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
