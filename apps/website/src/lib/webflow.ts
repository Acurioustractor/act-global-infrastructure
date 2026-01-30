type WebflowItem = {
  id?: string;
  _id?: string;
  name?: string;
  slug?: string;
  fieldData?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  _draft?: boolean;
  _archived?: boolean;
  [key: string]: unknown;
};

type WebflowCollectionResponse = {
  items: WebflowItem[];
};

export type WebflowImage = {
  url: string;
  alt?: string;
};

export type WebflowNormalizedItem = {
  id: string;
  slug: string;
  name?: string;
  fields: Record<string, unknown>;
  publishedOn?: string;
  isDraft: boolean;
  isArchived: boolean;
};

type CollectionOptions = {
  limit?: number;
  offset?: number;
  includeDrafts?: boolean;
};

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  image: WebflowImage | null;
  publishedAt: string | null;
  author: string;
  authorAvatar: WebflowImage | null;
  theme: string;
  readTime: string;
};

const WEBFLOW_API_BASE = "https://api.webflow.com";
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN ?? "";
const BLOG_COLLECTION_ID =
  process.env.WEBFLOW_BLOG_COLLECTION_ID ??
  process.env.WEBFLOW_COLLECTION_ID ??
  "";

const BLOG_FIELD_MAP = {
  title: "name",
  slug: "slug",
  summary: "post-summary",
  body: "post-body",
  image: "thumbnail-image",
  author: "author",
  authorAvatar: "author-avatar",
  theme: "theme",
  readTime: "read-time",
  publishedAt: "published-on",
};

const ensureToken = () => {
  if (!WEBFLOW_API_TOKEN) {
    throw new Error("Missing WEBFLOW_API_TOKEN env var.");
  }
};

const ensureCollection = () => {
  if (!BLOG_COLLECTION_ID) {
    throw new Error("Missing WEBFLOW_BLOG_COLLECTION_ID env var.");
  }
};

const normalizeFields = (item: WebflowItem) => {
  if (item.fieldData && typeof item.fieldData === "object") {
    return item.fieldData as Record<string, unknown>;
  }

  if (item.fields && typeof item.fields === "object") {
    return item.fields as Record<string, unknown>;
  }

  const reserved = new Set([
    "id",
    "_id",
    "_archived",
    "_draft",
    "name",
    "slug",
    "created-on",
    "updated-on",
    "published-on",
    "cmsLocaleId",
    "lastUpdated",
    "lastPublished",
  ]);

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (!reserved.has(key)) {
      fields[key] = value;
    }
  }

  if (item.slug && !fields.slug) {
    fields.slug = item.slug;
  }

  if (item.name && !fields.name) {
    fields.name = item.name;
  }

  return fields;
};

const normalizeItem = (item: WebflowItem): WebflowNormalizedItem => {
  const fields = normalizeFields(item);
  const id = String(item.id ?? item._id ?? "");
  const slug =
    typeof item.slug === "string"
      ? item.slug
      : typeof fields.slug === "string"
        ? (fields.slug as string)
        : "";
  const name =
    typeof item.name === "string"
      ? item.name
      : typeof fields.name === "string"
        ? (fields.name as string)
        : undefined;
  const publishedOn =
    typeof item["published-on"] === "string"
      ? (item["published-on"] as string)
      : typeof item.publishedOn === "string"
        ? (item.publishedOn as string)
        : undefined;
  return {
    id,
    slug,
    name,
    fields,
    publishedOn,
    isDraft: Boolean(item._draft),
    isArchived: Boolean(item._archived),
  };
};

const getField = (fields: Record<string, unknown>, key: string) =>
  fields[key] ?? fields[key.replace(/_/g, "-")];

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const asImage = (value: unknown): WebflowImage | null => {
  if (!value) return null;
  if (typeof value === "string") return { url: value };
  if (typeof value === "object" && "url" in value) {
    const typed = value as { url?: string; alt?: string };
    if (typed.url) {
      return { url: typed.url, alt: typed.alt };
    }
  }
  return null;
};

const fetchWebflow = async (path: string) => {
  ensureToken();

  const response = await fetch(`${WEBFLOW_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "accept-version": "1.0.0",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Webflow API error ${response.status}: ${path}`);
  }

  return (await response.json()) as WebflowCollectionResponse;
};

export const getCollectionItems = async (
  collectionId: string,
  options: CollectionOptions = {}
) => {
  const { limit = 100, offset = 0, includeDrafts = false } = options;
  const url = new URL(`${WEBFLOW_API_BASE}/collections/${collectionId}/items`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (!includeDrafts) {
    url.searchParams.set("live", "true");
  }

  const data = await fetchWebflow(
    url.pathname + url.search + url.hash
  );
  const items = data.items?.map(normalizeItem) ?? [];

  return includeDrafts
    ? items
    : items.filter((item) => !item.isDraft && !item.isArchived);
};

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  // Return empty array if tokens not configured (build time)
  if (!WEBFLOW_API_TOKEN || !BLOG_COLLECTION_ID) {
    return [];
  }

  ensureCollection();
  const items = await getCollectionItems(BLOG_COLLECTION_ID);

  return items
    .filter((item) => item.slug)
    .map((item) => {
      const fields = item.fields;
      return {
        id: item.id,
        slug: asString(getField(fields, BLOG_FIELD_MAP.slug)),
        title: asString(getField(fields, BLOG_FIELD_MAP.title)) || item.name || "",
        summary: asString(getField(fields, BLOG_FIELD_MAP.summary)),
        body: asString(getField(fields, BLOG_FIELD_MAP.body)),
        image: asImage(getField(fields, BLOG_FIELD_MAP.image)),
        publishedAt:
          asString(getField(fields, BLOG_FIELD_MAP.publishedAt)) ||
          item.publishedOn ||
          null,
        author: asString(getField(fields, BLOG_FIELD_MAP.author)),
        authorAvatar: asImage(getField(fields, BLOG_FIELD_MAP.authorAvatar)),
        theme: asString(getField(fields, BLOG_FIELD_MAP.theme)),
        readTime: asString(getField(fields, BLOG_FIELD_MAP.readTime)),
      };
    })
    .filter((post) => post.slug && post.title);
};

export const getBlogPostBySlug = async (
  slug: string
): Promise<BlogPost | null> => {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
};
