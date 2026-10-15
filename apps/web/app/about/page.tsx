import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Vyoman Interviewer exists: quality and margins built for Indian college placement cells, from founder Sree at Vyoman AI Solutions.",
  openGraph: {
    title: "About | Vyoman Interviewer",
    description: "Why Vyoman Interviewer exists, and who's building it.",
    type: "website",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background">
        <section className="bg-ink pt-40 pb-20 text-ink-foreground">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <span className="eyebrow bg-ink-soft text-ink-muted">About</span>
            <h1 className="mt-5 font-headline">
              Why this exists.
            </h1>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="space-y-6 font-body text-base leading-body text-foreground">
              <p>
                Vyoman Interviewer is built by Vyoman AI Solutions, founded
                by Sree. It&apos;s an AI interview practice platform sold to
                Indian universities and colleges, used by students to
                practice interviews, build and check their resumes, and
                prepare for placements &mdash; and by placement cells to see
                which students are ready and where a batch is weak.
              </p>
              <p>
                Two things decide whether this is worth building, and both
                shaped almost every technical decision behind it: quality and
                margins.
              </p>
              <p>
                <strong className="font-semibold text-foreground">Quality</strong>
                &nbsp;comes first because colleges and students only keep
                paying if the feedback is accurate and trustworthy. Nothing
                on the platform is meant to be invented &mdash; not a score,
                not a resume metric, not a question attributed to a company
                that never asked it. If a score can&apos;t be traced back to
                evidence in the transcript, it shouldn&apos;t be shown.
              </p>
              <p>
                <strong className="font-semibold text-foreground">Margins</strong>
                &nbsp;matter because an earlier version of this product used
                real-time voice AI billed per minute, and it lost money on
                every interview. This version is built around a turn-based
                interview loop designed to stay affordable per interview,
                with every provider call logged against its real cost so the
                unit economics are never a guess.
              </p>
              <p>
                The target customer is deliberately specific: Indian college
                placement cells, starting with a pilot batch before any
                college-wide rollout, with tier-1 colleges as the long-term
                goal. That focus is a bet that a product built for exactly
                one kind of customer, done well, beats a generic interview
                tool built for everyone.
              </p>
              <p className="text-sm text-muted-foreground">
                This page is intentionally short. We don&apos;t have a team
                page, office photos, or founder portraits to show yet &mdash;
                we&apos;d rather leave that blank than fill it with stock
                photography.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
              <Link href="/book-a-demo" className="btn-primary">
                Book a demo
              </Link>
              <Link href="/for-colleges" className="btn-secondary">
                See the pilot program
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
