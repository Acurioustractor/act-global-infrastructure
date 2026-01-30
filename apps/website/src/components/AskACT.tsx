'use client';

import { useState } from 'react';

interface Source {
  id: string;
  title: string;
  sourceProject: string;
  confidence: number;
  excerpt?: string;
}

interface RAGResponse {
  answer: string;
  sources?: Source[];
  overallConfidence?: number;
  cost?: { total: number };
  latencyMs?: { total: number };
}

export function AskACT() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<'quick' | 'deep'>('deep');
  const [showSources, setShowSources] = useState(false);

  async function handleAsk() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          tier,
          topK: tier === 'quick' ? 5 : 10,
          minSimilarity: tier === 'quick' ? 0.6 : 0.7,
          includeSources: showSources,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || 'Failed to query');
      }

      const data: RAGResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !loading) {
      handleAsk();
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-stone-900">Ask ACT</h2>
        <p className="text-stone-600">
          Query the comprehensive ACT knowledge base (6,400+ lines across LCAA, partners, grants, workflows, projects, and operations)
        </p>

        {/* Query Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything about ACT... (e.g., 'What's our invoice workflow?')"
            className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </div>

        {/* Options */}
        <div className="flex gap-4 items-center text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tier"
              value="quick"
              checked={tier === 'quick'}
              onChange={(e) => setTier(e.target.value as 'quick')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-stone-700">Quick (faster, cheaper)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tier"
              value="deep"
              checked={tier === 'deep'}
              onChange={(e) => setTier(e.target.value as 'deep')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-stone-700">Deep (comprehensive)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={showSources}
              onChange={(e) => setShowSources(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-stone-700">Show sources</span>
          </label>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <span className="ml-3 text-stone-600">Searching ACT knowledge...</span>
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <div className="space-y-4">
          {/* Answer */}
          <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900 mb-3">Answer</h3>
            <div className="prose prose-stone max-w-none">
              <div className="text-stone-700 whitespace-pre-wrap">{response.answer}</div>
            </div>
          </div>

          {/* Sources */}
          {showSources && response.sources && response.sources.length > 0 && (
            <details className="bg-stone-50 border border-stone-200 rounded-lg">
              <summary className="px-6 py-4 cursor-pointer font-medium text-stone-900 hover:bg-stone-100 transition-colors">
                📚 Sources ({response.sources.length})
              </summary>
              <div className="px-6 pb-4 space-y-3">
                {response.sources.map((source, index) => (
                  <div key={source.id || index} className="border-l-2 border-emerald-500 pl-4 py-2">
                    <div className="font-medium text-stone-900">{source.title || 'Untitled'}</div>
                    <div className="text-sm text-stone-600 mt-1">
                      Project: {source.sourceProject || 'Unknown'} •{' '}
                      Confidence: {((source.confidence || 0) * 100).toFixed(1)}%
                    </div>
                    {source.excerpt && (
                      <div className="text-sm text-stone-500 mt-2 italic">
                        "{source.excerpt.slice(0, 150)}..."
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Metadata */}
          <div className="flex gap-6 text-sm text-stone-500">
            {response.cost?.total !== undefined && (
              <div>
                💰 Cost: <span className="font-mono">${response.cost.total.toFixed(4)}</span>
              </div>
            )}
            {response.latencyMs?.total !== undefined && (
              <div>
                ⏱️ Time: <span className="font-mono">{response.latencyMs.total}ms</span>
              </div>
            )}
            {response.overallConfidence !== undefined && (
              <div>
                🎯 Confidence: <span className="font-mono">{(response.overallConfidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Example Queries */}
      {!response && !loading && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Example Queries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "What's the LCAA methodology?",
              "Who are our active partners?",
              "What grants are due this month?",
              "How do I create an invoice?",
              "Dual-entity structure explained",
              "What projects is ACT working on?",
              "Homepage hero copy template",
              "Meeting agenda template",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="text-left px-3 py-2 text-sm text-stone-700 hover:bg-white hover:border-emerald-500 border border-stone-200 rounded transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
