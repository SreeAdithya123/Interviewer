import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import OnboardingFlow from "@/components/auth/OnboardingFlow";

export const metadata: Metadata = {
  title: "Get Started — Finish Setting Up Your Account",
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome to Vyoman
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Prepare for your dream tech placements with AI-driven mock interviews and coding.
        </p>
      </div>

      {/* useSearchParams() inside OnboardingFlow requires a Suspense boundary */}
      <Suspense fallback={<div className="h-96 w-full max-w-lg animate-pulse rounded-3xl bg-muted" />}>
        <OnboardingFlow userEmail={profile.email} initialFullName={profile.full_name} />
      </Suspense>
    </main>
  );
}
