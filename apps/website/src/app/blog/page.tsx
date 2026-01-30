import Image from "next/image";
import Link from "next/link";
import { fetchContentHubArticles } from "../../lib/empathy-ledger-articles";

export const revalidate = 60;

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof fetchContentHubArticles>> = [];
  try {
    posts = await fetchContentHubArticles({ project: "act-main", limit: 60 });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
  }

  return (
    <div className="space-y-16">
      <section className="rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.4em] text-[#6B5A45]">
          ACT Journal
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
          Stories from the farm and studio
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[#4D3F33] md:text-base">
          Field notes, project updates, and reflections on regenerative practice.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#E1D3BA] bg-white/70 transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)]"
          >
            <div className="relative aspect-[4/3] w-full bg-[#F7F2E8]">
              {post.featuredImageUrl ? (
                <Image
                  src={post.featuredImageUrl}
                  alt={post.featuredImageAlt ?? post.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                  Image placeholder
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                Journal
              </p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#6B5A45]">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#E3D4BA] px-3 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {post.title}
              </h2>
              <p className="text-sm text-[#4D3F33]">
                {post.excerpt || "A story from the ACT Farm."}
              </p>
              {post.authorName ? (
                <div className="flex items-center gap-2 text-xs text-[#6B5A45]">
                  <span>{post.authorName}</span>
                </div>
              ) : null}
              <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#4CAF50]">
                Read more
                <span aria-hidden="true">-&gt;</span>
              </span>
            </div>
          </Link>
        ))}
        {posts.length === 0 ? (
          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 text-sm text-[#4D3F33]">
            No posts yet. Publish your first story in Empathy Ledger to see it here.
          </div>
        ) : null}
      </section>
    </div>
  );
}
