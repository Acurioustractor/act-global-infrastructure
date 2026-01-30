import type { RegistryFeedItem, RegistryItem, RegistryStatus } from "./types";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string") as string[];
  }
  return undefined;
};

const getValue = (item: RegistryFeedItem, keys: string[]) => {
  for (const key of keys) {
    if (key in item) {
      return item[key];
    }
  }
  return undefined;
};

const normalizeStatus = (value: unknown): RegistryStatus | undefined => {
  const raw = asString(value)?.toLowerCase();
  if (raw === "draft" || raw === "scheduled" || raw === "published" || raw === "archived") {
    return raw;
  }
  return undefined;
};

export const normalizeFeedItem = (
  source: RegistryItem["source"],
  item: RegistryFeedItem
): RegistryItem | null => {
  const sourceId =
    asString(getValue(item, ["id", "source_id", "sourceId"])) ?? "";
  const title =
    asString(getValue(item, ["title", "name"])) ??
    asString(getValue(item, ["headline"])) ??
    "";

  if (!sourceId || !title) {
    return null;
  }

  return {
    source,
    sourceId,
    type: asString(getValue(item, ["type"])) ?? "entry",
    slug: asString(getValue(item, ["slug"])),
    title,
    summary: asString(getValue(item, ["summary", "description", "excerpt"])),
    imageUrl:
      asString(getValue(item, ["image_url", "imageUrl", "image", "thumbnail"])) ??
      asString(getValue(item, ["cover", "cover_image"])),
    canonicalUrl:
      asString(getValue(item, ["canonical_url", "canonicalUrl", "url"])) ??
      asString(getValue(item, ["link"])),
    tags:
      asStringArray(getValue(item, ["tags", "themes", "labels"])) ??
      asStringArray(getValue(item, ["categories"])),
    status: normalizeStatus(getValue(item, ["status"])) ?? "published",
    publishedAt:
      asString(getValue(item, ["published_at", "publishedAt"])) ?? null,
    updatedAt:
      asString(getValue(item, ["updated_at", "updatedAt"])) ?? null,
    raw: item,
  };
};
