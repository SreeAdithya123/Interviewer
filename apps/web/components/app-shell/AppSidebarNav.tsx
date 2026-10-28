"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils";
import {
  Video,
  Layers,
  Briefcase,
  FileText,
  MessageSquare,
  Clock,
  UserCheck,
  Users,
  Mail,
  Network,
  ShieldCheck,
  Building2,
  CreditCard,
  Database,
  BookOpen,
  BarChart3,
  Award,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/app/interview": Video,
  "/app/blueprints": Layers,
  "/app/drives": Briefcase,
  "/app/resume": FileText,
  "/app/chat": MessageSquare,
  "/app/history": Clock,
  "/app/profile": UserCheck,
  "/app/students": Users,
  "/app/invites": Mail,
  "/app/ats": Network,
  "/app/compliance": ShieldCheck,
  "/app/colleges": Building2,
  "/app/plans": CreditCard,
  "/app/question-bank": Database,
  "/app/knowledge-base": BookOpen,
  "/app/cost-dashboard": BarChart3,
  "/app/golden-set": Award,
};

export function AppSidebarNav({
  items,
  className = "mt-5 flex flex-1 flex-col gap-1",
  onNavigate,
}: {
  items: NavItem[];
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Sidebar navigation">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/app" && pathname?.startsWith(`${item.href}/`));
        const IconComponent = NAV_ICONS[item.href] || Sparkles;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 font-body text-xs font-medium transition-all duration-150",
              active
                ? "bg-primary/10 text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <IconComponent
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="truncate flex-1">{item.label}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default AppSidebarNav;
