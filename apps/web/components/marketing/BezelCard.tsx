import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Ported unchanged from
 * reference/lovable-site/src/components/marketing/BezelCard.tsx — no
 * router/auth dependencies.
 */
type BezelCardProps = {
  children: ReactNode;
  className?: string;
  /** inner core class overrides (background, padding, radius already set) */
  coreClassName?: string;
  tone?: "light" | "ink";
  interactive?: boolean;
  as?: "div" | "article" | "li";
};

/**
 * Doppelrand / double-bezel enclosure — a glass plate seated in an aluminium
 * tray. Outer shell carries a hairline + tint + padding + large radius; the
 * inner core has its own surface, an inset top highlight, and a concentric
 * (smaller) radius.
 */
export const BezelCard = ({
  children,
  className,
  coreClassName,
  tone = "light",
  interactive = false,
  as = "div",
}: BezelCardProps) => {
  const Tag = as as ElementType;
  return (
    <Tag
      className={cn(
        "bezel",
        tone === "ink" && "bezel--ink",
        interactive && "transition-transform duration-500 ease-out-quint hover:-translate-y-1.5",
        className,
      )}
    >
      <div className={cn("bezel-core h-full", coreClassName)}>{children}</div>
    </Tag>
  );
};

export default BezelCard;
