import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Project {
  name: string;
  slug: string;
  url: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastDeployed: string;
  registryStatus: "active" | "stale" | "error" | "none";
  githubRepo: string;
  vercelProject: string;
}

/**
 * Check site health with HEAD request
 */
async function checkSiteHealth(url: string): Promise<"healthy" | "degraded" | "down"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) return "healthy";
    if (response.status >= 500) return "down";
    return "degraded";
  } catch (error) {
    return "down";
  }
}

/**
 * Get latest deployment for a project from Vercel
 */
async function getLatestDeployment(projectSlug: string): Promise<string | null> {
  const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

  if (!VERCEL_TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?limit=1&projectId=${projectSlug}&state=READY`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.deployments && data.deployments.length > 0) {
        return new Date(data.deployments[0].created).toISOString();
      }
    }
  } catch (error) {
    console.error(`Failed to fetch deployment for ${projectSlug}:`, error);
  }

  return null;
}

export async function GET() {
  try {
    const projectsConfig: Project[] = [
      {
        name: "Empathy Ledger",
        slug: "empathy-ledger",
        url: "https://empathy-ledger-v2.vercel.app",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/empathy-ledger-v2",
        vercelProject: "acurioustractor/empathy-ledger-v2",
      },
      {
        name: "JusticeHub",
        slug: "justicehub",
        url: "https://justicehub-vert.vercel.app",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/justicehub-platform",
        vercelProject: "acurioustractor/justicehub-platform",
      },
      {
        name: "The Harvest",
        slug: "harvest",
        url: "https://witta-swot-analysis.vercel.app",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/the-harvest-website",
        vercelProject: "acurioustractor/the-harvest-website",
      },
      {
        name: "Goods on Country",
        slug: "goods",
        url: "https://goodsoncountry.netlify.app",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/goods-on-country",
        vercelProject: "",
      },
      {
        name: "ACT Farm",
        slug: "act-farm",
        url: "https://act.farm",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/act-farm",
        vercelProject: "acurioustractor/act-farm",
      },
      {
        name: "ACT Hub",
        slug: "act-hub",
        url: "https://act.place",
        status: "unknown",
        lastDeployed: new Date().toISOString(),
        registryStatus: "active",
        githubRepo: "Acurioustractor/act-hub",
        vercelProject: "acurioustractor/act-hub",
      },
    ];

    // Check health and get deployment times in parallel for all projects
    const projects = await Promise.all(
      projectsConfig.map(async (project) => {
        const [status, lastDeployed] = await Promise.all([
          checkSiteHealth(project.url),
          project.vercelProject ? getLatestDeployment(project.vercelProject) : Promise.resolve(null),
        ]);

        return {
          ...project,
          status,
          lastDeployed: lastDeployed || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
