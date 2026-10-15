import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

type BackProp =
  | { to: string; label?: string; onClick?: never }
  | { onClick: () => void; label?: string; to?: never };

type PageHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: BackProp;
  className?: string;
  /** show the hairline divider under the header */
  divider?: boolean;
};

/**
 * The one signed-in page header: optional back link, eyebrow pill, Clash
 * display title, body subtitle, right-aligned actions slot. Replaces the
 * ~12 hand-rolled headers across the app.
 */
export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  actions,
  back,
  className,
  divider = true,
}: PageHeaderProps) => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const handleBack = () => {
    if (!back) return;
    if (back.onClick) back.onClick();
    else if (back.to) navigate(back.to);
  };

  return (
    <motion.header
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(divider && 'border-b border-foreground/[0.07] pb-8', className)}
    >
      {back && (
        <button
          onClick={handleBack}
          className="mb-6 -ml-2 inline-flex h-9 items-center gap-2 rounded-lg px-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {back.label ?? 'Back'}
        </button>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <span className="eyebrow bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <span className="h-1 w-1 rounded-full bg-current" />
              {eyebrow}
            </span>
          )}
          <h1
            className={cn(
              'font-headline text-h1 font-semibold tracking-headline text-foreground',
              eyebrow && 'mt-4',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl font-body text-sm leading-body text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </motion.header>
  );
};

export default PageHeader;
