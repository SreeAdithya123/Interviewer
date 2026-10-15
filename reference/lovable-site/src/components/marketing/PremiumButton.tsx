import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

type Variant = 'solid' | 'ghost' | 'ink' | 'ghost-ink';
type Size = 'md' | 'lg';

type PremiumButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** show the nested trailing icon circle */
  withIcon?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
};

const base =
  'group relative inline-flex items-center justify-center gap-3 rounded-full font-body font-semibold tracking-button ' +
  'transition-[transform,background-color,box-shadow,color] duration-500 ease-out-quint ' +
  'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:opacity-50 disabled:pointer-events-none';

const sizes: Record<Size, string> = {
  md: 'h-11 pl-5 pr-1.5 text-sm',
  lg: 'h-14 pl-7 pr-2 text-[15px]',
};

const variants: Record<Variant, string> = {
  solid:
    'bg-primary text-primary-foreground shadow-[0_18px_50px_-16px_hsl(244_66%_58%/0.55)] hover:shadow-[0_24px_64px_-14px_hsl(244_66%_58%/0.7)] hover:-translate-y-[2px]',
  ghost:
    'bg-foreground/[0.04] text-foreground ring-1 ring-inset ring-foreground/20 hover:bg-foreground/[0.08] hover:-translate-y-[1px]',
  ink:
    'bg-ink-foreground/95 text-ink shadow-[0_18px_50px_-18px_hsl(0_0%_0%/0.6)] hover:bg-ink-foreground hover:-translate-y-[2px]',
  'ghost-ink':
    'bg-white/[0.03] text-ink-foreground ring-1 ring-inset ring-white/15 hover:bg-white/[0.08] hover:-translate-y-[1px]',
};

const iconWrap: Record<Variant, string> = {
  solid: 'bg-primary-foreground/15 text-primary-foreground',
  ghost: 'bg-foreground/[0.06] text-foreground',
  ink: 'bg-ink/10 text-ink',
  'ghost-ink': 'bg-white/10 text-ink-foreground',
};

const iconSize: Record<Size, string> = {
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

/**
 * Island pill CTA with a nested "button-in-button" trailing icon.
 * The icon circle carries its own internal kinetic tension on hover:
 * it translates diagonally and scales up while the shell presses down.
 */
export const PremiumButton = ({
  children,
  onClick,
  variant = 'solid',
  size = 'lg',
  className,
  withIcon = true,
  icon,
  type = 'button',
  disabled,
  ariaLabel,
}: PremiumButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(base, sizes[size], variants[variant], !withIcon && 'pr-6', className)}
    >
      <span className="whitespace-nowrap">{children}</span>
      {withIcon && (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-out-quint',
            'group-hover:translate-x-[3px] group-hover:-translate-y-[1px] group-hover:scale-105',
            iconWrap[variant],
            iconSize[size],
          )}
        >
          {icon ?? <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />}
        </span>
      )}
    </button>
  );
};

export default PremiumButton;
