"use client";

import { useEffect, useState } from "react";

interface SprintVelocity {
  sprint: string;
  sprintNumber: number;
  completed: number;
  total: number;
  velocity: number;
  completionRate: number;
}

interface VelocityData {
  sprints: SprintVelocity[];
  averageVelocity: number;
  sprintCount: number;
  note?: string;
}

export default function VelocityChart() {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVelocityData() {
      try {
        const response = await fetch("/api/dashboard/velocity");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
        console.error("Velocity chart error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchVelocityData();
    // Refresh every 10 minutes
    const interval = setInterval(fetchVelocityData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Velocity</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Velocity</h3>
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
      </div>
    );
  }

  // No sprints yet - show empty state
  if (data.sprints.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Velocity</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-sm text-muted-foreground mb-2">
            No sprint data available yet
          </p>
          <p className="text-xs text-muted-foreground">
            {data.note || "Complete your first sprint to see velocity trends"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate max value for chart scaling
  const maxCompleted = Math.max(...data.sprints.map((s) => s.completed), 1);
  const chartMax = Math.ceil(maxCompleted * 1.2); // Add 20% headroom

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Sprint Velocity</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {data.averageVelocity}
          </div>
          <div className="text-xs text-muted-foreground">avg per sprint</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative h-48 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-muted-foreground">
          <span>{chartMax}</span>
          <span>{Math.round(chartMax / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full flex items-end justify-around gap-2">
          {data.sprints.map((sprint) => {
            const height = (sprint.completed / chartMax) * 100;
            const isAboveAverage = sprint.velocity > data.averageVelocity;

            return (
              <div
                key={sprint.sprint}
                className="flex-1 flex flex-col items-center gap-2"
              >
                {/* Bar */}
                <div className="w-full relative group">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isAboveAverage
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    style={{ height: `${height}%`, minHeight: "8px" }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                      <div>{sprint.sprint}</div>
                      <div>Completed: {sprint.completed}</div>
                      <div>Total: {sprint.total}</div>
                      <div>Rate: {sprint.completionRate}%</div>
                    </div>
                  </div>

                  {/* Value label */}
                  <div className="text-center text-xs font-semibold mt-1">
                    {sprint.completed}
                  </div>
                </div>

                {/* Sprint label */}
                <div className="text-xs text-muted-foreground text-center">
                  S{sprint.sprintNumber}
                </div>
              </div>
            );
          })}
        </div>

        {/* Average line */}
        {data.averageVelocity > 0 && (
          <div
            className="absolute left-10 right-0 border-t-2 border-dashed border-blue-300"
            style={{
              bottom: `${(data.averageVelocity / chartMax) * 100}%`,
            }}
          >
            <span className="absolute -top-3 right-0 text-xs text-blue-600 bg-background px-1">
              avg
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Below Average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Above Average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 border-t-2 border-dashed border-blue-300"></div>
          <span>Average ({data.averageVelocity})</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
        Last {data.sprintCount} sprint{data.sprintCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
