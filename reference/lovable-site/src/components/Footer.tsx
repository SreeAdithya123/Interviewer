import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumButton from './marketing/PremiumButton';

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'AI Interviewer', href: '/interview-copilot' },
      { label: 'Mock Interview', href: '/mock-interview' },
      { label: 'Resume Builder', href: '/resume-builder' },
      { label: 'Pricing', href: '/payments' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/#philosophy' },
      { label: 'Careers', href: '/#careers' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

const Footer = () => {
  const navigate = useNavigate();

  const go = (href: string) => {
    if (href.startsWith('/#')) {
      document.querySelector(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-ink text-ink-foreground">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(244 80% 60% / 0.35), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand + CTA */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-ink-foreground text-ink">
                <span className="font-headline text-sm font-semibold leading-none">V</span>
              </span>
              <span className="font-headline text-lg font-semibold tracking-tight">Vyoman</span>
            </div>
            <p className="mt-5 max-w-sm font-body text-sm leading-body text-ink-muted">
              AI-powered tools to help you prepare for interviews, build your resume,
              and approach opportunities with genuine confidence.
            </p>
            <div className="mt-7">
              <PremiumButton variant="ink" size="md" onClick={() => navigate('/auth')}>
                Start practising
              </PremiumButton>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="font-body text-[11px] font-semibold uppercase tracking-label text-ink-muted">
                {col.heading}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => go(l.href)}
                      className="font-body text-sm text-ink-foreground/70 transition-colors duration-300 hover:text-ink-foreground"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="font-body text-xs text-ink-muted">
            © 2025 Vyoman. Built for career success.
          </p>
          <p className="font-body text-xs text-ink-muted">
            Vyoman — sky in Sanskrit. The foundation, not the limit.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
