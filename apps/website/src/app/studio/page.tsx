import Link from "next/link";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const studioCapabilities = [
  {
    title: "Contracted Projects",
    description:
      "We take on mission-aligned projects with partners, applying our methodology to their challenges.",
  },
  {
    title: "Art Portfolio",
    description:
      "Artworks, exhibitions, and commissions that translate change into culture and meaning.",
  },
  {
    title: "Research & Development",
    description:
      "Prototyping new models for governance, land care, and community ownership.",
  },
  {
    title: "Custodian Economy",
    description:
      "Research into Indigenous economic models and place-based regenerative systems.",
  },
];

const satelliteProjects = [
  {
    name: "ACT Farm",
    tagline: "Regenerative residencies on Jinibara Country",
    href: "/farm",
    color: "from-green-50 to-emerald-50",
    borderColor: "border-green-200",
  },
  {
    name: "Empathy Ledger",
    tagline: "Ethical storytelling platform",
    href: "https://empathyledger.com",
    color: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-200",
  },
  {
    name: "JusticeHub",
    tagline: "Youth justice and community support",
    href: "https://justicehub.org.au",
    color: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
  },
  {
    name: "The Harvest",
    tagline: "Community hub and CSA programs",
    href: "/harvest",
    color: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200",
  },
  {
    name: "Goods on Country",
    tagline: "Circular economy for remote communities",
    href: "/goods",
    color: "from-stone-50 to-neutral-50",
    borderColor: "border-stone-200",
  },
  {
    name: "ACT Placemat",
    tagline: "AI business agent and backend services",
    href: "#",
    color: "from-purple-50 to-violet-50",
    borderColor: "border-purple-200",
  },
];

export default function StudioPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Innovation Studio"
        title="The organizational home"
        description="ACT Regenerative Innovation Studio is the central hub from which all our work flows. We house contracted projects, art portfolio, research, and the infrastructure that powers our satellite initiatives."
        actions={[
          { label: "View Projects", href: "/projects" },
          { label: "Our Principles", href: "/principles", variant: "outline" },
        ]}
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            What we do
          </p>
          <p>
            Like a tractor's power take-off, we transfer resources, knowledge, and
            capacity to community-led initiatives—then hand over the keys.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Capabilities"
          title="What the studio does"
          description="The Innovation Studio provides the foundation for all ACT work."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {studioCapabilities.map((capability) => (
            <div
              key={capability.title}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-3"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {capability.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{capability.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-8">
        <SectionHeading
          eyebrow="Ecosystem"
          title="Six satellite projects"
          description="Each project addresses a different need while contributing to the whole. Together, they create an ecosystem of regenerative innovation."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {satelliteProjects.map((project) => (
            <Link
              key={project.name}
              href={project.href}
              className={`group rounded-2xl border ${project.borderColor} bg-gradient-to-br ${project.color} p-6 transition hover:-translate-y-1 hover:shadow-lg`}
            >
              <h3 className="font-semibold text-[#2F3E2E]">{project.name}</h3>
              <p className="mt-1 text-sm text-[#4D3F33]">{project.tagline}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#4CAF50] transition group-hover:gap-3">
                <span>Explore</span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Structure"
          title="How we're organized"
          description="A dual-entity structure that protects community interests while enabling sustainable operations."
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <div className="inline-block rounded-full bg-[#E5F4E4] px-4 py-1 text-xs font-medium text-[#2F3E2E]">
              Not-for-profit
            </div>
            <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              ACT Foundation (CLG)
            </h3>
            <ul className="space-y-2 text-sm text-[#4D3F33]">
              <li>• Charitable status for grants and donations</li>
              <li>• Mission-locked governance</li>
              <li>• Owns majority of ventures</li>
              <li>• Protects community interests</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
            <div className="inline-block rounded-full bg-[#FEF3C7] px-4 py-1 text-xs font-medium text-[#92400E]">
              Social Enterprise
            </div>
            <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              ACT Ventures (Trading)
            </h3>
            <ul className="space-y-2 text-sm text-[#4D3F33]">
              <li>• Generates sustainable revenue</li>
              <li>• 40% profit-sharing to communities</li>
              <li>• Attracts impact investment</li>
              <li>• Creates jobs and opportunities</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Impact"
          title="What we're building toward"
          description="By 2027, we aim to demonstrate that regenerative innovation can scale."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-[#4CAF50]">3+</p>
            <p className="text-sm text-[#4D3F33]">
              Communities independently replicating ACT models
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-[#4CAF50]">117</p>
            <p className="text-sm text-[#4D3F33]">
              Hectares of land under conservation
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-[#4CAF50]">50+</p>
            <p className="text-sm text-[#4D3F33]">
              Jobs created in marginalised communities
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-[#4CAF50]">1000+</p>
            <p className="text-sm text-[#4D3F33]">
              Stories protected through Empathy Ledger
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
