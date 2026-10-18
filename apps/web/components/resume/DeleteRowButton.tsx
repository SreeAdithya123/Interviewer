"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Deletes one row the caller owns (RLS-enforced) and refreshes the page. */
export function DeleteRowButton({
  table,
  id,
  confirmText,
}: {
  table: "resumes" | "resume_scans";
  id: string;
  confirmText: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from(table).delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Delete"
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

export default DeleteRowButton;
