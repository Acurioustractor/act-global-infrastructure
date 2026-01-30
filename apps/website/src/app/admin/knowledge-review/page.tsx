/**
 * Knowledge Management Dashboard
 *
 * Admin interface for reviewing and managing ACT's knowledge base:
 * - View recent verifications
 * - Review PMPP items
 * - Track knowledge versions
 * - Manage elder review queue
 * - Monitor community feedback
 *
 * Access: /admin/knowledge-review
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function KnowledgeReviewDashboard() {
  const [activeTab, setActiveTab] = useState<'verifications' | 'pmpp' | 'versions' | 'elder' | 'feedback'>('verifications');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [pmppItems, setPmppItems] = useState<any[]>([]);
  const [knowledgeVersions, setKnowledgeVersions] = useState<any[]>([]);
  const [elderQueue, setElderQueue] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'verifications':
          await loadVerifications();
          break;
        case 'pmpp':
          await loadPMPP();
          break;
        case 'versions':
          await loadVersions();
          break;
        case 'elder':
          await loadElderQueue();
          break;
        case 'feedback':
          await loadFeedback();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVerifications() {
    const { data, error } = await supabase
      .from('ai_content_verifications')
      .select('*')
      .order('verified_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading verifications:', error);
      return;
    }

    setVerifications(data || []);
  }

  async function loadPMPP() {
    const { data, error } = await supabase
      .from('knowledge_review_schedule')
      .select('*');

    if (error) {
      console.error('Error loading PMPP:', error);
      return;
    }

    setPmppItems(data || []);
  }

  async function loadVersions() {
    const { data, error } = await supabase
      .from('knowledge_versions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading versions:', error);
      return;
    }

    setKnowledgeVersions(data || []);
  }

  async function loadElderQueue() {
    const { data, error } = await supabase
      .from('pending_elder_reviews')
      .select('*');

    if (error) {
      console.error('Error loading elder queue:', error);
      return;
    }

    setElderQueue(data || []);
  }

  async function loadFeedback() {
    const { data, error } = await supabase
      .from('community_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading feedback:', error);
      return;
    }

    setFeedback(data || []);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Knowledge Management Dashboard</h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'verifications', label: 'Verifications', icon: '✓' },
              { id: 'pmpp', label: 'PMPP Review', icon: '📋' },
              { id: 'versions', label: 'Knowledge Versions', icon: '📚' },
              { id: 'elder', label: 'Elder Review Queue', icon: '👥' },
              { id: 'feedback', label: 'Community Feedback', icon: '💬' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {activeTab === 'verifications' && <VerificationsView data={verifications} />}
            {activeTab === 'pmpp' && <PMPPView data={pmppItems} />}
            {activeTab === 'versions' && <VersionsView data={knowledgeVersions} />}
            {activeTab === 'elder' && <ElderQueueView data={elderQueue} />}
            {activeTab === 'feedback' && <FeedbackView data={feedback} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Verifications View
// ============================================================================

function VerificationsView({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No verifications found.</div>;
  }

  // Calculate averages
  const avgScores = {
    brandVoice: 0,
    culturalSafety: 0,
    factualAccuracy: 0,
    communityVoice: 0,
    overallQuality: 0,
  };

  let count = 0;
  data.forEach(v => {
    if (v.brand_voice_score) {
      avgScores.brandVoice += v.brand_voice_score;
      avgScores.culturalSafety += v.cultural_safety_score || 0;
      avgScores.factualAccuracy += v.factual_accuracy_score || 0;
      avgScores.communityVoice += v.community_voice_score || 0;
      avgScores.overallQuality += v.overall_quality_score || 0;
      count++;
    }
  });

  if (count > 0) {
    Object.keys(avgScores).forEach(key => {
      avgScores[key as keyof typeof avgScores] = parseFloat(
        (avgScores[key as keyof typeof avgScores] / count).toFixed(2)
      );
    });
  }

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <SummaryCard title="Brand Voice" score={avgScores.brandVoice} />
        <SummaryCard title="Cultural Safety" score={avgScores.culturalSafety} />
        <SummaryCard title="Factual Accuracy" score={avgScores.factualAccuracy} />
        <SummaryCard title="Community Voice" score={avgScores.communityVoice} />
        <SummaryCard title="Overall Quality" score={avgScores.overallQuality} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{v.content_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{v.project_slug || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <QualityScore score={v.overall_quality_score} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(v.verified_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// PMPP View
// ============================================================================

function PMPPView({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No PMPP items found.</div>;
  }

  const overdue = data.filter(item => item.review_status === 'overdue');
  const dueSoon = data.filter(item => item.review_status === 'due_soon');
  const current = data.filter(item => item.review_status === 'current');

  return (
    <div className="p-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{overdue.length}</div>
          <div className="text-sm text-red-600">Overdue</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{dueSoon.length}</div>
          <div className="text-sm text-yellow-600">Due Soon</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{current.length}</div>
          <div className="text-sm text-green-600">Current</div>
        </div>
      </div>

      {/* Overdue Items */}
      {overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-red-700">Overdue Reviews</h3>
          <div className="space-y-2">
            {overdue.map(item => (
              <PMPPItem key={item.id} item={item} status="overdue" />
            ))}
          </div>
        </div>
      )}

      {/* Due Soon Items */}
      {dueSoon.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-yellow-700">Due Soon</h3>
          <div className="space-y-2">
            {dueSoon.map(item => (
              <PMPPItem key={item.id} item={item} status="due_soon" />
            ))}
          </div>
        </div>
      )}

      {/* Current Items */}
      {current.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-700">Current</h3>
          <div className="space-y-2">
            {current.map(item => (
              <PMPPItem key={item.id} item={item} status="current" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PMPPItem({ item, status }: { item: any; status: string }) {
  const bgColor = status === 'overdue' ? 'bg-red-50' : status === 'due_soon' ? 'bg-yellow-50' : 'bg-green-50';
  const borderColor = status === 'overdue' ? 'border-red-200' : status === 'due_soon' ? 'border-yellow-200' : 'border-green-200';

  return (
    <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-white mr-2">
            {item.type?.toUpperCase()}
          </span>
          <span className="font-medium">{item.title}</span>
        </div>
        <div className="text-sm text-gray-600">
          {status === 'overdue' ? 'Overdue' : `Due ${new Date(item.next_review_due).toLocaleDateString()}`}
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        Last reviewed: {new Date(item.last_reviewed_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ============================================================================
// Versions View
// ============================================================================

function VersionsView({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No knowledge versions found.</div>;
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {data.map(version => (
          <div key={version.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold text-lg">{version.knowledge_id}</span>
                <span className="ml-2 text-sm text-gray-500">v{version.version}</span>
              </div>
              <StatusBadge status={version.status} />
            </div>
            <div className="text-sm text-gray-600 mb-2">{version.content_type}</div>
            <div className="text-sm mb-2">{version.reason_for_change}</div>
            <div className="text-xs text-gray-500">
              Updated: {new Date(version.updated_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Elder Queue View
// ============================================================================

function ElderQueueView({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No items in elder review queue.</div>;
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold">{item.content_type}</span>
                <span className="ml-2 text-sm text-gray-500">({item.project_slug || 'N/A'})</span>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs rounded ${getSensitivityColor(item.sensitivity_level)}`}>
                  {item.sensitivity_level}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                  Priority: {item.priority}/5
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              Submitted: {new Date(item.submitted_at).toLocaleDateString()}
            </div>
            {item.assigned_to ? (
              <div className="text-sm text-green-600">Assigned to reviewer</div>
            ) : (
              <div className="text-sm text-orange-600">Not yet assigned</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getSensitivityColor(level: string) {
  switch (level) {
    case 'sacred':
      return 'bg-purple-100 text-purple-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// Feedback View
// ============================================================================

function FeedbackView({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No community feedback found.</div>;
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs rounded ${getFeedbackTypeColor(item.feedback_type)}`}>
                  {item.feedback_type}
                </span>
                {item.severity && (
                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(item.severity)}`}>
                    {item.severity}
                  </span>
                )}
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="text-sm mb-2">{item.feedback_text}</div>
            <div className="text-xs text-gray-500">
              {new Date(item.created_at).toLocaleDateString()}
              {item.submitter_name && ` • From: ${item.submitter_name}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFeedbackTypeColor(type: string) {
  switch (type) {
    case 'correction':
      return 'bg-red-100 text-red-800';
    case 'suggestion':
      return 'bg-blue-100 text-blue-800';
    case 'appreciation':
      return 'bg-green-100 text-green-800';
    case 'concern':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// Shared Components
// ============================================================================

function SummaryCard({ title, score }: { title: string; score: number }) {
  const color = score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{score.toFixed(2)}/5</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    approved: 'bg-green-100 text-green-800',
    revised: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    archived: 'bg-yellow-100 text-yellow-800',
    deprecated: 'bg-red-100 text-red-800',
    new: 'bg-blue-100 text-blue-800',
    reviewing: 'bg-yellow-100 text-yellow-800',
    addressed: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function QualityScore({ score }: { score: number }) {
  if (!score) return <span className="text-gray-400">N/A</span>;

  const color = score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';

  return <span className={`font-semibold ${color}`}>{score}/5</span>;
}
