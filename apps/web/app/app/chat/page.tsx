import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatSession } from "@/lib/types/db";
import { createChatSession, deleteChatSession, sendChatMessage } from "./actions";
import { ExternalLink } from "lucide-react";

function isStubReply(modelId: string | null): boolean {
  return modelId === "stub-preview-v1";
}

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
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-6xl gap-4">
      {/* Sessions Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col rounded-lg border border-border/80 bg-card p-3">
        <form action={createChatSession}>
          <button
            type="submit"
            className="inline-flex h-8 w-full items-center justify-center rounded bg-foreground px-3 font-body text-xs font-medium text-background hover:bg-foreground/90"
          >
            + New conversation
          </button>
        </form>

        <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
          {sessionsError && <p className="font-body text-xs text-destructive">{sessionsError.message}</p>}
          {typedSessions.length === 0 && (
            <p className="p-2 text-center font-body text-xs text-muted-foreground">No conversations yet.</p>
          )}
          {typedSessions.map((session) => (
            <div key={session.id} className="group flex items-center justify-between rounded px-2.5 py-1.5 transition-colors hover:bg-muted/50">
              <Link
                href={`/app/chat?session=${session.id}`}
                className={
                  session.id === activeSessionId
                    ? "flex-1 truncate font-body text-xs font-medium text-foreground"
                    : "flex-1 truncate font-body text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {session.title}
              </Link>
              <form action={deleteChatSession}>
                <input type="hidden" name="session_id" value={session.id} />
                <button
                  type="submit"
                  aria-label="Delete chat"
                  className="shrink-0 p-0.5 font-body text-[10px] text-muted-foreground opacity-0 hover:text-rose-600 group-hover:opacity-100"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Conversation Surface */}
      <section className="flex flex-1 flex-col rounded-lg border border-border/80 bg-card">
        <header className="border-b border-border/80 px-5 py-3">
          <h1 className="font-body text-sm font-semibold text-foreground">Prep Assistant</h1>
          <p className="font-body text-xs text-muted-foreground">
            RAG-grounded placement prep Q&amp;A referencing senior archives and company patterns.
          </p>
        </header>

        <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
          {!activeSessionId ? (
            <p className="text-center font-body text-xs text-muted-foreground">Start a new conversation to begin.</p>
          ) : messages.length === 0 ? (
            <p className="text-center font-body text-xs text-muted-foreground">
              Ask about company interview patterns, technical topics, or diagnostic areas to practice.
            </p>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>

        {activeSessionId && (
          <form action={sendChatMessage} className="flex gap-2 border-t border-border/80 p-3">
            <input type="hidden" name="session_id" value={activeSessionId} />
            <input
              name="content"
              required
              autoComplete="off"
              placeholder="Ask a placement interview question..."
              className="h-9 flex-1 rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded bg-foreground px-4 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
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
  const citations = Array.isArray(message.citations) ? message.citations : [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[75%] rounded-lg bg-foreground px-3.5 py-2.5 font-body text-xs text-background"
            : "max-w-[75%] rounded-lg border border-border/80 bg-background px-3.5 py-2.5 font-body text-xs text-foreground"
        }
      >
        {isStub && (
          <span className="mb-1 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.2 font-body text-[10px] font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            Preview mode
          </span>
        )}
        {message.declined && (
          <span className="mb-1 inline-block rounded border border-rose-200 bg-rose-50 px-1.5 py-0.2 font-body text-[10px] font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            Safeguard triggered — out of placement prep scope
          </span>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {citations.length > 0 && (
          <div className="mt-2.5 border-t border-border/60 pt-1.5 text-[11px]">
            <span className="text-muted-foreground block mb-1">
              Sources:
            </span>
            <div className="flex flex-wrap gap-1">
              {(citations as Array<Record<string, unknown>>).map((c, i) => {
                const title = typeof c === "object" && c !== null ? String(c.title || `Source ${i + 1}`) : String(c);
                const url = typeof c === "object" && c !== null && typeof c.source_url === "string" ? c.source_url : null;
                return url ? (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[11px] text-foreground hover:bg-muted"
                  >
                    <span>{title}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                  </a>
                ) : (
                  <span
                    key={i}
                    className="inline-flex items-center rounded border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {title}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
