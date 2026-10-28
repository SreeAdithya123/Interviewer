import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatSession } from "@/lib/types/db";
import { createChatSession, deleteChatSession } from "./actions";
import { ChatBoxClient } from "./ChatBoxClient";
import { MessageSquarePlus, Trash2, Bot } from "lucide-react";

export const metadata: Metadata = {
  title: "Prep Assistant",
  description: "Placement preparation assistant referencing senior archives and company patterns.",
};

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { session: sessionParam } = await searchParams;

  const supabase = await createClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  const typedSessions = (sessions ?? []) as ChatSession[];
  const activeSessionId = sessionParam ?? typedSessions[0]?.id ?? null;

  let messages: ChatMessage[] = [];
  if (activeSessionId) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: true });
    messages = (data ?? []) as ChatMessage[];
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-6xl gap-5">
      {/* Sessions Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col rounded-3xl border border-border/80 bg-card p-3.5 shadow-soft">
        <form action={createChatSession}>
          <button
            type="submit"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 font-body text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>New conversation</span>
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Recent Chats</span>
          <span>{typedSessions.length}</span>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          {sessionsError && <p className="font-body text-xs text-destructive p-2">{sessionsError.message}</p>}
          {typedSessions.length === 0 && (
            <div className="p-4 text-center">
              <p className="font-body text-xs text-muted-foreground">No conversations yet.</p>
              <p className="mt-1 font-body text-[11px] text-muted-foreground/70">
                Click above to start your first session.
              </p>
            </div>
          )}
          {typedSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Link
                  href={`/app/chat?session=${session.id}`}
                  className="flex-1 truncate font-body text-xs font-medium"
                >
                  {session.title || "Untitled Session"}
                </Link>
                <form action={deleteChatSession}>
                  <input type="hidden" name="session_id" value={session.id} />
                  <button
                    type="submit"
                    aria-label="Delete chat session"
                    className="shrink-0 p-1 rounded-md text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </form>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Conversation Canvas */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft">
        <header className="flex items-center justify-between border-b border-border/80 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-headline text-sm font-semibold text-foreground">
                Placement Prep Assistant
              </h1>
              <p className="font-body text-[11px] text-muted-foreground">
                Grounded Q&amp;A for campus hiring patterns, technical rounds, and rubrics.
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeSessionId ? (
            <ChatBoxClient sessionId={activeSessionId} initialMessages={messages} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <p className="font-body text-xs text-muted-foreground">
                Select or create a conversation to begin asking questions.
              </p>
              <form action={createChatSession} className="mt-3">
                <button
                  type="submit"
                  className="btn-primary inline-flex items-center gap-1.5 text-xs"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  <span>Start Conversation</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
