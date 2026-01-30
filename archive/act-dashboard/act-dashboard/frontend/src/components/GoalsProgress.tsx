import { useState } from 'react';
import { useApi, postApi } from '../hooks/useApi';
import type { GoalsResponse, Goal } from '../types';

export function GoalsProgress() {
  const { data, loading, error, refetch } = useApi<GoalsResponse>('/api/goals/2026', 60000);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  if (loading) return <div className="card"><div className="loading">Loading goals...</div></div>;
  if (error) return <div className="card"><div className="error">Error: {error}</div></div>;
  if (!data) return null;

  const handleProgressUpdate = async (goalId: string, progress: number) => {
    setUpdating(goalId);
    try {
      await postApi(`/api/goals/${goalId}/update`, {
        progress,
        source: 'dashboard',
        updated_by: 'user',
      });
      refetch();
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>2026 Goals Progress</h2>
        <div className="card-header-right">
          <span className="badge">{data.summary.overallProgress}% complete</span>
          <button className="btn-sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-value">{data.summary.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">{data.summary.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat">
          <span className="stat-value">{data.summary.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <div className="lanes">
        {Object.entries(data.lanes).map(([key, lane]) => {
          if (lane.goals.length === 0) return null;
          const avgProgress = lane.total > 0
            ? Math.round(lane.goals.reduce((sum: number, g: Goal) => sum + (g.progress_percentage || 0), 0) / lane.total)
            : 0;

          return (
            <div key={key} className="lane-group">
              <div className="lane-header">
                <span className="lane-name">{lane.name}</span>
                <span className="lane-count">{lane.goals.length} goals &middot; {avgProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${avgProgress}%` }} />
              </div>
              <div className="goal-list">
                {lane.goals.map((goal: Goal) => (
                  <div
                    key={goal.id}
                    className={`goal-item ${expandedGoal === goal.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  >
                    <div className="goal-row">
                      <StatusIcon status={goal.status} />
                      <span className="goal-title">{goal.title}</span>
                      <div className="goal-progress-mini">
                        <div
                          className="goal-progress-mini-fill"
                          style={{ width: `${goal.progress_percentage || 0}%` }}
                        />
                      </div>
                      <span className="goal-pct">{goal.progress_percentage || 0}%</span>
                    </div>
                    {expandedGoal === goal.id && (
                      <div className="goal-detail">
                        <div className="goal-detail-row">
                          <span>Status: {goal.status}</span>
                          <span>Type: {goal.type}</span>
                          {goal.due_date && <span>Due: {goal.due_date}</span>}
                        </div>
                        <div className="progress-slider">
                          <label>Progress:</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={goal.progress_percentage || 0}
                            onChange={(e) => handleProgressUpdate(goal.id, parseInt(e.target.value))}
                            disabled={updating === goal.id}
                          />
                          <span>{goal.progress_percentage || 0}%</span>
                        </div>
                        {goal.key_results && (
                          <div className="key-results">
                            <strong>Key Results:</strong> {goal.key_results}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, string> = {
    'Completed': '\u2713',
    'In progress': '\u25B6',
    'Planning': '\u2699',
    'Not started': '\u25A1',
  };
  const colors: Record<string, string> = {
    'Completed': 'var(--success)',
    'In progress': 'var(--accent)',
    'Planning': 'var(--warning)',
    'Not started': 'var(--text-muted)',
  };
  return (
    <span className="status-icon" style={{ color: colors[status] || 'var(--text-muted)' }}>
      {icons[status] || '\u25A1'}
    </span>
  );
}
