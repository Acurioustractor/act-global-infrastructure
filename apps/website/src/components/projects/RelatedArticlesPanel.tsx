'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface BlogArticle {
  title: string;
  slug: string;
  excerpt: string;
  url: string;
  featuredImage?: string;
  author?: string;
  publishedDate?: string;
  tags?: string[];
}

interface RelatedArticlesPanelProps {
  projectSlug: string;
  className?: string;
  limit?: number;
  variant?: 'full' | 'compact';
}

export default function RelatedArticlesPanel({
  projectSlug,
  className = '',
  limit = 6,
  variant = 'full',
}: RelatedArticlesPanelProps) {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectSlug}/articles`);

        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }

        const data = await response.json();

        if (data.success && data.articles) {
          setArticles(data.articles.slice(0, limit));
        }
      } catch (err) {
        console.error('[RelatedArticlesPanel] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load articles');
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, [projectSlug, limit]);

  if (loading) {
    return (
      <div className={`related-articles-panel ${className}`}>
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`related-articles-panel ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-sm">Unable to load related articles</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null; // Don't render if no articles
  }

  if (variant === 'compact') {
    return (
      <div className={`related-articles-panel ${className}`}>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Related Articles</h3>
        <div className="space-y-4">
          {articles.map((article) => (
            <a
              key={article.slug}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group hover:bg-gray-50 p-4 rounded-lg transition-colors"
            >
              <h4 className="font-medium text-gray-900 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                {article.title}
              </h4>
              {article.excerpt && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
              )}
              {article.publishedDate && (
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(article.publishedDate).toLocaleDateString('en-AU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`related-articles-panel ${className}`}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Related Articles</h2>
        <p className="text-gray-600">
          Explore stories, insights, and updates from this project
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <article
            key={article.slug}
            className="group flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {article.featuredImage && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100"
              >
                <Image
                  src={article.featuredImage}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </a>
            )}

            <div className="flex-1 flex flex-col p-6">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 mb-3">
                  {article.title}
                </h3>

                {article.excerpt && (
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                    {article.excerpt}
                  </p>
                )}
              </a>

              <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
                {article.author && <span>{article.author}</span>}
                {article.publishedDate && (
                  <time dateTime={article.publishedDate}>
                    {new Date(article.publishedDate).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                )}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {article.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {articles.length >= limit && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Showing {articles.length} of many articles
          </p>
        </div>
      )}
    </div>
  );
}
