import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/invitations/accept  { token: string }
//
// Redeems an invitation token for the SIGNED-IN caller. Setting
// profiles.role/college_id/batch_id from a plain authenticated UPDATE is
// blocked by the guard_profile_privilege_columns trigger (see
// supabase/migrations/20261015120001_core_tenancy.sql) — intentionally, so
// a student can't just PATCH their own profile to platform_admin. There is
// no service-role key in this environment to bypass that from here, so
// this route does the only thing that *should* be able to bypass it: call
// the `accept_invitation` SQL function (SECURITY DEFINER, defined in
// supabase/migrations/20261017160000_accept_invitation.sql), which runs
// the real invite-matching logic itself before writing anything.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const rawToken = (body as Record<string, unknown> | null)?.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "An invitation code is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "You must be signed in to accept an invitation." },
      { status: 401 },
    );
  }

  const { data: profile, error: rpcError } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (rpcError) {
    // accept_invitation raises a plain, user-facing message for every
    // expected failure (bad/expired/revoked/already-used token, or an
    // account that already has a college) — safe to pass straight through.
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, profile });
}
