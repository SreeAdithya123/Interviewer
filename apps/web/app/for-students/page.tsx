import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "For Students",
  description:
    "Practice real interviews with instant, evidence-backed feedback. Build and scan your resume, and get help preparing — all in one place.",
  openGraph: {
    title: "For Students | Vyoman Interviewer",
    description:
      "Practice real interviews with instant, evidence-backed feedback. Build and scan your resume, and get help preparing.",
    type: "website",
    url: "/for-students",
  },
};

const features = [
  {
    title: "Practice interviews",
    body: "Run a full mock interview with AI-driven follow-up questions. Get feedback that points to the exact moment in the transcript it's based on — never a vague score.",
  },
  {
    title: "Evidence-backed reports",
    body: "Every score comes with the lines from your own answers that justify it, so you know exactly what to fix, not just a number to feel bad about.",
  },
  {
    title: "Resume builder",
    body: "Build a resume section by section, with structure that's easy for recruiters and applicant-tracking systems to parse.",
  },
  {
    title: "Resume scanner",
    body: "Upload an existing resume and have it parsed into a structured profile, so you can see gaps before a recruiter does.",
  },
  {
    title: "Prep assistant",
    body: "Ask questions grounded in a reviewed knowledge base. It cites its sources and says so when something isn't covered, instead of guessing.",
  },
  {
    title: "History and weak areas",
    body: "Your past interviews and the weak areas they surfaced are kept together, so you can see whether you're actually improving.",
  },
];

export default function ForStudentsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background">
        <section className="bg-ink pt-40 pb-24 text-ink-foreground">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <span className="eyebrow bg-ink-soft text-ink-muted">For students</span>
            <h1 className="mt-5 font-headline">
              Walk into interviews having already <span className="text-spectrum">done the work</span>.
            </h1>
            <p className="mt-5 max-w-2xl font-body text-base leading-body text-ink-muted">
              Vyoman Interviewer is built to make your practice count: real
              mock interviews, a resume that holds up, and feedback you can
              actually trust because it shows its evidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-a-demo" className="btn-primary">
                Ask your college about access
              </Link>
              <Link href="/pricing" className="btn-secondary border-white/15 text-ink-foreground hover:bg-white/5">
                See student pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="eyebrow bg-primary/10 text-primary">What you get</span>
              <h2 className="mt-5 font-headline text-foreground">
                Everything you need to prepare, in one place.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                  <h3 className="font-headline text-foreground">{f.title}</h3>
                  <p className="mt-2 font-body text-sm leading-body text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-ambient sm:p-10">
              <span className="eyebrow bg-secondary/10 text-secondary">Why this is different</span>
              <h2 className="mt-5 font-headline text-foreground">
                No made-up scores. No invented questions.
              </h2>
              <p className="mt-4 font-body text-base leading-body text-muted-foreground">
                Every score shows the exact lines in your transcript it is
                based on. We don&apos;t publish user counts, testimonials, or
                outcome statistics we can&apos;t back up &mdash; what you see
                here is what the product actually does, not a marketing
                number.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-ink-foreground sm:py-24">
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
            <h2 className="font-headline">Is Vyoman Interviewer at your college yet?</h2>
            <p className="mt-4 font-body text-base leading-body text-ink-muted">
              Vyoman Interviewer is rolled out college by college through
              placement cells. If it isn&apos;t at yours yet, point your TPO
              to this page.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/book-a-demo" className="btn-primary">
                Have your college book a demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
