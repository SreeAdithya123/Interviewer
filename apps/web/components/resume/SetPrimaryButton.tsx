"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Unsets any existing primary for this user, then marks `resumeId` primary.
 * Two statements, not one upsert, because the DB enforces "at most one
 * primary per user" with a partial unique index (resumes_one_primary_per_user_idx)
 * rather than a single-row toggle column.
 */
export function SetPrimaryButton({ userId, resumeId }: { userId: string; resumeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("resumes").update({ is_primary: false }).eq("user_id", userId).eq("is_primary", true);
    await supabase.from("resumes").update({ is_primary: true }).eq("id", resumeId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-body text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
    >
      <Star className="h-3.5 w-3.5" strokeWidth={1.75} /> Make primary
    </button>
  );
}

export default SetPrimaryButton;
