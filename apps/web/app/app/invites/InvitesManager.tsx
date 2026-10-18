"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseCsv, downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export interface BatchOption {
  id: string;
  name: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: "student" | "college_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  batchId: string | null;
  batchName: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const STATUS_BADGE_CLASS: Record<InvitationRow["status"], string> = {
  pending: "bg-secondary/10 text-secondary",
  accepted: "bg-primary/10 text-primary",
  revoked: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const ROLE_LABEL: Record<InvitationRow["role"], string> = {
  student: "Student",
  college_admin: "College admin",
};

interface ParsedRow {
  rowNumber: number;
  email: string;
  roleInput: string;
  batchInput: string;
  role: "student" | "college_admin" | null;
  batchId: string | null;
  error: string | null;
  result: "idle" | "success" | "error";
  resultMessage: string | null;
}

function inviteLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/onboarding?token=${token}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function friendlyInviteError(message: string): string {
  if (message.toLowerCase().includes("duplicate key")) {
    return "An invite to this email is already pending for your college.";
  }
  return message;
}

/**
 * All writes here (insert/update on `invitations`) run through the
 * browser Supabase client under the signed-in college_admin's own
 * session — never a service role — so the real `invitations_insert`/
 * `invitations_update` RLS policies (college_admin + own college) are what
 * actually enforce correctness. This component just builds correct rows
 * and surfaces whatever Postgres/RLS says back.
 */
export function InvitesManager({
  collegeId,
  batches,
  initialInvitations,
}: {
  collegeId: string;
  batches: BatchOption[];
  initialInvitations: InvitationRow[];
}) {
  const supabase = createClient();
  const [invitations, setInvitations] = useState<InvitationRow[]>(initialInvitations);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function upsertInvitation(row: InvitationRow) {
    setInvitations((prev) => {
      const next = prev.filter((r) => r.id !== row.id);
      return [row, ...next].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    });
  }

  function flashCopied(id: string) {
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  }

  async function handleResend(invite: InvitationRow) {
    setBusyId(invite.id);
    const { data, error } = await supabase
      .from("invitations")
      .update({ status: "pending", expires_at: new Date(Date.now() + FOURTEEN_DAYS_MS).toISOString() })
      .eq("id", invite.id)
      .select("id, email, role, status, token, batch_id, accepted_at, expires_at, created_at")
      .single();
    setBusyId(null);

    if (error || !data) return;

    upsertInvitation({
      id: data.id,
      email: data.email,
      role: data.role,
      status: data.status,
      token: data.token,
      batchId: data.batch_id,
      batchName: invite.batchName,
      acceptedAt: data.accepted_at,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    });
    await copyToClipboard(inviteLink(data.token));
    flashCopied(invite.id);
  }

  return (
    <div className="space-y-6">
      <SingleInviteForm
        collegeId={collegeId}
        batches={batches}
        onCreated={(row) => {
          upsertInvitation(row);
          flashCopied(row.id);
        }}
      />

      <CsvInviteUploader collegeId={collegeId} batches={batches} onCreated={upsertInvitation} />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-headline text-lg text-foreground">All invitations</h2>
        {invitations.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-center font-body text-sm text-muted-foreground">
            No invitations sent yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Batch</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Expires</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-4 text-foreground">{invite.email}</td>
                    <td className="py-2 pr-4 text-foreground">{ROLE_LABEL[invite.role]}</td>
                    <td className="py-2 pr-4 text-foreground">{invite.batchName ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                          STATUS_BADGE_CLASS[invite.status],
                        )}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-2">
                      {invite.status === "pending" && (
                        <button
                          type="button"
                          onClick={async () => {
                            await copyToClipboard(inviteLink(invite.token));
                            flashCopied(invite.id);
                          }}
                          className="font-body text-xs font-medium text-primary hover:underline"
                        >
                          {copiedId === invite.id ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {invite.status === "expired" && (
                        <button
                          type="button"
                          onClick={() => handleResend(invite)}
                          disabled={busyId === invite.id}
                          className="font-body text-xs font-medium text-primary hover:underline disabled:opacity-60"
                        >
                          {busyId === invite.id ? "Resending..." : copiedId === invite.id ? "Link copied!" : "Resend"}
                        </button>
                      )}
                      {(invite.status === "accepted" || invite.status === "revoked") && (
                        <span className="font-body text-xs text-muted-foreground">
                          {invite.status === "accepted" && invite.acceptedAt
                            ? `Joined ${new Date(invite.acceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SingleInviteForm({
  collegeId,
  batches,
  onCreated,
}: {
  collegeId: string;
  batches: BatchOption[];
  onCreated: (row: InvitationRow) => void;
}) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLink(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const role = String(data.get("role") ?? "student") as "student" | "college_admin";
    const batchId = String(data.get("batchId") ?? "") || null;

    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const { data: inserted, error: insertError } = await supabase
      .from("invitations")
      .insert({ college_id: collegeId, email, role, batch_id: batchId })
      .select("id, email, role, status, token, batch_id, accepted_at, expires_at, created_at")
      .single();
    setSubmitting(false);

    if (insertError || !inserted) {
      setError(friendlyInviteError(insertError?.message ?? "Something went wrong creating this invite."));
      return;
    }

    const batchName = batches.find((b) => b.id === inserted.batch_id)?.name ?? null;
    onCreated({
      id: inserted.id,
      email: inserted.email,
      role: inserted.role,
      status: inserted.status,
      token: inserted.token,
      batchId: inserted.batch_id,
      batchName,
      acceptedAt: inserted.accepted_at,
      expiresAt: inserted.expires_at,
      createdAt: inserted.created_at,
    });

    const generatedLink = inviteLink(inserted.token);
    setLink(generatedLink);
    await copyToClipboard(generatedLink);
    form.reset();
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-headline text-lg text-foreground">Create an invite link</h2>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Generates a one-time link for a single student or admin to join your college.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
        <input
          name="email"
          type="email"
          required
          placeholder="student@example.edu"
          className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
        <select
          name="role"
          defaultValue="student"
          className="rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="student">Student</option>
          <option value="college_admin">College admin</option>
        </select>
        <select
          name="batchId"
          defaultValue=""
          className="rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">No batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-60">
          {submitting ? "Creating..." : "Create link"}
        </button>
      </form>

      {error && <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">{error}</p>}
      {link && (
        <p className="mt-3 rounded-2xl bg-primary/10 px-4 py-3 font-body text-sm text-foreground">
          Link copied to your clipboard: <span className="font-mono text-xs">{link}</span>
        </p>
      )}
    </section>
  );
}

function CsvInviteUploader({
  collegeId,
  batches,
  onCreated,
}: {
  collegeId: string;
  batches: BatchOption[];
  onCreated: (row: InvitationRow) => void;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function reset() {
    setRows([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleTemplateDownload() {
    downloadCsv("invite-template.csv", [
      ["email", "role", "batch"],
      ["student@example.edu", "student", batches[0]?.name ?? ""],
    ]);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      setFileError("That file has no rows.");
      setRows([]);
      return;
    }

    const header = parsed[0].map((h) => h.toLowerCase());
    const emailIdx = header.indexOf("email");
    const roleIdx = header.indexOf("role");
    const batchIdx = header.indexOf("batch");

    if (emailIdx === -1) {
      setFileError("CSV must have an \"email\" column (role and batch are optional).");
      setRows([]);
      return;
    }

    const seenEmails = new Set<string>();
    const parsedRows: ParsedRow[] = parsed.slice(1).map((fields, index) => {
      const email = fields[emailIdx] ?? "";
      const roleInput = roleIdx >= 0 ? fields[roleIdx] ?? "" : "";
      const batchInput = batchIdx >= 0 ? fields[batchIdx] ?? "" : "";
      const errors: string[] = [];

      if (!email) {
        errors.push("Missing email");
      } else if (!EMAIL_PATTERN.test(email)) {
        errors.push("Invalid email");
      } else {
        const key = email.toLowerCase();
        if (seenEmails.has(key)) {
          errors.push("Duplicate email in this file");
        }
        seenEmails.add(key);
      }

      let role: "student" | "college_admin" | null = "student";
      if (roleInput) {
        const normalized = roleInput.toLowerCase().replace(" ", "_");
        if (normalized === "student" || normalized === "college_admin") {
          role = normalized;
        } else {
          role = null;
          errors.push(`Unknown role "${roleInput}" (use student or college_admin)`);
        }
      }

      let batchId: string | null = null;
      if (batchInput) {
        const match = batches.find((b) => b.name.toLowerCase() === batchInput.toLowerCase());
        if (match) {
          batchId = match.id;
        } else {
          errors.push(`Unknown batch "${batchInput}"`);
        }
      }

      return {
        rowNumber: index + 2, // +1 for 0-index, +1 for the header row
        email,
        roleInput,
        batchInput,
        role,
        batchId,
        error: errors.length > 0 ? errors.join("; ") : null,
        result: "idle" as const,
        resultMessage: null,
      };
    });

    setRows(parsedRows);
  }

  const validCount = rows.filter((r) => !r.error).length;

  async function handleSend() {
    setSending(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (row.error || row.role === null) continue;

      const { data, error } = await supabase
        .from("invitations")
        .insert({ college_id: collegeId, email: row.email, role: row.role, batch_id: row.batchId })
        .select("id, email, role, status, token, batch_id, accepted_at, expires_at, created_at")
        .single();

      if (error || !data) {
        updated[i] = { ...row, result: "error", resultMessage: friendlyInviteError(error?.message ?? "Failed") };
      } else {
        updated[i] = { ...row, result: "success", resultMessage: "Invited" };
        const batchName = batches.find((b) => b.id === data.batch_id)?.name ?? null;
        onCreated({
          id: data.id,
          email: data.email,
          role: data.role,
          status: data.status,
          token: data.token,
          batchId: data.batch_id,
          batchName,
          acceptedAt: data.accepted_at,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
        });
      }
      setRows([...updated]);
    }

    setSending(false);
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg text-foreground">Upload a CSV</h2>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Columns: <code className="font-mono text-xs">email</code> (required),{" "}
            <code className="font-mono text-xs">role</code> and <code className="font-mono text-xs">batch</code>{" "}
            (both optional — role defaults to student, batch must match an existing batch name).
          </p>
        </div>
        <button type="button" onClick={handleTemplateDownload} className="btn-secondary shrink-0 text-xs">
          Download template
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="font-body text-sm text-foreground"
        />
        {rows.length > 0 && (
          <button type="button" onClick={reset} className="font-body text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {fileError && <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">{fileError}</p>}

      {rows.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-foreground">{row.email || "—"}</td>
                    <td className="px-3 py-2 text-foreground">{row.roleInput || "student"}</td>
                    <td className="px-3 py-2 text-foreground">{row.batchInput || "—"}</td>
                    <td className="px-3 py-2">
                      {row.result === "success" ? (
                        <span className="font-medium text-primary">Invited</span>
                      ) : row.result === "error" ? (
                        <span className="text-destructive">{row.resultMessage}</span>
                      ) : row.error ? (
                        <span className="text-destructive">{row.error}</span>
                      ) : (
                        <span className="text-muted-foreground">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || validCount === 0}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {sending ? "Sending..." : `Send ${validCount} invite${validCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </section>
  );
}

export default InvitesManager;
