"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";
import LoginPanel from "./LoginPanel";
import { NotificationBanner } from "../notifications/NotificationBanner";

type Profile = {
  role: string;
  display_name: string | null;
};

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Content", href: "/admin/content" },
  { label: "Media", href: "/admin/media" },
  { label: "Media Lab", href: "/media-lab" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setProfile(null);
      setAuthError("No editor profile found for this account.");
    } else if (!/^(admin|editor)$/.test(data.role)) {
      setProfile(data);
      setAuthError("This account is not authorized to edit content.");
    } else {
      setProfile(data);
      setAuthError(null);
    }
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) {
          setLoading(true);
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
          setAuthError(null);
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-8 text-sm text-[#4D3F33]">
        Loading admin...
      </div>
    );
  }

  if (!session) {
    return <LoginPanel />;
  }

  if (authError) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/80 p-8">
        <h1 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Access required
        </h1>
        <p className="mt-2 text-sm text-[#4D3F33]">{authError}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 rounded-full border border-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <NotificationBanner />
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#E3D4BA] bg-white/80 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              ACT Admin
            </p>
            <h1 className="text-2xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              Content Studio
            </h1>
            <p className="mt-1 text-sm text-[#4D3F33]">
              Signed in as {profile?.display_name ?? session.user.email}
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
          >
            View site
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
          >
            Sign out
          </button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-3">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                active
                  ? "bg-[#2F3E2E] text-white"
                  : "border border-[#E3D4BA] text-[#2F3E2E] hover:bg-[#F1E9DA]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
        <div>{children}</div>
      </div>
    </>
  );
}
