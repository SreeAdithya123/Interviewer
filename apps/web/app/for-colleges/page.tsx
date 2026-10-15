import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "For Colleges",
  description:
    "Vyoman Interviewer for placement cells: a TPO dashboard to see which students are ready, a pilot program, and Mumbai-region data residency under India's DPDP Act.",
  openGraph: {
    title: "For Colleges | Vyoman Interviewer",
    description:
      "A TPO dashboard to see which students are ready, a pilot program, and India data residency.",
    type: "website",
    url: "/for-colleges",
  },
};

const dashboardMetrics = [
  { label: "Batch readiness", value: "Students scored and ranked by interview readiness" },
  { label: "Weak areas", value: "Where the batch is consistently losing marks" },
  { label: "Activity", value: "Who has practiced, how often, and how recently" },
];

const pilotSteps = [
  {
    step: "1",
    title: "Pick a pilot batch",
    body: "Start with one department or final-year batch instead of the whole college. Most placement cells find this is enough to judge fit.",
  },
  {
    step: "2",
    title: "We onboard your students",
    body: "Bulk invitations by CSV, role-based access for your placement team, and a short walkthrough call for your staff.",
  },
  {
    step: "3",
    title: "Review outcomes together",
    body: "At the end of the pilot, we go through the dashboard with you and decide together whether to extend it college-wide.",
  },
];

export default function ForCollegesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background">
        {/* Hero */}
        <section className="bg-ink pt-40 pb-24 text-ink-foreground">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <span className="eyebrow bg-ink-soft text-ink-muted">For placement cells</span>
            <h1 className="mt-5 font-headline">
              See which students are ready <span className="text-spectrum">before</span> recruiters do.
            </h1>
            <p className="mt-5 max-w-2xl font-body text-base leading-body text-ink-muted">
              Vyoman Interviewer gives your placement cell a single place to see
              who has practiced, how they scored, and where the batch as a
              whole is weak &mdash; so you can focus training where it
              actually matters before placement season.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-a-demo" className="btn-primary">
                Book a demo
              </Link>
              <Link href="/pricing" className="btn-secondary border-white/15 text-ink-foreground hover:bg-white/5">
                See college pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Dashboard placeholder mockup */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="eyebrow bg-primary/10 text-primary">The TPO dashboard</span>
              <h2 className="mt-5 font-headline text-foreground">
                One screen for the whole batch.
              </h2>
              <p className="mt-4 font-body text-base leading-body text-muted-foreground">
                The real dashboard is still in development, so there are no
                product screenshots yet. Below is a styled placeholder showing
                the kind of data it will surface &mdash; not an actual screen
                from the app.
              </p>
            </div>

            <div className="mt-10 rounded-[2rem] border border-border bg-card p-3 shadow-ambient-lg sm:p-4">
              <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2">
                <span className="font-body text-xs font-semibold uppercase tracking-label text-muted-foreground">
                  Placeholder mockup &mdash; not a real product screenshot
                </span>
                <span className="eyebrow bg-accent/10 text-accent">Illustrative only</span>
              </div>

              <div className="mt-3 grid gap-4 rounded-2xl bg-background p-5 sm:grid-cols-3">
                {dashboardMetrics.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-dashed border-border bg-card p-5">
                    <div className="h-2 w-16 rounded-full bg-primary/20" />
                    <p className="mt-4 font-metric text-2xl text-foreground/30">[ TBD ]</p>
                    <p className="mt-2 font-body text-sm font-medium text-foreground">{m.label}</p>
                    <p className="mt-1 font-body text-xs text-muted-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pilot program */}
        <section className="bg-muted/40 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="eyebrow bg-primary/10 text-primary">Pilot program</span>
              <h2 className="mt-5 font-headline text-foreground">Start small, see it work, then decide.</h2>
              <p className="mt-4 font-body text-base leading-body text-muted-foreground">
                We&apos;d rather earn a full rollout than sell one. Every
                college starts with a pilot.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {pilotSteps.map((s) => (
                <div key={s.step} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                  <span className="font-metric text-sm text-primary">Step {s.step}</span>
                  <h3 className="mt-3 font-headline text-foreground">{s.title}</h3>
                  <p className="mt-2 font-body text-sm leading-body text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data privacy & residency */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="eyebrow bg-secondary/10 text-secondary">Data privacy</span>
              <h2 className="mt-5 font-headline text-foreground">Your students&apos; data stays in India.</h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-headline text-foreground">India data residency</h3>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  Vyoman Interviewer&apos;s database runs on Supabase&apos;s
                  Mumbai (ap-south-1) region. Student records, resumes, and
                  interview data are stored in India.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-headline text-foreground">Built with the DPDP Act in mind</h3>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  We design access controls and consent flows with
                  India&apos;s Digital Personal Data Protection Act, 2023
                  (DPDP Act) in mind. This is a statement of intent and
                  architecture, not a claim of formal certification &mdash;
                  see our{" "}
                  <Link href="/privacy" className="underline">
                    privacy policy
                  </Link>{" "}
                  for details.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-headline text-foreground">Row-level access control</h3>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  Students can only see their own data. Placement staff can
                  only see their own college&apos;s batch &mdash; enforced by
                  database-level row security policies, not just application
                  logic.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-headline text-foreground">No data reselling</h3>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  Student interview and resume data is used only to run and
                  improve the product for your college. It is never sold or
                  shared with third parties for marketing.
                </p>
              </div>
            </div>

            <p className="mt-6 font-body text-xs text-muted-foreground">
              We do not currently hold formal certifications such as ISO 27001
              or SOC 2. If your college requires a specific certification or a
              data processing agreement, ask us on the demo call.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ink py-20 text-ink-foreground sm:py-24">
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
            <h2 className="font-headline">Ready to pilot it with one batch?</h2>
            <p className="mt-4 font-body text-base leading-body text-ink-muted">
              Tell us about your college and we&apos;ll set up a walkthrough.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/book-a-demo" className="btn-primary">
                Book a demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
