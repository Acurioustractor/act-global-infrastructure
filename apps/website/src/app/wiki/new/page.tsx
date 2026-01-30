'use client';

/**
 * ACT Living Wiki - New Page Editor
 *
 * Create new wiki pages with:
 * - Type selection (Principle, Method, Practice, Procedure, Guide, Template)
 * - Content editing (markdown)
 * - Tagging and project linking
 * - Preview mode
 * - Hierarchy management
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  CheckCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WikiPageForm {
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

export default function NewWikiPage() {
  const router = useRouter();
  // supabase imported from client

  const [formData, setFormData] = useState<WikiPageForm>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    page_type: 'guide',
    tags: [],
    projects: [],
    domains: ['all'],
    review_frequency_days: 90,
  });

  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-generate slug from title
  function updateTitle(title: string) {
    setFormData({
      ...formData,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    });
  }

  // Add tag
  function addTag() {
    if (tagInput && !formData.tags.includes(tagInput)) {
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
      tags: formData.tags.filter(t => t !== tag),
    });
  }

  // Toggle project
  function toggleProject(project: string) {
    if (formData.projects.includes(project)) {
      setFormData({
        ...formData,
        projects: formData.projects.filter(p => p !== project),
      });
    } else {
      setFormData({
        ...formData,
        projects: [...formData.projects, project],
      });
    }
  }

  // Toggle domain
  function toggleDomain(domain: string) {
    if (formData.domains.includes(domain)) {
      setFormData({
        ...formData,
        domains: formData.domains.filter(d => d !== domain),
      });
    } else {
      setFormData({
        ...formData,
        domains: [...formData.domains, domain],
      });
    }
  }

  // Save page
  async function savePage() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validation
      if (!formData.title || !formData.content) {
        throw new Error('Title and content are required');
      }

      // Auto-generate excerpt from content if not provided
      const excerpt = formData.excerpt || formData.content.substring(0, 200) + '...';

      // Insert page
      const { data: pageData, error: pageError } = await supabase
        .from('wiki_pages')
        .insert({
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          excerpt,
          page_type: formData.page_type,
          tags: formData.tags,
          projects: formData.projects,
          domains: formData.domains,
          parent_principle_id: formData.parent_principle_id || null,
          parent_method_id: formData.parent_method_id || null,
          parent_practice_id: formData.parent_practice_id || null,
          review_frequency_days: formData.review_frequency_days,
          status: 'active',
          last_reviewed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Create version record
      await supabase.from('wiki_page_versions').insert({
        page_id: pageData.id,
        version_number: 1,
        title: formData.title,
        content: formData.content,
        change_reason: 'Initial creation',
      });

      setSuccess(true);

      // Redirect to new page after 1 second
      setTimeout(() => {
        router.push(`/wiki/${formData.slug}`);
      }, 1000);
    } catch (err) {
      console.error('Error saving page:', err);
      setError(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setSaving(false);
    }
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
            href="/wiki"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wiki
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Create New Wiki Page</h1>

            <div className="flex gap-2">
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
                onClick={savePage}
                disabled={saving || !formData.title || !formData.content}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Publish'}
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
              Page saved successfully! Redirecting...
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
              {/* Title */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="e.g., How We Run Weekly Team Meetings"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-lg"
                />

                <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="how-we-run-weekly-team-meetings"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (Markdown) *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your content here in markdown..."
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Excerpt */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt (Optional)
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief summary (auto-generated if left empty)"
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
                  {formData.tags.map((tag) => (
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
                        checked={formData.projects.includes(project)}
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
                        checked={formData.domains.includes(domain)}
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
                  value={formData.review_frequency_days}
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
              <span className="text-4xl">{pageTypeIcons[formData.page_type]}</span>
              <div>
                <h1 className="text-4xl font-bold">{formData.title || 'Untitled Page'}</h1>
                <p className="text-gray-600 mt-1">{formData.page_type}</p>
              </div>
            </div>

            {formData.excerpt && (
              <p className="text-lg text-gray-700 mb-6 italic">{formData.excerpt}</p>
            )}

            <div className="prose prose-lg max-w-none">
              <ReactMarkdown>{formData.content || '*No content yet*'}</ReactMarkdown>
            </div>

            {formData.tags.length > 0 && (
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
