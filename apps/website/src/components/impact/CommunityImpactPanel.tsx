/**
 * Community Impact Panel
 *
 * Displays aggregated community impact metrics from Empathy Ledger
 * across the entire ACT ecosystem.
 */

'use client';

import { useEffect, useState } from 'react';

interface CommunityMetrics {
  totalStories: number;
  totalTranscripts: number;
  activeStorytellers: number;
  culturalThemes: string[];
  healingJourneys: number;
  intergenerationalConnections: number;
  elderWisdomQuotes: number;
  communityResilience: number; // 0-100
  culturalVitality: number; // 0-100
}

interface CommunityImpactPanelProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export default function CommunityImpactPanel({
  className = '',
  variant = 'full',
}: CommunityImpactPanelProps) {
  const [metrics, setMetrics] = useState<CommunityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/impact/community-metrics');
        const data = await res.json();

        if (data.success) {
          setMetrics(data.metrics);
          setSource(data.source);
        }
      } catch (error) {
        console.error('Failed to fetch community metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Storytellers"
            value={metrics.activeStorytellers}
            icon="👥"
            compact
          />
          <MetricCard
            label="Stories"
            value={metrics.totalStories}
            icon="📖"
            compact
          />
          <MetricCard
            label="Themes"
            value={metrics.culturalThemes.length}
            icon="🎯"
            compact
          />
          <MetricCard
            label="Resilience"
            value={`${metrics.communityResilience}%`}
            icon="💪"
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Community Impact
        </h2>
        <p className="text-gray-600">
          Collective insights and stories shared across the ACT ecosystem
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Active Storytellers"
          value={metrics.activeStorytellers}
          icon="👥"
          description="Community voices contributing"
        />
        <MetricCard
          label="Stories Shared"
          value={metrics.totalStories}
          icon="📖"
          description="Narratives preserved"
        />
        <MetricCard
          label="Cultural Themes"
          value={metrics.culturalThemes.length}
          icon="🎯"
          description="Identified across stories"
        />
        <MetricCard
          label="Elder Wisdom"
          value={metrics.elderWisdomQuotes}
          icon="🌟"
          description="Approved quotes shared"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Healing Journeys"
          value={metrics.healingJourneys}
          icon="🌿"
          description="Stories of transformation"
        />
        <MetricCard
          label="Intergenerational Connections"
          value={metrics.intergenerationalConnections}
          icon="🤝"
          description="Elder-youth bonds"
        />
        <MetricCard
          label="Transcripts"
          value={metrics.totalTranscripts}
          icon="📝"
          description="Full story transcriptions"
        />
      </div>

      {/* Vitality Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <VitalityBar
          label="Community Resilience"
          value={metrics.communityResilience}
          color="blue"
        />
        <VitalityBar
          label="Cultural Vitality"
          value={metrics.culturalVitality}
          color="green"
        />
      </div>

      {/* Cultural Themes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cultural Themes Across Stories
        </h3>
        <div className="flex flex-wrap gap-2">
          {metrics.culturalThemes.map((theme) => (
            <span
              key={theme}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Attribution */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 italic">
          Impact metrics sourced from{' '}
          <a
            href={process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL || 'https://empathyledger.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Empathy Ledger
          </a>
          {source && ` (${source})`}. All data aggregated with storyteller consent and
          cultural protocol respect.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  description,
  compact = false,
}: {
  label: string;
  value: number | string;
  icon: string;
  description?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xl">{icon}</span>
          <span className="text-2xl font-bold text-gray-900">{value}</span>
        </div>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function VitalityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-2xl font-bold text-gray-900">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
