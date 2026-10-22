import { redirect } from "next/navigation";
import { getCurrentProfile, profileNeedsOnboarding } from "@/lib/auth/current-profile";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import AppShellContainer from "@/components/app-shell/AppShellContainer";

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
// away from /app.
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
    <AppShellContainer profile={profile} navItems={navItems}>
      {children}
    </AppShellContainer>
  );
}
