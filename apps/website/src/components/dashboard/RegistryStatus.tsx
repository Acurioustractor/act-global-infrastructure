"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface RegistrySync {
  name: string;
  url: string;
  lastSync: string;
  status: "success" | "error" | "pending";
  itemCount: number;
  errorMessage?: string;
}

export function RegistryStatus() {
  const [registries, setRegistries] = useState<RegistrySync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchRegistryStatus();
    const interval = setInterval(fetchRegistryStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRegistryStatus() {
    try {
      const response = await fetch("/api/registry/status");
      if (response.ok) {
        const data = await response.json();
        setRegistries(data);
      }
    } catch (error) {
      console.error("Failed to fetch registry status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/registry/sync", { method: "POST" });
      if (response.ok) {
        await fetchRegistryStatus();
      }
    } catch (error) {
      console.error("Failed to sync registries:", error);
    } finally {
      setSyncing(false);
    }
  }

  const getStatusIcon = (status: RegistrySync["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-[#4CAF50]" />;
      case "error":
        return <XCircle className="w-5 h-5 text-[#F44336]" />;
      case "pending":
        return <Clock className="w-5 h-5 text-[#FF9800]" />;
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 animate-pulse">
        <div className="h-40 bg-[#E3D4BA]/30 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#2F3E2E]">Registry Connections</h3>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4CAF50] text-white text-sm font-semibold hover:bg-[#45a049] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="space-y-3">
        {registries.map((registry) => (
          <div
            key={registry.name}
            className="flex items-center justify-between p-4 rounded-2xl border border-[#E3D4BA] bg-white/50"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(registry.status)}
              <div>
                <p className="font-medium text-[#2F3E2E]">{registry.name}</p>
                <p className="text-xs text-[#4D3F33]">{registry.url}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#2F3E2E]">
                {registry.itemCount} items
              </p>
              <p className="text-xs text-[#4D3F33]">
                {new Date(registry.lastSync).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {registries.some((r) => r.status === "error") && (
        <div className="mt-4 p-4 rounded-2xl bg-[#F44336]/10 border border-[#F44336]/20">
          <p className="text-sm font-semibold text-[#F44336]">Sync Errors:</p>
          <ul className="mt-2 space-y-1">
            {registries
              .filter((r) => r.status === "error")
              .map((r) => (
                <li key={r.name} className="text-xs text-[#F44336]">
                  {r.name}: {r.errorMessage}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
