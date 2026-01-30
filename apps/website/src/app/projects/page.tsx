import { ProjectShowcaseCard } from '@/components/showcase/ProjectShowcaseCard';
import { RoadmapTimeline } from '@/components/showcase/RoadmapTimeline';

type ProjectStatus = 'active' | 'planning' | 'development';
type LCAAPhase = 'listen' | 'curiosity' | 'action' | 'art';

interface Project {
  name: string;
  tagline: string;
  description: string;
  repo: string | null;
  url: string | null;
  status: ProjectStatus;
  lcaaPhase: LCAAPhase;
  tags: string[];
  contributionAreas: string[];
}

const ACT_PROJECTS: Project[] = [
  {
    name: 'Empathy Ledger',
    tagline: 'Ethical storytelling, consent-first, community-driven',
    description:
      'A revolutionary platform for ethical storytelling that centers consent, community voice, and OCAP® principles. Stories are owned by storytellers, not extracted by institutions.',
    repo: 'Acurioustractor/empathy-ledger-v2',
    url: 'https://empathy-ledger.vercel.app',
    status: 'active',
    lcaaPhase: 'action',
    tags: ['Storytelling', 'Ethics', 'Community', 'OCAP®'],
    contributionAreas: ['Frontend', 'Design', 'Documentation'],
  },
  {
    name: 'JusticeHub',
    tagline: 'Open-source justice programs, forkable for any community',
    description:
      'A platform for sharing and forking justice program models. Built on principles of transparency, community ownership, and adaptive justice. Programs designed with communities, not for them.',
    repo: 'Acurioustractor/justicehub-platform',
    url: null,
    status: 'development',
    lcaaPhase: 'curiosity',
    tags: ['Justice', 'Open Source', 'Community', 'Programs'],
    contributionAreas: ['Backend', 'Frontend', 'Research'],
  },
  {
    name: 'The Harvest',
    tagline: 'Therapeutic horticulture, heritage preservation, community healing',
    description:
      'A community hub in Kyneton connecting therapeutic horticulture, heritage preservation, and regenerative practices. Gardens as sites of healing, culture-making, and belonging.',
    repo: 'Acurioustractor/theharvest',
    url: null,
    status: 'planning',
    lcaaPhase: 'listen',
    tags: ['Horticulture', 'Heritage', 'Community', 'Healing'],
    contributionAreas: ['Design', 'Content', 'Documentation'],
  },
  {
    name: 'Black Cockatoo Valley',
    tagline: '150-acre regeneration estate, conservation-first development',
    description:
      'A long-term regeneration project on 150 acres in Central Victoria. Conservation-first development that centers ecological restoration, indigenous knowledge, and community access.',
    repo: null,
    url: null,
    status: 'planning',
    lcaaPhase: 'listen',
    tags: ['Conservation', 'Regeneration', 'Ecology', 'Development'],
    contributionAreas: ['Research', 'Design', 'Documentation'],
  },
  {
    name: 'Goods on Country',
    tagline: 'Circular economy, waste-to-wealth manufacturing',
    description:
      'Transforming waste streams into wealth through circular economy principles. Manufacturing as a site of regeneration, skills-building, and community economic development.',
    repo: 'Acurioustractor/goods-asset-tracker',
    url: null,
    status: 'planning',
    lcaaPhase: 'curiosity',
    tags: ['Circular Economy', 'Manufacturing', 'Waste', 'Skills'],
    contributionAreas: ['Frontend', 'Backend', 'Research'],
  },
  {
    name: 'ACT Art Program',
    tagline: 'Revolution through creativity, installations and residencies',
    description:
      'Art as a tool for systems change. Residencies, installations, and creative interventions that challenge extractive narratives and imagine post-extractive futures.',
    repo: null,
    url: null,
    status: 'planning',
    lcaaPhase: 'art',
    tags: ['Art', 'Residencies', 'Culture', 'Revolution'],
    contributionAreas: ['Design', 'Content', 'Curation'],
  },
  {
    name: 'ACT Regenerative Studio',
    tagline: 'Operations hub and living wiki for the ecosystem',
    description:
      'The operational backbone of ACT. Living wiki, knowledge extraction, multi-project dashboard, and unified operations hub. Infrastructure for a post-extractive economy.',
    repo: 'Acurioustractor/act-regenerative-studio',
    url: 'https://act-studio.vercel.app',
    status: 'active',
    lcaaPhase: 'action',
    tags: ['Operations', 'Knowledge', 'Infrastructure', 'Wiki'],
    contributionAreas: ['Frontend', 'Backend', 'Documentation'],
  },
];

