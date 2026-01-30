import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Burndown Chart API
 * Returns daily burndown data for current sprint
 *
 * Query params:
 *   ?sprint=Sprint%204 - Filter to specific sprint (defaults to Sprint 4)
 *
 * Response format:
 * {
 *   sprintName: "Sprint 4",
 *   startDate: "2025-01-20",
 *   endDate: "2025-01-26",
 *   dataPoints: [
 *     { date: "2025-01-20", ideal: 100, actual: 100 },
 *     { date: "2025-01-21", ideal: 85, actual: 92 },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintName = searchParams.get("sprint") || "Sprint 4";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all snapshots for the specified sprint
    const { data: snapshots, error } = await supabase
      .from('sprint_snapshots')
      .select('*')
      .eq('sprint_name', sprintName)
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error("Burndown query error:", error);
      return NextResponse.json({
        sprintName,
        dataPoints: [],
        note: "No sprint snapshots available. Configure GitHub Action to populate data.",
      });
    }

    if (!snapshots || snapshots.length === 0) {
      // No snapshots for this sprint - return empty state
      return NextResponse.json({
        sprintName,
        dataPoints: [],
        note: `No snapshots found for ${sprintName}. Sprint may not have started yet.`,
      });
    }

    // Get sprint date range from snapshots
    const startDate = snapshots[0].snapshot_date;
    const endDate = snapshots[snapshots.length - 1].snapshot_date;
    const totalIssues = snapshots[0].total_issues;

    // Calculate number of days in sprint
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInSprint = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate ideal burndown (linear decrease from total to 0)
    const idealBurnRate = totalIssues / (daysInSprint - 1);

    // Build data points for chart
    const dataPoints = snapshots.map((snapshot: any, index: number) => {
      const dayNumber = index;
      const idealRemaining = Math.max(0, totalIssues - (idealBurnRate * dayNumber));
      const actualRemaining = snapshot.actual_remaining ??
        (snapshot.total_issues - snapshot.done_issues);

      return {
        date: snapshot.snapshot_date,
        day: dayNumber + 1,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: actualRemaining,
        completed: snapshot.done_issues,
        total: snapshot.total_issues,
      };
    });

    // Calculate projection if sprint is in progress
    let projectedEndDate = null;
    let projectedCompletion = null;

    if (dataPoints.length >= 2 && dataPoints[dataPoints.length - 1].actual > 0) {
      const lastSnapshot = dataPoints[dataPoints.length - 1];
      const firstSnapshot = dataPoints[0];

      const daysElapsed = dataPoints.length - 1;
      const issuesCompleted = firstSnapshot.total - lastSnapshot.actual;

      if (issuesCompleted > 0) {
        const actualBurnRate = issuesCompleted / daysElapsed;
        const daysToComplete = Math.ceil(lastSnapshot.actual / actualBurnRate);

        const projectedEnd = new Date(lastSnapshot.date);
        projectedEnd.setDate(projectedEnd.getDate() + daysToComplete);

        projectedEndDate = projectedEnd.toISOString().split('T')[0];
        projectedCompletion = daysToComplete;
      }
    }

    return NextResponse.json({
      sprintName,
      startDate,
      endDate,
      totalIssues,
      daysInSprint,
      dataPoints,
      projection: projectedEndDate ? {
        endDate: projectedEndDate,
        daysRemaining: projectedCompletion,
        onTrack: projectedEndDate <= endDate,
      } : null,
    });
  } catch (error) {
    console.error("Failed to fetch burndown data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch burndown data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
