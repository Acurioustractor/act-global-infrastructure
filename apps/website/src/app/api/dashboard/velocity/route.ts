import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Velocity Chart API
 * Returns velocity data for the last 5 completed sprints
 *
 * Response format:
 * {
 *   sprints: [
 *     { sprint: "Sprint 1", completed: 12, total: 15 },
 *     { sprint: "Sprint 2", completed: 10, total: 12 },
 *     ...
 *   ],
 *   averageVelocity: 11.2
 * }
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Query sprint_velocity view for completed sprints
    const { data: velocityData, error } = await supabase
      .from('sprint_velocity')
      .select('*')
      .order('sprint_number', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Velocity query error:", error);
      // Return mock data for development if no snapshots exist yet
      return NextResponse.json({
        sprints: [],
        averageVelocity: 0,
        note: "No sprint snapshots available yet. Configure GitHub Action to populate data.",
      });
    }

    if (!velocityData || velocityData.length === 0) {
      // No completed sprints yet - return empty state
      return NextResponse.json({
        sprints: [],
        averageVelocity: 0,
        note: "No completed sprints tracked yet.",
      });
    }

    // Transform data for chart
    const sprints = velocityData.map((s: any) => ({
      sprint: s.sprint_name,
      sprintNumber: s.sprint_number,
      completed: s.completed_issues,
      total: s.total_issues,
      velocity: s.velocity_per_sprint,
      completionRate: s.total_issues > 0
        ? Math.round((s.completed_issues / s.total_issues) * 100)
        : 0,
    }));

    // Calculate average velocity across sprints
    const totalVelocity = sprints.reduce((sum, s) => sum + s.velocity, 0);
    const averageVelocity = sprints.length > 0
      ? Math.round((totalVelocity / sprints.length) * 10) / 10
      : 0;

    // Reverse to show oldest first (left to right on chart)
    sprints.reverse();

    return NextResponse.json({
      sprints,
      averageVelocity,
      sprintCount: sprints.length,
    });
  } catch (error) {
    console.error("Failed to fetch velocity data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch velocity data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
