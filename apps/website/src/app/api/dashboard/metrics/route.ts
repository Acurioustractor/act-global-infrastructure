import { NextResponse } from "next/server";
import { REGISTRIES, syncRegistry } from "@/lib/registry-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch data in parallel for performance
    const [syncResults, deploymentsData, formsData] = await Promise.all([
      // Active registries
      Promise.all(
        REGISTRIES.filter((r) => r.enabled).map((registry) => syncRegistry(registry))
      ),
      // Recent deployments (last 24 hours)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/dashboard/deployments`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => []),
      // Form submissions (24h stats)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/dashboard/forms`)
        .then(res => res.ok ? res.json() : { stats: { total24h: 0 } })
        .catch(() => ({ stats: { total24h: 0 } })),
    ]);

    const activeCount = syncResults.filter((r) => r.status === "success").length;

    // Count deployments in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDeployments = Array.isArray(deploymentsData)
      ? deploymentsData.filter((d: any) => new Date(d.createdAt) > oneDayAgo).length
      : 0;

    const metrics = {
      totalProjects: 6, // Empathy Ledger, JusticeHub, Harvest, ACT Farm, Goods, BCV
      activeRegistries: activeCount,
      recentDeployments,
      formSubmissions24h: formsData.stats?.total24h || 0,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
