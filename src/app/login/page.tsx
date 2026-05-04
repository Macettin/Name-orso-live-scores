"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath] = useState(() =>
    typeof window === "undefined" ? "/admin" : new URLSearchParams(window.location.search).get("next") ?? "/admin"
  );
  const { authLoading, login, profile, supabaseEnabled } = useTournamentData();
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role === "admin" || profile?.role === "scorer") {
      router.replace(nextPath);
    }
  }, [nextPath, profile, router]);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");

    try {
      await login(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
      router.replace(nextPath);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    }
  }

  return (
    <>
      <PageHeader title="Login" description="Sign in as an admin or scorer to manage Orso Live Scores." />
      <section className="max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {!supabaseEnabled ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Supabase is not configured. Add your Supabase environment variables before logging in.
          </p>
        ) : null}
        <form onSubmit={submitLogin} className="mt-4 grid gap-4">
          <label>
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input name="email" type="email" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input name="password" type="password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          <button
            disabled={authLoading || !supabaseEnabled}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </section>
    </>
  );
}
