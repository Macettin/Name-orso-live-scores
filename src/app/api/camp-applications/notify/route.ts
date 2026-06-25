import { NextResponse, type NextRequest } from "next/server";
import type { CampApplication } from "@/lib/camp-applications";

const defaultRecipient = "eren.yildirim@outlook.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function display(value: string | number | boolean | undefined) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return value?.trim() || "";
}

function detail(label: string, value: string | number | boolean | undefined) {
  const rendered = display(value);
  if (!rendered) return "";
  return `<tr><td style="padding:8px 12px;color:#64748b;font-weight:700;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0f172a;font-weight:800;white-space:pre-wrap;">${escapeHtml(rendered)}</td></tr>`;
}

function getAdminUrl(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}/admin/camps` : `${request.nextUrl.origin}/admin/camps`;
}

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_NOTIFICATION_FROM_EMAIL ?? "Orso Sports Events <onboarding@resend.dev>";
  const toEmail = process.env.APPLICATION_NOTIFICATION_TO_EMAIL ?? defaultRecipient;
  const body = await request.json().catch(() => null) as { application?: CampApplication } | null;
  const application = body?.application;

  if (!application) {
    return NextResponse.json({ error: "Camp application payload is required." }, { status: 400 });
  }
  if (!resendApiKey) {
    return NextResponse.json({ sent: false, reason: "RESEND_API_KEY is not configured." }, { status: 202 });
  }

  const adminUrl = getAdminUrl(request);
  const subject = `New Camp Registration Request - ${application.clubName}`;
  const fields: [string, string | number | boolean | undefined][] = [
    ["Club / Team Name", application.clubName],
    ["Country", application.country],
    ["City", application.city],
    ["Contact Person Name", application.contactPersonName],
    ["Email", application.email],
    ["Phone / WhatsApp", application.phone],
    ["Sport", application.sport],
    ["Age Group / Team Level", application.ageGroup],
    ["Estimated Number of Players", application.estimatedPlayers],
    ["Estimated Number of Staff", application.estimatedStaff],
    ["Preferred Arrival Date", application.preferredArrivalDate],
    ["Preferred Departure Date", application.preferredDepartureDate],
    ["Number of Nights", application.numberOfNights],
    ["Destination Preference", application.destinationPreference],
    ["Hotel Level Preference", application.hotelLevelPreference],
    ["Training Facility Requirement", application.trainingFacilityRequirement],
    ["Friendly Games Needed?", application.friendlyGamesNeeded],
    ["Airport Transfer Needed?", application.airportTransferNeeded],
    ["Special Notes", application.specialNotes]
  ];
  const rows = fields.map(([label, value]) => detail(label, value)).join("");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#0f172a);padding:24px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:900;color:#bfdbfe;">Orso Sports Events</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">New Camp Registration Request</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <div style="padding:20px;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:900;">Open Camp Applications</a>
        </div>
      </div>
    </div>
  `;
  const plainText = [
    "New Camp Registration Request",
    ...fields.map(([label, value]) => {
      const rendered = display(value);
      return rendered ? `${label}: ${rendered}` : "";
    }),
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
