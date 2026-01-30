import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health Matrix API
 * Comprehensive health indicators for all 6 ACT ecosystem projects
 *
 * Returns matrix of: Project × [Deployment, HTTP, Database, Registry Sync]
 */
export async function GET() {
  try {
    // Fetch all health data in parallel
    const [projectsData, deploymentsData, registriesData] = await Promise.all([
      // Site health (HTTP status)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/dashboard/projects`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => []),
      // Deployment status
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/dashboard/deployments`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => []),
      // Registry sync status
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/dashboard/registries`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => []),
    ]);

    // Build health matrix
    const projects = [
      {
        name: "Empathy Ledger",
        slug: "empathy-ledger-v2",
        vercelProject: "empathy-ledger-v2",
        hasRegistry: true,
        registryName: "Empathy Ledger Registry",
      },
      {
        name: "JusticeHub",
        slug: "justicehub-platform",
        vercelProject: "justicehub-platform",
        hasRegistry: false,
      },
      {
        name: "The Harvest",
        slug: "harvest-community-hub",
        vercelProject: "harvest-community-hub",
        hasRegistry: false,
      },
      {
        name: "ACT Farm",
        slug: "act-farm",
        vercelProject: "act-farm",
        hasRegistry: false,
      },
      {
        name: "Goods",
        slug: "goods-asset-tracker",
        vercelProject: "goods-asset-tracker",
        hasRegistry: false,
      },
      {
        name: "ACT Studio",
        slug: "act-regenerative-studio",
        vercelProject: "act-regenerative-studio",
        hasRegistry: false,
      },
    ];

    const matrix = projects.map((project) => {
      // Find HTTP health status
      const projectHealth = Array.isArray(projectsData)
        ? projectsData.find((p: any) => p.name === project.name || p.slug === project.slug)
        : null;

      // Find latest deployment
      const latestDeployment = Array.isArray(deploymentsData)
        ? deploymentsData.find((d: any) =>
            d.project === project.vercelProject || d.project.includes(project.slug)
          )
        : null;

      // Find registry status
      const registryStatus = project.hasRegistry && Array.isArray(registriesData)
        ? registriesData.find((r: any) =>
            r.name?.includes(project.registryName || project.name)
          )
        : null;

      // Calculate health indicators
      return {
        project: project.name,
        slug: project.slug,
        indicators: {
          deployment: {
            status: latestDeployment
              ? latestDeployment.status === "READY" || latestDeployment.status === "ready"
                ? "healthy"
                : latestDeployment.status === "ERROR"
                ? "down"
                : "degraded"
              : "unknown",
            lastDeployed: latestDeployment?.createdAt || null,
            age: latestDeployment?.createdAt
              ? getAgeInHours(latestDeployment.createdAt)
              : null,
          },
          http: {
            status: projectHealth?.status || "unknown",
            url: projectHealth?.url || null,
          },
          database: {
            // All projects use shared Supabase - check if Supabase is responding
            status: projectsData.length > 0 ? "healthy" : "unknown",
            shared: true,
          },
          registry: project.hasRegistry
            ? {
                status: registryStatus?.status || "unknown",
                lastSync: registryStatus?.lastSync || null,
                enabled: registryStatus?.enabled || false,
              }
            : null,
        },
        overallHealth: calculateOverallHealth({
          deployment: latestDeployment
            ? latestDeployment.status === "READY" || latestDeployment.status === "ready"
              ? "healthy"
              : "degraded"
            : "unknown",
          http: projectHealth?.status || "unknown",
          database: projectsData.length > 0 ? "healthy" : "unknown",
          registry: project.hasRegistry
            ? registryStatus?.status || "unknown"
            : "n/a",
        }),
      };
    });

    return NextResponse.json({
      matrix,
      timestamp: new Date().toISOString(),
      healthySystems: matrix.filter((p) => p.overallHealth === "healthy").length,
      totalSystems: matrix.length,
    });
  } catch (error) {
    console.error("Failed to fetch health matrix:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch health matrix",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getAgeInHours(timestamp: string): number {
  const now = new Date();
  const deployed = new Date(timestamp);
  return Math.round((now.getTime() - deployed.getTime()) / (1000 * 60 * 60));
}

function calculateOverallHealth(indicators: Record<string, string>): "healthy" | "degraded" | "down" | "unknown" {
  const statuses = Object.values(indicators).filter((s) => s !== "n/a");

  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.every((s) => s === "healthy")) return "healthy";
  if (statuses.includes("unknown")) return "unknown";

  return "healthy";
}
