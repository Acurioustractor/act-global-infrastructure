"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

const defaultSettings = {
  navigation: [],
  footer: {},
  ghl: {
    contact_form_url: "",
    newsletter_form_url: "",
    csa_form_url: "",
  },
};

export default function SettingsPage() {
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "global")
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      setError(fetchError.message);
      setJsonText(JSON.stringify(defaultSettings, null, 2));
    } else {
      setJsonText(JSON.stringify(data?.value ?? defaultSettings, null, 2));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText || "{}");
    } catch (parseError) {
      setError("Settings JSON is invalid.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("site_settings").upsert({
      key: "global",
      value: parsed,
    });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setNotice("Settings saved.");
    }

    setSaving(false);
  };

  return (
    <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
      <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
        Site settings
      </h2>
      <p className="mt-2 text-sm text-[#4D3F33]">
        Edit global configuration as JSON.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-[#4D3F33]">Loading...</p>
      ) : (
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          className="mt-4 min-h-[260px] w-full rounded-2xl border border-[#E3D4BA] bg-[#F7F2E8] px-4 py-3 text-xs text-[#2F3E2E]"
        />
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        {notice ? (
          <span className="text-sm text-[#2F3E2E]">{notice}</span>
        ) : null}
        {error ? (
          <span className="text-sm text-[#B4321E]">{error}</span>
        ) : null}
      </div>
    </section>
  );
}
