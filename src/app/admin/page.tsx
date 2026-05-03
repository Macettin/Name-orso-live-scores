import { AdminScoreForm } from "@/components/admin-score-form";
import { PageHeader } from "@/components/ui";

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Admin CMS" description="Manage shared teams, players, matches, and scores for the live tournament pages." />
      <AdminScoreForm />
    </>
  );
}
