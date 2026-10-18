import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import EmailOtpForm from "@/components/auth/EmailOtpForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Vyoman Interviewer account with your email.",
};

export default async function SignupPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(profileNeedsOnboarding(profile) ? "/onboarding" : "/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-headline text-lg text-foreground">
            Vyoman Interviewer
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            We will email you a sign-in link &mdash; no password needed.
          </p>
        </div>

        <EmailOtpForm mode="signup" />

        <p className="mt-6 text-center font-body text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
