import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import {
  Check,
  Star,
  Lightning,
  ShieldCheck,
  Crown,
  Clock,
  UsersThree,
} from './marketing/icons';
import PremiumButton from './marketing/PremiumButton';
import SectionHeading from './marketing/SectionHeading';
import Reveal from './marketing/Reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();

  const plans = [
    {
      id: 'free' as SubscriptionPlan,
      name: 'Free',
      price: '0',
      period: 'month',
      currency: '₹',
      description: 'A full taste of the platform.',
      highlight: 'Free demo',
      icon: Clock,
      features: [
        '1 mock interview (10 min)',
        'AI questions & live transcript',
        'Basic evaluation',
        'Resume Builder (1 template)',
        'CareerBot (10 msg/day)',
      ],
      buttonText: 'Start free',
      popular: false,
    },
    {
      id: 'beginner' as SubscriptionPlan,
      name: 'Basic',
      price: '199',
      period: 'month',
      currency: '₹',
      description: 'Built for students.',
      highlight: 'Best for students',
      icon: Star,
      features: [
        '3 mocks / month (10 min each)',
        'PDF export (1-page summary)',
        'Resume Builder (full + export)',
        'CareerBot (200 msg/month)',
        'YourDream Bot (50 msg/month)',
      ],
      buttonText: 'Get Basic',
      popular: false,
    },
    {
      id: 'plus' as SubscriptionPlan,
      name: 'Plus',
      price: '399',
      period: 'month',
      currency: '₹',
      description: 'For serious job seekers.',
      highlight: 'Serious job seekers',
      icon: Lightning,
      features: [
        '6 mocks / month (10–15 min)',
        'Full PDF report + compare (2)',
        'Premium resume templates',
        'CareerBot (600 msg/month)',
        'Cold email / DM drafting',
        'Role-based question bank',
      ],
      buttonText: 'Upgrade to Plus',
      popular: false,
    },
    {
      id: 'pro' as SubscriptionPlan,
      name: 'Pro',
      price: '599',
      period: 'month',
      currency: '₹',
      description: 'For high-intent users.',
      highlight: 'Best value',
      icon: Crown,
      features: [
        '15 mocks / month (up to 30 min)',
        'Best AI model (Groq)',
        'Unlimited tools (fair-use)',
        'Offer negotiation assistant',
        'Weekly roadmap generator',
        'Priority support',
      ],
      buttonText: 'Upgrade to Pro',
      popular: true,
    },
  ];

  const handleGetStarted = (planId: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/payments');
    }
  };

  const isCurrentPlan = (planId: SubscriptionPlan) => subscription?.plan === planId;

  return (
    <section id="pricing" className="relative overflow-hidden bg-muted/50 py-28 lg:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,hsl(244_66%_58%/0.06),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Trusted by 50,000+ job seekers"
          title={
            <>
              Simple pricing.{' '}
              <span className="text-spectrum">
                No surprises.
              </span>
            </>
          }
          lede="Start practising for free. Upgrade when you want deeper insight and more sessions."
        />

        <Reveal className="mt-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.08] bg-card px-5 py-2.5 font-body text-[13px] text-muted-foreground shadow-ambient">
            <Lightning className="h-4 w-4 text-primary" />
            1 credit = 15 minutes of interview time
          </span>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => {
            const current = isCurrentPlan(plan.id);
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-8%' }}
                transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
                className={plan.popular ? 'lg:-my-2' : ''}
              >
                <div
                  className={`relative flex h-full flex-col rounded-[1.75rem] p-7 ${
                    plan.popular
                      ? 'border border-white/10 bg-ink text-ink-foreground shadow-ambient-lg'
                      : 'border border-foreground/[0.07] bg-card text-foreground shadow-ambient'
                  }`}
                >
                  {plan.popular && (
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-70 blur-3xl"
                      style={{ background: 'radial-gradient(circle, hsl(244 80% 60% / 0.5), transparent 70%)' }}
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${
                        plan.popular ? 'bg-white/10 text-ink-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      <plan.icon className="h-5 w-5" />
                    </span>
                    {plan.popular && (
                      <span className="eyebrow bg-white/10 text-ink-foreground/80">Best value</span>
                    )}
                    {current && (
                      <span className="eyebrow bg-primary/15 text-primary">Current</span>
                    )}
                  </div>

                  <h3 className="relative mt-6 font-headline text-xl font-semibold tracking-tight">
                    {plan.name}
                  </h3>
                  <p
                    className={`relative mt-1 font-body text-[13px] ${
                      plan.popular ? 'text-ink-muted' : 'text-muted-foreground'
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="relative mt-5 flex items-baseline gap-1">
                    <span className="font-metric text-4xl font-semibold tracking-tight">
                      {plan.currency}
                      {plan.price}
                    </span>
                    <span
                      className={`font-body text-sm ${
                        plan.popular ? 'text-ink-muted' : 'text-muted-foreground'
                      }`}
                    >
                      /{plan.period}
                    </span>
                  </div>

                  <ul className="relative mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                            plan.popular ? 'bg-white/15 text-ink-foreground' : 'bg-primary/12 text-primary'
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={1.75} />
                        </span>
                        <span
                          className={`font-body text-[13px] leading-snug ${
                            plan.popular ? 'text-ink-foreground/85' : 'text-muted-foreground'
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
                      variant={plan.popular ? 'ink' : 'ghost'}
                      withIcon={false}
                      disabled={current}
                      onClick={() => handleGetStarted(plan.id)}
                      className="w-full justify-center"
                    >
                      {current ? 'Current plan' : plan.buttonText}
                    </PremiumButton>
                    {plan.id !== 'free' && (
                      <button
                        onClick={() => navigate('/payments')}
                        className={`mt-3 w-full text-center font-body text-xs ${
                          plan.popular ? 'text-ink-muted hover:text-ink-foreground' : 'text-primary/70 hover:text-primary'
                        } transition-colors`}
                      >
                        View all plan details →
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Guarantee + trust row */}
        <Reveal className="mt-16" y={32}>
          <div className="rounded-[2.25rem] border border-foreground/[0.07] bg-card p-9 text-center shadow-ambient lg:p-14">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-headline text-2xl font-semibold tracking-tight text-foreground">
              30-day money-back guarantee
            </h3>
            <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-body text-muted-foreground">
              Not seeing results? Get a full refund within 30 days, no questions asked.
            </p>

            <div className="mt-10 grid gap-8 border-t border-foreground/[0.07] pt-10 sm:grid-cols-3">
              {[
                { icon: Clock, title: 'Instant access', copy: 'Practise the moment you sign up.' },
                { icon: Lightning, title: 'No setup', copy: 'Runs in any browser. Nothing to install.' },
                { icon: UsersThree, title: 'Expert support', copy: 'Help from real interview specialists.' },
              ].map((t) => (
                <div key={t.title} className="flex flex-col items-center gap-2 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground">
                    <t.icon className="h-4 w-4" />
                  </span>
                  <h4 className="font-headline text-sm font-semibold tracking-tight text-foreground">
                    {t.title}
                  </h4>
                  <p className="font-body text-xs leading-body text-muted-foreground">{t.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Pricing;
