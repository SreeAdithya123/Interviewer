"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebarNav({
  items,
  className = "mt-8 flex flex-1 flex-col gap-1",
}: {
  items: NavItem[];
  /** Overridable so the mobile header can lay these out horizontally. */
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-xl px-3 py-2 font-body text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AppSidebarNav;
