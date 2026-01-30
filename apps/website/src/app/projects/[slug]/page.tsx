import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "../../../data/projects";
import { CommunityVoicesSection } from "@/components/projects/CommunityVoicesSection";
import { getFeaturedContentForProject } from "@/lib/empathy-ledger-featured";

const themeStyles = {
  earth: {
    hero: "from-[#F6F1E7] via-[#E6DCC4] to-[#D4C09F]",
    text: "text-[#2F3E2E]",
    accent: "text-[#4CAF50]",
    badge: "bg-[#4CAF50] text-white",
    border: "border-[#E1D3BA]",
    panel: "bg-white/70",
    button: "bg-[#4CAF50] text-white hover:bg-[#3D9143]",
    sub: "text-[#4D3F33]",
  },
  justice: {
    hero: "from-[#0B1F2A] via-[#132F3C] to-[#1F3D4B]",
    text: "text-white",
    accent: "text-[#F4D04F]",
    badge: "bg-[#F4D04F] text-[#0B1F2A]",
    border: "border-[#315060]",
    panel: "bg-white/10",
    button: "bg-[#F4D04F] text-[#0B1F2A] hover:bg-[#F7DE72]",
    sub: "text-[#D6E2EA]",
  },
  goods: {
    hero: "from-[#F2E8DB] via-[#E6D2BD] to-[#D2B49A]",
    text: "text-[#3B2F28]",
    accent: "text-[#A24A2E]",
    badge: "bg-[#A24A2E] text-white",
    border: "border-[#D7C4AF]",
    panel: "bg-white/70",
    button: "bg-[#A24A2E] text-white hover:bg-[#8B3F28]",
    sub: "text-[#4D3F33]",
  },
  valley: {
    hero: "from-[#EDF3E4] via-[#D6E2C5] to-[#B8CEA7]",
    text: "text-[#2F3E2E]",
    accent: "text-[#3D7A4D]",
    badge: "bg-[#3D7A4D] text-white",
    border: "border-[#C8D8B7]",
    panel: "bg-white/70",
    button: "bg-[#3D7A4D] text-white hover:bg-[#32623E]",
    sub: "text-[#4D3F33]",
  },
  harvest: {
    hero: "from-[#FFF2D6] via-[#F5D8A9] to-[#E9BC7D]",
    text: "text-[#3C2E24]",
    accent: "text-[#B15B20]",
    badge: "bg-[#B15B20] text-white",
    border: "border-[#E6C7A2]",
    panel: "bg-white/70",
    button: "bg-[#B15B20] text-white hover:bg-[#964D1B]",
    sub: "text-[#4D3F33]",
  },
};

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  const theme = themeStyles[project.theme] ?? themeStyles.earth;

  // Fetch featured content from Empathy Ledger
  const featuredContent = await getFeaturedContentForProject(project.slug, {
    type: 'all',
    limit: 10,
  });

  return (
    <div className="space-y-16 pb-24">
      {/* Hero Image (if available) */}
      {project.heroImage && (
        <div className="relative h-96 w-full overflow-hidden rounded-[32px]">
          <img
            src={project.heroImage}
            alt={project.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Hero Section */}
      <section
        className={`relative overflow-hidden rounded-[32px] border ${theme.border} bg-gradient-to-br ${theme.hero} p-8 md:p-12`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/projects"
            className={`text-xs uppercase tracking-[0.3em] ${theme.accent}`}
          >
            ← Back to projects
          </Link>
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${theme.badge}`}
          >
            Active seed
          </span>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <h1
              className={`font-[var(--font-display)] text-3xl font-semibold leading-tight md:text-5xl ${theme.text}`}
            >
              {project.title}
            </h1>
            <p className={`text-base md:text-lg ${theme.sub}`}>
              {project.tagline}
            </p>
            <p className={`text-sm ${theme.sub}`}>{project.description}</p>
          </div>
          <div
            className={`rounded-3xl border ${theme.border} ${theme.panel} p-5 text-sm`}
          >
            <p className={`text-xs uppercase tracking-[0.3em] ${theme.accent}`}>
              Focus areas
            </p>
            <ul className={`mt-4 space-y-2 ${theme.text}`}>
              {project.focus.map((focus) => (
                <li key={focus} className="rounded-2xl bg-white/30 p-3">
                  {focus}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Video (if available) */}
      {project.videoUrl && (
        <section className="rounded-[32px] overflow-hidden">
          <div className="relative" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={project.videoUrl.replace("/view/", "/embed/")}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Stats (if available) */}
      {project.stats && project.stats.length > 0 && (
        <section className="grid gap-4 md:grid-cols-4">
          {project.stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 text-center"
            >
              <div className={`text-3xl font-bold ${theme.accent} font-[var(--font-display)]`}>
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-[#5A4A3A]">{stat.label}</div>
            </div>
          ))}
        </section>
      )}

      {/* LCAA Method Sections */}
      <section className="space-y-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Our Process
          </p>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E] md:text-3xl">
            How we work: The LCAA Method
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Listen */}
          {project.listen && (
            <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-3xl ${theme.accent}`}>👂</span>
                <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
                  Listen
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4D3F33]">
                {project.listen}
              </p>
            </div>
          )}

          {/* Curiosity */}
          {project.curiosity && (
            <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-3xl ${theme.accent}`}>🔍</span>
                <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
                  Curiosity
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4D3F33]">
                {project.curiosity}
              </p>
            </div>
          )}

          {/* Action */}
          {project.action && (
            <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-3xl ${theme.accent}`}>⚡</span>
                <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
                  Action
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4D3F33]">
                {project.action}
              </p>
            </div>
          )}

          {/* Art */}
          {project.art && (
            <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-3xl ${theme.accent}`}>🎨</span>
                <h3 className="font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E]">
                  Art
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4D3F33]">
                {project.art}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Community Voices from Empathy Ledger */}
      {featuredContent && (
        <CommunityVoicesSection
          storytellers={featuredContent.featured.storytellers}
          stories={featuredContent.featured.stories}
          projectTitle={project.title}
        />
      )}

      {/* Quote (if available) */}
      {project.quote && (
        <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F4E8DD] via-[#E6CBB7] to-[#D1A788] p-8 md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <svg
              className="mx-auto mb-6 h-8 w-8 text-[#A24A2E]/30"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="font-[var(--font-display)] text-xl font-medium leading-relaxed text-[#2F3E2E] md:text-2xl">
              {project.quote.text}
            </blockquote>
            <div className="mt-6 text-sm text-[#5A4A3A]">
              <p className="font-semibold">{project.quote.author}</p>
              <p className="text-xs">{project.quote.role}</p>
            </div>
          </div>
        </section>
      )}

      {/* Ways to Engage */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-8 md:p-12">
        <h2 className="mb-6 font-[var(--font-display)] text-2xl font-semibold text-[#2F3E2E]">
          Ways to engage
        </h2>
        <p className="mb-6 text-sm text-[#4D3F33]">
          Partner with ACT, join a residency, support a harvest share, or simply reach out to learn more about how this work unfolds.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/contact"
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] ${theme.button}`}
          >
            Get Involved
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-full border border-[#4CAF50] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E] transition hover:bg-[#E5F4E4]"
          >
            Explore All Projects
          </Link>
        </div>
      </section>

      {/* Year-in-Review Link */}
      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 text-center md:p-12">
        <h3 className="mb-3 font-[var(--font-display)] text-xl font-semibold text-[#2F3E2E] md:text-2xl">
          See this project in our 2025 Year in Review
        </h3>
        <p className="mx-auto mb-6 max-w-2xl text-sm text-[#5A4A3A]">
          Explore the full story of our work in 2025—photos, videos, impact metrics, and the journey across all our projects.
        </p>
        <a
          href="https://act.place/2025-review"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-[#4CAF50] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#3D9143]"
        >
          View 2025 Year in Review →
        </a>
      </section>
    </div>
  );
}
