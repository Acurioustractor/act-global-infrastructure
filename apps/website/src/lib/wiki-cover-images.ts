/**
 * Cover image lookup for wiki-rendered project cards.
 *
 * Uses the public EL Content Hub articles endpoint:
 *   GET /api/v1/content-hub/articles?project=<slug>&limit=1
 *
 * Returns the latest article's featuredImageUrl as the cover. The
 * endpoint is unauthenticated for reads in production (verified
 * 2026-05-09: returns 200 with full image URLs from
 * yvnuayzslukamizrlhwb.supabase.co storage).
 *
 * Earlier draft hit `/api/v1/act-projects/<slug>/featured` — that
 * endpoint does not exist in EL v2 and returned 401, which is why
 * the original ship needed env-var "fix". The real fix is the URL.
 *
 * Never throws. If fetch fails for any reason, the entry is `null`
 * and the card falls back to its gradient. The homepage always renders.
 */
import { fetchContentHubArticles } from "./empathy-ledger-articles";

export type CoverImage = {
  url: string;
  alt: string;
  /** Article slug — useful for click-through later if we want it */
  articleSlug?: string;
};

export async function getProjectCoverImages(
  slugs: string[]
): Promise<Map<string, CoverImage | null>> {
  const out = new Map<string, CoverImage | null>();
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const articles = await fetchContentHubArticles({ project: slug, limit: 1 });
        const article = articles[0];
        if (article?.featuredImageUrl) {
          out.set(slug, {
            url: article.featuredImageUrl,
            alt: article.featuredImageAlt || article.title || slug,
            articleSlug: article.slug,
          });
          return;
        }
        out.set(slug, null);
      } catch {
        // Fetch failed (network, env, EL down) — graceful null
        out.set(slug, null);
      }
    })
  );
  return out;
}
