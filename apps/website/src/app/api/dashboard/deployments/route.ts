import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
    let deployments: any[] = [];

    if (VERCEL_TOKEN) {
      // Personal account - no teamId needed
      const response = await fetch(
        `https://api.vercel.com/v6/deployments?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        deployments = data.deployments.map((d: any) => ({
          id: d.uid,
          project: d.name,
          status: d.state, // ready, building, error, canceled
          createdAt: new Date(d.created).toISOString(),
          url: d.url,
          commitMessage: d.meta?.githubCommitMessage || "",
          commitSha: d.meta?.githubCommitSha || "",
          branch: d.meta?.githubCommitRef || "",
          duration: d.buildingAt ? Date.now() - d.buildingAt : undefined,
        }));
      } else {
        console.error("Vercel API error:", response.status, await response.text());
      }
    } else {
      console.warn("VERCEL_ACCESS_TOKEN not set - returning empty deployments");
    }

    return NextResponse.json(deployments);
  } catch (error) {
    console.error("Failed to fetch deployments:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    );
  }
}
