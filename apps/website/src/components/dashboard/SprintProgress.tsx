"use client";

import { useEffect, useState } from "react";

interface SprintData {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  percentComplete: number;
  sprintName: string;
}

export default function SprintProgress() {
  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSprintData() {
      try {
        // Fetch all items since Sprint 4 might be empty
        const response = await fetch("/api/dashboard/sprint?all=true");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
        console.error("Sprint progress error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSprintData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSprintData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Progress</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sprint Progress</h3>
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sprint Progress</h3>
        <span className="text-sm text-muted-foreground">All Issues</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold">{data.percentComplete}%</span>
          <span className="text-sm text-muted-foreground">
            {data.done} of {data.total} complete
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${data.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-muted-foreground">
            {data.todo}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Todo</div>
        </div>
        <div className="text-center border-x">
          <div className="text-2xl font-bold text-blue-600">
            {data.inProgress}
          </div>
          <div className="text-xs text-muted-foreground mt-1">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.done}</div>
          <div className="text-xs text-muted-foreground mt-1">Done</div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t text-center">
        <span className="text-sm text-muted-foreground">
          Total Issues: <span className="font-semibold">{data.total}</span>
        </span>
      </div>
    </div>
  );
}
