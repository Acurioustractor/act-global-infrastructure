import { useApi, postApi } from '../hooks/useApi';
import type { HealthSummaryResponse, HealthAlert } from '../types';

export function AlertsPanel() {
  const { data, loading, error, refetch } = useApi<HealthSummaryResponse>('/api/ecosystem/health-summary', 30000);

  if (loading) return <div className="card"><div className="loading">Loading alerts...</div></div>;
  if (error) return <div className="card"><div className="error">Error: {error}</div></div>;
  if (!data) return null;

  const alerts = data.alerts || [];

  const handleAcknowledge = async (id: string) => {
    try {
      await postApi(`/api/ecosystem/alerts/${id}/acknowledge`, { acknowledged_by: 'dashboard' });
      refetch();
    } catch (e) {
      console.error('Acknowledge failed:', e);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await postApi(`/api/ecosystem/alerts/${id}/resolve`);
      refetch();
    } catch (e) {
      console.error('Resolve failed:', e);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Health Alerts</h2>
        <div className="card-header-right">
          {alerts.length > 0 && (
            <span className="badge alert-badge">{alerts.length} active</span>
          )}
          <button className="btn-sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#10003;</div>
          <div>No active alerts - all systems nominal</div>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert: HealthAlert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={() => handleAcknowledge(alert.id)}
              onResolve={() => handleResolve(alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertItem({ alert, onAcknowledge, onResolve }: {
  alert: HealthAlert;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const icon = alert.severity === 'critical' ? '\u26A0' :
              alert.severity === 'warning' ? '\u26A0' : '\u2139';

  return (
    <div className={`alert-item ${alert.severity}`}>
      <span className="alert-icon">{icon}</span>
      <div className="alert-content">
        <div className="alert-message">{alert.message}</div>
        <div className="alert-meta">
          <span className={`alert-severity ${alert.severity}`}>{alert.severity}</span>
          <span className="alert-type">{alert.alert_type}</span>
          <span className="alert-time">{formatTimeAgo(alert.created_at)}</span>
        </div>
      </div>
      <div className="alert-actions">
        {!alert.acknowledged && (
          <button className="btn-xs" onClick={onAcknowledge}>Ack</button>
        )}
        <button className="btn-xs resolve" onClick={onResolve}>Resolve</button>
      </div>
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
