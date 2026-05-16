import { NextResponse, type NextRequest } from "next/server";
import type { TournamentApplication } from "@/lib/types";

const defaultRecipient = "eren.yildirim@outlook.com";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detail(label: string, value: string | number | undefined) {
  const displayValue = typeof value === "number" ? String(value) : text(value);
  if (!displayValue) return "";
  return `<tr><td style="padding:8px 12px;color:#64748b;font-weight:700;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0f172a;font-weight:800;">${escapeHtml(displayValue)}</td></tr>`;
}

function getAdminApplicationsUrl(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const origin = host ? `${forwardedProto ?? "https"}://${host}` : request.nextUrl.origin;
  return `${origin}/admin#applications`;
}

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_NOTIFICATION_FROM_EMAIL ?? "Orso Sports Events <onboarding@resend.dev>";
  const toEmail = process.env.APPLICATION_NOTIFICATION_TO_EMAIL ?? defaultRecipient;

  if (!resendApiKey) {
    return NextResponse.json({ sent: false, reason: "RESEND_API_KEY is not configured." }, { status: 202 });
  }

  const body = await request.json().catch(() => null) as { application?: TournamentApplication; tournamentName?: string } | null;
  const application = body?.application;
  if (!application) {
    return NextResponse.json({ error: "Application payload is required." }, { status: 400 });
  }

  const tournamentName = text(body?.tournamentName) || application.tournamentId;
  const adminUrl = getAdminApplicationsUrl(request);
  const subject = `New tournament application: ${application.club} - ${tournamentName}`;
  const countryCity = [application.country, application.city].map(text).filter(Boolean).join(" / ");
  const rows = [
    detail("Tournament", tournamentName),
    detail("Name surname", application.nameSurname),
    detail("Club", application.club),
    detail("Phone number", application.phone),
    detail("Email address", application.email),
    detail("Estimated players", application.estimatedPlayers),
    detail("Age group", application.ageGroup),
    detail("Estimated coach/staff", application.estimatedStaff),
    detail("Country / city", countryCity),
    detail("Notes", application.notes)
  ].join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#0f172a);padding:24px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:900;color:#bfdbfe;">Orso Sports Events</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">New tournament application</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <div style="padding:20px;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:900;">Open Applications</a>
        </div>
      </div>
    </div>
  `;

  const plainText = [
    "New tournament application",
    `Tournament: ${tournamentName}`,
    `Name surname: ${application.nameSurname}`,
    `Club: ${application.club}`,
    `Phone number: ${application.phone}`,
    `Email address: ${application.email}`,
    `Estimated players: ${application.estimatedPlayers}`,
    `Age group: ${application.ageGroup}`,
    `Estimated coach/staff: ${application.estimatedStaff}`,
    countryCity ? `Country / city: ${countryCity}` : "",
    application.notes ? `Notes: ${application.notes}` : "",
    `Admin link: ${adminUrl}`
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      text: plainText
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Email provider request failed.");
    return NextResponse.json({ sent: false, error: errorText }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
