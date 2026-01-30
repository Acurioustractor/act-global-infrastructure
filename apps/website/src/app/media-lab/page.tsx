import Link from "next/link";
import type { CSSProperties } from "react";
import SectionHeading from "@/components/SectionHeading";
import MediaGallery from "@/components/media/MediaGallery";
import { projects, type Project } from "@/data/projects";

type FilterKey = "all" | "missingHero" | "hasHero" | "hasVideo" | "heroAndVideo";

const filterOptions: Array<{ value: FilterKey; label: string }> = [
  { value: "all", label: "All projects" },
  { value: "missingHero", label: "Missing hero" },
  { value: "hasHero", label: "Has hero" },
  { value: "hasVideo", label: "Has video" },
  { value: "heroAndVideo", label: "Hero + video" },
];

const aspectTiles = [
  { label: "Hero 16:9", className: "aspect-video" },
  { label: "Card 4:3", className: "aspect-[4/3]" },
  { label: "Square 1:1", className: "aspect-square" },
  { label: "Portrait 3:4", className: "aspect-[3/4]" },
];

const explainerModels = [
  {
    title: "Seed-to-system explainer",
    summary:
      "A clear narrative arc that moves from lived experience to systems change.",
    bestFor: "Ecosystem overview, partners, funding pages",
    media: ["Hero image", "60-90s video", "3-4 proof points"],
    structure: ["Context", "LCAA method", "Impact + CTA"],
  },
  {
    title: "Community voices spotlight",
    summary:
      "Lead with people, then reveal the work behind the story.",
    bestFor: "Empathy Ledger stories, JusticeHub, Farm residencies",
    media: ["Portraits", "Short clips", "Quote blocks"],
    structure: ["Storyteller", "Challenge", "Response + invite"],
  },
  {
    title: "Impact brief",
    summary:
      "Compact explainers for decision-makers with fast proof and clear asks.",
    bestFor: "Partners, governance, reporting",
    media: ["Diagram or map", "Stats tiles", "Downloadable PDF"],
    structure: ["Problem", "Approach", "Results + next step"],
  },
];

const mediaGalleryStyle: CSSProperties = {
  ["--color-primary" as string]: "#4CAF50",
};

const getEmbedUrl = (url: string) =>
  url.includes("/view/") ? url.replace("/view/", "/embed/") : url;

const normalizeParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const isFilterKey = (value: string): value is FilterKey =>
  filterOptions.some((option) => option.value === value);

const applyFilter = (items: Project[], filter: FilterKey, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.slug.toLowerCase().includes(normalizedQuery)
    );
  });

  switch (filter) {
    case "missingHero":
      return filtered.filter((item) => !item.heroImage);
    case "hasHero":
      return filtered.filter((item) => item.heroImage);
    case "hasVideo":
      return filtered.filter((item) => item.videoUrl);
    case "heroAndVideo":
      return filtered.filter((item) => item.heroImage && item.videoUrl);
    default:
      return filtered;
  }
};

