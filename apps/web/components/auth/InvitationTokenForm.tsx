"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = "idle" | "submitting" | "error";

/**
 * Lets a signed-in, not-yet-onboarded student redeem a college's
 * invitation token (POSTs to app/api/invitations/accept/route.ts, which
 * calls the `accept_invitation` Postgres function). Prefills the token
 * from `?token=...` so a college admin can share either a bare code or a
 * full `/onboarding?token=...` link.
 */
export function InvitationTokenForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(json?.error ?? "Something went wrong. Please check the code and try again.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-8 shadow-soft">
      <label htmlFor="token" className="font-body text-sm font-medium text-foreground">
        Invitation code
      </label>
      <input
        id="token"
        name="token"
        type="text"
        required
        autoComplete="off"
        spellCheck={false}
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="Paste the code your college sent you"
        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
      />

      {status === "error" && error && (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !token.trim()}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        {status === "submitting" ? "Joining..." : "Join my college"}
      </button>
    </form>
  );
}

export default InvitationTokenForm;
