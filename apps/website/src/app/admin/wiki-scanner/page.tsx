'use client';

/**
 * ACT Living Wiki - Scanner Admin
 *
 * Manage knowledge scanning and extraction:
 * - Trigger Notion scans
 * - Review extraction queue
 * - Monitor sync status
 * - Approve/reject extractions
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface QueueItem {
  id: string;
  source_type: string;
  source_title: string;
  source_url: string;
  raw_content: string;
  extracted_title?: string;
  extracted_content?: string;
  suggested_type?: string;
  suggested_tags?: string[];
  confidence_score?: number;
  ai_reasoning?: string;
  status: 'pending' | 'extracted' | 'approved' | 'rejected';
  created_at: string;
}

interface ScanStatus {
  lastSync: string | null;
  nextSync: string | null;
  status: string;
  pendingReviews: number;
}

export default function WikiScannerAdmin() {
  // supabase imported from client

  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'extracted' | 'all'>('pending');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    await Promise.all([
      loadScanStatus(),
      loadQueueItems(),
    ]);
    setLoading(false);
  }

  async function loadScanStatus() {
    try {
      const response = await fetch('/api/knowledge/scan-notion');
      const data = await response.json();
      setScanStatus(data);
    } catch (error) {
      console.error('Error loading scan status:', error);
    }
  }

  async function loadQueueItems() {
    try {
      let query = supabase
        .from('knowledge_extraction_queue')
        .select('*')
        .order('confidence_score', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'extracted') {
        query = query.eq('status', 'extracted');
      }

      const { data } = await query.limit(20);
      setQueueItems(data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  }

  async function triggerScan() {
    setScanning(true);
    try {
      const response = await fetch('/api/knowledge/scan-notion', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Scan complete!\n\nFound ${result.scanned} knowledge items`);
        await loadData();
      } else {
        alert(`❌ Scan failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error scanning:', error);
      alert('❌ Failed to scan Notion');
    } finally {
      setScanning(false);
    }
  }

  async function runExtraction(itemId: string) {
    setExtracting(true);
    try {
      const item = queueItems.find(q => q.id === itemId);
      if (!item) return;

      const response = await fetch('/api/knowledge/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: itemId,
          sourceTitle: item.source_title,
          content: item.raw_content,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ AI extraction complete!');
        await loadQueueItems();
      } else {
        alert(`❌ Extraction failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error extracting:', error);
      alert('❌ Failed to extract knowledge');
    } finally {
      setExtracting(false);
    }
  }

  async function approveExtraction(item: QueueItem) {
    try {
      // Create wiki page
      const { error: pageError } = await supabase
        .from('wiki_pages')
        .insert({
          title: item.extracted_title || item.source_title,
          slug: (item.extracted_title || item.source_title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          content: item.extracted_content || item.raw_content,
          excerpt: item.extracted_content?.substring(0, 200) || '',
          page_type: item.suggested_type || 'guide',
          tags: item.suggested_tags || [],
          source_types: [item.source_type],
          source_urls: [item.source_url],
          extracted_from_ids: [item.id],
          status: 'active',
        });

      if (pageError) throw pageError;

      // Update queue item
      await supabase
        .from('knowledge_extraction_queue')
        .update({ status: 'approved' })
        .eq('id', item.id);

      alert('✅ Knowledge added to wiki!');
      await loadQueueItems();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving:', error);
      alert('❌ Failed to add to wiki');
    }
  }

  async function rejectExtraction(item: QueueItem) {
    try {
      await supabase
        .from('knowledge_extraction_queue')
        .update({ status: 'rejected' })
        .eq('id', item.id);

      alert('Extraction rejected');
      await loadQueueItems();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('❌ Failed to reject');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Wiki Knowledge Scanner</h1>
              <p className="text-gray-600 mt-1">
                Scan Notion for knowledge and review AI extractions
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/wiki"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                View Wiki
              </Link>
              <button
                onClick={triggerScan}
                disabled={scanning}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Scan Notion Now'}
              </button>
            </div>
          </div>

          {/* Status */}
          {scanStatus && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                  <Clock className="w-4 h-4" />
                  Last Scan
                </div>
                <p className="text-sm text-blue-600">
                  {scanStatus.lastSync
                    ? new Date(scanStatus.lastSync).toLocaleString()
                    : 'Never'}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-700 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Pending Reviews
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {scanStatus.pendingReviews}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Status
                </div>
                <p className="text-sm text-green-600 capitalize">
                  {scanStatus.status.replace('_', ' ')}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                  <Clock className="w-4 h-4" />
                  Next Scan
                </div>
                <p className="text-sm text-orange-600">
                  {scanStatus.nextSync
                    ? new Date(scanStatus.nextSync).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border-b border-gray-200 rounded-t-lg">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Review ({queueItems.filter(i => i.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('extracted')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'extracted'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Extracted
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All Items
            </button>
          </div>
        </div>

        {/* Queue Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* List */}
          <div className="space-y-4">
            {queueItems.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-8 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No items in queue</p>
                <button
                  onClick={triggerScan}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Run First Scan
                </button>
              </div>
            ) : (
              queueItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-green-600 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-lg flex-1">
                      {item.extracted_title || item.source_title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'extracted'
                          ? 'bg-blue-100 text-blue-700'
                          : item.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="capitalize">{item.source_type}</span>
                    {item.suggested_type && (
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {item.suggested_type}
                      </span>
                    )}
                    {item.confidence_score && (
                      <span
                        className={`px-2 py-1 rounded ${
                          item.confidence_score >= 0.7
                            ? 'bg-green-100 text-green-700'
                            : item.confidence_score >= 0.5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {Math.round(item.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>

                  {item.suggested_tags && item.suggested_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.suggested_tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runExtraction(item.id);
                      }}
                      disabled={extracting}
                      className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {extracting ? 'Extracting...' : 'Run AI Extraction'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Detail View */}
          <div className="lg:sticky lg:top-6">
            {selectedItem ? (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {selectedItem.extracted_title || selectedItem.source_title}
                </h2>

                {selectedItem.extracted_content ? (
                  <div className="prose prose-sm max-w-none mb-6">
                    <div className="whitespace-pre-wrap">
                      {selectedItem.extracted_content.substring(0, 500)}
                      {selectedItem.extracted_content.length > 500 && '...'}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Raw Content:</p>
                    <div className="text-sm whitespace-pre-wrap">
                      {selectedItem.raw_content.substring(0, 500)}
                      {selectedItem.raw_content.length > 500 && '...'}
                    </div>
                  </div>
                )}

                {selectedItem.ai_reasoning && (
                  <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-1">AI Reasoning:</p>
                    <p className="text-sm text-blue-700">{selectedItem.ai_reasoning}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <a
                    href={selectedItem.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Source
                  </a>

                  {selectedItem.status === 'extracted' && (
                    <>
                      <button
                        onClick={() => approveExtraction(selectedItem)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectExtraction(selectedItem)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-8 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Select an item to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
