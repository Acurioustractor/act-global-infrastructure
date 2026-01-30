/**
 * Human Verification UI for AI-Generated Enrichment Content
 *
 * Allows admins to review and approve AI-generated content before it goes live
 */

'use client';

import { useState, useEffect } from 'react';

interface EnrichmentItem {
  id: string;
  projectSlug: string;
  projectTitle: string;
  type: 'notion' | 'blog_links' | 'related_projects' | 'description';
  status: 'pending' | 'approved' | 'rejected';
  aiGenerated: any;
  originalData: any;
  confidence: number;
  createdAt: string;
}

export default function EnrichmentReviewPage() {
  const [items, setItems] = useState<EnrichmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EnrichmentItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Fetch enrichment items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const response = await fetch(`/api/enrichment-review?status=${filter}&limit=100`);
        if (!response.ok) {
          throw new Error('Failed to fetch enrichment items');
        }
        const result = await response.json();
        setItems(result.data || []);
      } catch (error) {
        console.error('Error fetching enrichment items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [filter]);

  const handleApprove = async (item: EnrichmentItem) => {
    try {
      const response = await fetch(`/api/enrichment-review/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      setItems(items.map(i => i.id === item.id ? { ...i, status: 'approved' } : i));
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Failed to approve item');
    }
  };

  const handleReject = async (item: EnrichmentItem) => {
    try {
      const response = await fetch(`/api/enrichment-review/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      setItems(items.map(i => i.id === item.id ? { ...i, status: 'rejected' } : i));
    } catch (error) {
      console.error('Error rejecting item:', error);
      alert('Failed to reject item');
    }
  };

  const filteredItems = items.filter(item =>
    filter === 'all' || item.status === filter
  );

  return (
    <div className="min-h-screen bg-[#F7F2E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            Enrichment Review
          </h1>
          <p className="mt-2 text-[#4D3F33]">
            Review and approve AI-generated content before it goes live
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-[#4CAF50] text-white'
                  : 'bg-white border border-[#E3D4BA] text-[#2F3E2E] hover:bg-[#F7F2E8]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CAF50]"></div>
            <p className="mt-3 text-[#6B5A45]">Loading enrichment items...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-[#6B5A45]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-[#2F3E2E]">
              No items to review
            </h3>
            <p className="mt-2 text-sm text-[#6B5A45]">
              {filter === 'pending'
                ? 'All enrichment content has been reviewed!'
                : `No ${filter} items found.`}
            </p>
          </div>
        )}

        {/* Items Grid */}
        {!loading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#2F3E2E]">
                      {item.projectTitle}
                    </h3>
                    <p className="text-sm text-[#6B5A45] mt-1">
                      {item.type.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Confidence Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#6B5A45]">Confidence</span>
                    <span className="font-medium text-[#2F3E2E]">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.confidence >= 0.8
                          ? 'bg-green-500'
                          : item.confidence >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="text-sm text-[#4D3F33] mb-4">
                  {JSON.stringify(item.aiGenerated).substring(0, 100)}...
                </div>

                {/* Actions */}
                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(item);
                      }}
                      className="flex-1 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(item);
                      }}
                      className="flex-1 px-4 py-2 rounded-full border border-red-500 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
                    {selectedItem.projectTitle}
                  </h2>
                  <p className="text-[#6B5A45] mt-1">
                    {selectedItem.type.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-[#6B5A45] hover:text-[#2F3E2E]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Side-by-side Comparison */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#6B5A45] uppercase tracking-[0.2em] mb-3">
                    Original Data
                  </h3>
                  <pre className="bg-[#F7F2E8] rounded-2xl p-4 text-sm overflow-auto max-h-96">
                    {JSON.stringify(selectedItem.originalData, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#6B5A45] uppercase tracking-[0.2em] mb-3">
                    AI Generated
                  </h3>
                  <pre className="bg-[#F7F2E8] rounded-2xl p-4 text-sm overflow-auto max-h-96">
                    {JSON.stringify(selectedItem.aiGenerated, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              {selectedItem.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleApprove(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="flex-1 px-6 py-3 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="flex-1 px-6 py-3 rounded-full border border-red-500 text-red-500 font-medium hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
