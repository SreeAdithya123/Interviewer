import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import InvitationTokenForm from "@/components/auth/InvitationTokenForm";

export const metadata: Metadata = {
  title: "Finish setting up your account",
};

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profileNeedsOnboarding(profile)) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">One more step</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Enter the invitation code your college shared with you to finish setting up your
            account.
          </p>
        </div>

        {/* useSearchParams() inside InvitationTokenForm requires a Suspense
            boundary per Next.js's app-router rules. */}
        <Suspense fallback={<div className="h-56 animate-pulse rounded-3xl bg-muted" />}>
          <InvitationTokenForm />
        </Suspense>

        <p className="mt-6 text-center font-body text-xs text-muted-foreground">
          Signed in as {profile.email}.
        </p>
      </div>
    </main>
  );
}
