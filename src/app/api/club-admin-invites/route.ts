import { NextResponse, type NextRequest } from "next/server";

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

function getLoginUrl(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const origin = host ? `${forwardedProto ?? "https"}://${host}` : request.nextUrl.origin;
  return `${origin}/login`;
}

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_NOTIFICATION_FROM_EMAIL ?? "Orso Sports Events <onboarding@resend.dev>";

  if (!resendApiKey) {
    return NextResponse.json({ sent: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    email?: string;
    nameSurname?: string;
    tournamentName?: string;
    teamName?: string;
    club?: string;
  } | null;

  const email = text(body?.email);
  const nameSurname = text(body?.nameSurname) || "Club admin";
  const tournamentName = text(body?.tournamentName);
  const teamName = text(body?.teamName) || text(body?.club);

  if (!email || !tournamentName || !teamName) {
    return NextResponse.json({ sent: false, error: "Email, tournament name, and team name are required." }, { status: 400 });
  }

  const loginUrl = getLoginUrl(request);
  const subject = `${tournamentName} club admin access for ${teamName}`;
  const plainText = [
    `Hello ${nameSurname},`,
    "",
    `${teamName} has been accepted for ${tournamentName}.`,
    "",
    "You can use the Orso club admin area to upload and manage your roster, player photos, and team logo.",
    "",
    `Login page: ${loginUrl}`,
    "",
    "If your account is not active or you cannot sign in, contact Orso Sports Events so we can activate or create your Supabase Auth account.",
    "",
    "Orso Sports Events"
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#0f172a);padding:24px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:900;color:#bfdbfe;">Orso Sports Events</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">Club admin access</h1>
        </div>
        <div style="padding:24px;color:#0f172a;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 14px;">Hello ${escapeHtml(nameSurname)},</p>
          <p style="margin:0 0 14px;"><strong>${escapeHtml(teamName)}</strong> has been accepted for <strong>${escapeHtml(tournamentName)}</strong>.</p>
          <p style="margin:0 0 18px;">You can use the Orso club admin area to upload and manage your roster, player photos, and team logo.</p>
          <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:900;">Open login page</a>
          <p style="margin:18px 0 0;color:#475569;">If your account is not active or you cannot sign in, contact Orso Sports Events so we can activate or create your Supabase Auth account.</p>
        </div>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
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
