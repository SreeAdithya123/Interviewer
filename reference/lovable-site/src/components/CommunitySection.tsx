import React from 'react';
import {
  BookOpen,
  ChatDots,
  UsersThree,
  Heart,
  Calendar,
  Lightbulb,
} from './marketing/icons';
import PremiumButton from './marketing/PremiumButton';
import SectionHeading from './marketing/SectionHeading';
import Reveal from './marketing/Reveal';

const offerings = [
  { icon: BookOpen, title: 'Exclusive content', copy: 'Early access to new features and behind-the-scenes notes.' },
  { icon: ChatDots, title: 'Direct line to the team', copy: 'Talk to the engineers, designers and product leads building it.' },
  { icon: UsersThree, title: 'Collaborative projects', copy: 'Work with other members on challenges and learning sprints.' },
  { icon: Heart, title: 'Mentorship & support', copy: 'Find guidance from people ahead of you — and offer yours.' },
  { icon: Calendar, title: 'Events & workshops', copy: 'Virtual meetups, AMAs and hands-on practice sessions.' },
];

const audiences = [
  { title: 'Career seekers', copy: 'Structured practice and clear feedback to sharpen interview skills.' },
  { title: 'Developers & designers', copy: 'Collaborate on projects and refine technical communication.' },
  { title: 'Educators & trainers', copy: 'Share insight and find new ways to prepare students for success.' },
  { title: 'Lifelong learners', copy: 'Connect with people who value continuous improvement.' },
];

const CommunitySection = () => {
  return (
    <section id="community" className="relative bg-muted/50 py-28 lg:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_100%,hsl(342_80%_68%/0.06),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="The community"
          title={
            <>
              Made for humans.{' '}
              <span className="text-spectrum">
                Powered by purpose.
              </span>
            </>
          }
          lede="More than a product — a growing group of learners, professionals and builders who share insight, run mock sessions, and back each other's progress."
        />

        {/* Vision panel */}
        <Reveal className="mt-16" y={36}>
          <div className="overflow-hidden rounded-[2.25rem] border border-foreground/[0.07] bg-card shadow-ambient">
            <div className="grid gap-8 p-9 md:grid-cols-[auto_1fr] md:items-center md:gap-12 md:p-14">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <Lightbulb className="h-7 w-7" />
              </span>
              <div className="space-y-4">
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
                  Our vision for community
                </h3>
                <p className="font-body text-body-lg leading-body text-muted-foreground">
                  Shared purpose compounds. The Vyoman community is a space where
                  curiosity thrives and collaboration turns into real progress —
                  whether it is your first interview or your tenth.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* What you'll find */}
        <div className="mt-24">
          <Reveal>
            <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
              What you will find
            </h3>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o, i) => (
              <Reveal key={o.title} index={i} step={0.06}>
                <div className="group flex h-full flex-col gap-4 rounded-3xl border border-foreground/[0.06] bg-card p-7 shadow-ambient transition-transform duration-500 ease-out-quint hover:-translate-y-1">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-foreground transition-colors duration-500 group-hover:bg-ink group-hover:text-ink-foreground">
                    <o.icon className="h-5 w-5" />
                  </span>
                  <h4 className="font-headline text-[15px] font-semibold tracking-tight text-foreground">
                    {o.title}
                  </h4>
                  <p className="font-body text-[13px] leading-body text-muted-foreground">
                    {o.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div className="mt-24">
          <Reveal>
            <h3 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
              Who it is for
            </h3>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-foreground/[0.07] bg-foreground/[0.06] sm:grid-cols-2">
            {audiences.map((a, i) => (
              <Reveal key={a.title} index={i} step={0.07}>
                <div className="flex h-full items-start gap-4 bg-background p-8 transition-colors duration-500 hover:bg-card">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-primary to-accent" />
                  <div>
                    <h4 className="font-headline text-base font-semibold tracking-tight text-foreground">
                      {a.title}
                    </h4>
                    <p className="mt-1.5 font-body text-sm leading-body text-muted-foreground">
                      {a.copy}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Reveal className="mt-24" y={36}>
          <div className="flex flex-col items-center gap-7 rounded-[2.25rem] bg-ink px-8 py-14 text-center text-ink-foreground lg:px-16 lg:py-20">
            <h3 className="max-w-[18ch] font-headline text-h2 tracking-headline">
              Join the movement
            </h3>
            <p className="max-w-2xl font-body text-body-lg leading-body text-ink-muted">
              A growing group of people committed to preparation and continuous
              improvement. Where ideas take shape and progress happens together.
            </p>
            <PremiumButton variant="ink">Join the community</PremiumButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CommunitySection;
