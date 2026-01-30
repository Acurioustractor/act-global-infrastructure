interface Milestone {
  quarter: string;
  year: string;
  title: string;
  description: string;
  projects: string[];
  lcaaPhase: 'listen' | 'curiosity' | 'action' | 'art';
  status: 'completed' | 'in-progress' | 'planned';
}

const ROADMAP: Milestone[] = [
  {
    quarter: 'Q4',
    year: '2024',
    title: 'Foundation & Infrastructure',
    description: 'Established core platforms and unified operations hub',
    projects: ['ACT Studio', 'Empathy Ledger'],
    lcaaPhase: 'action',
    status: 'completed',
  },
  {
    quarter: 'Q1',
    year: '2025',
    title: 'Ecosystem Unification',
    description: 'Standardized project templates, global skills, unified dashboards',
    projects: ['All Projects'],
    lcaaPhase: 'action',
    status: 'in-progress',
  },
  {
    quarter: 'Q2',
    year: '2025',
    title: 'JusticeHub Launch',
    description: 'Open-source justice program platform with forkable models',
    projects: ['JusticeHub', 'ACT Studio'],
    lcaaPhase: 'curiosity',
    status: 'planned',
  },
  {
    quarter: 'Q2',
    year: '2025',
    title: 'The Harvest Community Hub',
    description: 'Therapeutic horticulture and heritage preservation center',
    projects: ['The Harvest'],
    lcaaPhase: 'listen',
    status: 'planned',
  },
  {
    quarter: 'Q3',
    year: '2025',
    title: 'Goods on Country Production',
    description: 'Circular economy manufacturing and waste-to-wealth systems',
    projects: ['Goods on Country'],
    lcaaPhase: 'curiosity',
    status: 'planned',
  },
  {
    quarter: 'Q3',
    year: '2025',
    title: 'ACT Art Residencies',
    description: 'First artist residencies and creative interventions',
    projects: ['ACT Art Program'],
    lcaaPhase: 'art',
    status: 'planned',
  },
  {
    quarter: 'Q4',
    year: '2025',
    title: 'Black Cockatoo Valley Phase 1',
    description: 'Conservation plan and community consultation complete',
    projects: ['Black Cockatoo Valley'],
    lcaaPhase: 'listen',
    status: 'planned',
  },
  {
    quarter: 'Q1',
    year: '2026',
    title: 'Full Ecosystem Integration',
    description: 'All platforms connected, cross-project collaboration active',
    projects: ['All Projects'],
    lcaaPhase: 'action',
    status: 'planned',
  },
];

const statusColors = {
  completed: 'bg-[#4CAF50]',
  'in-progress': 'bg-yellow-500',
  planned: 'bg-blue-500',
};

const statusLabels = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

const lcaaColors = {
  listen: 'border-blue-500',
  curiosity: 'border-purple-500',
  action: 'border-green-500',
  art: 'border-yellow-500',
};

export function RoadmapTimeline() {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#E3D4BA] hidden md:block" />

      <div className="space-y-8">
        {ROADMAP.map((milestone, index) => (
          <div key={index} className="relative">
            {/* Timeline Dot */}
            <div className="absolute left-8 top-6 -ml-1.5 hidden md:block">
              <div className={`h-3 w-3 rounded-full ${statusColors[milestone.status]}`} />
            </div>

            {/* Content */}
            <div className="md:ml-20">
              <div className={`rounded-3xl border-2 ${lcaaColors[milestone.lcaaPhase]} bg-white/90 p-6 hover:shadow-lg transition-shadow`}>
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[#2F3E2E]">
                        {milestone.quarter} {milestone.year}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ${statusColors[milestone.status]}`}>
                        {statusLabels[milestone.status]}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
                      {milestone.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-3 text-sm text-[#4D3F33] leading-relaxed">
                  {milestone.description}
                </p>

                {/* Projects */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {milestone.projects.map((project) => (
                    <span
                      key={project}
                      className="rounded-full bg-[#F5F1E8] px-3 py-1 text-xs text-[#2F3E2E] font-medium"
                    >
                      {project}
                    </span>
                  ))}
                </div>

                {/* LCAA Phase */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-[#4D3F33] uppercase tracking-wider">
                    LCAA:
                  </span>
                  <span className={`rounded-full border-2 ${lcaaColors[milestone.lcaaPhase]} bg-white px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E]`}>
                    {milestone.lcaaPhase}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
