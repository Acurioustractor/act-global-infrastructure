import Link from "next/link";

interface Project {
  name: string;
  href: string;
  tagline: string;
}

const projects: Project[] = [
  {
    name: "ACT Farm",
    href: "http://localhost:3001",
    tagline: "Regenerative tourism & residencies",
  },
  {
    name: "The Harvest",
    href: "http://localhost:3004",
    tagline: "Community hub & CSA programs",
  },
  {
    name: "Empathy Ledger",
    href: "http://localhost:3003",
    tagline: "Storytelling & cultural wisdom",
  },
  {
    name: "JusticeHub",
    href: "http://localhost:3002",
    tagline: "Youth justice & community services",
  },
  {
    name: "Goods on Country",
    href: "https://goodsoncountry.netlify.app",
    tagline: "Funding the commons through goods",
  },
];

interface UnifiedFooterProps {
  currentProject?: string;
  showProjects?: boolean;
  customLinks?: Array<{ label: string; href: string }>;
  contactEmail?: string;
}

export default function UnifiedFooter({
  currentProject,
  showProjects = true,
  customLinks = [],
  contactEmail = "hi@act.place",
}: UnifiedFooterProps) {
  const filteredProjects = currentProject
    ? projects.filter((p) => p.name !== currentProject)
    : projects;

  return (
    <footer className="-mx-6 border-t border-[#E4D7BF] bg-[#F6F1E7] px-6 py-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Column 1: About */}
          <div className="space-y-4">
            <h3 className="font-[var(--font-display)] text-lg font-semibold uppercase tracking-[0.2em] text-[#2F3E2E]">
              A Curious Tractor
            </h3>
            <p className="text-sm text-[#5A4A3A]">
              A regenerative innovation studio stewarding a working farm on
              Jinibara Country. We cultivate seeds of impact through listening,
              curiosity, action, and art.
            </p>

            {/* Custom Links */}
            {customLinks.length > 0 && (
              <nav className="space-y-2 pt-4">
                {customLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-[#5A4A3A] transition hover:text-[#2F3E2E]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Column 2: ACT Ecosystem */}
          {showProjects && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E]">
                ACT Ecosystem
              </h3>
              <nav className="space-y-3">
                {filteredProjects.map((project) => (
                  <a
                    key={project.name}
                    href={project.href}
                    className="group block"
                  >
                    <div className="text-sm font-medium text-[#2F3E2E] transition group-hover:text-[#4CAF50]">
                      {project.name}
                    </div>
                    <div className="text-xs text-[#7A6A55]">
                      {project.tagline}
                    </div>
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Column 3: Connect */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2F3E2E]">
              Connect
            </h3>

            <div className="space-y-3">
              <a
                href={`mailto:${contactEmail}`}
                className="block text-sm text-[#5A4A3A] transition hover:text-[#2F3E2E]"
              >
                {contactEmail}
              </a>

              <div className="pt-4">
                <h4 className="mb-2 text-sm font-medium text-[#2F3E2E]">
                  Stay Connected
                </h4>
                <p className="mb-3 text-xs text-[#7A6A55]">
                  Get updates about our ecosystem
                </p>
                <form className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 rounded border border-[#E4D7BF] bg-white px-3 py-2 text-sm text-[#2F3E2E] placeholder:text-[#B8A88A] focus:border-[#4CAF50] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded bg-[#4CAF50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3D9143]"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[#E4D7BF] pt-8 text-xs text-[#7A6A55] md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p>
              We acknowledge the Jinibara people as the Traditional Custodians
              of the land on which we work and live. We pay our respects to
              Elders past and present, and extend that respect to all Aboriginal
              and Torres Strait Islander peoples.
            </p>
          </div>

          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#2F3E2E]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#2F3E2E]">
              Terms
            </Link>
            <span>© {new Date().getFullYear()} A Curious Tractor</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
