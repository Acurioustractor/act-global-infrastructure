'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  type: 'commit' | 'pr' | 'issue' | 'deployment' | 'release';
  project: string;
  title: string;
  user: string;
  timestamp: string;
  url: string;
}

const ACT_REPOS = [
  'Acurioustractor/act-regenerative-studio',
  'Acurioustractor/empathy-ledger-v2',
  'Acurioustractor/justicehub-platform',
  'Acurioustractor/theharvest',
  'Acurioustractor/act-farm',
  'Acurioustractor/act-placemat',
  'Acurioustractor/goods-asset-tracker',
];

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const allActivities: ActivityItem[] = [];

        // Fetch recent events from each repo
        for (const repo of ACT_REPOS) {
          try {
            const response = await fetch(`https://api.github.com/repos/${repo}/events?per_page=5`);
            if (!response.ok) continue;

            const events = await response.json();
            const projectName = repo.split('/')[1];

            for (const event of events) {
              let activity: ActivityItem | null = null;

              switch (event.type) {
                case 'PushEvent':
                  const commits = event.payload.commits || [];
                  if (commits.length > 0) {
                    activity = {
                      id: event.id,
                      type: 'commit',
                      project: projectName,
                      title: commits[0].message.split('\n')[0],
                      user: event.actor.login,
                      timestamp: event.created_at,
                      url: `https://github.com/${repo}/commit/${commits[0].sha}`,
                    };
                  }
                  break;

                case 'PullRequestEvent':
                  activity = {
                    id: event.id,
                    type: 'pr',
                    project: projectName,
                    title: event.payload.pull_request.title,
                    user: event.actor.login,
                    timestamp: event.created_at,
                    url: event.payload.pull_request.html_url,
                  };
                  break;

                case 'IssuesEvent':
                  activity = {
                    id: event.id,
                    type: 'issue',
                    project: projectName,
                    title: event.payload.issue.title,
                    user: event.actor.login,
                    timestamp: event.created_at,
                    url: event.payload.issue.html_url,
                  };
                  break;

                case 'ReleaseEvent':
                  activity = {
                    id: event.id,
                    type: 'release',
                    project: projectName,
                    title: event.payload.release.name || event.payload.release.tag_name,
                    user: event.actor.login,
                    timestamp: event.created_at,
                    url: event.payload.release.html_url,
                  };
                  break;
              }

              if (activity) {
                allActivities.push(activity);
              }
            }
          } catch (error) {
            console.error(`Error fetching events for ${repo}:`, error);
          }
        }

        // Sort by timestamp (most recent first)
        allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Take top 20 activities
        setActivities(allActivities.slice(0, 20));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, []);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'commit':
        return '🔨';
      case 'pr':
        return '🔀';
      case 'issue':
        return '🐛';
      case 'deployment':
        return '🚀';
      case 'release':
        return '🎉';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'commit':
        return 'text-blue-600';
      case 'pr':
        return 'text-purple-600';
      case 'issue':
        return 'text-red-600';
      case 'deployment':
        return 'text-green-600';
      case 'release':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h2 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Recent Activity
        </h2>
        <div className="mt-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[#E3D4BA] rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <h2 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
        Recent Activity
      </h2>
      <p className="mt-1 text-xs text-[#4D3F33]">
        Latest updates across the ACT ecosystem
      </p>

      <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-[#4D3F33] text-center py-8">
            No recent activity
          </p>
        ) : (
          activities.map((activity) => (
            <a
              key={activity.id}
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-[#E3D4BA] bg-white p-3 hover:bg-[#F5F1E8] transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getActivityIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#2F3E2E] bg-[#F5F1E8] px-2 py-0.5 rounded-full">
                      {activity.project}
                    </span>
                    <span className={`text-xs font-medium ${getActivityColor(activity.type)}`}>
                      {activity.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#2F3E2E] line-clamp-1">
                    {activity.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#4D3F33]">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{formatTimestamp(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
