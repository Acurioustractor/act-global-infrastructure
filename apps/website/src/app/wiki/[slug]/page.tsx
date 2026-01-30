'use client';

/**
 * ACT Living Wiki - Page Viewer
 *
 * View individual wiki pages with:
 * - Full content rendering (markdown)
 * - Related pages
 * - Version history
 * - Edit capability
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  History,
  Eye,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Share2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  page_type: string;
  tags: string[];
  projects: string[];
  domains: string[];
  status: string;
  last_reviewed_at: string;
  next_review_due: string;
  view_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

interface RelatedPage {
  id: string;
  title: string;
  slug: string;
  page_type: string;
}

export default function WikiPageViewer() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [page, setPage] = useState<WikiPage | null>(null);
  const [relatedPages, setRelatedPages] = useState<RelatedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPage();
    }
  }, [slug]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      // Load page
      const { data: pageData, error: pageError } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (pageError) {
        if (pageError.code === 'PGRST116') {
          setError('Page not found');
        } else {
          throw pageError;
        }
        return;
      }

      setPage(pageData);

      // Increment view count
      await supabase
        .from('wiki_pages')
        .update({
          view_count: (pageData.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', pageData.id);

      // Load related pages (same tags or projects)
      if (pageData.tags && pageData.tags.length > 0) {
        const { data: related } = await supabase
          .from('wiki_pages')
          .select('id, title, slug, page_type')
          .eq('status', 'active')
          .neq('id', pageData.id)
          .overlaps('tags', pageData.tags)
          .limit(5);

        if (related) {
          setRelatedPages(related);
        }
      }
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
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

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{error || 'Page Not Found'}</h1>
          <p className="text-gray-600 mb-6">
            The wiki page you're looking for doesn't exist or has been archived.
          </p>
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

  const isReviewDue = page.next_review_due && new Date(page.next_review_due) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/wiki"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wiki
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{pageTypeIcons[page.page_type as keyof typeof pageTypeIcons]}</span>
                <div>
                  <h1 className="text-4xl font-bold">{page.title}</h1>
                  <p className="text-gray-600 mt-1">{page.page_type}</p>
                </div>
              </div>

              {page.excerpt && (
                <p className="text-lg text-gray-700 mt-4">{page.excerpt}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/wiki/${slug}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {page.view_count || 0} views
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated {new Date(page.updated_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <History className="w-4 h-4" />
              Version {page.version}
            </div>
            {isReviewDue && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                Review Due
              </div>
            )}
          </div>

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {page.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/wiki?q=${tag}`}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Projects */}
          {page.projects && page.projects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="text-gray-500">Projects:</span>
              {page.projects.map((project) => (
                <Link
                  key={project}
                  href={`/wiki?project=${project}`}
                  className="text-green-600 hover:underline"
                >
                  {project}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <article className="bg-white rounded-lg border-2 border-gray-200 p-8 prose prose-lg max-w-none">
              <ReactMarkdown>{page.content}</ReactMarkdown>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Review Status */}
            <div className={`p-4 rounded-lg border-2 mb-6 ${
              isReviewDue
                ? 'bg-orange-50 border-orange-300'
                : 'bg-green-50 border-green-300'
            }`}>
              {isReviewDue ? (
                <>
                  <div className="flex items-center gap-2 text-orange-800 font-medium mb-2">
                    <AlertCircle className="w-5 h-5" />
                    Review Due
                  </div>
                  <p className="text-sm text-orange-700">
                    This page needs review. Last reviewed{' '}
                    {new Date(page.last_reviewed_at).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircle className="w-5 h-5" />
                    Up to Date
                  </div>
                  <p className="text-sm text-green-700">
                    Last reviewed {new Date(page.last_reviewed_at).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>

            {/* Related Pages */}
            {relatedPages.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h3 className="font-bold text-lg mb-4">Related Pages</h3>
                <div className="space-y-3">
                  {relatedPages.map((related) => (
                    <Link
                      key={related.id}
                      href={`/wiki/${related.slug}`}
                      className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{pageTypeIcons[related.page_type as keyof typeof pageTypeIcons]}</span>
                        <span className="font-medium text-sm">{related.title}</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-7">{related.page_type}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-lg border-2 border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/wiki/${slug}/edit`)}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit this page
                </button>
                <button
                  onClick={() => router.push(`/wiki/${slug}/history`)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  View history
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
