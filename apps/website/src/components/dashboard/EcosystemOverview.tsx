'use client';

import { useEffect, useState } from 'react';

interface Project {
  name: string;
  repo: string;
  description: string;
  url: string | null;
}

interface EcosystemStats {
  totalProjects: number;
  healthyProjects: number;
  totalIssues: number;
  totalPRs: number;
  recentDeployments: number;
}

export function EcosystemOverview({ projects }: { projects: Project[] }) {
  const [stats, setStats] = useState<EcosystemStats>({
    totalProjects: projects.length,
    healthyProjects: 0,
    totalIssues: 0,
    totalPRs: 0,
    recentDeployments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch GitHub stats for all projects
        const responses = await Promise.all(
          projects.map(async (project) => {
            try {
              const [issuesRes, prsRes] = await Promise.all([
                fetch(`https://api.github.com/repos/${project.repo}/issues?state=open&per_page=1`),
                fetch(`https://api.github.com/repos/${project.repo}/pulls?state=open&per_page=1`),
              ]);

              const issuesCount = issuesRes.headers.get('link')
                ? parseInt(issuesRes.headers.get('link')?.match(/page=(\d+)>; rel="last"/)?.[1] || '0')
                : (await issuesRes.json()).length;

              const prsCount = prsRes.headers.get('link')
                ? parseInt(prsRes.headers.get('link')?.match(/page=(\d+)>; rel="last"/)?.[1] || '0')
                : (await prsRes.json()).length;

              return {
                issues: issuesCount,
                prs: prsCount,
                healthy: true,
              };
            } catch (error) {
              console.error(`Error fetching stats for ${project.repo}:`, error);
              return { issues: 0, prs: 0, healthy: false };
            }
          })
        );

        const totalIssues = responses.reduce((sum, r) => sum + r.issues, 0);
        const totalPRs = responses.reduce((sum, r) => sum + r.prs, 0);
        const healthyProjects = responses.filter((r) => r.healthy).length;

        setStats({
          totalProjects: projects.length,
          healthyProjects,
          totalIssues,
          totalPRs,
          recentDeployments: 0, // Will implement Vercel API later
        });
      } catch (error) {
        console.error('Error fetching ecosystem stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [projects]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-[#E3D4BA] rounded"></div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[#E3D4BA] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <h2 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
        Ecosystem Overview
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Projects */}
        <div className="rounded-2xl border border-[#E3D4BA] bg-white p-4">
          <div className="text-2xl font-bold text-[#4CAF50]">{stats.totalProjects}</div>
          <div className="mt-1 text-xs text-[#4D3F33] uppercase tracking-wider">
            Projects
          </div>
        </div>

        {/* Healthy Projects */}
        <div className="rounded-2xl border border-[#E3D4BA] bg-white p-4">
          <div className="text-2xl font-bold text-[#4CAF50]">
            {stats.healthyProjects}
            <span className="text-sm text-[#4D3F33]"> / {stats.totalProjects}</span>
          </div>
          <div className="mt-1 text-xs text-[#4D3F33] uppercase tracking-wider">
            Healthy
          </div>
        </div>

        {/* Total Issues */}
        <div className="rounded-2xl border border-[#E3D4BA] bg-white p-4">
          <div className="text-2xl font-bold text-[#2F3E2E]">{stats.totalIssues}</div>
          <div className="mt-1 text-xs text-[#4D3F33] uppercase tracking-wider">
            Open Issues
          </div>
        </div>

        {/* Total PRs */}
        <div className="rounded-2xl border border-[#E3D4BA] bg-white p-4">
          <div className="text-2xl font-bold text-[#2F3E2E]">{stats.totalPRs}</div>
          <div className="mt-1 text-xs text-[#4D3F33] uppercase tracking-wider">
            Open PRs
          </div>
        </div>
      </div>
    </div>
  );
}