export default function MediaLabPage({
  searchParams,
}: {
  searchParams?: { filter?: string | string[]; q?: string | string[] };
}) {
  const rawFilter = normalizeParam(searchParams?.filter);
  const filter = isFilterKey(rawFilter) ? rawFilter : "all";
  const query = normalizeParam(searchParams?.q).trim();

  const withHero = projects.filter((item) => item.heroImage).length;
  const withVideo = projects.filter((item) => item.videoUrl).length;
  const stats = {
    total: projects.length,
    withHero,
    withVideo,
    missingHero: projects.length - withHero,
  };

  const filteredProjects = applyFilter(projects, filter, query);
  const missingHeroProjects = projects.filter((item) => !item.heroImage);
  const videoProjects = filteredProjects.filter((item) => item.videoUrl);

  const buildHref = (nextFilter: FilterKey) => {
    const params = new URLSearchParams();
    if (nextFilter !== "all") {
      params.set("filter", nextFilter);
    }
    if (query) {
      params.set("q", query);
    }
    const queryString = params.toString();
    return queryString ? `/media-lab?${queryString}` : "/media-lab";
  };

  return (
    <div className="space-y-16">
      <header className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.4em] text-[#6B5A45]">
          Media Lab
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#2F3E2E] md:text-5xl font-[var(--font-display)]">
          Test images, video, and explainers
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-[#4D3F33] md:text-base">
          Use this page to stress-test media across common layouts, spot gaps,
          and prototype explainer patterns for the ACT ecosystem.
        </p>
      </header>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Coverage"
          title="Media readiness snapshot"
          description="Quick status check for project hero images and video coverage."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Projects", value: stats.total },
            { label: "With hero image", value: stats.withHero },
            { label: "With video", value: stats.withVideo },
            { label: "Missing hero", value: stats.missingHero },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E3D4BA] bg-white/70 p-5"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {missingHeroProjects.length > 0 && (
          <div className="rounded-2xl border border-dashed border-[#D7C4A2] bg-[#F7F2E8] p-4 text-sm text-[#5A4A3A]">
            <strong className="block text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              Missing hero images
            </strong>
            <p className="mt-2">
              {missingHeroProjects.map((item) => item.title).join(", ")}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Filters"
          title="Focus the review"
          description="Filter by missing media or search by project title or slug."
        />
        <div className="flex flex-col gap-4 rounded-2xl border border-[#E3D4BA] bg-white/70 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Link
                key={option.value}
                href={buildHref(option.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                  filter === option.value
                    ? "bg-[#2F3E2E] text-white"
                    : "border border-[#E3D4BA] text-[#2F3E2E] hover:bg-[#F1E9DA]"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
          <form className="min-w-[220px]" method="get">
            {filter !== "all" && (
              <input type="hidden" name="filter" value={filter} />
            )}
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search projects..."
              className="w-full rounded-full border border-[#D6C8B0] bg-white px-4 py-2 text-sm text-[#2F3E2E] focus:border-[#4CAF50] focus:outline-none"
            />
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Images"
          title="Image stress tests"
          description="Preview hero imagery in common aspect ratios to catch cropping issues early."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredProjects.map((project) => (
            <div
              key={project.slug}
              className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                    {project.title}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                    {project.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.heroImage ? (
                    <span className="rounded-full bg-[#4CAF50] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                      Hero
                    </span>
                  ) : (
                    <span className="rounded-full border border-[#D7C4A2] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6B5A45]">
                      No hero
                    </span>
                  )}
                  {project.videoUrl && (
                    <span className="rounded-full border border-[#4CAF50] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#2F3E2E]">
                      Video
                    </span>
                  )}
                </div>
              </div>

              {project.heroImage ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {aspectTiles.map((tile) => (
                    <div key={tile.label} className="space-y-2">
                      <div
                        className={`relative overflow-hidden rounded-2xl border border-[#E1D3BA] bg-[#F7F2E8] ${tile.className}`}
                      >
                        <img
                          src={project.heroImage}
                          alt={`${project.title} hero`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                        {tile.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[#D7C4A2] bg-[#F7F2E8] p-6 text-center text-sm text-[#6B5A45]">
                  Add a hero image to unlock the layout previews.
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Video"
          title="Video embed tests"
          description="Confirm videos render cleanly in 16:9 frames and match captions."
        />
        {videoProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D7C4A2] bg-[#F7F2E8] p-6 text-center text-sm text-[#6B5A45]">
            No videos match the current filter. Try selecting "Has video".
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {videoProjects.map((project) => (
              <div
                key={project.slug}
                className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                    {project.title}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                    {project.slug}
                  </p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-[#E1D3BA] bg-[#F7F2E8]">
                  <div className="relative" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      title={`${project.title} video`}
                      src={getEmbedUrl(project.videoUrl ?? "")}
                      loading="lazy"
                      className="absolute left-0 top-0 h-full w-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
                {project.videoUrl && (
                  <a
                    href={project.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#4CAF50]"
                  >
                    Open source link
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Library"
          title="Supabase media gallery"
          description="Browse the shared media library to validate tagging, cropping, and file types."
        />
        <div
          className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6"
          style={mediaGalleryStyle}
        >
          <MediaGallery fileType="all" limit={24} />
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Explainers"
          title="Explainer model ideas"
          description="Use these patterns to structure landing pages, partner briefs, and story-driven updates."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {explainerModels.map((model) => (
            <div
              key={model.title}
              className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6"
            >
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                  {model.title}
                </h3>
                <p className="text-sm text-[#4D3F33]">{model.summary}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-[#E1D3BA] bg-[#F7F2E8] p-4 text-xs text-[#6B5A45]">
                <p className="uppercase tracking-[0.3em]">Best for</p>
                <p className="mt-2">{model.bestFor}</p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-[#4D3F33]">
                <p className="uppercase tracking-[0.3em] text-[#6B5A45]">
                  Media kit
                </p>
                <ul className="list-disc pl-4">
                  {model.media.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 space-y-2 text-xs text-[#4D3F33]">
                <p className="uppercase tracking-[0.3em] text-[#6B5A45]">
                  Structure
                </p>
                <ul className="list-disc pl-4">
                  {model.structure.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-lg bg-[#E7DDC7]" />
                <div className="h-10 rounded-lg bg-[#D7C4A2]" />
                <div className="h-10 rounded-lg bg-[#EADFCB]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
