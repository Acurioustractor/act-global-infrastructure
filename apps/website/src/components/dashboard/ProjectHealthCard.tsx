'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  name: string;
  repo: string;
  description: string;
  url: string | null;
}

interface ProjectHealth {
  status: 'healthy' | 'warning' | 'error' | 'loading';
  openIssues: number;
  openPRs: number;
  lastCommit: string | null;
  deploymentsToday: number;
}

export function ProjectHealthCard({ project }: { project: Project }) {
  const [health, setHealth] = useState<ProjectHealth>({
    status: 'loading',
    openIssues: 0,
    openPRs: 0,
    lastCommit: null,
    deploymentsToday: 0,
  });

  useEffect(() => {
    async function fetchHealth() {
      try {
        // Fetch repo data from GitHub API
        const [repoRes, issuesRes, prsRes, commitsRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${project.repo}`),
          fetch(`https://api.github.com/repos/${project.repo}/issues?state=open&per_page=100`),
          fetch(`https://api.github.com/repos/${project.repo}/pulls?state=open&per_page=100`),
          fetch(`https://api.github.com/repos/${project.repo}/commits?per_page=1`),
        ]);

        if (!repoRes.ok) {
          setHealth((prev) => ({ ...prev, status: 'error' }));
          return;
        }

        const issues = await issuesRes.json();
        const prs = await prsRes.json();
        const commits = await commitsRes.json();

        // Filter issues to exclude PRs
        const actualIssues = issues.filter((issue: any) => !issue.pull_request);

        // Determine status based on open issues/PRs
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        if (actualIssues.length > 50 || prs.length > 10) {
          status = 'warning';
        }
        // Check for critical priority issues
        const criticalIssues = actualIssues.filter((issue: any) =>
          issue.labels.some((label: any) => label.name === 'priority: critical')
        );
        if (criticalIssues.length > 0) {
          status = 'error';
        }

        const lastCommitDate = commits[0]?.commit?.committer?.date
          ? new Date(commits[0].commit.committer.date).toLocaleDateString()
          : null;

        setHealth({
          status,
          openIssues: actualIssues.length,
          openPRs: prs.length,
          lastCommit: lastCommitDate,
          deploymentsToday: 0, // Will implement Vercel API later
        });
      } catch (error) {
        console.error(`Error fetching health for ${project.repo}:`, error);
        setHealth((prev) => ({ ...prev, status: 'error' }));
      }
    }

    fetchHealth();
  }, [project.repo]);

  const statusColors = {
    healthy: 'bg-[#4CAF50]',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    loading: 'bg-gray-300',
  };

  const statusText = {
    healthy: 'Healthy',
    warning: 'Needs Attention',
    error: 'Critical',
    loading: 'Loading...',
  };

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-[#4D3F33]">{project.description}</p>
        </div>
        <div
          className={`h-3 w-3 rounded-full ${statusColors[health.status]}`}
          title={statusText[health.status]}
        />
      </div>

      {/* Stats */}
      {health.status !== 'loading' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 border border-[#E3D4BA]">
            <div className="text-xl font-bold text-[#2F3E2E]">{health.openIssues}</div>
            <div className="text-xs text-[#4D3F33] uppercase tracking-wider">Issues</div>
          </div>
          <div className="rounded-xl bg-white p-3 border border-[#E3D4BA]">
            <div className="text-xl font-bold text-[#2F3E2E]">{health.openPRs}</div>
            <div className="text-xs text-[#4D3F33] uppercase tracking-wider">PRs</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {health.status === 'loading' && (
        <div className="mt-4 animate-pulse">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-[#E3D4BA] rounded-xl"></div>
            <div className="h-16 bg-[#E3D4BA] rounded-xl"></div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {health.status !== 'loading' && (
        <div className="mt-4 space-y-2 text-xs text-[#4D3F33]">
          {health.lastCommit && (
            <div className="flex justify-between">
              <span>Last commit:</span>
              <span className="font-medium">{health.lastCommit}</span>
            </div>
          )}
          {project.url && (
            <div className="flex justify-between">
              <span>Deployment:</span>
              <span className="font-medium text-[#4CAF50]">Live</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">{statusText[health.status]}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://github.com/${project.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[#4CAF50] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
        >
          GitHub
        </a>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#4CAF50] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
          >
            Site
          </a>
        )}
        <a
          href={`https://github.com/${project.repo}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[#4CAF50] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2F3E2E] hover:bg-[#4CAF50]/10"
        >
          Issues
        </a>
      </div>
    </div>
  );
}
