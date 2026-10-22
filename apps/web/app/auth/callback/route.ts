import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileNeedsOnboarding } from "@/lib/auth/current-profile";

// GET /auth/callback?code=...
//
// Where the Supabase email-OTP magic link lands (emailRedirectTo in
// components/auth/EmailOtpForm.tsx points here). Exchanges the one-time
// `code` for a real session — this sets the sb-* auth cookies via the
// server Supabase client (lib/supabase/server.ts) — then sends the user to
// /onboarding (student, no college yet) or /app (everyone else).
//
// Must stay a Route Handler, not a Server Component: exchangeCodeForSession
// needs to set cookies, which only a Route Handler/Server Action can do.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  // Determine origin safely behind Cloudflare Workers or reverse proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const origin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, college_id")
    .eq("id", data.user.id)
    .single();

  const destination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : profileNeedsOnboarding(profile)
        ? "/onboarding"
        : "/app";

  return NextResponse.redirect(`${origin}${destination}`);
}
