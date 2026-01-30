"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function LoginPanel() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);

    const trimmedEmail = email.trim();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const emailRedirectTo = `${siteUrl}/admin`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setMessage("Check your inbox for a magic link.");
    }

    setSending(false);
  };

  return (
    <div className="rounded-3xl border border-[#E3D4BA] bg-white/80 p-8 shadow-[0_20px_45px_rgba(50,42,31,0.12)]">
      <h1 className="text-2xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
        Admin access
      </h1>
      <p className="mt-2 text-sm text-[#4D3F33]">
        Enter your email to receive a secure magic link.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="you@act.place"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
          autoComplete="email"
          required
        />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#3D9143] disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-[#2F3E2E]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-[#B4321E]">{error}</p>
      ) : null}
    </div>
  );
}
