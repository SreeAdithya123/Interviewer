import React from 'react';
import { Heart, Clock, MapPin, EnvelopeSimple } from './marketing/icons';
import PremiumButton from './marketing/PremiumButton';
import SectionHeading from './marketing/SectionHeading';
import Reveal from './marketing/Reveal';

const values = [
  {
    icon: Heart,
    title: 'Attention to detail',
    copy: 'Excellence lives in the details — every line of code, every design decision, every interaction.',
  },
  {
    icon: Clock,
    title: 'Long-term thinking',
    copy: 'We build for the decade, not the quarter. Today’s decisions shape what is possible tomorrow.',
  },
  {
    icon: MapPin,
    title: 'Global impact',
    copy: 'Our work reaches across continents and cultures — tools that empower people everywhere.',
  },
];

const CareersSection = () => {
  return (
    <section id="careers" className="relative bg-background py-28 lg:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Careers"
          title={
            <>
              Work with people who{' '}
              <span className="text-spectrum">
                care about the details
              </span>
              .
            </>
          }
          lede="We build technology that touches real lives. If thoughtful design, ethical AI and meaningful craft matter to you, you will feel at home here."
        />

        {/* Values */}
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} index={i} step={0.07}>
              <div className="flex h-full flex-col gap-4 rounded-3xl border border-foreground/[0.06] bg-card p-7 shadow-ambient transition-transform duration-500 ease-out-quint hover:-translate-y-1">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="font-headline text-[15px] font-semibold tracking-tight text-foreground">
                  {v.title}
                </h3>
                <p className="font-body text-[13px] leading-body text-muted-foreground">
                  {v.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Mission */}
        <Reveal className="mt-12" y={32}>
          <div className="rounded-[2.25rem] border border-foreground/[0.07] bg-card p-9 shadow-ambient lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
              <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                Our
                <br />
                mission
              </h3>
              <div className="space-y-5">
                <p className="font-body text-body-lg leading-body text-foreground">
                  If you want to create tools that make a real difference — and you
                  thrive where rigour meets creative freedom — Vyoman might be your
                  place.
                </p>
                <p className="font-body text-body leading-body text-muted-foreground">
                  We look for people who bring purpose, curiosity and a collaborative
                  spirit to everything they do.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Contact cards */}
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col items-start gap-5 rounded-[2rem] bg-ink p-9 text-ink-foreground lg:p-11">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                <Heart className="h-6 w-6" />
              </span>
              <h3 className="font-headline text-xl font-semibold tracking-tight">Join our team</h3>
              <p className="font-body text-sm leading-body text-ink-muted">
                Ready to shape the future of AI-powered career tools? We are always
                looking for people who share our vision of ethical, human-centric
                technology.
              </p>
              <PremiumButton variant="ink" size="md" className="mt-auto">
                Explore opportunities
              </PremiumButton>
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="flex h-full flex-col items-start gap-5 rounded-[2rem] border border-foreground/[0.07] bg-card p-9 shadow-ambient lg:p-11">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-foreground">
                <EnvelopeSimple className="h-6 w-6" />
              </span>
              <h3 className="font-headline text-xl font-semibold tracking-tight text-foreground">
                Get in touch
              </h3>
              <p className="font-body text-sm leading-body text-muted-foreground">
                Questions about our products or partnerships — or just want to say
                hello? We would love to hear from you.
              </p>
              <PremiumButton variant="ghost" size="md" className="mt-auto">
                Contact us
              </PremiumButton>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-12" y={28}>
          <p className="mx-auto max-w-3xl text-center font-body text-body leading-body text-muted-foreground">
            At Vyoman, every team member is a stakeholder in the mission. We offer
            competitive compensation, comprehensive benefits, and the chance to work
            on products that genuinely serve people.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default CareersSection;
