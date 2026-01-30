"use client";

import { useEffect, useState } from "react";
import { GitCommit, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";

interface Deployment {
  id: string;
  project: string;
  status: "ready" | "building" | "error" | "canceled";
  createdAt: string;
  url: string;
  commitMessage: string;
  commitSha: string;
  branch: string;
  duration?: number;
}

export function DeploymentHistory() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeployments() {
      try {
        const response = await fetch("/api/dashboard/deployments");
        if (response.ok) {
          const data = await response.json();
          setDeployments(data);
        }
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDeployments();
    const interval = setInterval(fetchDeployments, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: Deployment["status"]) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="w-5 h-5 text-[#4CAF50]" />;
      case "building":
        return <Clock className="w-5 h-5 text-[#FF9800] animate-pulse" />;
      case "error":
      case "canceled":
        return <XCircle className="w-5 h-5 text-[#F44336]" />;
    }
  };

  const getStatusBadge = (status: Deployment["status"]) => {
    const badges = {
      ready: "bg-[#4CAF50]/20 text-[#4CAF50]",
      building: "bg-[#FF9800]/20 text-[#FF9800]",
      error: "bg-[#F44336]/20 text-[#F44336]",
      canceled: "bg-[#9E9E9E]/20 text-[#9E9E9E]",
    };
    return badges[status];
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 animate-pulse">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[#E3D4BA]/30 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {deployments.length === 0 ? (
          <p className="text-center text-[#4D3F33] py-8">
            No recent deployments found
          </p>
        ) : (
          deployments.map((deployment) => (
            <div
              key={deployment.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-[#E3D4BA] bg-white/50 hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(deployment.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-[#2F3E2E]">
                    {deployment.project}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(
                      deployment.status
                    )}`}
                  >
                    {deployment.status}
                  </span>
                  <span className="text-xs text-[#4D3F33] bg-[#E3D4BA]/30 px-2 py-0.5 rounded-full">
                    {deployment.branch}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-[#4D3F33] mb-2">
                  <GitCommit className="w-4 h-4" />
                  <code className="font-mono text-xs">
                    {deployment.commitSha.slice(0, 7)}
                  </code>
                  <span className="truncate">{deployment.commitMessage}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#4D3F33]">
                  <span>
                    {new Date(deployment.createdAt).toLocaleString()}
                  </span>
                  {deployment.duration && (
                    <span>{Math.round(deployment.duration / 1000)}s</span>
                  )}
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[#2F3E2E] hover:underline"
                  >
                    View deployment
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
