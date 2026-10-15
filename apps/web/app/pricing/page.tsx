import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Vyoman Interviewer pricing for colleges and students. Final prices are set after the pilot program — this page shows placeholders only.",
  openGraph: {
    title: "Pricing | Vyoman Interviewer",
    description:
      "Vyoman Interviewer pricing for colleges and students. Final prices are set after the pilot program.",
    type: "website",
    url: "/pricing",
  },
};

const collegePlanIncludes = [
  "Unlimited practice interviews for the batch",
  "Resume builder and resume scanner for every student",
  "TPO dashboard: readiness, weak areas, activity",
  "Bulk CSV invitations and role-based staff access",
  "Pilot program with a dedicated onboarding call",
];

const studentPlanIncludes = [
  "Practice interviews with evidence-backed feedback",
  "Resume builder and scanner",
  "Prep assistant grounded in a reviewed knowledge base",
  "Interview history and weak-area tracking",
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background pt-40 pb-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow bg-primary/10 text-primary">Pricing</span>
            <h1 className="mt-5 font-headline text-foreground">
              Simple pricing, finalized after the pilot.
            </h1>
            <p className="mt-4 font-body text-base leading-body text-muted-foreground">
              We&apos;re deliberately not publishing final numbers yet. Every
              college starts with a pilot, and pricing gets locked in once we
              both know it&apos;s working. The figures below are placeholders
              to show the shape of the plans, not real prices.
            </p>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-dashed border-accent/40 bg-accent/5 px-4 py-2">
            <span className="font-body text-xs font-semibold uppercase tracking-label text-accent">
              All prices below are placeholders — pricing finalized after the pilot
            </span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* College plan */}
            <div className="rounded-3xl border border-border bg-card p-8 shadow-ambient">
              <span className="eyebrow bg-secondary/10 text-secondary">College plan</span>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-metric text-4xl text-foreground">₹[TBD]</span>
                <span className="font-body text-sm text-muted-foreground">/ student / year</span>
              </div>
              <p className="mt-2 font-body text-xs text-accent">
                Placeholder &mdash; pricing finalized after the pilot
              </p>
              <p className="mt-4 font-body text-sm leading-body text-muted-foreground">
                Licensed per enrolled student, billed to the college. Scales
                with your batch size.
              </p>
              <ul className="mt-6 space-y-3">
                {collegePlanIncludes.map((item) => (
                  <li key={item} className="flex gap-2 font-body text-sm text-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/book-a-demo" className="btn-primary mt-8 block text-center">
                Book a demo for your college
              </Link>
            </div>

            {/* Student plan */}
            <div className="rounded-3xl border border-border bg-card p-8 shadow-ambient">
              <span className="eyebrow bg-primary/10 text-primary">Student plan</span>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-metric text-4xl text-foreground">₹[TBD]</span>
                <span className="font-body text-sm text-muted-foreground">/ student</span>
              </div>
              <p className="mt-2 font-body text-xs text-accent">
                Placeholder &mdash; pricing finalized after the pilot
              </p>
              <p className="mt-4 font-body text-sm leading-body text-muted-foreground">
                For students whose college hasn&apos;t adopted Vyoman
                Interviewer yet, or who want individual access.
              </p>
              <ul className="mt-6 space-y-3">
                {studentPlanIncludes.map((item) => (
                  <li key={item} className="flex gap-2 font-body text-sm text-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/for-students" className="btn-secondary mt-8 block text-center">
                See what&apos;s included
              </Link>
            </div>
          </div>

          <p className="mt-10 font-body text-sm text-muted-foreground">
            Have questions about pricing for your specific college or batch
            size?{" "}
            <Link href="/book-a-demo" className="underline">
              Book a demo
            </Link>{" "}
            and we&apos;ll work it out with you directly.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
