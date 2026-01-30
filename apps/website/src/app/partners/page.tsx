import Link from "next/link";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const partnerTypes = [
  {
    title: "Community Partners",
    description:
      "First Nations communities, grassroots organizations, and local groups we work alongside to co-design solutions.",
    examples: "Indigenous land councils, youth justice programs, community cooperatives",
  },
  {
    title: "Research Partners",
    description:
      "Universities and research institutions contributing rigorous evaluation, knowledge, and credibility.",
    examples: "University of the Sunshine Coast, CSIRO, Indigenous research networks",
  },
  {
    title: "Funding Partners",
    description:
      "Philanthropic foundations, government programs, and impact investors supporting our work.",
    examples: "Government innovation funds, philanthropic trusts, social impact investors",
  },
  {
    title: "Delivery Partners",
    description:
      "Organizations that help us implement programs and reach communities we couldn't serve alone.",
    examples: "Service providers, technology partners, creative agencies",
  },
];

const partnershipPrinciples = [
  {
    title: "Community leads",
    description:
      "Partners don't speak for communities. We ensure community voice is centered in all decisions.",
  },
  {
    title: "Shared ownership",
    description:
      "We build toward community ownership of tools, IP, and outcomes. 40% of profits flow back.",
  },
  {
    title: "Transparent reporting",
    description:
      "Partners receive honest updates about progress, challenges, and impact—good and bad.",
  },
  {
    title: "Long-term commitment",
    description:
      "We don't do one-off projects. Partnerships are designed for sustained relationship and impact.",
  },
];

const currentPartnerships = [
  {
    name: "June's Patch",
    description:
      "Healthcare worker wellbeing program with Wishlist community and University of the Sunshine Coast. Prescription to nature for healthcare workers.",
    type: "Research Partnership",
  },
  {
    name: "Orange Sky Australia",
    description:
      "Co-founder Nicholas Marchesi also co-founded Orange Sky. This foundational relationship informs our approach to scaled social impact.",
    type: "Founding Relationship",
  },
];

export default function PartnersPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Partners"
        title="Who we work with"
        description="ACT is built on partnerships. We believe the best work happens through deep collaboration with communities, researchers, funders, and fellow practitioners."
        actions={[
          { label: "Contact Us", href: "/contact" },
          { label: "How We Work", href: "/how-we-work", variant: "outline" },
        ]}
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Our approach
          </p>
          <p>
            We don't do projects 'to' communities—we do them alongside. Every
            partnership begins with listening.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Types"
          title="Partnership categories"
          description="Different ways organizations and communities work with ACT."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {partnerTypes.map((type) => (
            <div
              key={type.title}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {type.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{type.description}</p>
              <p className="text-xs text-[#6B5A45]">
                <span className="font-medium">Examples:</span> {type.examples}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-8">
        <SectionHeading
          eyebrow="Principles"
          title="How we partner"
          description="The commitments we make to every partner relationship."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {partnershipPrinciples.map((principle) => (
            <div
              key={principle.title}
              className="rounded-2xl border border-[#D8C7A5] bg-white/70 p-6 space-y-2"
            >
              <h3 className="font-semibold text-[#2F3E2E]">{principle.title}</h3>
              <p className="text-sm text-[#4D3F33]">{principle.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Featured"
          title="Current partnerships"
          description="A selection of the relationships that shape our work."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {currentPartnerships.map((partnership) => (
            <div
              key={partnership.name}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4"
            >
              <div className="inline-block rounded-full bg-[#E5F4E4] px-3 py-1 text-xs font-medium text-[#2F3E2E]">
                {partnership.type}
              </div>
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {partnership.name}
              </h3>
              <p className="text-sm text-[#4D3F33]">{partnership.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Collaborate"
          title="Work with us"
          description="Interested in partnering? Here's how to get started."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <div className="text-3xl">1</div>
            <h3 className="font-semibold text-[#2F3E2E]">Reach out</h3>
            <p className="text-sm text-[#4D3F33]">
              Contact us with your idea, challenge, or interest. We respond to
              every inquiry and prioritize community-led initiatives.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <div className="text-3xl">2</div>
            <h3 className="font-semibold text-[#2F3E2E]">Explore fit</h3>
            <p className="text-sm text-[#4D3F33]">
              We'll have an initial conversation to understand alignment,
              capacity, and what partnership might look like.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <div className="text-3xl">3</div>
            <h3 className="font-semibold text-[#2F3E2E]">Design together</h3>
            <p className="text-sm text-[#4D3F33]">
              If there's a fit, we co-design the partnership structure, ensuring
              community benefit and mutual accountability.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/contact"
            className="inline-flex rounded-full bg-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]"
          >
            Get in touch
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-[#BFA883] bg-[#F7F0E2]/70 p-8 md:p-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
            Looking to fund regenerative innovation?
          </h2>
          <p className="text-sm text-[#4D3F33]">
            ACT welcomes partnerships with philanthropic foundations, government
            programs, and impact investors aligned with our mission. We're
            transparent about how funds are used and rigorous about impact
            measurement.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3 transition"
          >
            <span>Discuss funding partnership</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
