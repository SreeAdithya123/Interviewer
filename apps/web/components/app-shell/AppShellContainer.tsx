"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Menu, X, ArrowUpRight } from "lucide-react";
import type { Profile } from "@/lib/auth/current-profile";
import type { NavItem } from "@/lib/auth/nav-config";
import AppSidebarNav from "@/components/app-shell/AppSidebarNav";
import SignOutButton from "@/components/app-shell/SignOutButton";
import { TourTrigger } from "@/components/app-shell/TourTrigger";

interface AppShellContainerProps {
  profile: Profile;
  navItems: NavItem[];
  children: React.ReactNode;
}

const STORAGE_KEY = "vyoman_sidebar_collapsed";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("sidebar-toggle", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("sidebar-toggle", callback);
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

function getUserInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "U";
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes("@")) return trimmed.charAt(0).toUpperCase();
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function AppShellContainer({ profile, navItems, children }: AppShellContainerProps) {
  const isCollapsed = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, getSidebarServerSnapshot);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleSidebar() {
    const current = getSidebarSnapshot();
    localStorage.setItem(STORAGE_KEY, String(!current));
    window.dispatchEvent(new Event("sidebar-toggle"));
  }

  const initials = getUserInitials(profile.full_name || profile.email);
  const roleName = profile.role.replace(/_/g, " ");

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      {/* Desktop Collapsible Sidebar — 232px width, grounded surface */}
      <aside
        className={`hidden sm:flex flex-col border-r border-border/80 bg-background transition-all duration-200 ease-in-out ${
          isCollapsed
            ? "w-0 p-0 border-r-0 overflow-hidden opacity-0 pointer-events-none"
            : "w-[232px] px-4 py-5 opacity-100"
        }`}
        aria-hidden={isCollapsed}
      >
        {/* Brand & Workspace Identity */}
        <div className="flex items-start justify-between gap-2 px-1">
          <Link href="/app" className="group flex flex-col">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground font-mono text-xs font-semibold text-background">
                V
              </span>
              <span className="font-headline text-base font-semibold tracking-tight text-foreground">
                Vyoman
              </span>
            </div>
            <span className="mt-1 font-body text-[11px] text-muted-foreground">
              Campus Placement OS
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide sidebar (Ctrl+B)"
            aria-label="Hide sidebar"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation list */}
        <AppSidebarNav items={navItems} />

        {/* User Scope Footer */}
        <div className="mt-auto border-t border-border/80 pt-4">
          <Link
            href="/app/profile"
            title="View & Edit Profile Settings"
            className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-muted/60"
          >
            {profile.id_photo_url || profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.id_photo_url || profile.avatar_url!}
                alt={profile.full_name ?? "User"}
                className="h-8 w-8 shrink-0 rounded-full border border-border/80 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-body text-xs font-medium text-foreground">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                {profile.full_name ?? profile.email}
              </p>
              <p className="flex items-center gap-1 font-body text-[11px] capitalize text-muted-foreground">
                <span>{roleName}</span>
                {profile.id_verified_at && (
                  <span
                    className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                    title="Biometrically Verified"
                  >
                    ✓ ID Verified
                  </span>
                )}
              </p>
            </div>
          </Link>
          <div className="mt-2.5 px-1 flex flex-col gap-1.5">
            <TourTrigger className="w-full justify-start" />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <aside className="relative z-10 flex w-72 flex-col border-r border-border/80 bg-background p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <Link
                href="/app"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground font-mono text-xs font-semibold text-background">
                  V
                </span>
                <span className="font-headline text-base font-semibold tracking-tight text-foreground">
                  Vyoman
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <AppSidebarNav
              items={navItems}
              onNavigate={() => setIsMobileOpen(false)}
            />

            <div className="mt-auto border-t border-border/80 pt-4">
              <Link
                href="/app/profile"
                onClick={() => setIsMobileOpen(false)}
                className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-muted/60"
              >
                {profile.id_photo_url || profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.id_photo_url || profile.avatar_url!}
                    alt={profile.full_name ?? "User"}
                    className="h-8 w-8 shrink-0 rounded-full border border-border/80 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-body text-xs font-medium text-foreground">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {profile.full_name ?? profile.email}
                  </p>
                  <p className="flex items-center gap-1 font-body text-[11px] capitalize text-muted-foreground">
                    <span>{roleName}</span>
                    {profile.id_verified_at && (
                      <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ ID Verified
                      </span>
                    )}
                  </p>
                </div>
              </Link>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <TourTrigger className="w-full justify-start" />
                <SignOutButton />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Control Bar (48px height, flat with subtle rule) */}
        <header className="flex h-12 items-center justify-between border-b border-border/70 bg-background/90 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Desktop Side View Toggle button when collapsed */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Show sidebar (Ctrl+B)"
                aria-label="Show sidebar"
                className="hidden sm:inline-flex items-center gap-1.5 rounded border border-border/80 bg-background px-2.5 py-1 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Sidebar</span>
                <span className="text-[10px] text-muted-foreground">Ctrl+B</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>Vyoman</span>
              <span>/</span>
              <span className="capitalize text-foreground font-medium">{roleName}</span>
            </div>

            <Link href="/app" className="font-headline text-sm font-semibold text-foreground sm:hidden">
              Vyoman
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block font-body text-xs text-muted-foreground">
              {profile.email}
            </span>
            <TourTrigger compact className="hidden sm:inline-flex" />
            <SignOutButton />
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShellContainer;
