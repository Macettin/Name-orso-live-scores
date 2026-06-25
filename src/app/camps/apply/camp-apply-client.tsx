"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { createId } from "@/lib/data-store";
import { submitCampApplication, type CampApplication } from "@/lib/camp-applications";
import { sportOptions } from "@/lib/types";

type CampForm = {
  clubName: string;
  country: string;
  city: string;
  contactPersonName: string;
  email: string;
  phone: string;
  sport: string;
  ageGroup: string;
  estimatedPlayers: string;
  estimatedStaff: string;
  preferredArrivalDate: string;
  preferredDepartureDate: string;
  destinationPreference: string;
  hotelLevelPreference: string;
  trainingFacilityRequirement: string;
  friendlyGamesNeeded: string;
  airportTransferNeeded: string;
  specialNotes: string;
};

const emptyForm: CampForm = {
  clubName: "",
  country: "",
  city: "",
  contactPersonName: "",
  email: "",
  phone: "",
  sport: "",
  ageGroup: "",
  estimatedPlayers: "",
  estimatedStaff: "",
  preferredArrivalDate: "",
  preferredDepartureDate: "",
  destinationPreference: "",
  hotelLevelPreference: "",
  trainingFacilityRequirement: "",
  friendlyGamesNeeded: "",
  airportTransferNeeded: "",
  specialNotes: ""
};

function inputClass() {
  return "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
}

function labelClass() {
  return "text-sm font-black text-slate-700";
}

function booleanValue(value: string) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function calculateNights(arrival: string, departure: string) {
  if (!arrival || !departure) return undefined;
  const start = new Date(`${arrival}T00:00:00Z`);
  const end = new Date(`${departure}T00:00:00Z`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Number.isFinite(nights) && nights >= 0 ? nights : undefined;
}

async function notifyCampApplication(application: CampApplication) {
  const response = await fetch("/api/camp-applications/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application })
  });

  if (!response.ok) throw new Error("Camp notification email failed.");
}

