import { useState } from 'react';
import { useApi, postApi } from '../hooks/useApi';
import type { HealthSummaryResponse, EcosystemSite } from '../types';

export function EcosystemHealth() {
  const { data, loading, error, refetch } = useApi<HealthSummaryResponse>('/api/ecosystem/health-summary', 60000);
  const [checking, setChecking] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  if (loading) return <div className="card"><div className="loading">Loading ecosystem...</div></div>;
  if (error) return <div className="card"><div className="error">Error: {error}</div></div>;
  if (!data) return null;

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      await postApi('/api/ecosystem/check-all');
      await refetch();
    } catch (e) {
      console.error('Check all failed:', e);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckSite = async (slug: string) => {
    try {
      await postApi(`/api/ecosystem/${slug}/check`);
      await refetch();
    } catch (e) {
      console.error('Site check failed:', e);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Ecosystem Health</h2>
        <div className="card-header-right">
          <span className="badge score-badge">
            Avg: {data.summary.avgScore}/100
          </span>
          <button className="btn-sm" onClick={handleCheckAll} disabled={checking}>
            {checking ? 'Checking...' : 'Check All'}
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat healthy">
          <span className="stat-value">{data.summary.healthy}</span>
          <span className="stat-label">Healthy</span>
        </div>
        <div className="stat degraded">
          <span className="stat-value">{data.summary.degraded}</span>
          <span className="stat-label">Degraded</span>
        </div>
        <div className="stat critical">
          <span className="stat-value">{data.summary.critical}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className="stat offline">
          <span className="stat-value">{data.summary.offline}</span>
          <span className="stat-label">Offline</span>
        </div>
      </div>

      <div className="health-grid">
        {data.sites.map((site: EcosystemSite) => (
          <SiteCard
            key={site.id}
            site={site}
            isSelected={selectedSite === site.slug}
            onSelect={() => setSelectedSite(selectedSite === site.slug ? null : site.slug)}
            onCheck={() => handleCheckSite(site.slug)}
          />
        ))}
      </div>

      {selectedSite && <SiteDetail slug={selectedSite} />}
    </div>
  );
}

function SiteCard({ site, isSelected, onSelect, onCheck }: {
  site: EcosystemSite;
  isSelected: boolean;
  onSelect: () => void;
  onCheck: () => void;
}) {
  const score = site.health_score || 0;
  const statusClass = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : score >= 30 ? 'critical' : 'offline';
  const trend = site.health_trend || 'stable';
  const trendIcon = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '\u2014';

  return (
    <div
      className={`site-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="site-card-header">
        <span className="site-name">{site.name}</span>
        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); onCheck(); }}>
          Check
        </button>
      </div>
      <div className="site-score-row">
        <span className={`site-score ${statusClass}`}>{score}</span>
        <span className={`site-trend ${trend}`}>{trendIcon} {trend}</span>
      </div>
      <div className="site-meta">
        {site.last_check_at ? formatTimeAgo(site.last_check_at) : 'Never checked'}
      </div>
    </div>
  );
}

function SiteDetail({ slug }: { slug: string }) {
  const { data, loading } = useApi<any>(`/api/ecosystem/${slug}/details`);

  if (loading) return <div className="site-detail loading">Loading details...</div>;
  if (!data) return null;

  return (
    <div className="site-detail">
      <h3>{data.name}</h3>
      <div className="site-detail-grid">
        <div className="detail-section">
          <h4>Info</h4>
          <div className="detail-row"><span>URL:</span> <a href={data.url} target="_blank" rel="noreferrer">{data.url}</a></div>
          <div className="detail-row"><span>Category:</span> {data.category}</div>
          <div className="detail-row"><span>Status:</span> <span className={`status-badge ${data.status}`}>{data.status}</span></div>
          {data.github_repo && <div className="detail-row"><span>GitHub:</span> {data.github_repo}</div>}
        </div>

        {data.latest_health && (
          <div className="detail-section">
            <h4>Latest Health Check</h4>
            <div className="detail-row"><span>Score:</span> {data.latest_health.health_score}/100</div>
            <div className="detail-row"><span>HTTP:</span> {data.latest_health.http_status || 'N/A'} ({data.latest_health.http_response_time_ms}ms)</div>
            <div className="detail-row"><span>SSL:</span> {data.latest_health.ssl_valid ? 'Valid' : 'Invalid/Unknown'}</div>
            {data.latest_health.vercel_deployment_status && (
              <div className="detail-row"><span>Vercel:</span> {data.latest_health.vercel_deployment_status}</div>
            )}
          </div>
        )}

        {data.recent_deployments?.length > 0 && (
          <div className="detail-section">
            <h4>Recent Deployments</h4>
            {data.recent_deployments.slice(0, 3).map((d: any) => (
              <div key={d.id} className="deploy-item">
                <span className={`deploy-status ${d.status?.toLowerCase()}`}>{d.status}</span>
                <span className="deploy-branch">{d.git_branch || 'main'}</span>
                <span className="deploy-time">{d.deployed_at ? formatTimeAgo(d.deployed_at) : '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.active_alerts?.length > 0 && (
        <div className="detail-section">
          <h4>Active Alerts ({data.active_alerts.length})</h4>
          {data.active_alerts.map((alert: any) => (
            <div key={alert.id} className={`alert-mini ${alert.severity}`}>
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
