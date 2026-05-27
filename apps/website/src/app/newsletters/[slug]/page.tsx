import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  fetchBrandEditionBySlug,
  fetchSentBrandEditions,
} from "../../../lib/newsletters";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const editions = await fetchSentBrandEditions(200);
    return editions.map((edition) => ({ slug: edition.editionSlug }));
  } catch (error) {
    console.error("Failed to generate static params for newsletters:", error);
    return [];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function NewsletterEditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const edition = await fetchBrandEditionBySlug(slug);

  if (!edition) {
    notFound();
  }

  return (
    <div className="space-y-12">
      <section className="rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <Link
          href="/newsletters"
          className="text-xs uppercase tracking-[0.3em] text-[#4CAF50]"
        >
          Back to newsletter
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
          {edition.subject}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
          {edition.editionPeriod ? <span>{edition.editionPeriod}</span> : null}
          {edition.sentAt ? <span>{formatDate(edition.sentAt)}</span> : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl">
        <article className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 text-sm text-[#4D3F33] md:p-8">
          {edition.bodyMd ? (
            <div className="rich-text prose prose-sm max-w-none">
              <ReactMarkdown>{edition.bodyMd}</ReactMarkdown>
            </div>
          ) : (
            <p>No body content available.</p>
          )}
        </article>
      </section>
    </div>
  );
}
