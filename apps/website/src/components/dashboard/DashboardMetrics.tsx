"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Globe, Users } from "lucide-react";

interface Metrics {
  totalProjects: number;
  activeRegistries: number;
  recentDeployments: number;
  formSubmissions24h: number;
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalProjects: 6,
    activeRegistries: 0,
    recentDeployments: 0,
    formSubmissions24h: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/dashboard/metrics");
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      label: "Active Projects",
      value: metrics.totalProjects,
      icon: Globe,
      color: "text-[#4CAF50]",
    },
    {
      label: "Registry Sync",
      value: metrics.activeRegistries,
      icon: Database,
      color: "text-[#2196F3]",
    },
    {
      label: "Deployments (24h)",
      value: metrics.recentDeployments,
      icon: Activity,
      color: "text-[#FF9800]",
    },
    {
      label: "Form Submissions (24h)",
      value: metrics.formSubmissions24h,
      icon: Users,
      color: "text-[#9C27B0]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4D3F33]">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-[#2F3E2E]">
                  {loading ? "—" : card.value}
                </p>
              </div>
              <Icon className={`w-8 h-8 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
