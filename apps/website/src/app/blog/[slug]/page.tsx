import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  fetchContentHubArticleBySlug,
  fetchContentHubArticles,
} from "../../../lib/empathy-ledger-articles";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const posts = await fetchContentHubArticles({ project: "act-main", limit: 200 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    console.error('Failed to generate static params for blog posts:', error);
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchContentHubArticleBySlug(slug);

  if (!post) {
    notFound();
  }

  const content = post.content || '';
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  return (
    <div className="space-y-12">
      <section className="rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <Link
          href="/blog"
          className="text-xs uppercase tracking-[0.3em] text-[#4CAF50]"
        >
          Back to journal
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
          {post.title}
        </h1>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#6B5A45]">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#E3D4BA] px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {post.excerpt ? (
          <p className="mt-4 max-w-2xl text-sm text-[#4D3F33] md:text-base">
            {post.excerpt}
          </p>
        ) : null}
        {post.authorName ? (
          <div className="mt-5 flex items-center gap-3 text-xs text-[#6B5A45]">
            <span>{post.authorName}</span>
          </div>
        ) : null}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 text-sm text-[#4D3F33]">
          {content ? (
            <div className="rich-text prose prose-sm max-w-none">
              {looksLikeHtml ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <ReactMarkdown>{content}</ReactMarkdown>
              )}
            </div>
          ) : (
            <p>No body content available.</p>
          )}
        </article>
        <aside className="space-y-6">
          <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Featured image
            </p>
            <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F7F2E8]">
              {post.featuredImageUrl ? (
                <Image
                  src={post.featuredImageUrl}
                  alt={post.featuredImageAlt ?? post.title}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                  Image placeholder
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-5 text-sm text-[#4D3F33]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Share
            </p>
            <p className="mt-3">
              Invite collaborators to read and respond to this field note.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
            >
              Start a conversation
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
