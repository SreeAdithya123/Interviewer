"use client";

import { motion } from "framer-motion";
import { Video, ShieldCheck, FileText, Scan, ChatDots, Dashboard } from "./icons";
import SectionHeading from "./SectionHeading";

/**
 * Ported from reference/lovable-site/src/components/Features.tsx, with the
 * feature set itself replaced per BUILD_SPEC 4.9: "the feature grid updated
 * to the real feature set (AI interview, evidence-backed reports, resume
 * builder, resume scanner, prep assistant, placement dashboard)". The old
 * copy (voice analysis, mock panel interviews, instant scoring, etc.) was
 * from the previous recruiter-screening-era product and is dropped.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: Video,
    title: "AI interview",
    copy: "Full turn-based voice interviews — HR, technical, behavioural or mixed — with follow-up questions that adapt to what you say.",
    span: "lg:col-span-7",
    feature: true,
  },
  {
    icon: ShieldCheck,
    title: "Evidence-backed reports",
    copy: "Every score comes with the exact lines from your transcript that justify it. Nothing is invented.",
    span: "lg:col-span-5",
  },
  {
    icon: FileText,
    title: "Resume builder",
    copy: "A form-based editor with live preview and ATS-safe templates. AI bullet rewriting never invents a number you didn't give it.",
    span: "lg:col-span-6",
  },
  {
    icon: Scan,
    title: "Resume scanner",
    copy: "Scan a resume against a job description for honest, specific fixes — parse health, skill gaps, bullet quality, formatting risk.",
    span: "lg:col-span-6",
  },
  {
    icon: ChatDots,
    title: "Prep assistant",
    copy: "Ask about companies, roles and topics. Answers cite the knowledge base, and it says so plainly when it doesn't know.",
    span: "lg:col-span-6",
  },
  {
    icon: Dashboard,
    title: "Placement dashboard",
    copy: "Placement officers see batch readiness, weak skills across the batch, and quota usage at a glance.",
    span: "lg:col-span-6",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative bg-background py-28 lg:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          align="left"
          eyebrow="The toolkit"
          title={
            <>
              Everything you need to walk in <span className="text-spectrum">prepared</span>.
            </>
          }
          lede="Six tools that work together — practise, measure, refine, repeat."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.75, ease: EASE, delay: (i % 3) * 0.08 }}
              className={`${f.span} group relative flex flex-col overflow-hidden rounded-[1.75rem] border p-8 transition-transform duration-500 ease-out-quint hover:-translate-y-1.5 ${
                f.feature
                  ? "border-white/10 bg-ink text-ink-foreground"
                  : "border-foreground/[0.07] bg-card text-foreground shadow-ambient"
              }`}
            >
              {f.feature && (
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl"
                  style={{ background: "radial-gradient(circle, hsl(244 80% 60% / 0.5), transparent 70%)" }}
                />
              )}
              <span
                className={`relative grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-500 ${
                  f.feature
                    ? "bg-white/10 text-ink-foreground"
                    : "bg-muted text-foreground group-hover:bg-ink group-hover:text-ink-foreground"
                }`}
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3
                className={`relative font-headline font-semibold tracking-tight ${
                  f.feature ? "mt-7 text-2xl" : "mt-6 text-lg"
                }`}
              >
                {f.title}
              </h3>
              <p
                className={`relative mt-3 font-body leading-body ${
                  f.feature ? "max-w-md text-body-lg text-ink-muted" : "text-sm text-muted-foreground"
                }`}
              >
                {f.copy}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
