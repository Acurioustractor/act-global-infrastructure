/**
 * Hero Image Manager Component
 *
 * Allows admins to select and swap hero images for projects
 * Can be embedded in project edit pages or used standalone
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MediaPicker from './MediaPicker';

interface HeroImageManagerProps {
  projectSlug: string;
  linkType?: 'project_page' | 'blog_post' | 'gallery' | 'timeline_entry';
  onHeroChanged?: () => void;
}

export default function HeroImageManager({
  projectSlug,
  linkType = 'project_page',
  onHeroChanged,
}: HeroImageManagerProps) {
  const [currentHero, setCurrentHero] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current hero image
  useEffect(() => {
    async function fetchHeroImage() {
      try {
        const response = await fetch(
          `/api/projects/${projectSlug}/hero?linkType=${linkType}`
        );

        if (response.ok) {
          const data = await response.json();
          setCurrentHero(data.data);
        } else if (response.status === 404) {
          // No hero image set yet
          setCurrentHero(null);
        }
      } catch (err) {
        console.error('Error fetching hero image:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHeroImage();
  }, [projectSlug, linkType]);

  const handleSelectHero = async (media: any) => {
    setUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/projects/${projectSlug}/hero`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_id: media.id,
          link_type: linkType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update hero image');
      }

      setCurrentHero(media);
      setSuccess(true);
      setShowPicker(false);

      if (onHeroChanged) {
        onHeroChanged();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating hero image:', err);
      setError(err instanceof Error ? err.message : 'Failed to update hero image');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CAF50]"></div>
          <p className="ml-3 text-[#6B5A45]">Loading hero image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Hero Image Display */}
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          Hero Image
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl">
            Hero image updated successfully!
          </div>
        )}

        {currentHero ? (
          <div className="space-y-4">
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-[#E3D4BA]">
              <Image
                src={currentHero.file_url}
                alt={currentHero.alt_text || currentHero.title || 'Hero image'}
                fill
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
            <div className="space-y-2">
              {currentHero.title && (
                <p className="text-sm">
                  <strong className="text-[#6B5A45] uppercase tracking-[0.2em]">Title:</strong>
                  <span className="ml-2 text-[#2F3E2E]">{currentHero.title}</span>
                </p>
              )}
              {currentHero.credit && (
                <p className="text-sm">
                  <strong className="text-[#6B5A45] uppercase tracking-[0.2em]">Credit:</strong>
                  <span className="ml-2 text-[#2F3E2E]">{currentHero.credit}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="aspect-[21/9] rounded-2xl border-2 border-dashed border-[#E3D4BA] bg-[#F7F2E8] flex items-center justify-center">
            <p className="text-[#6B5A45] text-sm uppercase tracking-[0.3em]">
              No hero image set
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-[#45a049] transition-colors"
          >
            {showPicker ? 'Hide Picker' : currentHero ? 'Change Hero Image' : 'Select Hero Image'}
          </button>

          {currentHero && (
            <a
              href={currentHero.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#E3D4BA] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E] hover:bg-white/50 transition-colors"
            >
              View Full Size
            </a>
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      {showPicker && (
        <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
          <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
            Select Hero Image
          </h3>
          <p className="text-sm text-[#6B5A45] mb-4">
            Choose an image from your media library to set as the hero image for {projectSlug}.
          </p>

          {updating && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl">
              Updating hero image...
            </div>
          )}

          <MediaPicker
            onSelect={handleSelectHero}
            selectedId={currentHero?.id}
            fileType="image"
            projectSlug={projectSlug}
          />
        </div>
      )}

      {/* Usage Instructions */}
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h4 className="text-sm font-semibold text-[#2F3E2E] uppercase tracking-[0.2em] mb-2">
          How It Works
        </h4>
        <ul className="space-y-2 text-sm text-[#4D3F33]">
          <li className="flex items-start">
            <span className="text-[#4CAF50] mr-2">→</span>
            The hero image appears at the top of the project page
          </li>
          <li className="flex items-start">
            <span className="text-[#4CAF50] mr-2">→</span>
            You can select any image from the media library
          </li>
          <li className="flex items-start">
            <span className="text-[#4CAF50] mr-2">→</span>
            Changes take effect immediately
          </li>
          <li className="flex items-start">
            <span className="text-[#4CAF50] mr-2">→</span>
            Recommended aspect ratio: 21:9 (wide format)
          </li>
        </ul>
      </div>
    </div>
  );
}
