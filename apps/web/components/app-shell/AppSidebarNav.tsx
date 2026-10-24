"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebarNav({
  items,
  className = "mt-6 flex flex-1 flex-col gap-0.5",
  onNavigate,
}: {
  items: NavItem[];
  /** Overridable so the mobile header can lay these out horizontally. */
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Sidebar navigation">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/app" && pathname?.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={cn(
              "group relative flex items-center justify-between rounded-md px-3 py-2 font-body text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <span className="truncate">{item.label}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 transition-transform group-hover:scale-125" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default AppSidebarNav;
