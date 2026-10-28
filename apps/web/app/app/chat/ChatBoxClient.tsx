"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Bot, User, Sparkles, ExternalLink, Loader2, ArrowUpRight } from "lucide-react";
import type { ChatMessage } from "@/lib/types/db";
import { sendChatMessage } from "./actions";

interface ChatBoxClientProps {
  sessionId: string;
  initialMessages: ChatMessage[];
}

const SUGGESTIONS = [
  "Top DSA patterns for campus technical interviews",
  "How to structure 'Tell me about yourself' in 90s",
  "STAR method template for behavioral rounds",
  "System design basics tested in fresher assessments",
];

export function ChatBoxClient({ sessionId, initialMessages }: ChatBoxClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronize when initialMessages updates from server
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll to bottom on message changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isPending) return;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content: text,
      citations: [],
      declined: false,
      model_id: "client-optimistic",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("content", text);
      try {
        await sendChatMessage(formData);
      } catch (err) {
        console.error("Chat send error:", err);
      }
    });
  };

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Scrollable Conversation Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-headline text-base font-semibold text-foreground">
              Placement Preparation Assistant
            </h3>
            <p className="mt-1 max-w-md font-body text-xs text-muted-foreground">
              Ask about technical interview patterns, behavioral STAR frameworks, system design concepts, or company recruitment rounds.
            </p>

            <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-2.5 text-left font-body text-xs text-foreground transition-all hover:border-primary/50 hover:bg-muted/70 group"
                >
                  <span className="line-clamp-2">{suggestion}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100 shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {isPending && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="font-body text-xs text-muted-foreground">
                  Analyzing placement knowledge base...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="border-t border-border/80 bg-card p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
            placeholder="Ask a technical or behavioral interview question..."
            className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 font-body text-xs text-foreground outline-none transition focus:border-primary placeholder:text-muted-foreground/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 font-body text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const citations = Array.isArray(message.citations) ? message.citations : [];

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs shrink-0 ${
          isUser
            ? "bg-foreground text-background"
            : "bg-primary/15 text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
          isUser
            ? "bg-foreground text-background"
            : "border border-border/80 bg-card text-foreground"
        }`}
      >
        {message.declined && (
          <span className="mb-1.5 inline-block rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 font-body text-[10px] font-semibold text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            Out of placement prep scope
          </span>
        )}

        <div className="font-body text-xs leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {citations.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-2 text-[11px]">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider mb-1">
              Verified Sources
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(citations as Array<Record<string, unknown>>).map((c, i) => {
                const title = typeof c === "object" && c !== null ? String(c.title || `Source ${i + 1}`) : String(c);
                const url = typeof c === "object" && c !== null && typeof c.source_url === "string" ? c.source_url : null;
                return url ? (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] text-foreground hover:bg-muted transition"
                  >
                    <span>{title}</span>
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                  </a>
                ) : (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
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
