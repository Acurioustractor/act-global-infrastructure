import Link from "next/link";

export const metadata = {
  title: "Goods on Country | A Curious Tractor",
  description:
    "Objects and offerings that fund the commons. Supporting regenerative work through thoughtful commerce.",
};

export default function GoodsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E4D7BF] bg-white px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
          <span>ACT Ecosystem</span>
        </div>

        <h1 className="font-[var(--font-display)] text-4xl font-semibold leading-tight text-[#2F3E2E] md:text-6xl">
          Goods on Country
        </h1>

        <p className="max-w-2xl text-lg text-[#4D3F33]">
          Objects and offerings that fund the commons. Supporting regenerative
          work through thoughtful commerce.
        </p>
      </section>

      {/* About */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <div className="space-y-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
            Funding the future through thoughtful goods
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm text-[#4D3F33] md:text-base">
                Every purchase supports our regenerative work—from land
                stewardship to community programs, artist residencies to justice
                innovation.
              </p>
              <p className="text-sm text-[#4D3F33] md:text-base">
                Our goods are made with intention, sourced with care, and
                designed to last. Small-batch, high-quality offerings that tell
                the story of place and the people who tend it.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#2F3E2E]">
                What we offer
              </h3>
              <ul className="space-y-2 text-sm text-[#4D3F33]">
                <li className="flex items-start gap-2">
                  <span className="text-[#4CAF50]">→</span>
                  <span>Farm produce and preserves from Black Cockatoo Valley</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4CAF50]">→</span>
                  <span>Artist editions and limited prints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4CAF50]">→</span>
                  <span>Books, zines, and publications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4CAF50]">→</span>
                  <span>Workshop experiences and memberships</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Visit Store CTA */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-white p-8 text-center md:p-12">
        <div className="space-y-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
            Visit the Goods on Country store
          </h2>
          <p className="mx-auto max-w-xl text-sm text-[#5A4A3A]">
            Browse our current offerings and learn more about how each purchase
            supports the ACT ecosystem.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://goodsoncountry.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]"
            >
              Visit Store
            </a>
            <Link
              href="/projects"
              className="rounded-full border border-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E] transition hover:bg-[#E5F4E4]"
            >
              Explore All Projects
            </Link>
          </div>
        </div>
      </section>

      {/* How Revenue Supports the Ecosystem */}
      <section className="space-y-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
          How your purchase makes an impact
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              project: "ACT Farm",
              impact: "Land stewardship and conservation",
            },
            {
              project: "The Harvest",
              impact: "Community programs and CSA shares",
            },
            {
              project: "Empathy Ledger",
              impact: "Story preservation and cultural work",
            },
            {
              project: "JusticeHub",
              impact: "Youth justice and advocacy",
            },
          ].map((item) => (
            <div
              key={item.project}
              className="rounded-2xl border border-[#E3D4BA] bg-white p-6"
            >
              <h3 className="font-semibold text-[#2F3E2E]">{item.project}</h3>
              <p className="mt-2 text-sm text-[#5A4A3A]">{item.impact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F4E8DD] via-[#E6CBB7] to-[#D1A788] p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
              Get notified about new offerings
            </h2>
            <p className="mt-4 text-sm text-[#5A4A3A]">
              Be the first to know when we release new goods, artist editions,
              and seasonal offerings.
            </p>
          </div>

          <div className="flex items-center">
            <form className="flex w-full gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 rounded border border-[#E4D7BF] bg-white px-4 py-3 text-sm text-[#2F3E2E] placeholder:text-[#B8A88A] focus:border-[#4CAF50] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded bg-[#4CAF50] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3D9143]"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
