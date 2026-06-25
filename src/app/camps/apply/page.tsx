import type { Metadata } from "next";
import CampApplyClient from "./camp-apply-client";

export const metadata: Metadata = {
  title: "Camp Registration | Orso Sports Hub",
  description: "Request a sports training camp package with Orso Sports Events."
};

export default function CampApplyPage() {
  return <CampApplyClient />;
}
