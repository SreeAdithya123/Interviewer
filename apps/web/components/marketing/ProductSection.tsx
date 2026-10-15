"use client";

import { motion } from "framer-motion";
import { Microphone, ChatDots, ChartBar } from "./icons";
import PremiumButton from "./PremiumButton";
import Reveal from "./Reveal";

/**
 * Ported from reference/lovable-site/src/components/AIInterviewerSection.tsx
 * (renamed — this is the "Product section with live-interview device card"
 * BUILD_SPEC 4.9 calls for). useNavigate() replaced with PremiumButton's
 * `href`; the sample transcript and waveform are the spec's own described
 * signature pattern (a live-session device card), not a fabricated
 * testimonial or statistic.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

const capabilities = [
  {
    icon: Microphone,
    title: "Realistic voice interviews",
    copy: "Speak out loud in a natural back-and-forth. The AI listens, follows up, and pushes where a real panel would.",
  },
  {
    icon: ChatDots,
    title: "Immediate, specific feedback",
    copy: "Structure, clarity and relevance — scored per answer with the exact lines worth reworking.",
  },
  {
    icon: ChartBar,
    title: "Evidence-backed reports",
    copy: "Every score links back to the transcript. See exactly what was said to justify it, every time.",
  },
];

const transcript = [
  { role: "AI", text: "Walk me through a project where the scope changed midway. What did you do?" },
  { role: "You", text: "We were building the onboarding flow when the requirements shifted…" },
  { role: "AI", text: "Good. Be concrete about the trade-off you made and who you aligned with." },
];

// Deterministic per-bar peak heights for the decorative waveform below —
// Math.random() inside a render-time animation prop is flagged as an impure
// call by the react-hooks/purity lint rule, so this uses a fixed sine-based
// sequence computed once at module load instead.
const WAVEFORM_PEAKS = Array.from({ length: 48 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.7)) * 0.75);

const ProductSection = () => {
  return (
    <section id="product" className="relative bg-background py-28 lg:py-40">
      <div className="mx-auto grid max-w-6xl gap-16 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
        {/* Editorial column */}
        <div>
          <Reveal>
            <span className="eyebrow bg-accent/[0.08] text-accent/80 ring-1 ring-inset ring-accent/15">
              <span className="h-1 w-1 rounded-full bg-current" />
              Now available
            </span>
          </Reveal>

          <Reveal index={1} className="mt-6">
            <h2 className="font-headline text-h1 tracking-headline text-foreground">
              Rehearse the <span className="text-spectrum">real interview</span>, before it
              counts.
            </h2>
          </Reveal>

          <Reveal index={2} className="mt-6">
            <p className="max-w-md font-body text-body-lg leading-body text-muted-foreground">
              The Vyoman AI Interviewer simulates a live interview through voice and
              intelligent questioning. You speak naturally — it evaluates and responds
              with feedback that sharpens both your answers and your delivery.
            </p>
          </Reveal>

          <Reveal index={3} className="mt-9">
            <PremiumButton href="/signup">Start practicing</PremiumButton>
          </Reveal>

          <Reveal index={4} className="mt-5">
            <p className="font-body text-sm text-muted-foreground/80">
              Practice makes progress. Your first session takes ten minutes.
            </p>
          </Reveal>
        </div>

        {/* Interactive stack */}
        <div className="flex flex-col gap-5">
          {/* Live-session media panel */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.85, ease: EASE }}
            className="bezel bezel--ink"
          >
            <div className="bezel-core overflow-hidden p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-label text-ink-muted">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Live session
                </span>
                <span className="font-metric text-xs text-ink-muted">08:24</span>
              </div>

              {/* Waveform */}
              <div className="mt-5 flex h-14 items-center gap-[3px]">
                {Array.from({ length: 48 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] flex-1 rounded-full bg-gradient-to-t from-primary/40 to-secondary/80"
                    initial={{ scaleY: 0.2 }}
                    whileInView={{ scaleY: [0.2, WAVEFORM_PEAKS[i], 0.35] }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.6,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "mirror",
                      delay: i * 0.03,
                    }}
                  />
                ))}
              </div>

              {/* Transcript */}
              <div className="mt-5 space-y-3">
                {transcript.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: line.role === "AI" ? -12 : 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.2 + i * 0.15 }}
                    className={line.role === "You" ? "flex justify-end" : "flex justify-start"}
                  >
                    <p
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-body text-[13px] leading-relaxed ${
                        line.role === "AI"
                          ? "bg-white/[0.06] text-ink-foreground/90"
                          : "bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {line.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Capability cards */}
          {capabilities.map((c, i) => (
            <Reveal key={c.title} index={i} step={0.09}>
              <div className="group flex items-start gap-4 rounded-3xl border border-foreground/[0.06] bg-card p-5 shadow-ambient transition-transform duration-500 ease-out-quint hover:-translate-y-1">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted text-foreground transition-colors duration-500 group-hover:bg-ink group-hover:text-ink-foreground">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-headline text-[15px] font-semibold tracking-tight text-foreground">
                    {c.title}
                  </h3>
                  <p className="mt-1 font-body text-[13px] leading-body text-muted-foreground">
                    {c.copy}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
