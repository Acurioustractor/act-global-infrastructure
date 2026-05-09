import Link from "next/link";
import { getEcosystemProjects, type WikiProject } from "@/lib/wiki";
import { getProjectCoverImages, type CoverImage } from "@/lib/wiki-cover-images";

// Visual palette per project code. Design decision, not data — kept here
// so wiki frontmatter stays focused on identity/structure.
const COLOR_MAP: Record<
  string,
  { color: string; borderColor: string; hoverColor: string }
> = {
  "ACT-FM": {
    color: "from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    hoverColor: "hover:border-green-500",
  },
  "ACT-HV": {
    color: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200",
    hoverColor: "hover:border-amber-500",
  },
  "ACT-EL": {
    color: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-200",
    hoverColor: "hover:border-teal-500",
  },
  "ACT-JH": {
    color: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:border-blue-500",
  },
  "ACT-GD": {
    color: "from-stone-50 to-neutral-50",
    borderColor: "border-stone-200",
    hoverColor: "hover:border-stone-500",
  },
  "ACT-IN": {
    color: "from-purple-50 to-violet-50",
    borderColor: "border-purple-200",
    hoverColor: "hover:border-purple-500",
  },
};

const FALLBACK_COLORS = {
  color: "from-stone-50 to-neutral-50",
  borderColor: "border-stone-200",
  hoverColor: "hover:border-stone-500",
};

// Description fallbacks for projects whose wiki body is light or
// whose config description is too terse for a homepage card. These
// belong in copy, not data — keeping them here until the wiki body
// extraction is richer.
const HOMEPAGE_COPY: Record<
  string,
  { tagline: string; description: string }
> = {
  "ACT-FM": {
    tagline: "Regenerative residencies on Jinibara Country",
    description:
      "Low-impact eco-residencies and R&D prototyping at Black Cockatoo Valley. Conservation-first experiences for artists, researchers, and curious minds.",
  },
  "ACT-HV": {
    tagline: "Community hub and CSA programs",
    description:
      "Witta's gathering space for events, workshops, and food programs rooted in shared stewardship and local abundance.",
  },
  "ACT-EL": {
    tagline: "Stories that preserve cultural wisdom",
    description:
      "A living archive of community voices, Indigenous knowledge, and stories that carry care, accountability, and shared memory forward.",
  },
  "ACT-JH": {
    tagline: "Youth justice and community support",
    description:
      "Service directory, advocacy campaigns, and infrastructure for justice innovation—connecting families to support and amplifying youth voices.",
  },
  "ACT-GD": {
    tagline: "Objects that fund the commons",
    description:
      "Small-batch goods, artist editions, and farm produce that support our regenerative work and tell the story of this place.",
  },
};

type HomepageProject = {
  code: string;
  slug: string;
  name: string;
  href: string;
  external: boolean;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
  hoverColor: string;
  cover: CoverImage | null;
};

function toHomepageProject(
  p: WikiProject,
  cover: CoverImage | null
): HomepageProject {
  const palette = COLOR_MAP[p.code] ?? FALLBACK_COLORS;
  const copy = HOMEPAGE_COPY[p.code];
  return {
    code: p.code,
    slug: p.slug,
    name: p.title,
    href: p.href,
    external: p.external,
    tagline: copy?.tagline ?? p.tagline ?? p.description ?? "",
    description: copy?.description ?? p.description ?? p.tagline ?? "",
    cover,
    ...palette,
  };
}

const wikiProjects = getEcosystemProjects().filter((p) => p.code !== "ACT-CORE");
const projectSlugs = wikiProjects.map((p) => p.slug);

const projectCount = wikiProjects.length;
const projectCountLabel = (() => {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  return words[projectCount] ?? String(projectCount);
})();

// Revalidate the cover-image fetch every 5 minutes so the homepage
// stays fresh as EL content changes.
export const revalidate = 300;

export default async function HomePage() {
  // Pulled live from the canonical wiki at <repo>/wiki/projects/*.md
  // + cover images from the Empathy Ledger featured-content endpoint.
  // Both fail gracefully — wiki always works, EL cover is null on env miss.
  const covers = await getProjectCoverImages(projectSlugs);
  const projects: HomepageProject[] = wikiProjects.map((p) =>
    toHomepageProject(p, covers.get(p.slug) ?? null)
  );

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
            {projectCountLabel.charAt(0).toUpperCase() + projectCountLabel.slice(1)} interconnected projects
          </h2>
          <p className="max-w-2xl text-base text-[#5A4A3A]">
            Each project addresses a different need while contributing to the whole.
            Together, they create an ecosystem of regenerative innovation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const cardClass = `group flex flex-col overflow-hidden rounded-3xl border ${project.borderColor} bg-gradient-to-br ${project.color} transition ${project.hoverColor} hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(50,42,31,0.12)]`;
            const inner = (
              <>
                {project.cover ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.cover.url}
                      alt={project.cover.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-8">
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
                    <span>{project.external ? "Visit" : "Explore"}</span>
                    <span aria-hidden="true">{project.external ? "↗" : "→"}</span>
                  </div>
                </div>
              </>
            );
            return project.external ? (
              <a
                key={project.code}
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {inner}
              </a>
            ) : (
              <Link key={project.code} href={project.href} className={cardClass}>
                {inner}
              </Link>
            );
          })}
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
