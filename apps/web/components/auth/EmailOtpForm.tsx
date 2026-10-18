"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "sent" | "error";

/**
 * Email-OTP ("magic link") form shared by /login and /signup. Both pages
 * use the same Supabase call (`supabase.auth.signInWithOtp`) — the only
 * difference is `shouldCreateUser`, so a login attempt for an email that
 * has never signed up fails clearly instead of silently creating an
 * account.
 */
export function EmailOtpForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: mode === "signup",
      },
    });

    if (otpError) {
      setStatus("error");
      setError(
        mode === "login" && otpError.message.toLowerCase().includes("signups not allowed")
          ? "We couldn't find an account for that email. Try creating one instead."
          : otpError.message,
      );
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <h2 className="font-headline text-xl text-foreground">Check your email</h2>
        <p className="mt-3 font-body text-sm leading-body text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>.
          Open it on this device to continue.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 font-body text-sm font-medium text-primary underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-8 shadow-soft">
      <label htmlFor="email" className="font-body text-sm font-medium text-foreground">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@college.edu.in"
        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />

      {status === "error" && error && (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !email}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : mode === "signup" ? "Create account" : "Send sign-in link"}
      </button>
    </form>
  );
}

export default EmailOtpForm;
