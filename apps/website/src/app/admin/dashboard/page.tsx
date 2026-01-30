import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ProjectHealthCards } from "@/components/dashboard/ProjectHealthCards";
import { RegistryStatus } from "@/components/dashboard/RegistryStatus";
import { DeploymentHistory } from "@/components/dashboard/DeploymentHistory";
import { GHLFormActivity } from "@/components/dashboard/GHLFormActivity";
import SprintProgress from "@/components/dashboard/SprintProgress";
import VelocityChart from "@/components/dashboard/VelocityChart";
import BurndownChart from "@/components/dashboard/BurndownChart";
import HealthMatrix from "@/components/dashboard/HealthMatrix";

export const metadata = {
  title: "ACT Ecosystem Dashboard | Admin",
  description: "Monitoring dashboard for all ACT projects and infrastructure",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-[#2F3E2E] font-[var(--font-display)]">
          ACT Ecosystem Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#4D3F33]">
          Real-time monitoring of all projects, registries, and infrastructure
        </p>
      </header>

      {/* Top-level metrics */}
      <DashboardMetrics />

      {/* Sprint progress */}
      <SprintProgress />

      {/* Sprint Analytics */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          Sprint Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VelocityChart />
          <BurndownChart />
        </div>
      </section>

      {/* System Health Matrix */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          System Health
        </h2>
        <HealthMatrix />
      </section>

      {/* Project health cards */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          Project Health
        </h2>
        <ProjectHealthCards />
      </section>

      {/* Registry sync status */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          Registry Sync Status
        </h2>
        <RegistryStatus />
      </section>

      {/* Recent deployments */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          Recent Deployments
        </h2>
        <DeploymentHistory />
      </section>

      {/* GHL form submissions */}
      <section>
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)] mb-4">
          GoHighLevel Form Activity
        </h2>
        <GHLFormActivity />
      </section>
    </div>
  );
}
