"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { engineSendChatMessage } from "@/lib/chat/engine-client";

// Re-checked here too (see app/app/colleges/actions.ts's header comment)
// — every Server Action re-verifies the caller is signed in, even though
// the /app layout already guarantees it, because actions are reachable by
// a direct POST. RLS backs the ownership check for every write below
// (chat_sessions_insert/update, chat_messages_insert — see
// supabase/migrations/20261015120007_row_level_security.sql and
// 20261017170000_platform_admin_content_write_access.sql).
async function requireSignedIn() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("You must be signed in.");
  return profile;
}

export async function createChatSession() {
  const profile = await requireSignedIn();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: profile.id, college_id: profile.college_id, title: "New chat" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/app/chat");
  redirect(`/app/chat?session=${data.id}`);
}

export async function sendChatMessage(formData: FormData) {
  const profile = await requireSignedIn();
  const supabase = await createClient();

  const sessionId = String(formData.get("session_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!sessionId || !content) throw new Error("A message needs a session and some text.");

  const { error: userMessageError } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content,
  });
  if (userMessageError) throw new Error(userMessageError.message);

  await engineSendChatMessage({
    sessionId,
    userId: profile.id,
    message: content,
    collegeId: profile.college_id,
  });

  // Nice-to-have: title a brand-new chat from its first message instead of
  // leaving every session called "New chat" in the sidebar.
  const { data: session } = await supabase.from("chat_sessions").select("title").eq("id", sessionId).maybeSingle();
  if (session?.title === "New chat") {
    const title = content.length > 60 ? `${content.slice(0, 60)}…` : content;
    await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
  }

  revalidatePath("/app/chat");
}

export async function deleteChatSession(formData: FormData) {
  await requireSignedIn();
  const supabase = await createClient();

  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) throw new Error("Missing session id.");

  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/app/chat");
  redirect("/app/chat");
}
