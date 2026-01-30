'use client';

/**
 * ACT Living Wiki - Edit Page
 *
 * Edit existing wiki pages with:
 * - Version tracking
 * - Change reason documentation
 * - Preview mode
 * - Rollback capability
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  FileText,
  Tag,
  Folder,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  page_type: 'principle' | 'method' | 'practice' | 'procedure' | 'guide' | 'template';
  tags: string[];
  projects: string[];
  domains: string[];
  parent_principle_id?: string;
  parent_method_id?: string;
  parent_practice_id?: string;
  review_frequency_days: number;
  version: number;
}

const ACT_PROJECTS = [
  'justicehub',
  'empathy-ledger',
  'act-farm',
  'the-harvest',
  'black-cockatoo-valley',
  'goods-on-country',
  'dev-hub'
];

const ACT_DOMAINS = [
  'all',
  'values',
  'operations',
  'technology',
  'agriculture',
  'justice',
  'storytelling',
  'tourism',
  'community',
  'conservation'
];

export default function EditWikiPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  // supabase imported from client

  const [page, setPage] = useState<WikiPage | null>(null);
  const [formData, setFormData] = useState<Partial<WikiPage>>({});
  const [changeReason, setChangeReason] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPage();
    }
  }, [slug]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const { data: pageData, error: pageError } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pageError) throw pageError;

      setPage(pageData);
      setFormData(pageData);
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }

  // Add tag
  function addTag() {
    if (tagInput && formData.tags && !formData.tags.includes(tagInput)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.toLowerCase()],
      });
      setTagInput('');
    }
  }

  // Remove tag
  function removeTag(tag: string) {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  }

  // Toggle project
  function toggleProject(project: string) {
    const projects = formData.projects || [];
    if (projects.includes(project)) {
      setFormData({
        ...formData,
        projects: projects.filter(p => p !== project),
      });
    } else {
      setFormData({
        ...formData,
        projects: [...projects, project],
      });
    }
  }

  // Toggle domain
  function toggleDomain(domain: string) {
    const domains = formData.domains || [];
    if (domains.includes(domain)) {
      setFormData({
        ...formData,
        domains: domains.filter(d => d !== domain),
      });
    } else {
      setFormData({
        ...formData,
        domains: [...domains, domain],
      });
    }
  }

  // Save changes
  async function saveChanges() {
    if (!page) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validation
      if (!formData.title || !formData.content) {
        throw new Error('Title and content are required');
      }

      if (!changeReason) {
        throw new Error('Please provide a reason for this change');
      }

      // Update page
      const { error: updateError } = await supabase
        .from('wiki_pages')
        .update({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          page_type: formData.page_type,
          tags: formData.tags,
          projects: formData.projects,
          domains: formData.domains,
          review_frequency_days: formData.review_frequency_days,
          last_reviewed_at: new Date().toISOString(),
          version: (page.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (updateError) throw updateError;

      // Create version record
      await supabase.from('wiki_page_versions').insert({
        page_id: page.id,
        version_number: (page.version || 1) + 1,
        title: formData.title,
        content: formData.content,
        change_reason: changeReason,
      });

      setSuccess(true);

      // Redirect to page view after 1 second
      setTimeout(() => {
        router.push(`/wiki/${slug}`);
      }, 1000);
    } catch (err) {
      console.error('Error saving changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/wiki"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Wiki
          </Link>
        </div>
      </div>
    );
  }

  const pageTypeIcons = {
    principle: '📚',
    method: '🛠️',
    practice: '⚙️',
    procedure: '📋',
    guide: '📖',
    template: '📄',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href={`/wiki/${slug}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Page
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Wiki Page</h1>
              <p className="text-gray-600 mt-1">Version {page?.version || 1}</p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/wiki/${slug}/history`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                History
              </Link>
              <button
                onClick={() => setPreview(!preview)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  preview
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preview ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {preview ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={saveChanges}
                disabled={saving || !formData.title || !formData.content || !changeReason}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Changes saved successfully! Redirecting...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!preview ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Change Reason */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-yellow-900 mb-2">
                  Change Reason (Required) *
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g., Updated process based on team feedback"
                  className="w-full px-4 py-3 border border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                />
                <p className="text-sm text-yellow-700 mt-2">
                  Documenting changes helps track knowledge evolution over time.
                </p>
              </div>

              {/* Title */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-lg"
                />
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (Markdown) *
                </label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Excerpt */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Page Type */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Page Type *
                </label>
                <div className="space-y-2">
                  {Object.entries(pageTypeIcons).map(([type, icon]) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, page_type: type as any })}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.page_type === type
                          ? 'border-green-600 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-2xl mr-3">{icon}</span>
                      <span className="font-medium capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Folder className="w-4 h-4 inline mr-1" />
                  Projects
                </label>
                <div className="space-y-2">
                  {ACT_PROJECTS.map((project) => (
                    <label
                      key={project}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.projects?.includes(project) || false}
                        onChange={() => toggleProject(project)}
                        className="w-4 h-4 text-green-600 focus:ring-green-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{project}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Domains */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Domains
                </label>
                <div className="space-y-2">
                  {ACT_DOMAINS.map((domain) => (
                    <label
                      key={domain}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.domains?.includes(domain) || false}
                        onChange={() => toggleDomain(domain)}
                        className="w-4 h-4 text-green-600 focus:ring-green-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{domain}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Review Frequency */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Review Every (days)
                </label>
                <input
                  type="number"
                  value={formData.review_frequency_days || 90}
                  onChange={(e) =>
                    setFormData({ ...formData, review_frequency_days: parseInt(e.target.value) })
                  }
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{pageTypeIcons[formData.page_type || 'guide']}</span>
              <div>
                <h1 className="text-4xl font-bold">{formData.title || 'Untitled Page'}</h1>
                <p className="text-gray-600 mt-1">{formData.page_type}</p>
              </div>
            </div>

            {formData.excerpt && (
              <p className="text-lg text-gray-700 mb-6 italic">{formData.excerpt}</p>
            )}

            <div className="prose prose-lg max-w-none">
              <ReactMarkdown>{formData.content || '*No content*'}</ReactMarkdown>
            </div>

            {formData.tags && formData.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
