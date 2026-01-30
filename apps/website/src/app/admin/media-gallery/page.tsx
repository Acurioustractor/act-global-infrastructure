/**
 * Admin Media Gallery (New)
 *
 * Comprehensive media management interface using the media_items schema
 * with tagging, project associations, and hero image management
 */

'use client';

import { useState } from 'react';
import MediaPicker from '@/components/MediaPicker';

export default function MediaGalleryPage() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData();

    // Add file
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput?.files?.[0]) {
      formData.append('file', fileInput.files[0]);
    }

    // Add other fields
    const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement;
    if (titleInput?.value) formData.append('title', titleInput.value);

    const descInput = form.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    if (descInput?.value) formData.append('description', descInput.value);

    const altInput = form.querySelector('input[name="alt_text"]') as HTMLInputElement;
    if (altInput?.value) formData.append('alt_text', altInput.value);

    const creditInput = form.querySelector('input[name="credit"]') as HTMLInputElement;
    if (creditInput?.value) formData.append('credit', creditInput.value);

    // Process tags
    const tagsInput = form.querySelector('input[name="manual_tags"]') as HTMLInputElement;
    if (tagsInput?.value) {
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
      formData.append('manual_tags', JSON.stringify(tags));
    }

    const themesInput = form.querySelector('input[name="impact_themes"]') as HTMLInputElement;
    if (themesInput?.value) {
      const themes = themesInput.value.split(',').map(t => t.trim()).filter(t => t);
      formData.append('impact_themes', JSON.stringify(themes));
    }

    const slugsInput = form.querySelector('input[name="project_slugs"]') as HTMLInputElement;
    if (slugsInput?.value) {
      const slugs = slugsInput.value.split(',').map(t => t.trim()).filter(t => t);
      formData.append('project_slugs', JSON.stringify(slugs));
    }

    const heroCheckbox = form.querySelector('input[name="is_hero_image"]') as HTMLInputElement;
    if (heroCheckbox?.checked) formData.append('is_hero_image', 'true');

    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadSuccess(true);
      setShowUploadForm(false);
      form.reset();

      // Refresh the media picker
      window.location.reload();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMediaSelect = (media: any) => {
    setSelectedMedia(media);
  };

  return (
    <div className="min-h-screen bg-[#F7F2E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            Media Gallery
          </h1>
          <p className="mt-2 text-[#4D3F33]">
            Manage photos, videos, and documents for all ACT projects with smart tagging and organization
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-[#45a049] transition-colors"
          >
            {showUploadForm ? 'Cancel Upload' : 'Upload Media'}
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-8 rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
              Upload New Media
            </h2>

            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl">
                Media uploaded successfully!
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  File *
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                />
                <p className="mt-1 text-sm text-[#6B5A45]">
                  Supported: Images, Videos, Audio, PDF, DOC (Max 50MB)
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="Enter a descriptive title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="Describe this media item"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Alt Text (for accessibility)
                </label>
                <input
                  type="text"
                  name="alt_text"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="Describe the image for screen readers"
                />
              </div>

              {/* Credit */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Credit (Photographer/Creator)
                </label>
                <input
                  type="text"
                  name="credit"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="Photo by..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="manual_tags"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="farming, community, workshop"
                />
              </div>

              {/* Impact Themes */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Impact Themes (comma-separated)
                </label>
                <input
                  type="text"
                  name="impact_themes"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="environmental, social, economic"
                />
              </div>

              {/* Project Slugs */}
              <div>
                <label className="block text-sm font-medium text-[#2F3E2E] mb-2">
                  Project Associations (comma-separated slugs)
                </label>
                <input
                  type="text"
                  name="project_slugs"
                  className="w-full px-3 py-2 border border-[#E3D4BA] rounded-lg bg-white focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  placeholder="justicehub, the-harvest, empathy-ledger"
                />
              </div>

              {/* Hero Image */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_hero_image"
                  id="is_hero_image"
                  className="h-4 w-4 text-[#4CAF50] focus:ring-[#4CAF50] border-[#E3D4BA] rounded"
                />
                <label htmlFor="is_hero_image" className="ml-2 block text-sm text-[#2F3E2E]">
                  Mark as hero image
                </label>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-[#45a049] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="rounded-full border border-[#E3D4BA] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E] hover:bg-white/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Media Browser */}
        <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
            Media Library
          </h2>
          <MediaPicker
            onSelect={handleMediaSelect}
            selectedId={selectedMedia?.id}
          />
        </div>

        {/* Selected Media Details */}
        {selectedMedia && (
          <div className="mt-6 rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
              Media Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedMedia.file_url}
                  alt={selectedMedia.alt_text || selectedMedia.title}
                  className="w-full rounded-2xl border border-[#E3D4BA]"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">Title:</strong>
                  <p className="text-[#2F3E2E]">{selectedMedia.title || 'Untitled'}</p>
                </div>
                {selectedMedia.description && (
                  <div>
                    <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">Description:</strong>
                    <p className="text-[#2F3E2E]">{selectedMedia.description}</p>
                  </div>
                )}
                {selectedMedia.credit && (
                  <div>
                    <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">Credit:</strong>
                    <p className="text-[#2F3E2E]">{selectedMedia.credit}</p>
                  </div>
                )}
                {selectedMedia.manual_tags?.length > 0 && (
                  <div>
                    <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">Tags:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedMedia.manual_tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full border border-[#E3D4BA] text-sm text-[#2F3E2E]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMedia.project_slugs?.length > 0 && (
                  <div>
                    <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">Projects:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedMedia.project_slugs.map((slug: string) => (
                        <span
                          key={slug}
                          className="px-3 py-1 rounded-full bg-[#4CAF50]/10 text-sm text-[#2F3E2E] border border-[#4CAF50]/20"
                        >
                          {slug}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <strong className="text-sm text-[#6B5A45] uppercase tracking-[0.2em]">File URL:</strong>
                  <a
                    href={selectedMedia.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4CAF50] hover:underline text-sm break-all block mt-1"
                  >
                    {selectedMedia.file_url}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
