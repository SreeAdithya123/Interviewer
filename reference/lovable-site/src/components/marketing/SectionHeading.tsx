import React from 'react';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'ink';
  className?: string;
};

/**
 * Microscopic pill-badge eyebrow → massive display heading → optional lede.
 * Consistent vertical rhythm across every section.
 */
export const SectionHeading = ({
  eyebrow,
  title,
  lede,
  align = 'center',
  tone = 'light',
  className,
}: SectionHeadingProps) => {
  const isInk = tone === 'ink';
  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <Reveal>
        <span
          className={cn(
            'eyebrow',
            isInk
              ? 'bg-white/[0.06] text-ink-foreground/75 ring-1 ring-inset ring-white/10'
              : 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/15',
          )}
        >
          <span className="h-1 w-1 rounded-full bg-current" />
          {eyebrow}
        </span>
      </Reveal>

      <Reveal index={1} className="mt-6">
        <h2
          className={cn(
            'font-headline text-h1 tracking-headline text-balance',
            align === 'center' ? 'max-w-[24ch] mx-auto' : 'max-w-[20ch]',
            isInk ? 'text-ink-foreground' : 'text-foreground',
          )}
        >
          {title}
        </h2>
      </Reveal>

      {lede && (
        <Reveal index={2} className="mt-6">
          <p
            className={cn(
              'font-body text-body-lg leading-body',
              align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-xl',
              isInk ? 'text-ink-muted' : 'text-muted-foreground',
            )}
          >
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  );
};

export default SectionHeading;
