import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Waveform, Target, ArrowsClockwise, ShieldCheck } from './marketing/icons';
import PremiumButton from './marketing/PremiumButton';

const EASE = [0.22, 1, 0.36, 1] as const;

const proof = [
  { value: '50,000+', label: 'Interviews rehearsed' },
  { value: '4.9 / 5', label: 'Learner rating' },
  { value: '92%', label: 'Feel more prepared' },
];

const pillars = [
  {
    icon: Target,
    title: 'Purpose-built intelligence',
    copy: 'Tuned for career preparation — not a general chatbot wearing a lanyard.',
    rotate: '-3deg',
  },
  {
    icon: ArrowsClockwise,
    title: 'Adaptive by design',
    copy: 'Difficulty, tone and pacing shift with every answer you give.',
    rotate: '1.5deg',
  },
  {
    icon: ShieldCheck,
    title: 'Ethical AI, first',
    copy: 'Your recordings, transcripts and progress stay yours. Always.',
    rotate: '4deg',
  },
];

const Hero = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const cascade = desktop && !reduce;

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-ink text-ink-foreground"
    >
      {/* Aurora mesh — the "sky" */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="aurora left-[-10%] top-[-12%] h-[42rem] w-[42rem] animate-aurora"
          style={{ background: 'radial-gradient(circle at 30% 30%, hsl(244 80% 60% / 0.55), transparent 60%)' }}
        />
        <div
          className="aurora right-[-14%] top-[8%] h-[38rem] w-[38rem] animate-aurora"
          style={{ background: 'radial-gradient(circle at 60% 40%, hsl(202 90% 58% / 0.42), transparent 62%)', animationDelay: '-8s' }}
        />
        <div
          className="aurora bottom-[-24%] left-[24%] h-[44rem] w-[44rem] animate-aurora"
          style={{ background: 'radial-gradient(circle at 50% 50%, hsl(342 80% 66% / 0.40), transparent 62%)', animationDelay: '-16s' }}
        />
        {/* fine grid */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(circle at 50% 38%, black, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 38%, black, transparent 72%)',
          }}
        />
        {/* bottom fade into the light body */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center px-5 pb-40 pt-40 text-center sm:px-8 lg:pt-48">
        <motion.span
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="eyebrow border border-white/10 bg-white/[0.05] text-ink-foreground/75"
        >
          <Waveform className="h-3.5 w-3.5" />
          Preparation, engineered
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 26, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
          className="mt-8 max-w-[16ch] text-balance font-headline text-display font-semibold tracking-headline"
        >
          The sky is not the limit.
          <br className="hidden sm:block" />{' '}
          <span className="text-spectrum">
            It is the foundation.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          className="mt-7 max-w-xl text-pretty font-body text-body-lg leading-body text-ink-muted"
        >
          Vyoman helps you rehearse the moments that decide your future — real voice
          interviews, precise feedback, and a structured way to build genuine confidence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.32 }}
          className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center"
        >
          <PremiumButton
            variant="ink"
            onClick={() => navigate('/auth')}
            className="w-full justify-between sm:w-auto sm:justify-center"
          >
            Start practicing
          </PremiumButton>
          <PremiumButton
            variant="ghost-ink"
            onClick={() => navigate('/interview-copilot')}
            className="w-full justify-between sm:w-auto sm:justify-center"
          >
            Explore AI Interviewer
          </PremiumButton>
        </motion.div>

        {/* Proof strip */}
        <motion.dl
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.44 }}
          className="mt-16 grid w-full max-w-2xl grid-cols-1 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {proof.map((p) => (
            <div key={p.label} className="px-6 py-5">
              <dt className="font-metric text-2xl font-semibold tracking-tight text-ink-foreground">
                {p.value}
              </dt>
              <dd className="mt-1 font-body text-[13px] text-ink-muted">{p.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* Z-axis cascade — floating value cards straddling the seam */}
      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)', rotate: cascade ? p.rotate : 0 }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', rotate: cascade ? p.rotate : 0 }}
              whileHover={cascade ? { rotate: 0, y: -6 } : { y: -4 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.1 }}
              className="bezel"
            >
              <div className="bezel-core flex h-full flex-col gap-4 p-7">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-ink-foreground">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="font-headline text-lg font-semibold tracking-tight text-foreground">
                  {p.title}
                </h3>
                <p className="font-body text-sm leading-body text-muted-foreground">
                  {p.copy}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
