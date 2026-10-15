import React from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Microphone,
  ChatDots,
  ChartBar,
  FileText,
  UsersThree,
  Lightning,
  ShieldCheck,
  Clock,
} from './marketing/icons';
import SectionHeading from './marketing/SectionHeading';

const EASE = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: Video,
    title: 'AI voice interviews',
    copy: 'Full spoken interviews with natural conversation flow and follow-up questions that adapt to your answers.',
    span: 'lg:col-span-7',
    feature: true,
  },
  {
    icon: Microphone,
    title: 'Voice analysis',
    copy: 'Tone, pace and clarity, measured through speech recognition.',
    span: 'lg:col-span-5',
  },
  {
    icon: ChatDots,
    title: 'Real-time feedback',
    copy: 'Instant notes on each answer while the session is still fresh.',
    span: 'lg:col-span-5',
  },
  {
    icon: ChartBar,
    title: 'Performance analytics',
    copy: 'Track improvement across sessions with structured reports and visual trends you can actually read.',
    span: 'lg:col-span-7',
  },
  {
    icon: FileText,
    title: 'Custom question banks',
    copy: 'Questions tuned to your field, role and experience level.',
    span: 'lg:col-span-4',
  },
  {
    icon: UsersThree,
    title: 'Mock panel interviews',
    copy: 'Multiple AI interviewers for realistic panel pressure.',
    span: 'lg:col-span-4',
  },
  {
    icon: Lightning,
    title: 'Instant scoring',
    copy: 'A clear score the moment you finish — no waiting.',
    span: 'lg:col-span-4',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    copy: 'Sessions are encrypted and yours alone. Nothing is shared, nothing is sold.',
    span: 'lg:col-span-6',
  },
  {
    icon: Clock,
    title: 'On your schedule',
    copy: 'Practise at 6am or midnight. No bookings, no waiting rooms, no partner to coordinate.',
    span: 'lg:col-span-6',
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
              Everything you need to walk in{' '}
              <span className="text-spectrum">
                prepared
              </span>
              .
            </>
          }
          lede="Nine tools that work together — practise, measure, refine, repeat."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.75, ease: EASE, delay: (i % 3) * 0.08 }}
              className={`${f.span} group relative flex flex-col overflow-hidden rounded-[1.75rem] border p-8 transition-transform duration-500 ease-out-quint hover:-translate-y-1.5 ${
                f.feature
                  ? 'border-white/10 bg-ink text-ink-foreground'
                  : 'border-foreground/[0.07] bg-card text-foreground shadow-ambient'
              }`}
            >
              {f.feature && (
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl"
                  style={{ background: 'radial-gradient(circle, hsl(244 80% 60% / 0.5), transparent 70%)' }}
                />
              )}
              <span
                className={`relative grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-500 ${
                  f.feature
                    ? 'bg-white/10 text-ink-foreground'
                    : 'bg-muted text-foreground group-hover:bg-ink group-hover:text-ink-foreground'
                }`}
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3
                className={`relative font-headline font-semibold tracking-tight ${
                  f.feature ? 'mt-7 text-2xl' : 'mt-6 text-lg'
                }`}
              >
                {f.title}
              </h3>
              <p
                className={`relative mt-3 font-body leading-body ${
                  f.feature
                    ? 'max-w-md text-body-lg text-ink-muted'
                    : 'text-sm text-muted-foreground'
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
