import { ProjectHealthCard } from '@/components/dashboard/ProjectHealthCard';
import { EcosystemOverview } from '@/components/dashboard/EcosystemOverview';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

// ACT Ecosystem projects
const ACT_PROJECTS = [
  {
    name: 'ACT Regenerative Studio',
    repo: 'Acurioustractor/act-regenerative-studio',
    description: 'Unified platform and operations hub',
    url: 'https://act-studio.vercel.app',
  },
  {
    name: 'Empathy Ledger',
    repo: 'Acurioustractor/empathy-ledger-v2',
    description: 'Ethical storytelling platform',
    url: 'https://empathy-ledger.vercel.app',
  },
  {
    name: 'JusticeHub',
    repo: 'Acurioustractor/justicehub-platform',
    description: 'Open-source justice programs',
    url: null,
  },
  {
    name: 'The Harvest',
    repo: 'Acurioustractor/theharvest',
    description: 'Community hub and therapeutic horticulture',
    url: null,
  },
  {
    name: 'ACT Farm',
    repo: 'Acurioustractor/act-farm',
    description: 'Regenerative farming operations',
    url: null,
  },
  {
    name: 'ACT Placemat',
    repo: 'Acurioustractor/act-placemat',
    description: 'Visual ecosystem guide',
    url: null,
  },
  {
    name: 'Goods Asset Tracker',
    repo: 'Acurioustractor/goods-asset-tracker',
    description: 'Circular economy tracking',
    url: null,
  },
];

export default async function EcosystemPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
          ACT Ecosystem Operations
        </h1>
        <p className="mt-2 text-sm text-[#4D3F33]">
          Unified view of all ACT projects, deployments, and progress
        </p>
      </div>

      {/* Overview Stats */}
      <EcosystemOverview projects={ACT_PROJECTS} />

      {/* Two Column Layout: Project Cards + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Cards - 2 columns */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACT_PROJECTS.map((project) => (
            <ProjectHealthCard key={project.repo} project={project} />
          ))}
        </div>

        {/* Activity Feed - 1 column */}
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h2 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Quick Links
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://github.com/users/Acurioustractor/projects/1"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-[#45a049]"
          >
            GitHub Projects Board
          </a>
          <a
            href="https://github.com/Acurioustractor"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E] hover:bg-[#4CAF50]/10"
          >
            GitHub Organization
          </a>
          <a
            href="https://vercel.com/acurioustractor"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E] hover:bg-[#4CAF50]/10"
          >
            Vercel Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
