"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import type { Profile } from "@/lib/auth/current-profile";
import type { NavItem } from "@/lib/auth/nav-config";
import AppSidebarNav from "@/components/app-shell/AppSidebarNav";
import SignOutButton from "@/components/app-shell/SignOutButton";

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
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getSidebarServerSnapshot(): boolean {
  return false;
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

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden sm:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-0 p-0 border-r-0 overflow-hidden opacity-0 pointer-events-none" : "w-64 px-5 py-8 opacity-100"
        }`}
        aria-hidden={isCollapsed}
      >
        <div className="flex items-center justify-between gap-2">
          <Link href="/app" className="truncate font-headline text-lg font-bold text-foreground">
            Vyoman
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide sidebar (Ctrl+B)"
            aria-label="Hide sidebar"
            className="rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <AppSidebarNav items={navItems} />

        <div className="mt-auto space-y-3 border-t border-border pt-5">
          <p className="truncate font-body text-sm font-medium text-foreground">
            {profile.full_name ?? profile.email}
          </p>
          <p className="font-body text-xs capitalize text-muted-foreground">
            {profile.role.replace("_", " ")}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile Drawer (overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <aside className="relative z-10 flex w-72 flex-col border-r border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link
                href="/app"
                onClick={() => setIsMobileOpen(false)}
                className="font-headline text-lg font-bold text-foreground"
              >
                Vyoman
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AppSidebarNav
              items={navItems}
              onNavigate={() => setIsMobileOpen(false)}
            />

            <div className="mt-auto space-y-3 border-t border-border pt-5">
              <p className="truncate font-body text-sm font-medium text-foreground">
                {profile.full_name ?? profile.email}
              </p>
              <p className="font-body text-xs capitalize text-muted-foreground">
                {profile.role.replace("_", " ")}
              </p>
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Control Bar (Desktop collapsed button & Mobile header) */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 bg-card/60 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Side View Toggle button when collapsed */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Show sidebar (Ctrl+B)"
                aria-label="Show sidebar"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 font-body text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <PanelLeftOpen className="h-4 w-4 text-primary" />
                <span>Side View</span>
                <span className="text-[10px] text-muted-foreground">Ctrl+B</span>
              </button>
            )}

            <Link href="/app" className="font-headline text-base font-bold text-foreground sm:hidden">
              Vyoman
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block font-body text-xs text-muted-foreground">
              {profile.role.replace("_", " ")}
            </span>
            <SignOutButton />
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export default AppShellContainer;
