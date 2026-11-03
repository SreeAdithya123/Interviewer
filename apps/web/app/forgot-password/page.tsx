"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-headline text-lg font-bold text-foreground">
            Vyoman Interviewer
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Forgot Password
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Enter your registered email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-center">
            <p className="font-body text-xs font-semibold uppercase tracking-wider text-destructive">
              Error
            </p>
            <p className="mt-1 font-body text-sm text-destructive">{error}</p>
          </div>
        )}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-headline text-base font-semibold text-foreground">
                Reset Link Sent!
              </h3>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Click the link in the email to set a new password.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block font-body text-xs font-medium text-primary underline"
            >
              &larr; Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block font-body text-xs font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu.in"
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-foreground py-2.5 font-body text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="font-body text-xs text-muted-foreground hover:text-foreground">
                &larr; Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
