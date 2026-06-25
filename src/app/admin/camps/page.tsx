"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, Mail, Moon, Phone, RefreshCw, Save, Sun, Trash2 } from "lucide-react";
import {
  campApplicationStatusOptions,
  deleteCampApplication,
  fetchCampApplications,
  updateCampApplication,
  type CampApplication,
  type CampApplicationStatus
} from "@/lib/camp-applications";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { PageHeader } from "@/components/ui";

const darkModeStorageKey = "orso-admin-dark-mode";

const statusLabels: Record<CampApplicationStatus, string> = {
  new: "New",
  contacted: "Contacted",
  offer_sent: "Offer Sent",
  confirmed: "Confirmed",
  cancelled: "Cancelled"
};

const statusClasses: Record<CampApplicationStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  offer_sent: "bg-violet-100 text-violet-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700"
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function yesNo(value?: boolean) {
  if (value === undefined) return "-";
  return value ? "Yes" : "No";
}

export default function AdminCampApplicationsPage() {
  const router = useRouter();
  const { authLoading, canManageAll, supabaseEnabled } = useTournamentData();
  const [applications, setApplications] = useState<CampApplication[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lastContactedDates, setLastContactedDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CampApplicationStatus>("all");
  const [darkMode, setDarkMode] = useState(() => (typeof window === "undefined" ? false : window.localStorage.getItem(darkModeStorageKey) === "true"));

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const nextApplications = await fetchCampApplications();
      setApplications(nextApplications);
      setNotes(Object.fromEntries(nextApplications.map((application) => [application.id, application.adminNotes ?? ""])));
      setLastContactedDates(Object.fromEntries(nextApplications.map((application) => [application.id, toDateTimeLocal(application.lastContactedAt)])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load camp applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || authLoading) return;
    if (!canManageAll) {
      router.replace("/login?next=/admin/camps");
      return;
    }
    queueMicrotask(() => void loadApplications());
  }, [authLoading, canManageAll, loadApplications, router, supabaseEnabled]);

  function toggleDarkMode() {
    setDarkMode((current) => {
      const next = !current;
      window.localStorage.setItem(darkModeStorageKey, String(next));
      return next;
    });
  }

  async function saveUpdates(applicationId: string, updates: Parameters<typeof updateCampApplication>[1], successMessage: string) {
    setSavingId(applicationId);
    setMessage("");
    try {
      await updateCampApplication(applicationId, updates);
      await loadApplications();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the camp application.");
    } finally {
      setSavingId("");
    }
  }

  async function removeApplication(application: CampApplication) {
    if (!window.confirm(`Delete the camp request from ${application.clubName}?`)) return;
    setSavingId(application.id);
    setMessage("");
    try {
      await deleteCampApplication(application.id);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setMessage(`Camp request from ${application.clubName} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the camp application.");
    } finally {
      setSavingId("");
    }
  }

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canManageAll) {
    return <PageHeader title="Admin access required" description="Redirecting to login." />;
  }

  const filteredApplications = applications.filter((application) => statusFilter === "all" || application.status === statusFilter);

  return (
    <div className={`admin-dashboard ${darkMode ? "admin-dark" : ""}`}>
      <section className="admin-shell rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageHeader
            eyebrow="Admin"
            title="Camp Applications"
            description="Review sports training camp requests, record follow-up, and manage each request through confirmation."
          />
          <div className="mb-6 flex flex-col gap-2 sm:flex-row lg:mb-8">
            <Link href="/admin" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              <ChevronLeft size={17} aria-hidden="true" />
              Admin
            </Link>
            <button type="button" onClick={() => void loadApplications()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
              <RefreshCw size={17} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={toggleDarkMode} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
              {darkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">{filteredApplications.length} camp request{filteredApplications.length === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{applications.filter((application) => application.status === "new").length} currently new</p>
          </div>
          <label className="sm:w-56">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | CampApplicationStatus)} className="orso-input">
              <option value="all">All statuses</option>
              {campApplicationStatusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
        </div>

        {message ? <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p> : null}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1050px] w-full border-collapse bg-white text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-black">Club</th>
                <th className="px-4 py-3 font-black">Country</th>
                <th className="px-4 py-3 font-black">Sport</th>
                <th className="px-4 py-3 font-black">Dates</th>
                <th className="px-4 py-3 font-black">Players</th>
                <th className="px-4 py-3 font-black">Contact Person</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.map((application) => (
                <tr key={application.id} className="align-top">
                  <td className="px-4 py-4">
                    <details className="group">
                      <summary className="cursor-pointer list-none font-black text-slate-950">
                        {application.clubName}
                        <span className="ml-2 text-xs font-bold text-blue-600 group-open:hidden">View details</span>
                        <span className="ml-2 hidden text-xs font-bold text-blue-600 group-open:inline">Hide details</span>
                      </summary>
                      <div className="mt-4 w-[min(88vw,760px)] rounded-2xl border border-blue-100 bg-slate-50 p-4 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            ["City", application.city],
                            ["Age Group / Level", application.ageGroup],
                            ["Staff", application.estimatedStaff],
                            ["Nights", application.numberOfNights],
                            ["Destination", application.destinationPreference],
                            ["Hotel Level", application.hotelLevelPreference],
                            ["Friendly Games", yesNo(application.friendlyGamesNeeded)],
                            ["Airport Transfer", yesNo(application.airportTransferNeeded)]
                          ].map(([label, value]) => (
                            <div key={String(label)}>
                              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
                              <p className="mt-1 font-bold text-slate-900">{value ?? "-"}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Training Facility Requirement</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{application.trainingFacilityRequirement || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Special Notes</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{application.specialNotes || "-"}</p>
                          </div>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <label>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Admin Notes</span>
                            <textarea value={notes[application.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} className="orso-input mt-2 min-h-28" />
                          </label>
                          <label>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Last Contacted Date</span>
                            <input type="datetime-local" value={lastContactedDates[application.id] ?? ""} onChange={(event) => setLastContactedDates((current) => ({ ...current, [application.id]: event.target.value }))} className="orso-input mt-2" />
                            <p className="mt-2 text-xs font-semibold text-slate-500">Saved value: {formatDateTime(application.lastContactedAt)}</p>
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingId === application.id}
                            onClick={() => void saveUpdates(application.id, {
                              adminNotes: notes[application.id] ?? "",
                              lastContactedAt: fromDateTimeLocal(lastContactedDates[application.id] ?? "")
                            }, "Camp application notes saved.")}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Save size={16} aria-hidden="true" />
                            Save Follow-up
                          </button>
                          <button
                            type="button"
                            disabled={savingId === application.id}
                            onClick={() => void saveUpdates(application.id, { status: "contacted", lastContactedAt: new Date().toISOString() }, "Camp application marked as contacted.")}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <CalendarClock size={16} aria-hidden="true" />
                            Mark Contacted Now
                          </button>
                          <button
                            type="button"
                            disabled={savingId === application.id}
                            onClick={() => void removeApplication(application)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{application.country || "-"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{application.sport}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    <span className="block">{formatDate(application.preferredArrivalDate)}</span>
                    <span className="block text-xs text-slate-500">to {formatDate(application.preferredDepartureDate)}</span>
                  </td>
                  <td className="px-4 py-4 font-black text-slate-900">{application.estimatedPlayers}</td>
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-900">{application.contactPersonName}</p>
                    <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-slate-500">
                      <a href={`mailto:${application.email}`} className="inline-flex items-center gap-1.5 hover:text-blue-700"><Mail size={13} />{application.email}</a>
                      <a href={`tel:${application.phone}`} className="inline-flex items-center gap-1.5 hover:text-blue-700"><Phone size={13} />{application.phone}</a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClasses[application.status]}`}>{statusLabels[application.status]}</span>
                    <select
                      value={application.status}
                      disabled={savingId === application.id}
                      onChange={(event) => void saveUpdates(application.id, { status: event.target.value as CampApplicationStatus }, "Camp application status updated.")}
                      className="orso-input mt-2 min-w-36"
                    >
                      {campApplicationStatusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDateTime(application.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredApplications.length === 0 ? <p className="bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">No camp applications match this filter.</p> : null}
          {loading ? <p className="bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">Loading camp applications...</p> : null}
        </div>
      </section>
    </div>
  );
}
