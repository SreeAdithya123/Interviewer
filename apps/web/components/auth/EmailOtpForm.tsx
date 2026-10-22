"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "sent" | "error";

/**
 * Email-OTP form shared by /login and /signup.
 * Supports BOTH:
 *  1. One-click sign-in link via email
 *  2. Direct 6-digit verification code entry (works across different devices/browsers)
 */
export function EmailOtpForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // OTP token verification state
  const [otpToken, setOtpToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    setVerifyError(null);

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

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanToken = otpToken.trim();
    if (!cleanToken) return;

    setVerifying(true);
    setVerifyError(null);

    const supabase = createClient();
    let { data, error: vErr } = await supabase.auth.verifyOtp({
      email,
      token: cleanToken,
      type: mode === "signup" ? "signup" : "email",
    });

    // Fallback try with type: 'magiclink' if 'email' returned an error
    if (vErr && mode === "login") {
      const fallback = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: "magiclink",
      });
      if (!fallback.error) {
        data = fallback.data;
        vErr = null;
      }
    }

    if (vErr || !data?.user) {
      setVerifying(false);
      setVerifyError(vErr?.message ?? "Invalid or expired verification code.");
      return;
    }

    // Success! Load profile to determine destination
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, college_id")
      .eq("id", data.user.id)
      .single();

    const destination = profile?.role && profile?.college_id ? "/app" : "/onboarding";
    window.location.href = destination;
  }

  async function handleResend() {
    setVerifyError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: mode === "signup",
      },
    });

    if (otpError) {
      setVerifyError(otpError.message);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✉️
          </div>
          <h2 className="mt-3 font-headline text-xl text-foreground">Check your email</h2>
          <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
            We sent a sign-in link and 6-digit verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        {/* Option A: Enter 6-digit code directly */}
        <form onSubmit={handleVerifyOtp} className="mt-6 border-t border-border pt-6">
          <label htmlFor="otp-code" className="block text-center font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Enter 6-digit verification code
          </label>
          <input
            id="otp-code"
            name="otp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            required
            autoFocus
            value={otpToken}
            onChange={(e) => setOtpToken(e.target.value)}
            placeholder="123456"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-center font-mono text-lg tracking-widest text-foreground outline-none transition-colors focus:border-primary"
          />

          {verifyError && (
            <p className="mt-2 text-center font-body text-xs text-destructive">
              {verifyError}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying || !otpToken.trim()}
            className="btn-primary mt-4 w-full disabled:opacity-60"
          >
            {verifying ? "Verifying code..." : "Verify & Sign In"}
          </button>
        </form>

        {/* Option B: Click link */}
        <p className="mt-4 text-center font-body text-xs text-muted-foreground">
          &mdash; or click the link in your email on this device &mdash;
        </p>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            ← Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-primary underline"
          >
            Resend email
          </button>
        </div>
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
