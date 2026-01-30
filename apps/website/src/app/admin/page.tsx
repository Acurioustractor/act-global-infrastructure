import Link from "next/link";

export default function AdminHomePage() {
  return (
    <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
        Welcome to the content studio
      </h2>
      <p className="mt-2 text-sm text-[#4D3F33]">
        Choose where you want to work.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/ecosystem"
          className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
        >
          Ecosystem Dashboard
        </Link>
        <Link
          href="/vision"
          className="rounded-full bg-[#2F3E2E] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
        >
          Vision Book
        </Link>
        <Link
          href="/engine"
          className="rounded-full bg-[#1e1e1e] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white border border-gray-700"
        >
          Neural Engine
        </Link>
        <Link
          href="/admin/content"
          className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
        >
          Manage content
        </Link>
        <Link
          href="/admin/media"
          className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
        >
          Media library
        </Link>
        <Link
          href="/media-lab"
          className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
        >
          Media lab
        </Link>
      </div>
    </section>
  );
}
