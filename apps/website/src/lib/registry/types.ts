export type RegistrySourceId =
  | "curious_tractor"
  | "goods"
  | "justicehub"
  | "empathy_ledger"
  | "harvest";

export type RegistryStatus = "draft" | "scheduled" | "published" | "archived";

export type RegistryItem = {
  source: RegistrySourceId;
  sourceId: string;
  type: string;
  slug?: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  canonicalUrl?: string;
  tags?: string[];
  status?: RegistryStatus;
  publishedAt?: string | null;
  updatedAt?: string | null;
  raw?: Record<string, unknown>;
};

export type RegistryFeedItem = Record<string, unknown>;

export type RegistrySourceConfig = {
  id: RegistrySourceId;
  label: string;
  feedUrl?: string;
  baseUrl?: string;
  feedPath?: string;
  token?: string;
  authType?: "bearer" | "api-key" | "none";
  enabled: boolean;
};

export type RegistryFetchResult = {
  items: RegistryItem[];
  errors: { source: RegistrySourceId; message: string }[];
};
