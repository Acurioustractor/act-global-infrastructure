"use client";

import { useEffect, useState } from "react";

interface BurndownDataPoint {
  date: string;
  day: number;
  ideal: number;
  actual: number;
  completed: number;
  total: number;
}

interface BurndownData {
  sprintName: string;
  startDate?: string;
  endDate?: string;
  totalIssues?: number;
  daysInSprint?: number;
  dataPoints: BurndownDataPoint[];
  projection?: {
    endDate: string;
    daysRemaining: number;
    onTrack: boolean;
  } | null;
  note?: string;
}

export default function BurndownChart() {
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBurndownData() {
      try {
        const response = await fetch("/api/dashboard/burndown");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
        console.error("Burndown chart error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBurndownData();
    // Refresh every 10 minutes
    const interval = setInterval(fetchBurndownData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Burndown</h3>
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
        <h3 className="text-lg font-semibold mb-4">Sprint Burndown</h3>
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
      </div>
    );
  }

  // No data points - show empty state
  if (data.dataPoints.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Burndown</h3>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📉</div>
          <p className="text-sm font-semibold mb-2">{data.sprintName}</p>
          <p className="text-xs text-muted-foreground">
            {data.note || "No burndown data available for this sprint"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions
  const maxValue = Math.max(...data.dataPoints.map((p) => Math.max(p.ideal, p.actual)));
  const chartMax = Math.ceil(maxValue * 1.1); // Add 10% headroom

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">{data.sprintName} Burndown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {data.startDate} to {data.endDate} ({data.daysInSprint} days)
          </p>
        </div>
        {data.projection && (
          <div className="text-right">
            <div
              className={`text-sm font-semibold ${
                data.projection.onTrack ? "text-green-600" : "text-orange-600"
              }`}
            >
              {data.projection.onTrack ? "✓ On Track" : "⚠ Behind Schedule"}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.projection.daysRemaining} days remaining
            </div>
          </div>
        )}
      </div>

      {/* Line Chart */}
      <div className="relative h-48 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-muted-foreground">
          <span>{chartMax}</span>
          <span>{Math.round(chartMax / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-muted"></div>
            ))}
          </div>

          {/* SVG for lines */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Ideal line (blue dashed) */}
            {data.dataPoints.length > 1 && (
              <polyline
                points={data.dataPoints
                  .map((point, index) => {
                    const x = (index / (data.dataPoints.length - 1)) * 100;
                    const y = 100 - (point.ideal / chartMax) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
                strokeDasharray="5,5"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Actual line (solid) */}
            {data.dataPoints.length > 1 && (
              <polyline
                points={data.dataPoints
                  .map((point, index) => {
                    const x = (index / (data.dataPoints.length - 1)) * 100;
                    const y = 100 - (point.actual / chartMax) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={
                  data.projection?.onTrack
                    ? "rgb(34, 197, 94)"
                    : "rgb(249, 115, 22)"
                }
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Data points */}
            {data.dataPoints.map((point, index) => {
              const x = ((index / (data.dataPoints.length - 1)) * 100).toFixed(2);
              const y = (100 - (point.actual / chartMax) * 100).toFixed(2);

              return (
                <g key={index}>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill={
                      data.projection?.onTrack
                        ? "rgb(34, 197, 94)"
                        : "rgb(249, 115, 22)"
                    }
                    className="hover:r-6 transition-all cursor-pointer"
                  >
                    <title>
                      Day {point.day}: {point.actual} remaining ({point.completed} done)
                    </title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels (days) */}
        <div className="ml-10 mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Day 1</span>
          {data.dataPoints.length > 2 && (
            <span>Day {Math.ceil(data.dataPoints.length / 2)}</span>
          )}
          <span>Day {data.dataPoints.length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 border-t-2 border-dashed border-blue-500"></div>
          <span>Ideal</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-8 border-t-2 ${
              data.projection?.onTrack ? "border-green-500" : "border-orange-500"
            }`}
          ></div>
          <span>Actual</span>
        </div>
      </div>

      {/* Summary */}
      {data.dataPoints.length > 0 && (
        <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
          {data.dataPoints[data.dataPoints.length - 1].completed} of{" "}
          {data.totalIssues} issues completed •{" "}
          {data.dataPoints[data.dataPoints.length - 1].actual} remaining
        </div>
      )}
    </div>
  );
}
