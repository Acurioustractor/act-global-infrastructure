interface Project {
  name: string;
  tagline: string;
  description: string;
  repo: string | null;
  url: string | null;
  status: 'active' | 'development' | 'planning';
  lcaaPhase: 'listen' | 'curiosity' | 'action' | 'art';
  tags: string[];
  contributionAreas: string[];
}

const statusLabels = {
  active: 'Active',
  development: 'In Development',
  planning: 'Planning',
};

const statusColors = {
  active: 'bg-[#4CAF50] text-white',
  development: 'bg-yellow-500 text-white',
  planning: 'bg-blue-500 text-white',
};

const lcaaLabels = {
  listen: 'Listen',
  curiosity: 'Curiosity',
  action: 'Action',
  art: 'Art',
};

export function ProjectShowcaseCard({ project }: { project: Project }) {
  return (
    <div className="group rounded-3xl border border-[#E3D4BA] bg-white/90 p-6 hover:shadow-2xl hover:scale-[1.02] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
            {project.name}
          </h3>
          <p className="mt-1 text-sm text-[#4D3F33] italic">{project.tagline}</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
          <span className="rounded-full border-2 border-[#4CAF50] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E]">
            {lcaaLabels[project.lcaaPhase]}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm text-[#4D3F33] leading-relaxed">
        {project.description}
      </p>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#F5F1E8] px-3 py-1 text-xs text-[#4D3F33]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Contribution Areas */}
      <div className="mt-4 border-t border-[#E3D4BA] pt-4">
        <h4 className="text-xs font-semibold text-[#2F3E2E] uppercase tracking-wider">
          Help Wanted
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {project.contributionAreas.map((area) => (
            <span
              key={area}
              className="rounded-full border border-[#4CAF50] bg-white px-3 py-1 text-xs text-[#2F3E2E]"
            >
              {area}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#45a049]"
          >
            Visit Site
          </a>
        )}
        {project.repo && (
          <a
            href={`https://github.com/${project.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
          >
            GitHub
          </a>
        )}
        {project.repo && (
          <a
            href={`https://github.com/${project.repo}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
          >
            Contribute
          </a>
        )}
      </div>
    </div>
  );
}
