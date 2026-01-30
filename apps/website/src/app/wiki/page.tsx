'use client';

/**
 * ACT Living Wiki - Homepage
 *
 * A self-updating knowledge base that learns from your daily work.
 * Scans Notion, Gmail, Calendar, GHL, WhatsApp to capture "how ACT works"
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Search, BookOpen, Zap, Users, FileText, Settings, TrendingUp } from 'lucide-react';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  page_type: 'principle' | 'method' | 'practice' | 'procedure' | 'guide' | 'template';
  tags: string[];
  projects: string[];
  view_count: number;
  last_reviewed_at: string;
}

interface WikiStats {
  total_pages: number;
  by_type: Record<string, number>;
  needs_review: number;
  recent_updates: number;
}

export default function WikiHomepage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<WikiPage[]>([]);
  const [stats, setStats] = useState<WikiStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load pages and stats
  useEffect(() => {
    loadWiki();
  }, []);

  // Filter pages when search/filters change
  useEffect(() => {
    filterPages();
  }, [searchQuery, selectedType, selectedProject, pages]);

  async function loadWiki() {
    setLoading(true);

    try {
      // Load all active pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('status', 'active')
        .order('view_count', { ascending: false });

      if (pagesError) throw pagesError;

      setPages(pagesData || []);

      // Calculate stats
      if (pagesData) {
        const byType = pagesData.reduce((acc, page) => {
          acc[page.page_type] = (acc[page.page_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const needsReview = pagesData.filter(p =>
          p.next_review_due && new Date(p.next_review_due) < new Date()
        ).length;

        const recentUpdates = pagesData.filter(p => {
          const updated = new Date(p.updated_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return updated > weekAgo;
        }).length;

        setStats({
          total_pages: pagesData.length,
          by_type: byType,
          needs_review: needsReview,
          recent_updates: recentUpdates,
        });
      }
    } catch (error) {
      console.error('Error loading wiki:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPages() {
    let filtered = [...pages];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.page_type === selectedType);
    }

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => p.projects.includes(selectedProject));
    }

    // Search in title, excerpt, tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.excerpt?.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredPages(filtered);
  }

  const pageTypeIcons = {
    principle: '📚',
    method: '🛠️',
    practice: '⚙️',
    procedure: '📋',
    guide: '📖',
    template: '📄',
  };

  const pageTypeColors = {
    principle: 'bg-purple-100 text-purple-800 border-purple-300',
    method: 'bg-blue-100 text-blue-800 border-blue-300',
    practice: 'bg-green-100 text-green-800 border-green-300',
    procedure: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    guide: 'bg-orange-100 text-orange-800 border-orange-300',
    template: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10" />
            <h1 className="text-4xl font-bold">ACT Living Wiki</h1>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              Beta
            </span>
          </div>
          <p className="text-xl text-white/90 max-w-3xl">
            A self-updating knowledge base that learns from your daily work.
            Captures how ACT works by scanning Notion, Gmail, Calendar, and more.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<FileText className="w-5 h-5" />}
                label="Total Pages"
                value={stats.total_pages}
                color="text-blue-600"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Recent Updates"
                value={stats.recent_updates}
                color="text-green-600"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Principles"
                value={stats.by_type.principle || 0}
                color="text-purple-600"
              />
              <StatCard
                icon={<Settings className="w-5 h-5" />}
                label="Needs Review"
                value={stats.needs_review}
                color={stats.needs_review > 0 ? "text-orange-600" : "text-gray-400"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 sticky top-4">
              <h3 className="font-bold text-lg mb-4">Filters</h3>

              {/* Page Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Page Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Types</option>
                  <option value="principle">📚 Principles</option>
                  <option value="method">🛠️ Methods</option>
                  <option value="practice">⚙️ Practices</option>
                  <option value="procedure">📋 Procedures</option>
                  <option value="guide">📖 Guides</option>
                  <option value="template">📄 Templates</option>
                </select>
              </div>

              {/* Project Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Projects</option>
                  <option value="justicehub">JusticeHub</option>
                  <option value="empathy-ledger">Empathy Ledger</option>
                  <option value="act-farm">ACT Farm</option>
                  <option value="the-harvest">The Harvest</option>
                  <option value="black-cockatoo-valley">Black Cockatoo Valley</option>
                  <option value="goods-on-country">Goods on Country</option>
                </select>
              </div>

              {/* Quick Links */}
              <div className="pt-6 border-t">
                <h4 className="font-bold text-sm mb-3">Quick Links</h4>
                <div className="space-y-2 text-sm">
                  <Link
                    href="/wiki/new"
                    className="flex items-center gap-2 text-green-600 hover:underline"
                  >
                    <Zap className="w-4 h-4" />
                    Add New Page
                  </Link>
                  <Link
                    href="/admin/knowledge-review"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Settings className="w-4 h-4" />
                    Review Queue
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Search & Pages */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wiki pages..."
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              {loading ? (
                'Loading...'
              ) : (
                `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''} found`
              )}
            </div>

            {/* Page List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600">Loading wiki pages...</p>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No pages found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || selectedType !== 'all' || selectedProject !== 'all'
                    ? 'Try adjusting your filters or search query'
                    : 'Start building your wiki by adding your first page'}
                </p>
                <Link
                  href="/wiki/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Zap className="w-5 h-5" />
                  Add First Page
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPages.map((page) => (
                  <WikiPageCard key={page.id} page={page} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>
  );
}

// Wiki Page Card Component
function WikiPageCard({ page }: { page: WikiPage }) {
  const pageTypeIcons = {
    principle: '📚',
    method: '🛠️',
    practice: '⚙️',
    procedure: '📋',
    guide: '📖',
    template: '📄',
  };

  const pageTypeColors = {
    principle: 'bg-purple-100 text-purple-800 border-purple-300',
    method: 'bg-blue-100 text-blue-800 border-blue-300',
    practice: 'bg-green-100 text-green-800 border-green-300',
    procedure: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    guide: 'bg-orange-100 text-orange-800 border-orange-300',
    template: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <Link href={`/wiki/${page.slug}`}>
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pageTypeIcons[page.page_type]}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{page.title}</h3>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border mt-1 ${pageTypeColors[page.page_type]}`}>
                {page.page_type}
              </span>
            </div>
          </div>
          {page.view_count > 0 && (
            <div className="text-sm text-gray-500">
              {page.view_count} views
            </div>
          )}
        </div>

        {page.excerpt && (
          <p className="text-gray-600 mb-3 line-clamp-2">{page.excerpt}</p>
        )}

        {/* Tags */}
        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {page.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Projects */}
        {page.projects && page.projects.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {page.projects.map((project) => (
              <span key={project} className="italic">
                {project}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
