import type { Metadata } from "next";
import { requireCollegeAdmin } from "@/lib/auth/require-college-admin";
import { createClient } from "@/lib/supabase/server";
import InvitesManager, { type BatchOption, type InvitationRow } from "./InvitesManager";

export const metadata: Metadata = {
  title: "Invites",
};

// See app/app/students/page.tsx's StudentProfileRow comment: no generated
// Database type exists for the Supabase client, so an embedded-relation
// select like "batches(name)" can't be typed from the string alone and
// needs a manual cast to its real shape.
interface InvitationQueryRow {
  id: string;
  email: string;
  role: "student" | "college_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  batch_id: string | null;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  batches: { name: string } | null;
}

// docs/BUILD_SPEC.md Part 4.7: "Invites: CSV upload with validation and
// error rows shown, invite links, resend." Unlike the Overview/Students
// pages, this one writes real rows too (invitations INSERT/UPDATE), which
// the task explicitly says can be fully real — it's just data, no AI
// involved. Writes happen client-side under the signed-in admin's own
// session (InvitesManager), so RLS's own insert/update policies
// (college_admin + own college) are what actually enforce correctness,
// not this page.
export default async function InvitesPage() {
  const profile = await requireCollegeAdmin();
  const supabase = await createClient();

  const [batchesRes, invitationsRes] = await Promise.all([
    supabase.from("batches").select("id, name").order("name", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, email, role, status, token, batch_id, invited_by, accepted_at, expires_at, created_at, batches(name)")
      .order("created_at", { ascending: false }),
  ]);

  const batches: BatchOption[] = (batchesRes.data ?? []).map((batch) => ({ id: batch.id, name: batch.name }));
  const invitationRows = (invitationsRes.data ?? []) as unknown as InvitationQueryRow[];
  const invitations: InvitationRow[] = invitationRows.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    token: invite.token,
    batchId: invite.batch_id,
    batchName: invite.batches?.name ?? null,
    acceptedAt: invite.accepted_at,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Invites</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Bring students onto Vyoman Interviewer by CSV upload or a one-off invite link.
        </p>
      </div>

      {/* profile.college_id is non-null here: requireCollegeAdmin only lets
          through role === "college_admin", and a college_admin is always
          provisioned with a college directly (never via self-serve
          onboarding, which is student-only) — see profileNeedsOnboarding. */}
      <InvitesManager collegeId={profile.college_id as string} batches={batches} initialInvitations={invitations} />
    </div>
  );
}
