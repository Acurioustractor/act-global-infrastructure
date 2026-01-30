'use client';

/**
 * Enhanced Queue Viewer - Beautiful, Useful, Engaging
 * Review and approve knowledge from Notion with rich previews
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Sparkles,
  TrendingUp,
  BookOpen,
  Zap,
  ChevronRight,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface QueueItem {
  id: string;
  source_type: string;
  raw_title: string;
  source_url: string;
  raw_content: string;
  suggested_type?: string;
  suggested_tags?: string[];
  confidence_score?: number;
  status: string;
  created_at: string;
  source_metadata?: any;
}

const TYPE_ICONS = {
  principle: '📚',
  method: '🛠️',
  practice: '⚙️',
  procedure: '📋',
  guide: '📖',
  template: '📄',
};

const TYPE_COLORS = {
  principle: 'bg-purple-100 text-purple-700 border-purple-300',
  method: 'bg-blue-100 text-blue-700 border-blue-300',
  practice: 'bg-green-100 text-green-700 border-green-300',
  procedure: 'bg-orange-100 text-orange-700 border-orange-300',
  guide: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  template: 'bg-pink-100 text-pink-700 border-pink-300',
};

export default function EnhancedQueueViewer() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('knowledge_extraction_queue')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(100);

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveItem(item: QueueItem) {
    setProcessing(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const slug = item.raw_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Extract first paragraph as excerpt
      const excerpt = item.raw_content
        .split('\n')
        .find(line => line.trim().length > 50)
        ?.substring(0, 200) || item.raw_content.substring(0, 200);

      await supabase.from('wiki_pages').insert({
        title: item.raw_title,
        slug,
        content: item.raw_content,
        excerpt,
        page_type: item.suggested_type || 'guide',
        tags: item.suggested_tags || [],
        source_types: [item.source_type],
        source_urls: [item.source_url],
        status: 'active',
      });

      await supabase
        .from('knowledge_extraction_queue')
        .update({ status: 'approved' })
        .eq('id', item.id);

      // Show success and reload
      setTimeout(() => {
        loadQueue();
        setSelectedItem(null);
        setProcessing(false);
      }, 500);

    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve');
      setProcessing(false);
    }
  }

  async function rejectItem(item: QueueItem) {
    setProcessing(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await supabase
        .from('knowledge_extraction_queue')
        .update({ status: 'rejected' })
        .eq('id', item.id);

      setTimeout(() => {
        loadQueue();
        setSelectedItem(null);
        setProcessing(false);
      }, 500);
    } catch (error) {
      console.error('Error rejecting:', error);
      setProcessing(false);
    }
  }

  async function bulkApprove() {
    if (selectedIds.size === 0 || !confirm(`Approve ${selectedIds.size} items?`)) return;

    setProcessing(true);
    const itemsToApprove = items.filter(i => selectedIds.has(i.id));

    for (const item of itemsToApprove) {
      await approveItem(item);
    }

    setSelectedIds(new Set());
    setProcessing(false);
  }

  function toggleSelection(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  // Compute derived values
  const pendingItems = items.filter(i => i.status === 'pending');

  const filteredItems = pendingItems.filter(item => {
    // Confidence filter
    if (filter === 'high' && (item.confidence_score || 0) < 0.7) return false;
    if (filter === 'medium' && ((item.confidence_score || 0) < 0.5 || (item.confidence_score || 0) >= 0.7)) return false;
    if (filter === 'low' && (item.confidence_score || 0) >= 0.5) return false;

    // Type filter
    if (typeFilter !== 'all' && item.suggested_type !== typeFilter) return false;

    // Search filter
    if (searchQuery && !item.raw_title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  const stats = {
    total: pendingItems.length,
    high: pendingItems.filter(i => (i.confidence_score || 0) >= 0.7).length,
    medium: pendingItems.filter(i => (i.confidence_score || 0) >= 0.5 && (i.confidence_score || 0) < 0.7).length,
    low: pendingItems.filter(i => (i.confidence_score || 0) < 0.5).length,
    byType: pendingItems.reduce((acc, item) => {
      const type = item.suggested_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Helper function for bulk selection
  const selectAllVisible = () => {
    const visibleIds = filteredItems.map(i => i.id);
    setSelectedIds(new Set(visibleIds));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your knowledge queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Knowledge Review Queue
              </h1>
              <p className="text-gray-600 mt-2">
                {stats.total} items extracted from Notion • {stats.high} high confidence
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadQueue}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/wiki"
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                View Wiki
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filter === 'all'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-600 mb-1">All Items</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </button>

            <button
              onClick={() => setFilter('high')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filter === 'high'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-green-600 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                High Confidence
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.high}</div>
              <div className="text-xs text-green-600 mt-1">≥ 70%</div>
            </button>

            <button
              onClick={() => setFilter('medium')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filter === 'medium'
                  ? 'border-yellow-500 bg-yellow-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-yellow-600 mb-1">Medium</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-xs text-yellow-600 mt-1">50-70%</div>
            </button>

            <button
              onClick={() => setFilter('low')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filter === 'low'
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-orange-600 mb-1">Needs Review</div>
              <div className="text-3xl font-bold text-orange-600">{stats.low}</div>
              <div className="text-xs text-orange-600 mt-1">&lt; 50%</div>
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.keys(stats.byType).map(type => (
                <option key={type} value={type}>
                  {TYPE_ICONS[type as keyof typeof TYPE_ICONS] || '📄'} {type} ({stats.byType[type]})
                </option>
              ))}
            </select>

            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={selectAllVisible}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Select All ({filteredItems.length})
                </button>
                <button
                  onClick={bulkApprove}
                  disabled={processing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve {selectedIds.size} Items
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 text-center">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No items match your filters</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or run a new Notion scan</p>
            <button
              onClick={() => {
                setFilter('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
                    selectedItem?.id === item.id
                      ? 'border-green-500 shadow-xl ring-4 ring-green-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(item.id);
                      }}
                      className="mt-1 w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-lg text-gray-900 flex-1">
                          {item.raw_title}
                        </h3>
                        {item.confidence_score && (
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.confidence_score >= 0.7
                                ? 'bg-green-100 text-green-700'
                                : item.confidence_score >= 0.5
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {Math.round(item.confidence_score * 100)}%
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {item.suggested_type && (
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${TYPE_COLORS[item.suggested_type as keyof typeof TYPE_COLORS] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {TYPE_ICONS[item.suggested_type as keyof typeof TYPE_ICONS]} {item.suggested_type}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          from {item.source_type}
                        </span>
                      </div>

                      {item.suggested_tags && item.suggested_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.suggested_tags.slice(0, 5).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${selectedItem?.id === item.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="lg:sticky lg:top-32 h-fit">
              {selectedItem ? (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-xl">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-3xl">
                        {TYPE_ICONS[selectedItem.suggested_type as keyof typeof TYPE_ICONS] || '📄'}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${TYPE_COLORS[selectedItem.suggested_type as keyof typeof TYPE_COLORS] || 'bg-gray-100'}`}>
                        {selectedItem.suggested_type}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedItem.raw_title}
                    </h2>
                    {selectedItem.confidence_score && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedItem.confidence_score >= 0.7
                                ? 'bg-green-500'
                                : selectedItem.confidence_score >= 0.5
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${selectedItem.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {Math.round(selectedItem.confidence_score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none mb-6 max-h-96 overflow-y-auto">
                    <ReactMarkdown>{selectedItem.raw_content}</ReactMarkdown>
                  </div>

                  {selectedItem.suggested_tags && selectedItem.suggested_tags.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.suggested_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <a
                      href={selectedItem.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-medium transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View in Notion
                    </a>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => approveItem(selectedItem)}
                        disabled={processing}
                        className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectItem(selectedItem)}
                        disabled={processing}
                        className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium transition-all"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Select an item to review</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Click any item on the left to see details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
