/**
 * Cover image lookup for wiki-rendered project cards.
 *
 * Layers on top of the existing Empathy Ledger featured-content
 * endpoint (`/api/v1/act-projects/<slug>/featured`). For each project
 * slug, returns the first story's featured image OR the first
 * storyteller's portrait OR null.
 *
 * Never throws. If the EL backend env var is missing, fetch fails,
 * or no featured content exists, the entry is `null` and the card
 * falls back to its gradient. The homepage always renders.
 */
import { getFeaturedContentForProject } from "./empathy-ledger-featured";

export type CoverImage = {
  url: string;
  alt: string;
  source: "story" | "storyteller";
};

export async function getProjectCoverImages(
  slugs: string[]
): Promise<Map<string, CoverImage | null>> {
  const out = new Map<string, CoverImage | null>();
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const resp = await getFeaturedContentForProject(slug, { limit: 1 });
        // Featured-content schema is loose between EL versions — use any
        // to unblock; actual fields probed at runtime.
        const story = (resp?.featured as any)?.stories?.[0];
        const storyImage = story?.featured_image_url || story?.image_url;
        if (storyImage) {
          out.set(slug, {
            url: storyImage,
            alt: story.story_title || slug,
            source: "story",
          });
          return;
        }
        const teller = (resp?.featured as any)?.storytellers?.[0];
        if (teller?.profile_image_url) {
          out.set(slug, {
            url: teller.profile_image_url,
            alt: teller.display_name || teller.full_name || slug,
            source: "storyteller",
          });
          return;
        }
        out.set(slug, null);
      } catch {
        // EL backend unreachable or env missing — graceful null
        out.set(slug, null);
      }
    })
  );
  return out;
}
