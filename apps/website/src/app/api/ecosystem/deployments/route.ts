import { NextResponse } from 'next/server';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_3aAWFPdRQ92RkkJ2LehJ209u';

// Map of repo names to Vercel project IDs
const VERCEL_PROJECTS: Record<string, string> = {
  'act-regenerative-studio': 'prj_Hz7eQOE4Zh1Dw9O6OZDn6ExRuWuk',
  'empathy-ledger-v2': 'prj_empathy-ledger-v2', // Update with actual project ID
  'justicehub-platform': 'prj_justicehub', // Update with actual project ID
  // Add other projects as they're deployed to Vercel
};

interface DeploymentData {
  repo: string;
  status: 'ready' | 'error' | 'building' | 'queued' | 'canceled' | 'unknown';
  url: string | null;
  createdAt: number;
  environment: string;
}

export async function GET() {
  if (!VERCEL_TOKEN) {
    return NextResponse.json(
      { error: 'VERCEL_TOKEN not configured' },
      { status: 500 }
    );
  }

  try {
    const deployments: DeploymentData[] = [];

    // Fetch latest deployment for each project
    for (const [repo, projectId] of Object.entries(VERCEL_PROJECTS)) {
      try {
        const response = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&teamId=${VERCEL_TEAM_ID}`,
          {
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
            },
            next: { revalidate: 60 }, // Cache for 1 minute
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch deployment for ${repo}:`, response.statusText);
          deployments.push({
            repo,
            status: 'unknown',
            url: null,
            createdAt: Date.now(),
            environment: 'production',
          });
          continue;
        }

        const data = await response.json();
        const latestDeployment = data.deployments?.[0];

        if (latestDeployment) {
          deployments.push({
            repo,
            status: latestDeployment.state || 'unknown',
            url: latestDeployment.url ? `https://${latestDeployment.url}` : null,
            createdAt: latestDeployment.createdAt || Date.now(),
            environment: latestDeployment.target || 'production',
          });
        } else {
          deployments.push({
            repo,
            status: 'unknown',
            url: null,
            createdAt: Date.now(),
            environment: 'production',
          });
        }
      } catch (error) {
        console.error(`Error fetching deployment for ${repo}:`, error);
        deployments.push({
          repo,
          status: 'unknown',
          url: null,
          createdAt: Date.now(),
          environment: 'production',
        });
      }
    }

    return NextResponse.json({ deployments });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployments' },
      { status: 500 }
    );
  }
}
