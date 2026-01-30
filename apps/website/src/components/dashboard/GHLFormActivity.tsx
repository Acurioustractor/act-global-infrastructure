"use client";

import { useEffect, useState } from "react";
import { Mail, Calendar, Users, Package } from "lucide-react";

interface FormSubmission {
  id: string;
  formName: string;
  formType: "contact" | "farm_stay" | "csa" | "art_residency" | "newsletter";
  submittedAt: string;
  contactName?: string;
  contactEmail?: string;
  synced: boolean;
}

export function GHLFormActivity() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total24h: 0,
    total7d: 0,
    byType: {} as Record<string, number>,
  });

  useEffect(() => {
    async function fetchFormActivity() {
      try {
        const response = await fetch("/api/dashboard/forms");
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data.submissions || []);
          setStats(data.stats || { total24h: 0, total7d: 0, byType: {} });
        }
      } catch (error) {
        console.error("Failed to fetch form activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFormActivity();
    const interval = setInterval(fetchFormActivity, 60000);
    return () => clearInterval(interval);
  }, []);

  const getFormIcon = (type: FormSubmission["formType"]) => {
    switch (type) {
      case "contact":
        return <Mail className="w-5 h-5 text-[#2196F3]" />;
      case "farm_stay":
        return <Calendar className="w-5 h-5 text-[#4CAF50]" />;
      case "csa":
        return <Package className="w-5 h-5 text-[#FF9800]" />;
      case "art_residency":
        return <Users className="w-5 h-5 text-[#9C27B0]" />;
      case "newsletter":
        return <Mail className="w-5 h-5 text-[#00BCD4]" />;
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 animate-pulse">
        <div className="h-64 bg-[#E3D4BA]/30 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-[#E3D4BA] bg-white/50">
          <p className="text-sm text-[#4D3F33]">Last 24 hours</p>
          <p className="text-2xl font-bold text-[#2F3E2E] mt-1">
            {stats.total24h}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-[#E3D4BA] bg-white/50">
          <p className="text-sm text-[#4D3F33]">Last 7 days</p>
          <p className="text-2xl font-bold text-[#2F3E2E] mt-1">
            {stats.total7d}
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-[#E3D4BA] bg-white/50">
          <p className="text-sm text-[#4D3F33]">By Type</p>
          <div className="mt-2 space-y-1">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-xs">
                <span className="text-[#4D3F33] capitalize">
                  {type.replace("_", " ")}
                </span>
                <span className="font-semibold text-[#2F3E2E]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        <h4 className="font-semibold text-[#2F3E2E] mb-3">
          Recent Submissions
        </h4>
        {submissions.length === 0 ? (
          <p className="text-center text-[#4D3F33] py-8">
            No recent form submissions
          </p>
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-[#E3D4BA] bg-white/50"
            >
              <div className="flex-shrink-0 mt-1">
                {getFormIcon(submission.formType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-[#2F3E2E]">
                    {submission.formName}
                  </p>
                  {submission.synced ? (
                    <span className="text-xs bg-[#4CAF50]/20 text-[#4CAF50] px-2 py-1 rounded-full">
                      Synced to Notion
                    </span>
                  ) : (
                    <span className="text-xs bg-[#FF9800]/20 text-[#FF9800] px-2 py-1 rounded-full">
                      Pending sync
                    </span>
                  )}
                </div>
                {submission.contactName && (
                  <p className="text-sm text-[#4D3F33]">
                    {submission.contactName}
                    {submission.contactEmail && ` (${submission.contactEmail})`}
                  </p>
                )}
                <p className="text-xs text-[#4D3F33] mt-1">
                  {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
