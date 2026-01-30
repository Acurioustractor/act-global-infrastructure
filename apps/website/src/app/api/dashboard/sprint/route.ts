import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GitHub Projects GraphQL API endpoint for sprint progress
 * Fetches current sprint issues and calculates completion stats
 *
 * Query params:
 *   ?sprint=Sprint%204 - Filter to specific sprint (defaults to Sprint 4)
 *   ?all=true - Show all issues, not just current sprint
 */
export async function GET(request: NextRequest) {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN not configured");
      return NextResponse.json({
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        percentComplete: 0,
        sprintName: "Sprint not configured",
      });
    }

    // GitHub Projects v2 GraphQL query
    // Organization-level project: ACT Ecosystem Development
    const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';

    // Fetch all items with pagination (GitHub limits to 100 per page)
    let allItems: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const query = `
        query($projectId: ID!, $cursor: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 100, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                id
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                  }
                }
                content {
                  ... on Issue {
                    number
                    title
                    state
                    repository {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
      `;

      const response: Response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { projectId: GITHUB_PROJECT_ID, cursor },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GitHub API error:", response.status, errorText);
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const itemsData = data.data?.node?.items;
      const items = itemsData?.nodes || [];

      allItems.push(...items);
      hasNextPage = itemsData?.pageInfo?.hasNextPage || false;
      cursor = itemsData?.pageInfo?.endCursor;
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";
    const currentSprintName = searchParams.get("sprint") || process.env.CURRENT_SPRINT || "Sprint 4";

    // Filter items by sprint (unless showing all)
    const sprintItems = showAll
      ? allItems
      : allItems.filter((item: any) => {
          const sprintField = item.fieldValues?.nodes?.find(
            (fv: any) => fv.field?.name === "Sprint"
          );
          // Handle both text field and single-select field
          const sprintValue = sprintField?.name || sprintField?.text;
          return sprintValue === currentSprintName;
        });

    // Count by Status field
    let todo = 0;
    let inProgress = 0;
    let done = 0;

    sprintItems.forEach((item: any) => {
      const statusField = item.fieldValues?.nodes?.find(
        (fv: any) => fv.field?.name === "Status"
      );

      const status = statusField?.name || "Todo";

      if (status === "Todo" || status === "Backlog") {
        todo++;
      } else if (status === "In Progress") {
        inProgress++;
      } else if (status === "Done" || status === "Closed") {
        done++;
      }
    });

    const total = todo + inProgress + done;
    const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0;

    return NextResponse.json({
      total,
      todo,
      inProgress,
      done,
      percentComplete,
      sprintName: currentSprintName,
    });
  } catch (error) {
    console.error("Failed to fetch sprint progress:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sprint progress",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
