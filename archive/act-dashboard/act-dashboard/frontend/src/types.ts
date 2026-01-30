export interface Goal {
  id: string;
  title: string;
  type: string;
  lane: string;
  status: string;
  progress_percentage: number;
  owner: string[];
  key_results: string;
  due_date: string | null;
}

export interface GoalsLane {
  name: string;
  goals: Goal[];
  completed: number;
  total: number;
  progress: number;
}

export interface GoalsResponse {
  lanes: Record<string, GoalsLane>;
  summary: {
    total: number;
    yearly: number;
    quarterly: number;
    completed: number;
    inProgress: number;
    overallProgress: number;
  };
  goals: Goal[];
}

export interface EcosystemSite {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: string;
  health_score: number;
  health_trend: string;
  last_check_at: string | null;
  category: string;
}

export interface HealthAlert {
  id: string;
  site_id: string;
  alert_type: string;
  severity: string;
  message: string;
  previous_score: number | null;
  current_score: number | null;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

export interface HealthSummaryResponse {
  sites: EcosystemSite[];
  alerts: HealthAlert[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
    offline: number;
    avgScore: number;
    alertCount: number;
  };
}

export interface GoalsSummaryResponse {
  total: number;
  byLane: Record<string, { count: number; completed: number; avgProgress: number }>;
  byStatus: Record<string, number>;
  avgProgress: number;
}