export default function ProjectsPage() {
  const activeProjects = ACT_PROJECTS.filter((p) => p.status === 'active');
  const developmentProjects = ACT_PROJECTS.filter((p) => p.status === 'development');
  const planningProjects = ACT_PROJECTS.filter((p) => p.status === 'planning');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1E8] to-white">
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold text-[#2F3E2E] md:text-6xl font-[var(--font-display)]">
            ACT Ecosystem
          </h1>
          <p className="mt-6 text-lg text-[#4D3F33] md:text-xl max-w-3xl mx-auto">
            Building infrastructure for a post-extractive economy through regenerative
            innovation, community ownership, and the LCAA method: Listen, Curiosity, Action, Art.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[#E3D4BA] bg-white/80 p-6">
              <div className="text-3xl font-bold text-[#4CAF50]">{ACT_PROJECTS.length}</div>
              <div className="mt-2 text-sm text-[#4D3F33]">Projects</div>
            </div>
            <div className="rounded-2xl border border-[#E3D4BA] bg-white/80 p-6">
              <div className="text-3xl font-bold text-[#4CAF50]">{activeProjects.length}</div>
              <div className="mt-2 text-sm text-[#4D3F33]">Active</div>
            </div>
            <div className="rounded-2xl border border-[#E3D4BA] bg-white/80 p-6">
              <div className="text-3xl font-bold text-[#4CAF50]">42</div>
              <div className="mt-2 text-sm text-[#4D3F33]">Contributors</div>
            </div>
            <div className="rounded-2xl border border-[#E3D4BA] bg-white/80 p-6">
              <div className="text-3xl font-bold text-[#4CAF50]">140+</div>
              <div className="mt-2 text-sm text-[#4D3F33]">Open Issues</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
              Active Projects
            </h2>
            <p className="mt-2 text-sm text-[#4D3F33]">
              Live and building. Join us in creating change.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {activeProjects.map((project) => (
                <ProjectShowcaseCard key={project.name} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* In Development */}
      {developmentProjects.length > 0 && (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
              In Development
            </h2>
            <p className="mt-2 text-sm text-[#4D3F33]">
              Being built. Your contributions can help shape these projects.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {developmentProjects.map((project) => (
                <ProjectShowcaseCard key={project.name} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Planning */}
      {planningProjects.length > 0 && (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
              In Planning
            </h2>
            <p className="mt-2 text-sm text-[#4D3F33]">
              Listening, learning, designing. Early-stage projects where your voice matters most.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {planningProjects.map((project) => (
                <ProjectShowcaseCard key={project.name} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How to Contribute */}
      <section className="px-4 py-16 bg-[#F5F1E8]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            How You Can Contribute
          </h2>
          <p className="mt-4 text-[#4D3F33]">
            ACT is built on collaboration, community knowledge, and regenerative practices.
            There are many ways to get involved.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
              <div className="text-2xl font-bold text-[#4CAF50]">💻</div>
              <h3 className="mt-4 font-semibold text-[#2F3E2E]">Development</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Frontend, backend, design. Help build the infrastructure.
              </p>
              <a
                href="https://github.com/Acurioustractor"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
              >
                View on GitHub
              </a>
            </div>

            <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
              <div className="text-2xl font-bold text-[#4CAF50]">📝</div>
              <h3 className="mt-4 font-semibold text-[#2F3E2E]">Documentation</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Write guides, improve docs, share knowledge.
              </p>
              <a
                href="https://github.com/users/Acurioustractor/projects/1"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
              >
                View Projects Board
              </a>
            </div>

            <div className="rounded-2xl border border-[#E3D4BA] bg-white p-6">
              <div className="text-2xl font-bold text-[#4CAF50]">🎨</div>
              <h3 className="mt-4 font-semibold text-[#2F3E2E]">Design & Research</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                UI/UX design, research, community engagement.
              </p>
              <a
                href="https://github.com/Acurioustractor/act-regenerative-studio/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
              >
                Good First Issues
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="px-4 py-16 bg-[#F5F1E8]">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            Roadmap
          </h2>
          <p className="mt-4 text-center text-[#4D3F33]">
            Our journey toward a post-extractive economy
          </p>

          <div className="mt-12">
            <RoadmapTimeline />
          </div>
        </div>
      </section>

      {/* LCAA Method */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            The LCAA Method
          </h2>
          <p className="mt-4 text-center text-[#4D3F33]">
            All ACT projects follow this regenerative innovation framework
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#4CAF50] bg-white/80 p-6">
              <h3 className="text-xl font-bold text-[#2F3E2E]">Listen</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Deep listening to place, people, history, and community voice before designing solutions.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-[#4CAF50] bg-white/80 p-6">
              <h3 className="text-xl font-bold text-[#2F3E2E]">Curiosity</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Think deeply, prototype boldly, test rigorously. Research and experimentation.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-[#4CAF50] bg-white/80 p-6">
              <h3 className="text-xl font-bold text-[#2F3E2E]">Action</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Build tangible solutions alongside communities. Infrastructure for change.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-[#4CAF50] bg-white/80 p-6">
              <h3 className="text-xl font-bold text-[#2F3E2E]">Art</h3>
              <p className="mt-2 text-sm text-[#4D3F33]">
                Translate change into culture. Challenge status quo through creative expression.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-4 py-16 bg-[#2F3E2E] text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold font-[var(--font-display)]">
            Join the Ecosystem
          </h2>
          <p className="mt-4 text-white/80">
            Building infrastructure for a post-extractive economy. One project, one commit, one story at a time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/Acurioustractor"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#4CAF50] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-[#45a049]"
            >
              View on GitHub
            </a>
            <a
              href="https://github.com/users/Acurioustractor/projects/1"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-white px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-white/10"
            >
              See Roadmap
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
