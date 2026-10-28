"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

function createImplicitClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit" } }
  );
}

type Status = "idle" | "submitting" | "sent" | "error";

export function EmailOtpForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // OTP token verification state
  const [otpToken, setOtpToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createImplicitClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Google.");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    setVerifyError(null);

    const supabase = createImplicitClient();
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
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanToken = otpToken.trim().replace(/\D/g, "");
    if (!cleanToken) return;

    setVerifying(true);
    setVerifyError(null);

    const supabase = createImplicitClient();
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
      setVerifyError(vErr?.message ?? "Invalid or expired 6-digit verification code.");
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
    if (resendCooldown > 0) return;
    setVerifyError(null);
    const supabase = createImplicitClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: mode === "signup",
      },
    });

    if (otpError) {
      setVerifyError(otpError.message);
    } else {
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-soft">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary shadow-inner">
            ✉️
          </div>
          <h2 className="mt-3 font-headline text-lg font-semibold text-foreground">
            Enter Verification Code
          </h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        {/* Enter 6-digit code directly */}
        <form onSubmit={handleVerifyOtp} className="mt-6 border-t border-border/60 pt-5">
          <label
            htmlFor="otp-code"
            className="block text-center font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            6-digit Code
          </label>
          <input
            id="otp-code"
            name="otp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={otpToken}
            onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))}
            placeholder="······"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] font-semibold text-foreground outline-none transition-colors focus:border-primary shadow-inner"
          />

          {verifyError && (
            <p className="mt-2 text-center font-body text-xs text-destructive">
              {verifyError}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying || otpToken.trim().length < 6}
            className="btn-primary mt-4 w-full disabled:opacity-50"
          >
            {verifying ? "Verifying code..." : "Verify & Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center font-body text-[11px] text-muted-foreground">
          You can also click the direct sign-in button in the email.
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setOtpToken("");
            }}
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-soft">
      {/* 1. Google One-Click Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-xs font-semibold text-foreground transition-all hover:bg-muted/60 disabled:opacity-50 shadow-sm"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{googleLoading ? "Connecting to Google..." : "Continue with Google (Gmail)"}</span>
      </button>

      {/* Divider */}
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/70" />
        </div>
        <span className="relative bg-card px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          or with email verification code
        </span>
      </div>

      {/* 2. Email Verification Code Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="font-body text-xs font-medium text-foreground">
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
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-xs text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        {status === "error" && error && (
          <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 font-body text-xs text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting" || !email}
          className="btn-primary w-full disabled:opacity-50"
        >
          {status === "submitting"
            ? "Sending verification code..."
            : mode === "signup"
              ? "Send verification code & sign up"
              : "Send 6-digit verification code"}
        </button>
      </form>
    </div>
  );
}

export default EmailOtpForm;
