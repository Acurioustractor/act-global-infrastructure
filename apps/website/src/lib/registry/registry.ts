import { registrySources } from "./sources";
import { normalizeFeedItem } from "./normalize";
import type { RegistryFetchResult, RegistryItem, RegistrySourceConfig } from "./types";
import { getSupabaseServerClient } from "../supabase/server";

const revalidateSeconds = Number(
  process.env.REGISTRY_REVALIDATE_SECONDS ?? "60"
);

const buildFeedUrl = (source: RegistrySourceConfig) => {
  if (source.feedUrl) {
    return source.feedUrl;
  }

  if (!source.baseUrl) {
    return null;
  }

  const trimmedBase = source.baseUrl.replace(/\/$/, "");
  const path = source.feedPath ?? "/api/registry";

  return `${trimmedBase}${path.startsWith("/") ? "" : "/"}${path}`;
};

const buildHeaders = (source: RegistrySourceConfig) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (source.token) {
    if (source.authType === "api-key") {
      headers["x-api-key"] = source.token;
    } else if (source.authType === "bearer") {
      headers.Authorization = `Bearer ${source.token}`;
    }
  }

  return headers;
};

const fetchSourceItems = async (source: RegistrySourceConfig) => {
  const url = buildFeedUrl(source);
  if (!url) {
    return [] as RegistryItem[];
  }

  const response = await fetch(url, {
    headers: buildHeaders(source),
    next: { revalidate: revalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(`Registry fetch failed (${response.status}) ${url}`);
  }

  const data = (await response.json()) as { items?: unknown[] };
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .map((item) => normalizeFeedItem(source.id, item as Record<string, unknown>))
    .filter((item): item is RegistryItem => Boolean(item));
};

export const fetchRegistryFromSources = async (): Promise<RegistryFetchResult> => {
  const results: RegistryFetchResult = { items: [], errors: [] };

  for (const source of registrySources) {
    if (!source.enabled) {
      continue;
    }

    try {
      const items = await fetchSourceItems(source);
      results.items.push(...items);
    } catch (error) {
      results.errors.push({
        source: source.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
};

export const listRegistryFromSupabase = async (filters: {
  source?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const client = getSupabaseServerClient();
  if (!client) {
    return null;
  }

  let query = client.from("content_registry").select("*");

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (typeof filters.offset === "number") {
    const limit = filters.limit ?? 20;
    query = query.range(filters.offset, filters.offset + limit - 1);
  } else if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

export const syncRegistryToSupabase = async () => {
  const client = getSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase service role not configured.");
  }

  const { items, errors } = await fetchRegistryFromSources();

  const sourcePayload = registrySources
    .filter((source) => source.enabled)
    .map((source) => ({
      id: source.id,
      label: source.label,
      description: `${source.label} registry source`,
      base_url: source.baseUrl ?? source.feedUrl ?? null,
      status: "active",
    }));

  if (sourcePayload.length > 0) {
    const { error: sourceError } = await client
      .from("content_sources")
      .upsert(sourcePayload, { onConflict: "id" });

    if (sourceError) {
      throw sourceError;
    }
  }

  if (items.length === 0) {
    return { inserted: 0, errors };
  }

  const registryPayload = items.map((item) => ({
    source: item.source,
    source_id: item.sourceId,
    type: item.type,
    slug: item.slug ?? null,
    title: item.title,
    summary: item.summary ?? null,
    image_url: item.imageUrl ?? null,
    canonical_url: item.canonicalUrl ?? null,
    tags: item.tags ?? null,
    status: item.status ?? "published",
    published_at: item.publishedAt ?? null,
    raw: item.raw ?? {},
  }));

  const { data, error } = await client
    .from("content_registry")
    .upsert(registryPayload, { onConflict: "source,source_id" })
    .select("id");

  if (error) {
    throw error;
  }

  return { inserted: data?.length ?? 0, errors };
};
