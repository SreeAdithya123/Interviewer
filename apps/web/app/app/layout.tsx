import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import AppSidebarNav from "@/components/app-shell/AppSidebarNav";
import SignOutButton from "@/components/app-shell/SignOutButton";

// The authenticated app shell. ROUTE PREFIX: everything under /app (this
// file is app/app/layout.tsx) is inside this shell — put new pages at
// app/app/<segment>/page.tsx and they inherit the sidebar/guards below for
// free. The public marketing site (app/page.tsx, /pricing, /about, ...)
// and the standalone auth pages (/login, /signup, /onboarding) are
// deliberately outside this prefix and do not use this layout.
//
// Route protection lives HERE (a Server Component check), not in
// proxy.ts/lib/supabase/middleware.ts. middleware.ts only refreshes the
// Supabase session cookie — it does not redirect unauthenticated requests
// away from /app. That's a deliberate, documented choice: this one guard
// covers every page under /app (Next's layout nesting runs it before any
// child page's own code), so there is no second place to keep in sync, and
// every nested page already needs a Supabase round trip of its own —
// doing the auth check in middleware would just add a second one in front
// of it for no real benefit.
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  // Only a student is forced through onboarding. A platform_admin has no
  // college at all by design; a college_admin is provisioned directly, not
  // via the self-serve invitation flow.
  if (profileNeedsOnboarding(profile)) {
    redirect("/onboarding");
  }

  const navItems = getNavItemsForRole(profile.role);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card px-5 py-8 sm:flex">
        <Link href="/app" className="font-headline text-lg text-foreground">
          Vyoman Interviewer
        </Link>

        <AppSidebarNav items={navItems} />

        <div className="mt-auto space-y-3 border-t border-border pt-5">
          <p className="truncate font-body text-sm text-foreground">
            {profile.full_name ?? profile.email}
          </p>
          <p className="font-body text-xs capitalize text-muted-foreground">
            {profile.role.replace("_", " ")}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4 sm:hidden">
          <Link href="/app" className="font-headline text-base text-foreground">
            Vyoman Interviewer
          </Link>
          <SignOutButton />
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-5 py-3 sm:hidden">
          <AppSidebarNav items={navItems} className="flex gap-1" />
        </div>

        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
