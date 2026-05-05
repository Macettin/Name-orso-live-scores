"use client";

import { QRCodeSVG } from "qrcode.react";

function toPublicUrl(value: string) {
  if (/^https?:\/\//i.test(value) || typeof window === "undefined") {
    return value;
  }

  return new URL(value, window.location.origin).toString();
}

export function MatchQrCode({ value, size = 168 }: { value: string; size?: number }) {
  const publicUrl = toPublicUrl(value);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <QRCodeSVG value={publicUrl} size={size} level="M" includeMargin />
    </div>
  );
}
