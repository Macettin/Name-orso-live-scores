"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId, slugify } from "@/lib/data-store";
import { sportOptions, type TournamentApplication } from "@/lib/types";

type ApplicationForm = {
  nameSurname: string;
  club: string;
  phone: string;
  email: string;
  estimatedPlayers: string;
  ageGroup: string;
  estimatedStaff: string;
  country: string;
  city: string;
  sport: string;
  notes: string;
};

const emptyForm: ApplicationForm = {
  nameSurname: "",
  club: "",
  phone: "",
  email: "",
  estimatedPlayers: "",
  ageGroup: "",
  estimatedStaff: "",
  country: "",
  city: "",
  sport: "",
  notes: ""
};

function inputClass() {
  return "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
}

function labelClass() {
  return "text-sm font-black text-slate-700";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function TournamentApplyClient({ slug }: { slug?: string }) {
  const { data, selectedTournamentId, setSelectedTournamentId, submitTournamentApplication } = useTournamentData();
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [selectedApplyTournamentId, setSelectedApplyTournamentId] = useState(selectedTournamentId);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const tournament = useMemo(
    () =>
      slug
        ? data.tournaments.find((item) => slugify(item.name) === slug || item.id === slug)
        : data.tournaments.find((item) => item.id === selectedApplyTournamentId) ?? data.tournaments.find((item) => item.id === selectedTournamentId) ?? data.tournaments[0],
    [data.tournaments, selectedApplyTournamentId, selectedTournamentId, slug]
  );

  useEffect(() => {
    if (tournament && selectedTournamentId !== tournament.id) {
      setSelectedTournamentId(tournament.id);
    }
  }, [selectedTournamentId, setSelectedTournamentId, tournament]);

  function updateField(field: keyof ApplicationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;

    const requiredFields: (keyof ApplicationForm)[] = ["nameSurname", "club", "phone", "email", "estimatedPlayers", "ageGroup", "estimatedStaff"];
    const missingField = requiredFields.find((field) => !form[field].trim());
    if (missingField) {
      setMessage("Please complete all mandatory fields.");
      return;
    }

    if (!isValidEmail(form.email.trim())) {
      setMessage("Please enter a valid email address.");
      return;
    }

    const estimatedPlayers = Number(form.estimatedPlayers);
    const estimatedStaff = Number(form.estimatedStaff);
    if (!Number.isFinite(estimatedPlayers) || estimatedPlayers < 0 || !Number.isFinite(estimatedStaff) || estimatedStaff < 0) {
      setMessage("Estimated player and staff counts must be valid numbers.");
      return;
    }

    const application: TournamentApplication = {
      id: createId("application", `${tournament.id}-${form.club}`),
      tournamentId: tournament.id,
      nameSurname: form.nameSurname.trim(),
      club: form.club.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      estimatedPlayers,
      ageGroup: form.ageGroup.trim(),
      estimatedStaff,
      country: form.country.trim() || undefined,
      city: form.city.trim() || undefined,
      sport: form.sport.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: "new"
    };

    setSubmitting(true);
    setMessage("");
    try {
      await submitTournamentApplication(application);
      setSubmitted(true);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit participation request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!tournament) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Tournament not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Check the public tournament link or open the tournament directory.</p>
        <Link href="/tournaments" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Browse tournaments</Link>
      </section>
    );
  }

  return (
    <main className="mx-auto grid max-w-4xl gap-5 pb-8">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_28px_70px_rgba(37,99,235,0.16)]">
        <div className="relative px-4 py-7 text-white sm:px-7" style={{ background: `radial-gradient(circle at top right, ${tournament.primaryColor || "#2563eb"} 0%, #2563eb 45%, #0f172a 100%)` }}>
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_54px)] opacity-35" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Tournament participation</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Apply to join {tournament.name}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/75">Submit your club details. No login is required, and the tournament team will contact you after review.</p>
          </div>
        </div>
      </section>

      {submitted ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
          <div className="flex gap-3">
            <CheckCircle2 size={24} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-black">Thank you.</h2>
              <p className="mt-1 text-sm font-bold">Your participation request has been received. Our team will contact you shortly.</p>
            </div>
          </div>
        </section>
      ) : null}

      <form onSubmit={submitApplication} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {!slug ? (
            <label className="sm:col-span-2">
              <span className={labelClass()}>Tournament *</span>
              <select
                value={tournament?.id ?? selectedApplyTournamentId}
                onChange={(event) => {
                  setSelectedApplyTournamentId(event.target.value);
                  setSelectedTournamentId(event.target.value);
                }}
                className={inputClass()}
              >
                {data.tournaments.length === 0 ? <option value="">No tournaments available</option> : null}
                {data.tournaments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className={labelClass()}>Name Surname *</span>
            <input value={form.nameSurname} onChange={(event) => updateField("nameSurname", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Club *</span>
            <input value={form.club} onChange={(event) => updateField("club", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Phone Number *</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass()} inputMode="tel" />
          </label>
          <label>
            <span className={labelClass()}>Email Address *</span>
            <input value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass()} inputMode="email" />
          </label>
          <label>
            <span className={labelClass()}>Estimated number of players *</span>
            <input type="number" min={0} value={form.estimatedPlayers} onChange={(event) => updateField("estimatedPlayers", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Age group *</span>
            <input value={form.ageGroup} onChange={(event) => updateField("ageGroup", event.target.value)} className={inputClass()} placeholder="U14, U18, Senior" />
          </label>
          <label>
            <span className={labelClass()}>Estimated number of coach/staff *</span>
            <input type="number" min={0} value={form.estimatedStaff} onChange={(event) => updateField("estimatedStaff", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Sport</span>
            <select value={form.sport} onChange={(event) => updateField("sport", event.target.value)} className={inputClass()}>
              <option value="">Select sport</option>
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Country</span>
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>City</span>
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} className={inputClass()} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass()}>Notes / message</span>
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className={`${inputClass()} min-h-32`} />
          </label>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{message}</p> : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={slug ? `/tournament/${slug}` : "/tournaments"} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Back to tournament
          </Link>
          <button disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <Send size={17} aria-hidden="true" />
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </form>
    </main>
  );
}
