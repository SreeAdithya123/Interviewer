import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import { DemoRequestForm } from "./DemoRequestForm";

export const metadata: Metadata = {
  title: "Book a Demo",
  description:
    "See Vyoman Interviewer with your placement cell. Tell us about your college and batch size and we'll set up a walkthrough.",
  openGraph: {
    title: "Book a Demo | Vyoman Interviewer",
    description:
      "See Vyoman Interviewer with your placement cell. Tell us about your college and batch size and we'll set up a walkthrough.",
    type: "website",
    url: "/book-a-demo",
  },
};

export default function BookADemoPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background pt-40 pb-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow bg-primary/10 text-primary">Book a demo</span>
            <h1 className="mt-5 font-headline text-foreground">
              See it with your own placement data in mind.
            </h1>
            <p className="mt-4 font-body text-base leading-body text-muted-foreground">
              Tell us about your college and we&apos;ll walk your placement
              team through a live session &mdash; practice interviews,
              resume tools, and the TPO dashboard. No commitment, no cost.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-6">
              <InfoCard
                title="What happens next"
                body="We reply within one or two working days to schedule a 30-minute call with your placement cell."
              />
              <InfoCard
                title="Pilot-friendly"
                body="Most colleges start with a pilot batch before a full rollout — ask us about it on the call."
              />
              <InfoCard
                title="Prefer email?"
                body="You're welcome to write to us directly once we share contact details on the call."
              />
            </div>

            <DemoRequestForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h3 className="font-headline text-foreground">{title}</h3>
      <p className="mt-2 font-body text-sm leading-body text-muted-foreground">{body}</p>
    </div>
  );
}
