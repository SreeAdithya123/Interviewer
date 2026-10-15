import { Eye, QuoteMark, ShieldCheck } from "./icons";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

/**
 * New section BUILD_SPEC 4.9 calls for explicitly: "a section on why scores
 * are trustworthy (every score shows the exact lines it is based on)".
 * Reuses the feature-card visual pattern from Features.tsx for visual
 * consistency. Content is drawn only from what BUILD_SPEC Part 1 and 4.5
 * already say (nothing invented, every score has evidence) — no example
 * scores or testimonials are fabricated here.
 */
const points = [
  {
    icon: Eye,
    title: "Scored dimension by dimension",
    copy: "Communication clarity, answer structure, technical depth, relevance and confidence — each one scored from what you actually said.",
  },
  {
    icon: QuoteMark,
    title: "Evidence, not opinion",
    copy: "Every score links back to the exact lines from your transcript that justify it, so you can check it yourself.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing invented",
    copy: "If the evidence isn't in your answer, the score reflects that. Never a guess, never a filled-in number.",
  },
];

const TrustSection = () => {
  return (
    <section id="trust" className="relative bg-background py-28 lg:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Why trust the score"
          title={
            <>
              Every score shows <span className="text-spectrum">its evidence</span>.
            </>
          }
          lede="No score on Vyoman is a black box. Each one points back to the exact lines of your answer it came from."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.title} index={i} step={0.09}>
              <div className="flex h-full flex-col gap-4 rounded-[1.75rem] border border-foreground/[0.07] bg-card p-7 shadow-ambient">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-foreground">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="font-headline text-lg font-semibold tracking-tight text-foreground">
                  {p.title}
                </h3>
                <p className="font-body text-sm leading-body text-muted-foreground">{p.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
