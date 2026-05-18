import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardCheck, Download, FileText, LifeBuoy, ShieldCheck, Trophy, Users } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Help | Orso Sports Hub",
  description: "User guide and operating manual for Orso Sports Hub."
};

const quickLinks = [
  "Downloads",
  "What is Orso Sports Hub",
  "User roles",
  "Admin guide",
  "Scorekeeper guide",
  "Club admin guide",
  "Public user guide",
  "Tournament application guide",
  "Troubleshooting"
];

const downloads = [
  {
    title: "User Manual PDF",
    description: "For admins, club admins, and organizers.",
    href: "/docs/Orso_Sports_Hub_User_Manual.pdf"
  },
  {
    title: "Scorekeeper Quick Guide PDF",
    description: "One-page match-day guide for scorers.",
    href: "/docs/Orso_Sports_Hub_Scorekeeper_Quick_Guide.pdf"
  }
];

const sections = [
  {
    title: "What is Orso Sports Hub",
    icon: Trophy,
    body: [
      "Orso Sports Hub is the public and operations portal for Orso Sports Events tournaments.",
      "It brings together tournament pages, fixtures, live scores, standings, team profiles, player statistics, match reports, news, galleries, QR court views, and tournament applications.",
      "Public users can follow an event without signing in. Authorized users can manage tournament data, rosters, live match operations, and scorekeeping workflows."
    ]
  },
  {
    title: "User roles",
    icon: Users,
    body: [
      "Public user: views tournaments, fixtures, standings, live scores, match pages, teams, players, news, galleries, reports, QR court pages, and application forms.",
      "Scorekeeper: enters live match events and score updates from the scorekeeper or match console screens assigned by tournament staff.",
      "Club admin: manages club and team information, roster details, player updates, staff records, and tournament application follow-up where access is granted.",
      "Admin: manages tournament setup, teams, fixtures, match data, rosters, media, sponsors, news, applications, and operational tools."
    ]
  },
  {
    title: "Admin guide",
    icon: ShieldCheck,
    body: [
      "Open Admin from the main navigation and sign in with an authorized account.",
      "Create or update tournaments first, then add teams, players, fixtures, sponsors, media, and news as required.",
      "Use fixture and match tools to set match status, schedule details, courts, team assignments, officials, and live operation links.",
      "Review tournament applications from the admin area, follow up with clubs, and connect accepted applications to teams.",
      "Before an event starts, verify that fixtures, team logos, rosters, court links, and public tournament pages display correctly."
    ]
  },
  {
    title: "Scorekeeper guide",
    icon: ClipboardCheck,
    body: [
      "Use the scorekeeper or match console link provided by the tournament admin for the assigned match.",
      "Confirm the match, teams, current phase, clock state, and roster before entering live events.",
      "Record goals, cards, substitutions, player statistics, team statistics, and clock changes as the match progresses.",
      "Keep the match status accurate: Scheduled before kickoff, Live during play, and Final only after the result is confirmed.",
      "If a mistake is made, correct it as soon as possible and notify the admin if the public score or report needs review."
    ]
  },
  {
    title: "Club admin guide",
    icon: Users,
    body: [
      "Open Club Admin after signing in with a club administrator account.",
      "Review club and team records, update roster details, manage player information, and keep team staff data current.",
      "Check tournament-specific requirements before submitting or updating player lists.",
      "Use application follow-up fields and admin messages when tournament staff request missing information.",
      "Contact tournament staff if a team, player, or permission is missing from your club admin view."
    ]
  },
  {
    title: "Public user guide",
    icon: BookOpen,
    body: [
      "Use Tournaments to choose an event, then browse Fixtures, Live, Standings, Teams, Players, and Gallery from the main navigation.",
      "Open a match page for score, timeline, statistics, lineups, disciplinary records, and reports where available.",
      "Use the tournament selector in the header to switch between events.",
      "Scan or open court QR pages at venues to see the live court view for the selected hall.",
      "Published news, sponsors, media, and tournament branding are shown automatically when available."
    ]
  },
  {
    title: "Tournament application guide",
    icon: ClipboardCheck,
    body: [
      "Open Apply from the main navigation or use a tournament-specific application link.",
      "Select the correct tournament and complete club, team, contact, and participation details.",
      "Submit the application only after checking names, phone numbers, email addresses, and roster information.",
      "Tournament staff may contact the applicant for missing details or approval steps.",
      "An application is not final tournament entry until Orso Sports Events or tournament administration confirms it."
    ]
  },
  {
    title: "Troubleshooting",
    icon: LifeBuoy,
    body: [
      "If data looks outdated, refresh the page and confirm the correct tournament is selected in the header.",
      "If a live score is missing, the match may not be marked Live yet or the scorekeeper may not have started updates.",
      "If you cannot access Admin or Club Admin, confirm that you are signed in with the correct authorized account.",
      "If a public page is missing a logo, photo, sponsor, media item, or report, it may not have been added or published yet.",
      "For urgent event-day issues, contact Orso Sports Events through the social or contact links in the header."
    ]
  }
];

function slugify(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

export default function HelpPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Help and manual"
        title="Orso Sports Hub help"
        description="A practical guide for public visitors, tournament administrators, scorekeepers, and club administrators using Orso Sports Hub."
      />

      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
        <div className="bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Start here</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find the right guide for your role</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-blue-50 sm:text-base sm:leading-7">
            Use this page as the operating manual for tournament browsing, live match operations, team administration, and application workflows.
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link}
              href={`#${slugify(link)}`}
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
            >
              {link}
            </Link>
          ))}
        </div>
      </section>

      <section id="downloads" className="scroll-mt-28 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="mb-4 flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <Download size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Manuals</p>
            <h2 className="mt-1 break-words text-xl font-black leading-tight text-slate-950">Downloads</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
              Download official Orso Sports Hub manuals for event setup, club administration, and match-day scorekeeping.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {downloads.map((download) => (
            <a
              key={download.href}
              href={download.href}
              download
              className="group flex min-w-0 flex-col justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-4 transition hover:border-blue-200 hover:bg-blue-50 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">
                  <FileText size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-base font-black text-slate-950 group-hover:text-blue-700">{download.title}</span>
                  <span className="mt-1 block text-sm font-medium leading-6 text-slate-600">{download.description}</span>
                </span>
              </span>
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white transition group-hover:bg-blue-700">
                Download PDF
                <Download size={16} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Card key={section.title}>
              <article id={slugify(section.title)} className="min-w-0 scroll-mt-28">
                <div className="mb-4 flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Guide</p>
                    <h2 className="mt-1 break-words text-xl font-black leading-tight text-slate-950">{section.title}</h2>
                  </div>
                </div>
                <ul className="grid gap-3 text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                  {section.body.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
