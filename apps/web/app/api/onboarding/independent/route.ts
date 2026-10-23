import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/onboarding/independent
//
// Completes onboarding for a signed-in student who is practicing independently
// (without an institutional college invite code). Sets onboarded_at, full_name,
// department, and graduation_year.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const payload = (body as Record<string, unknown> | null) ?? {};
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const department = typeof payload.department === "string" ? payload.department.trim() : "";
  const rawGradYear = payload.graduationYear;
  const graduationYear =
    typeof rawGradYear === "number"
      ? rawGradYear
      : typeof rawGradYear === "string" && rawGradYear.trim()
        ? parseInt(rawGradYear.trim(), 10)
        : null;

  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "You must be signed in to complete onboarding." },
      { status: 401 },
    );
  }

  // Update profile with independent student details & stamp onboarded_at
  const updatePayload: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
  };

  if (fullName) {
    updatePayload.full_name = fullName;
  }
  if (department) {
    updatePayload.department = department;
  }
  if (graduationYear && !isNaN(graduationYear) && graduationYear > 1990 && graduationYear < 2050) {
    updatePayload.graduation_year = graduationYear;
  }

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userData.user.id)
    .select()
    .single();

  if (updateError) {
    console.error("[onboarding/independent] Update error:", updateError);
    return NextResponse.json(
      { error: updateError.message || "Failed to complete onboarding. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, profile });
}