export default function CampApplyClient() {
  const [form, setForm] = useState<CampForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const numberOfNights = useMemo(
    () => calculateNights(form.preferredArrivalDate, form.preferredDepartureDate),
    [form.preferredArrivalDate, form.preferredDepartureDate]
  );

  function updateField(field: keyof CampForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const requiredFields: (keyof CampForm)[] = [
      "clubName",
      "contactPersonName",
      "email",
      "phone",
      "sport",
      "estimatedPlayers",
      "preferredArrivalDate",
      "preferredDepartureDate"
    ];
    if (requiredFields.some((field) => !form[field].trim())) {
      setMessage("Please complete all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (numberOfNights === undefined) {
      setMessage("Preferred departure date must be on or after the arrival date.");
      return;
    }

    const estimatedPlayers = Number(form.estimatedPlayers);
    const estimatedStaff = form.estimatedStaff ? Number(form.estimatedStaff) : undefined;
    if (!Number.isInteger(estimatedPlayers) || estimatedPlayers < 0 || (estimatedStaff !== undefined && (!Number.isInteger(estimatedStaff) || estimatedStaff < 0))) {
      setMessage("Player and staff counts must be valid whole numbers.");
      return;
    }

    const application: CampApplication = {
      id: createId("camp", form.clubName),
      clubName: form.clubName.trim(),
      country: form.country.trim() || undefined,
      city: form.city.trim() || undefined,
      contactPersonName: form.contactPersonName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      sport: form.sport,
      ageGroup: form.ageGroup.trim() || undefined,
      estimatedPlayers,
      estimatedStaff,
      preferredArrivalDate: form.preferredArrivalDate,
      preferredDepartureDate: form.preferredDepartureDate,
      numberOfNights,
      destinationPreference: form.destinationPreference.trim() || undefined,
      hotelLevelPreference: form.hotelLevelPreference || undefined,
      trainingFacilityRequirement: form.trainingFacilityRequirement.trim() || undefined,
      friendlyGamesNeeded: booleanValue(form.friendlyGamesNeeded),
      airportTransferNeeded: booleanValue(form.airportTransferNeeded),
      specialNotes: form.specialNotes.trim() || undefined,
      status: "new"
    };

    setSubmitting(true);
    try {
      await submitCampApplication(application);
      try {
        await notifyCampApplication(application);
      } catch {
        // Email is best-effort after the database submission succeeds.
      }
      setForm(emptyForm);
      setSubmitted(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit your camp request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-slate-950 px-5 py-9 text-white shadow-[0_28px_70px_rgba(37,99,235,0.18)] sm:px-9 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.85),transparent_52%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07)_0_1px,transparent_1px_54px)] opacity-30" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
            <ShieldCheck size={18} aria-hidden="true" />
            Orso Sports Events
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Camp Registration</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-200 sm:text-base">
            Request your sports training camp package with Orso Sports Events
          </p>
        </div>
      </section>

      {submitted ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm" role="status">
          <div className="flex gap-3">
            <CheckCircle2 size={24} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black">Request received</h2>
              <p className="mt-1 text-sm font-bold leading-6">
                Thank you. Your camp request has been received. Orso Sports Events will contact you shortly.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <CalendarDays className="mt-0.5 shrink-0 text-blue-700" size={22} aria-hidden="true" />
          <div>
            <h2 className="font-black text-slate-950">Tell us about your team and preferred camp</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Fields marked with * are required. Our team will follow up with package and availability options.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={labelClass()}>Club / Team Name *</span>
            <input required value={form.clubName} onChange={(event) => updateField("clubName", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Sport *</span>
            <select required value={form.sport} onChange={(event) => updateField("sport", event.target.value)} className={inputClass()}>
              <option value="">Select sport</option>
              {sportOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
              <option value="Other">Other</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Country</span>
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass()} autoComplete="country-name" />
          </label>
          <label>
            <span className={labelClass()}>City</span>
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} className={inputClass()} autoComplete="address-level2" />
          </label>
          <label>
            <span className={labelClass()}>Contact Person Name *</span>
            <input required value={form.contactPersonName} onChange={(event) => updateField("contactPersonName", event.target.value)} className={inputClass()} autoComplete="name" />
          </label>
          <label>
            <span className={labelClass()}>Age Group / Team Level</span>
            <input value={form.ageGroup} onChange={(event) => updateField("ageGroup", event.target.value)} className={inputClass()} placeholder="U16, Senior, Professional" />
          </label>
          <label>
            <span className={labelClass()}>Email *</span>
            <input required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass()} autoComplete="email" />
          </label>
          <label>
            <span className={labelClass()}>Phone / WhatsApp *</span>
            <input required value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass()} inputMode="tel" autoComplete="tel" />
          </label>
          <label>
            <span className={labelClass()}>Estimated Number of Players *</span>
            <input required type="number" min={0} step={1} value={form.estimatedPlayers} onChange={(event) => updateField("estimatedPlayers", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Estimated Number of Staff</span>
            <input type="number" min={0} step={1} value={form.estimatedStaff} onChange={(event) => updateField("estimatedStaff", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Preferred Arrival Date *</span>
            <input required type="date" value={form.preferredArrivalDate} onChange={(event) => updateField("preferredArrivalDate", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Preferred Departure Date *</span>
            <input required type="date" min={form.preferredArrivalDate || undefined} value={form.preferredDepartureDate} onChange={(event) => updateField("preferredDepartureDate", event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Number of Nights</span>
            <input readOnly value={numberOfNights ?? ""} className={`${inputClass()} bg-slate-50 text-slate-600`} placeholder="Calculated from selected dates" />
          </label>
          <label>
            <span className={labelClass()}>Destination Preference</span>
            <input value={form.destinationPreference} onChange={(event) => updateField("destinationPreference", event.target.value)} className={inputClass()} placeholder="City, region, or country" />
          </label>
          <label>
            <span className={labelClass()}>Hotel Level Preference</span>
            <select value={form.hotelLevelPreference} onChange={(event) => updateField("hotelLevelPreference", event.target.value)} className={inputClass()}>
              <option value="">No preference</option>
              <option value="3 Star">3 Star</option>
              <option value="4 Star">4 Star</option>
              <option value="5 Star">5 Star</option>
              <option value="Sports Hotel / Residence">Sports Hotel / Residence</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Friendly Games Needed?</span>
            <select value={form.friendlyGamesNeeded} onChange={(event) => updateField("friendlyGamesNeeded", event.target.value)} className={inputClass()}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Airport Transfer Needed?</span>
            <select value={form.airportTransferNeeded} onChange={(event) => updateField("airportTransferNeeded", event.target.value)} className={inputClass()}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass()}>Training Facility Requirement</span>
            <textarea value={form.trainingFacilityRequirement} onChange={(event) => updateField("trainingFacilityRequirement", event.target.value)} className={`${inputClass()} min-h-28`} placeholder="Pitch, court, gym, recovery, equipment, or session requirements" />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass()}>Special Notes</span>
            <textarea value={form.specialNotes} onChange={(event) => updateField("specialNotes", event.target.value)} className={`${inputClass()} min-h-32`} />
          </label>
        </div>

        {message ? <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{message}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Back to Sports Hub
          </Link>
          <button disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <Send size={17} aria-hidden="true" />
            {submitting ? "Submitting..." : "Submit Camp Request"}
          </button>
        </div>
      </form>
    </main>
  );
}
