import React from 'react';
import SectionHeading from './marketing/SectionHeading';
import Reveal from './marketing/Reveal';
import BezelCard from './marketing/BezelCard';
import GuidingPrinciplesIndex from './marketing/GuidingPrinciplesIndex';

const differentiators = [
  {
    tag: '01',
    title: 'Purpose-built intelligence',
    copy: 'We do not build AI for its own sake. Every feature answers a specific human need in the preparation journey.',
  },
  {
    tag: '02',
    title: 'Adaptive learning',
    copy: 'The system studies your patterns, preferences and goals. The more you practise, the sharper its coaching gets.',
  },
  {
    tag: '03',
    title: 'Ethical AI first',
    copy: 'AI should extend human judgement, never replace it. Our tools stay transparent, explainable and under your control.',
  },
  {
    tag: '04',
    title: 'Growth-oriented design',
    copy: 'Every interaction nudges you a little further. Interfaces that challenge gently and build skill over time.',
  },
];

const AboutSection = () => {
  return (
    <section id="philosophy" className="relative bg-muted/50 py-28 lg:py-40">
      {/* faint section tint */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(244_66%_58%/0.05),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Why Vyoman"
          title={
            <>
              The sky is not the limit.{' '}
              <span className="text-spectrum">
                It is the foundation.
              </span>
            </>
          }
          lede={
            <>
              <em className="not-italic font-medium text-foreground">Vyoman</em> means sky in
              Sanskrit. We treat the sky not as a ceiling but as the ground everything
              is built on — and the platform is built on that belief.
            </>
          }
        />

        {/* Philosophy panel */}
        <Reveal className="mt-16" y={36}>
          <BezelCard>
            <div className="grid gap-8 p-9 lg:grid-cols-[auto_1fr] lg:gap-12 lg:p-14">
              <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                Our
                <br />
                philosophy
              </h3>
              <div className="space-y-5">
                <p className="font-body text-body-lg leading-body text-foreground">
                  Preparation builds confidence, and confidence builds opportunity.
                  Technology should support human growth — not stand in for it.
                </p>
                <p className="font-body text-body leading-body text-muted-foreground">
                  Every feature inside Vyoman is designed to strengthen your thinking,
                  communication and professional readiness. The goal is simple: help
                  people present their true potential when it matters most.
                </p>
              </div>
            </div>
          </BezelCard>
        </Reveal>

        {/* Differentiators — asymmetric editorial rows */}
        <div className="mt-24">
          <Reveal>
            <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
              What makes us different
            </h3>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-foreground/[0.07] bg-foreground/[0.06] sm:grid-cols-2">
            {differentiators.map((d, i) => (
              <Reveal key={d.tag} index={i} step={0.07}>
                <div className="group h-full bg-background p-8 transition-colors duration-500 hover:bg-card">
                  <span className="font-metric text-xs font-semibold tracking-label text-primary/60">
                    {d.tag}
                  </span>
                  <h4 className="mt-4 font-headline text-lg font-semibold tracking-tight text-foreground">
                    {d.title}
                  </h4>
                  <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                    {d.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Guiding principles — colophon index */}
        <GuidingPrinciplesIndex />

        {/* Commitment */}
        <Reveal className="mt-24" y={36}>
          <div className="overflow-hidden rounded-[2.25rem] bg-ink px-8 py-14 text-center text-ink-foreground lg:px-16 lg:py-20">
            <h3 className="mx-auto max-w-[16ch] font-headline text-h2 tracking-headline">
              We are building tools that help people grow.
            </h3>
            <p className="mx-auto mt-5 max-w-2xl font-body text-body-lg leading-body text-ink-muted">
              Not just software — a way for people to learn, prepare and succeed.{' '}
              <span className="text-ink-foreground">Join us on the journey.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AboutSection;
