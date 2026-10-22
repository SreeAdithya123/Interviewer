import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { profileNeedsOnboarding } from "@/lib/auth/current-profile";
import type { EmailOtpType } from "@supabase/supabase-js";

// GET /auth/callback?code=... OR /auth/callback?token_hash=...
//
// Where the Supabase email-OTP magic link lands. Exchanges the one-time
// `code` (PKCE) or `token_hash` for a real session — this sets the sb-* auth cookies —
// then sends the user to /onboarding (student, no college yet) or /app (everyone else).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next");

  // Determine origin safely behind Cloudflare Workers or reverse proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const origin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin);

  if (!code && !token_hash) {
    const errorMsg = "No verification code or token found in the sign-in link.";
    return NextResponse.redirect(`${origin}/login?error=missing_code&message=${encodeURIComponent(errorMsg)}`);
  }

  const cookieStore = await cookies();
  const cookiesToSetOnResponse: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            cookiesToSetOnResponse.push({ name, value, options });
          });
        },
      },
    }
  );

  let authError: Error | null = null;
  let user = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      authError = error;
    } else {
      user = data.user;
    }
  } else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      authError = error;
    } else {
      user = data.user;
    }
  }

  if (authError || !user) {
    const errorMsg =
      authError?.message ?? "Session could not be established. The link may have expired or was opened in another browser.";
    console.error("[auth/callback] Error:", authError);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent(errorMsg)}`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, college_id")
    .eq("id", user.id)
    .single();

  const destination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : profileNeedsOnboarding(profile)
        ? "/onboarding"
        : "/app";

  const redirectResponse = NextResponse.redirect(`${origin}${destination}`);

  // Crucial: Explicitly forward the Set-Cookie headers on the outgoing redirect response
  for (const { name, value, options } of cookiesToSetOnResponse) {
    redirectResponse.cookies.set(name, value, options);
  }

  return redirectResponse;
}
