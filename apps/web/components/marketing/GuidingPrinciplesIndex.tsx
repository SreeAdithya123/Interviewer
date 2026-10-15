"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Reveal from "./Reveal";

/**
 * Ported unchanged from
 * reference/lovable-site/src/components/marketing/GuidingPrinciplesIndex.tsx
 * — generic principles copy, no invented stats or claims.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

const PRINCIPLES = [
  {
    n: "01",
    name: "Human-centric AI",
    copy: "An intuitive partner that amplifies your natural intelligence — never a replacement for it.",
  },
  {
    n: "02",
    name: "Ethical foundation",
    copy: "Transparency, fairness and accountability guide everything we ship.",
  },
  {
    n: "03",
    name: "Continuous evolution",
    copy: "Learning never stops — neither does the platform. We refine on real feedback.",
  },
  {
    n: "04",
    name: "Clarity and craft",
    copy: "Elegant solutions, precise execution. Every product reflects that standard.",
  },
  {
    n: "05",
    name: "Long-term vision",
    copy: "We meet hard problems with curiosity and patience. Built to last.",
  },
];

/**
 * The guiding principles set as the contents page / colophon of a bound
 * document — a single ruled index read 01 → 05 against one vertical
 * "foundation" line that draws top-to-bottom first. No cards, no icons,
 * no shadows: depth comes only from measure, alignment and hairlines.
 */
const GuidingPrinciplesIndex = () => {
  const reduce = useReducedMotion();

  const list: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
  };
  const entry: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }
    : {
        hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.8, ease: EASE },
        },
      };
  const spine: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.9, ease: EASE } } };
  const tick: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { scaleX: 0 },
        show: { scaleX: 1, transition: { duration: 0.55, ease: EASE, delay: 0.15 } },
      };

  return (
    <div className="mt-24">
      <Reveal>
        <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Our guiding principles
        </h3>
      </Reveal>
      <Reveal index={1}>
        <p className="mt-4 max-w-[44ch] font-body text-body leading-body text-muted-foreground">
          Not a feature list — five fixed points we build from, and the standard every
          release is <span className="text-spectrum">measured</span> against.
        </p>
      </Reveal>

      <motion.ol
        className="relative mx-auto mt-12 max-w-3xl border-t border-foreground/15 [--rail:3rem] md:mt-14 md:[--rail:5.5rem] lg:[--rail:7rem]"
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      >
        <motion.span
          aria-hidden
          variants={spine}
          className="pointer-events-none absolute inset-y-0 left-[var(--rail)] hidden w-px origin-top -translate-x-1/2 bg-foreground/15 md:block"
        />

        {PRINCIPLES.map((p) => (
          <motion.li
            key={p.n}
            variants={entry}
            className="group flex flex-col gap-1 border-b border-foreground/10 py-9 md:grid md:grid-cols-[var(--rail)_1fr] md:items-start md:gap-x-6 md:py-10 lg:gap-x-10 lg:py-12"
          >
            <span className="font-metric text-xs font-semibold uppercase tracking-label text-muted-foreground transition-colors duration-500 md:pt-[0.12em] md:text-right md:text-[clamp(2.25rem,5vw,3.25rem)] md:font-medium md:leading-[0.8] md:tracking-[-0.02em] md:tabular-nums md:text-foreground/20 md:group-hover:text-foreground/70">
              {p.n}
            </span>

            <div>
              <h4 className="font-headline text-[1.55rem] font-medium leading-[1.12] tracking-headline text-foreground [word-spacing:normal] md:text-[clamp(1.7rem,2.4vw,2.1rem)]">
                {p.name}
              </h4>
              <motion.span
                aria-hidden
                variants={tick}
                className="my-4 block h-px w-8 origin-left bg-primary/70 transition-transform duration-500 ease-out-quint group-hover:scale-x-[1.5] group-hover:bg-primary"
              />
              <p className="max-w-[46ch] font-body text-[15px] leading-body text-muted-foreground md:text-base">
                {p.copy}
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
};

export default GuidingPrinciplesIndex;
