import React from 'react';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ IconTile */

type IconTileProps = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  tone?: 'muted' | 'ink' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const tileSize = { sm: 'h-9 w-9 rounded-lg', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' };
const tileGlyph = { sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-6 w-6' };
const tileTone = {
  muted: 'bg-muted text-foreground',
  ink: 'bg-ink text-ink-foreground',
  primary: 'bg-primary/10 text-primary',
};

/** Hairline square holding a hairline glyph — replaces every gradient icon chip. */
export const IconTile = ({ icon: Icon, tone = 'muted', size = 'md', className }: IconTileProps) => (
  <span className={cn('grid shrink-0 place-items-center', tileSize[size], tileTone[tone], className)}>
    <Icon className={tileGlyph[size]} strokeWidth={1.5} />
  </span>
);

/* ---------------------------------------------------------------- StatusPill */

type StatusTone = 'neutral' | 'live' | 'active' | 'warning' | 'idle';

const dotTone: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  live: 'bg-destructive animate-pulse',
  active: 'bg-emerald-500',
  warning: 'bg-amber-500',
  idle: 'bg-muted-foreground/50',
};

/** Neutral capsule + one state dot — replaces every colour-coded status chip. */
export const StatusPill = ({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-2.5 py-1 font-body text-xs font-medium text-foreground shadow-soft',
      className,
    )}
  >
    <span className={cn('h-1.5 w-1.5 rounded-full', dotTone[tone])} />
    {children}
  </span>
);

/* -------------------------------------------------------------- UpgradePrompt */

type UpgradePromptProps = {
  title?: React.ReactNode;
  body?: React.ReactNode;
  benefits?: string[];
  cta?: string;
  className?: string;
  compact?: boolean;
};

/** Ink upsell panel routing to /payments. Shared by SubscriptionCard, CreditCheckModal, RestrictedAccessCard. */
export const UpgradePrompt = ({
  title,
  body,
  benefits,
  cta = 'View plans',
  className,
  compact = false,
}: UpgradePromptProps) => {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'rounded-2xl bg-ink text-ink-foreground',
        compact ? 'p-4' : 'p-6 sm:p-7',
        className,
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-foreground/10">
        <Crown className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <h4 className={cn('font-headline font-semibold tracking-tight', compact ? 'mt-3 text-base' : 'mt-4 text-lg')}>
        {title ?? (
          <>
            Unlock <span className="text-spectrum">everything</span>
          </>
        )}
      </h4>
      {body && (
        <p className="mt-1.5 font-body text-[13px] leading-body text-ink-muted">{body}</p>
      )}
      {benefits && benefits.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 font-body text-[13px] text-ink-foreground/85">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-foreground/50" />
              {b}
            </li>
          ))}
        </ul>
      )}
      <Button
        onClick={() => navigate('/payments')}
        className="mt-5 w-full bg-ink-foreground text-ink hover:bg-ink-foreground/90"
      >
        {cta}
      </Button>
    </div>
  );
};

/* -------------------------------------------------------------------- Dropzone */

type DropzoneProps = {
  dragActive?: boolean;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  children: React.ReactNode;
  className?: string;
};

/** Dashed hairline drop target. Shared by ResumeScanner + UploadModal. */
export const Dropzone = ({
  dragActive,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  className,
}: DropzoneProps) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-300 ease-out-quint',
      dragActive
        ? 'border-primary bg-primary/5'
        : 'border-foreground/15 bg-muted/40 hover:border-foreground/25',
      onClick && 'cursor-pointer',
      className,
    )}
  >
    {children}
  </div>
);
