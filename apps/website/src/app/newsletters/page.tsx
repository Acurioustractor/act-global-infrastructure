import Link from "next/link";
import { fetchSentBrandEditions } from "../../lib/newsletters";

export const revalidate = 60;

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

export default async function NewslettersPage() {
  const editions = await fetchSentBrandEditions(60);

  return (
    <div className="space-y-16">
      <section className="rounded-[32px] border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.4em] text-[#6B5A45]">
          ACT Newsletter
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
          Field notes, every fortnight
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[#4D3F33] md:text-base">
          What moved across the farm, the studio and the projects. The public
          archive of our fortnightly note.
        </p>
      </section>

      <section className="space-y-4">
        {editions.map((edition) => (
          <Link
            key={edition.editionSlug}
            href={`/newsletters/${edition.editionSlug}`}
            className="group flex flex-col gap-2 rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)] md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                {edition.editionPeriod || "Edition"}
              </span>
              <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {edition.subject}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#6B5A45]">
              {edition.sentAt ? <span>{formatDate(edition.sentAt)}</span> : null}
              <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.3em] text-[#4CAF50]">
                Read
                <span aria-hidden="true">-&gt;</span>
              </span>
            </div>
          </Link>
        ))}
        {editions.length === 0 ? (
          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 text-sm text-[#4D3F33]">
            No editions published yet. The fortnightly note will appear here once
            the first one is sent.
          </div>
        ) : null}
      </section>
    </div>
  );
}
