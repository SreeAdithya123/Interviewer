import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { isStubReply } from "@/lib/ai-stubs/chat-respond";
import type { ChatMessage, ChatSession } from "@/lib/types/db";
import { createChatSession, deleteChatSession, sendChatMessage } from "./actions";

export const metadata: Metadata = {
  title: "Prep assistant",
};

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null; // app/app/layout.tsx already guarantees this; defensive only.

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
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl gap-6">
      <aside className="flex w-64 flex-shrink-0 flex-col rounded-3xl border border-border bg-card p-4">
        <form action={createChatSession}>
          <button type="submit" className="btn-primary w-full text-sm">
            + New chat
          </button>
        </form>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {sessionsError && <p className="font-body text-xs text-destructive">{sessionsError.message}</p>}
          {typedSessions.length === 0 && (
            <p className="font-body text-xs text-muted-foreground">No chats yet — start one above.</p>
          )}
          {typedSessions.map((session) => (
            <div key={session.id} className="group flex items-center gap-1">
              <Link
                href={`/app/chat?session=${session.id}`}
                className={
                  session.id === activeSessionId
                    ? "flex-1 truncate rounded-xl bg-primary/10 px-3 py-2 font-body text-sm text-primary"
                    : "flex-1 truncate rounded-xl px-3 py-2 font-body text-sm text-foreground hover:bg-muted"
                }
              >
                {session.title}
              </Link>
              <form action={deleteChatSession}>
                <input type="hidden" name="session_id" value={session.id} />
                <button
                  type="submit"
                  aria-label="Delete chat"
                  className="shrink-0 px-1 font-body text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex flex-1 flex-col rounded-3xl border border-border bg-card">
        <header className="border-b border-border px-6 py-4">
          <h1 className="font-headline text-lg text-foreground">Prep assistant</h1>
          <p className="font-body text-xs text-muted-foreground">
            Retrieval over the curated knowledge base, with sources cited — once Phase 1 connects
            it to a real model.
          </p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!activeSessionId ? (
            <p className="font-body text-sm text-muted-foreground">Start a new chat to begin.</p>
          ) : messages.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">
              Ask about a company&apos;s interview pattern, a topic to revise, or what to practice
              next.
            </p>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>

        {activeSessionId && (
          <form action={sendChatMessage} className="flex gap-2 border-t border-border p-4">
            <input type="hidden" name="session_id" value={activeSessionId} />
            <input
              name="content"
              required
              autoComplete="off"
              placeholder="Ask the prep assistant..."
              className="flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary"
            />
            <button type="submit" className="btn-primary px-5">
              Send
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isStub = !isUser && isStubReply(message.model_id);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[75%] rounded-2xl bg-primary px-4 py-2.5 font-body text-sm text-primary-foreground"
            : "max-w-[75%] rounded-2xl bg-muted px-4 py-2.5 font-body text-sm text-foreground"
        }
      >
        {isStub && (
          <span className="mb-1.5 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-label text-accent">
            Preview — not yet connected to the real engine
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
