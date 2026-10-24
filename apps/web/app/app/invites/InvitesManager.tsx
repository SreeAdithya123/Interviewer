"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseCsv, downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/app-shell/StatusBadge";

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

      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">All sent invitations</h2>
        <p className="font-body text-xs text-muted-foreground">Historical batch and individual invites</p>

        {invitations.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-border/80 bg-background px-4 py-6 text-center font-body text-xs text-muted-foreground">
            No invitations sent yet. Use the form above to invite students.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Batch</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Expires</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr
                    key={invite.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{invite.email}</td>
                    <td className="px-3 py-3 text-muted-foreground">{ROLE_LABEL[invite.role]}</td>
                    <td className="px-3 py-3 text-foreground">{invite.batchName ?? "—"}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={invite.status} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invite.status === "pending" && (
                        <button
                          type="button"
                          onClick={async () => {
                            await copyToClipboard(inviteLink(invite.token));
                            flashCopied(invite.id);
                          }}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {copiedId === invite.id ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {invite.status === "expired" && (
                        <button
                          type="button"
                          onClick={() => handleResend(invite)}
                          disabled={busyId === invite.id}
                          className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-60"
                        >
                          {busyId === invite.id ? "Resending..." : copiedId === invite.id ? "Link copied!" : "Resend"}
                        </button>
                      )}
                      {(invite.status === "accepted" || invite.status === "revoked") && (
                        <span className="text-muted-foreground">
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
    <section className="rounded-lg border border-border/80 bg-card p-5">
      <h2 className="font-body text-sm font-semibold text-foreground">Create an invitation link</h2>
      <p className="mt-0.5 font-body text-xs text-muted-foreground">
        Generates a one-time onboarding link for a student or college admin.
      </p>

      <form onSubmit={handleSubmit} className="mt-3.5 flex flex-wrap items-center gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="student@sasi.edu"
          className="h-8 flex-1 min-w-[200px] rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
        />
        <select
          name="role"
          defaultValue="student"
          className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
        >
          <option value="student">Student</option>
          <option value="college_admin">College admin</option>
        </select>
        <select
          name="batchId"
          defaultValue=""
          className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
        >
          <option value="">No batch assigned</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create & copy link"}
        </button>
      </form>

      {error && (
        <p className="mt-2.5 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-body text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}
      {link && (
        <p className="mt-2.5 rounded border border-border/80 bg-muted/30 px-3 py-2 font-body text-xs text-foreground">
          Link copied to clipboard: <span className="font-mono text-[11px] text-muted-foreground">{link}</span>
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
      ["student@sasi.edu", "student", batches[0]?.name ?? ""],
    ]);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      setFileError("The selected file has no data rows.");
      setRows([]);
      return;
    }

    const header = parsed[0].map((h) => h.toLowerCase());
    const emailIdx = header.indexOf("email");
    const roleIdx = header.indexOf("role");
    const batchIdx = header.indexOf("batch");

    if (emailIdx === -1) {
      setFileError("CSV must include an 'email' column.");
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
        errors.push("Invalid email format");
      } else {
        const key = email.toLowerCase();
        if (seenEmails.has(key)) {
          errors.push("Duplicate email in file");
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
          errors.push(`Invalid role '${roleInput}'`);
        }
      }

      let batchId: string | null = null;
      if (batchInput) {
        const match = batches.find((b) => b.name.toLowerCase() === batchInput.toLowerCase());
        if (match) {
          batchId = match.id;
        } else {
          errors.push(`Unknown batch '${batchInput}'`);
        }
      }

      return {
        rowNumber: index + 2,
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
    <section className="rounded-lg border border-border/80 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-body text-sm font-semibold text-foreground">Upload CSV batch</h2>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            Columns: <code className="font-mono text-[11px]">email</code> (required),{" "}
            <code className="font-mono text-[11px]">role</code> and <code className="font-mono text-[11px]">batch</code> (optional).
          </p>
        </div>
        <button
          type="button"
          onClick={handleTemplateDownload}
          className="inline-flex h-7 items-center rounded border border-border/80 bg-background px-2.5 font-body text-[11px] font-medium text-foreground hover:bg-muted"
        >
          Download template
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="font-body text-xs text-foreground"
        />
        {rows.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="font-body text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {fileError && (
        <p className="mt-2.5 rounded border border-rose-200 bg-rose-50 px-3 py-2 font-body text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {fileError}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="overflow-x-auto rounded border border-border/80">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{row.email || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.roleInput || "student"}</td>
                    <td className="px-3 py-2 text-foreground">{row.batchInput || "—"}</td>
                    <td className="px-3 py-2">
                      {row.result === "success" ? (
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">Invited</span>
                      ) : row.result === "error" ? (
                        <span className="text-rose-700 dark:text-rose-400">{row.resultMessage}</span>
                      ) : row.error ? (
                        <span className="text-rose-700 dark:text-rose-400">{row.error}</span>
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
            className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
          >
            {sending ? "Sending..." : `Send ${validCount} invitation${validCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </section>
  );
}

export default InvitesManager;
