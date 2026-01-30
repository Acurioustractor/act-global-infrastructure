/**
 * Registry Sync System
 * Aggregates content from all ACT project registries
 */

import { withCache } from './redis';

export interface RegistryEntry {
  id: string;
  type: "story" | "event" | "business" | "resource" | "person";
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  publishedAt?: string;
  tags?: string[];
  source: string;
  sourceUrl: string;
  metadata?: Record<string, any>;
}

export interface RegistryConfig {
  name: string;
  slug: string;
  url: string;
  token?: string;
  enabled: boolean;
}

export const REGISTRIES: RegistryConfig[] = [
  {
    name: "Empathy Ledger",
    slug: "empathy-ledger",
    url: process.env.EMPATHY_LEDGER_REGISTRY_URL || "https://empathy-ledger-v2.vercel.app/api/registry",
    token: process.env.EMPATHY_LEDGER_API_TOKEN,
    enabled: true,
  },
  {
    name: "JusticeHub",
    slug: "justicehub",
    url: process.env.JUSTICEHUB_REGISTRY_URL || "https://justicehub-vert.vercel.app/api/registry",
    token: process.env.JUSTICEHUB_API_TOKEN,
    enabled: true,
  },
  {
    name: "Goods on Country",
    slug: "goods",
    url: process.env.GOODS_REGISTRY_URL || "https://goodsoncountry.netlify.app/registry.json",
    enabled: true,
  },
  {
    name: "The Harvest",
    slug: "harvest",
    url: process.env.HARVEST_REGISTRY_URL || "https://witta-swot-analysis.vercel.app/api/registry",
    token: process.env.HARVEST_API_TOKEN,
    enabled: true,
  },
  {
    name: "ACT Farm",
    slug: "act-farm",
    url: process.env.ACT_TRACTOR_REGISTRY_URL || "http://localhost:3000/api/registry",
    token: process.env.ACT_TRACTOR_API_TOKEN,
    enabled: true,
  },
];

export interface SyncResult {
  registry: string;
  status: "success" | "error" | "pending";
  itemCount: number;
  lastSync: string;
  errorMessage?: string;
}

export async function syncRegistry(config: RegistryConfig): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const response = await fetch(config.url, {
      method: "GET",
      headers,
      next: { revalidate: parseInt(process.env.REGISTRY_REVALIDATE_SECONDS || "60") },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const entries: RegistryEntry[] = Array.isArray(data) ? data : data.items || [];

    return {
      registry: config.name,
      status: "success",
      itemCount: entries.length,
      lastSync: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to sync ${config.name}:`, error);
    return {
      registry: config.name,
      status: "error",
      itemCount: 0,
      lastSync: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncAllRegistries(): Promise<SyncResult[]> {
  const activeRegistries = REGISTRIES.filter((r) => r.enabled);

  const results = await Promise.allSettled(
    activeRegistries.map((registry) => syncRegistry(registry))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        registry: activeRegistries[index].name,
        status: "error" as const,
        itemCount: 0,
        lastSync: new Date().toISOString(),
        errorMessage: result.reason?.message || "Unknown error",
      };
    }
  });
}

export async function fetchRegistryContent(config: RegistryConfig): Promise<RegistryEntry[]> {
  // Use Redis cache with 5-minute TTL
  return withCache(
    `registry:${config.slug}`,
    async () => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (config.token) {
          headers["Authorization"] = `Bearer ${config.token}`;
        }

        const response = await fetch(config.url, {
          method: "GET",
          headers,
          next: { revalidate: parseInt(process.env.REGISTRY_REVALIDATE_SECONDS || "60") },
        });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawEntries = Array.isArray(data) ? data : data.items || [];

    // Normalize entries to common format
        return rawEntries.map((entry: any) => ({
          id: entry.id || entry.slug || entry.uuid,
          type: entry.type || "resource",
          title: entry.title || entry.name || "Untitled",
          description: entry.description || entry.summary,
          url: entry.url || entry.link,
          imageUrl: entry.image || entry.imageUrl || entry.cover,
          publishedAt: entry.publishedAt || entry.createdAt || entry.date,
          tags: entry.tags || entry.categories || [],
          source: config.name,
          sourceUrl: config.url,
          metadata: entry,
        }));
      } catch (error) {
        console.error(`Failed to fetch ${config.name} content:`, error);
        return [];
      }
    },
    300 // 5-minute cache TTL
  );
}
