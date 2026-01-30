"use client";

import { useEffect, useState } from "react";

interface HealthIndicator {
  status: "healthy" | "degraded" | "down" | "unknown";
  [key: string]: any;
}

interface ProjectHealth {
  project: string;
  slug: string;
  indicators: {
    deployment: HealthIndicator & { lastDeployed: string | null; age: number | null };
    http: HealthIndicator & { url: string | null };
    database: HealthIndicator & { shared: boolean };
    registry: (HealthIndicator & { lastSync: string | null; enabled: boolean }) | null;
  };
  overallHealth: "healthy" | "degraded" | "down" | "unknown";
}

interface HealthMatrixData {
  matrix: ProjectHealth[];
  timestamp: string;
  healthySystems: number;
  totalSystems: number;
}

export default function HealthMatrix() {
  const [data, setData] = useState<HealthMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealthMatrix() {
      try {
        const response = await fetch("/api/dashboard/health-matrix");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
        console.error("Health matrix error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHealthMatrix();
    // Refresh every 5 minutes
    const interval = setInterval(fetchHealthMatrix, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">System Health Matrix</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">System Health Matrix</h3>
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-orange-500";
      case "down":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return "✓";
      case "degraded":
        return "⚠";
      case "down":
        return "✗";
      default:
        return "?";
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">System Health Matrix</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {data.healthySystems}/{data.totalSystems}
          </div>
          <div className="text-xs text-muted-foreground">healthy</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 font-semibold">Project</th>
              <th className="text-center py-3 px-2 font-semibold">Deploy</th>
              <th className="text-center py-3 px-2 font-semibold">HTTP</th>
              <th className="text-center py-3 px-2 font-semibold">Database</th>
              <th className="text-center py-3 px-2 font-semibold">Registry</th>
              <th className="text-center py-3 px-2 font-semibold">Overall</th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((project) => (
              <tr key={project.slug} className="border-b hover:bg-muted/50">
                {/* Project Name */}
                <td className="py-3 px-2 font-medium">{project.project}</td>

                {/* Deployment Status */}
                <td className="py-3 px-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getStatusColor(
                        project.indicators.deployment.status
                      )}`}
                      title={`Deployed ${project.indicators.deployment.age}h ago`}
                    >
                      {getStatusIcon(project.indicators.deployment.status)}
                    </div>
                    {project.indicators.deployment.age !== null && (
                      <span className="text-xs text-muted-foreground">
                        {project.indicators.deployment.age}h
                      </span>
                    )}
                  </div>
                </td>

                {/* HTTP Status */}
                <td className="py-3 px-2 text-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto ${getStatusColor(
                      project.indicators.http.status
                    )}`}
                    title={project.indicators.http.url || "No URL"}
                  >
                    {getStatusIcon(project.indicators.http.status)}
                  </div>
                </td>

                {/* Database Status */}
                <td className="py-3 px-2 text-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto ${getStatusColor(
                      project.indicators.database.status
                    )}`}
                    title={
                      project.indicators.database.shared
                        ? "Shared Supabase"
                        : "Database"
                    }
                  >
                    {getStatusIcon(project.indicators.database.status)}
                  </div>
                </td>

                {/* Registry Status */}
                <td className="py-3 px-2 text-center">
                  {project.indicators.registry ? (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto ${getStatusColor(
                        project.indicators.registry.status
                      )}`}
                      title={
                        project.indicators.registry.enabled
                          ? "Registry enabled"
                          : "Registry disabled"
                      }
                    >
                      {getStatusIcon(project.indicators.registry.status)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">N/A</span>
                  )}
                </td>

                {/* Overall Health */}
                <td className="py-3 px-2 text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mx-auto ${getStatusColor(
                      project.overallHealth
                    )}`}
                  >
                    {getStatusIcon(project.overallHealth)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Degraded</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Down</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Unknown</span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
