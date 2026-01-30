import Link from "next/link";

const projects = [
  {
    name: "ACT Farm",
    href: "/farm",
    tagline: "Regenerative residencies on Jinibara Country",
    description:
      "Low-impact eco-residencies and R&D prototyping at Black Cockatoo Valley. Conservation-first experiences for artists, researchers, and curious minds.",
    color: "from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    hoverColor: "hover:border-green-500",
  },
  {
    name: "The Harvest",
    href: "/harvest",
    tagline: "Community hub and CSA programs",
    description:
      "Witta's gathering space for events, workshops, and food programs rooted in shared stewardship and local abundance.",
    color: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200",
    hoverColor: "hover:border-amber-500",
  },
  {
    name: "Empathy Ledger",
    href: "https://empathyledger.com",
    tagline: "Stories that preserve cultural wisdom",
    description:
      "A living archive of community voices, Indigenous knowledge, and stories that carry care, accountability, and shared memory forward.",
    color: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-200",
    hoverColor: "hover:border-teal-500",
  },
  {
    name: "JusticeHub",
    href: "https://justicehub.org.au",
    tagline: "Youth justice and community support",
    description:
      "Service directory, advocacy campaigns, and infrastructure for justice innovation—connecting families to support and amplifying youth voices.",
    color: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:border-blue-500",
  },
  {
    name: "Goods on Country",
    href: "/goods",
    tagline: "Objects that fund the commons",
    description:
      "Small-batch goods, artist editions, and farm produce that support our regenerative work and tell the story of this place.",
    color: "from-stone-50 to-neutral-50",
    borderColor: "border-stone-200",
    hoverColor: "hover:border-stone-500",
  },
  {
    name: "ACT Placemat",
    href: "/projects",
    tagline: "AI business agent and backend services",
    description:
      "Intelligent automation and backend services that power the ACT ecosystem—from relationship management to knowledge synthesis.",
    color: "from-purple-50 to-violet-50",
    borderColor: "border-purple-200",
    hoverColor: "hover:border-purple-500",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="space-y-8">
        <div className="space-y-4">
          <h1 className="font-[var(--font-display)] text-4xl font-semibold leading-tight text-[#2F3E2E] md:text-6xl">
            A regenerative innovation studio on Jinibara Country
          </h1>
          <p className="max-w-3xl text-lg text-[#5A4A3A] md:text-xl">
            We steward Black Cockatoo Valley as a living lab for co-stewardship,
            creative practice, and land care. Through listening, curiosity,
            action, and art—we grow seeds of justice, community, and regeneration.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/about"
            className="rounded-full bg-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]"
          >
            Learn More
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E] transition hover:bg-[#E5F4E4]"
          >
            Get in Touch
          </Link>
        </div>
      </section>

      {/* Our Projects - Main Showcase */}
      <section className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            The ACT Ecosystem
          </p>
          <h2 className="font-[var(--font-display)] text-3xl font-semibold text-[#2F3E2E] md:text-4xl">
            Six interconnected projects
          </h2>
          <p className="max-w-2xl text-base text-[#5A4A3A]">
            Each project addresses a different need while contributing to the whole.
            Together, they create an ecosystem of regenerative innovation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <a
              key={project.name}
              href={project.href}
              className={`group flex flex-col rounded-3xl border ${project.borderColor} bg-gradient-to-br ${project.color} p-8 transition ${project.hoverColor} hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(50,42,31,0.12)]`}
            >
              <div className="flex-1 space-y-3">
                <h3 className="font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E]">
                  {project.name}
                </h3>
                <p className="text-sm font-medium text-[#4CAF50]">
                  {project.tagline}
                </p>
                <p className="text-sm text-[#5A4A3A]">{project.description}</p>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2F3E2E] transition group-hover:gap-3">
                <span>Explore</span>
                <span aria-hidden="true">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Our Approach */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                Our Method
              </p>
              <h2 className="font-[var(--font-display)] text-3xl font-semibold text-[#2F3E2E] md:text-4xl">
                Listen. Curiosity. Action. Art.
              </h2>
            </div>

            <p className="text-base text-[#4D3F33]">
              LCAA is our framework for regenerative innovation. We start by
              listening to place and community, follow curiosity into discovery,
              take action through partnerships and prototypes, then translate
              learning into art that can travel further.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4">
                <h3 className="font-semibold text-[#2F3E2E]">Listen</h3>
                <p className="mt-1 text-sm text-[#5A4A3A]">
                  To place, people, and history
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4">
                <h3 className="font-semibold text-[#2F3E2E]">Curiosity</h3>
                <p className="mt-1 text-sm text-[#5A4A3A]">
                  Ask questions, test ideas
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4">
                <h3 className="font-semibold text-[#2F3E2E]">Action</h3>
                <p className="mt-1 text-sm text-[#5A4A3A]">
                  Build with partners
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5D6BE] bg-white/70 p-4">
                <h3 className="font-semibold text-[#2F3E2E]">Art</h3>
                <p className="mt-1 text-sm text-[#5A4A3A]">
                  Culture and meaning
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="space-y-4 rounded-2xl border border-dashed border-[#BFA883] bg-[#F7F0E2]/70 p-8 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-[#6E5C45]">
                Black Cockatoo Valley
              </p>
              <p className="text-sm text-[#4D3F33]">
                150 acres of threatened species habitat, restoration work, and
                careful exploration
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Involved */}
      <section className="space-y-8">
        <div className="space-y-3">
          <h2 className="font-[var(--font-display)] text-3xl font-semibold text-[#2F3E2E] md:text-4xl">
            Get involved
          </h2>
          <p className="max-w-2xl text-base text-[#5A4A3A]">
            We're building this work alongside community, artists, and partners.
            There are many ways to participate.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
            <h3 className="font-semibold text-[#2F3E2E]">
              Visit or stay at the farm
            </h3>
            <p className="mt-2 text-sm text-[#5A4A3A]">
              Artist residencies, R&D programs, and conservation-focused
              accommodation
            </p>
            <Link
              href="/farm"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3"
            >
              <span>ACT Farm</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
            <h3 className="font-semibold text-[#2F3E2E]">
              Join community programs
            </h3>
            <p className="mt-2 text-sm text-[#5A4A3A]">
              Events, workshops, and CSA shares connecting you to land and
              neighbors
            </p>
            <Link
              href="/harvest"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3"
            >
              <span>The Harvest</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
            <h3 className="font-semibold text-[#2F3E2E]">Support our work</h3>
            <p className="mt-2 text-sm text-[#5A4A3A]">
              Purchase goods that fund the commons or become a partner
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/goods"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3"
              >
                <span>Goods on Country</span>
                <span aria-hidden="true">→</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3"
              >
                <span>Partner with us</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
