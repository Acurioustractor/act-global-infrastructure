type ContentHubArticle = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  excerpt?: string | null;
  authorName?: string | null;
  articleType?: string | null;
  primaryProject?: string | null;
  publishedAt?: string | null;
  tags?: string[];
  themes?: string[];
  visibility?: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
};

type ContentHubArticleDetail = ContentHubArticle & {
  content?: string | null;
  authorBio?: string | null;
  relatedProjects?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
};

const EMPATHY_LEDGER_URL =
  process.env.EMPATHY_LEDGER_URL ||
  process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL ||
  'http://localhost:3030';

function buildHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.EMPATHY_LEDGER_API_KEY) {
    headers['X-API-Key'] = process.env.EMPATHY_LEDGER_API_KEY;
  }
  return headers;
}

export async function fetchContentHubArticles(params: {
  project?: string;
  limit?: number;
}): Promise<ContentHubArticle[]> {
  const searchParams = new URLSearchParams();
  if (params.project) searchParams.set('project', params.project);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const response = await fetch(
    `${EMPATHY_LEDGER_URL}/api/v1/content-hub/articles?${searchParams.toString()}`,
    {
      headers: buildHeaders(),
      next: { revalidate: 60 },
    }
  );

  if (!response.ok) {
    throw new Error(`Empathy Ledger API error: ${response.status}`);
  }

  const data = await response.json();
  return data.articles || [];
}

export async function fetchContentHubArticleBySlug(
  slug: string
): Promise<ContentHubArticleDetail | null> {
  const response = await fetch(
    `${EMPATHY_LEDGER_URL}/api/v1/content-hub/articles/${slug}`,
    {
      headers: buildHeaders(),
      next: { revalidate: 60 },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Empathy Ledger API error: ${response.status}`);
  }

  return response.json();
}
