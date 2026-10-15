"use client";

import { motion } from "framer-motion";
import { Check, Star, UsersThree } from "./icons";
import PremiumButton from "./PremiumButton";
import SectionHeading from "./SectionHeading";

/**
 * Rewritten from reference/lovable-site/src/components/Pricing.tsx.
 *
 * The reference version was coupled to Supabase auth (useAuth, useSubscription)
 * and the old four-tier Free/Basic/Plus/Pro credits pricing from the
 * recruiter-screening-era product — none of that applies here. BUILD_SPEC
 * 4.9 instead calls for exactly two plans: "a per-student-per-year college
 * plan and student plan, with prices as clearly marked placeholders for me
 * to fill in." The old "Trusted by 50,000+ job seekers" eyebrow, the
 * "1 credit = 15 minutes" chip and the "30-day money-back guarantee" block
 * are all dropped — each one is either a fabricated statistic or an
 * invented commercial policy that BUILD_SPEC never states.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

const plans = [
  {
    id: "college",
    name: "For colleges",
    icon: UsersThree,
    description: "Your placement cell gets every student on the platform, plus the admin view.",
    price: "₹[price]",
    unit: "/ student / year",
    features: [
      "AI interview practice for the whole batch (fair-use quota)",
      "Resume builder, scanner and prep assistant for every student",
      "Batch readiness dashboard and weak-skill breakdown",
      "CSV student invites and role-based access",
    ],
    cta: { label: "Book a demo for your college", href: "/book-a-demo" },
    popular: true,
  },
  {
    id: "student",
    name: "For students",
    icon: Star,
    description: "Practising on your own, outside a college plan.",
    price: "₹[price]",
    unit: "/ month",
    features: [
      "AI voice interviews with evidence-backed reports",
      "Resume builder and scanner",
      "Prep assistant for company and role research",
      "Interview history and weak-area tracking",
    ],
    cta: { label: "Start practicing", href: "/signup" },
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="relative overflow-hidden bg-muted/50 py-28 lg:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,hsl(244_66%_58%/0.06),transparent)]" />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple pricing. <span className="text-spectrum">No surprises.</span>
            </>
          }
          lede="A per-student plan for colleges, and a standalone plan for students practising on their own."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
            >
              <div
                className={`relative flex h-full flex-col rounded-[1.75rem] p-8 ${
                  plan.popular
                    ? "border border-white/10 bg-ink text-ink-foreground shadow-ambient-lg"
                    : "border border-foreground/[0.07] bg-card text-foreground shadow-ambient"
                }`}
              >
                {plan.popular && (
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-70 blur-3xl"
                    style={{ background: "radial-gradient(circle, hsl(244 80% 60% / 0.5), transparent 70%)" }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-2xl ${
                      plan.popular ? "bg-white/10 text-ink-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <plan.icon className="h-5 w-5" />
                  </span>
                  {plan.popular && (
                    <span className="eyebrow bg-white/10 text-ink-foreground/80">College plan</span>
                  )}
                </div>

                <h3 className="relative mt-6 font-headline text-xl font-semibold tracking-tight">
                  {plan.name}
                </h3>
                <p
                  className={`relative mt-1 font-body text-[13px] ${
                    plan.popular ? "text-ink-muted" : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>

                <div className="relative mt-5 flex items-baseline gap-1.5">
                  <span className="font-metric text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`font-body text-sm ${plan.popular ? "text-ink-muted" : "text-muted-foreground"}`}
                  >
                    {plan.unit}
                  </span>
                </div>
                <p
                  className={`relative mt-1.5 font-body text-xs ${
                    plan.popular ? "text-ink-muted/80" : "text-muted-foreground/80"
                  }`}
                >
                  Placeholder price — final pricing to be confirmed.
                </p>

                <ul className="relative mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                          plan.popular ? "bg-white/15 text-ink-foreground" : "bg-primary/12 text-primary"
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={1.75} />
                      </span>
                      <span
                        className={`font-body text-[13px] leading-snug ${
                          plan.popular ? "text-ink-foreground/85" : "text-muted-foreground"
                        }`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-8 pt-2">
                  <PremiumButton
                    size="md"
                    variant={plan.popular ? "ink" : "ghost"}
                    withIcon={false}
                    href={plan.cta.href}
                    className="w-full justify-center"
                  >
                    {plan.cta.label}
                  </PremiumButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="relative mt-10 text-center font-body text-sm text-muted-foreground">
          Need something custom for a large batch?{" "}
          <a href="/book-a-demo" className="font-medium text-primary hover:underline">
            Book a demo
          </a>{" "}
          and we&apos;ll work out a plan together.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
