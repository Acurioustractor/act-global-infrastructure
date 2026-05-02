import Link from "next/link";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const founders = [
  {
    name: "Benjamin Knight",
    role: "Co-founder. Systems and story.",
    body: "Ben grew up in Muswellbrook. He spent three years sitting with people on the street as a photographer for Orange Sky. He listened to men talk about hope in a prison in Bolivia. He met Brodie in Mount Isa during NAIDOC week and watched a community already running its own answers. Every job he has had has been an apprenticeship in not interrupting.",
  },
  {
    name: "Nicholas Marchesi OAM",
    role: "Co-founder. Place and hospitality.",
    body: "Nic was twenty when he and Lucas Patchett bolted a washing machine into a van and drove to a park in Brisbane. They went to do laundry. They found themselves doing conversation. Orange Sky grew from there into a national service and earned Nic an OAM for service to community. He now treats every project as something broken that could work again.",
  },
];

const lcaaPhases = [
  {
    title: "Listen",
    body: "Sit with place, people, and lived experience. Receive what is offered. Resist the urge to arrive with a fix.",
  },
  {
    title: "Curiosity",
    body: "Ask better questions. Prototype. Test. Stay in the not-knowing long enough for the right answer to surface.",
  },
  {
    title: "Action",
    body: "Build with communities, not for them. Ship rough, then iterate.",
  },
  {
    title: "Art",
    body: "Translate the work into culture. Art is how we know we have learned something.",
  },
];

const projectClusters = [
  {
    title: "Empathy Ledger",
    body: "Sovereign storytelling. Communities own their narratives, with consent and cryptographic protocols built in.",
    href: "/projects",
  },
  {
    title: "JusticeHub + CivicGraph",
    body: "Evidence and civic intelligence. Open-source models for community justice, plus a public-money transparency layer.",
    href: "/projects",
  },
  {
    title: "Goods on Country",
    body: "Circular manufacturing on Country. Community ownership, materials with stories, products that last.",
    href: "/projects",
  },
  {
    title: "The Harvest, ACT Farm, Black Cockatoo Valley",
    body: "Place and land practice. Witta hub, Jinibara Country regeneration, retreats, residencies.",
    href: "/farm",
  },
  {
    title: "The Studio",
    body: "Gold.Phone, The Confessional, Uncle Allan, CONTAINED. Art as the fourth phase, the highest expression of the work.",
    href: "/studio",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="About ACT"
        title="A Curious Tractor"
        description="Two humans, one tractor. We build platforms, places, and tools with communities, designed to be handed back when the season ends."
        actions={[
          { label: "What we do", href: "/projects" },
          { label: "How the money moves", href: "/economy", variant: "outline" },
        ]}
      />

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-8">
        <SectionHeading
          eyebrow="Two humans"
          title="The why under everything"
          description="ACT was co-founded by two people whose practice predates the org. The org is the vehicle. The drive is older."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {founders.map((person) => (
            <div
              key={person.name}
              className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-6 space-y-3"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {person.name}
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B5A45]">
                {person.role}
              </p>
              <p className="text-sm text-[#4D3F33]">{person.body}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-6 space-y-2">
          <p className="text-sm text-[#4D3F33]">
            Different doors into the same kitchen. Ben moves through systems
            and story. Nic moves through place and people. Both build, both
            connect, both make art at the end because they cannot help it.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="What ACT is"
          title="Not a charity, not a consultancy, not an NGO"
          description="A regenerative innovation ecosystem that powers communities without owning what it builds."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            The name comes from the agricultural Power Take-Off mechanism,
            the connection shaft that transfers engine power from a tractor
            to attached implements. A tractor powers things. The farmer
            directs it. When the season ends, it is unhitched.
          </p>
          <p className="text-sm text-[#4D3F33]">
            This is not a brand metaphor. It is a delivery philosophy. We
            build with communities, not for them. The measure of success is
            not reach or scale. It is that ACT becomes unnecessary.
          </p>
          <p className="text-sm text-[#4D3F33]">
            ACT partners with First Nations communities and is not a First
            Nations organisation.
          </p>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Method"
          title="Listen, Curiosity, Action, Art"
          description="Our operating loop. Not a checklist. Art returns us to Listen."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {lcaaPhases.map((phase) => (
            <div
              key={phase.title}
              className="rounded-2xl border border-[#E1D3BA] bg-white/70 p-6 space-y-2"
            >
              <h3 className="font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {phase.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{phase.body}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8">
          <p className="text-sm text-[#4D3F33]">
            Listen, Curiosity, Action, Art did not come from a whiteboard.
            It is a description of what already happens when Ben builds, Nic
            connects, and both make art at the end. The method is the
            founders' practice externalised, then offered to the work.{" "}
            <Link
              href="/lcaa"
              className="font-semibold text-[#4CAF50] hover:underline"
            >
              Read the full method
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="What we build"
          title="The cluster"
          description="A small group of interconnected projects spanning place, technology, justice, and art. Not siloed programs. Components of a single ecosystem."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectClusters.map((cluster) => (
            <Link
              key={cluster.title}
              href={cluster.href}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-6 space-y-3 transition hover:-translate-y-1 hover:border-[#4CAF50] hover:shadow-[0_18px_45px_rgba(50,42,31,0.12)]"
            >
              <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {cluster.title}
              </h3>
              <p className="text-sm text-[#4D3F33]">{cluster.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Discipline"
          title="Beautiful obsolescence"
          description="Why we build for handover from day one."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            Every platform, tool, and engagement is designed with handover
            in mind from day one. Sunset clauses in agreements. Documentation
            as a deliverable. Training embedded in delivery. Open-source
            codebases.
          </p>
          <p className="text-sm text-[#4D3F33]">
            The test for any ACT project: can the community run this without
            us? Can they modify it? Can they export their data? If any
            answer is no, the work is not finished.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-6">
        <SectionHeading
          eyebrow="Next"
          title="Where to go from here"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/projects"
            className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50]"
          >
            <h4 className="font-semibold text-[#2F3E2E]">Projects</h4>
            <p className="text-sm text-[#4D3F33] pt-2">
              See the full ecosystem of work.
            </p>
          </Link>
          <Link
            href="/economy"
            className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50]"
          >
            <h4 className="font-semibold text-[#2F3E2E]">Economy</h4>
            <p className="text-sm text-[#4D3F33] pt-2">
              How the money moves and where it lands.
            </p>
          </Link>
          <Link
            href="/contact"
            className="rounded-2xl border border-[#D8C7A5] bg-white/80 p-6 transition hover:-translate-y-1 hover:border-[#4CAF50]"
          >
            <h4 className="font-semibold text-[#2F3E2E]">Contact</h4>
            <p className="text-sm text-[#4D3F33] pt-2">
              Get in touch.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
