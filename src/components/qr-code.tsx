"use client";

import { QRCodeSVG } from "qrcode.react";

export function MatchQrCode({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <QRCodeSVG value={value} size={168} level="M" includeMargin />
    </div>
  );
}
