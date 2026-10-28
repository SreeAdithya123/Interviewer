import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import EmailOtpForm from "@/components/auth/EmailOtpForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Vyoman Interviewer with your email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(profileNeedsOnboarding(profile) ? "/onboarding" : "/app");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const error = resolvedParams?.error;
  const message = resolvedParams?.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-headline text-lg text-foreground">
            Vyoman Interviewer
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Sign in with Google or receive a 6-digit verification code.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-center">
            <p className="font-body text-xs font-semibold uppercase tracking-wider text-destructive">
              Sign-in Link Error
            </p>
            <p className="mt-1 font-body text-sm text-destructive">
              {error === "auth_callback_failed"
                ? message || "This link expired or was opened in a different browser. Enter your email below to receive a new link or enter your 6-digit code."
                : message || "Authentication failed. Please request a new link."}
            </p>
          </div>
        )}

        <EmailOtpForm mode="login" />

        <p className="mt-6 text-center font-body text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
