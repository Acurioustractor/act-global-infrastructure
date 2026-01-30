import { NextResponse } from "next/server";
import {
  fetchRegistryFromSources,
  listRegistryFromSupabase,
  syncRegistryToSupabase,
} from "../../../lib/registry/registry";

const parseNumber = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const resolveStatus = (value: string | null) => {
  if (!value || value === "all") return undefined;
  return value;
};

const requireSyncToken = (request: Request) => {
  const expectedToken = process.env.REGISTRY_SYNC_TOKEN;
  if (!expectedToken) {
    return null;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  const fallbackToken = request.headers.get("x-registry-token") ?? "";
  const providedToken = headerToken || fallbackToken;

  if (!providedToken || providedToken !== expectedToken) {
    return "Invalid sync token.";
  }

  return null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const status = resolveStatus(url.searchParams.get("status"));
  const limit = parseNumber(url.searchParams.get("limit"));
  const offset = parseNumber(url.searchParams.get("offset"));
  const fresh = url.searchParams.get("fresh") === "true";

  try {
    if (!fresh) {
      const supabaseData = await listRegistryFromSupabase({
        source,
        type,
        status,
        limit,
        offset,
      });

      if (supabaseData) {
        return NextResponse.json({
          source: "supabase",
          items: supabaseData,
          count: supabaseData.length,
        });
      }
    }

    const { items, errors } = await fetchRegistryFromSources();

    return NextResponse.json({
      source: "remote",
      items,
      count: items.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = requireSyncToken(request);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  try {
    const result = await syncRegistryToSupabase();

    return NextResponse.json({
      status: "ok",
      inserted: result.inserted,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
