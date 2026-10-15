import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Draft privacy policy for Vyoman Interviewer, written with India's DPDP Act in mind. Not final — needs legal review.",
  openGraph: {
    title: "Privacy Policy | Vyoman Interviewer",
    description: "Draft privacy policy — needs legal review.",
    type: "website",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="bg-background pt-40 pb-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <DraftBanner />

          <h1 className="mt-8 font-headline text-foreground">Privacy Policy</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">Last updated: draft, not yet published.</p>

          <div className="mt-8 space-y-8 font-body text-base leading-body text-foreground">
            <section>
              <h2 className="font-headline text-foreground">1. What this document is</h2>
              <p className="mt-3">
                This is a plain-language draft of how Vyoman Interviewer
                intends to handle personal data, written with India&apos;s
                Digital Personal Data Protection Act, 2023 (DPDP Act) in
                mind. It is <strong>not final and has not been reviewed by a
                lawyer</strong>. Do not treat it as a binding legal
                commitment until it is reviewed and published as final.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">2. Who we are</h2>
              <p className="mt-3">
                Vyoman Interviewer is built by Vyoman AI Solutions. For the
                purposes of the DPDP Act, we act as a Data Fiduciary for
                personal data collected through this product, and the
                college we work with may also have its own obligations as a
                Data Fiduciary for its students.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">3. What we plan to collect</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Account details: name, email, phone, college, batch, department.</li>
                <li>Resume content you upload or build, and the structured data extracted from it.</li>
                <li>Interview recordings, transcripts, and the scores and feedback generated from them.</li>
                <li>Usage data needed to operate the product (timestamps, feature usage, provider costs per request).</li>
                <li>Demo request details submitted by colleges (name, email, phone, college, message).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-foreground">4. Why we plan to collect it</h2>
              <p className="mt-3">
                To run practice interviews and generate feedback, to build
                and check resumes, to let your placement cell see batch
                readiness, and to operate and improve the product. We intend
                to rely on consent and, where applicable, on the legitimate
                uses recognised under the DPDP Act for processing carried out
                for your college as an employer/educational institution
                context.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">5. Where data is stored</h2>
              <p className="mt-3">
                Our database is hosted on Supabase&apos;s Mumbai (ap-south-1)
                region, so student and college data is intended to reside in
                India. Some processing (for example, calls to AI model
                providers to generate feedback) may involve data leaving
                India in transit to process a specific request; we intend to
                document each such provider once finalized.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">6. Your rights under the DPDP Act</h2>
              <p className="mt-3">
                Once this policy is finalized, it will describe how you can
                access, correct, and request erasure of your personal data,
                and how to withdraw consent, consistent with the rights given
                to data principals under the DPDP Act. A contact method for
                these requests will be published here.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">7. Data sharing</h2>
              <p className="mt-3">
                We do not sell personal data. Your college&apos;s placement
                staff can see data related to their own students only,
                enforced by database-level access rules. We do not currently
                share student data with recruiters; if that changes in a
                future product phase, this policy will be updated first.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">8. Children&apos;s data</h2>
              <p className="mt-3">
                Vyoman Interviewer is intended for college students. We do
                not knowingly design the product for children under the age
                defined by the DPDP Act, and the finalized policy will
                address this explicitly.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-foreground">9. Contact</h2>
              <p className="mt-3">
                A dedicated contact address for privacy requests will be
                published here once finalized. Until then, reach us through
                the <a href="/book-a-demo" className="underline">Book a Demo</a> form.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function DraftBanner() {
  return (
    <div className="rounded-2xl border border-dashed border-accent/50 bg-accent/5 px-5 py-4">
      <p className="font-body text-sm font-semibold uppercase tracking-label text-accent">
        Draft &mdash; needs legal review
      </p>
      <p className="mt-2 font-body text-sm leading-body text-foreground">
        This page is a placeholder legal draft, not a final policy and not
        legal advice. It has not been reviewed by a lawyer and should not be
        relied on until it has been.
      </p>
    </div>
  );
}
