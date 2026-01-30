import { useApi } from '../hooks/useApi';
import type { GoalsSummaryResponse, HealthSummaryResponse } from '../types';

export function SummaryStats() {
  const { data: goals } = useApi<GoalsSummaryResponse>('/api/goals/summary', 60000);
  const { data: health } = useApi<HealthSummaryResponse>('/api/ecosystem/health-summary', 60000);

  return (
    <div className="summary-stats">
      <div className="summary-stat">
        <span className="summary-value">{health?.summary.avgScore ?? '--'}</span>
        <span className="summary-label">Avg Health Score</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{goals?.avgProgress ?? '--'}%</span>
        <span className="summary-label">Goals Progress</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">
          {health ? `${health.summary.healthy}/${health.summary.total}` : '--'}
        </span>
        <span className="summary-label">Healthy Sites</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{health?.summary.alertCount ?? '--'}</span>
        <span className="summary-label">Active Alerts</span>
      </div>
    </div>
  );
}
