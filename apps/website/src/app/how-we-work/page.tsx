import Link from "next/link";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const workStyles = [
  {
    title: "Partnership First",
    description:
      "We don't do projects 'to' communities—we do them alongside. Every partnership begins with listening, and communities lead the direction.",
  },
  {
    title: "Prototype Quickly",
    description:
      "We build rough versions fast, test with real users, learn, iterate. Perfection is the enemy of progress.",
  },
  {
    title: "Open by Default",
    description:
      "Our tools, code, and learnings are designed to be shared. Forkable IP means communities can take what works and make it their own.",
  },
  {
    title: "Sunset Clauses",
    description:
      "Every project includes a plan for handover or wind-down. We design for our own obsolescence.",
  },
];

const rhythms = [
  {
    title: "Weekly",
    items: [
      "Studio sync for active projects",
      "Community partner check-ins",
      "Error monitoring and system health",
    ],
  },
  {
    title: "Monthly",
    items: [
      "Relationship health review",
      "Project retrospectives",
      "Knowledge sharing sessions",
    ],
  },
  {
    title: "Quarterly",
    items: [
      "Impact assessment",
      "Partner advisory meetings",
      "Strategic planning",
    ],
  },
  {
    title: "Annually",
    items: [
      "Community accountability report",
      "Profit-sharing distribution",
      "Long-term vision review",
    ],
  },
];

const collaborationTypes = [
  {
    title: "R&D Residencies",
    description:
      "Accommodation and prototyping space at Black Cockatoo Valley for artists, researchers, and innovators working on aligned projects.",
    cta: "Learn about residencies",
    href: "/farm",
  },
  {
    title: "Project Partnerships",
    description:
      "Deep collaboration on specific initiatives where ACT provides methodology, infrastructure, and network while partners bring community relationships and domain expertise.",
    cta: "Contact us",
    href: "/contact",
  },
  {
    title: "Infrastructure Access",
    description:
      "Use of ACT's technical stack, tools, and platforms for aligned organizations—from Empathy Ledger's consent framework to JusticeHub's program registry.",
    cta: "Explore projects",
    href: "/projects",
  },
  {
    title: "Consulting & Training",
    description:
      "Workshops and advisory services sharing our methodology, evaluation frameworks, and approaches to regenerative innovation.",
    cta: "Get in touch",
    href: "/contact",
  },
];

export default function HowWeWorkPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="How We Work"
        title="Processes and rhythms"
        description="How ACT approaches collaboration, project delivery, and organizational practice. We try to embody the values we're building toward."
        actions={[
          { label: "Our Principles", href: "/principles" },
          { label: "Contact Us", href: "/contact", variant: "outline" },
        ]}
      />

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Approach"
          title="How we do the work"
          description="The practices that guide our project delivery and partnerships."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {workStyles.map((style) => (
            <div
              key={style.title}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-3"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {style.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{style.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-8">
        <SectionHeading
          eyebrow="Rhythms"
          title="How we stay accountable"
          description="Regular practices that keep us grounded and responsive."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {rhythms.map((rhythm) => (
            <div
              key={rhythm.title}
              className="rounded-2xl border border-[#D8C7A5] bg-white/70 p-6 space-y-4"
            >
              <h3 className="font-semibold text-[#2F3E2E]">{rhythm.title}</h3>
              <ul className="space-y-2">
                {rhythm.items.map((item) => (
                  <li key={item} className="text-sm text-[#4D3F33] flex gap-2">
                    <span className="text-[#4CAF50]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Collaboration"
          title="Ways to work with us"
          description="Different pathways into the ACT ecosystem based on what you're looking for."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {collaborationTypes.map((collab) => (
            <div
              key={collab.title}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {collab.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{collab.description}</p>
              <Link
                href={collab.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#4CAF50] hover:gap-3 transition"
              >
                <span>{collab.cta}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Technology"
          title="Our technical stack"
          description="The infrastructure that powers ACT projects."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="font-semibold text-[#2F3E2E]">Frontend</h3>
              <ul className="space-y-2 text-sm text-[#4D3F33]">
                <li>• Next.js 15 with App Router</li>
                <li>• React 19</li>
                <li>• Tailwind CSS</li>
                <li>• TypeScript</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#2F3E2E]">Backend & Data</h3>
              <ul className="space-y-2 text-sm text-[#4D3F33]">
                <li>• Supabase (PostgreSQL + Auth)</li>
                <li>• Vector embeddings for RAG</li>
                <li>• Notion for knowledge management</li>
                <li>• GoHighLevel for CRM</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#2F3E2E]">Intelligence</h3>
              <ul className="space-y-2 text-sm text-[#4D3F33]">
                <li>• Claude AI for reasoning</li>
                <li>• OpenAI for embeddings</li>
                <li>• Custom agents and automation</li>
                <li>• Relationship health scoring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Farm Metaphor"
          title="Speaking our language"
          description="We use farm imagery to describe our work and approach."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Seeds</h4>
            <p className="text-sm text-[#4D3F33]">
              Active projects that need time, water, and attention
            </p>
          </div>
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Soil</h4>
            <p className="text-sm text-[#4D3F33]">
              Our knowledge network and community wisdom
            </p>
          </div>
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Seasons</h4>
            <p className="text-sm text-[#4D3F33]">
              Natural cycles of growth, harvest, and rest
            </p>
          </div>
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Harvest</h4>
            <p className="text-sm text-[#4D3F33]">
              Shared value that feeds the community
            </p>
          </div>
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Fields</h4>
            <p className="text-sm text-[#4D3F33]">
              Domains where we cultivate change
            </p>
          </div>
          <div className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2">
            <h4 className="font-semibold text-[#2F3E2E]">Tractor/PTO</h4>
            <p className="text-sm text-[#4D3F33]">
              We provide capacity, then communities drive forward
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
