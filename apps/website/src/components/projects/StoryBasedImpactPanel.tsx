/**
 * Story-Based Impact Panel
 *
 * Displays impact metrics and insights derived from storyteller content
 * associated with an ACT project. Shows how community voices inform
 * project strategy and outcomes.
 */

'use client';

import { useEffect, useState } from 'react';
import type { StoryImpactMetrics, CommunityInsight } from '@/types/shared/act-featured-content';

interface StoryBasedImpactPanelProps {
  projectSlug: string;
  className?: string;
}

export default function StoryBasedImpactPanel({
  projectSlug,
  className = ''
}: StoryBasedImpactPanelProps) {
  const [metrics, setMetrics] = useState<StoryImpactMetrics | null>(null);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchImpactData() {
      try {
        // Fetch impact metrics from Empathy Ledger
        const metricsRes = await fetch(`/api/projects/${projectSlug}/story-impact`);
        const metricsData = await metricsRes.json();

        if (metricsData.success) {
          setMetrics(metricsData.metrics);
          setInsights(metricsData.insights || []);
        }
      } catch (error) {
        console.error('Failed to fetch story impact data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchImpactData();
  }, [projectSlug]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Story-Based Impact
        </h2>
        <p className="text-gray-600">
          Community voices informing project strategy and outcomes
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Contributing Storytellers"
          value={metrics.storytellerCount}
          icon="👥"
        />
        <MetricCard
          label="Stories Shared"
          value={metrics.storyCount}
          icon="📖"
        />
        <MetricCard
          label="Themes Identified"
          value={metrics.themeCount}
          icon="🎯"
        />
        <MetricCard
          label="Community Insights"
          value={metrics.insightCount}
          icon="💡"
        />
      </div>

      {/* Top Themes */}
      {metrics.topThemes && metrics.topThemes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Most Common Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {metrics.topThemes.map((theme) => (
              <ThemeTag key={theme.theme} theme={theme.theme} count={theme.count} />
            ))}
          </div>
        </div>
      )}

      {/* Community Insights */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Community-Informed Insights
          </h3>
          <div className="space-y-4">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 italic">
          These insights are derived from stories shared by community members via{' '}
          <a
            href={process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL || 'https://empathyledger.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Empathy Ledger
          </a>
          , with explicit consent for community impact analysis. All storytellers
          maintain full sovereignty over their narratives.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function ThemeTag({ theme, count }: { theme: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
      {theme}
      <span className="text-xs text-blue-600">({count})</span>
    </span>
  );
}

function InsightCard({ insight }: { insight: CommunityInsight }) {
  const typeColors = {
    pattern: 'bg-purple-50 text-purple-700 border-purple-200',
    trend: 'bg-green-50 text-green-700 border-green-200',
    recommendation: 'bg-blue-50 text-blue-700 border-blue-200',
    innovation: 'bg-orange-50 text-orange-700 border-orange-200',
    wisdom: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const typeIcons = {
    pattern: '🔍',
    trend: '📈',
    recommendation: '💡',
    innovation: '🚀',
    wisdom: '🌟',
  };

  return (
    <div className={`rounded-lg border p-4 ${typeColors[insight.type] || typeColors.pattern}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeIcons[insight.type]}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {insight.type}
            </span>
            {insight.confidence && (
              <span className="text-xs opacity-75">
                {Math.round(insight.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <p className="text-sm font-medium mb-2">{insight.insight}</p>
          {insight.supportingStoryCount > 0 && (
            <p className="text-xs opacity-75">
              Based on {insight.supportingStoryCount} community {insight.supportingStoryCount === 1 ? 'story' : 'stories'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
